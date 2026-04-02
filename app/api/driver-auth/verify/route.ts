import { NextResponse } from 'next/server';
import { requireDriver } from '@/lib/driver-auth';

export async function GET(request: Request) {
  const { driver, response } = await requireDriver(request);
  if (response) return response;

  return NextResponse.json(
    {
      success: true,
      driver: {
        id: driver.id,
        driver_name: driver.driver_name,
        username: driver.username,
        mobile: driver.mobile,
        vehicle_no: driver.vehicle_no,
      },
    },
    { status: 200 }
  );
}
