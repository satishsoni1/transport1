import { NextResponse, NextRequest } from 'next/server';
import { sql, ensureSchema } from '@/lib/db';
import { resolveTransportAuth } from '@/lib/transport-auth';

export async function GET(request: NextRequest) {
  try {
    await ensureSchema();
    const auth = await resolveTransportAuth(request);
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }
    const { rows } = await sql`SELECT * FROM branches WHERE transport_id = ${auth.transportId} ORDER BY branch_name ASC`;
    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error('Error fetching branches', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureSchema();
    const auth = await resolveTransportAuth(request);
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }
    const body = await request.json();
    const branchName = String(body.branch_name || '').trim();
    if (!branchName) {
      return NextResponse.json({ success: false, error: 'Branch name is required' }, { status: 400 });
    }
    const { rows } = await sql`
      INSERT INTO branches (transport_id, branch_name, address, city, status)
      VALUES (${auth.transportId}, ${branchName}, ${String(body.address || '').trim()}, ${String(body.city || '').trim()}, 'active')
      RETURNING *
    `;
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating branch', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
