# Decisions
Newest first. Never delete a decision — mark it `⚠️ superseded → [[#the newer one]]` instead.
Wrong turns are part of the memory.

## 2026-07-06 — Writing systems are a registry-driven data module ("Script Lab") at /alphabet
**Status:** active — Korean/Hangul shipped as the reference implementation
**Decision:** Non-Roman writing systems get one generic module: user-facing "Alphabet" at `/alphabet(/:scriptId)` (both skins), discovered via a registry-gated tile in the Study hub. Everything language-specific is data (`src/data/scripts/*.ts` conforming to `lib/scriptlab/types.ts`) + one registry entry; UI components never know a script. Audio is spec-first (`{itemId, text}` — letter names like 기역, never bare jamo) resolving manifest asset → browser speechSynthesis; no paid TTS in any client path. Content localization is `LocalizedText{en,de,fr}` in the data (enforced by `test:script-lab`, stricter than check:i18n's warn-only fr). Progress is localStorage-only. New scripts follow `.claude/skills/add-script-lab-language/SKILL.md`.
**Why:** Korean learners had no way to learn to read — the app felt broken for every non-Roman language; a one-off Hangul page would have made Russian/Arabic/Kana each a new project instead of a data pack. The static-TTS house pattern (batch → asset → browser fallback) already proved the audio shape.
**Rejected:** Guided Today submodule (Korean isn't a `GuidedTargetLanguage`; 2.8 MB guided-chunk hazard); `/study/script` submode (not an SRS session; shouldn't inherit deck/queue semantics); onboarding prerequisite (max friction, unproven engagement); primary-nav item (`MobileBottomNav` is a hard 6-slot grid); runtime paid TTS (cost/latency/offline); per-symbol Supabase progress (SRS belongs to the deck engine if ever needed). **Known blocker:** abjads (Arabic/Hebrew) need `direction:'rtl'` + contextual letterforms in the type contract before data authoring.
## 2026-07-06 — Speak hides providers behind curated tutors; test complexity behind admin role
**Status:** partially active — phase 0 (admin gating) and phase 1 (palette re-skin) landed; **provider consolidation (phases 2–4) ON HOLD by owner**: Grok realtime is materially more expensive than Voxtral/Gemini, so the provider distinction is cost-relevant and must not be flattened away without a pricing/quota model. Owner decides the consolidation shape.
**Decision:** Normal learners never see provider names (Grok/Voxtral/Gemini) or the full voice matrix. Target flow: language → 4–6 curated tutor cards per language (provider bound internally, realtime shown as an "Instant" badge) → 4-level picker. Test-lab affordances gate on `profile.role === 'admin'` via `frontend/src/lib/speakCuration.ts` (theatrical accents already gated). Provider code is never deleted, only curated/hidden.
**Why:** Choice overload (59 voices, 10 modes, 27 accents, 3 wizards) is the single biggest test-lab signal in the app; provider vocabulary is engineering taxonomy, not learner value. Role-gating keeps the full matrix for admins/testing.
**Rejected:** Exposing "quality modes" as provider aliases (still engineering taxonomy); deleting advanced provider code (loses admin/testing capability).

## 2026-07-06 — Beta ships glassy-only for testers; study surfaces adopt deck-glass reference
**Status:** proposed (needs owner sign-off) — from `docs/Product/FABLE_TESTFLIGHT_FEATURE_STRATEGY.md`
**Decision:** TestFlight testers get the glassy skin only (classic stays behind the SkinProvider toggle for admins); deck-card glass (`.theme-card`/`.pg-glass`) becomes the single card chrome for Study via a shared `StudyCardFrame`; guided path is emphasized before free generation; depth-first languages (badge guided-ready ones) over breadth.
**Why:** Halves the coherence surface (7 duplicated page pairs), and the glassy skin is where the new brand language lives.

## 2026-07-06 — Video is deprecated user-facing; backend pipeline stays
**Status:** active
**Decision:** Stop exposing video generation/playback prominently to normal users; keep the entire backend video pipeline (`cloud_engines/video_engine`, `assembly_engine`, `bookend_engine`, `src/services/suno_bakein.py`, video paths in `src/pipeline.py` / orchestration) intact.
**Why:** Existing generations, storage artifacts, legacy decks, admin/support, and possible future internal workflows still depend on the pipeline; ripping it out is high-risk, hiding UI is cheap and reversible. Corroborated by `docs/Infrastructure/LTX_VIDEO_FEATURE_DISABLE_PLAN.md` and the video engine being code-frozen since 2026-04-30.
**Rejected:** Deleting video code outright (breaks legacy content, unrecoverable); keeping video UI as-is (conflicts with card-first product direction for beta).

## 2026-07-06 — Cleanup passes are evidence-first and delegated
**Status:** active
**Decision:** Broad repo scanning/inventory for cleanup work is delegated to Codex/subagents; Fable reviews the packet, personally inspects decision-critical files, and only lands small, rollback-friendly, evidence-backed patches. Phase 1A/1B migrations and RPCs are not rerun or rewritten without a concrete bug.
**Why:** Token efficiency and safety — the repo is too large to re-read every pass, and the stabilization layer is load-bearing for auth/credits.

## ~2026-05/06 — Product pivot to card-first guided learning (reconstructed from git history)
**Status:** active ⚠️ rationale inferred
**Decision:** Product centers on guided daily lessons (Today mission), SRS image/audio cards, and music (level-song / song-only) rather than per-word AI videos.
**Why (inferred):** Commit themes moved wholesale from video generation (frozen April) to curriculum images, guided TTS, study modes, and music features; video cost/latency vs. learning value presumably lost.

## ~2026-04 — Cloud-first runtime: Railway job runner + in-process engine dispatch
**Status:** active ⚠️ reconstructed
**Decision:** Production generation runs as one process (`start_cloud.py` → `job_runner.py`) with `DISPATCH_MODE=direct` in-process engine calls (`src/cloud_dispatcher.py`); the local multi-server DAW (FastAPI routers, per-engine HTTP ports 8080–8086) is legacy/local-only, gated by `STORAGE_MODE != "cloud"` in `src/app.py`.
**Why (inferred):** Single deployable container on Railway; avoids orchestrating six local HTTP servers in the cloud.

## ~2026-03→06 — Phase 1 stabilization (A/B done; C–H documented)
**Status:** active — do not rework without a concrete bug
**Decision:** Role/credit hardening, RPC-only invite redemption, atomic `submit_generation` and `request_word_retry` RPCs, worker `pre_bootstrap`; further hardening phases (paid-API auth/rate-limits, quotas, storage cleanup, migration drift) documented under `docs/Stabilization/` with a final closeout report.
**Why:** Close direct-mutation and cost-abuse holes before beta.
