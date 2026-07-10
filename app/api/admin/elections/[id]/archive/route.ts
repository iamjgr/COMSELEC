import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifySession } from '@/lib/session';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const sessionToken = authHeader.split(' ')[1];
    const session = await verifySession(sessionToken);
    if (!session || session.role !== 'admin') return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const electionId = params.id;

    // ── 1. Fetch election meta ──────────────────────────────────────────────
    const { data: election, error: electionErr } = await supabaseAdmin
      .from('elections')
      .select('*')
      .eq('id', electionId)
      .single();
    if (electionErr || !election) throw new Error('Election not found');
    if (election.status !== 'completed') {
      return NextResponse.json({ error: 'Election must be completed before archiving.' }, { status: 400 });
    }

    // ── 2. Fetch voter stats ────────────────────────────────────────────────
    const { count: totalVoters } = await supabaseAdmin
      .from('voters')
      .select('*', { count: 'exact', head: true })
      .eq('election_id', electionId);

    const { count: totalVoted } = await supabaseAdmin
      .from('voters')
      .select('*', { count: 'exact', head: true })
      .eq('election_id', electionId)
      .is('has_voted', true);

    // ── 3. Fetch positions ──────────────────────────────────────────────────
    const { data: positions } = await supabaseAdmin
      .from('positions')
      .select('id, name, max_selections, order_index')
      .eq('election_id', electionId)
      .order('order_index');

    // ── 4. Fetch candidates with all details ───────────────────────────────
    const { data: candidates } = await supabaseAdmin
      .from('candidates')
      .select('id, full_name, first_name, middle_name, last_name, position_id, partylist_id, course, year_level, image_url')
      .eq('election_id', electionId);

    const { data: votes } = await supabaseAdmin
      .from('votes')
      .select('candidate_id, position_id')
      .eq('election_id', electionId);

    // ── 5. Fetch partylists ─────────────────────────────────────────────────
    const { data: partylists } = await supabaseAdmin
      .from('partylists')
      .select('id, name, acronym, color')
      .eq('election_id', electionId);

    // ── 6. Fetch voter demographics (course × year_level) ──────────────────
    const { data: voterRows } = await supabaseAdmin
      .from('voters')
      .select('course, year_level, has_voted')
      .eq('election_id', electionId);

    const demographicsMap: Record<string, Record<string, { total: number; voted: number }>> = {};
    for (const v of (voterRows || [])) {
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

    // ── 7. Build summary ────────────────────────────────────────────────────
    const voteCountMap: Record<string, number> = {};
    const abstainCountMap: Record<string, number> = {};
    for (const v of (votes || [])) {
      if (v.candidate_id) {
        voteCountMap[v.candidate_id] = (voteCountMap[v.candidate_id] || 0) + 1;
      } else if (v.position_id) {
        abstainCountMap[v.position_id] = (abstainCountMap[v.position_id] || 0) + 1;
      }
    }

    const partylistMap: Record<string, { name: string; acronym: string; color: string }> = {};
    for (const p of (partylists || [])) {
      partylistMap[p.id] = { name: p.name, acronym: p.acronym, color: p.color };
    }

    const tv = totalVoters || 0;
    const tvoted = totalVoted || 0;

    const positionSummaries = (positions || []).map(pos => {
      const positionCandidates = (candidates || [])
        .filter(c => c.position_id === pos.id)
        .map(c => ({
          id: c.id,
          name: c.full_name,
          first_name: c.first_name || '',
          middle_name: c.middle_name || '',
          last_name: c.last_name || '',
          course: c.course || '',
          year_level: c.year_level || '',
          image_url: c.image_url || null,
          partylist: c.partylist_id ? partylistMap[c.partylist_id] : null,
          votes: voteCountMap[c.id] || 0,
          percentage: tvoted > 0 ? +((((voteCountMap[c.id] || 0) / tvoted) * 100).toFixed(2)) : 0,
        }))
        .sort((a, b) => b.votes - a.votes);

      const winners = positionCandidates.slice(0, pos.max_selections || 1);

      return {
        id: pos.id,
        name: pos.name,
        max_selections: pos.max_selections,
        candidates: positionCandidates,
        winners,
        abstains: abstainCountMap[pos.id] || 0,
      };
    });


    const summaryData = {
      archived_at: new Date().toISOString(),
      election: {
        id: election.id,
        name: election.name,
        election_date: election.election_date,
        voting_start: election.voting_start,
        voting_end: election.voting_end,
      },
      stats: {
        total_voters: tv,
        total_voted: tvoted,
        total_abstained: tv - tvoted,
        turnout_percentage: tv > 0 ? +((tvoted / tv) * 100).toFixed(2) : 0,
      },
      partylists: partylists || [],
      positions: positionSummaries,
      voter_demographics: voterDemographics,

    };

    // ── 7. Save summary to elections table ──────────────────────────────────
    const { error: updateErr } = await supabaseAdmin
      .from('elections')
      .update({ summary_data: summaryData, status: 'archived' })
      .eq('id', electionId);
    if (updateErr) throw updateErr;

    // ── 8. Purge raw data (order matters due to FKs) ────────────────────────
    await supabaseAdmin.from('votes').delete().eq('election_id', electionId);
    await supabaseAdmin.from('voters').delete().eq('election_id', electionId);
    await supabaseAdmin.from('candidates').delete().eq('election_id', electionId);
    await supabaseAdmin.from('positions').delete().eq('election_id', electionId);
    await supabaseAdmin.from('partylists').delete().eq('election_id', electionId);

    return NextResponse.json({ success: true, summary: summaryData });
  } catch (err) {
    console.error('[ARCHIVE ERROR]', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
