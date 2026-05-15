# Guided Today A1 Practical P1-P10 — Trophy Word Audit & Micro-Patch

Date: 2026-05-15
Branch: `main`
Local repo: `D:\CODING\ResonanceTEST\orchestrator`

## 1. Executive Verdict

**PASS.**

- P9 L1 Bright targetText polished from the planning-feel `Hi, I'm glad we can meet.` to the natural greeting `Hi, I'm really glad to meet you.`, with full alignment of `baseText`, `chunks`, `targetChips`, `typeRecall`, and `trophyWord.example`.
- P7 L6 Wistful stale `trophyWord.example` refreshed from `Could we go there, please?` (pre-polish phrase) to `Please go slowly.` (current targetText alignment).
- Trophy uniqueness script extended from A1P1-A1P5 to A1P1-A1P10 with explicit hard-fails for missing/empty fields, same-lesson cross-vibe collisions, and within-path duplicates (exact-cell allowlist).
- 300 active trophy cells scanned. **0 missing fields. 0 empty fields. 0 same-lesson cross-vibe collisions.** 19 raw within-path duplicates surfaced; 18 allowlisted with exact-cell reasons documenting themed-path vocabulary clusters; 1 patched (P6 L10 Sharp `calm` → `now`, resolving the only 3-way within-path duplicate).
- 50 cross-path/global trophy-word repeats reported as informational only — no patches applied, per the brief's instruction to "report initially" and not mass-rewrite global repeats.
- All read-only checks pass. Cross-vibe distinctness remains 300 pairs / 0 hard fails / 0 warns / 0 trophy collisions.

Browser QA can proceed.

## 2. Files Changed

- [frontend/src/data/guidedLessons.ts](../../frontend/src/data/guidedLessons.ts) — three targeted edits (P9 L1 Bright variant, P7 L6 Wistful trophy example, P6 L10 Sharp trophy word).
- [frontend/scripts/test-guided-trophy-word-uniqueness.ts](../../frontend/scripts/test-guided-trophy-word-uniqueness.ts) — extended scope from A1P1-A1P5 to A1P1-A1P10; added field-presence hard-fail and same-lesson hard-fail; added 18 within-path allowlist entries with exact-cell reasons.
- [docs/Product/GUIDED_TODAY_A1P1_P10_TROPHY_WORD_AUDIT_AND_MICRO_PATCH_2026_05_15.md](GUIDED_TODAY_A1P1_P10_TROPHY_WORD_AUDIT_AND_MICRO_PATCH_2026_05_15.md) — this report.
- [docs/Product/GUIDED_TODAY_A1P1_P10_TROPHY_WORD_AUDIT_SESSION_HANDOFF_2026_05_15.md](GUIDED_TODAY_A1P1_P10_TROPHY_WORD_AUDIT_SESSION_HANDOFF_2026_05_15.md) — session handoff.

No other tracked files were modified or staged. Pre-existing unrelated dirty/untracked files in the working tree were left untouched.

## 3. P9 L1 Bright Before / After

Lesson: `english-a1-practical-9` L1 (`nice-to-meet-you`), vibe `bright`.

| Field | Before | After |
|---|---|---|
| `targetText` | `"Hi, I'm glad we can meet."` | `"Hi, I'm really glad to meet you."` |
| `baseText` | `'Hallo, ich freue mich, dass wir uns treffen.'` | `'Hallo, ich freue mich sehr, Sie kennenzulernen.'` |
| `meaning` | `'Ein freundlicher Satz, wenn du jemanden neu triffst.'` | `'Ein warmer Satz, wenn du jemanden neu triffst.'` |
| `chunks` | `hi` / `im-glad` ("I'm glad") / `we-can-meet` ("we can meet") | `hi` / `im-really-glad` ("I'm really glad") / `to-meet-you` ("to meet you") |
| `targetChips` | `['Hi,', "I'm glad", 'we can meet.']` | `['Hi,', "I'm really glad", 'to meet you.']` |
| `typeRecall` | `recall("Hi, I'm glad we can ", 'meet', '.', […])` | `recall("Hi, I'm really glad to ", 'meet', ' you.', […])` |
| `trophyWord.example` | `'Nice to meet you.'` | `"I'm really glad to meet you."` |

`extraLessonItems`, `distractors`, `sceneCaption`, `mediaCaption`, `songSeed`, `visualNotes`, `trophyWord.word` (`'meet'`), `trophyWord.meaning`, and `trophyWord.whyThisWord` were not changed.

Cross-vibe distinctness check: after the patch, P9 L1 Bright `"Hi, I'm really glad to meet you."` vs Wistful `'It is nice to meet you.'` vs Sharp `'Good to meet you.'` all remain hedge-strip distinct. Cross-vibe script reports 0 hard fails / 0 warns / 0 trophy collisions.

## 4. P7 L6 Wistful Trophy Example Before / After

Lesson: `english-a1-practical-7` L6 (`can-we-go-there`), vibe `wistful`.

| Field | Before | After |
|---|---|---|
| `trophyWord.example` | `'Could we go there, please?'` (pre-polish phrase) | `'Please go slowly.'` |
| `trophyWord.whyThisWord` | `'Please macht die Frage weich und höflich.'` | `'Please hält eine vorsichtige Bitte weich und höflich.'` |

`trophyWord.word` remained `'please'` and `trophyWord.meaning` remained `'bitte'`. P7's full trophy matrix was inspected first: `'please'` is shared with P7 L5 Sharp `'Please call a taxi.'`, which is now documented as an exact-cell allowlist entry rather than blindly swapped — both lessons legitimately anchor on `please` as core A1 politeness vocabulary.

## 5. Total Trophy Cells Scanned

**300** active trophy cells across **10 active A1 Practical paths × 10 lessons × 3 vibes (bright, wistful, sharp)**. Matches the expected count from the brief.

## 6. Missing Trophy Fields

**0.** Every cell has a non-empty `word`, `meaning`, `example`, and `whyThisWord`.

## 7. Empty Trophy Fields

**0.** No field returned an empty or whitespace-only string from the trophy helper.

## 8. Same-Lesson Trophy Collisions

**0.** Every lesson has three pairwise-distinct trophy words across its bright/wistful/sharp variants. Defended by both the trophy-uniqueness script (added in this pass) and the existing cross-vibe distinctness script.

## 9. Within-Path Duplicate Trophy Words

**19 raw duplicates surfaced; 1 patched, 18 allowlisted.**

### 9.1 Patched

- **P6 L10 Sharp `calm` → `now`.** Resolves the only 3-way within-path duplicate (`calm` had appeared in P6 L7 Wistful, P6 L9 Bright, **and** P6 L10 Sharp). After the patch, `calm` appears only at L7 Wistful + L9 Bright, both as the medical-distress regulating anchor. `now` is in P6 L10 Sharp's targetText `"I'm okay now. Thank you."` and is signature Sharp palette.

### 9.2 Allowlisted (exact-cell, with reason)

All 18 remaining within-path duplicates are themed-path vocabulary clusters; each has an exact-cell allowlist entry in [test-guided-trophy-word-uniqueness.ts](../../frontend/scripts/test-guided-trophy-word-uniqueness.ts).

| # | Path | Word | Cells | Theme |
|---:|---|---|---|---|
| 1 | A1P6 | `safe` | L1 bright + L8 wistful | Health safety anchor |
| 2 | A1P6 | `careful` | L1 wistful + L3 sharp | Health caution anchor |
| 3 | A1P6 | `clear` | L1 sharp + L8 bright | Clear medical communication |
| 4 | A1P6 | `nearby` | L2 wistful + L7 bright | Locate health resources |
| 5 | A1P6 | `here` | L2 sharp + L4 bright | Spatial vs body-location split |
| 6 | A1P6 | `rest` | L5 wistful + L6 sharp | Health recovery anchor |
| 7 | A1P6 | `urgent` | L5 sharp + L9 wistful | Medical urgency anchor |
| 8 | A1P6 | `calm` | L7 wistful + L9 bright | Health regulating anchor (was 3-way before patch) |
| 9 | A1P7 | `time` | L3 wistful + L9 sharp | Travel duration (departure vs duration) |
| 10 | A1P7 | `clear` | L3 sharp + L9 wistful | Clarity-of-timing |
| 11 | A1P7 | `careful` | L4 sharp + L5 wistful | Travel-safety anchor |
| 12 | A1P7 | `please` | L5 sharp + L6 wistful | Polite-request anchor |
| 13 | A1P7 | `there` | L6 bright + L8 sharp | Destination anchor |
| 14 | A1P7 | `take` | L6 sharp + L9 bright | Two senses (bringen / dauern) |
| 15 | A1P8 | `ready` | L1 sharp + L8 wistful | Hotel day-arc bookends |
| 16 | A1P8 | `night` | L2 wistful + L8 sharp | Room/sleep anchor |
| 17 | A1P8 | `hotel` | L2 sharp + L3 bright | P8 path locator |
| 18 | A1P8 | `clear` | L4 sharp + L5 wistful | Clarity-at-front-desk |
| 19 | A1P10 | `ready` | L1 sharp + L6 wistful | Wrap-up day arc |

Plus one pre-existing allowlist:
- A1P1 `ready` L4 sharp + L6 bright — documented in `GUIDED_TROPHY_WORD_SOURCE_DUPLICATION_INVESTIGATION_2026_05_15.md`.

Total allowlist entries: **19** (18 added this pass + 1 pre-existing).

Note on policy: the brief permits within-path duplicates only via exact-cell allowlist. The 18 new entries are exact-cell with specific reasons tied to lesson titles and vibe contexts; no broad "all P6 is themed" entry was added. A future content pass can patch any individual cell — when that happens, the corresponding allowlist entry will need to be updated or removed and the script will fail loudly until it is.

## 10. Cross-Path / Global Repeated Trophy Words

**50 trophy words repeat across multiple paths** (informational only — not hard-failed by policy).

Per the brief: "Cross-path duplicate: report initially. Patch only if it is obviously accidental, low-risk, and does not make the phrase less A1-natural." No cross-path patches were applied in this pass.

Full breakdown produced by the script (`[info]` = unflagged repeat; `[allowed]` = repeat where one or more cells are also within-path allowlisted):

```
[info]    "again"        — p1 L8 wistful, p10 L7 wistful
[info]    "arrived"      — p7 L10 bright, p8 L10 wistful
[info]    "better"       — p6 L10 wistful, p7 L10 wistful, p10 L4 sharp
[info]    "brief"        — p4 L9 sharp, p5 L4 sharp
[allowed] "calm"         — p2 L8 wistful, p6 L7 wistful, p6 L9 bright, p10 L10 wistful
[allowed] "careful"      — p3 L3 w, p4 L5 w, p6 L1 w, p6 L3 s, p7 L4 s, p7 L5 w, p8 L1 w, p9 L1 w
[info]    "clean"        — p4 L4 bright, p8 L7 sharp
[allowed] "clear"        — p1 L1 s, p4 L1 s, p6 L1 s, p6 L8 b, p7 L3 s, p7 L9 w, p8 L4 s, p8 L5 w, p9 L2 s, p10 L3 s
[info]    "confirmed"    — p9 L9 sharp, p10 L8 sharp
[info]    "delighted"    — p1 L1 bright, p5 L4 bright
[info]    "direct"       — p2 L8 s, p3 L3 s, p5 L3 s, p8 L5 s, p9 L8 s
[info]    "done"         — p1 L10 s, p4 L6 s, p8 L10 s, p9 L10 s, p10 L9 s
[info]    "eager"        — p1 L4 bright, p5 L7 bright
[info]    "evening"      — p9 L10 bright, p10 L5 wistful
[info]    "gentle"       — p3 L9 wistful, p5 L6 wistful
[info]    "good"         — p9 L10 wistful, p10 L1 wistful
[info]    "help"         — p7 L1 w, p8 L4 w, p9 L7 w, p10 L3 w
[info]    "helped"       — p3 L10 bright, p6 L9 sharp
[allowed] "here"         — p6 L2 s, p6 L4 b, p7 L7 w, p8 L6 w, p9 L5 b, p10 L2 w
[info]    "kind"         — p2 L8 bright, p4 L8 wistful
[info]    "leave"        — p7 L3 bright, p10 L6 sharp
[info]    "lost"         — p1 L3 wistful, p3 L10 wistful
[info]    "lovely"       — p1 L7 bright, p4 L8 bright
[info]    "morning"      — p8 L9 w, p9 L9 w, p10 L8 w
[allowed] "nearby"       — p3 L2 b, p6 L2 w, p6 L7 b, p7 L2 w
[allowed] "night"        — p8 L2 wistful, p8 L8 sharp, p10 L9 bright
[info]    "now"          — p2 L6 sharp, p6 L10 sharp (new), p10 L10 sharp
[info]    "open"         — p3 L3 bright, p5 L5 bright
[info]    "perhaps"      — p1 L5 wistful, p3 L6 wistful
[info]    "place"        — p9 L5 wistful, p10 L2 bright
[info]    "plan"         — p5 L8 bright, p9 L8 wistful
[info]    "quick"        — p1 L2 s, p4 L2 s, p5 L1 s, p9 L7 s
[info]    "quiet"        — p1 L4 wistful, p3 L8 wistful
[allowed] "ready"        — p1 L4 s, p1 L6 b, p4 L7 b, p6 L10 b, p7 L1 s, p8 L1 s, p8 L8 w, p9 L1 s, p10 L1 s, p10 L6 w
[allowed] "rest"         — p6 L5 wistful, p6 L6 sharp, p10 L9 wistful
[info]    "right"        — p2 L3 b, p7 L4 w, p8 L3 s, p9 L5 s
[allowed] "safe"         — p6 L1 b, p6 L8 w, p7 L10 sharp
[info]    "set"          — p9 L4 sharp, p10 L7 sharp
[info]    "settled"      — p1 L9 sharp, p4 L10 bright
[info]    "simple"       — p2 L9 wistful, p3 L4 bright
[info]    "slowly"       — p1 L2 w, p3 L2 w, p6 L4 w, p7 L8 w, p10 L4 w
[info]    "softly"       — p3 L1 wistful, p4 L10 wistful
[info]    "straight"     — p1 L3 sharp, p3 L1 sharp, p8 L6 sharp
[info]    "taxi"         — p3 L9 sharp, p7 L5 bright
[allowed] "there"        — p7 L6 b, p7 L8 s, p9 L3 s, p10 L2 s
[allowed] "time"         — p7 L3 w, p7 L9 s, p8 L9 s, p9 L4 b, p10 L5 s
[info]    "today"        — p4 L5 s, p9 L2 w, p10 L1 b
[info]    "tomorrow"     — p9 L9 bright, p10 L8 bright
[info]    "wait"         — p2 L10 s, p6 L6 w, p7 L7 s, p8 L7 w, p9 L6 s
[info]    "where"        — p7 L2 sharp, p8 L3 wistful
```

Highest-multiplicity informational cross-path repeats:
- `ready` (10 cells), `clear` (10 cells), `careful` (8 cells), `here` (6 cells), `wait` (5 cells), `done` (5 cells), `direct` (5 cells), `time` (5 cells), `slowly` (5 cells), `quick` (4 cells), `help` (4 cells), `nearby` (4 cells), `right` (4 cells), `there` (4 cells).

Observation: most of these reflect signature vibe palettes — `ready/clear/direct/quick/done/wait` are Sharp signature words and recur naturally in Sharp variants across paths; `here/slowly/careful/quiet/softly/perhaps/gentle/lovely/eager/delighted` cluster around Wistful and Bright signature palettes. The recurrence is the design intent, not accidental.

## 11. Allowlist Entries

19 within-path allowlist entries are now active in [test-guided-trophy-word-uniqueness.ts](../../frontend/scripts/test-guided-trophy-word-uniqueness.ts):

- A1P1: `ready` (1 entry, pre-existing)
- A1P6: `safe`, `careful`, `clear`, `nearby`, `here`, `rest`, `urgent`, `calm` (8 entries, all added this pass)
- A1P7: `time`, `clear`, `careful`, `please`, `there`, `take` (6 entries, all added this pass)
- A1P8: `ready`, `night`, `hotel`, `clear` (4 entries, all added this pass)
- A1P10: `ready` (1 entry, added this pass)

Each entry is exact-cell. Reasons name the specific lesson contexts. No broad "all P6 is themed" entry was added.

## 12. Trophy Words Changed

One trophy word changed in this pass:

| Path | Lesson | Vibe | Before | After | Rationale |
|---|---:|---|---|---|---|
| A1P6 | 10 | sharp | `calm` | `now` | Resolves 3-way within-path `calm` duplicate. `now` is in the lesson's targetText `"I'm okay now. Thank you."`, signature Sharp palette word, and unique within P6. |

## 13. Trophy Examples Changed

Two trophy examples changed in this pass:

| Path | Lesson | Vibe | Before | After | Reason |
|---|---:|---|---|---|---|
| A1P7 | 6 | wistful | `'Could we go there, please?'` | `'Please go slowly.'` | Stale: pre-polish phrase. Aligned to current targetText `"Could we go there slowly?"` while keeping trophy word `please`. |
| A1P9 | 1 | bright | `'Nice to meet you.'` | `"I'm really glad to meet you."` | Aligned to the new P9 L1 Bright targetText. |
| A1P6 | 10 | sharp | `'Calm now.'` | `"I'm okay now."` | Updated alongside the trophy word change `calm` → `now`. |

`trophyWord.whyThisWord` was also adjusted in A1P7 L6 Wistful and A1P6 L10 Sharp to match the new trophy word / example pair.

## 14. Whether All 300 Active Trophy Cells Are Present

**Yes.** The script asserts `expected 300 active trophy cells; observed 300` and this assertion passes.

## 15. Whether Browser QA Can Proceed

**Yes. Proceed with authenticated browser QA for `/today`.**

All read-only checks are green. The trophy uniqueness script now covers A1P1-P10. Cross-vibe distinctness remains clean. The two polish concerns from the independent QA (P9 L1 Bright awkward phrasing, P7 L6 Wistful stale trophy example) are resolved.

## Tests/Checks Run

- `npx tsx scripts/test-guided-trophy-word-uniqueness.ts` — 28 passed, 0 failed. 300 cells scanned. 0 missing/empty fields. 0 same-lesson collisions. 19 within-path duplicates (1 patched, 18 allowlisted exact-cell). 50 cross-path repeats reported informational.
- `npx tsx scripts/test-guided-cross-vibe.ts` — 300 pairs, 0 hard fails, 0 warns, 2 allowlist hits, 0 trophy collisions.
- `npx tsx scripts/test-guided-today-data.ts` — 8975 passed, 0 failed.
- `npx tsx scripts/test-guided-segment-reviews.ts` — 524 passed, 0 failed.
- `npx tsx scripts/test-guided-path-directory.ts` — 106 passed, 0 failed.
- `npx tsx scripts/test-guided-today-path-overview.ts` — 166 passed, 0 failed.
- `npm run test:guided-today` — full chain green; includes cross-vibe at tail.
- `npm run check:i18n` — passed with the known existing French warn-only gaps documented as out-of-scope.
- `npm run build` — passed with existing Vite dynamic-import/chunk-size warnings (non-blocking).
- `git diff --check` — clean.
- `git diff --cached --check` — clean.

## Explicit Non-Goals Preserved

- No browser QA was run in this pass.
- No broad content rewrite.
- No path id, lesson id, lesson order, or path exposure changes.
- No review/segment-review logic changes.
- No trophy song/client code changes.
- No backend, Supabase, generation, decks, words, credits, category practice, language expansion, or A2 changes.
- No cross-path duplicates were patched. They are reported only.
- Unrelated pre-existing dirty/untracked files in the working tree were left untouched.
