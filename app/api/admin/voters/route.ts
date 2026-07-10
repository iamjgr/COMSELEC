import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { verifySession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const supabaseAdmin = createAdminClient();
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    
    const sessionToken = authHeader.split(' ')[1];
    const session = await verifySession(sessionToken);
    if (!session || session.role !== 'admin') return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const url = new URL(req.url);
    const electionId = url.searchParams.get('election_id');
    if (!electionId) return NextResponse.json({ error: 'ELECTION_ID_REQUIRED' }, { status: 400 });

    const { data, error, count } = await supabaseAdmin
      .from('voters')
      .select('id, student_id, full_name, first_name, middle_name, last_name, course, year_level, has_voted, qr_token, created_at', { count: 'exact' })
      .eq('election_id', electionId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[voters] query error:', JSON.stringify(error));
      throw error;
    }

    console.log('[voters] election_id:', electionId, '| rows returned:', data?.length, '| count:', count);
    
    return NextResponse.json({ success: true, voters: data, _debug: { rows: data?.length, count } });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
