import { NextResponse, NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { ensureSchema, parseJsonField } from '@/lib/db';
import { resolveTransportAuth } from '@/lib/transport-auth';

function toResponseRow(row: any) {
  return { ...row, lr_list: parseJsonField(row.lr_list, []) };
}

async function findConflictingChallanLr(
  transportId: number,
  lrNos: string[],
  excludeId?: number
) {
  const { rows } = await sql`SELECT id, challan_no, lr_list FROM challans WHERE transport_id = ${transportId}`;

  for (const row of rows) {
    if (excludeId !== undefined && Number(row.id) === excludeId) continue;
    const lrList = parseJsonField<any[]>(row.lr_list, []);
    const match = lrList.find((item) => lrNos.includes(String(item?.lr_no || '').trim()));
    if (match) {
      return {
        challan_no: String(row.challan_no || ''),
        lr_no: String(match.lr_no || ''),
      };
    }
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    await ensureSchema();

    const auth = await resolveTransportAuth(request);
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }
    const { transportId } = auth;

    const { rows } = await sql`
      SELECT * FROM challans WHERE transport_id = ${transportId} ORDER BY id DESC
    `;
    return NextResponse.json(rows.map(toResponseRow), { status: 200 });
  } catch (error) {
    console.error('Error fetching challans', error);
    return NextResponse.json(
      { success: false, error: 'Database error. Configure DATABASE_URL.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureSchema();

    const auth = await resolveTransportAuth(request);
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }
    const { transportId } = auth;

    const body = await request.json();

    if (!body.from_city || !body.to_city) {
      return NextResponse.json(
        { success: false, error: 'From city and to city are required' },
        { status: 400 }
      );
    }

    const lrList = Array.isArray(body.lr_list) ? body.lr_list : [];
    if (lrList.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one LR is required' },
        { status: 400 }
      );
    }

    const lrNos = lrList
      .map((item: any) => String(item?.lr_no || '').trim())
      .filter(Boolean);
    const conflictingLr = await findConflictingChallanLr(transportId, lrNos);
    if (conflictingLr) {
      return NextResponse.json(
        {
          success: false,
          error: `L.R. ${conflictingLr.lr_no} is already used in challan ${conflictingLr.challan_no}`,
        },
        { status: 400 }
      );
    }

    const totalFreight = lrList.reduce(
      (sum: number, item: any) => sum + (Number(item.freight) || 0),
      0
    );
    const totalToPay = lrList
      .filter((item: any) => item.status === 'to_pay')
      .reduce((sum: number, item: any) => sum + (Number(item.freight) || 0), 0);
    const totalPaid = lrList
      .filter((item: any) => item.status === 'paid')
      .reduce((sum: number, item: any) => sum + (Number(item.freight) || 0), 0);
    const shortReading = Number(body.short_reading) || 0;
    const ratePerKm = Number(body.rate_per_km) || 0;
    const readingTotal =
      body.reading_total === undefined
        ? shortReading * ratePerKm
        : Number(body.reading_total) || 0;

    // Per-transport atomic challan number
    const { rows: seqRows } = await sql`SELECT get_next_doc_number(${transportId}, 'challan') AS seq`;
    const challanNo = `CH${String(Number(seqRows[0].seq)).padStart(5, '0')}`;

    // vehicle_id/driver_id are auto-matched client-side, not user-asserted — verify tenant
    // ownership and silently drop rather than reject if they don't resolve to this tenant.
    const vehicleId = body.vehicle_id
      ? (await sql`SELECT id FROM vehicles WHERE id = ${Number(body.vehicle_id)} AND transport_id = ${transportId}`).rows[0]?.id ?? null
      : null;
    const driverId = body.driver_id
      ? (await sql`SELECT id FROM drivers WHERE id = ${Number(body.driver_id)} AND transport_id = ${transportId}`).rows[0]?.id ?? null
      : null;

    const { rows } = await sql`
      INSERT INTO challans (
        transport_id, challan_no, challan_date, from_city, to_city, truck_no, driver_name, driver_mobile,
        owner_name, eway_no, remarks, engine_reading, short_reading, rate_per_km, reading_total,
        hamali, advance, lr_list, total_freight, total_to_pay, total_paid, status, created_by,
        vehicle_id, driver_id
      )
      VALUES (
        ${transportId},
        ${challanNo},
        NOW(),
        ${body.from_city},
        ${body.to_city},
        ${body.truck_no || ''},
        ${body.driver_name || ''},
        ${body.driver_mobile || ''},
        ${body.owner_name || ''},
        ${body.eway_no || ''},
        ${body.remarks || ''},
        ${Number(body.engine_reading) || 0},
        ${shortReading},
        ${ratePerKm},
        ${readingTotal},
        ${Number(body.hamali) || 0},
        ${Number(body.advance) || 0},
        ${JSON.stringify(lrList)}::jsonb,
        ${totalFreight},
        ${totalToPay},
        ${totalPaid},
        'open',
        ${String(body.created_by || '').trim()},
        ${vehicleId},
        ${driverId}
      )
      RETURNING *
    `;
    return NextResponse.json(toResponseRow(rows[0]), { status: 201 });
  } catch (error) {
    console.error('Error creating challan', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
