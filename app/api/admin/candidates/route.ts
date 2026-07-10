import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { verifySession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const supabaseAdmin = createAdminClient();
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const token = authHeader.split(' ')[1];
    const session = await verifySession(token);
    if (!session || session.role !== 'admin') return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const url = new URL(req.url);
    const electionId = url.searchParams.get('election_id');
    if (!electionId) return NextResponse.json({ error: 'ELECTION_ID_REQUIRED' }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from('candidates')
      .select('*')
      .eq('election_id', electionId)
      .order('order_index');

    if (error) throw error;

    return NextResponse.json({ candidates: data });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const supabaseAdmin = createAdminClient();
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    
    const token = authHeader.split(' ')[1];
    const session = await verifySession(token);
    if (!session || session.role !== 'admin') return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const body = await req.json();
    
    if (!body.election_id) return NextResponse.json({ error: 'ELECTION_ID_REQUIRED' }, { status: 400 });

    const firstName = (body.first_name || '').trim();
    const middleName = (body.middle_name || '').trim();
    const lastName = (body.last_name || '').trim();
    const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ');

    // Compute order_index server-side to avoid stale client counts causing duplicates
    const { count: existingCount } = await supabaseAdmin
      .from('candidates')
      .select('*', { count: 'exact', head: true })
      .eq('election_id', body.election_id)
      .eq('position_id', body.position_id);

    const orderIndex = (existingCount ?? 0) + 1;

    const { data, error } = await supabaseAdmin
      .from('candidates')
      .insert({
        position_id: body.position_id,
        partylist_id: body.partylist_id || null,
        first_name: firstName,
        middle_name: middleName || null,
        last_name: lastName,
        full_name: fullName,
        course: body.course,
        year_level: body.year_level,
        platform: body.platform,
        order_index: orderIndex,
        election_id: body.election_id,
        image_url: body.image_url || null,
        image_position: body.image_position || 'center'
      })
      .select()
      .single();

    if (error) throw error;
    
    return NextResponse.json({ success: true, candidate: data });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
