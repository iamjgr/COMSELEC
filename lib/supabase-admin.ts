import { createClient } from '@supabase/supabase-js';

// Read env vars fresh inside the function so Vercel serverless functions
// always use the current environment variables rather than values captured
// at module load time (which can be stale across redeployments).
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

// Backwards-compatible alias — calls createAdminClient() so existing imports work.
export const supabaseAdmin = createAdminClient();
