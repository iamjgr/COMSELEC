import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('[FATAL] Supabase admin environment variables are not configured.');
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
