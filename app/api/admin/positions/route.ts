import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { verifySession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const supabaseAdmin = createAdminClient();  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const token = authHeader.split(' ')[1];
    const session = await verifySession(token);
    if (!session || session.role !== 'admin') return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const url = new URL(req.url);
    const electionId = url.searchParams.get('election_id');
    if (!electionId) return NextResponse.json({ error: 'ELECTION_ID_REQUIRED' }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from('positions')
      .select('*')
      .eq('election_id', electionId)
      .order('order_index');

    if (error) throw error;

    return NextResponse.json({ positions: data });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const supabaseAdmin = createAdminClient();  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    
    const token = authHeader.split(' ')[1];
    const session = await verifySession(token);
    if (!session || session.role !== 'admin') return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const body = await req.json();
    
    if (!body.election_id) return NextResponse.json({ error: 'ELECTION_ID_REQUIRED' }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from('positions')
      .insert({
        name: body.name,
        order_index: body.order_index,
        max_selections: body.max_selections || 1,
        is_active: true,
        election_id: body.election_id
      })
      .select()
      .single();

    if (error) throw error;
    
    return NextResponse.json({ success: true, position: data });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
