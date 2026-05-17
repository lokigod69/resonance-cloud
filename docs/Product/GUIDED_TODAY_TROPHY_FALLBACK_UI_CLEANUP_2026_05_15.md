# Guided Today Trophy Fallback UI Cleanup - 2026-05-15

## 1. Executive verdict

The trophy fallback UI has been simplified so it reads like a learner-facing trophy screen instead of an internal QA/status page.

The fallback still renders trophy words from the selected path, segment, and vibe, and the existing matrix coverage remains green across the 60 fallback states and 300 trophy cards.

## 2. Files changed

- `frontend/src/components/today/trophy/TrophyWordFallbackPanel.tsx`
- `frontend/src/components/today/trophy/TrophySongPanel.tsx`
- `frontend/src/lib/translations.ts`
- `frontend/scripts/test-guided-trophy-fallback-matrix.ts`
- `docs/Product/GUIDED_TODAY_TROPHY_FALLBACK_UI_CLEANUP_2026_05_15.md`

## 3. Before UI

The fallback screen showed learner-facing trophy cards, but also displayed Path, Voice, and Segment metadata pills, a segment kicker, and extra explanatory copy. This made the screen feel like a diagnostic or QA state rather than a normal product surface.

The canonical song panel also exposed metadata/status pills around style, voice, segment, and audio status.

## 4. After UI

The fallback screen now contains:

1. Back button.
2. Simple title: "Your trophy words".
3. Five trophy word cards.
4. Simple non-playable song placeholder:
   - "Trophy song coming soon"
   - "Your song will appear here when audio is ready."

The canonical song panel keeps the real player, lyrics review, cloze drill, and trophy word cards, but no longer shows the debug-style metadata pills.

## 5. Metadata removed

Removed from the fallback screen:

- Path metadata pill
- Voice metadata pill
- Segment metadata pill
- Segment kicker copy
- Trophy/status badge
- Extra explanatory paragraph above the word cards

Removed from the canonical song panel:

- Style metadata pill
- Voice metadata pill
- Segment metadata pill
- Audio status metadata pill
- Trophy/status badge

## 6. Trophy words still visible

The fallback still uses `getGuidedTrophyWordsForSegment(pathId, segment, vibe)` and renders each returned word with `TrophyWordCard`.

The static matrix test confirmed:

- 60 fallback states checked.
- 300 trophy cards checked.
- P1-P10 covered.
- Segment 1 and segment 2 covered.
- Bright, Wistful, and Sharp covered.

## 7. Song placeholder behavior

The fallback placeholder is non-playable. It does not render `TrophySongPlayer`, an `<audio>` element, or the cloze drill when a canonical song row is missing.

The canonical song flow still renders `TrophySongPlayer` when a canonical song row exists.

## 8. Back-to-path behavior

Back links continue to preserve selected path and vibe via `/today?path=<pathId>&vibe=<vibe>`.

The matrix test still covers back-link preservation for every path/vibe pair.

## 9. Browser QA result

Authenticated browser QA was blocked in this environment. Opening `/today?path=english-a1-practical-8&vibe=bright` on the local dev server redirected to `/login`, and no test credentials were available in-session.

Because of that, the browser pass did not claim authenticated visual QA coverage.

## 10. Mobile-ish QA result

Mobile-ish browser QA was also blocked by the same authentication redirect. The updated fallback layout is structurally simpler than the previous version: a single title, responsive trophy-card grid, and one placeholder block.

## 11. Tests/checks run

- `npx tsx scripts/test-guided-trophy-fallback-matrix.ts`
- `npx tsx scripts/test-guided-trophy-cloze.ts`
- `npx tsx scripts/test-guided-trophy-word-uniqueness.ts`
- `npx tsx scripts/test-guided-cross-vibe.ts`
- `npx tsx scripts/test-guided-today-data.ts`
- `npx tsx scripts/test-guided-segment-reviews.ts`
- `npx tsx scripts/test-guided-path-directory.ts`
- `npx tsx scripts/test-guided-today-path-overview.ts`
- `npm run test:guided-today`
- `npm run check:i18n`
- `npm run build`
- `git diff --check`
- `git diff --cached --check`

Notes:

- `check:i18n` exits 0 and still reports known French warn-only gaps.
- `build` exits 0 and still reports existing Vite dynamic-import/chunk-size warnings.
- `test:guided-today` exits 0; the current dirty local `package.json` also runs a TTS inventory check that reports missing voice profiles as warnings. That package change is unrelated and was not staged.

## 12. Remaining issues, if any

No code issue remains from this cleanup pass.

Authenticated browser QA remains the next manual verification step once a logged-in local session or test credentials are available.
