import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifySession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
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
      .from('partylists')
      .select('*')
      .eq('election_id', electionId)
      .order('name');

    if (error) throw error;
    
    return NextResponse.json({ partylists: data });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    
    const token = authHeader.split(' ')[1];
    const session = await verifySession(token);
    if (!session || session.role !== 'admin') return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const { name, acronym, color, election_id } = await req.json();
    if (!name) return NextResponse.json({ error: 'MISSING_NAME' }, { status: 400 });
    if (!election_id) return NextResponse.json({ error: 'ELECTION_ID_REQUIRED' }, { status: 400 });
    
    const { data, error } = await supabaseAdmin
      .from('partylists')
      .insert({ name, acronym: acronym || null, color: color || '#9B7248', election_id })
      .select()
      .single();

    if (error) throw error;
    
    return NextResponse.json({ success: true, partylist: data });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
