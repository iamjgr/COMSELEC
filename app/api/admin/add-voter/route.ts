import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifySession } from '@/lib/session';
import bcrypt from 'bcryptjs';
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

    // Generate sequential ID using MAX to avoid race conditions on concurrent inserts.
    // count() can return the same value for two simultaneous requests; max() on the
    // actual IDs means even a collision falls back to the unique constraint safely.
    const { data: maxRow } = await supabaseAdmin
      .from('voters')
      .select('student_id')
      .eq('election_id', election_id)
      .like('student_id', 'CSL-VOTER-%')
      .order('student_id', { ascending: false })
      .limit(1)
      .maybeSingle();

    const lastNum = maxRow?.student_id
      ? parseInt(maxRow.student_id.replace('CSL-VOTER-', ''), 10) || 0
      : 0;
    const nextNum = (lastNum + 1).toString().padStart(8, '0');
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
        // Could be a genuine duplicate student, or a race on student_id generation.
        // Return a generic conflict so the caller can retry.
        return NextResponse.json({ error: 'DUPLICATE_ENTRY', detail: error.message }, { status: 409 });
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
