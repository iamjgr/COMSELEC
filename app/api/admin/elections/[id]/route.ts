import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { verifySession } from '@/lib/session';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const supabaseAdmin = createAdminClient();
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const sessionToken = authHeader.split(' ')[1];
    const session = await verifySession(sessionToken);
    if (!session || session.role !== 'admin') return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const body = await req.json();

    // Whitelist — only allow known safe fields
    const allowed = ['name', 'voting_start', 'voting_end', 'election_date', 'status',
                     'results_visible', 'candidates_public'] as const;
    type Allowed = typeof allowed[number];
    const updates: Partial<Record<Allowed, unknown>> = {};
    for (const field of allowed) {
      if (field in body) updates[field] = body[field];
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'NO_VALID_FIELDS' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from('elections').update(updates).eq('id', params.id);
    if (error) throw error;
    
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const supabaseAdmin = createAdminClient();
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
