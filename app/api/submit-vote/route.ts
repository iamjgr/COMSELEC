import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { verifySession } from '@/lib/session';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// UUID v4 pattern
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  const supabaseAdmin = createAdminClient();
  try {
    const body = await req.json();
    const votes = body.votes;
    const authHeader = req.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const session = await verifySession(token);

    if (!session || session.stage !== 'pin_verified') {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const voterId = session.voter_id as string;

    // ── Validate votes array structure ──────────────────────────────────────
    if (!Array.isArray(votes)) {
      return NextResponse.json({ error: 'INVALID_VOTES' }, { status: 400 });
    }

    // Hard cap — no election has more than 50 positions
    if (votes.length > 50) {
      return NextResponse.json({ error: 'TOO_MANY_VOTES' }, { status: 400 });
    }

    // Each entry must have a valid UUID position_id; candidate_id is optional (abstain) but must be UUID if present
    for (const v of votes) {
      if (!v.position_id || typeof v.position_id !== 'string' || !UUID_RE.test(v.position_id)) {
        return NextResponse.json({ error: 'INVALID_VOTE_ENTRY' }, { status: 400 });
      }
      if (v.candidate_id !== null && v.candidate_id !== undefined) {
        if (typeof v.candidate_id !== 'string' || !UUID_RE.test(v.candidate_id)) {
          return NextResponse.json({ error: 'INVALID_VOTE_ENTRY' }, { status: 400 });
        }
      }
    }
    // ────────────────────────────────────────────────────────────────────────

    // Check election is not paused before accepting the vote
    const { data: voter } = await supabaseAdmin
      .from('voters')
      .select('election_id, elections(status)')
      .eq('id', voterId)
      .single();

    const electionStatus = voter?.elections
      ? (Array.isArray(voter.elections) ? voter.elections[0] : voter.elections).status
      : null;

    if (electionStatus === 'paused') {
      return NextResponse.json({ error: 'ELECTION_PAUSED' }, { status: 400 });
    }

    const electionId = voter?.election_id as string;

    // ── Verify all submitted position_ids and candidate_ids belong to this voter's election ──
    if (votes.length > 0) {
      const positionIds = [...new Set(votes.map((v: { position_id: string }) => v.position_id))];
      const candidateIds = votes
        .filter((v: { candidate_id?: string }) => v.candidate_id)
        .map((v: { candidate_id: string }) => v.candidate_id);

      const [posCheck, candCheck] = await Promise.all([
        supabaseAdmin
          .from('positions')
          .select('id')
          .eq('election_id', electionId)
          .in('id', positionIds),
        candidateIds.length > 0
          ? supabaseAdmin
              .from('candidates')
              .select('id')
              .eq('election_id', electionId)
              .in('id', candidateIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      const validPositionIds = new Set((posCheck.data ?? []).map((p: { id: string }) => p.id));
      const validCandidateIds = new Set((candCheck.data ?? []).map((c: { id: string }) => c.id));

      for (const v of votes) {
        if (!validPositionIds.has(v.position_id)) {
          return NextResponse.json({ error: 'INVALID_VOTE_ENTRY' }, { status: 400 });
        }
        if (v.candidate_id && !validCandidateIds.has(v.candidate_id)) {
          return NextResponse.json({ error: 'INVALID_VOTE_ENTRY' }, { status: 400 });
        }
      }
    }
    // ────────────────────────────────────────────────────────────────────────

    // Atomically flip has_voted from false → true using a conditional update.
    const { data: updatedRows, error: updateError } = await supabaseAdmin
      .from('voters')
      .update({ has_voted: true, voted_at: new Date().toISOString() })
      .eq('id', voterId)
      .eq('has_voted', false)
      .select('election_id');

    if (updateError) {
      console.error('Voter update failed:', updateError);
      return NextResponse.json({ error: 'VOTER_UPDATE_FAILED', detail: updateError.message }, { status: 500 });
    }

    if (!updatedRows || updatedRows.length === 0) {
      return NextResponse.json({ error: 'ALREADY_VOTED' }, { status: 400 });
    }

    const confirmedElectionId = updatedRows[0].election_id;

    if (Array.isArray(votes) && votes.length > 0) {
      const voteInserts = votes.map((v: { position_id: string; candidate_id?: string }) => ({
        voter_id: voterId,
        position_id: v.position_id,
        candidate_id: v.candidate_id || null,
        election_id: confirmedElectionId,
      }));

      const { error: insertError } = await supabaseAdmin
        .from('votes')
        .insert(voteInserts);

      if (insertError) {
        console.error('CRITICAL: Vote insert failed after has_voted was set:', insertError);
        return NextResponse.json({ error: 'VOTE_SUBMISSION_FAILED', detail: insertError.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
    });

  } catch (err) {
    console.error('submit-vote error:', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
