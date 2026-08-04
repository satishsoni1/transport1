import { sql } from '@/lib/db';

const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';

export interface AiConfig {
  apiKey: string;
  chatModel: string;
  visionModel: string;
}

export async function resolveAiConfig(transportId: number): Promise<AiConfig | null> {
  const { rows } = await sql`SELECT * FROM ai_settings WHERE transport_id = ${transportId} LIMIT 1`;
  const settings = rows[0];
  if (!settings?.enabled || !settings.api_key) return null;
  return {
    apiKey: settings.api_key,
    chatModel: settings.chat_model || 'llama-3.3-70b-versatile',
    visionModel: settings.vision_model || 'meta-llama/llama-4-scout-17b-16e-instruct',
  };
}

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export type ChatResult = { ok: true; content: string } | { ok: false; reason: string };

async function callGroqChat(apiKey: string, model: string, messages: unknown, maxTokens = 1024): Promise<ChatResult> {
  try {
    const response = await fetch(GROQ_CHAT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, messages, temperature: 0.3, max_tokens: maxTokens }),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const reason = data?.error?.message || `Groq API returned ${response.status}`;
      return { ok: false, reason };
    }
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') {
      return { ok: false, reason: 'Groq API returned an empty response' };
    }
    return { ok: true, content };
  } catch (error) {
    console.error('Error calling Groq API', error);
    return { ok: false, reason: error instanceof Error ? error.message : 'Unknown Groq API error' };
  }
}

const CHAT_SYSTEM_PROMPT = `You are a helpful assistant embedded in Trimurti TMS, a transport management system used by Indian logistics companies to manage L.R. (Lorry Receipt) bookings, challans, invoices, receipts, drivers, vehicles, trips, and accounts. Answer questions about how to use the app and general logistics/freight questions concisely. You do not have access to this company's live data (bookings, invoices, etc.) — if asked for specific figures, tell the user to check the relevant page instead of guessing.`;

/** General-purpose chat completion for the in-app assistant widget. */
export async function chatCompletion(transportId: number, messages: ChatMessage[]): Promise<ChatResult> {
  const config = await resolveAiConfig(transportId);
  if (!config) {
    return { ok: false, reason: 'AI Assistant is not configured or not enabled for this transport' };
  }
  const fullMessages = [{ role: 'system', content: CHAT_SYSTEM_PROMPT }, ...messages];
  return callGroqChat(config.apiKey, config.chatModel, fullMessages);
}

export type DocumentType = 'driver_license' | 'vehicle_rc';

const OCR_FIELD_HINTS: Record<DocumentType, string> = {
  driver_license: 'driver_name, license_no, date_of_birth (YYYY-MM-DD), license_valid_to (YYYY-MM-DD)',
  vehicle_rc: 'vehicle_no, owner_name, vehicle_type, chassis_no, engine_no',
};

export type OcrResult = { ok: true; fields: Record<string, string> } | { ok: false; reason: string };

/** Extracts structured fields from a photographed document using a Groq vision model. */
export async function extractDocumentFields(
  transportId: number,
  imageBase64DataUri: string,
  documentType: DocumentType
): Promise<OcrResult> {
  const config = await resolveAiConfig(transportId);
  if (!config) {
    return { ok: false, reason: 'AI Assistant is not configured or not enabled for this transport' };
  }

  const messages = [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: `Extract these fields from this ${documentType.replace('_', ' ')} photo: ${OCR_FIELD_HINTS[documentType]}. Respond with ONLY a JSON object mapping each field name to its value (use an empty string if a field isn't visible). No markdown, no explanation.`,
        },
        { type: 'image_url', image_url: { url: imageBase64DataUri } },
      ],
    },
  ];

  const result = await callGroqChat(config.apiKey, config.visionModel, messages, 512);
  if (!result.ok) return result;

  const cleaned = result.content.replace(/```json\n?|```/g, '').trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (typeof parsed !== 'object' || parsed === null) {
      return { ok: false, reason: 'Could not parse fields from the AI response' };
    }
    const fields: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      fields[key] = String(value ?? '');
    }
    return { ok: true, fields };
  } catch {
    return { ok: false, reason: 'Could not parse fields from the AI response' };
  }
}
