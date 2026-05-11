# Guided Today Vibe V0 Implementation Report

Date: 2026-05-11

## Summary

Guided Today now has the static architecture for launch vibes. Lesson 1 remains local-only and playable, but its source data is now split into invariant lesson fields plus active vibe variants for Bright, Wistful, and Sharp.

## Files Changed

- `frontend/src/data/guidedVibes.ts`
- `frontend/src/data/guidedLessons.ts`
- `frontend/src/lib/todayVibe.ts`
- `frontend/src/pages/Today.tsx`
- `frontend/src/components/today/TodayHero.tsx`
- `frontend/src/components/today/TodaySession.tsx`
- `frontend/src/lib/translations.ts`
- `frontend/scripts/test-guided-today-data.ts`
- `frontend/scripts/test-guided-vibes.ts`
- `docs/Product/GUIDED_TODAY_VIBE_SYSTEM_ARCHITECTURE.md`
- `docs/Product/GUIDED_TODAY_VIBE_CHARACTER_BIBLES.md`
- `docs/Product/GUIDED_TODAY_VIBE_CONTENT_GENERATION_WORKFLOW.md`
- `docs/Product/GUIDED_TODAY_VIBE_V0_IMPLEMENTATION_REPORT.md`

## Data Model Added

Added `guidedVibes` with:

- active ids: `bright`, `wistful`, `sharp`
- future ids: `tender`, `bold`, `cheeky`
- bible fields for palette, phrasings, examples, scene mood, music genre, UI aesthetic, and trophy candidates

Updated `guidedLessons` so the static lesson definition carries:

- invariant lesson metadata
- `pedagogicalGoal`
- `modeSet`
- `steps`
- `estimatedMinutes`
- `fallbackVibeId`
- `vibeVariants`

The resolver materializes the existing UI-facing lesson fields from the selected variant so the current session components keep working.

## Active Vibe Resolution

`getSelectedGuidedVibe(pathId)` reads:

```text
resonance_guided_vibe__english-a1-practical
```

Invalid, missing, and future values resolve to `bright`.

`setSelectedGuidedVibe(pathId, vibeId)` stores only an active resolved value. Future ids cannot become active UI selections.

## Lesson 1 Migration

Bright preserves the current Lesson 1 behavior:

```text
Excuse me, do you speak English?
```

Wistful and Sharp have V0 draft variants:

```text
Sorry, do you speak English?
Can you speak English?
```

All three variants include chunks, build chips, type recall, speak target, scene caption, trophy word, visual notes, and reserved song seed.

## UI Added

`/today` now:

- resolves the selected vibe before resolving the current lesson
- shows a small active voice indicator
- renders a three-card Bright/Wistful/Sharp picker
- stores selection locally only
- resets the in-page active session when the learner changes vibe
- keeps lesson completion independent from the selected vibe
- shows a trophy word panel in the Scene step

## Still Static And Local-Only

This pass did not add backend persistence. It did not write any Supabase schema or app data tables.

Local storage now holds:

- existing user-scoped Today progress
- one selected vibe id per path

It does not store raw typed answers, raw speech transcripts, private speech data, or per-vibe progress.

## Deliberately Not Built

- Supabase migrations or schema
- runtime LLM generation
- generated lesson inventory
- credits or pricing changes
- deck, word, or `generation_jobs` writes
- provider calls
- ElevenLabs, KIE, Suno, or paid-provider integration
- Music internals
- Study internals
- Speak internals
- broad app skin/theme system
- full Lesson 2 content

## Checks Run

Checks run:

- `npx tsx scripts/test-guided-vibes.ts`
- `npx tsx scripts/test-guided-today-data.ts`
- `npm run check:i18n`
- `npm run build`
- `npx eslint src/pages/Today.tsx src/components/today/TodayHero.tsx src/components/today/TodaySession.tsx src/data/guidedLessons.ts src/data/guidedVibes.ts src/lib/todayVibe.ts src/lib/translations.ts scripts/test-guided-today-data.ts scripts/test-guided-vibes.ts`
- `git diff --check`
- `git diff --cached --check`

Browser smoke:

- Local Vite server started at `http://127.0.0.1:5178/`.
- Opening `/today` without a local authenticated session redirected to `/login`.
- Authenticated visual QA was not completed because no local test session credentials were available.

## Known Risks

- Wistful and Sharp Lesson 1 copy is draft content, not final authored curriculum.
- The picker is intentionally simple and not yet part of onboarding.
- The path-scoped storage key works for V0. Product may later prefer target-language scoping across multiple English paths.
- Authenticated browser QA still depends on having a real local session.

## Next Recommended Prompt

```text
Generate Bright variants for English A1 Practical lessons 1-10.

Use docs/Product/GUIDED_TODAY_VIBE_CHARACTER_BIBLES.md, Bright section, verbatim as the voice bible.
Base language: German.
Target language: English.
Keep every phrase A1 practical and usable.
Generate only Bright, not Wistful or Sharp.
Return TypeScript-shaped GuidedLessonVibeVariant objects.
Use only Bright trophy word candidates unless you explicitly justify a compatible adjacent word.
After generation, run:
"Does this read as Bright or generic? Quote three lines that prove the vibe is present, or flag if missing."
```
