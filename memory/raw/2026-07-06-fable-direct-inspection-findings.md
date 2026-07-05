# Raw capture — Fable direct inspection, 2026-07-06 cleanup pass

First-hand verified facts (before Codex packet review). Each checked directly in source.

## Video user-facing surfaces (frontend)
- ONLY live entry point for creating NEW video decks: the `video` tile in
  `frontend/src/components/generate/steps/ProductLaneStep.tsx` (`allTiles`, variant `'all'`).
  Both routed generate pages share it: GeneratePG.tsx:461-463 (classic; `Generate.tsx` is a
  thin wrapper around GeneratePG) and GenerateGO.tsx:1023-1026 (glassy).
- StudyModeSelector.tsx:26 — video already hidden from the selector ("Video is discontinued").
- `/study/video` routes (App.tsx:237, 259) — zero inbound links anywhere in src; deep-link only.
- VideoPlayer route `/deck/:id/word/:wordId` (App.tsx:210) — zero inbound links (only
  VideoPlayer itself builds prev/next URLs). Deep-link only.
- DeckView.tsx / DeckViewPG.tsx — video playback gated by `isVideoDeck = !isCardDeck && !isTextDeck`
  (fallback deck type!); legacy-deck playback, keep.
- SharePage.tsx renders `video_url` for public shares — keep.
- Music.tsx / MusicPG.tsx — zero video references.
- Nav layouts (components/layout/*) — zero video references; nav already clean.
- Admin: WordDetailPanel, ObservabilityWordDetail, Profiles (`video_mode` dropdown incl.
  ken_burns via components/settings/fieldConfigs.ts:125) — admin support, keep.
- GenerateGO video-lane steps 4–7 (vibe/art/niveau/genre, lines ~1062-1200) reachable only via
  CHOOSE_PATH 'custom' on the video lane; appending to an existing video deck skips the lane
  step and submits straight from words (GenerateGO.tsx:215, 438). After hiding the tile these
  steps become unreachable for everyone — candidates for a LATER removal pass, not now.

## Dead-code cluster (frontend, pending Codex cross-check)
- `components/stages/*` (8 files: ConceptPanel, SongPanel, ImagePanel, VideoPanel, AssemblyPanel,
  BookendPanel, TrimEditor, shared) — no importers outside the cluster. Old DAW stage UI.
- `components/settings/StageSettings.tsx` — no importers.
- `pages/Settings.tsx` — no importers, not in routeImports.ts, no route in App.tsx.
- `src/api.ts` (local-DAW HTTP client) is NOT dead: SettingsControls.controls.tsx (used by live
  admin Profiles via StageSettingsPanel) imports getLoras/getVoices/getSupabaseVoices from it.
  Keep api.ts; unused-export pruning is later-pass. NOTE: those endpoints are local-DAW routes —
  admin Profiles voice/LoRA dropdowns may 404 in production (inventory note, not this pass).

## Backend boundary
- Cloud container (Dockerfile.cloud) never copies main.py/uvicorn; runs start_cloud.py (health
  HTTP + job_runner only) and bakes ENV STORAGE_MODE=cloud. src/app.py gates DAW routers behind
  STORAGE_MODE != "cloud" (app.py:88); STORAGE_MODE defaults to "local" (storage.py:20) but the
  cloud image overrides it. => "destructive local FastAPI routes in production" is a NON-ISSUE.
- start_cloud.py:66-89 hard-requires POD_URL/POD_AUTH_TOKEN (LTX pod) at boot even though video
  is deprecated — footgun: unsetting them kills the card/music worker. Document, don't change.
- card_worker.py:710-783 uploads card PNGs to the `videos` storage bucket — the bucket is SHARED
  with active card flow. Storage-level video cleanup would break card generation. DO NOT TOUCH.
- Phase 1C is real: frontend/api paid endpoints (grok-token verified line-by-line; voice-chat,
  suggest-words, extract-vocabulary, translate-and-ipa, guided-transcribe by import pattern) all
  gate requireSupabaseUser + body-size limit + consume_api_quota RPC.
- No `engines/` dir exists — `cloud_engines/` is the only engine tree (GPT prompt's duplicate
  engines/* concern is moot).

## Flag idiom
- Module-level const: `RUNNER_GAME_ROUTE_ENABLED = false` (App.tsx:80); env-driven: lib/billingFlags.ts.
