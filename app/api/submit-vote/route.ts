import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifySession } from '@/lib/session';
import { randomBytes } from 'crypto';

export async function POST(req: Request) {
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

    // Check if already voted
    const { data: voter, error: checkError } = await supabaseAdmin
      .from('voters')
      .select('has_voted, election_id')
      .eq('id', voterId)
      .single();

    if (checkError || !voter) {
      console.error('Voter lookup failed:', checkError);
      return NextResponse.json({ error: 'VOTER_NOT_FOUND' }, { status: 400 });
    }

    if (voter.has_voted) {
      return NextResponse.json({ error: 'ALREADY_VOTED' }, { status: 400 });
    }

    // Insert votes only if there are any (voter may have abstained from all positions)
    if (Array.isArray(votes) && votes.length > 0) {
      const voteInserts = votes.map(v => ({
        voter_id: voterId,
        position_id: v.position_id,
        candidate_id: v.candidate_id || null,
        election_id: voter.election_id
      }));

      const { error: insertError } = await supabaseAdmin
        .from('votes')
        .insert(voteInserts);

      if (insertError) {
        console.error('Vote insert failed:', insertError);
        return NextResponse.json({ error: 'VOTE_SUBMISSION_FAILED', detail: insertError.message }, { status: 500 });
      }
    }

    // ALWAYS mark voter as has_voted regardless of whether they abstained from everything
    const { error: updateError } = await supabaseAdmin
      .from('voters')
      .update({ has_voted: true, voted_at: new Date().toISOString() })
      .eq('id', voterId);

    if (updateError) {
      console.error('Voter update failed:', updateError);
      return NextResponse.json({ error: 'VOTER_UPDATE_FAILED', detail: updateError.message }, { status: 500 });
    }

    const refCode = `VT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${randomBytes(3).toString('hex').toUpperCase()}`;

    return NextResponse.json({
      success: true,
      reference: refCode,
      timestamp: new Date().toISOString(),
    });

  } catch (err) {
    console.error('submit-vote error:', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
