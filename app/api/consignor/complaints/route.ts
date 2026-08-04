import { NextResponse } from 'next/server';
import { ensureSchema, sql } from '@/lib/db';
import { requireConsignor } from '@/lib/consignor-auth';

export async function GET(request: Request) {
  try {
    await ensureSchema();
    const { consignor, response } = await requireConsignor(request);
    if (response) return response;

    const { rows } = await sql`
      SELECT * FROM complaints WHERE consignor_id = ${consignor.id} ORDER BY id DESC
    `;
    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error('Error fetching consignor complaints', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const { consignor, response } = await requireConsignor(request);
    if (response) return response;

    const body = await request.json();
    const subject = String(body.subject || '').trim();
    const description = String(body.description || '').trim();
    if (!subject || !description) {
      return NextResponse.json({ success: false, error: 'Subject and description are required' }, { status: 400 });
    }

    const { rows } = await sql`
      INSERT INTO complaints (transport_id, consignor_id, lr_no, subject, description, status)
      VALUES (
        ${consignor.transport_id},
        ${consignor.id},
        ${String(body.lr_no || '').trim()},
        ${subject},
        ${description},
        'open'
      )
      RETURNING *
    `;
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating complaint', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
