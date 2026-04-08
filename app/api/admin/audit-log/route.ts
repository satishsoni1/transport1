import { NextResponse } from 'next/server';
import { ensureSchema, sql } from '@/lib/db';

export async function GET(request: Request) {
  try {
    await ensureSchema();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || '';
    const entityType = searchParams.get('entity_type') || '';
    const from = searchParams.get('from') || '';
    const to = searchParams.get('to') || '';
    const limit = Math.min(Number(searchParams.get('limit') || 200), 1000);

    const { rows } = await sql`
      SELECT *
      FROM audit_logs
      WHERE (${action} = '' OR action = ${action})
        AND (${entityType} = '' OR entity_type = ${entityType})
        AND (${from} = '' OR created_at::date >= NULLIF(${from}, '')::date)
        AND (${to} = '' OR created_at::date <= NULLIF(${to}, '')::date)
      ORDER BY id DESC
      LIMIT ${Number.isFinite(limit) && limit > 0 ? limit : 200}
    `;
    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error('Error fetching audit logs', error);
    return NextResponse.json(
      { success: false, error: 'Database error. Configure local PostgreSQL connection settings.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const body = await request.json();
    const action = String(body.action || '').trim().toUpperCase();
    const entityType = String(body.entity_type || '').trim();

    if (!action || !entityType) {
      return NextResponse.json(
        { success: false, error: 'action and entity_type are required' },
        { status: 400 }
      );
    }

    const { rows } = await sql`
      INSERT INTO audit_logs (action, entity_type, entity_id, details, user_name)
      VALUES (
        ${action},
        ${entityType},
        ${String(body.entity_id || '').trim()},
        ${String(body.details || '').trim()},
        ${String(body.user_name || '').trim()}
      )
      RETURNING *
    `;
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating audit log', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
