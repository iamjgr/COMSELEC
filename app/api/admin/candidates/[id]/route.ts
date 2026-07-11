import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { verifySession } from '@/lib/session';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const supabaseAdmin = createAdminClient();
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    
    const token = authHeader.split(' ')[1];
    const session = await verifySession(token);
    if (!session || session.role !== 'admin') return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const body = await req.json();
    const id = params.id;

    if (!body.election_id) {
      return NextResponse.json({ error: 'ELECTION_ID_REQUIRED' }, { status: 400 });
    }

    const updates: Record<string, any> = {};

    // Handle split names — if any name part is provided, rebuild full_name
    const hasNameUpdate = body.first_name !== undefined || body.last_name !== undefined;
    if (hasNameUpdate) {
      // If updating names, fetch current values for any missing parts
      const { data: existing } = await supabaseAdmin
        .from('candidates')
        .select('first_name, middle_name, last_name')
        .eq('id', id)
        .single();

      const firstName  = (body.first_name  !== undefined ? (body.first_name  ?? '') : (existing?.first_name  ?? '')).trim();
      const middleName = (body.middle_name !== undefined ? (body.middle_name ?? '') : (existing?.middle_name ?? '')).trim();
      const lastName   = (body.last_name   !== undefined ? (body.last_name   ?? '') : (existing?.last_name   ?? '')).trim();
      const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ');

      updates.first_name = firstName;
      updates.middle_name = middleName || null;
      updates.last_name = lastName;
      updates.full_name = fullName;
    }

    if (body.course !== undefined) updates.course = body.course;
    if (body.year_level !== undefined) updates.year_level = body.year_level;
    if (body.platform !== undefined) updates.platform = body.platform;
    if (body.partylist_id !== undefined) updates.partylist_id = body.partylist_id || null;
    if (body.image_url !== undefined) updates.image_url = body.image_url;
    if (body.image_position !== undefined) updates.image_position = body.image_position;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'NO_UPDATES_PROVIDED' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('candidates')
      .update(updates)
      .eq('id', id)
      .eq('election_id', body.election_id)  // scope to election
      .select()
      .single();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    
    return NextResponse.json({ success: true, candidate: data });
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
    
    const token = authHeader.split(' ')[1];
    const session = await verifySession(token);
    if (!session || session.role !== 'admin') return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const id = params.id;
    const body = await req.json().catch(() => ({}));
    const electionId = body.election_id;
    if (!electionId) return NextResponse.json({ error: 'ELECTION_ID_REQUIRED' }, { status: 400 });

    const { error } = await supabaseAdmin
      .from('candidates')
      .delete()
      .eq('id', id)
      .eq('election_id', electionId);

    if (error) throw error;
    
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
