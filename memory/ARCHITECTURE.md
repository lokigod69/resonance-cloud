# Architecture
Last verified: 2026-07-06 (domains line corrected 2026-07-07 audit)

## Overview
Two production halves in one git repo (root: `orchestrator/`). (1) The user-facing app: React 19 + TypeScript + Vite + Tailwind v4 SPA in `frontend/`, deployed on Vercel with serverless functions in `frontend/api/`, auth/DB/storage on Supabase, iOS via a Capacitor shell. (2) The generation backend: a single Python worker process on Railway (`start_cloud.py` → `job_runner.py`) that polls Supabase for jobs and drives `src/orchestration/*` workers, calling engines in-process via `src/cloud_dispatcher.py` (`DISPATCH_MODE=direct`). A third, legacy half — the local "DAW" (FastAPI routers + per-engine HTTP servers) — remains in-tree but only loads when `STORAGE_MODE != "cloud"`.

## Key components
| Area | Where | Notes |
|---|---|---|
| SPA | `frontend/src/` | Router in `App.tsx` (~55 routes). Two skins from same routes: classic (`AppLayout`, `Dashboard`/`Generate`/`Study`…) vs glassy (`PolishGlassLayout`, `DashboardPG`/`GenerateGO`/`StudyPG`…), chosen by `SkinProvider`. i18n via `lib/translations.ts` (en/de/fr mandatory). |
| Serverless API | `frontend/api/` | Vercel functions (named exports required): voice-chat, grok-token, suggest-words, extract-vocabulary, translate-and-ipa, guided-transcribe, voice-sample, share, webhooks, create-checkout-session, delete-account; shared auth/quota/cors/billing in `_shared/`. |
| Cloud worker | `job_runner.py`, `start_cloud.py` | v2 pipelined orchestrator; health HTTP thread; Railway via `Dockerfile.cloud` + `railway.toml`. |
| Orchestration | `src/orchestration/` | feeder (orphans/new/retries), upstream/downstream/card/music_only workers, finalizer, recovery, retry, state (correlation IDs), observability, video_dispatcher. |
| Pipeline & dispatch | `src/pipeline.py`, `src/cloud_dispatcher.py`, `src/dispatcher.py` | pipeline = stage sequencing; cloud_dispatcher = in-process engine calls (prod); dispatcher = HTTP calls to local engine servers (legacy). |
| Engines | `cloud_engines/` | concept, image (fal/kie/wan/seedream/z_image_turbo/gpt_image_2 + card_engine/layer2), song, video (ken_burns/kling/ltx/ltx_runpod/ltx_selfhosted adapters, router.py, pod_manager), assembly, bookend, duration_policy. No separate `engines/` dir — this is the only engine tree. Video engine frozen since 2026-04-30 (user-facing deprecation). |
| Services | `src/services/` | suno_bakein (Suno audio → word videos), publishing (upload to Supabase Storage + word records), enrichment, metadata, events, lyrics_translation, pronunciation_tts, level_song/song_only concept+suno, guided_tts/. |
| Local DAW (legacy) | ⚠️ removed 2026-07-11 (`be208ef6`) | `src/app.py`, `src/routers/*`, `src/{state,csv_import,presets,voices}.py`, `start*.bat` deleted — never deployed, zero live importers. Recover from git history; `imageless_tts` router there is the only impl of the missing `/api/generate-imageless-tts`. `src/dispatcher.py`/`src/pipeline.py` stay (video pipeline). |
| Tests | `tests/` (~90 files, pytest) | Orchestration, engines, music/song, guided TTS, Phase 1B atomic retry; `fake_supabase.py` helper. Frontend: npm run typecheck / lint / check:i18n (typecheck excludes `frontend/api` — use `tsc -p tsconfig.api.json` for functions). |
| Docs | `docs/` | Living: `Stabilization/`, `Infrastructure/` (incl. LTX video disable plan — tracked since 2026-07-11), `Product/`, `Refactors/`, `landing-redesign/`, `Backend/FrontendInvestigations/`, `I18N/`, `Implementation/`. Historical families (architecture, handoffs, reference, reviews, superpowers, investigations) live under `docs/archive/` since `8a1c20a8`. New reports go to `D:\CODING\ResonanceTEST\investigations\`. |

## Data flow
Frontend submits work via Supabase RPCs (`submit_generation`, `request_word_retry`) → job rows in Supabase → Railway worker feeder picks them up → orchestration workers build stage payloads (`src/pipeline.py`) → `cloud_dispatcher` runs engines in-process → artifacts uploaded by `src/services/publishing.py` to Supabase Storage → word/card records updated → SPA reads via Supabase client. Voice tutor and word-suggestion features call Vercel functions (`frontend/api/*`) which proxy paid providers (Grok, Gemini/ElevenLabs TTS, etc.) behind auth/quota checks in `api/_shared/`.

## External services & dependencies that matter
- Supabase (auth, Postgres incl. RPCs from Phase 1A/1B, storage buckets) — everything breaks without it.
- Vercel (SPA + serverless functions; Vite preset needs named exports), Railway (worker container).
- Paid providers: OpenAI/GPT-image, Fal, Kie, Suno, ElevenLabs, Gemini TTS, Grok realtime, Kling/LTX/RunPod (video-era, dormant).
- Domains: lingwave.ai is the live domain (owner QA runs against it); resonanz.pro is dead (DEPLOYMENT_NOT_FOUND). CORS in `src/app.py` still allows both.

## Conventions
- Frontend work commits directly to `main`; standard `git push`; commit only when asked.
- i18n mandatory: every user-facing string through `t()` with keys in all three locales (en/de/fr), real umlauts.
- Prefer theme CSS variables (`var(--accent)` etc.) over hardcoded colors; cosmos theme (vermillion/gold on near-black).
- Vercel functions: named exports (`GET`, `POST`), never `export default`.
- Never add adaptive-quality degradation to `LingwaveWaves`; perf is solved around the wave.
- SRS day boundary is UTC, not browser-local.
- Investigation reports → `D:\CODING\ResonanceTEST\investigations\`; refactor/audit docs → `docs/Refactors/`.
