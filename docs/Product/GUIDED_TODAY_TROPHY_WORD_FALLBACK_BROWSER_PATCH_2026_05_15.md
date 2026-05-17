# Guided Today Trophy Word Fallback Browser Patch

Date: 2026-05-15

## 1. Executive verdict

Patch implemented. Missing canonical trophy-song rows no longer make the trophy view unavailable: the selected path/segment/vibe now renders local trophy word cards with a clear non-playable song placeholder.

Authenticated browser QA could not be completed in this local in-app browser session because `/today` redirected to sign-in and no authenticated local app tab was available.

## 2. Root cause

`GuidedCheckpoint` treated `fetchTrophySongCanonical(pathId, segment, vibe)` failure as trophy-view unavailability. That hid local trophy words from `guidedLessons.ts` for paths without generated song rows.

The back action also returned to plain `/today`, and `Today.tsx` initialized the selected path from the default path only, so returning from a P8 trophy route reset the page to P1.

## 3. Files changed

- `frontend/src/pages/GuidedCheckpoint.tsx`
- `frontend/src/pages/Today.tsx`
- `frontend/src/components/today/trophy/TrophySongPanel.tsx`
- `frontend/src/components/today/trophy/TrophyWordFallbackPanel.tsx`
- `frontend/src/lib/guidedTrophy.ts`
- `frontend/src/lib/translations.ts`
- `frontend/scripts/test-guided-trophy-cloze.ts`
- `frontend/scripts/test-guided-path-directory.ts`
- `docs/Product/GUIDED_TODAY_TROPHY_WORD_FALLBACK_BROWSER_PATCH_2026_05_15.md`
- `docs/Product/GUIDED_TODAY_TROPHY_WORD_FALLBACK_SESSION_HANDOFF_2026_05_15.md`

## 4. Before behavior

For P8 trophy/cloze routes with no canonical trophy-song row, the page showed "Trophy songs coming soon" and hid the five trophy words.

Back to path returned to `/today`, which reset selection to P1.

## 5. After behavior

When a canonical song row exists, `TrophySongPanel` still renders the current song/audio/lyrics/cloze flow.

When no song row exists, `TrophyWordFallbackPanel` renders the selected path, vibe, segment, five trophy word cards, and a non-playable "Trophy song coming soon" placeholder.

## 6. Trophy fallback behavior

Fallback words are derived from local lesson data via `getGuidedTrophyWordsForSegment(pathId, segment, vibe)`.

Segment 1 uses lessons 1-5. Segment 2 uses lessons 6-10. Each lesson resolves the selected vibe variant and displays its `trophyWord` with `TrophyWordCard`.

No audio controls, lyric review, or cloze drill are rendered in the fallback.

## 7. Back-to-path behavior

Checkpoint and trophy back links now use `/today?path=<pathId>&vibe=<vibe>`.

`Today.tsx` reads validated `path` and active `vibe` query params on initialization. Invalid path IDs are ignored and `/today` without params still defaults to P1.

## 8. Browser QA results

Attempted local browser QA at `http://127.0.0.1:5173/today`.

Result: blocked by authentication. The in-app browser redirected to sign-in, and `browser.user.openTabs()` showed no existing authenticated local/resonance tab to reuse. No Supabase/backend/auth bypass was used.

Static and build verification covered the route behavior, P8 fallback derivation, and back href construction. Authenticated browser QA should still be run before marking the full A1P1-P10 browser QA pass complete.

## 9. Tests/checks run

- `npx tsx scripts/test-guided-trophy-word-uniqueness.ts` - 13 passed, 0 failed; 16 global repeats warn-only, 0 hard-failed.
- `npx tsx scripts/test-guided-cross-vibe.ts` - 300 pairs, 0 hard fails, 0 warns, 0 trophy collisions.
- `npx tsx scripts/test-guided-today-data.ts` - 8981 passed, 0 failed.
- `npx tsx scripts/test-guided-segment-reviews.ts` - 531 passed, 0 failed.
- `npx tsx scripts/test-guided-path-directory.ts` - 109 passed, 0 failed.
- `npx tsx scripts/test-guided-today-path-overview.ts` - 172 passed, 0 failed.
- `npm run test:guided-today` - passed.
- `npm run check:i18n` - passed; German 1106/1106, known French warn-only gaps remain.
- `npm run build` - passed with existing Vite dynamic-import and chunk-size warnings.

## 10. Remaining issues, if any

Authenticated browser QA remains to be completed because this local in-app browser session was not signed in.

## 11. Whether A1P1-P10 browser QA can continue

Yes, after signing into the local app. The blocking trophy fallback and back-to-path code paths are patched and statically verified.
