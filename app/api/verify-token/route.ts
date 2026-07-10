import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { signSession } from '@/lib/session';

export async function POST(req: Request) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ error: 'INVALID_TOKEN' }, { status: 400 });
    }

    // 1. Look up voter by qr_token
    const { data: voter, error: dbError } = await supabaseAdmin
      .from('voters')
      .select(`
        id, full_name, course, year_level, has_voted, token_used, election_id,
        elections ( status, voting_start, voting_end )
      `)
      .eq('qr_token', token)
      .single();

    if (dbError || !voter || !voter.elections) {
      return NextResponse.json({ error: 'INVALID_TOKEN' }, { status: 400 });
    }

    // 2. Block if already voted
    if (voter.has_voted) {
      return NextResponse.json({ error: 'ALREADY_VOTED' }, { status: 400 });
    }

    // 3. Block if token was already used (QR cannot be reused mid-session)
    if (voter.token_used) {
      return NextResponse.json({ error: 'TOKEN_ALREADY_USED' }, { status: 400 });
    }

    // 4. Check election is active and within voting window
    const election = Array.isArray(voter.elections) ? voter.elections[0] : voter.elections;

    if (election.status !== 'active') {
      return NextResponse.json({ error: 'ELECTION_NOT_ACTIVE' }, { status: 400 });
    }

    const now = new Date();

    // If voting_start is set, check we haven't started too early
    if (election.voting_start) {
      const start = new Date(election.voting_start);
      if (now < start) {
        return NextResponse.json({ error: 'VOTING_NOT_STARTED' }, { status: 400 });
      }
    }

    // If voting_end is set, check we haven't gone past it
    if (election.voting_end) {
      const end = new Date(election.voting_end);
      if (now > end) {
        return NextResponse.json({ error: 'ELECTION_CLOSED' }, { status: 400 });
      }
    }
    // If voting_end is null, voting is open indefinitely until admin stops it


    // 5. Mark token as used so QR cannot be scanned again
    await supabaseAdmin
      .from('voters')
      .update({ token_used: true })
      .eq('id', voter.id);

    // 6. Issue short-lived session (15 min — enough to vote, not long enough to reuse)
    const session = await signSession(
      { voter_id: voter.id, election_id: voter.election_id, stage: 'qr_verified' },
      { expiresIn: '15m' }
    );

    return NextResponse.json({
      success: true,
      name: voter.full_name,
      course: voter.course,
      year: voter.year_level,
      session,
    });
  } catch (err) {
    console.error('[verify-token error]', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
