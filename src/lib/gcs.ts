import { Storage } from '@google-cloud/storage';
import { Readable } from 'stream';
import { config } from './config';

const storage = new Storage();

export async function listObjects(prefix: string): Promise<{ name: string; size: string; updated: string; contentType?: string }[]> {
  const [files] = await storage.bucket(config.bucket).getFiles({ prefix, autoPaginate: true });
  return files.map(f => ({
    name: f.name,
    size: String(f.metadata.size ?? 0),
    updated: String(f.metadata.updated ?? ''),
    contentType: f.metadata.contentType,
  }));
}

export async function getReadStream(path: string): Promise<ReadableStream> {
  const file = storage.bucket(config.bucket).file(path);
  const nodeStream = file.createReadStream();
  return Readable.toWeb(nodeStream) as ReadableStream;
}

export async function getFileMetadata(path: string) {
  const [metadata] = await storage.bucket(config.bucket).file(path).getMetadata();
  return metadata;
}

export async function readFileAsText(path: string): Promise<string> {
  const [contents] = await storage.bucket(config.bucket).file(path).download();
  return contents.toString('utf-8');
}

export function isAudio(name: string) {
  return /\.(mp3|wav|flac|aac|ogg|m4a)$/i.test(name);
}

export function isDoc(name: string) {
  return /\.(md|txt|pdf)$/i.test(name);
}

export function basename(path: string) {
  return path.split('/').pop() ?? path;
}

export function titleFromPath(path: string): string {
  const base = basename(path);
  return base.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
}

export function stageFromPath(path: string): string | undefined {
  const stages = ['writing', 'tracking', 'mixing', 'mastering'];
  const parts = path.split('/');
  return parts.find(p => stages.includes(p));
}
