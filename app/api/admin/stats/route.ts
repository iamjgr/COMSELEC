import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { verifySession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const sessionToken = authHeader.split(' ')[1];
    const session = await verifySession(sessionToken);
    if (!session || session.role !== 'admin') return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const url = new URL(req.url);
    const electionId = url.searchParams.get('election_id');
    if (!electionId) return NextResponse.json({ error: 'ELECTION_ID_REQUIRED' }, { status: 400 });

    const supabaseAdmin = createAdminClient();

    const [
      settingsRes,
      positions,
      candidates,
      // Count total voters and voted voters using head:true — DB does the count, no rows transferred
      { count: totalVoters },
      { count: votesCast },
      // Fetch all votes in one query — used for tally + dept breakdown
      // At 1,500 voters × 10 positions = ~15k rows. Acceptable for an admin-only endpoint
      // that only one person polls. If this grows, move to a DB view or RPC.
      votesRes,
      // Voter demographics — 1,500 rows, lightweight (3 columns only)
      votersRes,
    ] = await Promise.all([
      supabaseAdmin.from('elections').select('*').eq('id', electionId).single(),
      supabaseAdmin.from('positions').select('*').eq('election_id', electionId).order('order_index'),
      supabaseAdmin.from('candidates').select('*').eq('election_id', electionId).order('order_index'),
      supabaseAdmin.from('voters').select('*', { count: 'exact', head: true }).eq('election_id', electionId),
      supabaseAdmin.from('voters').select('*', { count: 'exact', head: true }).eq('election_id', electionId).eq('has_voted', true),
      supabaseAdmin.from('votes').select('candidate_id, position_id, voter_id').eq('election_id', electionId),
      supabaseAdmin.from('voters').select('id, course, year_level, has_voted').eq('election_id', electionId),
    ]);

    const settings = settingsRes.data ?? null;
    const votes = votesRes.data ?? [];
    const voters = votersRes.data ?? [];

    // Build voter demographics
    const demographicsMap: Record<string, Record<string, { total: number; voted: number }>> = {};
    for (const v of voters) {
      const course = v.course || 'Unknown';
      const year = v.year_level ? `Year ${v.year_level}` : 'Unknown';
      if (!demographicsMap[course]) demographicsMap[course] = {};
      if (!demographicsMap[course][year]) demographicsMap[course][year] = { total: 0, voted: 0 };
      demographicsMap[course][year].total += 1;
      if (v.has_voted) demographicsMap[course][year].voted += 1;
    }
    const voterDemographics = Object.entries(demographicsMap)
      .map(([course, yearMap]) => {
        const years = Object.entries(yearMap)
          .map(([year, counts]) => ({ year, ...counts }))
          .sort((a, b) => a.year.localeCompare(b.year));
        const courseTotal = years.reduce((s, y) => s + y.total, 0);
        const courseVoted = years.reduce((s, y) => s + y.voted, 0);
        return { course, total: courseTotal, voted: courseVoted, years };
      })
      .sort((a, b) => a.course.localeCompare(b.course));

    // Archived election — return summary data only (no live vote rows needed)
    if (settings && settings.status === 'archived' && settings.summary_data) {
      const sum = settings.summary_data;
      const flatPositions: any[] = [];
      const flatCandidates: any[] = [];
      const mappedTally: Record<string, number> = {};
      const mappedAbstains: Record<string, number> = {};
      for (const pos of (sum.positions || [])) {
        flatPositions.push({ id: pos.id, name: pos.name, max_selections: pos.max_selections });
        mappedAbstains[pos.id] = pos.abstains || 0;
        for (const c of (pos.candidates || [])) {
          flatCandidates.push({
            id: c.id, position_id: pos.id, full_name: c.name,
            first_name: c.first_name || '', middle_name: c.middle_name || '',
            last_name: c.last_name || '', course: c.course || '',
            year_level: c.year_level || '', image_url: c.image_url || null,
          });
          mappedTally[c.id] = c.votes;
        }
      }
      return NextResponse.json({
        totalVoters: sum.stats?.total_voters || 0,
        votesCast: sum.stats?.total_voted || 0,
        turnout: sum.stats?.turnout_percentage || 0,
        settings, positions: flatPositions, candidates: flatCandidates,
        tally: mappedTally, abstainCounts: mappedAbstains,
        voterDemographics: sum.voter_demographics || [],
      }, { headers: { 'Cache-Control': 'no-store', 'Pragma': 'no-cache' } });
    }

    // Build vote tallies
    const tally: Record<string, number> = {};
    const abstainCounts: Record<string, number> = {};
    const voterCourseMap: Record<string, string> = {};
    for (const v of voters) {
      if (v.id) voterCourseMap[v.id] = v.course || 'Unknown';
    }
    const deptTally: Record<string, Record<string, number>> = {};
    const deptAbstains: Record<string, Record<string, number>> = {};

    for (const v of votes) {
      if (v.candidate_id) {
        tally[v.candidate_id] = (tally[v.candidate_id] || 0) + 1;
      } else if (v.position_id) {
        abstainCounts[v.position_id] = (abstainCounts[v.position_id] || 0) + 1;
      }
      const course = v.voter_id ? (voterCourseMap[v.voter_id] || 'Unknown') : 'Unknown';
      if (!deptTally[course]) deptTally[course] = {};
      if (!deptAbstains[course]) deptAbstains[course] = {};
      if (v.candidate_id) {
        deptTally[course][v.candidate_id] = (deptTally[course][v.candidate_id] || 0) + 1;
      } else if (v.position_id) {
        deptAbstains[course][v.position_id] = (deptAbstains[course][v.position_id] || 0) + 1;
      }
    }

    return NextResponse.json({
      totalVoters: totalVoters || 0,
      votesCast: votesCast || 0,
      turnout: totalVoters ? ((votesCast || 0) / totalVoters) * 100 : 0,
      settings,
      positions: positions.data || [],
      candidates: candidates.data || [],
      tally, abstainCounts, deptTally, deptAbstains, voterDemographics,
    }, { headers: { 'Cache-Control': 'no-store', 'Pragma': 'no-cache' } });

  } catch (err) {
    console.error('[stats] error:', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
