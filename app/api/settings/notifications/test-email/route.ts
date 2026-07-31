import { NextResponse, NextRequest } from 'next/server';
import { ensureSchema } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/transport-auth';
import { can } from '@/lib/roles';
import { sendEmail } from '@/lib/email-service';

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
    const result = await sendEmail({
      transportId: user.transportId,
      to: user.email,
      subject: 'Test email from Trimurti TMS',
      html: `<p>This is a test email confirming your notification settings are working.</p>`,
    });

    if (!result.sent) {
      return NextResponse.json({ success: false, error: result.reason }, { status: 400 });
    }
    return NextResponse.json({ success: true, message: `Test email sent to ${user.email}` }, { status: 200 });
  } catch (error) {
    console.error('Error sending test email', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
