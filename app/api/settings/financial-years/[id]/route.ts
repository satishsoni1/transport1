import { NextResponse } from 'next/server';
import { ensureSchema, sql } from '@/lib/db';

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
      return NextResponse.json({ success: false, error: 'Invalid financial year id' }, { status: 400 });
    }

    const body = await request.json();
    const { rows: existingRows } = await sql`SELECT * FROM financial_years WHERE id = ${id}`;
    if (!existingRows.length) {
      return NextResponse.json({ success: false, error: 'Financial year not found' }, { status: 404 });
    }
    const existing = existingRows[0];
    const makeDefault = Boolean(body.is_default);
    if (makeDefault) {
      await sql`UPDATE financial_years SET is_default = FALSE`;
    }

    const { rows } = await sql`
      UPDATE financial_years
      SET
        year_label = ${body.year_label ?? existing.year_label},
        start_date = ${body.start_date === undefined ? existing.start_date : `${body.start_date}`}::date,
        end_date = ${body.end_date === undefined ? existing.end_date : `${body.end_date}`}::date,
        is_default = ${makeDefault ? true : body.is_default === undefined ? existing.is_default : false},
        status = ${body.status ?? existing.status}
      WHERE id = ${id}
      RETURNING *
    `;

    if (makeDefault) {
      await sql`
        UPDATE app_settings
        SET current_financial_year_id = ${id}, updated_at = NOW()
        WHERE id = 1
      `;
    }

    return NextResponse.json(rows[0], { status: 200 });
  } catch (error) {
    console.error('Error updating financial year', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
