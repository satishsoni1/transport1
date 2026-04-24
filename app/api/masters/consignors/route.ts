import { NextResponse, NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { ensureSchema } from '@/lib/db';
import { createHash } from 'crypto';
import { requireTransportAuth } from '@/lib/transport-auth';

export async function GET(request: NextRequest) {
  try {
    await ensureSchema();
    
    // Get authenticated user's transport ID
    const transportId = await requireTransportAuth(request);
    
    const { rows } = await sql`
      SELECT
        id, name, name_mr, username, address, city, gst_no, lr_print_instructions, contact_person, mobile,
        bank_name, account_no, default_payment_method, status, created_at
      FROM consignors
      WHERE transport_id = ${transportId}
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

export async function POST(request: NextRequest) {
  try {
    await ensureSchema();
    
    // Get authenticated user's transport ID
    const transportId = await requireTransportAuth(request);
    
    const body = await request.json();
    const username = String(body.username || '').trim();
    const password = String(body.password || '').trim();
    const defaultPaymentMethod = ['paid', 'tbb'].includes(String(body.default_payment_method))
      ? String(body.default_payment_method)
      : 'to_pay';

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
        WHERE transport_id = ${transportId}
        AND LOWER(username) = LOWER(${username})
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
        transport_id, name, name_mr, username, password, password_hash, address, city, gst_no, lr_print_instructions, contact_person, mobile, bank_name, account_no, default_payment_method, status
      )
      VALUES (
        ${transportId},
        ${body.name},
        ${body.name_mr || ''},
        ${username},
        '',
        ${passwordHash},
        ${body.address},
        ${body.city},
        ${body.gst_no || ''},
        ${body.lr_print_instructions || ''},
        ${body.contact_person || ''},
        ${body.mobile || ''},
        ${body.bank_name || ''},
        ${body.account_no || ''},
        ${defaultPaymentMethod},
        ${body.status === 'inactive' ? 'inactive' : 'active'}
      )
      RETURNING id, name, name_mr, username, address, city, gst_no, lr_print_instructions, contact_person, mobile, bank_name, account_no, default_payment_method, status, created_at
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
