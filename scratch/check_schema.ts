import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

async function checkSchema() {
  const { data: tables } = await supabase.rpc('get_tables'); 
  // If rpc doesn't exist, we'll just try to select from information_schema
  
  const { data: columns, error } = await supabase.from('information_schema.columns').select('*').limit(1);
  if (error) {
     console.error("Cannot access information_schema via REST. Falling back to querying known tables...");
  }
}

checkSchema();
