import { NextResponse } from 'next/server';

import { requireSuperAdmin } from '@/lib/app-auth';
import { ensureSchema, sql } from '@/lib/db';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, response } = await requireSuperAdmin(request);
  if (response) return response;

  try {
    await ensureSchema();
    const { id } = await params;
    const transportId = Number(id);
    if (!Number.isFinite(transportId) || transportId <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid transport id' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { rows: existingRows } = await sql`
      SELECT * FROM transports WHERE id = ${transportId}
    `;
    const existing = existingRows[0];
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Transport not found' },
        { status: 404 }
      );
    }

    const { rows } = await sql`
      UPDATE transports
      SET
        company_name = ${body.company_name ?? existing.company_name},
        contact_email = ${body.contact_email ?? existing.contact_email},
        contact_phone = ${body.contact_phone ?? existing.contact_phone},
        status = ${body.status ?? existing.status},
        subscription_plan = ${body.subscription_plan ?? existing.subscription_plan},
        subscription_start_date = COALESCE(NULLIF(${String(body.subscription_start_date ?? existing.subscription_start_date ?? '')}, '')::date, subscription_start_date),
        subscription_end_date = COALESCE(NULLIF(${String(body.subscription_end_date ?? existing.subscription_end_date ?? '')}, '')::date, subscription_end_date),
        subscription_warning_days = ${
          body.subscription_warning_days === undefined
            ? Number(existing.subscription_warning_days || 7)
            : Number(body.subscription_warning_days) || 7
        },
        notes = ${body.notes ?? existing.notes},
        updated_at = NOW()
      WHERE id = ${transportId}
      RETURNING *
    `;

    await sql`
      INSERT INTO audit_logs (action, entity_type, entity_id, details, user_name)
      VALUES (
        'UPDATE',
        'transport',
        ${String(transportId)},
        ${`Updated transport ${rows[0].company_name}`},
        ${user?.email || 'system'}
      )
    `;

    return NextResponse.json(rows[0], { status: 200 });
  } catch (error) {
    console.error('Error updating transport', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
