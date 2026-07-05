# Video Deprecation Boundary

**Author:** Fable (senior architecture review), 2026-07-06
**Status:** binding for the July 2026 TestFlight/private-beta prep
**Companion docs:** `FABLE_CODE_CLEANUP_AUDIT_REPORT.md`, `FABLE_SAFE_CLEANUP_PATCH_PLAN.md`

## Product direction (restated)

Video is deprecated as a **user-facing** feature. The **backend video pipeline stays** —
existing generations, storage artifacts, legacy video decks, public share links, and
admin/support workflows depend on it. Hiding UI is cheap and reversible; deleting pipeline
code is neither. This doc draws the exact line.

Every claim below was verified directly in source on 2026-07-06 (file:line given), not
inferred from docs.

## The line, surface by surface

### HIDE (this pass — the only live conflict with product direction)

| Surface | Where | Why safe |
|---|---|---|
| "Video" tile in the new-deck lane picker | `frontend/src/components/generate/steps/ProductLaneStep.tsx:50-55` (`allTiles`) | This is the **single remaining entry point** by which a normal user can create a new video deck. Both routed generate pages share this one component: classic `GeneratePG.tsx:461-463` (via the thin `Generate.tsx` wrapper) and glassy `GenerateGO.tsx:1023-1026`, both with `variant='all'`. Appending to an *existing* video deck never renders this step (lane is locked and skipped — `GenerateGO.tsx:215`), so hiding the tile cannot break legacy-deck appends. Gate behind a module flag, not deletion. |

### KEEP — user-facing but legacy-load-bearing (do not remove, do not re-expose)

| Surface | Where | Why it stays |
|---|---|---|
| Video-deck playback in deck views | `DeckView.tsx` / `DeckViewPG.tsx` (`isVideoDeck` branches, e.g. DeckViewPG:840-955) | Users with legacy video decks must still be able to watch them. Note `isVideoDeck = !isCardDeck && !isTextDeck` — video is the **fallback** deck type (DeckView.tsx:353, DeckViewPG.tsx:499). |
| Full-screen player route | `/deck/:id/word/:wordId` → `pages/VideoPlayer.tsx` (App.tsx:210) | Already **deep-link-only**: zero inbound links exist in src (only VideoPlayer builds its own prev/next URLs, VideoPlayer.tsx:87). Bookmarks/history keep working. |
| Video study mode routes | `/study/video` → `Study.tsx` / `StudyPG.tsx` (App.tsx:237, 259) | Already **orphaned from nav**: `StudyModeSelector.tsx:26` hides video ("Video is discontinued") and no other link exists. Routes stay for deep links. |
| Public share pages | `pages/SharePage.tsx:87-90` (`/share/:shareId`, `/v/:shareId`) | Shared video links are outward-facing and must not 404 or go blank. |
| Admin video surfaces | `components/admin/WordDetailPanel.tsx:140-162`, `pages/admin/ObservabilityWordDetail.tsx`, `pages/admin/Profiles.tsx` (`video_mode` dropdown incl. Ken Burns via `components/settings/fieldConfigs.ts:125`) | Admin/support needs to inspect and reproduce video artifacts. Ken Burns as an admin profile option is admin-facing, not user-facing — it stays. |
| Video lane label key + append flow | `GenerateGO.tsx:77,200-216`, `GeneratePG.tsx` equivalents; `generate.productLane.video.*` i18n keys | Existing video decks still show their lane label and accept appended words (submit straight from words, `GenerateGO.tsx:438`). Keys also needed if the flag flips back. |

### KEEP — backend pipeline (wholesale)

| Component | Where | Notes |
|---|---|---|
| Video engine + adapters | `cloud_engines/video_engine/` (ken_burns, kling, ltx, ltx_runpod, ltx_selfhosted; `router.py`, `pod_manager.py`) | Code-frozen since 2026-04-30. Frozen ≠ dead: it serves retries/repairs of legacy content and any internal workflow. |
| Assembly + bookend engines | `cloud_engines/assembly_engine/`, `cloud_engines/bookend_engine/` | Video-era but referenced by the deployed image (Dockerfile.cloud installs ffmpeg + Noto fonts specifically for them). |
| Suno bake-in, publishing | `src/services/suno_bakein.py`, `src/services/publishing.py` | publishing.py serves **all** artifact uploads, not just video — shared with active flows. |
| Orchestration video paths | `src/orchestration/video_dispatcher.py`, video branches in `src/pipeline.py`, `src/cloud_dispatcher.py` | Interwoven with the card/music state machine; not separable without a real pipeline refactor (explicitly out of scope). |

### DO NOT TOUCH — shared infrastructure that only *looks* video-scoped

- **The `videos` Supabase storage bucket is shared with the active card flow.**
  `src/orchestration/card_worker.py:710-783` uploads card PNGs to the `videos` bucket and
  records `{"bucket": "videos"}` in metadata. Any storage-level "video cleanup" (bucket
  deletion, lifecycle rules, mass pruning) would corrupt live card generation. Rename/migration
  is a schema-adjacent later-pass decision, not cleanup.
- **`start_cloud.py:66-89` hard-requires `POD_URL` / `POD_AUTH_TOKEN` (LTX pod) at boot.**
  The card/music worker will refuse to start if these video-era env vars are unset in Railway.
  Do not "clean up" these env vars from the deployment, and do not casually relax the gate —
  loosening a fail-fast check is a behavior change to the production worker. Flagged as a
  deliberate later-pass item in the audit report.
- **`word` rows carry video columns** (`video_url`, `video_url_b`, `thumbnail_url_b`,
  `suno_task_id`, …) selected by active queries (`hooks/useStudySession.ts:192`,
  `games/shared/useGameDeck.ts:34-37`, `lib/cardFailureClassification.ts:49`). No column
  removal; Supabase schema changes are out of scope absent a proven launch blocker.

### Explicitly a NON-ISSUE (checked, closed)

- **Local destructive FastAPI routes in production:** the cloud image never copies the FastAPI
  dev server (`Dockerfile.cloud:37-39` — "main.py is NOT copied"), bakes `ENV STORAGE_MODE=cloud`
  (line 47), and `src/app.py:88` only mounts DAW routers when `STORAGE_MODE != "cloud"`.
  `start_cloud.py` serves a health endpoint only. The `STORAGE_MODE` default of `"local"`
  (`src/storage.py:20`) is irrelevant inside the image.
- **`engines/` vs `cloud_engines/` duplication:** no `engines/` directory exists. There is one
  engine tree; the source-of-truth concern is moot.

## Rollback

The single HIDE change is a boolean flag flip (`VIDEO_LANE_ENABLED`) in one module, landed as
its own commit. Reverting the commit — or flipping the flag — restores the video lane tile in
both skins. No data, schema, routes, or backend behavior change in this pass.

## What would change this boundary (later-pass triggers)

1. A product decision to *fully* retire legacy video decks → then remove `/study/video`
   routes, `Study.tsx`/`StudyPG.tsx`, VideoPlayer, deck-view video branches, and the
   generate video-lane steps (vibe/art/niveau/genre, `GenerateGO.tsx:1062-1200`) which become
   unreachable-for-new-users once the tile is hidden.
2. Confirmation that no legacy deck repair will ever be run → then decouple `start_cloud.py`
   from POD_* env vars and consider archiving `video_engine` adapters.
3. A storage migration plan → then untangle card PNGs from the `videos` bucket first.
