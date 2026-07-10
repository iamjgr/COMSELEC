import { createAdminClient } from '@/lib/supabase-admin';

const MAX_ATTEMPTS = 5;
const WINDOW_MINUTES = 15;
const LOCKOUT_MINUTES = 15;

const PIN_MAX_ATTEMPTS = 3;
const PIN_LOCKOUT_MINUTES = 15;

export async function checkRateLimit(ip: string) {
  return _check(ip, MAX_ATTEMPTS, WINDOW_MINUTES, LOCKOUT_MINUTES);
}

export async function checkPinRateLimit(ip: string) {
  return _check(`${ip}:pin`, PIN_MAX_ATTEMPTS, WINDOW_MINUTES, PIN_LOCKOUT_MINUTES);
}

async function _check(key: string, maxAttempts: number, windowMinutes: number, lockoutMinutes: number): Promise<{
  allowed: boolean;
  attemptsLeft: number;
  retryAfterSeconds?: number;
}> {
  const supabaseAdmin = createAdminClient();
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

  const { count, error } = await supabaseAdmin
    .from('admin_login_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('ip', key)
    .gte('attempted_at', windowStart);

  if (error) {
    console.error('[rate-limit] DB error checking attempts:', error);
    return { allowed: true, attemptsLeft: maxAttempts };
  }

  const attempts = count ?? 0;

  if (attempts >= maxAttempts) {
    const { data: oldest } = await supabaseAdmin
      .from('admin_login_attempts')
      .select('attempted_at')
      .eq('ip', key)
      .gte('attempted_at', windowStart)
      .order('attempted_at', { ascending: true })
      .limit(1)
      .single();

    const lockoutExpiry = oldest
      ? new Date(new Date(oldest.attempted_at).getTime() + lockoutMinutes * 60 * 1000)
      : new Date(Date.now() + lockoutMinutes * 60 * 1000);

    const retryAfterSeconds = Math.max(0, Math.ceil((lockoutExpiry.getTime() - Date.now()) / 1000));
    return { allowed: false, attemptsLeft: 0, retryAfterSeconds };
  }

  return { allowed: true, attemptsLeft: maxAttempts - attempts };
}

export async function recordFailedAttempt(ip: string): Promise<void> {
  await _record(ip);
}

export async function recordFailedPinAttempt(ip: string): Promise<void> {
  await _record(`${ip}:pin`);
}

async function _record(key: string): Promise<void> {
  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin
    .from('admin_login_attempts')
    .insert({ ip: key });

  if (error) console.error('[rate-limit] Failed to record attempt:', error);
}

export async function clearAttempts(ip: string): Promise<void> {
  const supabaseAdmin = createAdminClient();

  const { error: e1 } = await supabaseAdmin
    .from('admin_login_attempts')
    .delete()
    .eq('ip', ip);

  const { error: e2 } = await supabaseAdmin
    .from('admin_login_attempts')
    .delete()
    .eq('ip', `${ip}:pin`);

  if (e1) console.error('[rate-limit] Failed to clear password attempts:', e1);
  if (e2) console.error('[rate-limit] Failed to clear PIN attempts:', e2);
}
