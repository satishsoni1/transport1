import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { ensureSchema } from '@/lib/db';

export async function GET() {
  try {
    await ensureSchema();
    const { rows } = await sql`SELECT * FROM banks ORDER BY id DESC`;
    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error('Error fetching banks', error);
    return NextResponse.json(
      { success: false, error: 'Database error. Configure DATABASE_URL for Neon (or POSTGRES_URL).' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const body = await request.json();

    if (!body.bank_name || !body.account_no) {
      return NextResponse.json(
        { success: false, error: 'Bank name and account no are required' },
        { status: 400 }
      );
    }

    const { rows } = await sql`
      INSERT INTO banks (bank_name, branch, ifsc_code, account_no, account_holder, status)
      VALUES (
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
