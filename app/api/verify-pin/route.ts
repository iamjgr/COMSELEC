import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { verifySession, signSession } from '@/lib/session';
import bcrypt from 'bcryptjs';

const MAX_PIN_ATTEMPTS = 5;

export async function POST(req: Request) {
  const supabaseAdmin = createAdminClient();
  try {
    const { pin } = await req.json();
    const authHeader = req.headers.get('Authorization');

    if (!pin || !authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const session = await verifySession(token);

    if (!session || session.stage !== 'qr_verified') {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const voterId = session.voter_id as string;

    // Fetch voter — recheck has_voted in case another device submitted while PIN was being entered
    const { data: voter, error: dbError } = await supabaseAdmin
      .from('voters')
      .select('pin_hash, pin_attempts, has_voted, election_id, elections(status)')
      .eq('id', voterId)
      .single();

    if (dbError || !voter) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    // Block PIN entry if the election was paused after QR was scanned
    const electionStatus = voter.elections
      ? (Array.isArray(voter.elections) ? voter.elections[0] : voter.elections).status
      : null;
    if (electionStatus === 'paused') {
      return NextResponse.json({ error: 'ELECTION_PAUSED' }, { status: 400 });
    }

    // Re-guard: if another device already submitted, stop here
    if (voter.has_voted) {
      return NextResponse.json({ error: 'ALREADY_VOTED' }, { status: 400 });
    }

    const currentAttempts = voter.pin_attempts ?? 0;

    if (currentAttempts >= MAX_PIN_ATTEMPTS) {
      return NextResponse.json({ error: 'PIN_LOCKED', attemptsLeft: 0 }, { status: 403 });
    }

    const isValid = await bcrypt.compare(pin, voter.pin_hash);

    if (!isValid) {
      const newAttempts = currentAttempts + 1;
      const attemptsLeft = MAX_PIN_ATTEMPTS - newAttempts;

      await supabaseAdmin
        .from('voters')
        .update({ pin_attempts: newAttempts })
        .eq('id', voterId);

      if (attemptsLeft <= 0) {
        return NextResponse.json({ error: 'PIN_LOCKED', attemptsLeft: 0 }, { status: 403 });
      }

      return NextResponse.json({ error: 'WRONG_PIN', attemptsLeft }, { status: 400 });
    }

    // Success — reset attempt counter and issue pin_verified session (1h)
    await supabaseAdmin
      .from('voters')
      .update({ pin_attempts: 0 })
      .eq('id', voterId);

    const newSession = await signSession(
      { voter_id: voterId, election_id: session.election_id, stage: 'pin_verified' },
      { expiresIn: '1h' }
    );

    return NextResponse.json({ success: true, session: newSession });
  } catch (err) {
    console.error('[verify-pin error]', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
