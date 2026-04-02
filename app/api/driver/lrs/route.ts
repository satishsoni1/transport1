import { NextResponse } from 'next/server';
import { ensureSchema, sql } from '@/lib/db';
import { requireDriver } from '@/lib/driver-auth';

export async function GET(request: Request) {
  try {
    await ensureSchema();
    const { driver, response } = await requireDriver(request);
    if (response) return response;

    const { searchParams } = new URL(request.url);
    const rawSearch = String(searchParams.get('search') || '').trim();
    const driverName = String(driver.driver_name || '').trim();
    const driverMobile = String(driver.mobile || '').trim();
    const vehicleNo = String(driver.vehicle_no || '').trim();

    const searchLike = `%${rawSearch}%`;
    const { rows } = await sql`
      SELECT
        id,
        lr_no,
        lr_date,
        invoice_no,
        from_city,
        to_city,
        delivery_address,
        driver_name,
        driver_mobile,
        pod_received,
        pod_image_url,
        remarks,
        return_remark,
        status
      FROM lr_entries
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
        OR EXISTS (
          SELECT 1
          FROM challans
          WHERE (
            LOWER(BTRIM(challans.driver_name)) = LOWER(BTRIM(${driverName}))
            OR (
              ${driverMobile} <> ''
              AND BTRIM(challans.driver_mobile) <> ''
              AND BTRIM(challans.driver_mobile) = BTRIM(${driverMobile})
            )
            OR (
              ${vehicleNo} <> ''
              AND BTRIM(challans.truck_no) <> ''
              AND LOWER(BTRIM(challans.truck_no)) = LOWER(BTRIM(${vehicleNo}))
            )
          )
          AND EXISTS (
            SELECT 1
            FROM jsonb_array_elements(challans.lr_list) AS lr_item
            WHERE UPPER(BTRIM(COALESCE(lr_item->>'lr_no', ''))) = UPPER(BTRIM(lr_entries.lr_no))
          )
        )
      )
      AND (
        ${rawSearch} = ''
        OR lr_no ILIKE ${searchLike}
        OR invoice_no ILIKE ${searchLike}
      )
      ORDER BY pod_received ASC, lr_date DESC, id DESC
      LIMIT 50
    `;

    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error('Error fetching driver LRs', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
