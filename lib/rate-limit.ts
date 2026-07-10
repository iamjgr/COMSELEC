import { supabaseAdmin } from '@/lib/supabase-admin';

const MAX_ATTEMPTS = 5;           // max failed attempts before lockout
const WINDOW_MINUTES = 15;        // rolling window in minutes
const LOCKOUT_MINUTES = 15;       // how long the lockout lasts

/**
 * Check if an IP is currently rate limited.
 * Records a failed attempt if `recordFailure` is true.
 * Call with recordFailure=false to just check, recordFailure=true after a failed login.
 */
export async function checkRateLimit(ip: string): Promise<{
  allowed: boolean;
  attemptsLeft: number;
  retryAfterSeconds?: number;
}> {
  const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();

  // Count recent failed attempts from this IP within the window
  const { count, error } = await supabaseAdmin
    .from('admin_login_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('ip', ip)
    .gte('attempted_at', windowStart);

  if (error) {
    // If we can't check, fail open (allow) to avoid locking out on DB errors
    console.error('[rate-limit] DB error checking attempts:', error);
    return { allowed: true, attemptsLeft: MAX_ATTEMPTS };
  }

  const attempts = count ?? 0;

  if (attempts >= MAX_ATTEMPTS) {
    // Find the oldest attempt in window to calculate when lockout expires
    const { data: oldest } = await supabaseAdmin
      .from('admin_login_attempts')
      .select('attempted_at')
      .eq('ip', ip)
      .gte('attempted_at', windowStart)
      .order('attempted_at', { ascending: true })
      .limit(1)
      .single();

    const lockoutExpiry = oldest
      ? new Date(new Date(oldest.attempted_at).getTime() + LOCKOUT_MINUTES * 60 * 1000)
      : new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);

    const retryAfterSeconds = Math.max(0, Math.ceil((lockoutExpiry.getTime() - Date.now()) / 1000));

    return { allowed: false, attemptsLeft: 0, retryAfterSeconds };
  }

  return { allowed: true, attemptsLeft: MAX_ATTEMPTS - attempts };
}

/**
 * Record a failed login attempt for an IP.
 */
export async function recordFailedAttempt(ip: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('admin_login_attempts')
    .insert({ ip });

  if (error) {
    console.error('[rate-limit] Failed to record attempt:', error);
  }
}

/**
 * Clear all attempts for an IP on successful login.
 */
export async function clearAttempts(ip: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('admin_login_attempts')
    .delete()
    .eq('ip', ip);

  if (error) {
    console.error('[rate-limit] Failed to clear attempts:', error);
  }
}
