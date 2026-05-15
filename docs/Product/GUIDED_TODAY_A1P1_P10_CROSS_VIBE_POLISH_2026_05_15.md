# Guided Today A1P1-P10 Cross-Vibe Polish

Date: 2026-05-15

## Files changed

- `frontend/src/data/guidedLessons.ts`
- `docs/Product/GUIDED_TODAY_A1P1_P10_CROSS_VIBE_POLISH_2026_05_15.md`
- `docs/Product/GUIDED_TODAY_A1P1_P10_CROSS_VIBE_POLISH_SESSION_HANDOFF_2026_05_15.md`

## Warning cases reviewed

All 12 warning-level targetText similarities from the consolidation handoff were reviewed:

- `english-a1-practical-2` lesson 1 Bright/Sharp targetText score `0.730`
- `english-a1-practical-2` lesson 3 Bright/Wistful targetText score `0.714`
- `english-a1-practical-3` lesson 8 Bright/Wistful targetText score `0.708`
- `english-a1-practical-7` lesson 4 Bright/Wistful targetText score `0.739`
- `english-a1-practical-7` lesson 6 Bright/Wistful targetText score `0.765`
- `english-a1-practical-7` lesson 8 Bright/Wistful targetText score `0.704`
- `english-a1-practical-8` lesson 1 Bright/Wistful targetText score `0.714`
- `english-a1-practical-8` lesson 1 Bright/Sharp targetText score `0.800`
- `english-a1-practical-8` lesson 6 Bright/Sharp targetText score `0.714`
- `english-a1-practical-9` lesson 1 Bright/Wistful targetText score `0.727`
- `english-a1-practical-9` lesson 1 Bright/Sharp targetText score `0.750`
- `english-a1-practical-9` lesson 4 Bright/Wistful targetText score `0.720`

## Variants changed

11 targeted variants changed. No path ids, lesson ids, lesson order, path exposure, review logic, segment stories, trophy song/client code, backend, Supabase, category practice, language expansion, or A2 files were changed.

## Before/after targetText summary

| Path | Lesson | Vibe | Before | After |
| --- | ---: | --- | --- | --- |
| `english-a1-practical-2` | 1 | Sharp | `I don't understand. Help me, please.` | `I need help. I don't understand.` |
| `english-a1-practical-2` | 3 | Wistful | `Could you show me here, please?` | `Could you point to it here?` |
| `english-a1-practical-3` | 8 | Wistful | `Is it just by the corner?` | `Is it near the quiet corner?` |
| `english-a1-practical-7` | 4 | Wistful | `Am I on the right train?` | `Is this my train?` |
| `english-a1-practical-7` | 6 | Wistful | `Could we go there, please?` | `Could we go there slowly?` |
| `english-a1-practical-7` | 8 | Wistful | `I need to go to the station.` | `Could we go slowly to the station?` |
| `english-a1-practical-8` | 1 | Wistful | `I think I have a reservation.` | `Could you check my reservation?` |
| `english-a1-practical-8` | 1 | Sharp | `I have a reservation here.` | `Here is my reservation.` |
| `english-a1-practical-8` | 6 | Sharp | `Please show me the bathroom.` | `Show me the way to the bathroom, please.` |
| `english-a1-practical-9` | 1 | Bright | `Nice to meet you.` | `Hi, I'm glad we can meet.` |
| `english-a1-practical-9` | 4 | Wistful | `What time is good for you?` | `Is there a good time for you?` |

## Alignment changes

- Trophy word metadata was preserved for every changed variant.
- German `baseText` was updated for every changed variant to match the revised English phrase.
- Phrase chunks, build chips, and type recall cloze data were updated for every changed variant.
- Speak data remains generated from each variant's revised `targetText` and `baseText` through the existing `createA1P2Variant` path.

## Final cross-vibe result

`npx tsx scripts/test-guided-cross-vibe.ts` reports:

- Pairs scanned: 300
- Hard failures: 0
- Warning-level similarities: 0
- Trophy collisions: 0
- Allowlist hits: 2

The two allowlist hits are unchanged existing intentional cases:

- `english-a1-practical-2` lesson 9 Bright/Sharp
- `english-a1-practical-5` lesson 4 Bright/Wistful

## Remaining warnings and rationale

No warning-level cross-vibe similarities remain after this pass.

## Tests/checks run

- `git fetch origin`
- `git checkout main`
- `git pull --ff-only origin main`
- `git status -sb`
- `git log --oneline --decorate -15`
- `git rev-parse HEAD`
- `git rev-parse origin/main`
- `npx tsx scripts/test-guided-cross-vibe.ts`
- `npx tsx scripts/test-guided-today-data.ts`
- `npx tsx scripts/test-guided-segment-reviews.ts`
- `npx tsx scripts/test-guided-path-directory.ts`
- `npx tsx scripts/test-guided-today-path-overview.ts`
- `npm run test:guided-today`
- `npm run check:i18n` - passed with the known existing French warn-only gaps.
- `npm run build` - passed with existing Vite warnings for dynamic import/chunk size.

Final whitespace checks are run before commit:

- `git diff --check`
- `git diff --cached --check`

## Recommended next step

Run authenticated browser QA for `/today`, including the P1-P10 path directory, P1 and P10 selection/start/overview, P9/P10 overviews, Segment Review 1 and 2, Path Check, Quick Review gating, and mobile-ish layout if possible.
