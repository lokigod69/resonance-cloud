# Decisions
Newest first. Never delete a decision — mark it `⚠️ superseded → [[#the newer one]]` instead.
Wrong turns are part of the memory.

## 2026-07-11 — Cleanup endgame: `_archive` deleted after clean adversarial review; guided-TTS SQL kept as future-feature raw material; `refactor` branch dropped
**Status:** active — LOG 2026-07-11 (5)
**Decision:** (1) Owner closed the decide-list: worktrees, orphaned branches, `ltx-worker\.venv`, `orchestrator-origin-main-check`, and `_archive\` itself are gone; `content\`/`curriculum\`/`brand\` media stay on disk and stay un-pushed. The archive-first safety net was deliberately retired only AFTER a Codex adversarial review of all 4 cleanup commits came back clean (1 LOW: stale `/games` returnTo fallbacks → fixed to `/dashboard`). (2) `20260517010000_guided_tts_v1.sql` + the 4 April root SQL drafts were rescued to `frontend/supabase/rescued-drafts/` first — the April drafts are probably applied prod schema (typed study mode + costs dashboard work live), and guided_tts_v1 is owner-designated raw material for a future guided-path listen-to-phrases audio feature (plan-first with owner; no implementation without go-ahead). (3) `refactor` local branch dropped, not reconciled: both "ahead" commits (`e816565a`, `c45dbd43`) are ancestors of main; only origin/refactor was stale.
**Why:** Review-then-delete converts "probably safe" into verified-safe before losing the only copies; the SQL files were the single genuinely irreplaceable content in `_archive`.
**Rejected:** Deleting `_archive` before the review (no recovery path); putting rescued drafts back into `supabase/migrations/` (the CLI would try to re-apply them); pushing or deleting origin/refactor (owner said no pushes today).

## 2026-07-11 — Repo-wide cleanup: archive-first, DAW deleted, video + TTS tooling kept
**Status:** active — commits `c16e83d7`/`be208ef6`/`8a1c20a8`/`9067e188`, report `investigations/CLEANUP_PASS_2026_07_11_REPORT.md`
**Decision:** Pre-TestFlight cleanup ran under an archive-first policy: un-versioned material moves to `D:\CODING\ResonanceTEST\_archive\` with manifests (never deleted); tracked deletions go through `git rm` in small revertable commits. The legacy local-DAW backend (src/app.py + routers + state/presets/voices/csv_import + start*.bat) was DELETED as provably undeployed dead code; the video pipeline was NOT touched (owner keep-decision; Codex classification confirms the boundary — partial deletion would break `_ensure_engines_loaded()`). Static/guided TTS tooling KEPT despite being classified one-off, because Russian Tier 2 static TTS is a pending owner-run batch. Completed setc image-batch script/test families archived out. Unpushed branch work was pushed/bundled BEFORE any worktree/branch removal.
**Why:** Owner mandate "clean for TestFlight, keep the video pipeline, don't lose anything important"; archive-first makes every step reversible without owner pre-approval of each item.
**Rejected:** Deleting `content\`/`curriculum\` media (expensive-to-regenerate, owner call); restoring dead ConfirmStep.tsx to keep a stale contract test green (test repointed at the live wizard pages instead); archiving guided_tts services (future batches need them).

## 2026-07-10 — SRS grading is never input-gated; swipe-to-grade is the flagship gesture
**Status:** active — committed `526dfbaa`
**Decision:** Grading in the SRS flashcard loop advances state in the same tick as the input — decorative feedback (pulse, direction-aware exits) plays over the transition and never disables buttons or keys. The only input filter is a 260ms repeat guard (must outlast the 220ms card-exit so held keys/ghost taps can't grade a still-hidden card) plus `e.repeat`/focused-control checks on the 1/2 keys. Swipe-to-grade (`SwipeGradeCard.tsx`) commits via Apple momentum projection (d=0.998, threshold `min(42% width, 200px)`, velocity sign wins over position) with release-velocity handoff into every spring; buttons/keyboard remain the accessible path; right = remembered, left = review later, matching the button layout.
**Why:** The 280ms lockout was pure latency in the highest-frequency loop in the app (hundreds of taps/session); apple-design §1/§3 — decoration must never gate input. Physics per the apple-design skill; Codex adversarial review found no blockers and drove the guard/keyboard/aria hardening.
**Rejected:** keeping the per-card ring glow (cannot ride the outgoing card once advance is immediate — replaced by direction-aware exits); rubber-banding during the drag (the whole axis is meaningful input, no boundary to resist); gating swipe on reveal (buttons already allow pre-reveal grading; consistency wins); delaying SessionComplete so the last fling finishes (immediacy over ceremony).

## 2026-07-08 — Both skins ship for beta; glassy is the default for new users/devices (owner delegated the call to Fable)
**Status:** active — committed `a2ee4e16`
**Decision:** The skin switcher stays (both classic and glassy selectable in ProfileModal); `migrateSkinId`'s no-stored-value fallback flips classic→glassy so new users and wiped devices land on glassy, matching the v1-done definition ("beta in the glassy skin"). Unrecognized legacy values still resolve to classic. `profiles.skin` is now restored when localStorage is empty (same pattern/rationale as the theme-restore decision below). PG/classic page-pair consolidation stays parked until beta testers reveal a preference.
**Why:** Glassy-only's real payoff is deleting the classic page variants — a large refactor with real risk mid-beta-push and zero user-visible gain; the switcher itself costs nothing and produces preference data. Owner leaned "leave both" and delegated; this keeps both while aligning the default with the beta definition.
**Rejected:** Hiding the switcher for beta (removes the cheap preference signal for no QA gain — both skins still ship in the bundle either way); deleting classic now (risk without payoff before feedback).

## 2026-07-08 — iOS bundle stays fat (~600 MB) for the private TestFlight; curriculum slimming is a fast-follow, not half-wired now
**Status:** active — deliberate deferral
**Decision:** `webDir: dist` bundles all of `public/` (curriculum 460 MB tracked + guided 71 MB + ~65 MB misc) into the IPA. Ship the private beta that way — TestFlight's limit is 4 GB and installs are WiFi. Before any wider beta: add a native-only `publicAssetUrl()` (web keeps relative paths), funnel the DB-persisted relative `thumbnail_url` values (written by `curriculumDeckBridge` into card rows, rendered in ~35 files) through one resolver, then strip `dist/curriculum` in `build:ios` (→ ~135 MB).
**Why:** Stripping without the DB-path resolver breaks every curriculum-imported deck thumbnail on native; wiring only the 6 code-side builders would be a half-measure that forces network loads for still-bundled assets. Shipping beats elegant size optimization for a July beta ([[STATE]] v1-done).
**Rejected:** `server.url` remote-loading the live site (Apple review risk, forfeits bundling); stripping + wrapping only the code-built paths tonight (breaks DB-sourced thumbnails — the language-expansion rule "never half-wire" applies).

## 2026-07-08 — Theme restore comes from profiles.theme only when localStorage is empty; local always wins
**Status:** active — committed `c4ede7a9`
**Decision:** `ThemeProvider` restores the theme from Supabase `profiles.theme` (on mount and on SIGNED_IN) only when `resonance-theme` is absent from localStorage; a present local value always wins, and a successful restore writes back to localStorage. Fixes the one-way sync where `setTheme` wrote to the profile but nothing ever read it (owner's "purple header turned blue" after clearing site data).
**Why:** localStorage is the declared primary store and the most recent explicit choice on the device; the profile is the cross-device/recovery backup. Restoring only into the empty case can never fight a fresh local pick.
**Rejected:** Server-wins on every load (would clobber a newer local choice made while offline/logged-out); making the branded cosmos palette a selectable/default theme (a real design decision the owner hasn't made — cosmos stays a scoped marketing island).

## 2026-07-08 — Speak: mute is a device preference that silences autoplay only; explicit taps always play
**Status:** active — committed `c4ede7a9`
**Decision:** `muted` lives in `useVoiceTutor` (localStorage `speak-tutor-muted`), survives new chat and tutor changes, gates only the two autoplay sites (first greeting, post-reply) with no tap-to-hear fallback while muted; explicit replay taps and "Tap to hear" still play; turning mute ON stops in-flight audio (`stopAllAudio`) and switches listenMode off so the user isn't left with hidden text AND no audio. Grok live realtime is out of scope. Surfaced twice: icon-only Volume2/VolumeX in the conversation header + a written-out "Sound" row in the settings sheet.
**Why:** The owner's ask was "maybe I just want to read it" — a reading mode, not an audio kill-switch; an explicit tap is an unambiguous request to hear. Mute-implies-listen-off prevents a see-nothing-hear-nothing dead state.
**Rejected:** Gating inside `playAudio` itself (would break explicit replays); resetting mute per conversation (it's a device/session preference, like theme).

## 2026-07-08 — Casting screen: Live door is the hero; tutors collapse under it (organic first-visit only)
**Status:** active — implemented in working tree, uncommitted
**Decision:** LiveDoorCard renders as a centered max-w-xl vertical hero (Premium badge kept, deliberately NO quota/limits copy — testers are unlimited on purpose until public use); CharacterGrid sits under a "Browse tutors & voices" accordion (CSS grid-rows 0fr↔1fr animation, reduced-motion guarded) that defaults collapsed only when the Live door is visible and arrival was organic, and defaults expanded for fil / voice-change / the explicit "Choose a different tutor" path; a manual toggle overrides the default for the rest of the visit. Header hover across the app gained the fixed-color brand ramp hairline (gold→vermillion→magenta→plum→white per LingwaveWaves' pinned palette) rather than theme vars.
**Why:** Owner's re-test verdict: live conversation should be the big obvious center; premium separation by presentation, not by quota threats. The expanded-when-no-door rule keeps fil/ceb and recast flows from landing on a collapsed empty screen. Fixed brand colors because the hairline must match the logo PNG, which no theme recolors.
**Rejected:** Quota copy on the door (explicitly deferred); collapsing for the "change tutor" path (user's stated intent there IS the grid).

## 2026-07-07 — Lens confidence is never displayed as a positive signal; the scan is cropped to the reticle
**Status:** active — implemented in working tree (2G hardening pass), uncommitted
**Decision:** Gemini's self-reported confidence stays in the API contract but is UI-internal except for `low`, which renders as an actionable caution pointing at the alternates. The always-on high/medium/low chip is deleted (i18n keys removed in en/de/fr). Complementary input-side fix: `frameToCanvas` crops the scan payload to the reticle circle + 35% context margin (cover-math mapping to intrinsic video pixels; full-frame fallback), the reticle grew to `min(74vw, 23rem)`, and the prompt now carries explicit framing ("subject is the item nearest the center") and calibration rules ("never high when several objects could plausibly be the subject"). The frozen preview stays full-frame.
**Why:** Live QA showed wrong answers ("nightstand", "suit") labeled high-confidence — an uncalibrated self-report shown as a trust marker is worse than no marker in a vocabulary app, and the failure mode that matters (confident-and-wrong) is eliminated by construction when only low can surface. The wrong answers were also partly an input problem: the model saw the whole room while the user aimed at one object.
**Rejected:** Calibrating the self-report (logprobs/multi-pass — high effort, still a soft signal displayed as fact); keeping a "medium" caution (medium is also the server's fallback default — it would spam); cropping hard to the circle with no margin (kills object edges and menu/text scans).

## 2026-07-07 — Lens photo-on-card declined at MVP; "frames never stored" stands
**Status:** decided (owner asked for preparation only; revisit on real user demand)
**Decision:** The captured Lens frame is NOT persisted as the saved card's image. The prepared plan (Opus feasibility study, this session) is on record: it would need a new private bucket + RLS migration, `submit_lens_save` accepting per-item `thumbnail_url`, client upload before the RPC (ProfileModal avatar pattern), delete-account wiring, and — the real cost — reworking the `deck_type`-vs-`thumbnail_url` gating split across DeckView/StudyCanvas and both skins. It also reverses the master plan's "frames never stored" privacy pillar and the planned App Store label ("processed, not stored").
**Why:** A cosmetic card-back photo (often blurry/cluttered at 1024px) is not worth spending the headline privacy promise plus a storage/deletion compliance surface. Most of the memory-anchor value is available for free: the frozen frame is already on screen at save time.
**Rejected (for now):** Client upload into the `videos` bucket (locked to service-role by `20260611120000`, and mixes user media with pipeline media).

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

## 2026-07-12 — Wizard offers every content-bearing language; Polish registered wizard-only
**Status:** active
**Decision:** The home "+ Add language" wizard now includes every language with real content (Polish, Portuguese) plus the Speak-only trio (Dutch, Hindi, Arabic) — 15 total. Polish deliberately does NOT get `isSpeak` (api/ has no 'pl' LANGUAGE_CONFIG; Speak degrades to its language grid). Polish rides the fallback font stack, not the Bebas display stack (Latin-Extended coverage guarantee, same reasoning as Cyrillic).
**Why:** Owner: the guided/Today offering and home must agree; a language with a full A1 course that can't be added from home is a product bug, not a tier choice.
**Rejected:** Flipping `isSpeak` alongside (half-wires Tier 3 → voice-chat 400s); adding landing chips (marketing surface, owner's call).

## 2026-07-12 — New guided languages author the bright vibe only; per-language data modules
**Status:** active
**Decision:** All new guided-lesson content is authored as `vibeVariants: { bright }` only (`fallbackVibeId` covers the rest) — matching Cebuano/Indonesian/Polish precedent and the owner's intent to discontinue vibes as *content* variants (English keeps its authored wistful/sharp; they stay dormant). New guided languages live in per-language modules under `src/data/guided/` (first: `koreanA1.ts`) with type-only imports from `guidedLessons.ts` — the 65k-line monolith stops growing; the dynamic-import chunk boundary is unchanged.
**Why:** 3× authoring cost for variants nobody differentiates; review confirmed only English ever got them. Module seam needed before 5+ more languages land.
**Rejected:** Deleting English wistful/sharp content now (works, no cost to keep); splitting the existing monolith retroactively (churn without need).

## 2026-07-12 — guided-transcribe accepts all guided speak locales
**Status:** active
**Decision:** `api/guided-transcribe.ts` accepts every `GUIDED_TARGET_LANGUAGE_SPEAK_LOCALES` value (incl. ko-KR) via a hand-synced locale→Whisper-hint map; Cebuano (ceb-PH) sends no hint (not Whisper-supported, auto-detect).
**Why:** The client always sends the lesson locale; the old en-US/en-GB gate + hardcoded 'en' Whisper hint silently broke the speak step for 8 of 9 guided languages.
**Rejected:** Importing the locale list from src/ (api/ can't import src/); dropping the language param client-side (loses the accuracy of a correct hint).
