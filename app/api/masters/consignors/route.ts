import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { ensureSchema } from '@/lib/db';
import { createHash } from 'crypto';

export async function GET() {
  try {
    await ensureSchema();
    const { rows } = await sql`
      SELECT
        id, name, name_mr, username, address, city, gst_no, contact_person, mobile,
        bank_name, account_no, status, created_at
      FROM consignors
      ORDER BY id DESC
    `;
    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error('Error fetching consignors', error);
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
    const username = String(body.username || '').trim();
    const password = String(body.password || '').trim();

    if (!body.name || !body.address || !body.city) {
      return NextResponse.json(
        { success: false, error: 'Name, address, and city are required' },
        { status: 400 }
      );
    }

    if ((username && !password) || (!username && password)) {
      return NextResponse.json(
        { success: false, error: 'Provide both username and password, or leave both blank' },
        { status: 400 }
      );
    }

    if (username) {
      const { rows: duplicateRows } = await sql`
        SELECT id
        FROM consignors
        WHERE LOWER(username) = LOWER(${username})
        LIMIT 1
      `;

      if (duplicateRows.length > 0) {
        return NextResponse.json(
          { success: false, error: 'Consignor username already exists' },
          { status: 400 }
        );
      }
    }

    const passwordHash = password
      ? createHash('sha256').update(password).digest('hex')
      : '';

    const { rows } = await sql`
      INSERT INTO consignors (
        name, name_mr, username, password, password_hash, address, city, gst_no, contact_person, mobile, bank_name, account_no, status
      )
      VALUES (
        ${body.name},
        ${body.name_mr || ''},
        ${username},
        '',
        ${passwordHash},
        ${body.address},
        ${body.city},
        ${body.gst_no || ''},
        ${body.contact_person || ''},
        ${body.mobile || ''},
        ${body.bank_name || ''},
        ${body.account_no || ''},
        ${body.status === 'inactive' ? 'inactive' : 'active'}
      )
      RETURNING id, name, name_mr, username, address, city, gst_no, contact_person, mobile, bank_name, account_no, status, created_at
    `;
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating consignor', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
