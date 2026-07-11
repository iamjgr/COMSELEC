import { createAdminClient } from '@/lib/supabase-admin';
import LandingClient from './LandingClient';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const supabaseAdmin = createAdminClient();

  const [{ data: activeElections }, { data: pendingElections }] = await Promise.all([
    // Active elections for the voting flow
    supabaseAdmin
      .from('elections')
      .select('id, name, voting_start, voting_end')
      .eq('status', 'active')
      .order('created_at', { ascending: false }),
    // Pending elections for "Meet the Candidates" button
    supabaseAdmin
      .from('elections')
      .select('id')
      .eq('status', 'pending')
      .limit(1),
  ]);

  const hasActiveElection = (activeElections?.length ?? 0) > 0;
  const hasPendingElection = (pendingElections?.length ?? 0) > 0;

  return (
    <LandingClient
      activeElections={activeElections ?? []}
      hasActiveElection={hasActiveElection}
      hasPendingElection={hasPendingElection}
    />
  );
}
