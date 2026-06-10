import { NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { getCatalog } from '@/lib/firestore';
import { mockCatalog } from '@/lib/mock';

export async function GET() {
  if (config.useMock) return NextResponse.json(mockCatalog);
  const entries = await getCatalog();
  return NextResponse.json(entries);
}
