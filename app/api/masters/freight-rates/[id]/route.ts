import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { ensureSchema } from '@/lib/db';

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
        { success: false, error: 'Invalid freight rate id' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { rows: existingRows } = await sql`SELECT * FROM freight_rates WHERE id = ${id}`;
    if (existingRows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Freight rate not found' },
        { status: 404 }
      );
    }

    const existing = existingRows[0];
    const ratePerKg =
      body.rate_per_kg === undefined ? existing.rate_per_kg : Number(body.rate_per_kg);
    const minRate = body.min_rate === undefined ? existing.min_rate : Number(body.min_rate);
    if (Number.isNaN(ratePerKg) || Number.isNaN(minRate)) {
      return NextResponse.json(
        { success: false, error: 'Rate values must be valid numbers' },
        { status: 400 }
      );
    }

    const { rows } = await sql`
      UPDATE freight_rates
      SET
        from_city = ${body.from_city ?? existing.from_city},
        to_city = ${body.to_city ?? existing.to_city},
        rate_per_kg = ${ratePerKg},
        min_rate = ${minRate},
        vehicle_type = ${body.vehicle_type ?? existing.vehicle_type}
      WHERE id = ${id}
      RETURNING *
    `;
    return NextResponse.json(rows[0], { status: 200 });
  } catch (error) {
    console.error('Error updating freight rate', error);
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
        { success: false, error: 'Invalid freight rate id' },
        { status: 400 }
      );
    }

    const { rows } = await sql`DELETE FROM freight_rates WHERE id = ${id} RETURNING id`;
    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Freight rate not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting freight rate', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
