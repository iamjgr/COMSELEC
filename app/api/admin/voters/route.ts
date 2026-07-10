import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const sessionToken = authHeader.split(' ')[1];
    const session = await verifySession(sessionToken);
    if (!session || session.role !== 'admin') return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const url = new URL(req.url);
    const electionId = url.searchParams.get('election_id');
    if (!electionId) return NextResponse.json({ error: 'ELECTION_ID_REQUIRED' }, { status: 400 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'SERVER_MISCONFIGURED' }, { status: 500 });
    }

    // Use raw fetch directly against the Supabase REST API to bypass any
    // supabase-js module-level caching issues on Vercel serverless functions.
    const cols = 'id,student_id,full_name,first_name,middle_name,last_name,course,year_level,has_voted,qr_token,created_at';
    const res = await fetch(
      `${supabaseUrl}/rest/v1/voters?select=${cols}&election_id=eq.${encodeURIComponent(electionId)}&order=created_at.desc`,
      {
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error('[voters] Supabase REST error:', res.status, err);
      return NextResponse.json({ error: 'DB_ERROR' }, { status: 500 });
    }

    const data = await res.json();
    return NextResponse.json({ success: true, voters: data });
  } catch (err) {
    console.error('[voters] unexpected error:', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
