import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { signSession } from '@/lib/session';

export async function POST(req: Request) {
  const supabaseAdmin = createAdminClient();
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ error: 'INVALID_TOKEN' }, { status: 400 });
    }

    // 1. Look up voter by qr_token
    const { data: voter, error: dbError } = await supabaseAdmin
      .from('voters')
      .select(`
        id, full_name, course, year_level, has_voted, election_id,
        elections ( status, voting_start, voting_end )
      `)
      .eq('qr_token', token)
      .single();

    if (dbError || !voter || !voter.elections) {
      return NextResponse.json({ error: 'INVALID_TOKEN' }, { status: 400 });
    }

    // 2. If already voted — issue a qr_verified session so the voter must re-enter
    //    their PIN before the vote summary is shown (privacy protection).
    if (voter.has_voted) {
      const session = await signSession(
        { voter_id: voter.id, election_id: voter.election_id, stage: 'qr_verified' },
        { expiresIn: '15m' }
      );

      return NextResponse.json({
        success: true,
        has_voted: true,
        name: voter.full_name,
        course: voter.course,
        year: voter.year_level,
        session,
      });
    }

    // 3. Check election is active and within voting window
    const election = Array.isArray(voter.elections) ? voter.elections[0] : voter.elections;

    if (election.status === 'paused') {
      return NextResponse.json({ error: 'ELECTION_PAUSED' }, { status: 400 });
    }

    if (election.status !== 'active') {
      return NextResponse.json({ error: 'ELECTION_NOT_ACTIVE' }, { status: 400 });
    }

    const now = new Date();

    if (election.voting_start) {
      const start = new Date(election.voting_start);
      if (now < start) {
        return NextResponse.json({ error: 'VOTING_NOT_STARTED' }, { status: 400 });
      }
    }

    if (election.voting_end) {
      const end = new Date(election.voting_end);
      if (now > end) {
        return NextResponse.json({ error: 'ELECTION_CLOSED' }, { status: 400 });
      }
    }

    // 4. Issue short-lived session JWT (15 min)
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
