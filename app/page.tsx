import { createAdminClient } from '@/lib/supabase-admin';
import LandingClient from './LandingClient';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const supabaseAdmin = createAdminClient();
  // Fetch all active elections for the informational dialog
  const { data: activeElections } = await supabaseAdmin
    .from('elections')
    .select('id, name, voting_start, voting_end')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  const hasActiveElection = (activeElections?.length ?? 0) > 0;

  return (
    <LandingClient
      activeElections={activeElections ?? []}
      hasActiveElection={hasActiveElection}
    />
  );
}
