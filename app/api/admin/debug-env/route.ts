import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const session = await verifySession(authHeader.split(' ')[1]);
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const serviceKey = process.env.SUPABASE_SERVICE_KEY ?? '';
  const decoded = serviceKey
    ? JSON.parse(Buffer.from(serviceKey.split('.')[1] ?? '', 'base64').toString())
    : null;

  return NextResponse.json({
    service_key_length: serviceKey.length,
    service_key_last10: serviceKey.slice(-10),
    service_key_role: decoded?.role ?? 'MISSING',
    service_key_ref: decoded?.ref ?? 'MISSING',
    supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'MISSING',
    jwt_secret_length: (process.env.JWT_SECRET ?? '').length,
  });
}
