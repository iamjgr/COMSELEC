import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('[FATAL] Supabase environment variables are not configured.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    // Prevent Next.js 14 from caching Supabase fetch calls at the framework level.
    fetch: (url, options = {}) =>
      fetch(url, { ...options, cache: 'no-store' }),
  },
});
