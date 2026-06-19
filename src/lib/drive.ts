/**
 * Drive service — in-process today; planned extraction to a dedicated Cloud Run microservice.
 *
 * Why split later: DWD gives this code the power to impersonate any user in the Workspace
 * for Drive. Bundling that into the main app's SA expands blast radius. The microservice
 * version isolates Drive permissions to a narrowly-scoped SA only the drive service uses.
 *
 * Why monolith today: the security gain requires the drive service to independently verify
 * the user (IAP JWT validation, not trusting forwarded headers from the main app) plus
 * Cloud Run service-to-service IAM — real infra work. Defer until trigger conditions hit:
 * a second developer, multi-tenancy, or a security audit.
 *
 * Migration path is a refactor, not a rewrite: this file's exports become the drive service's
 * body; main app's `drive.ts` becomes a thin HTTP client. Route handlers in
 * src/app/api/drive/** don't change.
 */

import { google, type drive_v3 } from 'googleapis';

export type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  modifiedTime: string;
  iconLink?: string;
  owners?: { emailAddress: string; displayName: string }[];
};

const FIELDS = 'files(id,name,mimeType,webViewLink,modifiedTime,iconLink,owners(emailAddress,displayName))';
const SCOPE = 'https://www.googleapis.com/auth/drive.readonly';

function driveClient(userEmail: string): drive_v3.Drive {
  const auth = new google.auth.GoogleAuth({
    scopes: [SCOPE],
    clientOptions: userEmail ? { subject: userEmail } : undefined,
  });
  return google.drive({ version: 'v3', auth });
}

function escapeForQuery(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function buildSearchTerm(q: string, mimeType?: string, folderId?: string): string {
  const safe = escapeForQuery(q.trim());
  const parts: string[] = ['trashed = false'];
  if (safe) parts.push(`(name contains '${safe}' or fullText contains '${safe}')`);
  if (mimeType) parts.push(`mimeType = '${escapeForQuery(mimeType)}'`);
  if (folderId) parts.push(`'${escapeForQuery(folderId)}' in parents`);
  return parts.join(' and ');
}

function mapFile(f: drive_v3.Schema$File): DriveFile | null {
  if (!f.id || !f.name || !f.webViewLink || !f.mimeType || !f.modifiedTime) return null;
  return {
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    webViewLink: f.webViewLink,
    modifiedTime: f.modifiedTime,
    iconLink: f.iconLink ?? undefined,
    owners: f.owners?.map(o => ({
      emailAddress: o.emailAddress ?? '',
      displayName: o.displayName ?? '',
    })),
  };
}

export async function searchFiles(params: {
  userEmail: string;
  q: string;
  folderId?: string;
  mimeType?: string;
  pageSize?: number;
}): Promise<DriveFile[]> {
  const { userEmail, q, folderId, mimeType, pageSize = 25 } = params;
  if (!q.trim()) return [];
  const drive = driveClient(userEmail);

  const baseParams = {
    pageSize,
    fields: FIELDS,
    orderBy: 'modifiedTime desc',
    corpora: 'user',                       // search the user's accessible content
    includeItemsFromAllDrives: true,       // include Shared Drives the user can see
    supportsAllDrives: true,               // required when includeItemsFromAllDrives is true
  } as const;

  const queries: Promise<drive_v3.Schema$FileList>[] = [];
  if (folderId) {
    queries.push(
      drive.files.list({ ...baseParams, q: buildSearchTerm(q, mimeType, folderId) }).then(r => r.data),
    );
  }
  queries.push(
    drive.files.list({ ...baseParams, q: buildSearchTerm(q, mimeType) }).then(r => r.data),
  );

  const results = await Promise.all(queries);
  const seen = new Set<string>();
  const merged: DriveFile[] = [];
  for (const r of results) {
    for (const raw of r.files ?? []) {
      const mapped = mapFile(raw);
      if (!mapped || seen.has(mapped.id)) continue;
      seen.add(mapped.id);
      merged.push(mapped);
    }
  }
  return merged.slice(0, pageSize);
}

export async function getFile(params: {
  userEmail: string;
  id: string;
}): Promise<DriveFile | null> {
  const drive = driveClient(params.userEmail);
  try {
    const res = await drive.files.get({
      fileId: params.id,
      fields: 'id,name,mimeType,webViewLink,modifiedTime,iconLink,owners(emailAddress,displayName)',
    });
    return mapFile(res.data);
  } catch {
    return null;
  }
}
