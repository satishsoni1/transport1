import { NextResponse } from 'next/server';
import { requireVendor } from '@/lib/vendor-auth';

export async function GET(request: Request) {
  const { vendor, response } = await requireVendor(request);
  if (response) return response;

  return NextResponse.json(
    {
      success: true,
      vendor: {
        id: vendor.id,
        vendor_name: vendor.vendor_name,
        username: vendor.username,
        mobile: vendor.mobile,
      },
    },
    { status: 200 }
  );
}
