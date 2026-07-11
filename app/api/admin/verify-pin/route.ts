import { NextRequest, NextResponse } from 'next/server';
import { signSession, verifySession } from '@/lib/session';
import { checkPinRateLimit, recordFailedPinAttempt, clearAttempts } from '@/lib/rate-limit';

function getClientIp(req: NextRequest): string {
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const parts = forwarded.split(',');
    return parts[parts.length - 1].trim();
  }
  return 'unknown';
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);

    // Check PIN-specific rate limit before doing anything else
    const { allowed, attemptsLeft, retryAfterSeconds } = await checkPinRateLimit(ip);

    if (!allowed) {
      const minutes = Math.ceil((retryAfterSeconds ?? 0) / 60);
      return NextResponse.json(
        { error: 'TOO_MANY_ATTEMPTS', message: `Too many failed PIN attempts. Try again in ${minutes} minute(s).` },
        {
          status: 429,
          headers: { 'Retry-After': String(retryAfterSeconds ?? 900) },
        }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const session = await verifySession(token);

    // Must hold a valid intermediate token from the password step
    if (!session || session.role !== 'admin' || session.stage !== 'password_verified') {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const { pin } = await req.json();

    const adminPin = process.env.ADMIN_PIN;
    if (!adminPin) {
      console.error('[FATAL] ADMIN_PIN is not set in environment variables.');
      return NextResponse.json({ error: 'SERVER_MISCONFIGURED' }, { status: 500 });
    }

    if (pin !== adminPin) {
      await recordFailedPinAttempt(ip);
      const remaining = attemptsLeft - 1;
      return NextResponse.json(
        { error: 'INVALID_PIN', attemptsLeft: remaining },
        { status: 401 }
      );
    }

    // PIN correct — clear all attempt counters and issue the real 8-hour admin session
    await clearAttempts(ip);

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
      maxAge: 60 * 60 * 8,
    });

    return response;
  } catch (err) {
    console.error('[admin verify-pin error]', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
