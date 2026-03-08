import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { ensureSchema } from '@/lib/db';

export async function GET() {
  try {
    await ensureSchema();
    const { rows } = await sql`SELECT * FROM consignees ORDER BY id DESC`;
    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error('Error fetching consignees', error);
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

    if (!body.name || !body.address || !body.city) {
      return NextResponse.json(
        { success: false, error: 'Name, address, and city are required' },
        { status: 400 }
      );
    }

    const { rows } = await sql`
      INSERT INTO consignees (name, name_mr, address, city, city_mr, gst_no, contact_person, mobile, status)
      VALUES (
        ${body.name},
        ${body.name_mr || ''},
        ${body.address},
        ${body.city},
        ${body.city_mr || ''},
        ${body.gst_no || ''},
        ${body.contact_person || ''},
        ${body.mobile || ''},
        'active'
      )
      RETURNING *
    `;
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating consignee', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
