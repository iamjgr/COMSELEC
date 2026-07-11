import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const supabaseAdmin = createAdminClient();
  try {
    // Only serve candidates for a pending election (not started yet)
    const { data: election, error: electionErr } = await supabaseAdmin
      .from('elections')
      .select('id, name, election_date, candidates_public')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (electionErr || !election) {
      return NextResponse.json({ hasElection: false, candidates_public: false });
    }

    // If admin hasn't enabled candidates visibility, return the shell with no data
    if (!election.candidates_public) {
      return NextResponse.json({
        hasElection: true,
        candidates_public: false,
        election: { id: election.id, name: election.name, election_date: election.election_date },
        positions: [],
        candidates: [],
      });
    }

    const [{ data: positions }, { data: candidates }, { data: partylists }] = await Promise.all([
      supabaseAdmin
        .from('positions')
        .select('id, name, order_index, max_selections')
        .eq('election_id', election.id)
        .order('order_index'),
      supabaseAdmin
        .from('candidates')
        .select('id, full_name, position_id, course, year_level, image_url, image_position, platform, partylist_id')
        .eq('election_id', election.id)
        .order('order_index'),
      supabaseAdmin
        .from('partylists')
        .select('id, name, color')
        .eq('election_id', election.id),
    ]);

    const partylistMap: Record<string, { name: string; color: string }> = {};
    for (const p of partylists || []) {
      partylistMap[p.id] = { name: p.name, color: p.color };
    }

    const enrichedCandidates = (candidates || []).map(c => ({
      ...c,
      partylist_name: c.partylist_id ? (partylistMap[c.partylist_id]?.name ?? null) : null,
      partylist_color: c.partylist_id ? (partylistMap[c.partylist_id]?.color ?? null) : null,
    }));

    return NextResponse.json({
      hasElection: true,
      candidates_public: true,
      election: { id: election.id, name: election.name, election_date: election.election_date },
      positions: positions || [],
      candidates: enrichedCandidates,
    });
  } catch (err) {
    console.error('[public-candidates error]', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
