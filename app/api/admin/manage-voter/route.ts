import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifySession } from '@/lib/session';

export const dynamic = 'force-dynamic';

async function getAdminSession(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const session = await verifySession(authHeader.split(' ')[1]);
  if (!session || session.role !== 'admin') return null;
  return session;
}

export async function DELETE(req: Request) {
  try {
    const session = await getAdminSession(req);
    if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const { voter_id, election_id } = await req.json();
    if (!voter_id || !election_id) return NextResponse.json({ error: 'MISSING_FIELDS' }, { status: 400 });

    // Election-scoped delete — voter must belong to the specified election
    const { error } = await supabaseAdmin
      .from('voters')
      .delete()
      .eq('id', voter_id)
      .eq('election_id', election_id); // ← scoping guard

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[manage-voter DELETE error]', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getAdminSession(req);
    if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const { voter_id, election_id, first_name, middle_name, last_name, course, year_level } = await req.json();
    if (!voter_id || !election_id) return NextResponse.json({ error: 'MISSING_FIELDS' }, { status: 400 });

    const full_name = `${first_name} ${middle_name ? middle_name + ' ' : ''}${last_name}`.trim();

    // Election-scoped update — voter must belong to the specified election
    const { error } = await supabaseAdmin
      .from('voters')
      .update({ first_name, middle_name, last_name, full_name, course, year_level })
      .eq('id', voter_id)
      .eq('election_id', election_id); // ← scoping guard

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[manage-voter PATCH error]', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
