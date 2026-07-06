# Decisions
Newest first. Never delete a decision — mark it `⚠️ superseded → [[#the newer one]]` instead.
Wrong turns are part of the memory.

## 2026-07-06 — Language additions follow the tier model; Tier 0 is the default landing point
**Status:** active — encoded in `docs/Product/FABLE_LANGUAGE_ARCHITECTURE.md` + `.claude/skills/add-target-language`
**Decision:** A new target language ships at Tier 0 (wizard-only: one `LANGUAGES` entry + langName keys + flag maps) by default; every higher tier (1 categories, 2 curated TTS, 3 Speak, 4 script pack, 5 guided) is a separately approved step, and paid asset batches (ElevenLabs/Mistral) always need explicit owner approval. Base-locale additions gate on `check-i18n-coverage.ts` `requiredLocales`; RTL base locales are blocked pending a layout pass. Russian shipped 2026-07-06 at Tier 0 + Cyrillic script pack as the system's proof.
**Why:** The investigation showed surfaces degrade gracefully at lower tiers but fail non-gracefully when half-wired (voice-chat 400s, silent thematic cards, invisible landing chips) — so tiers must be all-or-nothing per surface, and the skills enforce that.
**Rejected:** “Add everything everywhere” single-pass language additions; optimistic wiring of Speak/guided/category lists ahead of their content.

## 2026-07-06 — Lens beta exposure, placement, and quota (owner answers, Phase 2A kickoff)
**Status:** active — recorded in `FABLE_VISUAL_LENS_MASTER_PLAN.md` §Owner answers
**Decision:** `VISUAL_LENS_ENABLED` ships ON for the first TestFlight testers (Lens is visible from day one). Placement stays a dashboard/home tile — owner leans against giving Lens a bottom-nav slot; revisit only if dogfooding demands it (any nav change still needs explicit owner approval). Free quota starts at 30 scans/day ("at least 30 is okay at the beginning"); can be raised later, cost permits. Working name Lens proceeds; final copy sign-off remains open until the 2F gate.
**Why:** Owner wants testers exercising the wow feature immediately, and prefers home-surface discovery over fighting the hard six-slot nav grid during beta.
**Rejected:** Flag-off-for-beta (Fable's earlier fewer-visible-systems recommendation — owner overrode); immediate tab promotion.

## 2026-07-06 — Lens mixed save counts stay count-based unless per-row identity is known
**Status:** active — implemented in working tree, uncommitted
**Decision:** Phase 2D does not infer per-item save outcomes from `submit_lens_save` count-only responses. If all submitted items insert, rows are marked saved. If all submitted items skip, rows are marked already present. If inserts and skips are mixed, Lens shows the accurate aggregate line (`saved`, `already known`) and leaves ambiguous rows unmutated; only pre-save `existingWordHints` can mark known duplicates ahead of the RPC. The visual prompt also treats target-language text as reading/meaning mode rather than re-translation.
**Why:** The RPC intentionally returns counts, not item IDs. Marking every submitted row saved after a partial skip made the recap false; count-based messaging preserves truth without changing the schema or RPC contract.

## 2026-07-06 — Lens saves use a dedicated RPC and normalized word_slug idempotency
**Status:** active — implemented in working tree, uncommitted
**Decision:** `submit_lens_save` is a new `security definer` RPC instead of mutating imageless import contracts. It owns the find-or-create for `Lens — {Language}` `card_text` decks, writes Lens lexical fields directly to `words`, stores transliteration only in `words.metadata`, and dedupes inside the Lens deck with normalized `lower(btrim(word))` `word_slug` plus fallback matching for older/null-slug rows.
**Why:** Existing imageless RPCs do not support `origin='lens'`, rich fields, find-or-create, or idempotent duplicate handling. The current import path also does not reliably populate `word_slug`, so Lens makes the normalized key explicit while preserving compatibility with existing rows by checking `lower(btrim(word))`.

## 2026-07-06 — Lens Phase 2B keeps scan text transient and normalizes at API boundary
**Status:** active — implemented in working tree, uncommitted
**Decision:** `/api/visual-scan` owns all provider parsing and clamps Gemini output to the existing client contract before the browser sees it: snake_case lexical fields, `kind`, `safety`, max 8 text/menu items, max 2 alternates, confidence coercion, and no lexical items when `safety` is set. Usage events record feature/model/tokens/cost/count metadata only; image bytes are never logged or stored. OpenRouter vision exists only as a same-interface stub for later failover.
**Why:** The camera frame is private and intentionally one-shot; putting normalization server-side keeps client UI stable, avoids leaking provider drift into Phase 2A code, and gives quota/metering one controlled boundary.

## 2026-07-06 — Lens (camera vocabulary) is capture-first, one vision call, existing deck rails
**Status:** proposed — Phase Zero + master plan done, implementation not started; see `docs/Product/FABLE_VISUAL_LENS_MASTER_PLAN.md`
**Decision:** The camera feature ("Lens", flag `VISUAL_LENS_ENABLED`, route `/lens` via dashboard tile) is a deliberate shutter-tap → single Gemini-Flash multimodal call (object/OCR/menu in one structured lexical response) → result sheet → save into an auto "Lens — {language}" `card_text` deck through ONE new RPC `submit_lens_save` (atomic find-or-create, in-RPC dedupe, origin `lens`, rich fields into existing `words` columns, transliteration into `metadata`). New quota action `visual_scan`; frames never stored; browser TTS tap-to-speak only; no new tables.
**Why:** Web-in-Capacitor reality kills on-device CV (no Apple Vision; TF.js = MBs for 80 classes); one vision call is cheaper (<$0.001/scan), calmer UX, and handles lexical correctness in-prompt. Import-into-the-learning-loop is the differentiator (sibling of Speak's extract-words), not recognition itself.
**Rejected:** Continuous scanning/auto-speak (cost, chaos, privacy); fal.ai (not in stack, no fit); the GPT prompt's 11-table `visual_*` schema (decks/words/quota/usage-events already cover it); reusing `append_imageless_cards` for saves (origin whitelist, `{word,translation,ipa,is_phrase}`-only items, no find-or-create/dedupe — proven too narrow by Codex adversarial review); bottom-nav tab at MVP (hard 6-slot grid + beta minimalism; owner decides promotion later).

## 2026-07-06 — Writing systems are a registry-driven data module ("Script Lab") at /alphabet
**Status:** active — Korean/Hangul shipped as the reference implementation
**Decision:** Non-Roman writing systems get one generic module: user-facing "Alphabet" at `/alphabet(/:scriptId)` (both skins), discovered via a registry-gated tile in the Study hub. Everything language-specific is data (`src/data/scripts/*.ts` conforming to `lib/scriptlab/types.ts`) + one registry entry; UI components never know a script. Audio is spec-first (`{itemId, text}` — letter names like 기역, never bare jamo) resolving manifest asset → browser speechSynthesis; no paid TTS in any client path. Content localization is `LocalizedText{en,de,fr}` in the data (enforced by `test:script-lab`, stricter than check:i18n's warn-only fr). Progress is localStorage-only. New scripts follow `.claude/skills/add-script-lab-language/SKILL.md`.
**Why:** Korean learners had no way to learn to read — the app felt broken for every non-Roman language; a one-off Hangul page would have made Russian/Arabic/Kana each a new project instead of a data pack. The static-TTS house pattern (batch → asset → browser fallback) already proved the audio shape.
**Rejected:** Guided Today submodule (Korean isn't a `GuidedTargetLanguage`; 2.8 MB guided-chunk hazard); `/study/script` submode (not an SRS session; shouldn't inherit deck/queue semantics); onboarding prerequisite (max friction, unproven engagement); primary-nav item (`MobileBottomNav` is a hard 6-slot grid); runtime paid TTS (cost/latency/offline); per-symbol Supabase progress (SRS belongs to the deck engine if ever needed). **Known blocker:** abjads (Arabic/Hebrew) need `direction:'rtl'` + contextual letterforms in the type contract before data authoring.
## 2026-07-06 — Runner game discontinued: frontend deleted, historical data guards kept
**Status:** active (uncommitted)
**Decision:** The runner game is removed from the frontend entirely — registry entry, `/games/runner` route, `ComingSoonOverlay`/`ComingSoonPlaceholder`, the whole `src/games/runner/` tree (~110 files incl. audio/art assets), and all `games.runner.*` i18n keys. The `study_mode='runner'` exclusion guards in `useStudyStreak.ts`, `dailyHabits.ts`, and the SQL migrations STAY — historical `recall_attempts` rows with that mode exist and must keep being excluded from SRS/streak math. Slicer is unaffected and is now the only game.
**Why:** Owner discontinued the game (2026-07-06); a permanent "Coming soon" tile erodes trust in a beta.
**Rejected:** Flag-gating it off (dead weight in the bundle and registry for a feature with no revival plan); deleting the data guards (would corrupt streak/SRS math for any account that played it).

## 2026-07-06 — Add-language lives in the dashboard language dropdown; lands on the empty dashboard
**Status:** active (uncommitted)
**Decision:** `LanguageCluster` gains a "+ Add language" row exposing not-yet-owned `WIZARD_LANGUAGES`. Selecting one persists to per-user localStorage (`lingwave_added_languages_<userId>`), is unioned into `availableLanguages`, and the dashboard shows that language's first-run/empty state (HomeWelcomeCard doors lead onward). On the Decks page the same affordance routes to `/generate` preselected instead. Language availability itself remains deck-derived — localStorage only bridges the gap until the first deck exists.
**Why:** Owner had no way to start a new language from the home screen; the deck-derived list made deckless languages unreachable. The first-run empty state already existed and communicates "start here" better than teleporting into the wizard.
**Rejected:** A profile-table column for added languages (schema change for what is transient UI state); navigating straight to /generate from the dashboard (owner explicitly described landing on an empty home).

## 2026-07-06 — Level-song request keeps user in the library with durable confirmation
**Status:** active (uncommitted)
**Decision:** After submitting a level song, the user stays on the level page: the generate button flips to a disabled "Song requested" state with a "Go to Music" link; toasts globally move above the mobile bottom nav (`--mobile-bottom-nav-space`) and use `--surface-glass-strong` (the previous `--bg-card` var was undefined — toasts were transparent, the root cause of "nothing happened").
**Why:** Owner wanted to keep exploring the library while songs generate; auto-navigation to /music would interrupt that. The invisible-toast bug meant existing feedback never showed on mobile.
**Rejected:** Auto-navigate to /music (owner listed it as acceptable but preferred staying); toast-with-action-button (ToastProvider API is string-only — bigger change than the value delivered).

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
