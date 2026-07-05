# Current State
Last updated: 2026-07-06

## What this is
Lingwave, a cloud-first language-learning app (guided lessons, SRS cards, AI music, voice tutor). Live frontend in `frontend/` (Vercel + Supabase); Python generation backend (`job_runner.py`, `src/`, `cloud_engines/`) on Railway. Target: TestFlight/private beta this month (July 2026).

## Working now
- Frontend product surface: guided Today mission, dashboard (glassy + classic skins), decks/study modes (image, audio, flashcard, canvas), music (level-song / song-only), Speak voice tutor, games hub, admin suite. Actively developed (last commit 2026-07-04, landing redesign).
- Cloud generation pipeline: `job_runner.py` v2 pipelined orchestrator + `src/orchestration/*` workers + in-process `src/cloud_dispatcher.py` → `cloud_engines/*`. Orchestration last active 2026-06-28.
- Phase 1 stabilization program (docs/Stabilization/): role/credit hardening, RPC-only invite redemption, atomic `submit_generation` + `request_word_retry`, worker `pre_bootstrap`. Has a `PHASE1_FINAL_CLOSEOUT_REPORT.md`.
- Static thematic TTS batches (es/de/fr/ceb/id/ko), Capacitor iOS shell readiness work landed.
- **Script Lab / Alphabet module (2026-07-06):** `/alphabet` teaches writing systems; Korean/Hangul V1 live (47 symbols, Learn/Build/Quiz, browser-speech audio). Registry-driven — new scripts are data packs (`.claude/skills/add-script-lab-language`). Docs: `docs/Product/FABLE_SCRIPT_LAB_ARCHITECTURE.md` + Hangul spec + audio plan. All checks green; manual mobile QA pending.

## In progress
- **Launch-readiness cleanup pass (session A, 2026-07-06): DONE.** Video lane hidden (`VIDEO_LANE_ENABLED` in `lib/productFlags.ts`, commit 6b5991ce); ~2,000 lines provably dead code removed (ade651bc, baaeea7c); video-era study copy fixed in 3 locales (b749a300); README rewritten. Decision docs: `docs/Refactors/FABLE_{CODE_CLEANUP_AUDIT_REPORT,VIDEO_DEPRECATION_BOUNDARY,SAFE_CLEANUP_PATCH_PLAN}.md`. (Codex packet was never delivered — runtime wedged twice; findings folded into the audit report.)
- **TestFlight UX-coherence pass (session B, 2026-07-06):** audit complete, 4 plan docs in `docs/Product/FABLE_*.md`, first 7 small UI fixes landed (study i18n/colors, speak accent gating via new `frontend/src/lib/speakCuration.ts`). Next: Speak Phase 1 re-skin + Phase 2 curation, StudyCardFrame/SessionComplete extraction (see plan docs).
- Video product direction: deprecated user-facing, backend pipeline kept (see [[DECISIONS]]).

## Known problems
- Root-level clutter: one-off scripts/artifacts (`resonance_arch_compare_pack/`, `investigation/`, `manual_repair_enrichment_wedged_words.sql`, `ADVERSARIAL_REVIEW_*`, `start*.bat`, `recent-workspaces.json`). Deferred (L5 in patch plan) pending owner archive/delete call.
- Duplicated skin page pairs (classic vs PG/GO variants) — same routes, two component sets chosen in `App.tsx` by `skin === 'glassy'`; divergence risk. Blocked on glassy-only-for-beta decision (L1).
- Video/pipeline Python core frozen since ~2026-04-30 — treat as legacy-stable; don't refactor casually.
- `start_cloud.py:66-89` hard-requires video-era `POD_URL`/`POD_AUTH_TOKEN` at boot — unsetting them in Railway kills card/music generation (L4).
- The `videos` Supabase bucket holds card PNGs too (`card_worker.py:710-783`) — never "clean up" that bucket as video-only (L6).
- Admin Profiles voice/LoRA pickers call local-DAW endpoints via `src/api.ts` that 404 in production (admin-only; inventory note).

## Open questions
- Landing experiment routes `/a`, `/b`, `/landing/*` publicly routable — gate or keep? (session B's call)
- Glassy-only for beta — owner sign-off pending (see DECISIONS 2026-07-06 proposed entry).

## Next actions
1. UX pass follow-ups (docs/Product/FABLE_* plans): Speak Phase 1 palette re-skin → Phase 2 curation; StudyCardFrame + SessionComplete extraction; gate landing experiment routes; decide glassy-only-for-beta (owner sign-off).
2. Script Lab follow-ups: owner mobile/visual QA of /alphabet; audio asset batch (needs explicit approval — see audio plan doc); dashboard tile entry point; first reuse proof (Cyrillic or Kana data pack via the add-script-lab-language skill).
3. Cleanup later-pass items live in `docs/Refactors/FABLE_SAFE_CLEANUP_PATCH_PLAN.md` (L1–L8) — pick up L2 (unreachable video wizard steps) on the next wizard touch.
4. Explicitly deferred: Stripe/iOS work, tutor-catalog Phase 3, Study 2×2 file consolidation, PG/classic consolidation, any Supabase schema changes.
