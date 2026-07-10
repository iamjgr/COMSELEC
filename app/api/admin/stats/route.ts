import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/session';

export const dynamic = 'force-dynamic';

// Raw Supabase REST helper — reads env vars fresh every call, no supabase-js module cache.
async function sbFetch(path: string, serviceKey: string, supabaseUrl: string) {
  const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase REST error ${res.status}: ${text}`);
  }
  return res.json();
}

async function sbCount(table: string, filter: string, serviceKey: string, supabaseUrl: string): Promise<number> {
  // Fetch just the id column for all matching rows and count the array length.
  // Avoids relying on content-range header which may not survive Vercel's response pipeline.
  const res = await fetch(`${supabaseUrl}/rest/v1/${table}?${filter}&select=id`, {
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
    },
    cache: 'no-store',
  });
  if (!res.ok) return 0;
  const data = await res.json();
  return Array.isArray(data) ? data.length : 0;
}

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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !serviceKey) return NextResponse.json({ error: 'SERVER_MISCONFIGURED' }, { status: 500 });

    const eid = encodeURIComponent(electionId);

    const [
      totalVoters,
      votesCast,
      settingsArr,
      positions,
      candidates,
      votes,
      voters,
    ] = await Promise.all([
      sbCount('voters', `election_id=eq.${eid}`, serviceKey, supabaseUrl),
      sbCount('voters', `election_id=eq.${eid}&has_voted=eq.true`, serviceKey, supabaseUrl),
      sbFetch(`elections?id=eq.${eid}&select=*`, serviceKey, supabaseUrl),
      sbFetch(`positions?election_id=eq.${eid}&order=order_index`, serviceKey, supabaseUrl),
      sbFetch(`candidates?election_id=eq.${eid}&order=order_index`, serviceKey, supabaseUrl),
      sbFetch(`votes?election_id=eq.${eid}&select=candidate_id,position_id,voter_id`, serviceKey, supabaseUrl),
      sbFetch(`voters?election_id=eq.${eid}&select=id,course,year_level,has_voted`, serviceKey, supabaseUrl),
    ]);

    const settings = settingsArr?.[0] ?? null;

    // Build voter demographics
    const demographicsMap: Record<string, Record<string, { total: number; voted: number }>> = {};
    for (const v of (voters || [])) {
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

    // Archived election — return summary data
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
    for (const v of (voters || [])) {
      if (v.id) voterCourseMap[v.id] = v.course || 'Unknown';
    }
    const deptTally: Record<string, Record<string, number>> = {};
    const deptAbstains: Record<string, Record<string, number>> = {};

    for (const v of (votes || [])) {
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
      positions: positions || [],
      candidates: candidates || [],
      tally, abstainCounts, deptTally, deptAbstains, voterDemographics,
    }, { headers: { 'Cache-Control': 'no-store', 'Pragma': 'no-cache' } });

  } catch (err) {
    console.error('[stats] error:', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
