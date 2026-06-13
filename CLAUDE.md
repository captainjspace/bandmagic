# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # start dev server (localhost:3000)
pnpm build        # production build (output: standalone)
pnpm lint         # eslint
```

No test suite is configured.

The app is deployed as a Docker container on port 8080 (`next.config.ts` sets `output: 'standalone'`). Dev origins include `192.168.99.239` and `192.168.3.13` (local network hosts).

## Architecture

**Stack:** Next.js 16 App Router, React 19, Tailwind 4, TypeScript. Package manager: pnpm.

**Path aliases:** `@/*` → `src/*`, `#img/*` → `public/*`.

### Data layer

Two GCP services, both accessed server-side only:

- **GCS** (`src/lib/gcs.ts`) — audio file storage. Bucket and prefix come from `config` (`GCS_BUCKET`, `GCS_PREFIX`). Helper functions derive track metadata from path structure: `stageFromPath` extracts stage from path segments (`writing/tracking/mixing/mastering`), `titleFromPath` cleans the filename.
- **Firestore** (`src/lib/firestore.ts`) — persistence. Database: `bandmagic`. Collections: `releases` (top-level), `notes` (subcollection under each release), `catalog` (flat index of GCS audio files). The `firestoreConfig.coredb` const is `"releases"` but `databaseId` in the Firestore constructor reads from env (`FIRESTORE_DATABASE_ID`), which takes precedence.

**Mock mode:** Set `USE_MOCK=true` to bypass GCP entirely. `src/lib/mock.ts` has static fixture data. All API routes and the home page check `config.useMock` before hitting live services.

### Catalog sync flow

Admin triggers `POST /api/admin/sync` → lists all audio files in GCS under `config.prefix` → maps each to a `CatalogEntry` (path, song, stage, mix, title, size) → bulk-upserts into Firestore `catalog` collection via batched writes. Catalog doc IDs are `encodeURIComponent(path)`.

### Release lifecycle

1. Admin searches the catalog via `TrackSearch` component (client-side, lazy-loads and module-level caches the full catalog from `GET /api/catalog`)
2. Submits `POST /api/releases` → creates Firestore doc → calls `sendReleaseNotification` (Gmail + optional Google Chat webhook)
3. Band views at `/release/[id]` — audio proxied through `GET /api/audio?path=` which streams directly from GCS (no signed URLs, private bucket)

**Author identity:** `POST /api/releases` reads `x-goog-authenticated-user-email` header (set by Cloud Run / IAP) or falls back to `LOCAL_USER_EMAIL` env var.

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
| `LOCAL_USER_EMAIL` | Dev fallback for release author |
| `USE_MOCK` | `true` to skip all GCP calls |

GCP credentials: ADC via `application_default_credentials.json.gpg` (encrypted at rest in repo root).

### Stage colors

Stage badge colors are defined as CSS classes in `globals.css` (`@layer components`): `.stage-writing`, `.stage-tracking`, `.stage-mixing`, `.stage-mastering`, `.stage-unknown`. Background variants use the `-bg` suffix (e.g. `.stage-mixing-bg`). Use `stageClass(stage)` / `stageBgClass(stage)` from `src/lib/stage.ts` instead of hardcoded Tailwind color strings. Never re-define `STAGE_COLORS` maps in components.

### Drive doc links

`DocLink` (`src/types/index.ts`) is `{ url, title, type }` where type is `lyrics | chart | sheet-music | other`. Stored as `docLinks[]` on each embedded `Track` within a release. Edited in the admin track card UI, displayed in the release detail view below the notes section.
