import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';

import { requireSuperAdmin } from '@/lib/app-auth';
import { ensureSchema, sql } from '@/lib/db';

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'transport-company';
}

function describeSubscription(endDate: string | null, warningDays: number) {
  if (!endDate) {
    return { status: 'active', daysRemaining: null };
  }

  const today = new Date();
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const end = new Date(endDate);
  const diff = Math.ceil(
    (new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime() - current.getTime()) /
      (1000 * 60 * 60 * 24)
  );

  if (diff < 0) return { status: 'expired', daysRemaining: diff };
  if (diff <= warningDays) return { status: 'near_expiry', daysRemaining: diff };
  return { status: 'active', daysRemaining: diff };
}

export async function GET(request: Request) {
  const { response } = await requireSuperAdmin(request);
  if (response) return response;

  try {
    await ensureSchema();
    const { rows } = await sql`
      SELECT
        transports.id,
        transports.company_name,
        transports.slug,
        transports.contact_email,
        transports.contact_phone,
        transports.status,
        transports.subscription_plan,
        transports.subscription_start_date::text,
        transports.subscription_end_date::text,
        transports.subscription_warning_days,
        transports.created_at,
        users.id AS admin_user_id,
        users.email AS admin_email,
        users.first_name AS admin_first_name,
        users.last_name AS admin_last_name
      FROM transports
      LEFT JOIN users
        ON users.transport_id = transports.id
       AND users.platform_role = 'transport_admin'
      ORDER BY transports.created_at DESC, users.created_at ASC
    `;

    return NextResponse.json(
      rows.map((row) => ({
        ...row,
        subscription: describeSubscription(
          row.subscription_end_date,
          Number(row.subscription_warning_days || 7)
        ),
      })),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching transports', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const { user, response } = await requireSuperAdmin(request);
  if (response) return response;

  try {
    await ensureSchema();
    const body = await request.json();

    const companyName = String(body.company_name || '').trim();
    const adminEmail = String(body.admin_email || '').trim().toLowerCase();
    const adminPassword = String(body.admin_password || '').trim();
    const adminFirstName = String(body.admin_first_name || '').trim();
    const adminLastName = String(body.admin_last_name || '').trim();
    const contactPhone = String(body.contact_phone || '').trim();
    const subscriptionPlan = String(body.subscription_plan || 'standard').trim();
    const warningDays = Number(body.subscription_warning_days || 7);
    const subscriptionStartDate = String(body.subscription_start_date || '').trim();
    const subscriptionEndDate = String(body.subscription_end_date || '').trim();

    if (!companyName || !adminEmail || !adminPassword || !adminFirstName || !adminLastName) {
      return NextResponse.json(
        {
          success: false,
          error: 'Company name, admin email, password, first name, and last name are required',
        },
        { status: 400 }
      );
    }

    const slug = slugify(companyName);
    const { rows: existingTransportRows } = await sql`
      SELECT id FROM transports WHERE slug = ${slug}
    `;
    if (existingTransportRows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'A transport with this name already exists' },
        { status: 409 }
      );
    }

    const { rows: existingUserRows } = await sql`
      SELECT id FROM users WHERE LOWER(email) = LOWER(${adminEmail})
    `;
    if (existingUserRows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'A login with this email already exists' },
        { status: 409 }
      );
    }

    const { rows: transportRows } = await sql`
      INSERT INTO transports (
        company_name,
        slug,
        contact_email,
        contact_phone,
        status,
        subscription_plan,
        subscription_start_date,
        subscription_end_date,
        subscription_warning_days
      )
      VALUES (
        ${companyName},
        ${slug},
        ${adminEmail},
        ${contactPhone},
        'active',
        ${subscriptionPlan},
        NULLIF(${subscriptionStartDate}, '')::date,
        NULLIF(${subscriptionEndDate}, '')::date,
        ${Number.isFinite(warningDays) ? warningDays : 7}
      )
      RETURNING *
    `;

    const transport = transportRows[0];
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    const { rows: adminRows } = await sql`
      INSERT INTO users (
        email,
        password_hash,
        first_name,
        last_name,
        role,
        platform_role,
        transport_id,
        status
      )
      VALUES (
        ${adminEmail},
        ${passwordHash},
        ${adminFirstName},
        ${adminLastName},
        'Admin',
        'transport_admin',
        ${transport.id},
        'active'
      )
      RETURNING id, email, first_name, last_name
    `;

    await sql`
      INSERT INTO audit_logs (action, entity_type, entity_id, details, user_name)
      VALUES (
        'CREATE',
        'transport',
        ${String(transport.id)},
        ${`Created transport ${companyName} with admin ${adminEmail}`},
        ${user?.email || 'system'}
      )
    `;

    return NextResponse.json(
      {
        ...transport,
        admin_user: adminRows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating transport', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
