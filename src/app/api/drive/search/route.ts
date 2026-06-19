import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { searchFiles } from '@/lib/drive';
import { mockDriveFiles } from '@/lib/mock';
import { errorResponse } from '@/lib/debug-mode';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') ?? '';
  const folderId = searchParams.get('folderId') ?? config.driveFolderId ?? '';
  const mimeType = searchParams.get('mimeType') ?? undefined;

  if (!q.trim()) return NextResponse.json([]);

  const userEmail = req.headers.get('x-goog-authenticated-user-email')?.replace('accounts.google.com:', '')
    ?? process.env.LOCAL_USER_EMAIL
    ?? '';

  if (config.useMock) {
    const needle = q.toLowerCase();
    const results = mockDriveFiles.filter(f => f.name.toLowerCase().includes(needle));
    return NextResponse.json(results);
  }

  try {
    const results = await searchFiles({
      userEmail,
      q,
      folderId: folderId || undefined,
      mimeType,
    });
    return NextResponse.json(results);
  } catch (e) {
    const { body, status } = errorResponse(e, {
      userEmail,
      fallback: 'Drive search is unavailable.',
      logTag: 'drive/search',
    });
    return NextResponse.json(body, { status });
  }
}
