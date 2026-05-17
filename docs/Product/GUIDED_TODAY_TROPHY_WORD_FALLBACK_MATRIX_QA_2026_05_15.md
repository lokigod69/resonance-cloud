# Guided Today Trophy Word Fallback Matrix QA

Date: 2026-05-15

## 1. Executive verdict

Static matrix QA passed for the full Guided Today A1P1-A1P10 trophy fallback surface.

All 60 fallback states were verified:

- 10 paths
- 2 trophy segments
- 3 active vibes

Each state returned exactly five trophy word cards, for 300 total verified trophy-card cases. No selected-path state fell back to the P1 five-card tuple, no segment dropped a lesson, and no segment produced duplicate `TrophyWordCard` keys.

Authenticated browser QA remains blocked in this local browser session because `/today` loads the sign-in screen and no authenticated local app tab is available to reuse.

## 2. Files changed

- `frontend/scripts/test-guided-trophy-fallback-matrix.ts`
- `frontend/package.json`
- `docs/Product/GUIDED_TODAY_TROPHY_WORD_FALLBACK_MATRIX_QA_2026_05_15.md`

## 3. Static matrix result

Passed.

The new deterministic matrix script verifies every A1P1-A1P10 path, both trophy segments, and all three active vibes:

- `getGuidedTrophyWordsForSegment(pathId, segment, vibe)` returns exactly 5 words for every combination.
- Segment 1 maps to lessons 1-5.
- Segment 2 maps to lessons 6-10.
- Every trophy word has non-empty `word`, `meaning`, `example`, and `whyThisWord`.
- Returned words match the selected path, selected segment, and selected vibe in lesson order.
- Non-P1 paths do not return the P1 five-card tuple.
- No fallback state drops a lesson.
- No five-card segment has duplicate React card keys.

## 4. Total trophy fallback states checked

60 states checked.

## 5. Total trophy cards checked

300 trophy cards checked.

## 6. Per-path segment/vibe coverage table

| Path | Segment 1 coverage | Segment 2 coverage | Total |
| --- | --- | --- | --- |
| `english-a1-practical-1` | 3 vibes / 15 cards | 3 vibes / 15 cards | 6 states / 30 cards |
| `english-a1-practical-2` | 3 vibes / 15 cards | 3 vibes / 15 cards | 6 states / 30 cards |
| `english-a1-practical-3` | 3 vibes / 15 cards | 3 vibes / 15 cards | 6 states / 30 cards |
| `english-a1-practical-4` | 3 vibes / 15 cards | 3 vibes / 15 cards | 6 states / 30 cards |
| `english-a1-practical-5` | 3 vibes / 15 cards | 3 vibes / 15 cards | 6 states / 30 cards |
| `english-a1-practical-6` | 3 vibes / 15 cards | 3 vibes / 15 cards | 6 states / 30 cards |
| `english-a1-practical-7` | 3 vibes / 15 cards | 3 vibes / 15 cards | 6 states / 30 cards |
| `english-a1-practical-8` | 3 vibes / 15 cards | 3 vibes / 15 cards | 6 states / 30 cards |
| `english-a1-practical-9` | 3 vibes / 15 cards | 3 vibes / 15 cards | 6 states / 30 cards |
| `english-a1-practical-10` | 3 vibes / 15 cards | 3 vibes / 15 cards | 6 states / 30 cards |

## 7. Back-link preservation result

Passed statically.

The matrix script verified the generated expected back-link shape for every path/vibe pair:

`/today?path=<pathId>&vibe=<vibe>`

Source checks also confirm:

- Segment Review links preserve path, segment, and vibe.
- Trophy/cloze links preserve path, segment, and vibe.
- Path Check links preserve path and vibe.
- Quick Review checkpoint links preserve path and vibe.
- `GuidedCheckpoint` passes the preserved back href into both the canonical song panel and fallback panel.

## 8. Today query-param initialization result

Passed statically.

Verified cases:

- `/today?path=english-a1-practical-8&vibe=bright` resolves P8 Bright.
- `/today?path=english-a1-practical-10&vibe=sharp` resolves P10 Sharp.
- Invalid path ids are rejected and fall back safely.
- Invalid vibes are rejected and fall back safely to the active/default vibe path.
- Plain `/today` still defaults to P1.

## 9. Fallback-vs-song behavior result

Passed statically.

Verified behavior:

- Existing canonical trophy song rows still resolve and continue through `TrophySongPanel`.
- Missing canonical rows throw the typed unavailable error.
- Missing song rows do not prevent local fallback trophy words from resolving.
- `TrophyWordFallbackPanel` renders local `TrophyWordCard` cards from `getGuidedTrophyWordsForSegment`.
- The fallback panel renders a non-playable "Trophy song coming soon" placeholder.
- The fallback panel does not render `TrophySongPlayer`, `<audio>`, or `TrophyLyricClozeDrill`.

## 10. Authenticated browser QA result

Blocked.

The dev server was started at `http://127.0.0.1:5173`. Opening `http://127.0.0.1:5173/today?path=english-a1-practical-8&vibe=bright` in the in-app browser loaded the app but showed the unauthenticated sign-in form:

- "Welcome back"
- "Sign in to your account"
- "Continue with Google"
- Email/password fields

`browser.user.openTabs()` returned no existing authenticated local/resonance tab to reuse. No auth, Supabase, backend, or localStorage bypass was used.

Because authentication was blocked, the requested manual browser matrix for P1-P10, P1/P6/P8/P10 all-vibe deep checks, and back-button interaction checks could not be honestly marked as passed.

## 11. Mobile-ish QA result

Blocked by the same authentication state.

No authenticated trophy fallback page could be opened in-browser, so narrow-viewport visual checks for overflow, wrapping, reachable back button, and grid behavior remain a manual follow-up after sign-in.

## 12. Issues found

No deterministic fallback, back-link, query-param, or fallback-vs-song logic issues were found.

Browser QA blocker: local in-app browser is unauthenticated.

## 13. Fixes applied, if any

No production-code fix was required.

Added deterministic matrix coverage and wired it into `npm run test:guided-today`.

## 14. Tests/checks run

- `npx tsx scripts/test-guided-trophy-fallback-matrix.ts` - 1569 passed, 0 failed; 60 states and 300 cards verified.
- `npx tsx scripts/test-guided-trophy-cloze.ts` - 41 passed, 0 failed.
- `npx tsx scripts/test-guided-trophy-word-uniqueness.ts` - 13 passed, 0 failed; 16 global repeat labels remain warn-only, 0 hard-failed.
- `npx tsx scripts/test-guided-cross-vibe.ts` - 300 pairs, 0 hard fails, 0 warns, 0 trophy collisions.
- `npx tsx scripts/test-guided-today-data.ts` - 8981 passed, 0 failed.
- `npx tsx scripts/test-guided-segment-reviews.ts` - 531 passed, 0 failed.
- `npx tsx scripts/test-guided-path-directory.ts` - 109 passed, 0 failed.
- `npx tsx scripts/test-guided-today-path-overview.ts` - 172 passed, 0 failed; existing weak-generic lesson-item notices only.
- `npm run test:guided-today` - passed, including the new fallback matrix script.
- `npm run check:i18n` - passed; German 1106/1106, known French warn-only gaps remain.
- `npm run build` - passed with existing Vite dynamic-import and chunk-size warnings.
- `git diff --check` - passed.
- `git diff --cached --check` - passed.

## 15. Whether all P1-P10 trophy words are now confirmed visible

Confirmed by deterministic local fallback logic for all P1-P10 paths, both segments, and all three active vibes.

Not confirmed by authenticated browser interaction because local browser auth is blocked.

## 16. Remaining risks

Authenticated browser QA still needs to be run after sign-in to confirm the visual and interaction layer:

- P1-P10 segment 1 and segment 2 trophy pages.
- P1, P6 or P7, P8, and P10 across all three active vibes.
- Back to path preserving selected path and vibe in the browser.
- Mobile-ish trophy fallback layout.
