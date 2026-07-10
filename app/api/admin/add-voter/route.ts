import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifySession } from '@/lib/session';
import bcrypt from 'bcrypt';
import { randomBytes, randomInt } from 'crypto';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    
    const sessionToken = authHeader.split(' ')[1];
    const session = await verifySession(sessionToken);
    if (!session || session.role !== 'admin') return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const body = await req.json();
    const { full_name, first_name, middle_name, last_name, course, year_level, election_id } = body;

    if (!election_id) return NextResponse.json({ error: 'ELECTION_ID_REQUIRED' }, { status: 400 });

    // Generate sequential ID: CSL-VOTER-00000001, 00000002, etc.
    const { count: voterCount } = await supabaseAdmin
      .from('voters')
      .select('*', { count: 'exact', head: true })
      .eq('election_id', election_id);
    const nextNum = ((voterCount || 0) + 1).toString().padStart(8, '0');
    const student_id = `CSL-VOTER-${nextNum}`;

    // Generate cryptographically secure 4-digit PIN
    const pin = randomInt(1000, 10000).toString();
    const pin_hash = await bcrypt.hash(pin, 10);
    
    // Generate secure QR token
    const qr_token = randomBytes(32).toString('hex');

    // Insert into Supabase
    const { data, error } = await supabaseAdmin
      .from('voters')
      .insert({
        student_id,
        full_name,
        first_name,
        middle_name,
        last_name,
        course,
        year_level,
        pin_hash,
        qr_token,
        has_voted: false,
        election_id
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'STUDENT_EXISTS' }, { status: 400 });
      }
      throw error;
    }
    
    // Return plaintext PIN and token strictly once so the admin can save/show it
    return NextResponse.json({ success: true, voter: data, pin, qr_token });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
