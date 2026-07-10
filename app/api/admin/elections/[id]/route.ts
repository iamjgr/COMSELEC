import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifySession } from '@/lib/session';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const sessionToken = authHeader.split(' ')[1];
    const session = await verifySession(sessionToken);
    if (!session || session.role !== 'admin') return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const updates = await req.json();

    const { error } = await supabaseAdmin.from('elections').update(updates).eq('id', params.id);
    if (error) throw error;
    
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const sessionToken = authHeader.split(' ')[1];
    const session = await verifySession(sessionToken);
    if (!session || session.role !== 'admin') return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const { error } = await supabaseAdmin.from('elections').delete().eq('id', params.id);
    if (error) throw error;
    
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
