import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    const result = await sql`
      SELECT setting_key, setting_value, data_type
      FROM app_settings
      ORDER BY setting_key
    `;

    const settings: Record<string, any> = {};
    for (const setting of result.rows) {
      const value = setting.data_type === 'number' 
        ? parseFloat(setting.setting_value) 
        : setting.data_type === 'boolean'
        ? setting.setting_value === 'true'
        : setting.setting_value;
      
      settings[setting.setting_key] = value;
    }

    return NextResponse.json(
      { success: true, settings },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get app settings error', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { setting_key, setting_value, data_type = 'string', description } = await request.json();

    if (!setting_key || setting_value === undefined) {
      return NextResponse.json(
        { success: false, error: 'setting_key and setting_value are required' },
        { status: 400 }
      );
    }

    const result = await sql`
      INSERT INTO app_settings (setting_key, setting_value, data_type, description)
      VALUES (${setting_key}, ${String(setting_value)}, ${data_type}, ${description || null})
      ON CONFLICT (setting_key) DO UPDATE
      SET setting_value = ${String(setting_value)}, updated_at = CURRENT_TIMESTAMP
      RETURNING setting_key, setting_value, data_type, description
    `;

    return NextResponse.json(
      { 
        success: true, 
        setting: result.rows[0]
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Update app settings error', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
