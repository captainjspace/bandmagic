import { NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { getSongs } from '@/lib/firestore';
import { mockSongs } from '@/lib/mock';

export async function GET() {
  if (config.useMock) return NextResponse.json(mockSongs);
  const songs = await getSongs();
  return NextResponse.json(songs);
}
