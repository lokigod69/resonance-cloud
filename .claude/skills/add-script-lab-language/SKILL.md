---
name: add-script-lab-language
description: Add a new writing system (Cyrillic, Kana, Arabic, Thai, Hebrew, …) to the Script Lab / Alphabet module in frontend/. Use when asked to add alphabet/script learning for a language, e.g. "add katakana" or "add the Greek alphabet". Covers data authoring, registry wiring, base-locale overlays, i18n, tests, and per-script-kind pedagogy rules.
---

# Add a writing system to Script Lab

Script Lab is the generic "learn the alphabet" module. Korean/Hangul is the reference
implementation. Adding a language is a **data authoring task** — the UI, quiz, audio
resolution, progress, routing, and Study-hub tile all pick up a new script automatically
from the registry. **Every new script also needs base-locale overlays in nine locale
files (step 3); `npm run test:script-lab` fails without them, and production shows
English to those locales.** Read these before writing anything:

- `docs/Product/FABLE_SCRIPT_LAB_ARCHITECTURE.md` — the architecture and per-kind guidance
  (its §4 predates the 2026-09-07 base-locale overlays, and hiragana has shipped)
- `frontend/src/lib/scriptlab/types.ts` — the contract (treat as frozen; see "Type changes" below)
- `frontend/src/data/scripts/koreanHangul.ts` — the reference data file
- `docs/Product/FABLE_SCRIPT_AUDIO_PROVIDER_PLAN.md` — audio rules

## Steps

1. **Author `frontend/src/data/scripts/<languageScript>.ts`** exporting a
   `ScriptDefinition` as default (e.g. `russianCyrillic.ts`). Follow the Hangul file's
   shape: an `lt(en, de, fr)` helper, symbols grouped by section, ids in kebab-case ascii.
2. **Register it**: append one entry to `SCRIPTS` in
   `frontend/src/lib/scriptlab/registry.ts` — `language` must be the canonical
   `LANGUAGES[].value` from `frontend/src/lib/languages.ts` (add the language there first
   if it's missing, following that file's own header instructions). Pick a single
   representative `emblem` character for tiles.
3. **Base-locale overlays**: authored text is `lt(en, de, fr)`; the nine other UI
   locales read whole overlays in `frontend/src/lib/scriptlab/locales/<locale>.ts`,
   keyed by `scriptContentKey` (a hash of each en/de/fr tuple). Every new or changed
   `LocalizedText` tuple needs entries in all nine files — changing any en/de/fr string
   orphans its nine overlay entries, and production then shows English for them. Update
   the tuple-count pin in `scripts/test-script-content-locales.ts` deliberately in the
   same change. Machine drafting uses `scripts/generate-script-content-locales.ts` (paid
   OpenRouter, no total budget cap): get owner approval with an explicit call limit, and
   sample the output with native-editorial care.
4. **Validate**: `npm run test:script-lab` (from `frontend/`). It runs
   `scripts/test-script-lab-data.ts` — unique ids, en/de/fr completeness,
   section/symbol referential integrity, unique audio itemIds, composition sanity — and
   `scripts/test-script-content-locales.ts` (tuple-count pin, whole-edition overlay
   coverage for the nine locales, destination-script checks). Add a script-specific
   `validate<Name>()` block in `scripts/test-script-lab-data.ts` for anything mechanical
   you can cross-check (like Hangul's Unicode composition round-trips).
5. **Verify**: `npm run typecheck`, `npm run lint` (0 errors), `npm run check:i18n`
   (always, even when you think no UI key changed; any new `scriptlab.*` UI key goes into every UI locale — `translations.ts`
   for en/de/fr plus `src/lib/locales/*.ts`), `npm run test:script-lab`. Then open
   `/alphabet/<scriptId>` at 390 px and desktop, in `en` and one lazy locale (e.g. `ja`):
   exercise Learn and Quiz (and Build if `composition` exists), confirm glyphs render and
   explanations come from the overlay, not English.
6. **Document**: update the "next scripts" list in the architecture doc if you shipped one
   of them, and record the session in `memory/` per the project protocol.

## Content rules (non-negotiable)

- **Accuracy over coverage.** Use ONE named romanization system for the language
  (Revised Romanization for Korean, practical transcription — BGN/PCGN style, not
  ISO 9 — for Russian, Hepburn for Japanese, …) and name it in the data file's header
  comment. Never invent pronunciation notes; if unsure of a detail, leave the optional
  field out.
- **Romanization is helper text**, never the learning target. Notes are one sentence,
  jargon-free, authored naturally in en/de/fr (German with real umlauts); the nine
  overlay locales follow step 3.
- **Example words**: common, beginner-relevant, contain the symbol prominently
  (word-initial where possible). Meanings authored in en/de/fr, overlays per step 3. In languages
  with stress-dependent vowel reduction (Russian: unstressed о sounds like [ɐ]), the
  symbol's position must also be STRESSED so the audible sound matches the taught one —
  осень, not окно.
- **Audio `text` is what a TTS engine must speak** — never a bare letter if engines
  misread it (spell letter names or carrier syllables instead; Hangul speaks 기역, not ㄱ).
  `itemId`s are stable asset keys: `symbol-<id>`, `syllable-<id>`, `word-<id>`.
- **Homophones**: if two symbols sound identical in the modern language, tag both with a
  shared `homophone:<group>` tag so the quiz never plays them against each other.
- **Final/positional variants use a neutral carrier.** QuizMode shows and plays the
  `exampleSyllable` for final-consonant symbols, so that syllable must not contain any
  other symbol's sound (Hangul finals all use silent-ㅇ carriers: 악, 안, 앋, … — never a
  consonant-initial syllable like 곧, which makes listen questions ambiguous). The quiz
  samples ALL sections including `advanced: true` ones; homophone tags matter everywhere.
- **V1 scope discipline**: basic inventory first; rarities and combining behavior go in
  `advanced: true` sections or a later pass. Don't encode every phonological rule.

## Per-kind notes

- **alphabet (Cyrillic, Greek):** no `composition` (the Build tab hides itself).
  Reference implementation: `frontend/src/data/scripts/russianCyrillic.ts`. For
  Cyrillic, section by familiarity: looks-and-sounds-familiar → false friends
  (В Н Р С У Х) → new letters → signs (ь ъ). Facts you must design around:
  - With no `exampleSyllable`, listen questions play `symbol.audio` — i.e. the **letter
    name** ("эр"), so the quiz tests name recall, not sound recognition. That's the
    accepted V1 behavior for alphabets; make letter-name audio unambiguous.
  - Distractors come from the same section, so a section with <4 symbols is
    **unquizzable by construction** (fine for signs; don't put teachable sounds in a
    tiny section). The quiz engine also skips distractors sharing a romanization
    (й/ы both "y" is safe), but don't rely on romanization alone to distinguish options.
  - Silent letters (ь ъ): use `type: 'mark'`, omit `ipa` entirely, and give both a
    shared `homophone:` tag — the suite treats identically-absent IPA as matching, and
    the tag defends against future quiz changes.
  - Case pairs (А/а, Б/б): V1 is uppercase-only; lowercase appears via example words. Do
    NOT hack lowercase into `character` — if a script truly needs it, that's a
    `lowercase?: string` type extension with UI + tests (see "Type changes").
- **syllabary (hiragana, katakana):** two separate registry entries sharing
  `language: 'Japanese'`; sections = gojūon rows, dakuten/handakuten and yōon as advanced.
  Reference implementation: `frontend/src/data/scripts/japaneseHiragana.ts`.
- **abjad (Arabic, Hebrew):** BLOCKED on two type extensions — contextual letterforms
  (`forms?: { isolated, initial, medial, final }` on `ScriptSymbol`) and
  `direction?: 'rtl'` on `ScriptDefinition` (UI must set `dir` on character containers).
  Land those (with UI support + tests) before authoring data. Vowel marks use `type: 'mark'`.
- **abugida (Thai, Devanagari):** representable today via compound symbols + example
  syllables; positional vowel visuals are a UI enhancement, not a data hack.
- **logographic (hanzi/kanji):** out of scope — do not attempt with this contract.

## Type changes

The contract in `types.ts` may be **extended** (new optional fields) but never narrowed;
every extension must come with: generic UI handling (or an explicit "ignored unless
present" story), coverage in `test-script-lab-data.ts`, and an update to the architecture
doc. Existing scripts must pass the suite unchanged.

## Do not

- Call ElevenLabs or any paid TTS during implementation (audio assets are a separate,
  explicitly-approved batch step — see the audio plan doc). Note:
  `scripts/generate-script-lab-audio.ts` runs live by default; always pass `--dry-run`
  first.
- Hardcode a language or script id inside `components/scriptlab/` or `pages/ScriptLab.tsx`.
- Add per-symbol Supabase progress rows or any schema.
- Add Script Lab to the primary nav (`components/layout/primaryNav.ts`) — the Study-hub
  tile is the entry point.
