import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
  const { data, error } = await supabaseAdmin.from('voters').select('id, qr_token, election_id, elections ( status, start_time, end_time )').limit(1);
  console.log(JSON.stringify({data, error}, null, 2));
}
run();
