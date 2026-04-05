import { NextResponse } from 'next/server';
import { requireConsignor } from '@/lib/consignor-auth';

export async function GET(request: Request) {
  const { consignor, response } = await requireConsignor(request);
  if (response) return response;

  return NextResponse.json(
    {
      success: true,
      consignor: {
        id: consignor.id,
        name: consignor.name,
        username: consignor.username,
        city: consignor.city,
        mobile: consignor.mobile,
      },
    },
    { status: 200 }
  );
}
