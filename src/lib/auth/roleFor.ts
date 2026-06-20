/**
 * `roleFor(email)` — group-derived role lookup.
 *
 * The architectural prize from the auth-platform design: role is **derived from
 * Workspace group membership**, never stored. No `users` table; no role-management
 * UI; no first-admin bootstrap problem. Group membership in the IdP IS entitlement.
 *
 * Phase A (now): this module is called from middleware on every protected request.
 * Phase B (when external guests arrive): same function moves to the broker and the
 * result rides in a JWT claim instead. Function body is identical in both phases —
 * only the call site moves. Don't introduce app-local user→role state ever.
 *
 * See [[project-auth-platform-design]] memory for the full architecture.
 */

import { google, type admin_directory_v1 } from 'googleapis';
import { config } from '@/lib/config';

export type Role = 'guest' | 'member' | 'admin';

/**
 * Config table. Order matters — highest-privilege group wins. Add a group → grant
 * the role; remove a member from the group in Google Admin → role expires within
 * the next lookup window. Provisioning lives entirely in the Workspace admin console.
 */
const GROUP_ROLES: ReadonlyArray<{ group: string; role: Role }> = [
  { group: 'gcpadmin@rollingblackoutband.com', role: 'admin' },
  { group: 'band@rollingblackoutband.com',     role: 'member' },
];

const SCOPE = 'https://www.googleapis.com/auth/admin.directory.group.member.readonly';

let _client: admin_directory_v1.Admin | null = null;
function directoryClient(): admin_directory_v1.Admin {
  if (!_client) {
    const auth = new google.auth.GoogleAuth({ scopes: [SCOPE] });
    _client = google.admin({ version: 'directory_v1', auth });
  }
  return _client;
}

/**
 * Mock memberships for dev. Keyed by group; values are member emails. Mirror the
 * shape of the real Workspace lookup but avoid the Admin SDK scope dependency
 * (which `gcloud auth application-default login` doesn't grant by default — and
 * we explicitly don't relax that for "right-path-only" testing).
 */
const MOCK_MEMBERS: Record<string, string[]> = {
  'gcpadmin@rollingblackoutband.com': ['joshgcp@rollingblackoutband.com'],
  'band@rollingblackoutband.com':     ['joshgcp@rollingblackoutband.com', 'bassist@rollingblackoutband.com'],
};

async function isMember(groupKey: string, memberKey: string): Promise<boolean> {
  if (config.useMock) {
    return MOCK_MEMBERS[groupKey]?.includes(memberKey.toLowerCase()) ?? false;
  }
  try {
    const res = await directoryClient().members.hasMember({ groupKey, memberKey });
    return res.data.isMember === true;
  } catch (err) {
    // Group not found, member not in domain, or auth failure (the SA lacks
    // Workspace Group Reader role in prod, or the dev ADC lacks the scope).
    // Log loud; treat as "not a member" so the user falls through to `guest`.
    console.error('[roleFor/isMember]', groupKey, memberKey, err);
    return false;
  }
}

export async function roleFor(email: string | null | undefined): Promise<Role> {
  if (!email) return 'guest';
  const lower = email.toLowerCase();
  for (const { group, role } of GROUP_ROLES) {
    if (await isMember(group, lower)) return role;
  }
  return 'guest';
}
