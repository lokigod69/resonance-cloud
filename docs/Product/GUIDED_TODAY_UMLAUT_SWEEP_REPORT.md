# Guided Today Umlaut / ß / é Sweep — A1P1, A1P2, A1P3

Date: 2026-05-12

## Scope

Systematic conversion of ASCII-substituted German characters (`ae`, `oe`, `ue`, `ss`),
mojibake (`Ã¶`), and lost-byte corruptions (`?ber`) to proper Unicode (`ä`, `ö`, `ü`, `ß`)
across every German text field in the three Guided Today A1 paths:

- A1P1 (`english-a1-practical-1`, 10 lessons × 3 vibe variants)
- A1P2 (`english-a1-practical-2`, 10 lessons × 3 vibe variants)
- A1P3 (`english-a1-practical-3`, 10 lessons × 3 vibe variants)

English/target-language content is untouched and verified byte-identical pre/post.

## Commit

- Commit SHA: recorded in the final response after `git push origin main` completes.
  A committed file cannot contain its own final SHA without changing that SHA.
- Branch: `main`
- Push target: `origin main`

## Files Changed

- `frontend/src/data/guidedLessons.ts` — German field corrections in A1P1/P2/P3 only.
- `docs/Product/GUIDED_TODAY_UMLAUT_SWEEP_REPORT.md` — this report (new).

No other files were modified. No tests were added in this PR (umlaut test infrastructure
is recommended below but explicitly out of scope per the prompt).

## Substitution Counts

71 lines modified (each line was one ASCII pattern flipped to Unicode), broken down:

| Path | Field type                                  | Count |
|------|---------------------------------------------|-------|
| A1P1 | `lessonItems[*].baseText` (mojibake `Ã¶`)   |  1    |
| A1P1 | `nextLessonTeaser.situation` (lost-byte `?`)|  1    |
| A1P1 | `situation.de` (lost-byte `?`)              |  1    |
| A1P1 | **Subtotal**                                |  3    |
| A1P2 | `situation.de`                              |  1    |
| A1P2 | `corePhrase.baseText`                       |  4    |
| A1P2 | `meaning`                                   |  6    |
| A1P2 | `chunks[*].baseText`                        |  5    |
| A1P2 | `sceneCaption`                              |  4    |
| A1P2 | `mediaCaption`                              |  6    |
| A1P2 | `trophyWord.whyThisWord`                    |  2    |
| A1P2 | **Subtotal**                                | 28    |
| A1P3 | `situation.de`                              |  4    |
| A1P3 | `corePhrase.baseText`                       |  5    |
| A1P3 | `meaning`                                   |  3    |
| A1P3 | `chunks[*].baseText`                        | 13    |
| A1P3 | `sceneCaption`                              |  7    |
| A1P3 | `mediaCaption`                              |  3    |
| A1P3 | `trophyWord.meaning` / `trophyWord.whyThisWord` |  4    |
| A1P3 | trophyWord (`zu Fuss machbar`)              |  1    |
| A1P3 | **Subtotal**                                | 40    |
| **Total** |                                       | **71** |

By substitution token, the most frequent:

- `Tuete` → `Tüte` — 11 occurrences (A1P2 lesson 7 "A receipt, please")
- `Fuss`/`Fussweg` → `Fuß`/`Fußweg` — 11 occurrences (A1P3 lesson 9 "By foot or by taxi?")
- `faehrt` → `fährt` — 7 occurrences (A1P3 lessons 4/10)
- `prueft`/`pruefst`/`pruefend`/`pruefender` → `prüft`/`prüfst`/`prüfend`/`prüfender` — 8 occurrences (A1P2/A1P3)
- `geoeffnet` → `geöffnet` — 3 occurrences (A1P3 lesson 3)
- `bestaetig*` → `bestätig*` — 4 occurrences (A1P2/A1P3)
- `Naechstes` → `Nächstes` — 2 occurrences (A1P3 lessons 5/10)

## Before/After Diff Samples

### A1P1 (3 fixes)

```
- baseText: "schÃ¶n / nett"
+ baseText: "schön / nett"
   (brightLesson008 lessonItems, "nice")

- situation: "Im Small Talk sagst du etwas Einfaches ?ber einen Ort."
+ situation: "Im Small Talk sagst du etwas Einfaches über einen Ort."
   (nextLessonTeaser for lesson 7)

- de: "Im Small Talk sagst du etwas Einfaches ?ber einen Ort."
+ de: "Im Small Talk sagst du etwas Einfaches über einen Ort."
   (situation.de for lesson 8)
```

### A1P2 (10 of 28 representative)

```
- mediaCaption: "Klares Schild, kurze Rueckfrage, direkter Blick zur Person am Schalter."
+ mediaCaption: "Klares Schild, kurze Rückfrage, direkter Blick zur Person am Schalter."

- meaning: "Eine knappe, hoefliche Anweisung, wenn die Information genau sein muss."
+ meaning: "Eine knappe, höfliche Anweisung, wenn die Information genau sein muss."

- de: "Du waehlst zwischen zwei sichtbaren Optionen."
+ de: "Du wählst zwischen zwei sichtbaren Optionen."

- mediaCaption: "Zwei Gebaeckstuecke im Schaufenster, die Wahl liegt sichtbar da."
+ mediaCaption: "Zwei Gebäckstücke im Schaufenster, die Wahl liegt sichtbar da."

- trophyWord: trophy('charming', 'nett', 'Charming, thanks.', 'Charming gibt Bright eine warme Laden-Note ohne Uebertreibung.')
+ trophyWord: trophy('charming', 'nett', 'Charming, thanks.', 'Charming gibt Bright eine warme Laden-Note ohne Übertreibung.')

- mediaCaption: "Kontaktloses Kartenlesegeraet, heller Tresen, kurzer Zahlungsblick."
+ mediaCaption: "Kontaktloses Kartenlesegerät, heller Tresen, kurzer Zahlungsblick."

- baseText: "Eine Quittung bitte, und eine Tuete."
+ baseText: "Eine Quittung bitte, und eine Tüte."

- sceneCaption: "Wistful hält kurz inne und fuegt die Tüte vorsichtig hinzu."
+ sceneCaption: "Wistful hält kurz inne und fügt die Tüte vorsichtig hinzu."

- de: "Du bestaetigst Bus, Zug, Ort oder Gegenstand, bevor du weitermachst."
+ de: "Du bestätigst Bus, Zug, Ort oder Gegenstand, bevor du weitermachst."

- meaning: "Eine ruhige Bitte, kurz suchen oder denken zu duerfen."
+ meaning: "Eine ruhige Bitte, kurz suchen oder denken zu dürfen."
```

### A1P3 (10 of 40 representative)

```
- de: "Du fragst nach einer einfachen Abbiegung und bestaetigst die Richtung."
+ de: "Du fragst nach einer einfachen Abbiegung und bestätigst die Richtung."

- chunk('is-it-five-minutes', 'is it five minutes', 'sind es fuenf Minuten')
+ chunk('is-it-five-minutes', 'is it five minutes', 'sind es fünf Minuten')

- meaning: "Eine vorsichtige Frage, ob der Weg zu Fuss zu weit ist."
+ meaning: "Eine vorsichtige Frage, ob der Weg zu Fuß zu weit ist."

- de: "Du pruefst, ob ein Laden, Schalter oder Ort gerade offen ist."
+ de: "Du prüfst, ob ein Laden, Schalter oder Ort gerade offen ist."

- mediaCaption: "Ladentuer mit hellem Open-Schild, Hand kurz vor dem Griff."
+ mediaCaption: "Ladentür mit hellem Open-Schild, Hand kurz vor dem Griff."

- baseText: "Welcher Bus faehrt bitte zum Museum?"
+ baseText: "Welcher Bus fährt bitte zum Museum?"

- trophyWord: trophy('nearer', 'naeher', 'Nearer is better.', '…')
+ trophyWord: trophy('nearer', 'näher', 'Nearer is better.', '…')

- baseText: "Sollen wir bitte zu Fuss gehen oder ein Taxi nehmen?"
+ baseText: "Sollen wir bitte zu Fuß gehen oder ein Taxi nehmen?"

- meaning: "Eine sanfte Wahl, wenn beide Wege moeglich sind."
+ meaning: "Eine sanfte Wahl, wenn beide Wege möglich sind."

- mediaCaption: "Bus faehrt weiter, Haltestelle im Rueckfenster, freundliche Nachfrage im Gang."
+ mediaCaption: "Bus fährt weiter, Haltestelle im Rückfenster, freundliche Nachfrage im Gang."
```

## English Content Preserved

Verified pre/post identity:

- 354 `targetText:` occurrences in the A1P1/P2/P3 ranges — `diff` returns zero lines.
- 30 `en:` occurrences in the A1P1/P2/P3 ranges — `diff` returns zero lines.
- All English `lessonItems` keys (`hi-there`, `do-you-speak`, …), trophy `example`
  sentences (`"Delighted to meet you."`, etc.), and English chunks — byte-identical.

Method:
```
git show HEAD~0:frontend/src/data/guidedLessons.ts | awk '<A1 ranges>' \
  | grep -oE 'targetText: "[^"]*"' | sort > /tmp/before.txt
awk '<same ranges>' src/data/guidedLessons.ts \
  | grep -oE 'targetText: "[^"]*"' | sort > /tmp/after.txt
diff /tmp/before.txt /tmp/after.txt  # empty
```

## Files Outside Scope — Not Modified

`git status -sb` after sweep shows only:

- `M frontend/src/data/guidedLessons.ts` (intended)
- `?? docs/Product/GUIDED_TODAY_UMLAUT_SWEEP_REPORT.md` (this report)

No vibe character bibles, no test scripts, no translations, no other lesson paths,
no other components were modified.

## Root Cause Analysis

### Commits implicated

`git blame` on representative ASCII-substituted and corrupted lines points at four
upstream commits across two distinct failure modes:

| Sample line | Pre-fix content                          | Commit     | Date           | Title                                              |
|-------------|------------------------------------------|------------|----------------|----------------------------------------------------|
| 612         | `baseText: "schÃ¶n / nett"`              | `efdbf37`  | 2026-05-11     | Simplify guided Today path overview                |
| 3571        | `…etwas Einfaches ?ber einen Ort.` (teaser) | `a979903` | 2026-05-11    | feat: wire guided today active vibe lessons        |
| 3596        | `…etwas Einfaches ?ber einen Ort.` (situation.de) | `a979903` | 2026-05-11 | feat: wire guided today active vibe lessons        |
| 1916        | `…kurze Rueckfrage…`                     | `d630222`  | 2026-05-12     | feat: add guided today a1 practical 2              |
| 2057        | `Du waehlst zwischen zwei sichtbaren Optionen.` | `d630222` | 2026-05-12 | feat: add guided today a1 practical 2              |
| 2139        | `…ohne Uebertreibung.`                   | `d630222`  | 2026-05-12     | feat: add guided today a1 practical 2              |
| 2250        | `…eine Tuete oder beides.`               | `d630222`  | 2026-05-12     | feat: add guided today a1 practical 2              |
| 2284        | `…fuegt die Tuete vorsichtig hinzu.`     | `a3fa214`  | 2026-05-13     | Polish Guided Today frontend QA                    |
| 2559        | `…bestaetigst die Richtung.`             | `cac0c9a`  | 2026-05-12     | Add Guided Today A1 Practical 3                    |
| 2649        | `…der Weg zu Fuss zu weit ist.`          | `cac0c9a`  | 2026-05-12     | Add Guided Today A1 Practical 3                    |
| 2750        | `Du fragst, welcher Bus zu deinem Ziel faehrt.` | `cac0c9a` | 2026-05-12   | Add Guided Today A1 Practical 3                    |
| 3069        | `…ob du zu Fuss gehst…`                  | `cac0c9a`  | 2026-05-12     | Add Guided Today A1 Practical 3                    |
| 3094        | `…wenn beide Wege moeglich sind.`        | `cac0c9a`  | 2026-05-12     | Add Guided Today A1 Practical 3                    |

Author docs corresponding to each commit:

- `a979903` → `docs/Product/GUIDED_TODAY_ACTIVE_VIBE_WIRING_REPORT.md`
- `efdbf37` → `docs/Product/GUIDED_TODAY_PATH_OVERVIEW_V1_1_SIMPLIFICATION_REPORT.md`
- `d630222` → `docs/Product/GUIDED_TODAY_A1_PRACTICAL_2_REPORT.md`
- `cac0c9a` → `docs/Product/GUIDED_TODAY_A1_PRACTICAL_3_REPORT.md`
- `a3fa214` → `docs/Product/GUIDED_TODAY_FRONTEND_QA_POLISH_V1_4_REPORT.md`

None of these report docs contains an instruction or note about Unicode handling
for German content. The A1P2/A1P3 report docs document what the agent built but
not the prompt that produced it; the polish report claims that "obvious ASCII
transliterations were replaced with Unicode German" — yet that same commit
*re-introduced* the ASCII `fuegt die Tuete` on line 2284 (see the diff in `a3fa214`
for `frontend/src/data/guidedLessons.ts`).

### Three distinct failure vectors

The sweep surfaces three different mechanisms, each of which needs its own guard:

**1. ASCII transliteration (ae/oe/ue/ss) — the dominant failure (68 of 71).**

Concentrated in commits `d630222` (A1P2) and `cac0c9a` (A1P3). The Codex / GPT-5
authoring sub-agents that generated the A1P2 and A1P3 content blocks substituted
`ae`/`oe`/`ue` for `ä`/`ö`/`ü` and `ss` for `ß` across virtually every German field
in those PRs. This is a well-known failure mode of LLM code generation: when emitting
quoted strings inside TypeScript files, models pattern-match against a training
distribution that includes ASCII-only German (legacy DOS-era code comments, English
prose-loaded German loanwords, etc.). The most likely root cause is the absence of
an explicit Unicode instruction in the strategic architect prompt and the Codex
sub-task prompt that produced these PRs. No transformation step in the pipeline
stripped non-ASCII characters — the strings were generated as ASCII at the model
output layer.

The polish commit `a3fa214` later *added a marker-based static check* to
`scripts/test-guided-today-data.ts` (line 426, `collectAsciiGermanTransliterationFlags`),
but the check has two structural gaps that explain why broken content kept slipping
in:

- **Field-coverage gap**: it scans only `situation.de`, `corePhrase.baseText`,
  `sceneCaption`, `placeholderMedia.caption`, `trophyWord.meaning`,
  `trophyWord.example`, `trophyWord.whyThisWord`. It does **not** scan `meaning`,
  `chunks[*].baseText`, `lessonItems[*].baseText`, `nextLessonTeaser.situation`,
  or `speakTarget.baseCue` — the very fields where most of the ASCII content lived.
- **Marker-list gap**: the marker array misses high-frequency tokens that were
  present in the broken content: `Tuete`, `Fuss`, `faehrt`, `pruef*`, `geoeffnet`,
  `bestaetig*`, `Naech` (capital), `Rueck*`, `Verfuegbar*`, `Uebertreibung`,
  `Kartenlesegeraet`, `beruehrt`, `klaert`, `Zahlungsloesung`, `geprueft`,
  `hoefliche`, `duerfen`, `fuegt`, `koerperlich`, `naeher`, `moeglich`,
  `waehlst`, `Gebaeck*`.

Both gaps need to be closed for the guard to be load-bearing.

**2. Single-byte corruption (`?ber`) — 2 of 71.**

Two A1P1 fields (lines 3571 and 3596) lost a `ü` byte and replaced it with literal
`?`. Both come from commit `a979903` ("feat: wire guided today active vibe lessons").
The pattern `?` between two letters is the signature of a serialization step that
encountered a non-ASCII byte it couldn't represent and substituted the Unicode
"replacement" placeholder. Likely vectors: clipboard transit through a single-byte
codepage, JSON serialization that didn't set UTF-8 encoding, or a shell command
that emitted text under `cp1252`. Notably, the test marker scan at line 458 of
`test-guided-today-data.ts` already has a `corrupt-diacritic` regex
(`/[A-Za-z]\?[A-Za-z]/`) — but with the same field-coverage gap, it never inspected
`nextLessonTeaser.situation` or the lesson-shell `situation.de` for these lines.

**3. Double-mojibake (`Ã¶`) — 1 of 71.**

One A1P1 lesson item baseText (line 612, `schÃ¶n / nett`) carries the classic
UTF-8 → Latin-1 misread → re-encoded-as-UTF-8 byte sequence `0xC3 0x83 0xC2 0xB6`.
This is the signature of a tool in the pipeline that read UTF-8 bytes as
Latin-1/cp1252 then wrote them back without setting the output encoding. The
introducing commit `efdbf37` ("Simplify guided Today path overview") was a wider
refactor that touched 48 lines of `guidedLessons.ts` — most likely the agent
piped the file through a tool that triggered an encoding round-trip on this line
and didn't catch it.

### Most likely upstream cause (summary)

The A1P2 and A1P3 strategic architect / Codex prompts did not include a German
Unicode instruction. The agent defaulted to ASCII substitution at content
generation time. The post-hoc marker check added in the QA polish PR was
designed correctly in principle but too narrowly in practice (field coverage
gap + marker-list gap), so subsequent edits — including the QA polish commit
itself, ironically — re-introduced ASCII content without any test catching it.

Separately, two independent encoding incidents (`?ber` lost-byte and `schÃ¶n`
double-mojibake) suggest at least one intermediate tool in the authoring pipeline
runs without an explicit UTF-8 contract. This is more dangerous than the ASCII
issue because it is not deterministic — the byte that survives one round-trip
may not survive the next.

## Recommended Guards

The prompt explicitly excludes implementing test infrastructure in this PR.
The guards below are recommendations for follow-up tracks.

### 1. Strategic Architect prompt addendum (recommended language)

> **German content authoring contract.** All German learner-facing text fields
> (`situation.de`, `corePhrase.baseText`, `meaning`, `chunks[*].baseText`,
> `lessonItems[*].baseText`, `speakTarget.baseCue`, `sceneCaption`,
> `mediaCaption`, `placeholderMedia.caption`, `trophyWord.meaning`,
> `trophyWord.example`, `trophyWord.whyThisWord`, `nextLessonTeaser.situation`,
> and any future German fields) MUST use proper Unicode characters: `ä ö ü ß
> Ä Ö Ü`. ASCII transliterations (`ae`/`oe`/`ue`/`ss`) are forbidden. The single
> exception is `ss` after a short vowel (`Wasser`, `Klasse`, `essen`, `isst`,
> `muss`, `dass`, `vergessen`, `geschlossen`, `wissen`) where it is correct
> German; `ß` follows long vowels and diphthongs only. Use `é` for `Café`
> (acute, not umlaut). Do not depend on tooling to fix this post-hoc.

### 2. Codex sub-agent prompt addendum (recommended language)

> When generating quoted German strings inside TypeScript source, emit the
> proper Unicode characters `ä ö ü ß Ä Ö Ü` and `é` directly. Do not emit
> `ae`, `oe`, `ue`, `ss` (for long-vowel `ß`), or `?` placeholders. Verify
> any string you emit by re-reading it: if you see an ASCII transliteration,
> rewrite it. If the upstream tool encoding is uncertain, prefer to emit
> Unicode and let the validation step fail loudly rather than silently
> substituting ASCII.

### 3. Manual review checklist (pre-commit)

Run before any commit that touches German content in `guidedLessons.ts` or
`translations.ts`:

```bash
# Should return zero lines:
grep -nE 'Tuete|Fuss|faehrt|pruef|geoeffnet|bestaetig|Naech|Rueck|Verfuegbar|Uebertreibung|Kartenlesegeraet|beruehrt|klaert|Zahlungsloesung|geprueft|hoefliche|duerfen|fuegt|koerperlich|naeher|moeglich|waehlst|Gebaeck|naech|naeh|faehr|waere|haeng|spaet|aender|erklaer|gefaehr|moecht|oeffn|schoen|hoer|froehlich|broetchen|frueh|ueber|muess|duerf|fuenf|tuer|gluecklich|buero|spuer|gruess|strass|schliess|weiss|heiss|gross|groesse|dreissig|spass|gruss|Ã[¶¤¼Ÿ]|[A-Za-z]\?[A-Za-z]' src/data/guidedLessons.ts
```

### 4. Test infrastructure (separate track, NOT implemented here)

The existing `collectAsciiGermanTransliterationFlags` helper in
`frontend/scripts/test-guided-today-data.ts` (line 426) needs two changes
before it can act as a true gate:

- **Expand field coverage** to include `meaning`, `chunks[*].baseText`,
  `lessonItems[*].baseText`, `nextLessonTeaser.situation`,
  `speakTarget.baseCue`, and any future German fields.
- **Expand the marker list** with the ~25 tokens enumerated in §Substitution
  Counts and §3 above.

This sweep prompt explicitly excluded touching test scripts; the change above
should land as its own PR with red-then-green verification (run on the
pre-sweep `0a7d82d` commit to confirm it fails, run after to confirm it passes).

## Test Output (verbatim tails)

### `npx tsx scripts/test-guided-vibes.ts`
```
[local storage]
  ok  storage key is path-scoped
  ok  missing selected vibe defaults to bright
  ok  selected active vibe persists locally
  ok  invalid stored vibe falls back to bright
  ok  future vibe cannot be selected in active UI helper
  ok  clearing selected vibe returns to default

98 passed, 0 failed
```

### `npx tsx scripts/test-guided-today-path-overview.ts`
```
[content coherence audit]
  review lesson 1/sharp: weak generic lesson item "focused"
  review lesson 6/wistful: weak generic lesson item "almost"
  review lesson 7/sharp: weak generic lesson item "focused"
  ok  Lesson 8 variants avoid known incoherent review items and chips

110 passed, 0 failed
```

### `npx tsx scripts/test-guided-today-data.ts`
```
[local progress migration]
  ok  legacy schema v1 localStorage is migrated to schema version 2
  ok  legacy schema v1 completed lesson remains complete overall
  ok  legacy schema v1 does not invent per-vibe badges
  ok  legacy single-path progress is migrated to A1 Practical 1 path id
  ok  legacy single-path progress key is removed after migration
  ok  written localStorage progress uses schema version 2

2698 passed, 0 failed
```

### `npx tsx scripts/test-checkpoint-selection.ts`
```
[path check]
  ok  Path Check can build a plan without completed lessons
  ok  Path Check samples only the selected path
  ok  Path Check preserves the selected active vibe
  ok  Path Check plan building does not mutate lesson progress
  ok  unknown Path Check path does not build a plan

15 passed, 0 failed
```

### `npx tsx scripts/test-checkpoint-trigger.ts`
```
  ok  empty progress has zero completed checkpoint paths
  ok  empty progress has no pending checkpoint
  ok  one fully completed active-vibe path counts as complete
  ok  one completed path and zero checkpoints triggers Quick Review
  ok  one completed path and one checkpoint does not trigger another Quick Review
  ok  partial second path does not advance completed path count
  ok  path completed in another vibe does not count for active vibe
  ok  same progress can trigger for the vibe that completed the second path

8 passed, 0 failed
```

### `npx tsx scripts/test-checkpoint-storage.ts`
```
  ok  completion record stores item review flags
  ok  read record round-trips the stored shape
  ok  Bright count advances after first completion
  ok  next Bright checkpoint index advances to 1
  ok  Wistful count is independent
  ok  second Bright completion writes index 1
  ok  second Bright completion uses independent timestamp
  ok  Bright count advances after second completion

15 passed, 0 failed
```

### `npm run check:i18n`
```
> frontend@0.0.0 check:i18n
> tsx scripts/check-i18n-coverage.ts

[i18n] Source locale en: 964 keys
[i18n] de: 964/964 keys covered
[i18n] fr: 952/964 keys covered. Missing keys are warn-only for now because French gaps are known and out of scope for the German Phase 0 PR:
  - speak.newChatConfirmAction
  - speak.newChatConfirmDescription
  - speak.newChatConfirmTitle
  - speak.studyModeOffToast
  - speak.studyModeOnToast
  - today.trophyWord.exampleLabel
  - today.trophyWord.title
  - today.trophyWord.whyLabel
  - today.vibeIndicator
  - today.vibePicker.exampleLabel
  - today.vibePicker.subtitle
  - today.vibePicker.title
```

### `npx eslint src/data/guidedLessons.ts`
```
(no output — clean)
```

### `npm run build`
```
✓ built in 1.13s
```
(Existing non-blocking warnings about chunk size and `src/lib/supabase.ts` dynamic
import remain. They are unrelated to this sweep.)

### `git diff --check` / `git diff --cached --check`
```
diff --check clean
cached diff --check clean
```

## Known Limitations and Conservative Choices

- The `?` lost-byte corruption in `?ber` was confidently resolved to `über` from
  context (`etwas Einfaches ?ber einen Ort` — only `über` fits both grammatically
  and semantically). No other `[A-Za-z]\?[A-Za-z]` patterns existed in the A1P1/P2/P3
  ranges.
- `cafe` and `Cafe` appear in **English** fields only inside the A1P1/P2/P3 ranges
  (`en:` situation descriptions, English `visualNotes`). Per scope ("English/target-
  language text fields … untouched"), these were left as-is. There is no German
  `Cafe` without acute accent in the modified ranges — every German `Café` instance
  already uses `é` (see lines 3351, 3386, 3456, 3361, 3431).
- `Aussage`, `passt`, `Kasse`, `dass`, `geschlossen`, `muss`, `wissen` all contain
  `ss` after a short vowel and are **correct** German. They were not changed.
- `zuerst` contains `ue` only as a morpheme boundary (`zu` + `erst`) — not an
  ASCII substitution. Not changed.
- `Ausstiegstür` on line 3185 already used proper Unicode and was a regex false
  positive in the inventory phase. Not changed.
- The visualNotes field (e.g., `'Warm map cue'`, `'Soft cafe sign'`) is English-
  language design guidance per repo convention. Not changed.
- A1P1's `wistfulLesson*` and `sharpLesson*` variants (lines 758–1832) were
  inventoried and contained zero ASCII substitutions or mojibake. No changes
  needed in that block.

## Out of Scope (per the prompt)

- Categories work
- A1P4–P10 path authoring
- `translations.ts` duplicate keys
- Test infrastructure improvements (recommended in the report above, but not
  implemented in this sweep)
- Frontend polish
- Any content changes beyond umlaut / ß / é corrections
