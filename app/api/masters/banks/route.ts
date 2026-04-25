import { NextResponse, NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { ensureSchema } from '@/lib/db';
import { resolveTransportAuth } from '@/lib/transport-auth';

export async function GET(request: NextRequest) {
  try {
    await ensureSchema();

    const auth = await resolveTransportAuth(request);
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }
    const { transportId } = auth;

    const { rows } = await sql`SELECT * FROM banks WHERE transport_id = ${transportId} ORDER BY id DESC`;
    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error('Error fetching banks', error);
    return NextResponse.json(
      { success: false, error: 'Database error. Configure DATABASE_URL.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureSchema();

    const auth = await resolveTransportAuth(request);
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }
    const { transportId } = auth;

    const body = await request.json();

    if (!body.bank_name || !body.account_no) {
      return NextResponse.json(
        { success: false, error: 'Bank name and account no are required' },
        { status: 400 }
      );
    }

    const { rows } = await sql`
      INSERT INTO banks (transport_id, bank_name, branch, ifsc_code, account_no, account_holder, status)
      VALUES (
        ${transportId},
        ${body.bank_name},
        ${body.branch || ''},
        ${body.ifsc_code || ''},
        ${body.account_no},
        ${body.account_holder || ''},
        'active'
      )
      RETURNING *
    `;
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating bank', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
