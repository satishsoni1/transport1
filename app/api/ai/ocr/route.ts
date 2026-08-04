import { NextResponse, NextRequest } from 'next/server';
import { ensureSchema } from '@/lib/db';
import { resolveTransportAuth } from '@/lib/transport-auth';
import { extractDocumentFields, type DocumentType } from '@/lib/groq-service';

const DOCUMENT_TYPES = new Set(['driver_license', 'vehicle_rc']);

export async function POST(request: NextRequest) {
  try {
    await ensureSchema();
    const auth = await resolveTransportAuth(request);
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const imageBase64 = String(body.image_base64 || '');
    const documentType = String(body.document_type || '');

    if (!imageBase64.startsWith('data:image/')) {
      return NextResponse.json({ success: false, error: 'A base64 image data URI is required' }, { status: 400 });
    }
    if (!DOCUMENT_TYPES.has(documentType)) {
      return NextResponse.json({ success: false, error: `document_type must be one of ${[...DOCUMENT_TYPES].join(', ')}` }, { status: 400 });
    }

    const result = await extractDocumentFields(auth.transportId, imageBase64, documentType as DocumentType);
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.reason }, { status: 400 });
    }

    return NextResponse.json({ fields: result.fields }, { status: 200 });
  } catch (error) {
    console.error('Error in AI OCR', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
