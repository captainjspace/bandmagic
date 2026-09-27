# CLAUDE.md

## Working Style
(TBD)


## Architecture Invariants section near the top of CLAUDE.md, above build/test instructions.

- Song "folders" are VIRTUAL groupings derived from metadata, not real storage directories. Never assume a filesystem/GCS folder hierarchy exists for songs.
- Folder/song matching must be fuzzy/normalized (case- and punctuation-insensitive), never exact-string only.

## Tooling section (already decided — do not re-evaluate)

- merge into any existing Commands/Scripts section if presen 
- Lint/format: Biome (not ESLint/Prettier). Run `biome check --write .` before commits.
- Tests: Vitest. Run `vitest run` after any change to entity/matching/seed logic.

## Testing/Verification'
create one after Tooling.

## Data Seeding Checklist

Before declaring any classification/matching feature done: 
(1) confirm the source collection is actually seeded and non-empty, 
(2) print counts per bucket, 
(3) confirm zero unexpected 'Unclassified' rows.

## Environment Constraints

- Commands needing sudo, SSH packet capture (tcpdump), or secret generation will be blocked 
  >> output the exact command for me to run manually instead of attempting it.
- The microk8s node has a known containerd/CDI bug blocking image pulls. Default to local Docker/Podman for container work unless I say otherwise.


## Exploration Budget

- Before broad codebase exploration, state your model of the data/storage layer in 2-3 sentences and ask me to confirm. 
- Prefer a Task agent with a narrow question over many sequential Read/Grep calls.

## Git workflow — ⚠️ main is hot
A push to `main` is auto-built and deployed to production Cloud Run (`.github/workflows/deploy.yaml`). There is no staging gate — `main` going green on GitHub Actions means it's live for the band.

- Never commit or push directly to `main`. Do all work on a feature branch (`git checkout -b <name>`) and open a PR for review before merging.
- Local commits on a branch are safe to make freely; pushing that branch to `origin` is safe (doesn't trigger deploy — only `main` and `v*` tags do, per the workflow's `on.push` trigger). Merging the PR to `main` is the actual "go live" step — treat it accordingly.
- Claude creates feature branches, commits, pushes, and opens PRs freely. Claude does **not** merge PRs to `main` — the user always does that merge themselves, since it's the production deploy trigger and they own that call.
- Before merging: run `pnpm build` and, if touching Docker/deploy-relevant files, `docker build .` locally to confirm the container still builds clean.

# Next Actions:

Start a new feature branch.
- Desktop Application: the main screen should scroll under the header with "always available links"

## Done

- [x] **1 — Browse Page organizing principle.** Song = folder with many tracks (1 "latest" by date). `src/app/browse/page.tsx` groups tracks by song into collapsible, default-open sections.
- [x] **2 — Adding Media.** `SongPicker.tsx` (find or create a song folder) + `AddTrackModal.tsx` (upload new mix, or attach an existing unclassified catalog entry), wired into the header's "+ Track" button.
- [x] **5 — Adding Tracks creates the song folder lazily.** `POST /api/catalog` generates `song.folderPrefix` on first upload if unset, then adds the track. (Was still unchecked on this list — code is ahead of the doc.)
- [x] **6 — MasterSongFolder Firestore table.** `Song` type (`src/types/index.ts`) has PK, `folderPrefix`, name, audit columns, author. `getSongs`/`getSong`/`updateSong`/`seedSongs` in `src/lib/firestore.ts`.
- [x] **Track reordering.** Move-up/move-down buttons on both the Edit (`src/app/admin/[id]/page.tsx`) and New (`src/app/track-group/new/page.tsx`) track-group pages; edit-page version persists immediately via `PUT /api/track-groups/[id]`.
- [x] **Mobile song-name clipping (Browse page).** Row now wraps below `sm:` so the name gets its own full-width line instead of being squeezed by fixed-width siblings.
- [x] **Track ↔ track-group cross-reference (Browse page).** Each track row and each song-folder header now shows how many track groups reference it (hover for the titles). Purely derived client-side from `GET /api/track-groups` joined against catalog paths — no new endpoint or schema change. `src/app/browse/page.tsx`.
- [x] **`tags[]` replaces the scalar `stage` badge on the Browse page (2026-09-27).** `CatalogEntry.tags` and `Song.tags` (new optional `string[]` fields) are editable via `+ tag` / `tag ×` chips, persisted through `PATCH /api/catalog/[id]` and the new `PATCH /api/songs/[id]` (tags-only). Track rows also show read-only **inherited status chips**: distinct non-`"unknown"` `Track.stage` values already set on any track group this file belongs to (reuses the same path-join as the cross-reference above, so e.g. a file marked `mixing` inside a track group now shows that on the Browse page too, instead of the catalog's own stale/unclassified `stage`). `tags.json` at the repo root is the reference vocabulary feeding the `<datalist>` suggestions.
- [x] **Tag color is declared in `tags.json`, not duplicated in code (2026-09-27, revised same day).** First pass hardcoded a `COLORED` name-set in `src/lib/tag.ts` — flagged immediately as the same "which tags are special" list existing redundantly in three places (`tags.json`, `tag.ts`, `globals.css`). Fixed: each tag entry in `tags.json` can carry an optional `"color"` field (e.g. `"sky"`, `"indigo"`); `tagClass`/`tagBgClass` in `src/lib/tag.ts` read it directly from the taxonomy (`entityType` param selects which top-level section, e.g. `"track"` vs `"song"`, since tags are namespaced per entity type). `globals.css`'s `.tag-<color>` classes are keyed by color name, not tag name, so multiple tags can share one — CSS still has to define what each color *looks like* (Tailwind can't do that from runtime JSON), but "which tag gets which color" now lives in exactly one place. `tags.json`'s `_meta` also now documents that every field is optional and omitting it (rather than writing `false`/empty explicitly) is the intended, blessed shorthand.
- [x] **`stageFromPath` fallback changed from `"unknown"` to `""` (2026-09-27).** `src/app/api/admin/sync/route.ts`. The literal string `"unknown"` was truthy and silently defeated every `.filter(Boolean)` aggregation in the app (including the TrackGroups homepage list); `""` is falsy and gets excluded naturally, no aggregation code needed to change. Re-running "↻ Sync catalog" retroactively cleans up existing `"unknown"` entries. Classifier itself is still weak — see the open item below.
- [x] **Tags Phase 2 — `tags[]` extended to embedded `Track` (2026-09-27).** `Track.tags?: string[]` added alongside `CatalogEntry.tags`/`Song.tags`. Seeded from the picked `CatalogEntry.tags` at `TrackSearch` selection time (`admin/[id]/page.tsx`, `track-group/new/page.tsx`), then edited independently per track group — same snapshot-then-diverge pattern `title`/`stage` already used. `TagChips` extracted to a shared component (`src/components/TagChips.tsx`, 4+ call sites now) instead of staying duplicated in `browse/page.tsx`. The old `STAGES`-driven `<select>` per track row is gone from both editors.
- [x] **Regression found and fixed: Phase 2 made pre-existing stage data invisible (2026-09-27, same day).** Replacing the stage display with a tags-only display broke every track group created *before* `tags` existed — they have real `stage` values (`mixing`, `tracking`, etc.) but empty `tags`, so the homepage, `/track-group/[id]`, and the `admin/[id]` editor all went blank where a badge used to be. Caught via user screenshots, not caught by `pnpm build` (a type-check can't see this class of bug — this is exactly what CLAUDE.md's own Data Seeding Checklist warns about: verify against real/existing data, not just types). Fixed via a small multi-agent workflow (implement fallback in parallel across 5 files + an oversight agent that reviewed every diff and re-ran build/lint) — `effectiveTags(tags, stage)` in `src/lib/tag.ts` falls back to `[stage]` when `tags` is empty and `stage` isn't `"unknown"`. Read-only pages (`src/app/page.tsx`, `/track-group/[id]`, `TrackSearch` dropdown) use it directly. The two editors (`admin/[id]`, `browse/page.tsx`) deliberately do **not** feed the fallback into `TagChips`' editable array — that would create an un-removable chip, since removing it wouldn't clear the underlying `stage` field. Instead they render a separate, visually distinct (dashed border, muted, no `×`) read-only legacy chip alongside the editor.
- [x] **Chip provenance labels added (2026-09-27).** Per explicit feedback ("better to have more data visible than less... label the data"): every chip group across all 5 pages now has a visible `"Tag Chips:"` or `"Stage Chips:"` text label (not just color/tooltip) — real tags vs. legacy-stage-standing-in-for-a-tag are never silently merged into one unlabeled list. `track-group/[id]` got a small local `LabeledTags` component for its two call sites (tracklist row + active track panel) rather than duplicating the branch logic. One deliberate exception: `TrackSearch`'s single-line dropdown row keeps the distinction via a `title` tooltip only (`"Tag Chips"` / `"Stage Chips (legacy...)"`) rather than inline text, since the row is already tight (title + path already truncate) — flagged here in case that's not acceptable and needs revisiting.
- [x] **Edit Songs / Edit Catalog admin screens (2026-09-27).** New `src/app/admin/songs/page.tsx` and `src/app/admin/catalog/page.tsx` — every field on `Song` and `CatalogEntry` shown with a label, editable inline (copies `admin/assets/page.tsx`'s list + inline-edit-toggle pattern, not a separate per-record page). Fully closes the old "6a — Song CRUD is create+read only" gap: `GET`/`PATCH /api/songs/[id]` widened from tags-only to every field (`name`/`aliases`/`folderPrefix`/`latestPath`/`tags`); new `GET`/`PATCH /api/catalog/[id]` widened to also accept `title`/`mix`, plus a new `getCatalogEntry` in `src/lib/firestore.ts` (was missing — only bulk `getCatalog()` existed). Deliberately **not** editable: `CatalogEntry.path` (the fragile join key — see the ERD note) and `stage` (superseded by tags, shown read-only so nothing's invisible). No `DELETE` for either entity yet — unsafe for `CatalogEntry` specifically until something reconciles a deletion against `TrackGroup.tracks[]` referencing its path by string, the way `deleteAsset` already does for assets. Two admin-hub cards added linking to both. **Bug caught in this pass, not by `pnpm build`:** the three new `fetch` calls in `admin/catalog/page.tsx` initially built URLs as `` `/api/catalog/${entry.id}` `` — but catalog doc IDs are `encodeURIComponent(path)` and already contain a literal `%2F`, so every other call site in the app double-encodes (`encodeURIComponent(entry.id)`) before building the URL; skipping that silently 404s on any path containing `/` (i.e. nearly all of them). Caught by curl-testing the real route, not by types. Fixed; verified with a properly double-encoded request.
- [x] **Real data bug found + Song/CatalogEntry IDs switched to Firestore auto-gen (2026-09-27).** The same double-encoding class of bug above was *also* present in the brand-new `admin/songs/page.tsx` (missed when fixing the catalog page) — real duplicate/malformed `Song` docs resulted in production ("Bad Booze" / "Bad%20Booze", "Born of the Earth" / "Born%20of%20the%20Earth"; the latter is missing its `name` field entirely, which is why `getSongs()`'s `.orderBy("name")` silently hid it from every list in the app — Firestore excludes docs missing an ordered-on field). Found via the user reading Firestore directly, not via any test. Fixed the immediate bug (added the missing `encodeURIComponent`), but the user correctly pushed further: the *root* defect is that `Song.id`/`CatalogEntry.id` were derived from `encodeURIComponent(name)`/`encodeURIComponent(path)` — a mutable, encoding-sensitive display field — instead of an opaque identifier. Switched both to Firestore's native auto-gen ID (`.doc()` with no argument) for all *new* docs going forward. The one real risk: `seedSongs`/`syncCatalog` were idempotent only because the ID was predictable from name/path; replaced that with an upfront full-collection read building a `name`→ref / `path`→ref map, so existing entries still update in place instead of duplicating. Verified against real data: creating the same song name twice now updates one doc (confirmed via returned id staying identical across both calls); running "↻ Sync catalog" twice back-to-back left the catalog count unchanged at 44 (the one thing that absolutely could not regress). No migration of already-existing derived-ID docs — they keep working fine as opaque strings, nothing forces new-format consistency. The two malformed docs above, plus one `"ZZZ Autogen ID Test"` song created during this verification, are manual Firebase-console cleanup, not automated (no `DELETE` route exists, and per-user preference, one-off data fixes go through the console or documented scripts against the API — not throwaway direct-Firestore code).

## Partially done — needs a follow-up pass

- [ ] **3 — Sync consolidation.** `AppHeader.tsx` has one "↻ Sync" button (good — sync is out of the admin page), but it's a single combined action rather than the two described (storage catalog vs. asset catalog) — confirm `/api/admin/sync` actually covers both, or split visibly if not.
- [ ] **3a — Auto-save on blur.** Not implemented anywhere (no `onBlur` handlers found). Still open despite item 3 being checked off above.
- [ ] **`stageFromPath` still can't classify most real GCS paths.** The *symptom* is fixed (2026-09-27: `src/app/api/admin/sync/route.ts` now falls back to `""` instead of the literal string `"unknown"` — a real fix, not cosmetic, since `""` is falsy and gets naturally excluded by every existing `.filter(Boolean)` aggregation, e.g. the TrackGroups homepage list, whereas `"unknown"` was a truthy string that polluted those aggregations too; re-running "↻ Sync catalog" retroactively cleans up old entries). The underlying *cause* is still open: `stageFromPath` (`src/lib/gcs.ts`) still fails to match most real GCS path conventions — it just fails quietly now instead of mislabeling. Low priority now that `stage` is deprecated in favor of tags (see below) for display purposes.

## Open

- [ ] **Migrate existing Song docs to auto-gen IDs.** 2026-09-27's fix only changed *generation going forward* — `seedSongs`/`syncCatalog` now use Firestore auto-gen IDs for new docs, but every `Song` doc created before that fix (the whole week's worth of real usage, not just the original `songlist.txt` seed batch) still has the old `encodeURIComponent(name)` derived ID. Deliberately deferred ("let's ship and go back... to keep it clean") rather than bundled into the ID-generation fix. Needs its own careful pass when picked up: create a new auto-gen-id doc per existing song (same data), repoint every `CatalogEntry.songId` that references the old id, then remove the old doc. Two open decisions from that discussion, unresolved: (a) whether to add a real `DELETE /api/songs/[id]` route so the whole migration can go through documented scripts calling the API (vs. create+repoint via API, delete old docs manually in the Firebase console — matching how the 3 stray docs from this session are being handled), (b) confirmed *not* wanted: fetching GCS object metadata as an alternative key — `CatalogEntry.path` (already a stored field) is sufficient, no new data source needed. `CatalogEntry` docs don't need this migration — nothing found duplicating there, and the fix already covers new ones correctly.
- [ ] **4 — Manual notify action.** Notify currently only fires on create (`POST /api/track-groups` → `sendReleaseNotification`); `PUT` (update) never notifies, so there's no way to tell the band about edits to an already-live track group. On hold — decided this is a plain action (one endpoint + one button, id in, notification out), **not** a persisted `notifiable` field on `TrackGroup` — no state to track.
- [ ] **Song Profile page** — the bigger one. Per-song view: its tracks, its assets, which track/version is "latest," which track groups (e.g. albums) it belongs to, what stage the song itself is in, and eventually which one the band voted "best mix." None of this exists yet — no `src/app/song/[id]` page, no `GET/PUT /api/songs/[id]` route, no `songId` on `Track`/`TrackGroup` (only `CatalogEntry` has it), and no voting/rating field anywhere. Needs its own data-model design pass before building. (Track ↔ track-group membership — "which tracklist(s) is this track in" — now shown on the Browse page, see Done above; the Song Profile page can reuse the same derived join.)
- [ ] **Get Latest logic** — needs a design discussion before building: by song, by track group, or a new "songgroup" concept (a track group capped to N songs, used to track the latest version)?
  - Album = track group with fixed versions. Songgroup = tracks the latest version, bounded by song count.
  - Admin process: check track group for the track tagged "latest" → check the master song folder → update the link.
  - Related: if a lyrics/chords asset is attached to one track, it's really song-owned — should propagate to all tracks of that song. Write up concrete use cases before implementing.
  - Real use case (2026-09-27): re-uploaded "Magi-cali" as just an isolated rhythm-guitar track, deliberately barebones instead of a full demo — band feedback showed a stripped-down track + chord chart teaches a part better than a polished mix. So "latest" isn't one pointer per song — a track's *purpose* (full demo vs. isolated/learning track vs. eventual final mix) is a real, independent dimension from stage. Consider whether "latest" needs to be scoped per-purpose rather than a single per-song pointer.
  - Scale reality: Song is confirmed as purely an organizing/virtual grouping (not real storage) — expect ~100 songs total, each with potentially many recordings/versions. The eponymous "Rolling Blackout" song alone already has 100+ recordings. Any "Get Latest" or Song Profile UI needs to handle a song with a long tail of versions, not just a handful.
  - Direction (2026-09-27, agreed, **do not build further logic than this yet**): purpose-tag matters more than recency. A track gets a purpose tag (e.g. full demo / learning-practice / final mix); recency can seed a sensible default tag on upload, but the tag itself is what's explicit and authoritative, not a timestamp. "Latest" is a query scoped *within* a purpose (e.g. "latest full demo of this song"), never a single flat pointer — the naive `SELECT track FROM catalog ORDER BY createdAt DESC LIMIT 1` is explicitly the wrong reference point, because it would surface today's barebones Magi-cali practice track as "the latest," burying the actual latest full demo. "Latest" is conceptually owned by the Song (answers "what's my current X for this song"), not by a track group or a raw catalog query. This is scoping only — stop here until a real design pass.
- [ ] **API docs.** Need a reference/man page for the API routes.
- [ ] **Temporary/scoped access.** Short-lived (~1hr) tokens for a track-group link, for external viewers (family, a promoter) who need streaming access without full access. Separate mechanism from normal auth — needs its own design pass.
- [ ] **TrackGroup `type` field** (`album | ep | single | playlist`) — not started, not in `src/types` yet.
- [ ] **`src/lib/identity.ts` extraction** — the `x-goog-authenticated-user-email` / `LOCAL_USER_EMAIL` resolution is still inlined in 10+ routes (songs, track-groups, catalog, assets, admin/sweep-drive, admin/seed-songs, admin/sync, drive/search, track-groups/[id]/notes, auth/me).
- [ ] **ERD diagram** — document the domain model, and where each entity's CRUD API + GUI lives.

### Function-level breakdown (for the Song/Asset work above)

A. **Add New Song Record** — song folder holds the lifecycle of the song's media. Needs CRUD ops (see "Song CRUD" gap above).
B. **Add / find / assign Song Folder inside MasterSongFolder.**
C. **Add New Version** (mix, date, description) — assign song id + song folder, add media, sync media lib, add to track group, optional "mark as latest" boolean.

------------ checkpoint --------

## Domain model (target shape)

Manage: Track Groups | Firebase Admin | Assets | Tracks

- **Song** — the folder identity; name + light metadata. Tracks are "of a song." One track is "latest" (like a build); one might be the "best mix."
- **Tracks** — folder, tracks, asset, and asset-association actions.
- **Assets** — shared-folder table, add assets, link to track/track group, manage asset types.
- **TrackxAsset** — links track ↔ asset, with link id/type metadata; kept generic so other entities (video, images) can reuse the same link table later.
- **TrackGroup**
- **TrackGroupxAsset** — links track group ↔ asset.

### Browse / Tracks page (bucket administration)
- Actions: add sub-folder, add tracks, move tracks (with a reconciliation/transaction-history process if links change), link assets (lyrics/chords) directly to tracks.
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

- **Shared-folder table for Assets** — a table of watched shared folders; a Go service subscribes and syncs any doc add/edit/change into the asset table (probably landing as "unclassified" until a pattern emerges).
- **New track group as a function of Track Group** — needs a clearer proposal.

# Fresh Highlights.

The application is live and is testing - congratulations!
We have a few challanging tackles to make her but otherwise in execllent shape.

We have f solid bass of terraform the envrionment is almsot entirely controlled by tf now - clsoud storage is still a bit an outlier but we're talking  about maybe 6-10 buckets - there are no application deployed outside of terraforms view
Further the application is proven fully git ready and a push to main will be built and deployed. 

I have removed most the zsh scripts we don't need i have resolved toa  more strategic way of managing shell scripts.  And example of this is the runner.
It's very simple and I stumbled upon - i am compacting into hex and have ligthweight c program that can compiled with the herds dated, tagged etc.  it get the open text vars out the way and stop inadverents mess ups in scripts.





.
├── apps/rollingblackoutapp
│   ├── k8s
│   │   ├── base
│   │   └── overlays/local
│   ├── logs
│   ├── mocks
│   ├── notes
│   ├── public/fonts
│   ├── scripts
│   │   ├── deprecated
│   │   └── util
│   ├── src
│   │   ├── app
│   │   │   ├── admin
│   │   │   │   ├── [id]
│   │   │   │   └── assets
│   │   │   ├── api
│   │   │   │   ├── admin
│   │   │   │   │   ├── sweep-drive
│   │   │   │   │   └── sync
│   │   │   │   ├── assets/[id]
│   │   │   │   ├── audio
│   │   │   │   ├── auth/me
│   │   │   │   ├── browse
│   │   │   │   ├── catalog
│   │   │   │   ├── drive/search
│   │   │   │   └── track-groups/[id]/notes
│   │   │   ├── browse
│   │   │   └── track-group/[id]
│   │   ├── components
│   │   ├── lib/auth
│   │   └── types
│   └── test/drive/api/files
├── config
├── infra
│   ├── terraform
│   │   ├── modules
│   │   ├── plan_output
│   │   │   ├── production
│   │   │   └── rollingblackout_test_env
│   │   └── terraform.tfstate.d
│   │       ├── production
│   │       └── test
│   └── tf-import
└── packages
    ├── bigquery/audio_file_analysis
    │   ├── data
    │   └── src
    │       ├── shell
    │       └── sql
    ├── blessed
    ├── encrypto
    ├── eventarc/drive_events
    │   ├── scripts
    │   └── services
    │       ├── controller
    │       ├── receiver
    │       └── util
    └── workspace
        ├── bin
        └── src

77 directories



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

**Define once, reference everywhere.** Any string, label, or classification duplicated in more than one place is a design smell, not a style nitpick — fix the structure, don't just re-type the value somewhere else. Precedent: `tags.json`'s `color` field (2026-09-27) — a tag's color was first hardcoded as a second list inside `src/lib/tag.ts`, immediately went stale relative to `tags.json`, and got collapsed into a single `color` field read directly from the taxonomy at render time; `globals.css`'s `.tag-<color>` classes are keyed by color name (not tag name) so many tags can share one. Same shape as `src/lib/stage.ts`'s `STAGES` array being the one place the `TrackStage` enum's values are enumerated. When adding a new closed vocabulary or lookup table, ask where its *one* authoritative definition should live before writing the second copy.

### Domain model — ERD (as-built, 2026-09-27)

This reflects what's actually in Firestore today — not the aspirational shape in "Domain model (target shape)" further down (that section describes `TrackxAsset`/`TrackGroupxAsset` as if they were separate link collections; **they aren't** — see the gap called out below the diagram).

**Glossary — `catalog` vs. `Track`, easy to conflate:** every row in the `catalog` collection (`CatalogEntry`) *is* an audio file, so "catalog = tracks" is tempting, but the name stays as-is deliberately — `Track` already means something else in this codebase. `CatalogEntry` = the master inventory synced straight from GCS, one row per file, independent of whether it's used anywhere. `Track` = that same file's inclusion in one specific `TrackGroup` release (embedded only, no collection of its own). One `CatalogEntry` can show up as zero, one, or many `Track`s across different track groups. Don't rename `catalog` to avoid colliding with `Track`'s meaning.

Diagram source: [`erd.mmd`](./docs/erd.mmd) — paste into [mermaid.live](https://mermaid.live) or a Mermaid preview extension to view/edit; GitHub does not auto-render a linked `.mmd` file the way it renders a fenced ` ```mermaid ` block in a `.md` file, so open it directly rather than expecting it inline here.

**Firestore reality check** (what's a real top-level collection vs. embedded):
- Top-level collections: `songs`, `catalog`, `track-groups`, `assets`.
- Subcollection: `track-groups/{id}/notes`.
- **Embedded, not their own collection**: `TRACK` lives only as `TrackGroup.tracks[]` — there is no `tracks` collection. `ASSET_LINK` lives only as `TrackGroup.assets[]` and each `Track.assets[]` — there is no `TrackxAsset`/`TrackGroupxAsset` collection, despite the "target shape" section describing them as if there will be one.

**The one gap worth internalizing:** most of the graph above is real foreign keys (`SONG.id`, `ASSET.id`), but the two links that connect the GCS-sync world to the curated-release world — `CATALOG_ENTRY.path ↔ TRACK.path` and `TRACK.path ↔ NOTE.trackPath` — are **string equality, not schema-enforced**. Nothing stops a path from drifting (a file gets renamed/moved in GCS, a track's path gets hand-typed differently) and silently breaking the join. This is exactly why the Browse page's stage values could be wrong/stuck at `"unknown"` for GCS-synced files with no editor exposed, and why "which track groups is this song in" had to be computed by scanning every `TrackGroup.tracks[].path` rather than a direct lookup (see `trackGroupsByPath` in `src/app/browse/page.tsx`). Any future work that touches path-based joins should treat this as the load-bearing fragile point in the schema.

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

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
