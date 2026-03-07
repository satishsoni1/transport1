import { NextResponse } from 'next/server';
import { sql, ensureSchema } from '@/lib/db';

function parseId(rawId: string) {
  const id = Number(rawId);
  return Number.isNaN(id) ? null : id;
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSchema();
    const { id: rawId } = await context.params;
    const id = parseId(rawId);
    if (id === null) {
      return NextResponse.json(
        { success: false, error: 'Invalid driver id' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { rows: existingRows } = await sql`SELECT * FROM drivers WHERE id = ${id}`;
    if (existingRows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Driver not found' },
        { status: 404 }
      );
    }

    const existing = existingRows[0];
    const { rows } = await sql`
      UPDATE drivers
      SET
        driver_name = ${body.driver_name ?? existing.driver_name},
        mobile = ${body.mobile ?? existing.mobile},
        license_no = ${body.license_no ?? existing.license_no},
        status = ${body.status ?? existing.status}
      WHERE id = ${id}
      RETURNING *
    `;
    return NextResponse.json(rows[0], { status: 200 });
  } catch (error) {
    console.error('Error updating driver', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSchema();
    const { id: rawId } = await context.params;
    const id = parseId(rawId);
    if (id === null) {
      return NextResponse.json(
        { success: false, error: 'Invalid driver id' },
        { status: 400 }
      );
    }

    const { rows } = await sql`DELETE FROM drivers WHERE id = ${id} RETURNING id`;
    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Driver not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting driver', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
