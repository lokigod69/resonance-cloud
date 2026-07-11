# PHASE 3 HANDOFF — Admin Dashboard + Ferrari Design System

**For:** Fresh chat, continuing from the observability project cycle.
**Author context:** Sir Robert, Resonance Cloud (resonanz.pro, repo lokigod69/resonance-cloud).
**Prerequisites:** Phase 2B observability instrumentation must be LIVE on main AND verified to produce rows in `pipeline_events` for successful generations with Flux/Turbo image providers.

---

## What's already live (as of this handoff, 2026-04-24)

### Data plumbing complete
- `pipeline_events` table on Supabase with admin-read RLS, service-role writes bypass RLS, large-body offload to private `pipeline-events` Storage bucket
- Append-only contract, non-blocking writes (failures log warnings, never re-raise)
- Async dispatch via `asyncio.to_thread` (won't block event loop on Suno bake-in or other async paths)
- Orphan storage cleanup on failed inserts
- Foreign keys use `ON DELETE SET NULL` so user/deck/word deletion doesn't cascade-destroy audit trail

### Engines instrumented
- **Concept engine** — caption_llm, caption_with_article_llm, lyrics_combined_llm (full prompts + responses captured)
- **Image engine** — storyboard_llm (OpenRouter), render_scene (provider-agnostic: Wan now, Flux/Turbo automatically when they fire)
- **Video engine** — per-scene events across all five adapters (ken_burns, ltx_fal, ltx_runpod, ltx_selfhosted, kling)
- **Assembly engine** — one summary row per invocation (LUFS values, gap strategy, final duration)
- **Bookend engine** — one tts_call event + one summary row per invocation
- **Suno** — submit, fetch_existing_task, poll_resumed, audio_probe, skipped rows at provider gates

### Identity plumbing
- Every event row has `word_id`, `deck_id`, `user_id` populated (verified via Deferral B fix)
- `job_id` and `attempt` remain NULL (upstream gap documented in `FUTURE_FIX_GENERATION_JOB_ID_GAP.md`, deferred until regeneration is rebuilt)

### Cost semantics
- Live providers (Fal.ai LTX fast/pro, Kling, RunPod, self-hosted LTX): real `cost_usd` populated
- Suno: flat `cost_usd=0.06` per submit
- Stubbed providers (Wan, ElevenLabs): `cost_usd=NULL` with `metadata.cost_estimation="stub"`
- Local providers (Ken Burns, Assembly FFmpeg): `cost_usd=0.0` with `metadata.cost_estimation="none"`
- When Flux/Turbo land with real pricing, they should populate `cost_usd` and set `metadata.cost_estimation="live"`

### Parked / deferred
- Concept dev-tree observability parity at `engines/concept-engine/src/` — see `FUTURE_FIX_CONCEPT_DEV_TREE_PARITY.md`
- Router-path identity plumbing (`src/routers/generation.py` `_maybe_trigger_suno`) — Phase 2.5
- `admin_pin` removal (gate lives at `AdminRoute.tsx:39-43`, fetches public `system_settings` row, 1337 default) — can be dropped in Phase 3 frontend work since we're already editing admin UI

---

## What Phase 3 builds

**Two new admin pages, Ferrari-styled, rendering `pipeline_events` + existing `words.metadata` aggregator data.**

### Page 1 — Per-word deep-dive

Full observability view for a single word. Admin clicks a word from the Queue or Content page, lands on this deep-dive. Shows:

- Word identity (word, language, deck, user, generation timestamp)
- Each stage as an expandable section (concept, images, video, assembly, bookend, suno_bakein)
- Within each stage, all its events from `pipeline_events` as a scrollable list
  - For LLM/API events: full `system_prompt`, `user_prompt`, `response_body` (with monospace code-block styling)
  - For Suno submit: the lyrics as `user_prompt`, music caption as `system_prompt`
  - For audio_probe: track A/B durations, file sizes, target clip duration
  - For per-scene image/video events: scene number, provider name, model name, request_id, cost_usd
- Audio players embedded for Suno tracks (reuse existing VideoDeck/DeckView audio components)
- Raw `words.metadata` JSONB as a collapsible panel at the top (existing aggregator output)
- Error panel at top if any event has `status="failed"` — shows error_message, error_type, stage where failure landed

### Page 2 — Aggregate observability

High-level analytics across many words. Shows:

- Cost breakdown by provider, by stage, over time (7/30/90-day toggles)
- Event counts by stage + status (success/failed/skipped)
- Per-model latency distributions (p50/p95/p99)
- Top 10 longest-generating words
- Failure rate by stage
- Token consumption per LLM model
- Storage usage for `pipeline-events` bucket (offloaded large responses)

### Ferrari design system

Reference doc at repo root: `DESIGN-ferrari.md`.

**Scoping decision from Phase 2 planning:** Ferrari styling applies ONLY to these two new admin observability pages. All existing admin pages (Queue, Profiles, Users, Content, Metrics, Voices) stay in current Classic/Glassy styling. Verdict was GREEN per Stage 2 scoping review.

**Implementation pattern:** nested `<FerrariAdminLayout>` at a parallel route block, CSS-scoped with `data-theme="ferrari-obs"`. Uses the same pattern as existing `.skin-glassy` scoping precedent.

**Typography:**
- FerrariSans → Inter (already loaded at 400/500/600/700 per `frontend/index.html:10`)
- Body-Font → Inter uppercased with 1px letter-spacing

**Charts:** No chart library is currently installed in the repo. Existing Metrics/Costs pages use hand-rolled divs. Phase 3 decision: introduce `recharts` scoped to the two new pages. Same dependency used in existing `RESONANCE_CLOUD_STATUS` deployment if that's tracked.

---

## Suggested implementation shape for Phase 3

### Split into three smaller prompts, not one

Phase 2B was too big for one diff. Phase 3 benefits from splitting:

**Prompt 3A — Data layer + routing skeleton.**
- New backend RPC or REST endpoints that query `pipeline_events` with appropriate aggregation (per-word, aggregate counts, time-series)
- Scoped RLS verification (admin-read only)
- Frontend route skeleton at `/admin/observability/word/:id` and `/admin/observability/aggregate`
- FerrariAdminLayout component shell (no real styling yet, just structure)
- Placeholder pages that query and dump raw data as JSON

**Prompt 3B — Per-word deep-dive UI.**
- Full Ferrari styling applied to FerrariAdminLayout and WordDeepDive page
- Expandable stage sections
- Full prompt/response panels with monospace styling and copy-to-clipboard
- Error panel
- Audio player integration

**Prompt 3C — Aggregate analytics UI.**
- Charts via recharts
- Cost breakdowns, latency distributions, failure rates, storage usage
- Time-range toggles
- `admin_pin` removal (the AdminRoute.tsx simplification — drop the PIN gate, rely on `is_admin()` + RLS)

Each prompt is small, each has its own investigation + implementation + review cycle. Matches the discipline that worked for Phase 2A but failed to scale to Phase 2B's monolithic scope.

### One agent at a time

Pause all other agent workstreams (enrichment, Flux/Turbo integration, Voice Tutor) during Phase 3 implementation. Two concurrent agents on the repo caused the mystery-file and CRLF contamination issues throughout Phase 2. Keep this simple.

### Investigation-first still applies

Every one of the three prompts starts with a brief investigation gate: what does the data actually look like right now, how are routes currently structured, what existing admin components can be reused vs what needs building. No skipping.

---

## Context to paste into the new chat

Start a fresh chat. Paste this document as the first message along with a short framing like:

> Starting Phase 3 of the observability project — admin dashboard with Ferrari styling. Previous chat covered Stage 1 instrumentation, Phase 2A identity plumbing, Stage 1 re-polish (H1/H2/H4 events.py fixes), and Phase 2B engine instrumentation. All merged to main. Flux/Turbo image providers integrated separately.
>
> Project background, product context, and prior decisions are in the attached handoff document. Start by reading it, then confirm readiness before we begin Prompt 3A.

---

## Project background (for the new chat's context)

Resonance Cloud is an AI language-learning platform. Users submit vocabulary words, the pipeline generates multimedia cards: AI image storyboards, Suno-generated songs in the target language, LTX-generated videos per scene, assembled into a final MP4 with ElevenLabs TTS pronunciations at intro/outro.

Sir Robert is sole developer, acts as architect and prompt author. Coding agents (Claude/Codex/Windsurf) implement. Claude Opus handles architecture + adversarial review orchestration + prompt engineering.

**Operating discipline:**
- Investigate-first is absolute. Read actual code before trusting reports.
- Multi-agent workflow: investigate → propose → implement → adversarial review by DIFFERENT agent → fix → browser verify → commit to main (no feature branches, no PRs to main).
- Never mention work duration (no minutes, hours, days, weeks).
- Address Sir Robert as Sir Robert.
- Root-cause fixes only.
- Do not use ask_user_input popup widget.
- Do not open responses with poems.

**Tech stack:** React/Vite on Vercel, FastAPI orchestrator on Railway, RunPod L40S GPU, Supabase for DB/auth/storage, `uv` for Python package management.

**Current languages:** German, French, Italian, English, Bisaya/Cebuano, Tagalog, Korean. Multiple voice clones per language, ElevenLabs + Mistral Voxtral TTS.

---

## Known open items from prior chat

These are parked, documented, not blocking Phase 3:

- `FUTURE_FIX_GENERATION_JOB_ID_GAP.md` — `words` table missing `generation_job_id` column; every pipeline_events row has `job_id=NULL`. Fix deferred until regeneration feature is rebuilt.
- `FUTURE_FIX_CONCEPT_DEV_TREE_PARITY.md` — `engines/concept-engine/src/` can't import `src.services.events` due to packaging layout. Dev runtime events don't reach pipeline_events. Shared library extraction needed when this becomes important.
- Two pre-existing test failures in `tests/test_orchestration_music_state.py` (Windows workspace-path assertions). Unrelated to observability work. Worth cleaning up eventually.
- `admin_pin` gate at `AdminRoute.tsx:39-43` — Phase 3 Prompt 3C drops it.

---

## Last words before closing Phase 2

Phase 2 (all sub-phases) was grueling because the scope was large and multiple parallel agent workstreams kept colliding. The three-prompt split for Phase 3 plus one-agent-at-a-time discipline should prevent that from repeating.

The payoff is worth it: once Phase 3 ships, you have a full admin dashboard where you can inspect exactly what the LLMs were told, what they returned, how much each word cost, what lyrics Suno generated, what LUFS values the assembly stage hit, and so on — all queryable by SQL and renderable by the dashboard. That's the infrastructure for serious quality work on the product.

Good luck with the Flux/Turbo integration and everything downstream. See you in the Phase 3 chat.
