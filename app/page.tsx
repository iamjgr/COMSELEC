import { createAdminClient } from '@/lib/supabase-admin';
import LandingClient from './LandingClient';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const supabaseAdmin = createAdminClient();

  const [{ data: activeElections }, { data: pendingElections }] = await Promise.all([
    supabaseAdmin
      .from('elections')
      .select('id, name, voting_start, voting_end')
      .eq('status', 'active')
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('elections')
      .select('id')
      .eq('status', 'pending')
      .limit(1),
  ]);

  // Only show carousel photos when candidates_public = true on the election.
  // Pull election IDs where candidates are visible, then fetch those candidates.
  const { data: publicElections } = await supabaseAdmin
    .from('elections')
    .select('id')
    .eq('candidates_public', true)
    .in('status', ['active', 'pending']);

  const publicElectionIds = (publicElections ?? []).map(e => e.id);

  let carouselCandidates: { id: string; full_name: string; image_url: string }[] = [];
  if (publicElectionIds.length > 0) {
    const { data } = await supabaseAdmin
      .from('candidates')
      .select('id, full_name, image_url')
      .in('election_id', publicElectionIds)
      .not('image_url', 'is', null)
      .neq('image_url', '')
      .order('order_index');
    carouselCandidates = data ?? [];
  }

  const hasActiveElection  = (activeElections?.length ?? 0) > 0;
  const hasPendingElection = (pendingElections?.length ?? 0) > 0;

  return (
    <LandingClient
      activeElections={activeElections ?? []}
      hasActiveElection={hasActiveElection}
      hasPendingElection={hasPendingElection}
      carouselCandidates={carouselCandidates}
    />
  );
}
