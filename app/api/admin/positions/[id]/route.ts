import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { verifySession } from '@/lib/session';

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const supabaseAdmin = createAdminClient();
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    const token = authHeader.split(' ')[1];
    const session = await verifySession(token);
    if (!session || session.role !== 'admin') return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const electionId = body.election_id;
    if (!electionId) return NextResponse.json({ error: 'ELECTION_ID_REQUIRED' }, { status: 400 });

    const { error } = await supabaseAdmin.from('positions').delete().eq('id', params.id).eq('election_id', electionId);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const supabaseAdmin = createAdminClient();
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    const token = authHeader.split(' ')[1];
    const session = await verifySession(token);
    if (!session || session.role !== 'admin') return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const body = await req.json();

    // Whitelist — prevent mass assignment
    const updates: Record<string, unknown> = {};
    if (typeof body.name === 'string') updates.name = body.name.slice(0, 100).trim();
    if (typeof body.max_selections === 'number' && body.max_selections >= 1 && body.max_selections <= 20) {
      updates.max_selections = Math.floor(body.max_selections);
    }
    if (typeof body.order_index === 'number' && body.order_index >= 0) {
      updates.order_index = Math.floor(body.order_index);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'NO_VALID_FIELDS' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from('positions').update(updates).eq('id', params.id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
