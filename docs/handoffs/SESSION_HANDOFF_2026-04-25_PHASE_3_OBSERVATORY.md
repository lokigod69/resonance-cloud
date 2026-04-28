# SESSION HANDOFF — 2026-04-25 — Phase 3 Observability Dashboard Shipped

## Session Summary

Shipped Phase 3 end to end across four commits to `main`. The admin observability dashboard is live: data layer, routing, Ferrari-styled per-word deep-dive with three switchable layouts, failure triage aggregate page, Costs page deleted, `admin_pin` client-side gate removed, plus a polish pass adding final video playback to the deep-dive, simplifying Content row actions, and softening pure white to a warm paper off-white for OLED comfort.

All work pushed directly to `main` per standing preference. No feature branches. No blocking review findings survived the session.

---

## Commits

| SHA | Phase | Summary |
|-----|-------|---------|
| `8ec8890` | 3A | Data layer + routing skeleton + `FerrariAdminLayout` shell. Placeholder pages rendering raw JSON. Admin nav entry, `WordDetailPanel` deep-link. |
| `8f5554a` | 3B | Ferrari styling consumed `DESIGN-ferrari.md`. Three switchable layouts (A·SCROLL chiaroscuro, B·TABS, C·PANELS sidebar). Shared `EventRow`/`EventDetail`/`PromptPanel` primitives. Suno Track A/B players. Failure triage rebuild of aggregate page. |
| `8414f12` | 3C | Deleted Costs admin page entirely. Removed `admin_pin` client-side gate from `AdminRoute.tsx`. `is_admin()` + `admin_roles` + RLS remain the real admin gate. |
| `adae750` | 3B polish | Content row simplified to five icons (eye, flag, play-A-only, Activity → observability, trash). Deep-dive deep-links from Content via Activity icon. Final MP4 embedded above Suno tracks on deep-dive. Pure `#FFFFFF` replaced with warm paper `#F2EFE8` on filled surfaces; strokes and body text stay pure white. |

---

## What the dashboard provides today

### `/admin/observability/aggregate` — Failure triage
- Hero stat band: "N FAILED EVENTS ACROSS M STAGES" (Ferrari Red on the numeral), or "NOTHING HAS FAILED. ALL CLEAR." at zero failures
- Stage filter chips (ALL + one per stage with current failures)
- Per-failure feed rows with timestamp, stage·sub_step, error_type, error_message, model, provider, and OPEN WORD deep-link (or ORPHAN EVENT tag for null word_id)

### `/admin/observability/word/:wordId` — Per-word deep-dive
Top-to-bottom render order:
1. `FailureNotice` (red-bordered, only when events have `status='failed'`)
2. `FinalVideo` (native `<video controls>`, reads `words.video_url`, hides when absent)
3. `SunoTracks` (Track A + Track B `<AudioPlayer>` instances, reads `suno_storage_url` ?? `suno_audio_url`)
4. `AggregatorSnapshot` (collapsed by default, shows `words.metadata` JSONB)
5. Stage sections rendered in the selected layout

Layout selector (persists to `localStorage` under `ferrari-obs:word-layout`):
- **A · SCROLL** — stages stacked vertically, chiaroscuro black/white alternation, editorial magazine rhythm
- **B · TABS** — horizontal tab strip, single content panel, fast scanning
- **C · PANELS** — IDE-style sidebar with stage list, right content area

All three layouts share the same `EventRow` (collapsed one-line header) → `EventDetail` (expanded PromptPanel stack: system_prompt, user_prompt, response_body, metadata, error). Every `PromptPanel` has a COPY button.

### Admin nav
`AppHeader` includes "Observability" entry next to Queue / Profiles / Users / Content / Voices / Metrics. Costs entry and page are gone.

### Admin gate
`AdminRoute.tsx` relies on `is_admin()` RPC + `admin_roles` table + RLS policies only. No client-side PIN prompt. `system_settings.admin_pin` column remains untouched in Supabase (not cleaned up — out of scope).

---

## Adversarial reviews conducted

| Review | Outcome | Action |
|--------|---------|--------|
| 3A review | BLOCK — worktree hygiene, title slot hardcoded, unbounded aggregate reads, failure-notice position | Fix prompt landed: outlet-context title slot (`useFerrariTitle` hook), failed-events moved to first child, `fetchAllEvents` 5000-row cap with `console.warn` on hit |
| 3B review | Skipped — Sir Robert validated visually in browser, no structural concerns |
| 3C review | Skipped — pure deletion, nothing to second-guess |
| 3B polish review | Skipped — scoped polish, direct push |

---

## Files shipped this session

### New
- `frontend/src/layouts/FerrariAdminLayout.tsx`
- `frontend/src/layouts/FerrariAdminLayout.module.css`
- `frontend/src/layouts/ferrari-tokens.css`
- `frontend/src/pages/admin/ObservabilityAggregate.tsx`
- `frontend/src/pages/admin/ObservabilityWordDetail.tsx`
- `frontend/src/lib/observability.ts`
- `frontend/src/components/admin/observability/FailureNotice.tsx`
- `frontend/src/components/admin/observability/AggregatorSnapshot.tsx`
- `frontend/src/components/admin/observability/SunoTracks.tsx`
- `frontend/src/components/admin/observability/FinalVideo.tsx`
- `frontend/src/components/admin/observability/EventRow.tsx`
- `frontend/src/components/admin/observability/EventDetail.tsx`
- `frontend/src/components/admin/observability/PromptPanel.tsx`
- `frontend/src/components/admin/observability/LayoutSelector.tsx`
- `frontend/src/components/admin/observability/variants/WordScrollLayout.tsx`
- `frontend/src/components/admin/observability/variants/WordTabsLayout.tsx`
- `frontend/src/components/admin/observability/variants/WordPanelsLayout.tsx`
- `frontend/src/components/admin/observability/observability.module.css`
- `frontend/src/components/admin/observability/variants/wordLayouts.module.css`

### Modified
- `frontend/src/App.tsx` (routes wired)
- `frontend/src/components/AdminRoute.tsx` (PIN gate removed)
- `frontend/src/components/layout/AppHeader.tsx` (Observability nav entry, Costs entry removed)
- `frontend/src/components/admin/WordDetailPanel.tsx` (deep-link added in 3A, then superseded by Activity icon on Content row)
- `frontend/src/pages/admin/Content.tsx` (row actions simplified to 5 icons including Activity link)

### Deleted
- `frontend/src/pages/admin/Costs.tsx`

---

## Verification status

Dashboard loaded and exercised in browser:
- Content browser Activity icon → deep-dive navigation works
- Layout selector A/B/C all render
- Expand/collapse event rows works
- COPY buttons work on prompts
- Final MP4 player streams
- Track A/B audio plays
- Aggregate page renders failure feed with one current failure (deepseek/deepseek-v4-flash RuntimeError "OpenRouter returned empty content" on `concept.lyrics_combined_llm`, ORPHAN EVENT — no word_id)
- Non-observability admin pages (Queue, Profiles, Users, Content, Metrics, Voices) unchanged visually

### Verification gaps (non-blocking)
- RLS browser-check for non-admin session never completed live by agent (Node version mismatch on in-app browser plugin) — code-verified by migration inspection only. Sir Robert can confirm post-session by opening an incognito tab on the two routes.
- ESLint run was not part of `npm run build` here; type errors are clean but lint warnings beyond baseline were not independently verified.

---

## Observations captured during live use

### The deepseek v4-flash empty-content failure
One row in the failure triage feed: `concept.lyrics_combined_llm` returned empty content from OpenRouter, model `deepseek/deepseek-v4-flash`, provider `openrouter`. Event is an ORPHAN EVENT — `word_id` is null on this row, so no deep-link target exists.

This is actionable — the first real payoff of the dashboard surfacing production LLM pathology. Needs investigation next session.

### Zero concept events on some words
Sir Robert observed that a specific word's deep-dive showed `concept` stage as `0 events` even though generation completed (images, video, assembly, bookend all populated). The aggregate page confirms `concept.*` sub_steps fire for other words. Two candidate root causes to investigate:
1. Word was generated before Phase 2B concept instrumentation landed (orphaned pre-instrumentation rows).
2. Word used `reliable` lyric mode — which per memory is the template-only path that makes zero LLM calls — and therefore emits zero events by correct behavior, not bug.

If (2), the deep-dive should show a clearer "template-only generation, no LLM calls" notice rather than "NO EVENTS RECORDED", to distinguish "correctly silent" from "instrumentation gap."

### Scene images are not persisted
Confirmed intentional architecturally: `render_scene` image artifacts are consumed by the video stage and discarded; only the final MP4 is stored. No scene-image gallery exists on the deep-dive by design. If per-scene image review ever becomes valuable, that's a separate engine change — persist to Supabase Storage with references on the events.

### ORPHAN EVENT dead-end UX
The failure feed's ORPHAN EVENT rows currently have no click target. That's correct per spec (no word_id → no deep-link), but leaves the row feeling like a dead end. A "view raw event" modal or tooltip explaining why would be a polish follow-up.

### Plural bug in hero stat band
"1 FAILED EVENTS ACROSS 1 STAGES" — cosmetic plural bug. Should read "1 FAILED EVENT ACROSS 1 STAGE." Minor.

---

## Git state at session end

| Repo | Branch | Last SHA | Status |
|------|--------|----------|--------|
| `lokigod69/resonance-cloud` | main | `adae750` | Pushed, Vercel deploying |

During 3B polish push, remote advanced with `192cb34 Instrument Grok audio volume diagnostics` from a parallel agent stream. Rebased cleanly on top, no conflicts. Unrelated local Speak changes (`PlayerBar.tsx`, `useMusicPlayer.ts`) and untracked artifacts (`INVESTIGATION_REPORT_*`, `REVIEW_REPORT_*`, `phase3-*.png`) remain unstaged and outside 3-series scope.

---

## Process notes / learnings

- **Three-prompt split worked.** Phase 2B was a monolithic scope creep. Phase 3 split into 3A (skeleton) → 3B (styling) → 3C (deletions) + polish pass, each with its own investigation or direct scope, reviewed or bypassed appropriately, no collisions.
- **Adversarial review not always needed.** 3C deletion and 3B polish both shipped without review because the changes were either pure deletion or narrowly scoped polish. Review discipline stays absolute for structural/data-layer work; mechanical work can skip.
- **UX mental model matters as much as code.** Sir Robert's confusion on first dashboard load ("why do I only see failure triage, where are the layouts?") was because two pages exist serving two purposes, and the path between them wasn't obvious enough. Activity icon on Content rows closed that loop. Worth remembering: when a feature has two pages, always provide a visible, discoverable path between them, not just a spec-compliant deep-link buried in a side panel.
- **OLED pure-white is genuinely retina-burning.** `#F2EFE8` warm paper off-white is a better default for any future full-bleed white surface. Keep pure white for strokes and body text only.
- **Reviewing agent can't complete live browser checks.** Multiple sessions have hit the "Node version mismatch in in-app browser" gap. Budget for Sir Robert to perform the non-admin/admin smoke test manually when RLS is involved — don't rely on the agent's sandboxed browser.

---

## Reports generated this session

At repo root (local, untracked):
- `INVESTIGATION_REPORT_IMAGE_ROUTER.md` (unrelated parallel work)
- `INVESTIGATION_REPORT_V4_FLASH_404.md` (unrelated parallel work)
- `REVIEW_REPORT_MUSIC_COSMETIC.md` (unrelated parallel work)
- `frontend/phase3-debug.png`
- `frontend/phase3-water-desktop.png`
- `frontend/phase3-water-mobile.png`

None committed. Session artifacts.

---

## Immediate next steps

1. **Manual RLS smoke test** (Sir Robert, post-session): open `/admin/observability/aggregate` in incognito or non-admin account. Confirm bounce to login / `/`.
2. **Generate one new word** with a profile likely to exercise all stages, then open the deep-dive and walk through all three layouts. Form opinions. If one layout wins permanently, the other two can be dropped in a future cleanup.
3. **Investigate the deepseek v4-flash empty-content failure** — next session's first task. See continuation prompt.
4. **Investigate zero-concept-events words** — determine whether root cause is pre-instrumentation history or `reliable`-mode correctness. See continuation prompt.
5. **Suno permanent storage backfill** — unrelated to 3-series but genuinely time-sensitive (Suno CDN URLs expire ~14 days). Worth starting soon in its own chat.

---

## Parked / deferred

- `FUTURE_FIX_GENERATION_JOB_ID_GAP.md` — `words` table missing `generation_job_id` column; all pipeline_events rows still have `job_id=NULL`. Deferred until regeneration is rebuilt.
- `FUTURE_FIX_CONCEPT_DEV_TREE_PARITY.md` — `engines/concept-engine/src/` packaging prevents dev-runtime events reaching `pipeline_events`. Shared library extraction needed when this becomes important.
- Scene image persistence — not implemented, intentional. Reconsider if per-scene review becomes product-relevant.
- Orphan event "view raw" modal — polish follow-up.
- Hero band plural-agreement fix — polish follow-up.
- `system_settings.admin_pin` column cleanup in Supabase — PIN gate code is gone but the column remains. Drop in a future DB cleanup migration.
- Proper cost dashboard — 3C removed the buggy one. Rebuild when cost semantics are locked and paying users exist. `cost_events` table and backend emission retained for future use.

End of handoff.
