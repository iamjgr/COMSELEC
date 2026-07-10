import { NextResponse } from 'next/server';
import { signSession } from '@/lib/session';

export async function POST(req: Request) {
  try {
    const { password } = await req.json();

    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      console.error('[FATAL] ADMIN_PASSWORD is not set in environment variables.');
      return NextResponse.json({ error: 'SERVER_MISCONFIGURED' }, { status: 500 });
    }

    if (password !== adminPassword) {
      return NextResponse.json({ error: 'INVALID_PASSWORD' }, { status: 401 });
    }

    // Issue admin JWT — valid for 8 hours
    const sessionToken = await signSession(
      { role: 'admin', auth_time: Date.now() },
      { expiresIn: '8h' }
    );

    // Set httpOnly cookie for middleware protection + return token for client-side API calls
    const response = NextResponse.json({ success: true, session: sessionToken });
    response.cookies.set('admin_session', sessionToken, {
      httpOnly: true,
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 8, // 8 hours
    });

    return response;
  } catch (err) {
    console.error('[login error]', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
