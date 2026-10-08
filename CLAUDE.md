# CLAUDE.md

## Architecture Invariants

- Song "folders" are VIRTUAL groupings derived from metadata, not real storage directories. Never assume a filesystem/GCS folder hierarchy exists for songs.
- Folder/song matching must be fuzzy/normalized (case- and punctuation-insensitive), never exact-string only.

## Tooling (decided — do not re-evaluate)

- Lint/format: Biome (not ESLint/Prettier). Suppression comments use `// biome-ignore lint/<rule>: <reason>`, not `eslint-disable`.
- Tests: Vitest.
- 9/28 **Note** I have enabled a nursery section in biome to skip ordering css classes or warn, i think that means check in working code before formatting


## Data Seeding Checklist

Before declaring any classification/matching feature done:
1. Confirm the source collection is actually seeded and non-empty.
2. Print counts per bucket.
3. Confirm zero unexpected "Unclassified" rows.

## Environment Constraints

- Commands needing sudo, SSH packet capture (tcpdump), or secret generation will be blocked — output the exact command for the user to run manually instead of attempting it.
- The microk8s node has a known containerd/CDI bug blocking image pulls. Default to local Docker/Podman for container work unless told otherwise.
- 

## Exploration Budget

- Before broad codebase exploration, state your model of the data/storage layer in 2-3 sentences and confirm before continuing.
- Prefer a Task/Explore agent with a narrow question over many sequential Read/Grep calls.

## Git workflow — ⚠️ main is hot

A push to `main` is auto-built and deployed to production Cloud Run (`.github/workflows/deploy.yaml`). There is no staging gate — `main` going green on GitHub Actions means it's live for the band.

- Never commit or push directly to `main`. Do all work on a feature branch (`git checkout -b <name>`) and open a PR for review before merging.
- Local commits on a branch are safe to make freely; pushing that branch to `origin` is safe (doesn't trigger deploy — only `main` and `v*` tags do, per the workflow's `on.push` trigger). Merging the PR to `main` is the actual "go live" step — treat it accordingly.
- Claude creates feature branches, commits, pushes, and opens PRs freely. Claude does **not** merge PRs to `main` — the user always does that merge themselves, since it's the production deploy trigger and they own that call.
- Before merging: run `pnpm build` and, if touching Docker/deploy-relevant files, `docker build .` locally to confirm the container still builds clean.

# Next Actions

## Done

- [x] **1 — Browse Page organizing principle.** Song = folder with many tracks (1 "latest" by date). `src/app/browse/page.tsx` groups tracks by song into collapsible sections.
- [x] **2 — Adding Media.** `SongPicker.tsx` (find or create a song folder) + `AddTrackModal.tsx` (upload new mix, or attach an existing unclassified catalog entry), wired into the header's "+ Track" button.
- [x] **3 (partial) — Header always-available links.** `AppHeader.tsx` carries "+ Track", "+ Asset", and "↻ Sync" as persistent header actions (confirmed shipped; the "scroll under header" framing in an earlier draft of this list is superseded by this).
- [x] **5 — Adding Tracks creates the song folder lazily.** `POST /api/catalog` generates `song.folderPrefix` on first upload if unset, then adds the track.
- [x] **6 — MasterSongFolder Firestore table.** `Song` type (`src/types/index.ts`) has PK, `folderPrefix`, name, audit columns, author. `getSongs`/`getSong`/`updateSong`/`seedSongs` in `src/lib/firestore.ts`.
- [x] **Track reordering.** Move-up/move-down buttons on both the Edit (`src/app/admin/[id]/page.tsx`) and New (`src/app/track-group/new/page.tsx`) track-group pages; edit-page version persists immediately via `PUT /api/track-groups/[id]`.
- [x] **Mobile song-name clipping (Browse page).** Row wraps below `sm:` so the name gets its own full-width line.
- [x] **Track ↔ track-group cross-reference (Browse page).** Each track row and song-folder header shows how many track groups reference it. Derived client-side from `GET /api/track-groups` joined against catalog paths — no new endpoint or schema change.
- [x] **`tags[]` replaces the scalar `stage` badge on the Browse page (2026-09-27).** `CatalogEntry.tags` and `Song.tags` are editable via `+ tag` / `tag ×` chips, persisted through `PATCH /api/catalog/[id]` and `PATCH /api/songs/[id]`. Track rows show read-only inherited stage chips from any track group the file belongs to. `tags.json` at the repo root is the reference vocabulary.
- [x] **Tag color declared in `tags.json`, not duplicated in code (2026-09-27).** Each tag entry can carry an optional `"color"` field; `tagClass`/`tagBgClass` in `src/lib/tag.ts` read it directly. `globals.css`'s `.tag-<color>` classes are keyed by color name, not tag name, so multiple tags can share one.
- [x] **`stageFromPath` fallback changed from `"unknown"` to `""` (2026-09-27).** `""` is falsy and gets excluded naturally by every `.filter(Boolean)` aggregation, whereas the literal string `"unknown"` was truthy and polluted them. Classifier itself still weak — see Partially done.
- [x] **Tags Phase 2 — `tags[]` extended to embedded `Track` (2026-09-27).** `Track.tags?: string[]` seeded from the picked `CatalogEntry.tags` at selection time, then edited independently per track group. `TagChips` extracted to a shared component (`src/components/TagChips.tsx`).
- [x] **Regression fixed: tags rollout hid pre-existing stage data (2026-09-27).** `effectiveTags(tags, stage)` in `src/lib/tag.ts` falls back to `[stage]` when `tags` is empty and `stage` isn't `"unknown"`. Read-only pages call it directly; the two editors deliberately do **not** feed the fallback into the editable tag array (would create an un-removable chip) — they render a separate, visually distinct read-only legacy chip instead.
- [x] **Chip provenance labels (2026-09-27).** Every chip group has a visible `"Tag Chips:"` / `"Stage Chips:"` text label — real tags vs. legacy-stage-standing-in-for-a-tag are never silently merged into one unlabeled list.
- [x] **Edit Songs / Edit Catalog admin screens (2026-09-27).** `src/app/admin/songs/page.tsx` and `src/app/admin/catalog/page.tsx` — every field on `Song`/`CatalogEntry` editable inline. `GET`/`PATCH /api/songs/[id]` and `/api/catalog/[id]` widened to the full field set. Deliberately not editable: `CatalogEntry.path` (fragile join key) and `stage` (superseded by tags). No `DELETE` for either entity.
- [x] **Song/CatalogEntry IDs switched to Firestore auto-gen, going forward (2026-09-27).** IDs were previously derived from `encodeURIComponent(name)`/`encodeURIComponent(path)` — a mutable, encoding-sensitive display field, and the root cause of a real duplicate-doc production bug. `seedSongs`/`syncCatalog` now build a `name`→ref / `path`→ref map from one upfront collection read so new entries get a real auto-gen id while re-syncs still update in place (idempotency preserved — verified by running "↻ Sync catalog" twice with no count change). Existing (already-created) docs kept their old derived IDs until the migration below.
- [x] **Migrate existing Song/CatalogEntry docs to auto-gen IDs (2026-09-27, PR #8).** `migrateSongIds`/`migrateCatalogEntryIds` in `src/lib/firestore.ts` — for each legacy-ID doc (detected by `id === encodeURIComponent(name|path)`), creates a new auto-gen-id doc with the same data, repoints every `CatalogEntry.songId` reference (only needed for Song — nothing references `CatalogEntry.id` as a FK), then deletes the old doc. Idempotent; skips a doc on error rather than aborting the run. Ships as a committed standalone runner (`src/lib/util-migrate-song-catalog-ids.ts`, run manually via `node`), matching the existing `util-migrate-asset-links.ts`/`renameCollection` precedent rather than a new API route. **Merged but not yet executed against real production data** — that's a manual one-time run, still pending.
- [x] **Song-owned assets with track inheritance (2026-09-27, PR #9).** `Song.assets`/`CatalogEntry.assets?: AssetLink[]` (new). A track displays its own assets plus its parent song's, via `effectiveAssets()` in `src/lib/asset.ts` — inherited chips are read-only/non-removable from the track (same fix class as the tags/stage fallback bug above; removing one means editing the song). `usageCount`/reference-integrity extended to match: `updateSong`/`updateCatalogEntry` share the same transactional delta logic `updateTrackGroup` already had (`collectAssetLinks` generalized, `applyDeltasInTx` extracted), and `deleteAsset` now cleans up stale links on Songs and CatalogEntries too, not just TrackGroups.
- [x] **Browse page consolidated into a catalog-management surface (2026-09-27, PR #9, then fixed same day after visual verification).** Song and track rows both get `+tag`/`+asset`/`+edit` inline — editing `Song.aliases/folderPrefix/latestPath` and `CatalogEntry.title/mix` no longer requires navigating to `/admin/songs`/`/admin/catalog`. **PR #9's first cut shipped without a browser check and broke in production**: a narrow multi-column card grid (`auto-fill`/`minmax`) squeezed track titles to zero visible width once every chip/button competed for space in a ~260px card, and a white-card restyle killed legibility against the rest of the dark app. Fixed via a user-provided annotated mockup (screenshot with boxes/arrows) once two verbal-only guesses had already missed — for non-trivial visual changes, ask for a rough mockup before iterating further rather than guessing again. Current shape: single-column dark layout, song boxes (rbyellow border) nesting track boxes (cyan border), tags always visible as labeled chips, asset chips/picker always visible (same as tags — moved out of the actions panel after a follow-up "assets should display on top" note), field editing (name/aliases/folderPrefix/latestPath for songs, title/mix for tracks) consolidated behind one `+Actions` toggle per row instead of separate always-visible buttons. Track name displays the real filename from `CatalogEntry.path`, not the derived `title` — grounds the UI in the actual stored object per explicit feedback. New shared `SongChip` component (`src/components/SongChip.tsx`) shows song ownership on a track — used on Browse (large) and added to `/track-group/[id]`'s tracklist (small), deriving ownership via a client-side path→`CatalogEntry.songId`→`Song.name` join since embedded `Track` has no `songId` of its own (no schema change). `?editSong=<id>`/`?editTrack=<id>` deep-links still open and scroll to a specific row's editor.
- [x] **ERD diagram.** `docs/erd.mmd` documents the as-built domain model (see the "Domain model — ERD" section below) and is kept current as the schema changes — most recently for the ID-migration and asset-inheritance work above.

## Partially done — needs a follow-up pass

- [ ] **3 — Sync consolidation.** `AppHeader.tsx` has one "↻ Sync" button rather than two separate ones (storage catalog vs. asset catalog) — confirm `/api/admin/sync` actually covers both, or split visibly if not.
- [ ] **3a — Auto-save on blur.** Not implemented anywhere (no `onBlur` handlers found).
- [ ] **`stageFromPath` still can't classify most real GCS paths.** Symptom fixed (falls back to `""`, fails quietly instead of mislabeling as `"unknown"`); underlying classifier in `src/lib/gcs.ts` is still weak. Low priority now that `stage` is deprecated in favor of tags for display.

## Open

- [ ] **Run the Song/CatalogEntry ID migration against real data.** The utility from PR #8 is merged (`node src/lib/util-migrate-song-catalog-ids.ts`) but hasn't actually been executed yet — needs real ADC, not mock mode.
- [ ] **4 — Manual notify action.** Notify currently only fires on create (`POST /api/track-groups` → `sendReleaseNotification`); `PUT` (update) never notifies. Decided: a plain action (one endpoint + one button, id in, notification out), **not** a persisted `notifiable` field — no state to track.
- [ ] **Song Profile page** — the bigger one. Per-song view: its tracks, its assets (now real — see Done above), which track/version is "latest," which track groups it belongs to, its stage, and eventually a "best mix" vote. No `src/app/song/[id]` page yet, no `songId` on `Track`/`TrackGroup` (only `CatalogEntry` has it), no voting field anywhere. Needs its own data-model design pass before building.
- [ ] **Get Latest logic** — needs a design discussion before building: by song, by track group, or a new "songgroup" concept (a track group capped to N songs, tracking the latest version)?
  - Album = track group with fixed versions. Songgroup = tracks the latest version, bounded by song count.
  - Admin process: check track group for the track tagged "latest" → check the master song folder → update the link.
  - Real use case (2026-09-27): a barebones isolated rhythm-guitar re-upload of "Magi-cali" taught a part better than the polished full demo — so a track's *purpose* (full demo / learning-practice / final mix) is a real, independent dimension from stage.
  - Scale reality: ~100 songs total, each with potentially many recordings — "Rolling Blackout" alone has 100+. Any Get Latest/Song Profile UI needs to handle a long tail of versions, not a handful.
  - Direction (2026-09-27, agreed, **do not build further logic than this yet**): purpose-tag matters more than recency. "Latest" is a query scoped *within* a purpose (e.g. "latest full demo of this song"), never a single flat pointer or `ORDER BY createdAt DESC LIMIT 1` — that would surface today's barebones practice track as "the latest," burying the actual latest full demo. "Latest" is conceptually owned by the Song, not a track group or raw catalog query.
- [ ] **API docs.** Need a reference for the API routes.
- [ ] **Temporary/scoped access.** Short-lived (~1hr) tokens for a track-group link, for external viewers (family, a promoter) who need streaming access without full access. Separate mechanism from normal auth — needs its own design pass.
- [ ] **TrackGroup `type` field** (`album | ep | single | playlist`) — not started, not in `src/types` yet.
- [ ] **`src/lib/identity.ts` extraction** — the `x-goog-authenticated-user-email` / `LOCAL_USER_EMAIL` resolution is still inlined in 10+ routes (songs, track-groups, catalog, assets, admin/sweep-drive, admin/seed-songs, admin/sync, drive/search, track-groups/[id]/notes, auth/me).

### Function-level breakdown (for the Song/Asset work above)

A. **Add New Song Record** — song folder holds the lifecycle of the song's media. CRUD ops now exist (see Done above).
B. **Add / find / assign Song Folder inside MasterSongFolder.**
C. **Add New Version** (mix, date, description) — assign song id + song folder, add media, sync media lib, add to track group, optional "mark as latest" boolean.

------------ checkpoint --------

## Domain model (target shape)

Manage: Track Groups | Firebase Admin | Assets | Tracks

- **Song** — the folder identity; name + light metadata + its own assets (lyrics, chord charts — now real, see Done above). Tracks are "of a song." One track is "latest" (like a build); one might be the "best mix."
- **Tracks** — folder, tracks, asset, and asset-association actions.
- **Assets** — shared-folder table, add assets, link to track/track group/song, manage asset types.
- **TrackxAsset** — links track ↔ asset, with link id/type metadata; kept generic so other entities (video, images) can reuse the same link table later.
- **TrackGroup**
- **TrackGroupxAsset** — links track group ↔ asset.

### Browse / Tracks page (bucket administration)
- Actions: add sub-folder, add tracks, move tracks (with a reconciliation/transaction-history process if links change), link assets (lyrics/chords) directly to tracks — now shipped, see Done above.
- Visibility: surface GCS metadata (bucket/folder/link path) in the UI.

### Notifications
Separate the auto-notify functions — over-notifying ("boy who cried wolf") means it has to become deliberate rather than automatic on every non-event. Consider queuing potential notifications for review on the admin page instead of firing immediately.

### Track Groups page
Combine the current admin page and the track groups page:
- Adding a track and adding a track group both belong in the track-group domain.
- The "Admin" table becomes more of a hub that links out to:
  a) add assets to a track group
  b) when adding a track, carry over the assets already associated with it
  c) avoid redundant Track-Group×Asset links when a Track×Asset link already exists — surface that in the UI ("Asset X is already associated with Track X")

### Admin page
Keep it, but let it become a link hub to the functions above (Tracks / Assets, analog to GCS / Drive) plus admin review/search/metadata tables. Our tables are extension tables on top of the synced tables and should tolerate breaks — the orphan cleanup/reconcile process isn't 100% ready yet.

## To discuss (not yet building)
- ** This is built and and deployed a while back unfortunately - we paused when the a server would be up 24/7...
- **Shared-folder table for Assets** — a table of watched shared folders; a Go service subscribes and syncs any doc add/edit/change into the asset table (probably landing as "unclassified" until a pattern emerges).
- **New track group as a function of Track Group** — needs a clearer proposal.

# Fresh Highlights

The application is live and in testing. Infra is almost entirely Terraform-controlled now — cloud storage buckets (~6-10) are still the one outlier; no application is deployed outside Terraform's view. A push to `main` is built and deployed automatically.

Shell script management moved to a more deliberate approach (the `runner` tool: compiled, hashed/tagged binaries instead of loose editable `.zsh` scripts, to keep plaintext vars out of the way and avoid accidental script mangling) — most of the old ad hoc scripts have been removed.

## Repo layout (this app, `apps/rollingblackoutapp/`)

```
.
├── docs
├── k8s/{base, overlays/local}
├── logs
├── mocks
├── notes
├── public/fonts
├── scripts/{deprecated, util}
├── src
│   ├── app
│   │   ├── admin/{[id], assets, catalog, songs}
│   │   ├── api/{admin, assets, audio, auth, browse, catalog, drive, songs, track-groups}
│   │   ├── browse
│   │   └── track-group/{[id], new}
│   ├── components
│   ├── lib/auth
│   └── types
└── test/drive/api/files
```

This app lives inside a larger monorepo (sibling `infra/terraform`, `packages/*` for BigQuery, Eventarc Drive-event services, a `workspace` package, etc.) — not detailed here since this file's scope is the Next.js app itself.

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # start dev server (localhost:3000)
pnpm build        # production build (output: standalone)
pnpm lint         # biome check .
pnpm format       # biome check --write .
pnpm test         # vitest run
pnpm test:watch   # vitest
```

The app is deployed as a Docker container on port 8080 (`next.config.ts` sets `output: 'standalone'`). 

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
- Notes attach at version level (per-mix commentary). Assets attach at track level — and now also at song level, inherited down to tracks for display (see Done above).

**Define once, reference everywhere.** Any string, label, or classification duplicated in more than one place is a design smell, not a style nitpick — fix the structure, don't just re-type the value somewhere else. Precedent: `tags.json`'s `color` field — a tag's color was first hardcoded as a second list inside `src/lib/tag.ts`, immediately went stale relative to `tags.json`, and got collapsed into a single `color` field read directly from the taxonomy at render time; `globals.css`'s `.tag-<color>` classes are keyed by color name (not tag name) so many tags can share one. Same shape as `src/lib/stage.ts`'s `STAGES` array being the one place the `TrackStage` enum's values are enumerated, and as `collectAssetLinks`/`applyDeltasInTx` in `src/lib/firestore.ts` being the one shared usageCount-delta implementation across `TrackGroup`/`Song`/`CatalogEntry` writes rather than three copies. When adding a new closed vocabulary or lookup table, ask where its *one* authoritative definition should live before writing the second copy.

**Entity color convention (2026-09-27).** Song = `rbyellow` (border + text; the song name gets `.text-gradient-brand`, and the shared `SongChip` component — `src/components/SongChip.tsx` — is the one place "how a song reference looks" is defined, reused on Browse and on `/track-group/[id]`'s tracklist rather than re-styled per page). Track = cyan. Page titles = `rbblue-500` ("royal blue" — note `rbblue`/`rbpurple`/`rbred` only have shades 100/300/500/700/900 defined, unlike `rbyellow`'s full 100-950 scale; referencing e.g. `rbblue-600` silently resolves to nothing). A box's border always matches its entity's color rather than each page inventing its own scheme.
**9/28 -- this is not actually convention.  the .text-gradient-brand was somthing i did for the descriptions on the track group
          (Notably - this happens all the time - Claude makes decision and and forgets a few weeks later) 
          we're working on it.
         

### Domain model — ERD (as-built, 2026-09-27)

This reflects what's actually in Firestore today — not the aspirational shape in "Domain model (target shape)" further down (that section describes `TrackxAsset`/`TrackGroupxAsset` as if they were separate link collections; **they aren't** — see the gap called out below the diagram).

**Glossary — `catalog` vs. `Track`, easy to conflate:** every row in the `catalog` collection (`CatalogEntry`) *is* an audio file, so "catalog = tracks" is tempting, but the name stays as-is deliberately — `Track` already means something else in this codebase. `CatalogEntry` = the master inventory synced straight from GCS, one row per file, independent of whether it's used anywhere. `Track` = that same file's inclusion in one specific `TrackGroup` release (embedded only, no collection of its own). One `CatalogEntry` can show up as zero, one, or many `Track`s across different track groups. Don't rename `catalog` to avoid colliding with `Track`'s meaning.

Diagram source: [`erd.mmd`](./docs/erd.mmd) — paste into [mermaid.live](https://mermaid.live) or a Mermaid preview extension to view/edit; GitHub does not auto-render a linked `.mmd` file the way it renders a fenced ` ```mermaid ` block in a `.md` file, so open it directly rather than expecting it inline here.

**Firestore reality check** (what's a real top-level collection vs. embedded):
- Top-level collections: `songs`, `catalog`, `track-groups`, `assets`.
- Subcollection: `track-groups/{id}/notes`.
- **Embedded, not their own collection**: `TRACK` lives only as `TrackGroup.tracks[]` — there is no `tracks` collection. `ASSET_LINK` lives only as `TrackGroup.assets[]`, `Track.assets[]`, `Song.assets[]`, and `CatalogEntry.assets[]` — there is no `TrackxAsset`/`TrackGroupxAsset` collection, despite the "target shape" section describing them as if there will be one.

**The one gap worth internalizing:** most of the graph above is real foreign keys (`SONG.id`, `ASSET.id`), but the two links that connect the GCS-sync world to the curated-release world — `CATALOG_ENTRY.path ↔ TRACK.path` and `TRACK.path ↔ NOTE.trackPath` — are **string equality, not schema-enforced**. Nothing stops a path from drifting (a file gets renamed/moved in GCS, a track's path gets hand-typed differently) and silently breaking the join. This is exactly why the Browse page's stage values could be wrong/stuck at `"unknown"` for GCS-synced files with no editor exposed, and why "which track groups is this song in" had to be computed by scanning every `TrackGroup.tracks[].path` rather than a direct lookup (see `trackGroupsByPath` in `src/app/browse/page.tsx`). Any future work that touches path-based joins should treat this as the load-bearing fragile point in the schema.

### Catalog sync flow

Admin triggers `POST /api/admin/sync` → lists all audio files in GCS under `config.prefix` → maps each to a `CatalogEntry` (path, song, stage, mix, title, size) → bulk-upserts into Firestore `catalog` collection via batched writes. Catalog doc IDs are Firestore auto-gen (see Done above — migrated 2026-09-27; existing docs from before that fix used `encodeURIComponent(path)`).

### Track-group lifecycle

1. Admin searches the catalog via `TrackSearch` component (client-side, lazy-loads and module-level caches the full catalog from `GET /api/catalog`)
2. Submits `POST /api/track-groups` → creates Firestore doc → calls `sendReleaseNotification` (the function is named for the *action* of releasing to the band; Gmail + optional Google Chat webhook)
3. Band views at `/track-group/[id]` — audio proxied through `GET /api/audio?path=` which streams directly from GCS (no signed URLs, private bucket)

**Author identity:** `POST /api/track-groups` reads `x-goog-authenticated-user-email` header (set by Cloud Run / IAP) or falls back to `LOCAL_USER_EMAIL` env var. The same chain is inlined in five other routes — `src/lib/identity.ts` extraction is the natural next refactor (see Open above).

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

Stage badge colors are defined as CSS classes in `globals.css` (`@layer components`): `.stage-writing`, `.stage-tracking`, `.stage-mixing`, `.stage-mastering`, `.stage-unknown` (plus `.stage-ideation`, `.stage-morphing`, `.stage-overdubbing`, `.stage-scheduled`, `.stage-released`). Background variants use the `-bg` suffix (e.g. `.stage-mixing-bg`). Use `stageClass(stage)` / `stageBgClass(stage)` from `src/lib/stage.ts` instead of hardcoded Tailwind color strings. Never re-define `STAGE_COLORS` maps in components.

### Assets entity

Top-level Firestore collection `assets`. Document/link records referenceable from any other entity — now `TrackGroup`, `Track`, `Song`, and `CatalogEntry` all embed `AssetLink[]` (see Done above for the Song/CatalogEntry addition).

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

type AssetLink = {
  linkId: string
  assetId: string                // Asset.id — the real FK
  linkType?: string
  addedAt: string; addedBy: string
}
```

- For `type: 'drive'`, the Google doc-kind (doc/sheet/slide) is inferred from URL path (`/document/`, `/spreadsheets/`, `/presentation/`) — not stored separately.
- `usageCount` deltas are applied transactionally whenever `TrackGroup.assets`/`Track.assets` (via `updateTrackGroup`) or `Song.assets`/`CatalogEntry.assets` (via `updateSong`/`updateCatalogEntry`) change — shared logic in `collectAssetLinks`/`applyDeltasInTx`/`diffCounts`, `src/lib/firestore.ts`. `deleteAsset` strips the stale link from all four embed points before deleting the `Asset` doc (best-effort, errors logged not thrown).
- A track's *effective* asset list (own + inherited from its song) is `effectiveAssets()` in `src/lib/asset.ts` — inherited chips are read-only, not removable from the track.
- `createdBy` / `updatedBy` use the same `x-goog-authenticated-user-email` / `LOCAL_USER_EMAIL` resolution as `POST /api/track-groups`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
