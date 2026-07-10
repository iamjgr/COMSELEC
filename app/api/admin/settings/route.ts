import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifySession } from '@/lib/session';

export const dynamic = 'force-dynamic';

// Only these fields may be updated via this endpoint
const ALLOWED_FIELDS = ['name', 'election_date', 'voting_start', 'voting_end', 'status'] as const;
type AllowedField = (typeof ALLOWED_FIELDS)[number];

export async function PATCH(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const sessionToken = authHeader.split(' ')[1];
    const session = await verifySession(sessionToken);
    if (!session || session.role !== 'admin') return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const body = await req.json();

    // Require election_id to avoid accidentally patching the wrong election
    const { election_id } = body;
    if (!election_id) {
      return NextResponse.json({ error: 'ELECTION_ID_REQUIRED' }, { status: 400 });
    }

    // Whitelist — only allow known safe fields, ignore anything else
    const updates: Partial<Record<AllowedField, unknown>> = {};
    for (const field of ALLOWED_FIELDS) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'NO_VALID_FIELDS' }, { status: 400 });
    }

    // Verify the election exists before updating
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('elections')
      .select('id')
      .eq('id', election_id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'ELECTION_NOT_FOUND' }, { status: 404 });
    }

    const { error } = await supabaseAdmin
      .from('elections')
      .update(updates)
      .eq('id', election_id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[settings PATCH error]', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
