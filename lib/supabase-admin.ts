import { createClient } from '@supabase/supabase-js';

/**
 * Creates a fresh Supabase admin client on every call.
 *
 * CRITICAL: env vars are intentionally read INSIDE this function, not at
 * module load time. Vercel serverless functions can freeze and reuse module
 * instances across deployments, causing module-level `process.env` reads to
 * capture stale values from a previous deployment's environment. Reading
 * inside the function body guarantees the current deployment's env vars are
 * always used.
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
    global: {
      // Next.js 14 caches fetch() calls at the framework level by default.
      // Force no-store on every Supabase request so DB reads are always fresh.
      fetch: (url, options = {}) =>
        fetch(url, { ...options, cache: 'no-store' }),
    },
  });
}

// NOTE: Do NOT export a module-level singleton like:
//   export const supabaseAdmin = createAdminClient()
// That would capture env vars at module load time and break on Vercel.
// Always call createAdminClient() directly inside each route handler.
