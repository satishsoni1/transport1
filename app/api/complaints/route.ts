import { NextResponse, NextRequest } from 'next/server';
import { sql, ensureSchema } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/transport-auth';
import { can } from '@/lib/roles';

async function requirePartiesAccess(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return { ok: false as const, error: 'Login required', status: 401 as const };
  }
  if (user.platformRole !== 'transport_admin' || !user.transportId) {
    return { ok: false as const, error: 'Access denied: transport admin account required', status: 403 as const };
  }
  if (!can(user, 'parties')) {
    return { ok: false as const, error: 'Your role does not permit managing complaints', status: 403 as const };
  }
  return { ok: true as const, transportId: user.transportId };
}

export async function GET(request: NextRequest) {
  const auth = await requirePartiesAccess(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    await ensureSchema();
    const { rows } = await sql`
      SELECT complaints.*, consignors.name AS consignor_name
      FROM complaints
      LEFT JOIN consignors ON consignors.id = complaints.consignor_id
      WHERE complaints.transport_id = ${auth.transportId}
      ORDER BY complaints.id DESC
    `;
    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error('Error fetching complaints', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
