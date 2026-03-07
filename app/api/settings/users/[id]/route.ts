import { NextResponse } from 'next/server';
import { sql, ensureSchema } from '@/lib/db';

function parseId(rawId: string) {
  const id = Number(rawId);
  return Number.isNaN(id) ? null : id;
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSchema();
    const { id: rawId } = await context.params;
    const id = parseId(rawId);
    if (id === null) {
      return NextResponse.json(
        { success: false, error: 'Invalid user id' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { rows: existingRows } = await sql`SELECT * FROM app_users WHERE id = ${id}`;
    if (existingRows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const existing = existingRows[0];
    const email = body.email ?? existing.email;
    if (email !== existing.email) {
      const { rows: dupRows } = await sql`
        SELECT id FROM app_users WHERE LOWER(email) = LOWER(${email}) AND id <> ${id}
      `;
      if (dupRows.length > 0) {
        return NextResponse.json(
          { success: false, error: 'User with this email already exists' },
          { status: 409 }
        );
      }
    }

    const { rows } = await sql`
      UPDATE app_users
      SET
        email = ${email},
        first_name = ${body.first_name ?? existing.first_name},
        last_name = ${body.last_name ?? existing.last_name},
        role = ${body.role ?? existing.role},
        status = ${body.status ?? existing.status}
      WHERE id = ${id}
      RETURNING id, email, first_name, last_name, role, status, created_at
    `;

    await sql`
      INSERT INTO audit_logs (action, entity_type, entity_id, details, user_name)
      VALUES (
        'UPDATE',
        'app_user',
        ${String(id)},
        ${`Updated user ${rows[0].email}`},
        'system'
      )
    `;

    return NextResponse.json(rows[0], { status: 200 });
  } catch (error) {
    console.error('Error updating user', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSchema();
    const { id: rawId } = await context.params;
    const id = parseId(rawId);
    if (id === null) {
      return NextResponse.json(
        { success: false, error: 'Invalid user id' },
        { status: 400 }
      );
    }

    const { rows } = await sql`DELETE FROM app_users WHERE id = ${id} RETURNING id`;
    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    await sql`
      INSERT INTO audit_logs (action, entity_type, entity_id, details, user_name)
      VALUES ('DELETE', 'app_user', ${String(id)}, 'Deleted user', 'system')
    `;

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting user', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
