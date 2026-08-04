import { NextResponse, NextRequest } from 'next/server';
import { ensureSchema } from '@/lib/db';
import { resolveTransportAuth } from '@/lib/transport-auth';
import { chatCompletion, type ChatMessage } from '@/lib/groq-service';

const MAX_MESSAGES = 20;

export async function POST(request: NextRequest) {
  try {
    await ensureSchema();
    const auth = await resolveTransportAuth(request);
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const messages = Array.isArray(body.messages) ? (body.messages as ChatMessage[]) : [];
    if (messages.length === 0) {
      return NextResponse.json({ success: false, error: 'messages is required' }, { status: 400 });
    }

    const result = await chatCompletion(auth.transportId, messages.slice(-MAX_MESSAGES));
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.reason }, { status: 400 });
    }

    return NextResponse.json({ reply: result.content }, { status: 200 });
  } catch (error) {
    console.error('Error in AI chat', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
