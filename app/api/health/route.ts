import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    {
      success: true,
      data: {
        status: 'ok',
        message: 'Next.js local API is running',
      },
    },
    { status: 200 }
  );
}

