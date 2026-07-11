import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ── Server-side snapshot cache ───────────────────────────────────────────────
// All viewers get the same data snapshot until the 30s window expires.
// The server embeds `snapshotExpiresAt` (Unix ms) in every response so
// clients can honour the same boundary even across hard refreshes.
const CACHE_TTL_MS = 30_000;
let cachedPayload: string | null = null;
let cacheExpiresAt = 0;
// ─────────────────────────────────────────────────────────────────────────────

export async function GET() {
  // Serve from cache if still valid
  if (cachedPayload && Date.now() < cacheExpiresAt) {
    return new NextResponse(cachedPayload, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'X-Cache': 'HIT',
      },
    });
  }

  const supabaseAdmin = createAdminClient();
  try {
    // Find the most recent active, paused, or completed election (so results persist after voting ends)
    const { data: election, error: electionErr } = await supabaseAdmin
      .from('elections')
      .select('id, name, results_visible, status, voting_start, voting_end, election_date')
      .in('status', ['active', 'paused', 'completed'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (electionErr || !election) {
      return NextResponse.json({ results_visible: false, election: null, hasElection: false });
    }

    const [
      { data: positions },
      { data: candidates },
      { data: partylists },
      { data: votes },
      { data: votersData },
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
        .select('id, full_name, position_id, course, year_level, image_url, partylist_id, platform, image_position')
        .eq('election_id', election.id),
      supabaseAdmin
        .from('partylists')
        .select('id, name, color')
        .eq('election_id', election.id),
      // Fetch voter_id too so we can build a per-course breakdown
      supabaseAdmin
        .from('votes')
        .select('voter_id, position_id, candidate_id')
        .eq('election_id', election.id),
      // Fetch course per voter for the breakdown join
      supabaseAdmin
        .from('voters')
        .select('id, course')
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

    // Build voter id→course lookup for the per-course breakdown
    const voterCourseMap: Record<string, string> = {};
    const allCoursesSet = new Set<string>();
    for (const voter of votersData || []) {
      if (voter.id && voter.course) {
        voterCourseMap[voter.id] = voter.course;
        allCoursesSet.add(voter.course);
      }
    }
    const allCourses = Array.from(allCoursesSet).sort();

    // Build tally in JS — at 1,500 voters × 10 positions this is ~15k tiny rows.
    // Fast enough; revisit with a DB view if voter count grows significantly.
    const tally: Record<string, number> = {};
    const abstainCounts: Record<string, number> = {};
    // votesByCourse: candidateId → { course → count }
    const votesByCourse: Record<string, Record<string, number>> = {};
    for (const v of votes || []) {
      if (v.candidate_id) {
        tally[v.candidate_id] = (tally[v.candidate_id] || 0) + 1;
        // Per-course breakdown
        const course = v.voter_id ? (voterCourseMap[v.voter_id] || 'Unknown') : 'Unknown';
        if (!votesByCourse[v.candidate_id]) votesByCourse[v.candidate_id] = {};
        votesByCourse[v.candidate_id][course] = (votesByCourse[v.candidate_id][course] || 0) + 1;
      } else if (v.position_id) {
        abstainCounts[v.position_id] = (abstainCounts[v.position_id] || 0) + 1;
      }
    }

    // Build a partylist id→name lookup
    const partylistMap: Record<string, string> = {};
    for (const p of partylists || []) {
      partylistMap[p.id] = p.name;
    }

    // Enrich candidates with their partylist name
    const enrichedCandidates = (candidates || []).map(c => ({
      ...c,
      partylist_name: c.partylist_id ? (partylistMap[c.partylist_id] || null) : null,
    }));

    const stats = {
      totalVoters: totalVoters || 0,
      votesCast: votesCast || 0,
      turnout: totalVoters ? Math.round(((votesCast || 0) / totalVoters) * 100) : 0,
    };

    // Align expiry to the next 30s wall-clock boundary so all server instances
    // and all clients agree on when the snapshot expires.
    // Subtract 1s so the client-side guard considers the snapshot expired
    // when the hook fires (which can be up to 1s before the exact boundary).
    const nowMs = Date.now();
    const nextBoundary = Math.ceil((nowMs + 1) / CACHE_TTL_MS) * CACHE_TTL_MS;
    cacheExpiresAt = nextBoundary - 1_000;

    if (!election.results_visible) {
      // Results hidden: return vote counts but anonymize candidate identity
      const anonymizedCandidates = (candidates || []).map((c, idx) => ({
        id: c.id,
        position_id: c.position_id,
        full_name: null,
        image_url: null,
        course: null,
        year_level: null,
        slot: idx + 1,
      }));

      const payload = JSON.stringify({
        results_visible: false,
        hasElection: true,
        snapshotExpiresAt: nextBoundary - 1_000,
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
        votesByCourse,
        allCourses,
        stats,
      });

      cachedPayload = payload;

      return new NextResponse(payload, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
          'X-Cache': 'MISS',
        },
      });
    }

    const payload = JSON.stringify({
      results_visible: true,
      hasElection: true,
      snapshotExpiresAt: nextBoundary - 1_000,
      election: {
        id: election.id,
        name: election.name,
        status: election.status,
        voting_start: election.voting_start,
        voting_end: election.voting_end,
        election_date: election.election_date,
      },
      positions: positions || [],
      candidates: enrichedCandidates,
      tally,
      abstainCounts,
      votesByCourse,
      allCourses,
      stats,
    });

    cachedPayload = payload;

    return new NextResponse(payload, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'X-Cache': 'MISS',
      },
    });
  } catch (err) {
    console.error('[public-results error]', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
