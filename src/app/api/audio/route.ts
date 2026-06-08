import { NextRequest, NextResponse } from 'next/server';
import { getReadStream, getFileMetadata } from '@/lib/gcs';

export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get('path');
  if (!path) return NextResponse.json({ error: 'Missing path' }, { status: 400 });

  // Prevent path traversal
  if (path.includes('..') || path.startsWith('/')) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  const metadata = await getFileMetadata(path);
  const contentType = String(metadata.contentType ?? 'audio/mpeg');
  const contentLength = String(metadata.size ?? 0);

  const stream = await getReadStream(path);
  return new Response(stream, {
    headers: {
      'Content-Type': contentType,
      'Content-Length': contentLength,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, max-age=3600',
    },
  });
}
