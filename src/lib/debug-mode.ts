import { config } from '@/lib/config';

/**
 * Identity-claims based debug gating.
 *
 * The signal is the verified user identity from `x-goog-authenticated-user-email`
 * (Cloud Run / IAP) or LOCAL_USER_EMAIL in dev. Membership in `DEBUG_USERS` (env)
 * unlocks detailed error responses + verbose server logs for that caller only.
 *
 * No client-toggleable flag (query string, header) — those would let any end user
 * escalate. The allowlist is server-controlled.
 */

export function isDebugUser(userEmail?: string | null): boolean {
  if (!userEmail) return false;
  return config.debugUsers.includes(userEmail.toLowerCase());
}

/** Best-effort extraction of an upstream HTTP status from a thrown error. */
function extractStatus(err: unknown): number | null {
  if (!err || typeof err !== 'object') return null;
  const e = err as { code?: number | string; response?: { status?: number }; status?: number };
  if (typeof e.response?.status === 'number') return e.response.status;
  if (typeof e.status === 'number') return e.status;
  if (typeof e.code === 'number') return e.code;
  if (typeof e.code === 'string') {
    const n = parseInt(e.code, 10);
    if (!Number.isNaN(n) && n >= 100 && n < 600) return n;
  }
  return null;
}

function extractMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'Unknown error';
}

function extractCode(err: unknown): string | number | undefined {
  if (!err || typeof err !== 'object') return undefined;
  const e = err as { code?: number | string };
  return e.code;
}

function extractDetails(err: unknown): unknown {
  if (!err || typeof err !== 'object') return undefined;
  const e = err as { errors?: unknown; response?: { data?: unknown } };
  return e.errors ?? e.response?.data;
}

export type ApiErrorBody = {
  error: string;
  status: number;
  code?: string | number;
  details?: unknown;
};

/**
 * Build an error response, propagating upstream status when known. Always logs
 * server-side. Body detail level is gated by the caller's debug-user status.
 */
export function errorResponse(
  err: unknown,
  opts: { userEmail?: string | null; fallback: string; logTag?: string },
): { body: ApiErrorBody; status: number } {
  console.error(`[${opts.logTag ?? 'api'}]`, err);
  const status = extractStatus(err) ?? 500;
  if (isDebugUser(opts.userEmail)) {
    return {
      body: {
        error: extractMessage(err),
        status,
        code: extractCode(err),
        details: extractDetails(err),
      },
      status,
    };
  }
  return {
    body: { error: opts.fallback, status },
    status,
  };
}
