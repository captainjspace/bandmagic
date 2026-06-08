import { NextRequest, NextResponse } from 'next/server';
import { listObjects } from '@/lib/gcs';
import { config } from '@/lib/config';

export async function GET(req: NextRequest) {
  const prefix = req.nextUrl.searchParams.get('prefix') ?? config.prefix;

  if (prefix.includes('..') || prefix.startsWith('/')) {
    return NextResponse.json({ error: 'Invalid prefix' }, { status: 400 });
  }

  const objects = await listObjects(prefix);
  return NextResponse.json(objects);
}
