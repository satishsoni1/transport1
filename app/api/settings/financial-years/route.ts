import { NextResponse } from 'next/server';
import { ensureSchema, sql } from '@/lib/db';

export async function GET() {
  try {
    await ensureSchema();
    const { rows } = await sql`
      SELECT
        financial_years.*,
        (app_settings.current_financial_year_id = financial_years.id OR financial_years.is_default) AS is_current
      FROM financial_years
      LEFT JOIN app_settings ON app_settings.id = 1
      ORDER BY start_date DESC
    `;
    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error('Error fetching financial years', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const body = await request.json();
    const label = String(body.year_label || '').trim();
    const startDate = String(body.start_date || '').trim();
    const endDate = String(body.end_date || '').trim();
    const makeDefault = Boolean(body.is_default);

    if (!label || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'Year label, start date, and end date are required' },
        { status: 400 }
      );
    }

    if (makeDefault) {
      await sql`UPDATE financial_years SET is_default = FALSE`;
    }

    const { rows } = await sql`
      INSERT INTO financial_years (year_label, start_date, end_date, is_default, status)
      VALUES (${label}, ${startDate}::date, ${endDate}::date, ${makeDefault}, ${body.status || 'active'})
      RETURNING *
    `;

    if (makeDefault) {
      await sql`
        UPDATE app_settings
        SET current_financial_year_id = ${rows[0].id}, updated_at = NOW()
        WHERE id = 1
      `;
    }

    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating financial year', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
