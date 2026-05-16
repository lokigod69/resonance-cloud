# Guided Today A1 Practical P1-P10 — Global Trophy De-duplication Patch

Date: 2026-05-15
Branch: `main`
Local repo: `D:\CODING\ResonanceTEST\orchestrator`

## 1. Executive Verdict

**PASS — global dedup target met.**

- **300 active trophy cells** scanned. All cells present, all fields populated.
- **0 missing trophy fields.**
- **0 empty trophy fields.**
- **0 same-lesson cross-vibe trophy collisions.**
- **0 within-path duplicate trophy words** across all 10 paths × 30 cells. All earlier exact-cell within-path allowlist entries were eliminated by patching one of each duplicate pair.
- **0 trophy words appearing more than 3 times globally** — the new hard-fail threshold.
- **16 global repeat labels remain** (down from 54 at audit start), all 2-cell repeats reported as warn-only. The brief's ambitious "under 20" target is met; the "under 10 better case" target was not pursued because the remaining 16 are mostly vibe-palette signature words (Bright: `lovely`; Wistful: `again`, `gently`, `kindly`, `lost`, `perhaps`, `quiet`, `softly`, `soon`; Sharp: `confirmed`, `correct`, `fixed`, `settled`) whose further reduction would degrade A1 naturalness and vibe identity.
- **Cross-vibe distinctness** remains 300 pairs / 0 hard fails / 0 warns / 0 trophy collisions.
- **All read-only test suites pass.** Browser QA can proceed.

## 2. Files Changed

- [frontend/src/data/guidedLessons.ts](../../frontend/src/data/guidedLessons.ts) — trophy data for ~84 cells patched (word, meaning, example, and whyThisWord updated coherently per cell). No targetText, baseText, chunks, targetChips, distractors, typeRecall, sceneCaption, lessonItems, songSeed, or visualNotes touched.
- [frontend/scripts/test-guided-trophy-word-uniqueness.ts](../../frontend/scripts/test-guided-trophy-word-uniqueness.ts) — extended thresholds (hard-fail at >3 cells globally; warn at >1 cell). Within-path and cross-path allowlists pruned to empty after dedup; structure preserved for future product-approved exact-cell exceptions.
- [docs/Product/GUIDED_TODAY_A1P1_P10_GLOBAL_TROPHY_DEDUP_PATCH_2026_05_15.md](GUIDED_TODAY_A1P1_P10_GLOBAL_TROPHY_DEDUP_PATCH_2026_05_15.md) — this report.
- [docs/Product/GUIDED_TODAY_A1P1_P10_GLOBAL_TROPHY_DEDUP_SESSION_HANDOFF_2026_05_15.md](GUIDED_TODAY_A1P1_P10_GLOBAL_TROPHY_DEDUP_SESSION_HANDOFF_2026_05_15.md) — session handoff.

Pre-existing unrelated dirty / untracked files in the working tree were left untouched. Only the four files above were staged.

## 3. Policy Change: Trophy Words As Collectible Vocabulary

Trophy words are no longer treated as "themed vocabulary anchors that may repeat freely across paths" (the prior audit's policy). They are now treated as **collectible, special, varied A1 rewards** — each trophy should ideally feel distinct, lesson-specific, and concrete rather than a generic Bright/Wistful/Sharp palette word.

Concrete implications applied in this pass:
- Signature vibe palette words (`ready`, `clear`, `careful`, `quick`, `now`, `done`, `direct`, `slowly`, `gently`, `kindly`) are no longer used as default trophies. Each is now used at most 2-3 times globally where the lesson context strongly motivates it.
- Lesson-specific concrete nouns and verbs (`platform`, `bag`, `guest`, `tired`, `well`, `soon`, `cab`, `lesson`, `floor`, `museum`, `cake`, `nap`) replace generic vibe descriptors where they are present in the lesson's `targetText`, `chunks`, or `lessonItems`.
- The hard-fail multiplicity threshold was raised from "informational only" to **> 3 cells globally**. Any future trophy added at a 4th cell of the same word fails the build.
- Cross-path repeats above 1 cell are now **warn-reported** in the script output to keep visibility on the remaining 2-cell pairs.

## 4. Starting Duplicate Numbers (At Audit Baseline)

From the prior trophy-word audit at HEAD `9de9a4c`:
- 300 trophy cells, 50 global repeat labels reported as informational.
- 14 high-multiplicity words (4+ cells): `ready` 10, `clear` 10, `careful` 8, `here` 6, `direct/done/slowly/time/wait` 5 each, `calm/help/nearby/quick/right/there` 4 each.
- 8 three-cell words: `better, morning, night, now, rest, safe, straight, today`.
- 28 two-cell words.
- 19 within-path duplicates (1 patched, 18 allowlisted exact-cell).

## 5. Final Duplicate Numbers

After this pass:
- **300** trophy cells scanned. **Same** as before.
- **16** global repeat labels, **all 2-cell**, **all warn-only**.
- **0** words at 4+ cells.
- **0** words at 3 cells.
- **16** words at 2 cells.
- **0** within-path duplicates.
- **0** same-lesson cross-vibe collisions.

The 16 remaining 2-cell repeats:

| Word | Cells | Note |
|---|---|---|
| `again` | p1 L8 w, p10 L7 w | Wistful palette signature |
| `clean` | p4 L4 b, p8 L7 s | Different concepts (no-sugar vs towel) |
| `confirmed` | p9 L9 s, p10 L8 s | Sharp coordination anchor |
| `correct` | p2 L9 s, p7 L4 s | Sharp confirmation; both check-right-vehicle lessons |
| `find` | p6 L7 w, p8 L3 w | Wistful search-anchor (doctor / room) |
| `fixed` | p5 L8 s, p9 L5 s | Sharp decisive planning anchor |
| `fresh` | p2 L5 b, p4 L5 w | Different concepts (available today / bread fresh) |
| `kindly` | p2 L2 w, p8 L4 w | Wistful politeness signature |
| `lost` | p1 L3 w, p3 L10 w | Wistful emotional palette signature |
| `lovely` | p1 L7 b, p4 L8 b | Bright palette signature |
| `perhaps` | p1 L5 w, p3 L6 w | Wistful palette signature |
| `pleased` | p5 L4 w, p6 L10 b | Different emotions (greeting / recovery) |
| `quiet` | p1 L4 w, p3 L8 w | Wistful palette signature |
| `settled` | p1 L9 s, p4 L10 b | Sharp/Bright decisive close |
| `softly` | p3 L1 w, p4 L10 w | Wistful palette signature |
| `soon` | p9 L3 w, p10 L6 w | Wistful timing palette |

Further reduction to single-cell uniqueness for these would require replacing them with weaker, less vibe-coherent words — explicitly disallowed by the brief ("Do not replace good A1 words with obscure, weird, or advanced words just to satisfy uniqueness"). Each remaining repeat is either a palette signature (Bright/Wistful/Sharp identity word) or a natural cross-path A1 anchor.

## 6. All Trophy Words Changed — Before / After

The full set of trophy-word swaps applied this pass (cell → was → became). Examples and whyThisWord were updated coherently per cell; see §7 for example details.

### 6.1 From the 10-cell `clear` cluster
| Cell | Was | Became |
|---|---|---|
| p4 L1 s | clear | table |
| p6 L1 s | clear | sick |
| p6 L8 b | clear | tell |
| p7 L3 s | clear | minute |
| p7 L9 w | clear | long |
| p8 L4 s | clear | fast |
| p8 L5 w | clear | code |
| p9 L2 s | clear | available |
| p10 L3 s | clear | thanks |

Kept: p1 L1 sharp (`clear` — the historical anchor).

### 6.2 From the 10-cell `ready` cluster
| Cell | Was | Became |
|---|---|---|
| p1 L6 b | ready | platform |
| p4 L7 b | ready | bag |
| p6 L10 b | ready | glad → pleased (re-patched, see 6.13) |
| p7 L1 s | ready | one |
| p8 L1 s | ready | guest |
| p8 L8 w | ready | tired |
| p9 L1 s | ready | greet |
| p10 L1 s | ready | well |
| p10 L6 w | ready | soon |

Kept: p1 L4 sharp (`ready` — canonical "Ready to order").

### 6.3 From the 8-cell `careful` cluster
| Cell | Was | Became |
|---|---|---|
| p4 L5 w | careful | fresh |
| p6 L1 w | careful | unwell |
| p6 L3 s | careful | pain |
| p7 L4 s | careful | correct |
| p7 L5 w | careful | call |
| p8 L1 w | careful | check |
| p9 L1 w | careful | nice |

Kept: p3 L3 wistful (`careful` — natural caution anchor for "Is it open?").

### 6.4 From the 6-cell `here` cluster
| Cell | Was | Became |
|---|---|---|
| p6 L2 s | here | near |
| p7 L7 w | here | gently → curb (re-patched, see 6.13) |
| p8 L6 w | here | show |
| p9 L5 b | here | café |
| p10 L2 w | here | liked |

Kept: p6 L4 bright (`here` — body-location anchor in "It hurts here.").

### 6.5 From the 5-cell clusters
| Word | Cell | Became |
|---|---|---|
| `direct` | p3 L3 s | still |
| `direct` | p5 L3 s | name |
| `direct` | p8 L5 s | use |
| `direct` | p9 L8 s | new |
| `done` | p4 L6 s | all |
| `done` | p8 L10 s | paid |
| `done` | p9 L10 s | bye |
| `done` | p10 L9 s | over |
| `slowly` | p3 L2 w | walk |
| `slowly` | p6 L4 w | little |
| `slowly` | p7 L8 w | easy |
| `slowly` | p10 L4 w | more |
| `time` | p7 L3 w | when |
| `time` | p7 L9 s | how |
| `time` | p8 L9 s | serve |
| `time` | p10 L5 s | need → pause (re-patched) |
| `wait` | p6 L6 w | just |
| `wait` | p7 L7 s | park |
| `wait` | p8 L7 w | have |
| `wait` | p9 L6 s | ahead |

Kept: `direct` p2 L8 s, `done` p1 L10 s, `slowly` p1 L2 w, `time` p9 L4 b, `wait` p2 L10 s.

### 6.6 From the 4-cell clusters
| Word | Cell | Became |
|---|---|---|
| `calm` | p6 L7 w | find |
| `calm` | p6 L9 b | get |
| `calm` | p10 L10 w | thank |
| `help` | p8 L4 w | kindly |
| `help` | p9 L7 w | sorry |
| `help` | p10 L3 w | sweet |
| `nearby` | p3 L2 b | minutes |
| `nearby` | p6 L7 b | visit |
| `nearby` | p7 L2 w | somewhere |
| `quick` | p1 L2 s | slower |
| `quick` | p4 L2 s | menu |
| `quick` | p9 L7 s | update |
| `right` | p2 L3 b | map |
| `right` | p8 L3 s | point |
| `right` | p9 L5 s | spot → fixed (re-patched) |
| `there` | p7 L8 s | driver |
| `there` | p9 L3 s | see |
| `there` | p10 L2 s | nice → great (re-patched) |

Kept: `calm` p2 L8 w, `help` p7 L1 w, `nearby` p6 L2 w, `quick` p5 L1 s, `right` p7 L4 w, `there` p7 L6 b.

### 6.7 From the 3-cell clusters
| Word | Cell | Became |
|---|---|---|
| `better` | p7 L10 w | home |
| `better` | p10 L4 s | fast → lesson (re-patched) |
| `morning` | p9 L9 w | okay |
| `morning` | p10 L8 w | agreed |
| `night` | p8 L2 w | small |
| `night` | p8 L8 s | need |
| `now` | p2 L6 s | card |
| `now` | p10 L10 s | cheers |
| `rest` | p6 L6 s | thirsty |
| `rest` | p10 L9 w | hope |
| `safe` | p6 L8 w | tiny |
| `safe` | p7 L10 s | made |
| `straight` | p1 L3 s | left |
| `straight` | p3 L1 s | turn |
| `today` | p4 L5 s | baked |
| `today` | p9 L2 w | maybe |

Kept: `better` p6 L10 w, `morning` p8 L9 w, `night` p10 L9 b, `now` p6 L10 s, `rest` p6 L5 w, `safe` p6 L1 b, `straight` p8 L6 s, `today` p10 L1 b.

### 6.8 From 2-cell labels broken (one cell each)
| Word | Cell | Became |
|---|---|---|
| `brief` | p4 L9 s | busy |
| `delighted` | p5 L4 b | pleasure |
| `eager` | p5 L7 b | tonight |
| `easy` | p2 L6 b | pay |
| `fast` | p10 L4 s | lesson |
| `gentle` | p5 L6 w | curious → live (within-path fix) |
| `glad` | p6 L10 b | pleased |
| `good` | p9 L10 w | enjoy |
| `helped` | p6 L9 s | rush |
| `hotel` | p8 L3 b | floor |
| `near` | p2 L7 w | soft → paper (A1P1↔A1P2 fix) |
| `need` | p10 L5 s | pause |
| `nice` | p10 L2 s | great |
| `open` | p3 L3 b | hours |
| `place` | p9 L5 w | meeting |
| `set` | p10 L7 s | date |
| `spot` | p9 L5 s | fixed |
| `where` | p8 L3 w | find |
| `arrived` | p8 L10 w | leaving |
| `kind` | p4 L8 w | tasty |
| `leave` | p10 L6 s | finish |
| `simple` | p3 L4 b | museum |
| `tomorrow` | p9 L9 b | day |
| `evening` | p10 L5 w | sleepy |
| `urgent` | p6 L9 w | someone |
| `take` | p7 L9 b | last |
| `please` | p7 L6 w | wish |
| `taxi` | p3 L9 s | cab |
| `tired` | p10 L5 b | nap |
| `plan` | p5 L8 b | invite |
| `gently` | p7 L7 w | curb |
| `somewhere` | p2 L3 w | finger |
| `maybe` | p2 L1 w | yet |
| `curious` | p5 L6 w | live (within-path fix from earlier patch) |

## 7. Examples / Why Text Changed

Every changed trophy cell received an updated `example` and `whyThisWord` aligned to the new trophy word and the cell's vibe + lesson context. The German `meaning` was also updated to match the new English word. Per cell the example is a short A1-natural sentence and the whyThisWord is one short German line describing the vibe/lesson fit. Details are visible per-line in the file diff for [frontend/src/data/guidedLessons.ts](../../frontend/src/data/guidedLessons.ts).

## 8. Remaining Global Duplicates and Rationale

See §5 table for the 16 remaining 2-cell labels. Each is either:
- A canonical vibe-palette signature (Bright `lovely`; Wistful `again`, `kindly`, `lost`, `perhaps`, `quiet`, `softly`, `soon`; Sharp `confirmed`, `correct`, `fixed`, `settled`) — replacing these would weaken the vibe identity that the polish pass strengthened.
- A natural cross-path A1 anchor (`fresh`, `clean`, `find`, `pleased`) — same word in genuinely different contexts and concepts.

All 16 are warn-only in the trophy-uniqueness script and do not fail the build. Product can decide in a future pass whether to push for further reduction.

## 9. Remaining Within-Path Duplicates and Rationale

**0 within-path duplicates.** All earlier exact-cell allowlist entries were eliminated by patching one cell of each pair. The within-path allowlist mechanism remains in the script (empty) for future product-approved exceptions.

## 10. Highest-Multiplicity Words After Patch

The highest-multiplicity trophy word now appears in **2 cells** globally. There are no trophy words at 3+ cells. The 16 words at exactly 2 cells are listed in §5.

## 11. Whether All 300 Trophy Cells Remain Present

**Yes.** The trophy-uniqueness script asserts `expected 300 active trophy cells; observed 300` and the assertion passes. Every active lesson variant has a populated trophy word.

## 12. Whether Cross-Vibe Remains Clean

**Yes.** `npx tsx scripts/test-guided-cross-vibe.ts` reports:
- 300 pairs scanned
- 0 hard failures
- 0 warnings
- 2 allowlist hits (unchanged historical entries)
- 0 trophy collisions

## 13. Whether Browser QA Can Proceed

**Yes. Proceed with authenticated browser QA for `/today`.**

All read-only checks are green. The trophy de-duplication pass touched only trophy metadata (`word`, `meaning`, `example`, `whyThisWord`); no lesson content, lesson sequence, review logic, or game flow was modified. The only visible product change in browser QA will be the trophy panel surfacing more varied, lesson-specific words.

## Tests/Checks Run

- `npx tsx scripts/test-guided-trophy-word-uniqueness.ts` — 13 passed, 0 failed. 300 cells. 0 missing/empty. 0 same-lesson collisions. 0 within-path repeats. 16 global 2-cell repeats warn-only. 0 hard-failed global repeats.
- `npx tsx scripts/test-guided-cross-vibe.ts` — 300 pairs, 0 hard fails, 0 warns, 2 allowlist hits, 0 trophy collisions.
- `npx tsx scripts/test-guided-today-data.ts` — 8981 passed, 0 failed.
- `npx tsx scripts/test-guided-segment-reviews.ts` — 524 passed, 0 failed.
- `npx tsx scripts/test-guided-path-directory.ts` — 106 passed, 0 failed.
- `npx tsx scripts/test-guided-today-path-overview.ts` — 166 passed, 0 failed.
- `npm run test:guided-today` — full chain green; cross-vibe at tail.
- `npm run check:i18n` — passed with the known existing French warn-only gaps documented as out-of-scope for the German Phase 0 PR. Non-blocking.
- `npm run build` — passed in 1.19s with existing Vite dynamic-import / chunk-size warnings. Non-blocking; same warnings as prior handoffs.
- `git diff --check` — clean.
- `git diff --cached --check` — clean.

## Explicit Non-Goals Preserved

- No browser QA was run.
- No lesson targetText, baseText, meaning, chunks, targetChips, distractors, typeRecall, sceneCaption, lessonItems, songSeed, or visualNotes touched.
- No path id, lesson id, lesson order, or path exposure changes.
- No review / segment-review logic changes.
- No trophy song / client code changes.
- No backend, Supabase, progress-sync, generation, decks, words, credits, category practice, language expansion, or A2 changes.
- No `git add -A`. Only the four touched files were staged.
- Unrelated pre-existing dirty/untracked files in the working tree were left untouched.
