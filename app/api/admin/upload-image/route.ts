import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifySession } from '@/lib/session';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    
    const token = authHeader.split(' ')[1];
    const session = await verifySession(token);
    if (!session || session.role !== 'admin') return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get('image') as File | null;
    
    if (!file) {
      return NextResponse.json({ error: 'NO_FILE_UPLOADED' }, { status: 400 });
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate unique filename preserving extension
    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `${uuidv4()}.${ext}`;

    // Upload to Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from('candidate-images')
      .upload(filename, buffer, {
        contentType: file.type || 'image/jpeg',
        upsert: false
      });

    if (error) {
      console.error('[STORAGE_UPLOAD_ERROR]', error);
      throw error;
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('candidate-images')
      .getPublicUrl(filename);

    return NextResponse.json({ success: true, url: publicUrl });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
