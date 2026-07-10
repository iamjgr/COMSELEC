import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Find the active election
    const { data: election, error: electionErr } = await supabaseAdmin
      .from('elections')
      .select('id, name, results_visible, status')
      .eq('status', 'active')
      .single();

    if (electionErr || !election) {
      return NextResponse.json({ results_visible: false, election: null });
    }

    if (!election.results_visible) {
      return NextResponse.json({ results_visible: false, election: null });
    }

    const [
      { data: positions },
      { data: candidates },
      { data: votes },
    ] = await Promise.all([
      supabaseAdmin
        .from('positions')
        .select('id, name, order_index, max_selections')
        .eq('election_id', election.id)
        .order('order_index'),
      supabaseAdmin
        .from('candidates')
        .select('id, full_name, position_id, course, year_level, image_url')
        .eq('election_id', election.id),
      supabaseAdmin
        .from('votes')
        .select('position_id, candidate_id')
        .eq('election_id', election.id),
    ]);

    // Build tally
    const tally: Record<string, number> = {};
    const abstainCounts: Record<string, number> = {};
    for (const v of votes || []) {
      if (v.candidate_id) {
        tally[v.candidate_id] = (tally[v.candidate_id] || 0) + 1;
      } else if (v.position_id) {
        abstainCounts[v.position_id] = (abstainCounts[v.position_id] || 0) + 1;
      }
    }

    return NextResponse.json({
      results_visible: true,
      election,
      positions: positions || [],
      candidates: candidates || [],
      tally,
      abstainCounts,
    });
  } catch (err) {
    console.error('[public-results error]', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
