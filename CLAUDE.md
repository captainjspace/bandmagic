# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # start dev server (localhost:3000)
pnpm build        # production build (output: standalone)
pnpm lint         # eslint
```

No test suite is configured. That is an open item.

The app is deployed as a Docker container on port 8080 (`next.config.ts` sets `output: 'standalone'`). Dev origins include `192.168.99.239` and `192.168.3.13` (local network hosts).

## Architecture

**Stack:** Next.js 16 App Router, React 19, Tailwind 4, TypeScript. Package manager: pnpm.

**Path aliases:** `@/*` → `src/*`, `#img/*` → `public/*`.

### Data design principles

OLTP-first across all entities. Firestore is the source of truth for transactional reads/writes; analytics queries happen against a downstream BigQuery sync (not yet built). Concretely:

- Denormalize display fields on references so list views don't N+1 fetch.
- Keep arrays bounded — use a subcollection when growth is unbounded.
- Don't build reverse-indexes in Firestore for analytics; that's BigQuery's job. Denormalize an OLTP-useful counter (e.g. `usageCount`) on the referenced entity instead.

**Domain seams.** Each entity owns one kind of thing, and a clickable URL to actionable data lives in exactly one record. Other entities reference it by ID, not by copying the URL.

- Assets own document and web links (Drive docs, posts, reviews, public URLs).
- Tracks own audio (GCS paths). A track's mp3 is **not** an asset.
- Notes attach at version level (per-mix commentary). Assets attach at track level.
### Catalog sync flow

Admin triggers `POST /api/admin/sync` → lists all audio files in GCS under `config.prefix` → maps each to a `CatalogEntry` (path, song, stage, mix, title, size) → bulk-upserts into Firestore `catalog` collection via batched writes. Catalog doc IDs are `encodeURIComponent(path)`.

### Track-group lifecycle

1. Admin searches the catalog via `TrackSearch` component (client-side, lazy-loads and module-level caches the full catalog from `GET /api/catalog`)
2. Submits `POST /api/track-groups` → creates Firestore doc → calls `sendReleaseNotification` (the function is named for the *action* of releasing to the band; Gmail + optional Google Chat webhook)
3. Band views at `/track-group/[id]` — audio proxied through `GET /api/audio?path=` which streams directly from GCS (no signed URLs, private bucket)

**Author identity:** `POST /api/track-groups` reads `x-goog-authenticated-user-email` header (set by Cloud Run / IAP) or falls back to `LOCAL_USER_EMAIL` env var. The same chain is inlined in five other routes — `src/lib/identity.ts` extraction is the natural next refactor.

A `type` field on `TrackGroup` (`album | ep | single | playlist | …`) is the next planned addition for differentiating collection kinds. Not yet implemented.

### Notification

`src/lib/notify.ts` sends email via Gmail API (ADC scoped to `gmail.send`) and/or a Google Chat webhook. Site URL defaults to `https://superblackout.rollingblackout.band` but is overridden by `APP_URL` env var. There is a bug on line 58: `${siteConfig.url}}` has an extra `}` in the chat message template.

### Key env vars

| Var | Purpose |
|-----|---------|
| `GCS_BUCKET` | GCS bucket name (default: `rollingblackoutband`) |
| `GCS_PREFIX` | Path prefix for catalog sync (default: `2026/`) |
| `GCP_PROJECT_ID` / `FIRESTORE_PROJECT_ID` | GCP project |
| `FIRESTORE_DATABASE_ID` | Firestore named database (default: `rollingblackoutapp-fsdb`) |
| `NOTIFY_EMAILS` | Comma-separated recipient list |
| `GOOGLE_CHAT_WEBHOOK_URL` | Chat space webhook |
| `APP_URL` | Public URL for notification links |
| `LOCAL_USER_EMAIL` | Dev fallback for the authenticated user (track-group author, asset author, Drive impersonation subject) |
| `DRIVE_FOLDER_ID` | Default Drive folder ID for the band's shared assets (used as the encouraged scope for search and sweep) |
| `DEBUG_USERS` | Comma-separated emails granted detailed error responses (see Debug mode) |
| `USE_MOCK` | `true` to skip all GCP calls |

GCP credentials: ADC via `application_default_credentials.json.gpg` (encrypted at rest in repo root).

### Drive integration

`src/lib/drive.ts` wraps Drive API v3 via the `googleapis` SDK. Two functions today: `searchFiles` and `getFile`. Foundation for future write operations (doc creation, image retrieval).

**Auth — domain-wide delegation, user impersonation.** The service account does **not** get added to the shared Drive folder. Instead, it impersonates the calling user. Visibility = what *that user* can see in Drive.

```ts
new google.auth.GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  clientOptions: userEmail ? { subject: userEmail } : undefined,
});
```

- **Local dev**: ADC = the developer's user creds (`gcloud auth application-default login`). `subject` is ignored by user creds. Drive queries run as the developer.
- **Prod (Cloud Run)**: ADC = the Cloud Run service account. **One-time Workspace admin step**: enable domain-wide delegation on the SA and authorize the `drive.readonly` scope in the Workspace admin console. Without this, prod Drive calls 403.

`userEmail` is resolved from `x-goog-authenticated-user-email` (set by Cloud Run / IAP) or `LOCAL_USER_EMAIL` env var. The same resolution chain is inlined in `POST /api/track-groups`, `POST /api/track-groups/[id]/notes`, `/api/assets`, `/api/assets/[id]`, and `/api/admin/sweep-drive` — candidate for `src/lib/identity.ts` extraction.

**Search scope.** `searchFiles` runs two parallel queries when `DRIVE_FOLDER_ID` is set: one scoped to that folder, one unscoped (user-visible everywhere). Results merge with folder hits ranked first; deduped by file id. Without `DRIVE_FOLDER_ID`, only the unscoped query runs.

**Drive sweep.** `POST /api/admin/sweep-drive` (body: `{ trackGroupId }`) walks every track on the track group, searches Drive by track title, filters by `scoreMatch ≥ SWEEP_THRESHOLD` (see `src/lib/filename-match.ts`), and creates+attaches matching assets. Idempotent: existing assets are reused by URL match. Asset subtype is inferred from filename keywords (lyrics / chord-chart / press-release / review / post / other). The same code path will be invoked by a future daily Cloud Scheduler job (not yet wired).

**UI integration.** `src/components/DriveSearch.tsx` is the reusable search-and-pick component. Wired into `AssetPicker`'s create mode under the "Search Drive" tab. The "Paste URL" tab remains for non-Drive assets (web reviews, blog posts).

### Debug mode (claims-based)

`src/lib/debug-mode.ts` provides `isDebugUser(email)` and `errorResponse(err, opts)`. The gate is the verified user identity from `x-goog-authenticated-user-email` (Cloud Run / IAP) or `LOCAL_USER_EMAIL` in dev, checked against the `DEBUG_USERS` env-var allowlist.

- **Debug user**: response body includes `{ error, status, code, details }` with the upstream error and any structured detail (e.g. GaxiosError `errors[]`).
- **Non-debug user**: response body is the sanitized `{ error: fallback, status }`.
- Upstream HTTP status is **always** propagated (so an actual 401/403/429 surfaces correctly to the client, not a blanket 500).
- Server logs (`console.error`) always include the full error regardless of caller — log retention is independent of caller identity.

No client-toggleable flag (no `?debug=1`, no header). Lets only an allowlisted server-side identity unlock detail.

Apply by replacing a generic catch-all with:
```ts
const { body, status } = errorResponse(e, { userEmail, fallback: '…', logTag: 'route-name' });
return NextResponse.json(body, { status });
```

Currently wired into `/api/drive/search` and `/api/admin/sweep-drive`. Other routes can adopt as they're touched — not retrofitted in bulk.

### Stage colors

Stage badge colors are defined as CSS classes in `globals.css` (`@layer components`): `.stage-writing`, `.stage-tracking`, `.stage-mixing`, `.stage-mastering`, `.stage-unknown`. Background variants use the `-bg` suffix (e.g. `.stage-mixing-bg`). Use `stageClass(stage)` / `stageBgClass(stage)` from `src/lib/stage.ts` instead of hardcoded Tailwind color strings. Never re-define `STAGE_COLORS` maps in components.

### Assets entity

Top-level Firestore collection `assets`. Document/link records referenceable from any other entity. Replaced the old embedded `Track.docLinks[]` (2026-06-18 cutover; two `docLinks` records were hand-rewritten).

```ts
type Asset = {
  id: string                    // Firestore doc id (surrogate key)
  url: string                   // single source of truth for the clickable target
  title: string                 // display label
  type: 'drive' | 'web'         // origin: internal Google workspace vs external URL
  subtype:                      // semantic kind set by the user
    | 'lyrics' | 'lyrics-stripped' | 'chord-chart'
    | 'press-release' | 'review' | 'post' | 'other'
  usageCount: number            // denormalized OLTP counter
  createdAt: Timestamp; createdBy: string  // email
  updatedAt: Timestamp; updatedBy: string
}
```

- For `type: 'drive'`, the Google doc-kind (doc/sheet/slide) is inferred from URL path (`/document/`, `/spreadsheets/`, `/presentation/`) — not stored separately.
- Associations live on the referencing entity as `assetIds: string[]`, track-level (not per-version). The asset is the source of truth; `usageCount` is denormalized for OLTP read paths.
- `createdBy` / `updatedBy` use the same `x-goog-authenticated-user-email` / `LOCAL_USER_EMAIL` resolution as `POST /api/track-groups`.
