import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { getNotes, addNote } from '@/lib/firestore';
import { mockNotes } from '@/lib/mock';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const trackPath = req.nextUrl.searchParams.get('track') ?? undefined;

  if (config.useMock) {
    const notes = mockNotes.filter(n => !trackPath || n.trackPath === trackPath);
    return NextResponse.json(notes);
  }

  const notes = await getNotes(id, trackPath);
  return NextResponse.json(notes);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const author = req.headers.get('x-goog-authenticated-user-email')?.replace('accounts.google.com:', '')
    ?? process.env.LOCAL_USER_EMAIL
    ?? 'unknown';

  if (config.useMock) {
    return NextResponse.json({ id: `mock-${Date.now()}`, ...body, author, createdAt: new Date().toISOString() }, { status: 201 });
  }

  const note = await addNote(id, { ...body, author });
  return NextResponse.json(note, { status: 201 });
}
