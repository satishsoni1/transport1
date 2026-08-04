import { NextResponse, NextRequest } from 'next/server';
import { ensureSchema } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/transport-auth';
import { can } from '@/lib/roles';
import { sendWhatsAppMessage } from '@/lib/whatsapp-service';

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ success: false, error: 'Login required' }, { status: 401 });
  }
  if (user.platformRole !== 'transport_admin' || !user.transportId) {
    return NextResponse.json(
      { success: false, error: 'Access denied: transport admin account required' },
      { status: 403 }
    );
  }
  if (!can(user, 'app-settings')) {
    return NextResponse.json(
      { success: false, error: 'Your role does not permit managing notification settings' },
      { status: 403 }
    );
  }

  try {
    await ensureSchema();
    const body = await request.json().catch(() => ({}));
    const to = String(body.mobile || '').trim();
    if (!to) {
      return NextResponse.json({ success: false, error: 'Enter a mobile number to send the test to' }, { status: 400 });
    }

    const result = await sendWhatsAppMessage({
      transportId: user.transportId,
      to,
      message: 'This is a test WhatsApp message confirming your notification settings are working.',
    });

    if (!result.sent) {
      return NextResponse.json({ success: false, error: result.reason }, { status: 400 });
    }
    return NextResponse.json({ success: true, message: `Test WhatsApp message sent to ${to}` }, { status: 200 });
  } catch (error) {
    console.error('Error sending test WhatsApp message', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
