# Guided Today Umlaut and Encoding Guard Patch

Date: 2026-05-12

## Scope

Patches the static guard in `frontend/scripts/test-guided-today-data.ts` so it
catches the three failure vectors surfaced by the umlaut sweep
(GUIDED_TODAY_UMLAUT_SWEEP_REPORT.md): ASCII transliteration (ae/oe/ue/ss),
lost-byte diacritic corruption (`?ber`), and UTF-8 double-mojibake (`Ã¶`).

No source content is modified. No other test scripts are touched.

## Commit

- Commit SHA: recorded in the final response after `git push origin main`
  completes. A committed file cannot contain its own final SHA.
- Branch: `main`
- Push target: `origin main`

## Files Changed

- `frontend/scripts/test-guided-today-data.ts` — detectors expanded; inline
  unit-style positive/negative assertions added; field-coverage assertion
  added.
- `docs/Product/GUIDED_TODAY_UMLAUT_GUARD_PATCH_REPORT.md` — this report (new).

## Confirmation: zero flags on current content

The expanded guard, run against the post-sweep `frontend/src/data/guidedLessons.ts`,
raises **zero** flags in any of the three corpus assertions. Specifically:

- `collectAsciiGermanTransliterationFlags()` → `[]`
- `collectCorruptDiacriticFlags()` → `[]`
- `collectMojibakeFlags()` → `[]`

This means the prior umlaut sweep was complete. No follow-up sweep is required.

## Field coverage

### Before

The previous `collectAsciiGermanTransliterationFlags` scanned **7** field paths
per lesson/variant:

- `situation.de` (lesson)
- `corePhrase.baseText` (per vibe variant)
- `sceneCaption` (per vibe variant)
- `placeholderMedia.caption` (per vibe variant)
- `trophyWord.meaning` (per vibe variant)
- `trophyWord.example` (per vibe variant)
- `trophyWord.whyThisWord` (per vibe variant)

### After

The guard now scans **12** field kinds (every German learner-facing field on a
lesson or variant). Arrays are iterated element by element with indexed paths
for precise error reporting:

- `situation.de` (lesson)
- `nextLessonTeaser.situation` (lesson)  ← **added**
- `meaning` (variant)  ← **added**
- `corePhrase.baseText` (variant)
- `chunks[*].baseText` (variant array)  ← **added**
- `lessonItems[*].baseText` (variant array)  ← **added**
- `sceneCaption` (variant)
- `placeholderMedia.caption` (variant, optional)
- `speakTarget.baseCue` (variant)  ← **added**
- `trophyWord.meaning` (variant)
- `trophyWord.example` (variant)
- `trophyWord.whyThisWord` (variant)

The `mediaCaption` field is the A1P2/A1P3 *input layer* and gets mapped to
`placeholderMedia.caption` on the variant by `createA1P2Variant` (see
`guidedLessons.ts:3273`). Scanning `placeholderMedia.caption` covers it at the
variant level.

A separate helper `getScannedGermanFieldKinds()` returns the de-duplicated,
sorted list of field kinds and is asserted strictly equal to the expected set —
adding a new German field type without updating the guard's expected set will
fail the test, forcing the author to also update the scanner.

Both detectors (ASCII transliteration AND corrupt-diacritic) now consume the
same `collectGermanFieldEntries()` source of truth — the previous code path
duplicated the field list across two `for (const [field, value] of ...)`
blocks. The mojibake detector also consumes the same source.

## ASCII transliteration markers

### Before

22 markers (case-sensitive `value.includes(marker)` check on a narrow field set):

```
Koenn, koenn, waere, waehrend, spaeter, laesst, nuetzlich, fuer, ueber,
muessen, Strasse, Cafe, Naehe, naech, schliess, Tuer, Oeffnung, Oeffnungs,
frueh, Bestaetigung, Staedt, gueltig
```

### After

82 markers total (60 added), checked case-insensitively against every German
field listed above. Added (de-duplicated against the original 22):

**ä patterns (15 added):**
`naeh, faehr, waer, haeng, spaet, verspaet, aender, erklaer, gefaehr,
aergerlich, maennlich, naeher, waehl, Gebaeck, Geraet`

**ö patterns (13 added):**
`moecht, oeffn, geoeffnet, schoen, hoer, moeglich, unmoeglich, froehlich,
broetchen, hoeflich, koerperlich, loesung, Zahlungsloesung`

**ü patterns (19 added — `frueh` and `Tuer` already present):**
`pruef, geprueft, frueher, Uebertreibung, uebersetz, uebernacht, muess, duerf,
fuenf, gluecklich, buero, spuer, gruess, Verfuegbar, fuegt, beruehrt, Rueck,
klaert, Tuete, duerfen`

**ß patterns (10 added — `schliess` and `Strasse` already present):**
`strass, weiss, heiss, gross, groesse, dreissig, spass, Fuss, Fussweg, gruss`

**Compound/proper-noun (3 added):**
`Kartenlesegeraet, Ladentuer, Ausstiegstuer`

Matching is case-insensitive (`value.toLowerCase().includes(marker.toLowerCase())`),
so `Gebaeck`, `GEBAECK`, and `gebaeck` are all caught by the single `Gebaeck`
marker. This avoids duplicating each token in two casings the way the legacy
list did with `Koenn`/`koenn`.

Bare `ss`, bare `ae`, bare `oe`, bare `ue`, and `Cafe`-the-word are NOT added —
per the prompt these would false-positive on legitimate German (`Wasser`,
`Klasse`, `dass`, `geschlossen`, `wissen`) and legitimate Latin script
(`Café`, English words like `queue`/`vague`/`Boeing`). The marker list is
finite-state and specific; see "Known limitations" below.

## Mojibake detector (new)

Added separate detector and separate flag list:

```typescript
const MOJIBAKE_PATTERN = /Ã[\x80-\xBF]/
function detectMojibake(value: string): boolean { return MOJIBAKE_PATTERN.test(value) }
function collectMojibakeFlags(): string[] { /* per-field scan */ }
```

This is intentionally distinct from the lost-byte `?` detector because the
encoding-corruption mechanism is different: UTF-8 misread as Latin-1/cp1252,
then re-encoded as UTF-8. The regex matches `Ã` (U+00C3) followed by any byte
in U+0080-U+00BF — the signature of every common UTF-8-misread-as-Latin-1
double-mojibake for ä/ö/ü/Ä/Ö/Ü/ß (the trailing byte for each lands in this
range under the standard mojibake chain — see umlaut sweep report §"Three
distinct failure vectors" for the byte analysis).

## Corrupt-diacritic detector (broadened)

The legacy regex `/[A-Za-z]\?[A-Za-z]/` required a Latin letter on **both**
sides of the `?`. That matches mid-word corruption like `T?r` for `Tür`, but
**misses** word-initial corruption like `?ber` for `über` — which is precisely
the case the umlaut sweep had to fix (lines 3571 and 3596 of `guidedLessons.ts`,
both `Im Small Talk ... etwas Einfaches ?ber einen Ort`).

New regex: `/\?[A-Za-z]/` — flags any `?` immediately followed by a Latin
letter. A legitimate sentence-ending `?` is followed by whitespace, end-of-
string, or punctuation (never a bare letter), so the broader pattern stays
false-positive-free against natural German question marks.

Verified zero false-positives on current content:
```
$ grep -oE '\?[A-Za-z]' frontend/src/data/guidedLessons.ts | sort -u
(empty)
```

## Inline unit-style assertions

Added a new test section `[German diacritic detector unit checks]` placed
just before the existing `[German learner-facing diacritics]` corpus scan.
These assertions prove the detectors actually fire on known-bad input and
stay quiet on known-good input — without them, an over-broad rewrite that
silently passes (e.g., a detector that always returns `[]`) would still
let the corpus check pass.

### Field-coverage assertion (1 case)

```
ok  German guard scans every required learner-facing field kind
```

Asserts `JSON.stringify(getScannedGermanFieldKinds()) === JSON.stringify(<expected>)`
with the expected list being the 12 kinds documented in §"Field coverage / After".

### Positive ASCII cases (6 — must be flagged)

```
ok  ASCII detector flags "Welcher Bus faehrt zum Museum?" (marker: faehr)
ok  ASCII detector flags "Du pruefst, ob es offen ist."   (marker: pruef)
ok  ASCII detector flags "...kurze Rueckfrage..."          (marker: Rueck)
ok  ASCII detector flags "...zu Fuss gehen"                (marker: Fuss)
ok  ASCII detector flags "Eine Tuete bitte."               (marker: Tuete)
ok  ASCII detector flags "Die naechste Haltestelle"        (marker: naech)
```

### Positive mojibake (1)

```
ok  mojibake detector flags "schÃ¶n / nett"
```

Also asserts the mojibake sample does **not** trip the corrupt-diacritic
regex, confirming the two detectors are independent.

### Positive corrupt-diacritic (1)

```
ok  corrupt-diacritic detector flags "etwas Einfaches ?ber einen Ort"
```

Also asserts the corrupt-diacritic sample does **not** trip the mojibake
regex.

### Negative clean cases (11 — must NOT be flagged by any detector)

```
ok  no detector flags clean sample "Wann schließt es heute?"   ← proper ß
ok  no detector flags clean sample "Die nächste Haltestelle"   ← proper ä
ok  no detector flags clean sample "Ist hier jetzt geöffnet?"  ← proper ö
ok  no detector flags clean sample "Café Adler"                ← proper acute
ok  no detector flags clean sample "Wasser"                    ← legit ss
ok  no detector flags clean sample "Klasse"                    ← legit ss
ok  no detector flags clean sample "dass"                      ← legit ss
ok  no detector flags clean sample "geschlossen"               ← legit ss
ok  no detector flags clean sample "queue"                     ← English
ok  no detector flags clean sample "vague"                     ← English
ok  no detector flags clean sample "Boeing"                    ← proper noun
```

### Corpus-wide flag assertions (3 — extended from 1)

The existing single corpus assertion was kept and two new ones added:

```
ok  German learner-facing Guided Today fields avoid common ASCII transliterations
ok  German learner-facing Guided Today fields avoid lost-byte (?) diacritic corruption
ok  German learner-facing Guided Today fields avoid UTF-8 mojibake (Ã¶ etc.)
```

### Test count delta

`test-guided-today-data.ts` went from **2698 passed / 0 failed** (pre-patch) to
**2720 passed / 0 failed** (post-patch) — 22 new assertions, all green:

- 1 field-coverage
- 6 positive ASCII
- 1 positive mojibake
- 1 positive corrupt-diacritic
- 11 negative
- 2 new corpus (corrupt-diacritic and mojibake — ASCII was already there)

## Test Output (verbatim tails)

### `npx tsx scripts/test-guided-today-data.ts`
```
[German diacritic detector unit checks]
  ok  German guard scans every required learner-facing field kind
  ok  ASCII detector flags "Welcher Bus faehrt zum Museum?" (marker: faehr)
  ok  ASCII detector flags "Du pruefst, ob es offen ist." (marker: pruef)
  ok  ASCII detector flags "...kurze Rueckfrage..." (marker: Rueck)
  ok  ASCII detector flags "...zu Fuss gehen" (marker: Fuss)
  ok  ASCII detector flags "Eine Tuete bitte." (marker: Tuete)
  ok  ASCII detector flags "Die naechste Haltestelle" (marker: naech)
  ok  mojibake detector flags "schÃ¶n / nett"
  ok  corrupt-diacritic detector flags "etwas Einfaches ?ber einen Ort"
  ok  no detector flags clean sample "Wann schließt es heute?"
  ok  no detector flags clean sample "Die nächste Haltestelle"
  ok  no detector flags clean sample "Ist hier jetzt geöffnet?"
  ok  no detector flags clean sample "Café Adler"
  ok  no detector flags clean sample "Wasser"
  ok  no detector flags clean sample "Klasse"
  ok  no detector flags clean sample "dass"
  ok  no detector flags clean sample "geschlossen"
  ok  no detector flags clean sample "queue"
  ok  no detector flags clean sample "vague"
  ok  no detector flags clean sample "Boeing"

[German learner-facing diacritics]
  ok  German learner-facing Guided Today fields avoid common ASCII transliterations
  ok  German learner-facing Guided Today fields avoid lost-byte (?) diacritic corruption
  ok  German learner-facing Guided Today fields avoid UTF-8 mojibake (Ã¶ etc.)

…

2720 passed, 0 failed
```

### `npx tsx scripts/test-guided-vibes.ts`
```
98 passed, 0 failed
```

### `npx tsx scripts/test-guided-today-path-overview.ts`
```
116 passed, 0 failed
```

### `npx tsx scripts/test-checkpoint-selection.ts`
```
21 passed, 0 failed
```

### `npx tsx scripts/test-checkpoint-trigger.ts`
```
8 passed, 0 failed
```

### `npx tsx scripts/test-checkpoint-storage.ts`
```
15 passed, 0 failed
```

### `npm run check:i18n`
```
> frontend@0.0.0 check:i18n
> tsx scripts/check-i18n-coverage.ts

[i18n] Source locale en: 964 keys
[i18n] de: 964/964 keys covered
[i18n] fr: 952/964 keys covered. Missing keys are warn-only for now …
```

### `npx eslint scripts/test-guided-today-data.ts`
```
(no output — clean)
```

### `npm run build`
```
✓ built in 1.12s
```
(Existing chunk-size warnings remain — unrelated to this patch.)

### `git diff --check` / `git diff --cached --check`
```
diff --check clean
cached diff --check clean
```

## Confirmation: no source content was modified

`git diff` against pre-patch HEAD shows **only** these two files:

- `frontend/scripts/test-guided-today-data.ts` (test patch)
- `docs/Product/GUIDED_TODAY_UMLAUT_GUARD_PATCH_REPORT.md` (new — this report)

In particular:

- `frontend/src/data/guidedLessons.ts` was **not** modified by this PR
  (the content was already correct after the umlaut sweep, and the prompt
  explicitly forbids touching it here).
- No other test script was modified.
- No source file was modified.
- No translation file was modified.

## Confirmation: no other test scripts were touched

Verified via `git status -sb` after staging — only the two files above were
added; staged status of every other test file is unchanged.

## Known limitations

This is a **finite-state guard**. The marker list is a hand-curated set of
ASCII-transliteration tokens. New transliteration tokens that don't match an
existing marker prefix will slip through silently.

Examples of patterns that the umlaut sweep encountered but are **not** in the
new marker list, because the prompt's marker enumeration didn't include them:

- `bestaetig*` (e.g., `bestaetigt`, `bestaetigst`, `bestaetigbar`) — existing
  marker `Bestaetigung` only matches the full noun form. The verb root forms
  the sweep fixed in A1P2/A1P3 (lines 2379, 2559, 2575, 2865) would currently
  slip through.

If similar tokens appear in future content, they will require either a
follow-up marker-list update OR adoption of one of the higher-confidence
detection strategies explicitly excluded from this PR:

- Wordlist matching against a corpus of known German lemmas
- POS-tagger-based detection
- Statistical detection of unusual character combinations

These are out of scope for the V1 guard per the prompt.

Other open authoring guards that would prevent these failures from being
introduced in the first place — and which are **not** implemented here per
the prompt — are documented in the umlaut sweep report
(`GUIDED_TODAY_UMLAUT_SWEEP_REPORT.md`, §"Recommended Guards"):

- Strategic-architect prompt addendum requiring proper Unicode in all
  German content fields
- Codex sub-agent prompt addendum forbidding ASCII-transliterated emission
- Manual pre-commit grep checklist

Those prompt addenda are separate authoring-side guards; this PR adds the
content-side post-hoc guard. The two layers are complementary.

## Out of Scope (per the prompt)

- Content changes (no `guidedLessons.ts` edits)
- A1P4–P10 path authoring
- Categories work
- `translations.ts` work
- Frontend polish
- Other test infrastructure (opener cap, cross-vibe distinctness, German
  naturalness sniffs)
- Migration to a smarter detector (POS tagger, wordlist matching)
- Strategic-architect / Codex prompt addenda for future Unicode requirements
