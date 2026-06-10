import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { getReleases, createRelease } from '@/lib/firestore';
import { mockReleases } from '@/lib/mock';
import { sendReleaseNotification } from '@/lib/notify';

export async function GET() {
  if (config.useMock) {
    return NextResponse.json(mockReleases);
  }
  const releases = await getReleases();
  return NextResponse.json(releases);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const author = req.headers.get('x-goog-authenticated-user-email')?.replace('accounts.google.com:', '')
    ?? process.env.LOCAL_USER_EMAIL
    ?? 'unknown';

  if (config.useMock) {
    return NextResponse.json({ id: 'mock-new', ...body, createdBy: author }, { status: 201 });
  }

  const release = await createRelease({ ...body, createdBy: author });
  await sendReleaseNotification(release);
  return NextResponse.json(release, { status: 201 });
}
