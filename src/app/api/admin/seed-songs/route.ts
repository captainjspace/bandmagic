import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { seedSongs } from '@/lib/firestore';

/** Parses "Name" or "Name (Alias)" per line into {name, aliases}, deduped case-insensitively. */
function parseSongList(text: string): { name: string; aliases?: string[] }[] {
  const seen = new Set<string>();
  const out: { name: string; aliases?: string[] }[] = [];

  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;

    const match = line.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
    const name = (match ? match[1] : line).trim();
    const alias = match ? match[2].trim() : undefined;
    if (!name) continue;

    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    out.push({ name, ...(alias ? { aliases: [alias] } : {}) });
  }

  return out;
}

export async function POST(req: NextRequest) {
  const { text } = await req.json();
  if (typeof text !== 'string' || !text.trim()) {
    return NextResponse.json({ error: 'Missing "text" body' }, { status: 400 });
  }

  const author = req.headers.get('x-goog-authenticated-user-email')?.replace('accounts.google.com:', '')
    ?? process.env.LOCAL_USER_EMAIL
    ?? 'unknown';

  const entries = parseSongList(text);

  if (config.useMock) {
    return NextResponse.json({ created: entries.length, updated: 0 });
  }

  const result = await seedSongs(entries, author);
  return NextResponse.json(result);
}
