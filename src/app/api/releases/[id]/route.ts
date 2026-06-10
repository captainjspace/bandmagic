import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { getRelease, updateRelease, deleteRelease } from '@/lib/firestore';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (config.useMock) return NextResponse.json(null);
  const release = await getRelease(id);
  if (!release) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(release);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  if (config.useMock) return NextResponse.json({ id, ...body });
  const release = await updateRelease(id, body);
  return NextResponse.json(release);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (config.useMock) return new NextResponse(null, { status: 204 });
  await deleteRelease(id);
  return new NextResponse(null, { status: 204 });
}
