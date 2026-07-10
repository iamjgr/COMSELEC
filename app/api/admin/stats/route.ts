import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { verifySession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const supabaseAdmin = createAdminClient();
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const sessionToken = authHeader.split(' ')[1];
    const session = await verifySession(sessionToken);
    if (!session || session.role !== 'admin') return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const url = new URL(req.url);
    const electionId = url.searchParams.get('election_id');
    if (!electionId) return NextResponse.json({ error: 'ELECTION_ID_REQUIRED' }, { status: 400 });

    const [
      { count: totalVoters },
      { count: votesCast },
      { data: settings },
      { data: positions },
      { data: candidates },
      { data: votes },
      { data: voters }
    ] = await Promise.all([
      supabaseAdmin.from('voters').select('*', { count: 'exact', head: true }).eq('election_id', electionId),
      supabaseAdmin.from('voters').select('*', { count: 'exact', head: true }).eq('election_id', electionId).eq('has_voted', true),
      supabaseAdmin.from('elections').select('*').eq('id', electionId).single(),
      supabaseAdmin.from('positions').select('*').eq('election_id', electionId).order('order_index'),
      supabaseAdmin.from('candidates').select('*').eq('election_id', electionId).order('order_index'),
      // Fetch all vote rows: candidate votes AND abstains (candidate_id IS NULL)
      supabaseAdmin.from('votes').select('candidate_id, position_id').eq('election_id', electionId),
      // Fetch voter demographics
      supabaseAdmin.from('voters').select('course, year_level, has_voted').eq('election_id', electionId),
    ]);

    // Build voter demographics: group by course → year_level
    const demographicsMap: Record<string, Record<string, { total: number; voted: number }>> = {};
    for (const v of (voters || [])) {
      const course = v.course || 'Unknown';
      const year = v.year_level ? `Year ${v.year_level}` : 'Unknown';
      if (!demographicsMap[course]) demographicsMap[course] = {};
      if (!demographicsMap[course][year]) demographicsMap[course][year] = { total: 0, voted: 0 };
      demographicsMap[course][year].total += 1;
      if (v.has_voted) demographicsMap[course][year].voted += 1;
    }

    // Convert to sorted array
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
             id: c.id,
             position_id: pos.id,
             full_name: c.name,
             first_name: c.first_name || '',
             middle_name: c.middle_name || '',
             last_name: c.last_name || '',
             course: c.course || '',
             year_level: c.year_level || '',
             image_url: c.image_url || null,
           });
           mappedTally[c.id] = c.votes;
        }
      }
      
      return NextResponse.json({
        totalVoters: sum.stats?.total_voters || 0,
        votesCast: sum.stats?.total_voted || 0,
        turnout: sum.stats?.turnout_percentage || 0,
        settings,
        positions: flatPositions,
        candidates: flatCandidates,
        tally: mappedTally,
        abstainCounts: mappedAbstains,
        voterDemographics: sum.voter_demographics || [],
      });
    }

    // Tally candidate votes per candidate_id
    const tally: Record<string, number> = {};
    // Count abstains per position (rows where candidate_id IS NULL)
    const abstainCounts: Record<string, number> = {};

    if (votes) {
      for (const v of votes) {
        if (v.candidate_id) {
          tally[v.candidate_id] = (tally[v.candidate_id] || 0) + 1;
        } else if (v.position_id) {
          abstainCounts[v.position_id] = (abstainCounts[v.position_id] || 0) + 1;
        }
      }
    }

    return NextResponse.json({
      totalVoters: totalVoters || 0,
      votesCast: votesCast || 0,
      turnout: totalVoters ? ((votesCast || 0) / totalVoters) * 100 : 0,
      settings,
      positions: positions || [],
      candidates: candidates || [],
      tally,
      abstainCounts,
      voterDemographics,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
