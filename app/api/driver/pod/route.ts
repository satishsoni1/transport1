import { NextResponse } from 'next/server';
import { ensureSchema, sql } from '@/lib/db';
import { requireDriver } from '@/lib/driver-auth';

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const { driver, response } = await requireDriver(request);
    if (response) return response;

    const body = await request.json();
    const lrNo = String(body.lr_no || '').trim();
    const podImageUrl = String(body.pod_image_url || '').trim();
    const remarks = String(body.remarks || '').trim();

    if (!lrNo || !podImageUrl) {
      return NextResponse.json(
        { success: false, error: 'LR number and POD image are required' },
        { status: 400 }
      );
    }

    const { rows: existingRows } = await sql`
      SELECT *
      FROM lr_entries
      WHERE UPPER(BTRIM(lr_no)) = UPPER(BTRIM(${lrNo}))
      LIMIT 1
    `;

    if (existingRows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'LR not found' },
        { status: 404 }
      );
    }

    const existing = existingRows[0];
    const driverName = String(driver.driver_name || '').trim();
    const driverMobile = String(driver.mobile || '').trim();
    const vehicleNo = String(driver.vehicle_no || '').trim();
    const matchesDirectDriver =
      String(existing.driver_name || '').trim().toLowerCase() ===
        driverName.toLowerCase() ||
      (
        String(existing.driver_mobile || '').trim() &&
        String(existing.driver_mobile || '').trim() === driverMobile
      ) ||
      (
        String(existing.truck_no || '').trim() &&
        String(existing.truck_no || '').trim().toLowerCase() === vehicleNo.toLowerCase()
      );

    let matchesChallanDriver = false;
    if (!matchesDirectDriver) {
      const { rows: challanRows } = await sql`
        SELECT id
        FROM challans
        WHERE (
          LOWER(BTRIM(driver_name)) = LOWER(BTRIM(${driverName}))
          OR (
            ${driverMobile} <> ''
            AND BTRIM(driver_mobile) <> ''
            AND BTRIM(driver_mobile) = BTRIM(${driverMobile})
          )
          OR (
            ${vehicleNo} <> ''
            AND BTRIM(truck_no) <> ''
            AND LOWER(BTRIM(truck_no)) = LOWER(BTRIM(${vehicleNo}))
          )
        )
        AND EXISTS (
          SELECT 1
          FROM jsonb_array_elements(challans.lr_list) AS lr_item
          WHERE UPPER(BTRIM(COALESCE(lr_item->>'lr_no', ''))) = UPPER(BTRIM(${existing.lr_no}))
        )
        LIMIT 1
      `;
      matchesChallanDriver = challanRows.length > 0;
    }

    if (!matchesDirectDriver && !matchesChallanDriver) {
      return NextResponse.json(
        { success: false, error: 'This LR is not assigned to the logged-in driver' },
        { status: 403 }
      );
    }

    const mergedRemark = [String(existing.remarks || '').trim(), remarks]
      .filter(Boolean)
      .join(' | ');

    const { rows } = await sql`
      UPDATE lr_entries
      SET
        pod_received = TRUE,
        pod_image_url = ${podImageUrl},
        pod_received_at = NOW(),
        pod_received_by_driver_id = ${driver.id},
        pod_received_by_driver_name = ${driver.driver_name},
        remarks = ${mergedRemark}
      WHERE id = ${existing.id}
      RETURNING *
    `;

    return NextResponse.json(rows[0], { status: 200 });
  } catch (error) {
    console.error('Error uploading POD', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
