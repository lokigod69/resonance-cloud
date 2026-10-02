# Architecture
Last verified: 2026-09-07 for the hardening additions below; 2026-09-25 for the Overview, SPA, API, Engines, Tests and Domains rows (audit corrections); other rows retain their original verification scope.

## September 7 architecture additions
- Twelve-language UI and explanation architecture: [[notes/base-languages-brand-2026-09-07]]. Lazy UI/ScriptLab packs; 144 fingerprinted compact guided target/base editions; per-word meaning provenance; API-local base registry. Private canonical phrase catalog registers exact identities and 32,400 meanings for Keep; existing user words are not rewritten.
- Guided practice contracts: [[notes/today-guided-2026-09-07]]. Account-scoped local lesson/checkpoint/trophy drafts and honest assisted outcomes; explicit `keep_guided_phrase` RPC saves a core phrase to a stable per-language card_text deck via `guided_phrase_decks`, attaching matching existing audio without generation/credits. Progress remains device-local; phrase decks are account-backed.
- Server request scopes/deadlines: `frontend/api/_shared/requestDeadline.ts`; shared transports include auth, quotas, providers, bodies and bounded compensation. Client counterpart `frontend/src/lib/clientDeadline.ts` supports iOS15.
- Canonical Speak personality authority: `api/_shared/speakPersona.ts` reads a generated API-local catalog, checked against picker registries by prebuild. Do not import src/ ESM from API CommonJS. New clients send IDs; exact legacy tuples remain compatible.
- Ledger/reservations: `generation_credit_operations`, `words.active_credit_operation_id`, Live session reservation fields, `stripe_billing_customers` and `stripe_checkout_reservations`; server-only allocation/settlement RPCs. Ordered Stripe mutations separate subscription state from invoice credit/refund accounting.
- Durable recall: `src/lib/recallAttemptQueue.ts` uses IndexedDB plus `record_recall_attempt` and unique user/receipt IDs. App bridge drains on user, online and foreground changes.
- Guided authoring stays in `guidedLessonsAuthoring.ts`. `generate:guided-runtime` derives a lightweight index and 12 dynamic language modules under `src/data/guided-runtime/`; runtime callers load only required language bodies.
- Card list previews use `words.card_thumbnail_url` (640x360 WebP); study/detail retain `thumbnail_url` full PNG. SQL deletion/cleanup owns both URLs. Runner uses `src/path_safety.py`, bounded subprocess helpers and persisted bootstrap retry state.
- Full invariants, rollout compatibility and remaining limits: [[notes/hardening-2026-09-07]].

## October 3 staged B1 authoring
- `frontend/content-drafts/b1-2026-10/` is an offline package, absent from runtime imports and catalog generators. JSON drafts hold complete P1 episodes; separate plans reserve 100 trophies per target.
- `frontend/scripts/lib/guidedB1Drafts.ts` validates sources and exports existing B1 playback coordinates, including vocabulary terms as chunk/item keys. `prepare-guided-b1-drafts.ts` saves source fingerprints; `scripts/plan_guided_b1_drafts.py` creates a provider-free proposed inventory and character forecast. Neither can generate audio or publish courses.
- Frontend contracts check source/snapshot identity, while Python contracts rebuild the saved audio plan. Guided TTS `generate.run_async(dry_run=True)` only reads Supabase; it no longer writes a generation-run ledger row.

## Overview
Two production halves in one git repo (root: `orchestrator/`). (1) The user-facing app: React 19 + TypeScript + Vite + Tailwind v4 SPA in `frontend/`, deployed on Vercel with serverless functions in `frontend/api/`, auth/DB/storage on Supabase, iOS via a Capacitor shell. (2) The generation backend: a single Python worker process on Railway (`start_cloud.py` → `job_runner.py`) that polls Supabase for jobs and drives `src/orchestration/*` workers, calling engines in-process via `src/cloud_dispatcher.py` (`DISPATCH_MODE=direct`). The former local "DAW" (FastAPI routers + per-engine HTTP servers) was removed on 2026-07-11 (`be208ef6`); `STORAGE_MODE` survives only as a storage-path switch (`src/storage.py`).

## Key components
| Area | Where | Notes |
|---|---|---|
| SPA | `frontend/src/` | Router in `App.tsx` (~47 paths). Only the glassy skin ships (`PolishGlassLayout`, `DashboardPG`/`GenerateGO`/`StudyPG`…); classic (`AppLayout`) is retired behind `CLASSIC_SKIN_RETIRED` (`lib/productFlags.ts`) — its routes remain but are unreachable for users, and admin pages still use `AppLayout`. i18n via `lib/translations.ts`: 12 UI locales (core en/de/fr plus 9 lazy packs in `lib/locales/`). |
| Serverless API | `frontend/api/` | Vercel functions (named exports required): voice-chat, grok-token, suggest-words, extract-vocabulary, translate-and-ipa, guided-transcribe, visual-scan, entitlements, voice-sample, share, webhooks, create-checkout-session, delete-account, analytics-deletion-sweep (cron); shared auth/quota/cors/billing in `_shared/`. |
| Cloud worker | `job_runner.py`, `start_cloud.py` | v2 pipelined orchestrator; health HTTP thread; Railway via `Dockerfile.cloud` + `railway.toml`. |
| Orchestration | `src/orchestration/` | feeder (orphans/new/retries), upstream/downstream/card/music_only workers, finalizer, recovery, retry, state (correlation IDs), observability, video_dispatcher. |
| Pipeline & dispatch | `src/pipeline.py`, `src/cloud_dispatcher.py`, `src/dispatcher.py` | pipeline = stage sequencing; cloud_dispatcher = in-process engine calls (prod); dispatcher = HTTP calls to local engine servers (legacy). |
| Engines | `cloud_engines/` | concept, image (fal/kie/wan/seedream/z_image_turbo/gpt_image_2 + card_engine/layer2), song, video (ken_burns/kling/ltx/ltx_runpod/ltx_selfhosted adapters, router.py, pod_manager), assembly, bookend, duration_policy. No separate `engines/` dir — this is the only engine tree. Video engine frozen since 2026-04-30; hidden from users since 2026-07-06 (`VIDEO_LANE_ENABLED = false`). |
| Services | `src/services/` | suno_bakein (Suno audio → word videos), publishing (upload to Supabase Storage + word records), enrichment, metadata, events, lyrics_translation, pronunciation_tts, level_song/song_only concept+suno, guided_tts/. |
| Local DAW (legacy) | ⚠️ removed 2026-07-11 (`be208ef6`) | `src/app.py`, `src/routers/*`, `src/{state,csv_import,presets,voices}.py`, `start*.bat` deleted — never deployed, zero live importers. Recover from git history; `imageless_tts` router there is the only impl of the missing `/api/generate-imageless-tts`. `src/dispatcher.py`/`src/pipeline.py` stay (video pipeline). |
| Tests | `tests/` (~60 files, pytest) | Orchestration, engines, music/song, guided TTS, Phase 1B atomic retry; `fake_supabase.py` helper. Frontend: npm run typecheck / typecheck:api / lint / check:i18n plus the `npm run test:*` contract scripts (typecheck excludes `frontend/api`; `typecheck:api` covers it). |
| Docs | `docs/` | Living: `Stabilization/`, `Infrastructure/` (incl. LTX video disable plan — tracked since 2026-07-11), `Product/`, `Refactors/`, `landing-redesign/`, `Backend/FrontendInvestigations/`, `I18N/`, `Implementation/`. Historical families (architecture, handoffs, reference, reviews, superpowers, investigations) live under `docs/archive/` since `8a1c20a8`. New reports go to `D:\CODING\ResonanceTEST\investigations\`. |

## Data flow
Frontend submits work via Supabase RPCs (`submit_generation`, `request_word_retry`) → job rows in Supabase → Railway worker feeder picks them up → orchestration workers build stage payloads (`src/pipeline.py`) → `cloud_dispatcher` runs engines in-process → artifacts uploaded by `src/services/publishing.py` to Supabase Storage → word/card records updated → SPA reads via Supabase client. Voice tutor and word-suggestion features call Vercel functions (`frontend/api/*`) behind auth/quota checks in `api/_shared/`. Speak Live uses xAI voice; async Speak uses Groq transcription/replies/corrections followed by Mistral or Gemini TTS. Lens uses Gemini vision. [Speak/Lens](notes/speak-lens.md) links to the authoritative model constants and request/reservation contracts; provider wiring rechecked against source on 2026-10-03.

## External services & dependencies that matter
- Supabase (auth, Postgres incl. RPCs from Phase 1A/1B, storage buckets) — everything breaks without it.
- Vercel (SPA + serverless functions; Vite preset needs named exports), Railway (worker container).
- Paid providers: OpenAI/GPT-image, Fal, Kie, Suno, ElevenLabs, Gemini TTS, Grok realtime, Kling/LTX/RunPod (video-era, dormant).
- Domains: lingwave.ai is the live domain (owner QA runs against it); resonanz.pro is dead (DEPLOYMENT_NOT_FOUND). CORS lives in `frontend/api/_shared/cors.ts` and allows only lingwave.ai + www (plus the preview suffix).

## Environment (names only)
`npm run env:check` (from `frontend/`) lists every variable the code reads, per component, and whether a local `.env` sets it; it never prints values. Production values live in Vercel (functions and browser bundle) and Railway (worker) and are not readable through the CLI.
- Supabase: `SUPABASE_URL`, `SUPABASE_ANON_KEY` / `VITE_SUPABASE_*`, and the service key under two names — functions read `SUPABASE_SERVICE_ROLE_KEY` first and fall back to `SUPABASE_SERVICE_KEY`; the worker reads both plus `SUPABASE_KEY`. Keep them equal.
- Providers: `GROQ_API_KEY` (Speak STT and LLM), `OPENROUTER_API_KEY` (suggestions, extraction, lyrics, enrichment), `GOOGLE_AI_API_KEY` (Lens, Gemini TTS), `MISTRAL_API_KEY` (Voxtral), `XAI_API_KEY` (Live), `ELEVENLABS_API_KEY`, `KIE_API_KEY`, `FAL_KEY`, `STRIPE_SECRET_KEY`.
- Switches: `API_QUOTA_REQUIRE_ENFORCED`, `STRIPE_BILLING_ENABLED`, `CRON_SECRET`, `STORAGE_CLEANUP_MODE` (unset = preview), `AOS_*` / `VITE_AOS_*` (analytics, dark), `SUNO_CALLBACK_BASE_URL`.

## Conventions
The working rules for every agent (git and pushing, approvals, checks, i18n, named exports, themes, waves, UTC day, guided chunk boundary, worker-owned columns) live in `orchestrator/AGENTS.md`; they are not repeated here. Versioned design docs go in `docs/`; reports go in `D:\CODING\ResonanceTEST\investigations\` (unversioned).
