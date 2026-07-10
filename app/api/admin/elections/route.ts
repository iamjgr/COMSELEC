import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifySession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const sessionToken = authHeader.split(' ')[1];
    const session = await verifySession(sessionToken);
    if (!session || session.role !== 'admin') return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const { data, error } = await supabaseAdmin.from('elections').select('*').order('created_at', { ascending: false });

    if (error) throw error;
    
    return NextResponse.json({ success: true, elections: data });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const sessionToken = authHeader.split(' ')[1];
    const session = await verifySession(sessionToken);
    if (!session || session.role !== 'admin') return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const { name, election_date } = await req.json();

    const { data, error } = await supabaseAdmin.from('elections').insert([{ 
      name, 
      election_date, 
      status: 'pending'
    }]).select().single();

    if (error) throw error;
    
    return NextResponse.json({ success: true, election: data });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
