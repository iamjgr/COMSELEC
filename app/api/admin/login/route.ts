import { NextRequest, NextResponse } from 'next/server';
import { signSession } from '@/lib/session';
import { checkRateLimit, recordFailedAttempt, clearAttempts } from '@/lib/rate-limit';

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);

    const { allowed, attemptsLeft, retryAfterSeconds } = await checkRateLimit(ip);

    if (!allowed) {
      const minutes = Math.ceil((retryAfterSeconds ?? 0) / 60);
      return NextResponse.json(
        { error: 'TOO_MANY_ATTEMPTS', message: `Too many failed attempts. Try again in ${minutes} minute(s).` },
        {
          status: 429,
          headers: { 'Retry-After': String(retryAfterSeconds ?? 900) },
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
      await recordFailedAttempt(ip);
      const remaining = attemptsLeft - 1;
      return NextResponse.json(
        { error: 'INVALID_PASSWORD', attemptsLeft: remaining },
        { status: 401 }
      );
    }

    // Password correct — clear attempt history and issue a short-lived intermediate token.
    // The full admin session is only granted after the PIN is confirmed.
    await clearAttempts(ip);

    const intermediateToken = await signSession(
      { role: 'admin', stage: 'password_verified' },
      { expiresIn: '5m' }
    );

    return NextResponse.json({ success: true, intermediate: intermediateToken });
  } catch (err) {
    console.error('[login error]', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
