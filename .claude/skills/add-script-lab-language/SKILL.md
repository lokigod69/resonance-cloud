---
name: add-script-lab-language
description: Add a new writing system (Cyrillic, Kana, Arabic, Thai, Hebrew, …) to the Script Lab / Alphabet module in frontend/. Use when asked to add alphabet/script learning for a language, e.g. "add Russian alphabet support" or "build the hiragana module". Covers data authoring, registry wiring, i18n, tests, and per-script-kind pedagogy rules.
---

# Add a writing system to Script Lab

Script Lab is the generic "learn the alphabet" module. Korean/Hangul is the reference
implementation. Adding a language is a **data authoring task** — the UI, quiz, audio
resolution, progress, routing, and Study-hub tile all pick up a new script automatically
from the registry. Read these before writing anything:

- `docs/Product/FABLE_SCRIPT_LAB_ARCHITECTURE.md` — the architecture and per-kind guidance
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
3. **Validate**: `npm run test:script-lab` (from `frontend/`). The suite checks every
   registered script generically — unique ids, en/de/fr completeness on all content,
   section/symbol referential integrity, unique audio itemIds, composition sanity. Add a
   script-specific `validate<Name>()` block in `scripts/test-script-lab-data.ts` for
   anything mechanical you can cross-check (like Hangul's Unicode composition round-trips).
4. **Verify**: `npm run typecheck`, `npm run lint` (zero new errors), `npm run check:i18n`
   (only needed if you touched `translations.ts`), `npm run test:script-lab`.
5. **Document**: update the "next scripts" list in the architecture doc if you shipped one
   of them, and record the session in `memory/` per the project protocol.

## Content rules (non-negotiable)

- **Accuracy over coverage.** Use the official romanization system for the language
  (Revised Romanization for Korean, ISO 9 / practical transcription for Russian, Hepburn
  for Japanese, …) and name it in the data file's header comment. Never invent
  pronunciation notes; if unsure of a detail, leave the optional field out.
- **Romanization is helper text**, never the learning target. Notes are one sentence,
  jargon-free, localized naturally in en/de/fr (German with real umlauts).
- **Example words**: common, beginner-relevant, contain the symbol prominently
  (word-initial where possible). Meanings localized in all three locales.
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

- **alphabet (Cyrillic, Greek):** no `composition`. For Cyrillic, section by familiarity:
  looks-and-sounds-familiar → false friends (В Н Р С У Х) → new letters → signs (ь ъ).
- **syllabary (hiragana, katakana):** two separate registry entries sharing
  `language: 'Japanese'`; sections = gojūon rows, dakuten/handakuten and yōon as advanced.
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
  explicitly-approved batch step — see the audio plan doc).
- Hardcode a language or script id inside `components/scriptlab/` or `pages/ScriptLab.tsx`.
- Add per-symbol Supabase progress rows or any schema.
- Add a 7th item to the primary nav (`MobileBottomNav` is a hard 6-slot grid) — the
  Study-hub tile is the entry point.
