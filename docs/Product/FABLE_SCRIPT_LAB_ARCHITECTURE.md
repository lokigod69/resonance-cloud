# Script Lab — Reusable Writing-System Architecture

**Status:** V1 implemented (Korean/Hangul), 2026-07-06
**Owner docs:** this file (architecture), `FABLE_HANGUL_V1_PRODUCT_SPEC.md` (Korean V1), `FABLE_SCRIPT_AUDIO_PROVIDER_PLAN.md` (audio)

## What this is

When a learner picks a language written in a non-Roman script (Korean, Arabic, Russian,
Japanese, Thai, …), the app must offer a clear way to learn the writing system, or the
product feels incomplete. Script Lab is that module: a premium, calm, mobile-first surface
where the learner explores the symbols, hears them, sees how they combine, and practices
recognition.

Korean/Hangul is the first implementation, but **nothing Korean-specific lives in the UI**.
The architecture is a registry of `ScriptDefinition`s; adding Cyrillic or Kana is a data
task, not a UI project.

Naming: internal name is **Script Lab** (`lib/scriptlab/`, `components/scriptlab/`).
User-facing surface is called **Alphabet** (route `/alphabet`, tile label
`study.mode.script` = "Alphabet") — the word learners actually search for, even where the
system is technically a syllabary or abjad. Per-script pages lead with the native name
(한글) so the friendly label never miseducates.

## Layer separation

```
src/lib/scriptlab/types.ts       ← generic contract (ScriptDefinition, ScriptSymbol, …)
src/lib/scriptlab/registry.ts    ← SCRIPTS: light metadata + lazy load() per script
src/lib/scriptlab/audio.ts       ← audio resolution: manifest asset → browser speech
src/lib/scriptlab/progress.ts    ← localStorage progress (seen symbols, quiz best)
src/lib/scriptlab/hangul.ts      ← Korean-only: Unicode block math (pure, tested)
src/data/scripts/koreanHangul.ts ← Korean-only: the content inventory
src/pages/ScriptLab.tsx          ← generic page (Learn | Build | Quiz tabs)
src/components/scriptlab/*       ← generic UI (SymbolGrid, SymbolDetailPanel,
                                    BuildMode, QuizMode, ScriptAudioButton)
scripts/test-script-lab-data.ts  ← integrity suite over every registered script
```

Rules that keep it reusable:

1. **UI reads only `ScriptDefinition`.** Components never import a language data file or
   `hangul.ts`. Script-specific behavior enters through data (sections, tags) and through
   the optional `composition` capability object.
2. **Registry entries are cheap.** `SCRIPTS` holds only metadata (id, language, emblem,
   names) so tiles and gates can import it anywhere without pulling content; the symbol
   inventory loads with the page chunk via `entry.load()` — the same discipline as
   `routeImports.ts` and the guidedLessons dynamic-import rule.
3. **Language linkage is by canonical value.** `entry.language` is the `LANGUAGES[].value`
   from `lib/languages.ts` ('Korean'), the same value used by `activeLanguage` and
   `decks.target_language`. No parallel language registry.
4. **Content localization lives in the data**, as `LocalizedText { en, de, fr }` (mirrors
   `staticCategoryTranslations.ts`). UI chrome goes through `t()` keys (`scriptlab.*`) in
   `translations.ts`. The integrity suite enforces all three locales on every content
   string, which is stricter than `check:i18n` (de required, fr warn-only) on purpose:
   script content ships rarely and should ship complete.
5. **Audio is spec-first.** Symbols never assume a provider. Each playable surface declares
   `{ itemId, text }` — the exact string a TTS engine should speak (letter *names* like
   기역, never bare jamo, which every engine misreads). Resolution order: static asset
   manifest → browser speechSynthesis. See the audio plan doc.

## The contract, briefly

`ScriptDefinition`: id, language, `speechLang` (BCP-47), `kind`
('alphabet' | 'abjad' | 'syllabary' | 'abugida' | 'logographic'), native/display names,
localized tagline + intro paragraphs (the "how this writing system works" lesson),
`sections` (ordered, `advanced?` flag), `symbols`, optional `composition`.

`ScriptSymbol`: id, character, type ('consonant' | 'vowel' | 'double-consonant' |
'compound-vowel' | 'final-consonant' | 'mark'), optional native name, romanization
(helper text, never the learning target), optional IPA, localized one-line
pronunciation note, example syllable (+ declared audio spec), example word
(word, romanization, localized meaning, audio spec), symbol audio spec, order, tags.

`ScriptComposition` (optional capability): `initialIds` / `medialIds` / `finalIds?` and a
pure `compose(initialId, medialId, finalId?) → { text, romanization, audio } | null`.
The Build tab renders only when this exists.

Tags carry cross-cutting semantics without new fields. Current convention:
`homophone:<group>` — symbols sharing a group sound identical in the modern language
(ㅐ/ㅔ, ㅒ/ㅖ, ㅙ/ㅚ/ㅞ); the quiz never uses them against each other in listening
questions. Future conventions should follow the same `namespace:value` shape.

## Adding a new writing system

1. Author `src/data/scripts/<name>.ts` exporting a `ScriptDefinition` as default.
2. Append one entry to `SCRIPTS` in `lib/scriptlab/registry.ts`.
3. `npm run test:script-lab` — the suite validates every registered script (unique ids,
   full locale coverage, section/symbol referential integrity, composition round-trips).
4. Done: the Study-hub tile appears for that language automatically
   (`getScriptsForLanguage(activeLanguage)` in `StudyModeSelector.tsx`), and
   `/alphabet/<id>` routes to it.

There is a project skill (`.claude/skills/add-script-lab-language/SKILL.md`) that walks an
agent through exactly this, including per-kind pedagogy guidance and the content-accuracy
checklist.

Per-kind guidance for the next scripts:

- **russian-cyrillic (alphabet):** straightforward — sections like "letters that look and
  sound familiar" / "false friends (В, Н, Р, С)" / "new letters" / "signs (ь, ъ)". No
  composition. The false-friend framing belongs in section descriptions and notes.
- **japanese-hiragana / japanese-katakana (syllabary):** two separate registry entries
  sharing one language ('Japanese') — the Study tile maps over all matches. Sections =
  gojūon rows (あ/か/さ…), then dakuten/handakuten as advanced, then combos (きゃ) as
  advanced. No `composition` in the Hangul sense; a future light "modifier" capability
  (base + dakuten) can be added as a new optional capability object without breaking
  existing scripts.
- **arabic-abjad (abjad):** the known architectural gap is **contextual letterforms**
  (isolated/initial/medial/final) and **RTL rendering**. Plan: add an optional
  `forms?: { isolated, initial, medial, final }` field to `ScriptSymbol` and a
  `direction?: 'rtl'` field to `ScriptDefinition` (UI sets `dir` on character containers).
  Harakat (vowel marks) use `type: 'mark'`, teaching that short vowels are usually
  unwritten. Do not start Arabic before landing those two fields.
- **hebrew-abjad:** same direction work as Arabic; final letterforms (ך ם ן ף ץ) fit the
  planned `forms` field.
- **thai (abugida):** vowels attach around consonants (before/above/below/after) —
  representable today as compound symbols + example syllables; a proper "vowel position"
  visual is a UI enhancement, not a data change. Tone classes belong in section pedagogy,
  not V1 symbol fields.
- **logographic (hanzi/kanji):** out of scope by design. The `kind` exists so the registry
  can hold e.g. a radicals-only module someday; do not attempt full logographic coverage
  with this contract.

## Entry points

- **Route:** `/alphabet` (auto-resolves the script from `activeLanguage`, falls back to a
  chooser) and `/alphabet/:scriptId` (deep link, used by tiles). Registered under both
  skins in `App.tsx`; the page is skin-agnostic and styled purely with theme variables.
- **Study hub:** registry-gated tile in `StudyModeSelector.tsx` — appears exactly when the
  active language has a registered script.
- **Future (deliberately not V1):** dashboard `dashboard-library-tile`-style entry,
  onboarding prerequisite step ("Korean is written in Hangul — learn it first?"), and a
  Guided Today teaser once Korean becomes a `GuidedTargetLanguage`. The main nav is full
  (`MobileBottomNav` is a hard 6-slot grid) — do not add a nav item for this.

## Progress persistence

V1 is local-only (`scriptlab:v1:<scriptId>` in localStorage: seen symbol ids + best quiz
score), matching the Guided Today local-progress precedent. If/when backend sync is
requested: one row per (user, script) with the same JSON shape is sufficient; do not build
per-symbol SRS rows — if symbols ever enter SRS, they should become cards in the existing
deck engine instead of a parallel scheduler.

## What is Korean-specific vs reusable

| Korean-specific | Reusable |
|---|---|
| `data/scripts/koreanHangul.ts` (content) | types, registry, audio resolution, progress |
| `lib/scriptlab/hangul.ts` (block math) | page, all `components/scriptlab/*` |
| `composition` wiring for jamo → blocks | quiz generation (homophone-tag aware) |
| Hangul cross-checks in the test suite | generic integrity checks in the test suite |
