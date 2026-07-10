import { createClient } from '@supabase/supabase-js';

/**
 * Creates a fresh Supabase admin client on every call.
 * IMPORTANT: env vars are read inside the function body, not at module load time.
 * This prevents Vercel serverless functions from reusing a frozen module instance
 * that captured stale env var values from a previous deployment.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('[FATAL] Supabase admin environment variables are not configured.');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

// Backwards-compatible alias
export const supabaseAdmin = createAdminClient();
