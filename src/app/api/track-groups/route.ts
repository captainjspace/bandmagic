import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { getTrackGroups, createTrackGroup } from '@/lib/firestore';
import { mockTrackGroups } from '@/lib/mock';
import { sendReleaseNotification } from '@/lib/notify';

export async function GET() {
  if (config.useMock) {
    return NextResponse.json(mockTrackGroups);
  }
  const trackGroups = await getTrackGroups();
  return NextResponse.json(trackGroups);
}

export async function POST(req: NextRequest) {
  const { notify = true, ...body } = await req.json();
  const author = req.headers.get('x-goog-authenticated-user-email')?.replace('accounts.google.com:', '')
    ?? process.env.LOCAL_USER_EMAIL
    ?? 'unknown';

  if (config.useMock) {
    return NextResponse.json({ id: 'mock-new', ...body, createdBy: author }, { status: 201 });
  }

  const trackGroup = await createTrackGroup({ ...body, createdBy: author });
  if (notify) await sendReleaseNotification(trackGroup);
  return NextResponse.json(trackGroup, { status: 201 });
}
