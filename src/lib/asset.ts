import type { AssetSubtype, AssetType } from '@/types';

const KNOWN_SUBTYPES = new Set<AssetSubtype>([
  'lyrics',
  'lyrics-stripped',
  'chord-chart',
  'press-release',
  'review',
  'post',
  'other',
]);

export function assetClass(subtype?: string): string {
  return KNOWN_SUBTYPES.has(subtype as AssetSubtype) ? `asset-${subtype}` : 'asset-other';
}

export function assetBgClass(subtype?: string): string {
  return KNOWN_SUBTYPES.has(subtype as AssetSubtype) ? `asset-${subtype}-bg` : '';
}

export function inferAssetType(url: string): AssetType {
  return /https?:\/\/(docs|drive)\.google\.com\//i.test(url) ? 'drive' : 'web';
}

export function driveDocKind(url: string): 'doc' | 'sheet' | 'slide' | null {
  if (/docs\.google\.com\/document\//i.test(url)) return 'doc';
  if (/docs\.google\.com\/spreadsheets\//i.test(url)) return 'sheet';
  if (/docs\.google\.com\/presentation\//i.test(url)) return 'slide';
  return null;
}
