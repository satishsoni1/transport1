import { NextResponse, NextRequest } from 'next/server';
import { sql, ensureSchema } from '@/lib/db';
import { resolveTransportAuth } from '@/lib/transport-auth';
import { sendEmail } from '@/lib/email-service';

export async function POST(request: NextRequest) {
  try {
    await ensureSchema();

    const auth = await resolveTransportAuth(request);
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }
    const { transportId } = auth;

    const { rows: settingsRows } = await sql`
      SELECT * FROM notification_settings WHERE transport_id = ${transportId} LIMIT 1
    `;
    const settings = settingsRows[0];
    if (!settings?.email_enabled || !settings?.notify_compliance_expiry) {
      return NextResponse.json(
        { success: false, error: 'Enable email notifications and compliance expiry alerts in Settings > Notifications first' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const daysParam = Number(searchParams.get('days'));
    const days = Number.isFinite(daysParam) && daysParam > 0 ? daysParam : 30;

    const { rows: items } = await sql`
      WITH vehicle_docs AS (
        SELECT id, vehicle_no AS name, 'RC' AS doc_type, rc_expiry AS expiry FROM vehicles WHERE transport_id = ${transportId}
        UNION ALL SELECT id, vehicle_no, 'Insurance', insurance_expiry FROM vehicles WHERE transport_id = ${transportId}
        UNION ALL SELECT id, vehicle_no, 'Fitness', fitness_expiry FROM vehicles WHERE transport_id = ${transportId}
        UNION ALL SELECT id, vehicle_no, 'Permit', permit_expiry FROM vehicles WHERE transport_id = ${transportId}
        UNION ALL SELECT id, vehicle_no, 'National Permit', national_permit_expiry FROM vehicles WHERE transport_id = ${transportId}
        UNION ALL SELECT id, vehicle_no, 'PUC', puc_expiry FROM vehicles WHERE transport_id = ${transportId}
        UNION ALL SELECT id, vehicle_no, 'Road Tax', road_tax_expiry FROM vehicles WHERE transport_id = ${transportId}
      ),
      driver_docs AS (
        SELECT id, driver_name AS name, 'License' AS doc_type, license_valid_to AS expiry
        FROM drivers WHERE transport_id = ${transportId}
      )
      SELECT 'vehicle' AS entity_type, name, doc_type, expiry::date AS expiry_date, (expiry::date - CURRENT_DATE) AS days_remaining
      FROM vehicle_docs WHERE expiry <> '' AND expiry::date <= CURRENT_DATE + ${days}::int
      UNION ALL
      SELECT 'driver' AS entity_type, name, doc_type, expiry::date AS expiry_date, (expiry::date - CURRENT_DATE) AS days_remaining
      FROM driver_docs WHERE expiry <> '' AND expiry::date <= CURRENT_DATE + ${days}::int
      ORDER BY days_remaining ASC
    `;

    if (items.length === 0) {
      return NextResponse.json({ success: true, sent: false, message: 'Nothing expiring — no email sent' }, { status: 200 });
    }

    const { rows: appSettingsRows } = await sql`
      SELECT support_email, company_email FROM app_settings WHERE transport_id = ${transportId} LIMIT 1
    `;
    const to = appSettingsRows[0]?.support_email || appSettingsRows[0]?.company_email;
    if (!to) {
      return NextResponse.json(
        { success: false, error: 'Set a support or company email in App Settings first' },
        { status: 400 }
      );
    }

    const rowsHtml = items
      .map(
        (item) =>
          `<tr><td>${item.entity_type}</td><td>${item.name}</td><td>${item.doc_type}</td><td>${item.expiry_date}</td><td>${item.days_remaining < 0 ? 'Expired' : `${item.days_remaining}d left`}</td></tr>`
      )
      .join('');

    const result = await sendEmail({
      transportId,
      to,
      subject: `Compliance Alert: ${items.length} document(s) expiring within ${days} days`,
      html: `<p>The following vehicle/driver documents are expiring soon:</p>
        <table border="1" cellpadding="6" style="border-collapse:collapse">
          <tr><th>Type</th><th>Name</th><th>Document</th><th>Expiry</th><th>Status</th></tr>
          ${rowsHtml}
        </table>`,
    });

    return NextResponse.json({ success: result.sent, sent: result.sent }, { status: 200 });
  } catch (error) {
    console.error('Error sending compliance alert', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
