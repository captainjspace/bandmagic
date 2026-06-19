import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { getAsset, updateAsset, deleteAsset } from '@/lib/firestore';
import { mockAssets } from '@/lib/mock';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (config.useMock) {
    const asset = mockAssets.find(a => a.id === id);
    if (!asset) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(asset);
  }
  const asset = await getAsset(id);
  if (!asset) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(asset);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const author = req.headers.get('x-goog-authenticated-user-email')?.replace('accounts.google.com:', '')
    ?? process.env.LOCAL_USER_EMAIL
    ?? 'unknown';

  if (config.useMock) {
    return NextResponse.json({ id, ...body, updatedBy: author, updatedAt: new Date().toISOString() });
  }

  const asset = await updateAsset(id, { ...body, updatedBy: author });
  return NextResponse.json(asset);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (config.useMock) return new NextResponse(null, { status: 204 });
  await deleteAsset(id);
  return new NextResponse(null, { status: 204 });
}
