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
        { success: false, error: 'Invalid city id' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const cityName = body.city_name ? String(body.city_name).trim() : undefined;

    const { rows: existingRows } = await sql`SELECT * FROM cities WHERE id = ${id}`;
    if (existingRows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'City not found' },
        { status: 404 }
      );
    }

    if (cityName) {
      const { rows: dupRows } = await sql`
        SELECT id FROM cities
        WHERE LOWER(city_name) = LOWER(${cityName}) AND id <> ${id}
      `;
      if (dupRows.length > 0) {
        return NextResponse.json(
          { success: false, error: 'City already exists' },
          { status: 409 }
        );
      }
    }

    const existing = existingRows[0];
    const { rows } = await sql`
      UPDATE cities
      SET
        city_name = ${cityName ?? existing.city_name},
        status = ${body.status ?? existing.status}
      WHERE id = ${id}
      RETURNING *
    `;
    return NextResponse.json(rows[0], { status: 200 });
  } catch (error) {
    console.error('Error updating city', error);
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
        { success: false, error: 'Invalid city id' },
        { status: 400 }
      );
    }

    const { rows } = await sql`DELETE FROM cities WHERE id = ${id} RETURNING id`;
    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'City not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting city', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
