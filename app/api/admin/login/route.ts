import { NextRequest, NextResponse } from 'next/server';
import { signSession } from '@/lib/session';
import { checkRateLimit, recordFailedAttempt, clearAttempts } from '@/lib/rate-limit';

function getClientIp(req: NextRequest): string {
  // Vercel forwards the real IP in this header
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);

    // Check rate limit before even looking at the password
    const { allowed, attemptsLeft, retryAfterSeconds } = await checkRateLimit(ip);

    if (!allowed) {
      const minutes = Math.ceil((retryAfterSeconds ?? 0) / 60);
      return NextResponse.json(
        { error: 'TOO_MANY_ATTEMPTS', message: `Too many failed attempts. Try again in ${minutes} minute(s).` },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfterSeconds ?? 900),
          },
        }
      );
    }

    const { password } = await req.json();

    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      console.error('[FATAL] ADMIN_PASSWORD is not set in environment variables.');
      return NextResponse.json({ error: 'SERVER_MISCONFIGURED' }, { status: 500 });
    }

    if (password !== adminPassword) {
      // Record failed attempt and return how many tries are left
      await recordFailedAttempt(ip);
      const remaining = attemptsLeft - 1;
      return NextResponse.json(
        { error: 'INVALID_PASSWORD', attemptsLeft: remaining },
        { status: 401 }
      );
    }

    // Successful login — clear attempt history for this IP
    await clearAttempts(ip);

    // Issue admin JWT — valid for 8 hours
    const sessionToken = await signSession(
      { role: 'admin', auth_time: Date.now() },
      { expiresIn: '8h' }
    );

    const response = NextResponse.json({ success: true, session: sessionToken });
    response.cookies.set('admin_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
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
