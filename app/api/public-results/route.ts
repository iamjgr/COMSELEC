import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const supabaseAdmin = createAdminClient();
  try {
    // Find the most recent active or completed election (so results persist after voting ends)
    const { data: election, error: electionErr } = await supabaseAdmin
      .from('elections')
      .select('id, name, results_visible, status, voting_start, voting_end, election_date')
      .in('status', ['active', 'completed'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (electionErr || !election) {
      return NextResponse.json({ results_visible: false, election: null, hasElection: false });
    }

    const [
      { data: positions },
      { data: candidates },
      { data: votes },
      { count: totalVoters },
      { count: votesCast },
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
      // Fetch only the two columns needed for tallying — minimises row size
      supabaseAdmin
        .from('votes')
        .select('position_id, candidate_id')
        .eq('election_id', election.id),
      supabaseAdmin
        .from('voters')
        .select('*', { count: 'exact', head: true })
        .eq('election_id', election.id),
      supabaseAdmin
        .from('voters')
        .select('*', { count: 'exact', head: true })
        .eq('election_id', election.id)
        .eq('has_voted', true),
    ]);

    // Build tally in JS — at 1,500 voters × 10 positions this is ~15k tiny rows.
    // Fast enough; revisit with a DB view if voter count grows significantly.
    const tally: Record<string, number> = {};
    const abstainCounts: Record<string, number> = {};
    for (const v of votes || []) {
      if (v.candidate_id) {
        tally[v.candidate_id] = (tally[v.candidate_id] || 0) + 1;
      } else if (v.position_id) {
        abstainCounts[v.position_id] = (abstainCounts[v.position_id] || 0) + 1;
      }
    }

    const stats = {
      totalVoters: totalVoters || 0,
      votesCast: votesCast || 0,
      turnout: totalVoters ? Math.round(((votesCast || 0) / totalVoters) * 100) : 0,
    };

    if (!election.results_visible) {
      // Results hidden: return vote counts but anonymize candidate identity
      const anonymizedCandidates = (candidates || []).map((c, idx) => ({
        id: c.id,
        position_id: c.position_id,
        // Mask identity — only expose a slot label
        full_name: null,
        image_url: null,
        course: null,
        year_level: null,
        slot: idx + 1,
      }));

      return NextResponse.json({
        results_visible: false,
        hasElection: true,
        election: {
          id: election.id,
          name: election.name,
          status: election.status,
          voting_start: election.voting_start,
          voting_end: election.voting_end,
          election_date: election.election_date,
        },
        positions: positions || [],
        candidates: anonymizedCandidates,
        tally,
        abstainCounts,
        stats,
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
        }
      });
    }

    return NextResponse.json({
      results_visible: true,
      hasElection: true,
      election: {
        id: election.id,
        name: election.name,
        status: election.status,
        voting_start: election.voting_start,
        voting_end: election.voting_end,
        election_date: election.election_date,
      },
      positions: positions || [],
      candidates: candidates || [],
      tally,
      abstainCounts,
      stats,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
      }
    });
  } catch (err) {
    console.error('[public-results error]', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
