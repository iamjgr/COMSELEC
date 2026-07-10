const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixStuckVoters() {
  console.log('Fetching all votes to find voters...');
  const { data: votes, error: votesError } = await supabase
    .from('votes')
    .select('voter_id');

  if (votesError) {
    console.error("Error fetching votes:", votesError);
    process.exit(1);
  }

  // Get unique voter IDs that have cast a vote
  const voterIds = Array.from(new Set(votes.map(v => v.voter_id))).filter(Boolean);
  console.log(`Found ${voterIds.length} unique voters who have cast votes.`);

  if (voterIds.length === 0) {
    console.log("No voters to fix.");
    return;
  }

  console.log("Updating voters...");
  
  // Update those voters to have has_voted = true
  const { data: updated, error: updateError } = await supabase
    .from('voters')
    .update({ has_voted: true, voted_at: new Date().toISOString() })
    .in('id', voterIds)
    .eq('has_voted', false)
    .select();

  if (updateError) {
    console.error("Error updating voters:", updateError);
    process.exit(1);
  }

  console.log(`Successfully fixed ${updated?.length || 0} stuck voters.`);
}

fixStuckVoters();
