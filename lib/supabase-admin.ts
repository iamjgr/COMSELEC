import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('[FATAL] Supabase admin environment variables are not configured.');
}

// Create a fresh client per request rather than sharing a module-level singleton.
// A shared singleton caches its internal auth state and — more importantly — the
// supabase-js client uses an internal connection pool whose state can become stale
// across many requests in a long-running Next.js server process.  Creating a new
// client per call is cheap (no persistent TCP connection is held by supabase-js;
// it uses fetch under the hood) and guarantees every query goes to the database
// without stale in-process state from a previous request.
export function createAdminClient() {
  return createClient(supabaseUrl!, supabaseServiceKey!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

// Backwards-compatible alias so existing imports still work without touching
// every route file.  Calls createAdminClient() so each import site that
// uses this at module scope still gets a fresh client per module instantiation.
// NOTE: for true per-request freshness, prefer calling createAdminClient()
// inside each route handler — but this alias keeps things working with zero
// changes to existing routes.
export const supabaseAdmin = createAdminClient();
