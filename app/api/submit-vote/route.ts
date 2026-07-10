import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { verifySession } from '@/lib/session';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  const supabaseAdmin = createAdminClient();
  try {
    const body = await req.json();
    const votes = body.votes; // Array of { position_id, candidate_id }
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

    // Atomically flip has_voted from false → true using a conditional update.
    // If two devices race to submit simultaneously, only one will match the
    // .eq('has_voted', false) filter and get rowCount = 1. The other gets 0 rows
    // updated and is rejected as ALREADY_VOTED — no double insert is possible.
    const { data: updatedRows, error: updateError } = await supabaseAdmin
      .from('voters')
      .update({ has_voted: true, voted_at: new Date().toISOString() })
      .eq('id', voterId)
      .eq('has_voted', false)   // ← conditional: only succeeds if not yet voted
      .select('election_id');

    if (updateError) {
      console.error('Voter update failed:', updateError);
      return NextResponse.json({ error: 'VOTER_UPDATE_FAILED', detail: updateError.message }, { status: 500 });
    }

    // If no rows were updated, voter already voted (race condition or duplicate submit)
    if (!updatedRows || updatedRows.length === 0) {
      return NextResponse.json({ error: 'ALREADY_VOTED' }, { status: 400 });
    }

    const electionId = updatedRows[0].election_id;

    // Insert vote records now that we've exclusively claimed the has_voted flag
    if (Array.isArray(votes) && votes.length > 0) {
      const voteInserts = votes.map(v => ({
        voter_id: voterId,
        position_id: v.position_id,
        candidate_id: v.candidate_id || null,
        election_id: electionId,
      }));

      const { error: insertError } = await supabaseAdmin
        .from('votes')
        .insert(voteInserts);

      if (insertError) {
        // Vote insert failed after we already marked has_voted — log for manual recovery
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
