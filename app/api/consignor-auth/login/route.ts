import { NextResponse } from 'next/server';
import { ensureSchema, sql } from '@/lib/db';
import { createConsignorToken, hashConsignorPassword } from '@/lib/consignor-auth';

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const body = await request.json();
    const username = String(body.username || '').trim();
    const password = String(body.password || '').trim();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username and password are required' },
        { status: 400 }
      );
    }

    const { rows } = await sql`
      SELECT *
      FROM consignors
      WHERE LOWER(username) = LOWER(${username})
        AND status = 'active'
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid consignor credentials' },
        { status: 401 }
      );
    }

    const consignor = rows[0];
    const passwordHash = hashConsignorPassword(password);
    const storedHash = String(consignor.password_hash || '').trim();
    const storedLegacyPassword = String(consignor.password || '').trim();
    const passwordMatches =
      (storedHash && storedHash === passwordHash) ||
      (!storedHash && storedLegacyPassword !== '' && storedLegacyPassword === password);

    if (!passwordMatches) {
      return NextResponse.json(
        { success: false, error: 'Invalid consignor credentials' },
        { status: 401 }
      );
    }

    if (!storedHash && storedLegacyPassword === password) {
      await sql`
        UPDATE consignors
        SET
          password = '',
          password_hash = ${passwordHash}
        WHERE id = ${consignor.id}
      `;
      consignor.password = '';
      consignor.password_hash = passwordHash;
    }

    const token = createConsignorToken(consignor);

    return NextResponse.json(
      {
        success: true,
        token,
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
  } catch (error) {
    console.error('Error logging in consignor', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
