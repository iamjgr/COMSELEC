import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifySession } from '@/lib/session';
import bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const sessionToken = authHeader.split(' ')[1];
    const session = await verifySession(sessionToken);
    if (!session || session.role !== 'admin') return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const { voter_id, election_id } = await req.json();
    if (!voter_id || !election_id) return NextResponse.json({ error: 'MISSING_FIELDS' }, { status: 400 });

    // Generate a cryptographically secure 4-digit PIN
    const newPin = randomInt(1000, 10000).toString();
    const pin_hash = await bcrypt.hash(newPin, 10);

    // Election-scoped update + reset attempt counter
    const { error } = await supabaseAdmin
      .from('voters')
      .update({ pin_hash, pin_attempts: 0 })
      .eq('id', voter_id)
      .eq('election_id', election_id); // ← scoping guard

    if (error) throw error;

    return NextResponse.json({ success: true, pin: newPin });
  } catch (err) {
    console.error('[reset-pin error]', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
