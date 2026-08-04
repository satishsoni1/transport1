import { NextResponse, NextRequest } from 'next/server';
import { sql, ensureSchema } from '@/lib/db';
import { resolveTransportAuth } from '@/lib/transport-auth';

const EVENT_TYPES = new Set(['allocation', 'rotation', 'retreading', 'replacement']);

function parseId(rawId: string) {
  const id = Number(rawId);
  return Number.isNaN(id) ? null : id;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSchema();

    const auth = await resolveTransportAuth(request);
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }
    const { transportId } = auth;

    const { id: rawId } = await context.params;
    const tyreId = parseId(rawId);
    if (tyreId === null) {
      return NextResponse.json({ success: false, error: 'Invalid tyre id' }, { status: 400 });
    }

    const { rows: tyreRows } = await sql`SELECT id FROM tyres WHERE id = ${tyreId} AND transport_id = ${transportId}`;
    if (tyreRows.length === 0) {
      return NextResponse.json({ success: false, error: 'Tyre not found' }, { status: 404 });
    }

    const { rows } = await sql`
      SELECT * FROM tyre_events WHERE tyre_id = ${tyreId} AND transport_id = ${transportId}
      ORDER BY event_date DESC, id DESC
    `;
    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error('Error fetching tyre events', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSchema();

    const auth = await resolveTransportAuth(request);
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }
    const { transportId } = auth;

    const { id: rawId } = await context.params;
    const tyreId = parseId(rawId);
    if (tyreId === null) {
      return NextResponse.json({ success: false, error: 'Invalid tyre id' }, { status: 400 });
    }

    const { rows: tyreRows } = await sql`SELECT id FROM tyres WHERE id = ${tyreId} AND transport_id = ${transportId}`;
    if (tyreRows.length === 0) {
      return NextResponse.json({ success: false, error: 'Tyre not found' }, { status: 404 });
    }

    const body = await request.json();
    const eventType = String(body.event_type || '');
    if (!EVENT_TYPES.has(eventType)) {
      return NextResponse.json(
        { success: false, error: `event_type must be one of ${[...EVENT_TYPES].join(', ')}` },
        { status: 400 }
      );
    }
    const eventDate = String(body.event_date || '').trim();
    if (!eventDate) {
      return NextResponse.json({ success: false, error: 'Event date is required' }, { status: 400 });
    }

    const vehicleId = body.vehicle_id
      ? (await sql`SELECT id FROM vehicles WHERE id = ${Number(body.vehicle_id)} AND transport_id = ${transportId}`).rows[0]?.id ?? null
      : null;

    const { rows } = await sql`
      INSERT INTO tyre_events (transport_id, tyre_id, event_type, event_date, vehicle_id, position, cost, remarks)
      VALUES (
        ${transportId},
        ${tyreId},
        ${eventType},
        ${eventDate},
        ${vehicleId},
        ${String(body.position || '').trim()},
        ${Number(body.cost) || 0},
        ${String(body.remarks || '').trim()}
      )
      RETURNING *
    `;

    if (eventType === 'replacement' || eventType === 'rotation') {
      await sql`
        UPDATE tyres SET vehicle_id = ${vehicleId}, position = ${String(body.position || '').trim()}
        WHERE id = ${tyreId} AND transport_id = ${transportId}
      `;
    }
    if (eventType === 'retreading') {
      await sql`UPDATE tyres SET status = 'retreaded' WHERE id = ${tyreId} AND transport_id = ${transportId}`;
    }

    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error('Error adding tyre event', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
