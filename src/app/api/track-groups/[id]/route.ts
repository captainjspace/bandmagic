import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { getTrackGroup, updateTrackGroup, deleteTrackGroup } from '@/lib/firestore';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (config.useMock) return NextResponse.json(null);
  const trackGroup = await getTrackGroup(id);
  if (!trackGroup) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(trackGroup);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  if (config.useMock) return NextResponse.json({ id, ...body });
  const trackGroup = await updateTrackGroup(id, body);
  return NextResponse.json(trackGroup);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (config.useMock) return new NextResponse(null, { status: 204 });
  await deleteTrackGroup(id);
  return new NextResponse(null, { status: 204 });
}
