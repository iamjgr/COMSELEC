import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { verifySession } from '@/lib/session';

export const dynamic = 'force-dynamic';

/**
 * GET /api/ballot
 * Returns positions and candidates for the voter's election.
 * Requires a valid voter session (qr_verified or pin_verified stage).
 */
export async function GET(req: Request) {
  const supabaseAdmin = createAdminClient();
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const session = await verifySession(token);

    if (
      !session ||
      !session.election_id ||
      (session.stage !== 'qr_verified' && session.stage !== 'pin_verified')
    ) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const electionId = session.election_id as string;

    const [{ data: positions }, { data: candidates }] = await Promise.all([
      supabaseAdmin
        .from('positions')
        .select('id, name, order_index, max_selections')
        .eq('election_id', electionId)
        .order('order_index'),
      supabaseAdmin
        .from('candidates')
        .select('id, full_name, first_name, last_name, position_id, course, year_level, image_url, image_position, platform, partylist_id, partylists(name, color)')
        .eq('election_id', electionId)
        .order('order_index'),
    ]);

    return NextResponse.json({
      positions: positions || [],
      candidates: candidates || [],
    });
  } catch (err) {
    console.error('[ballot error]', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
