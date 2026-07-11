# FABLE — Language Architecture

What "a language" is in Lingwave: every touchpoint, required vs optional tiers, data
flows, and known landmines. Written 2026-07-06 from a five-way investigation (four
focused agent reports + a Codex full-repo sweep), with decision-critical files verified
by hand. Companion skills: `.claude/skills/add-target-language`,
`.claude/skills/add-base-locale`, `.claude/skills/review-language-addition`,
`.claude/skills/add-script-lab-language`.

All paths relative to `orchestrator/frontend` unless noted. Line numbers are as of
2026-07-06 — treat them as pointers, not gospel; re-grep before editing.

> **Delta 2026-07-12** (details: `investigations/LANGUAGE_SURFACE_UNIFICATION_2026_07_12.md`):
> `LANGUAGES` now has **15 entries** — Russian (2026-07-06, wizard+landing+speak) and
> **Polish** (2026-07-12, wizard-only; has guided Tier 5 + categories, NOT isSpeak) were
> added, and `isWizard` was flipped on for Portuguese/Dutch/Hindi/Arabic (wizard = 15).
> `api/guided-transcribe.ts` now accepts every guided speak locale and forwards proper
> Whisper hints (was en-US/en-GB-only with a hardcoded 'en' — the §5 text below is stale
> on this point). Static-TTS generation tooling is now ON main
> (`orchestrator/scripts/generate_static_thematic_tts.py`, `orchestrator/src/services/guided_tts/`)
> — landmine 8's worktree note is obsolete (worktrees deleted in the 2026-07-11 cleanup).
> `components/dashboard/articleDisplay.ts` (§6) no longer exists — article/gender rules
> live in the Lens prompt (`api/_shared/visualScanProvider.ts`) and `lib/typedAnswer.ts`'s
> article sets. Vibe reality check: only English has wistful/sharp variants; all other
> guided languages are bright-only (quality review 2026-07-12). **Korean now has guided
> A1 Practical 1** via the new per-language module pattern `src/data/guided/koreanA1.ts`
> (type-only imports from guidedLessons.ts; new guided languages go in such modules, not
> the monolith). Speech-scoring normalizers are Unicode-aware as of 2026-07-12 — non-Latin
> guided targets are safe.

---

## 1. The two expansions — never conflate them

- **Target language** (what you learn): an entry in the `LANGUAGES` registry plus
  optional content tiers. Well-bounded; Tier 0 is one line of code (§4).
- **Base/UI locale** (what you learn *from*): a member of the `Locale` union
  (`'en' | 'de' | 'fr'`) with ~1,469 translated UI strings and a cascade of
  type-level changes (§7). Much bigger. A language can be a target without being a
  base locale (Korean), a selectable base without a real locale (Italian — silently
  gets the English UI), or both (German).

## 2. The canonical registry — and the registries that ignore it

`src/lib/languages.ts` is the declared single source of truth: `LANGUAGES` (13 entries
as of today) with `value` (canonical English name, matches `profiles.base_language`),
`nativeName`, `code` (ISO 639-1/BCP-47), optional `landingColor`/`wizardColor`, and four
capability flags — `isBase`, `isWizard`, `isLanding`, `isSpeak` — from which
`BASE_LANGUAGES` / `WIZARD_LANGUAGES` / `LANDING_LANGUAGES` / `SPEAK_LANGUAGES` derive.

Current matrix (2026-07-06): English, German, French, Italian, Bisaya (`ceb`), Tagalog
(`fil`), Korean, Spanish = all four flags. Indonesian = wizard+landing+speak. Dutch,
Hindi = landing+speak. Portuguese, Arabic = speak only.

**But not every surface reads this file.** There are four disjoint language registries
plus two derived lists, and they already diverge:

| # | Registry | File | Gates | Divergence today |
|---|---|---|---|---|
| 1 | `LANGUAGES` flags | `lib/languages.ts` | onboarding, wizard, landing chips, Speak picker | — (canonical) |
| 2 | `GuidedTargetLanguage` + `TARGET_LANGUAGES` | `data/guidedLessons.ts:12`, `lib/todayLanguage.ts:5-15` | guided Today | adds **Polish**; says **'Cebuano'** where #1 says **'Bisaya'** |
| 3 | `STATIC_CATEGORY_TRANSLATION_LANGUAGES` | `data/categories.ts:30-59` | curriculum categories | adds **Polish**; 10 codes with `status` + `script:` fields |
| 4 | `SCRIPTS` | `lib/scriptlab/registry.ts` | Alphabet tile | Korean only |
| 5 | deck-derived `availableLanguages` | `DashboardPG.tsx:73`, `StudyModeSelector.tsx:67-70` | dashboard pills, study hub | whatever the user's decks contain |
| 6 | `LANDING_ORDER` | `components/landing/landingData.ts:81-93` | landing chip order | chip = `isLanding` **AND** in this array; else silently dropped |

A language is only fully "present" when added to every relevant list. The skills encode
this as explicit steps.

## 3. Data flows

**Canonicalization.** `canonicalizeLanguageValue` (`lib/languages.ts:63-73`) resolves an
ISO code or English name (case-insensitive) to the canonical `value`; unknown input
falls through **unchanged** (never throws). `getLanguageCode` does the reverse;
`getLanguageQueryValues` returns `[name, code, raw]` for Supabase `.in()` queries —
which exists because `decks.target_language` is treated as possibly holding **either**
form (historical mixed data; unverified against the live DB). `languagesMatch` compares
canonicalized. `isoToWizardValue` (`:111-113`) is an alias whose empty-string-on-null
behavior is load-bearing for RPC required-param checks.

**Supabase storage conventions** (per frontend code, not DB inspection):

| Column | Form | Written by |
|---|---|---|
| `profiles.base_language` | English name (`'Korean'`) | `Onboarding.tsx:56-60`, `ProfileModal.tsx` |
| `decks.target_language` | English name, defensively read as mixed | `GenerateGO.tsx:669,681`, `curriculumDeckBridge.ts:442` |
| `music_generation_jobs.target_language` | English name | `Music.tsx:164` / `MusicPG.tsx:171` |
| `speak_conversations.language` | ISO code | `useGrokRealtime.ts:701`, `useVoiceTutor.ts:330` |
| `static_tts_playback.target_language_code` (view) | ISO code | read-only from frontend |
| `voice_samples.language` | ISO code | read by `api/voice-sample.ts:60-69` |
| `recall_attempts` | **no language column** — via word → deck | `useStudySession.ts:259-261` |

**Base language → UI locale.** `useTranslation.ts:19`:
`LANGUAGE_TO_LOCALE[profile?.base_language ?? ''] ?? 'en'`. The map
(`translations.ts:19-25`) only sends German→de, French→fr; everything else (including
Korean and Spanish, deliberately) → English UI. A parallel resolver
`profileBaseLanguageToIso` (`data/curriculumCategories.ts:190-197`) returns ISO codes
and **defaults to `'de'`** on unknown input — a differently-shaped fallback to keep in
mind.

**Active target language.** React context, not profile:
`contexts/LanguageProvider.tsx` stores per-user in localStorage
(`resonance_active_language_<userId>`), seeds from the most recent deck if unset.
Dashboard pills and the study hub derive their language list from the user's decks —
a language with no deck never appears there, regardless of flags.

## 4. Launch tiers for a target language

Verified bottom line: **deck generation works for any language string** —
`api/suggest-words.ts` (and `extract-vocabulary`, `translate-and-ipa`) interpolate the
language into LLM prompts with only a length check. Curriculum images are shared,
English-keyed concept renders (`/curriculum/en/set-a|set-c/…`, ~2,300 webp) — **zero
per-language image cost**. The only per-language paid media are static thematic TTS
(Tier 2) and Voxtral voice cloning (Tier 3b).

| Tier | What | Required changes | Paid assets | Degrades without |
|---|---|---|---|---|
| **0 — Wizard** | selectable target, deck gen, study modes, games, music | one `LANGUAGES` entry with `isWizard` + `wizardColor`; `langName.*` i18n keys | none | no categories browse, silent thematic cards, no guided/Speak/alphabet |
| **1 — Curriculum** | thematic categories browse + study | code in `StaticCategoryTargetLanguageCode` + metadata entry (`categories.ts`), ~1,850 concept terms in `staticCategoryTranslations.ts` | none (images shared) | cards are **silent** (no browser fallback on category pages) |
| **2 — Curated TTS** | voice on thematic cards | voice profiles in `staticThematicAudio.ts:47-96` + Supabase `static_tts_playback` rows | ElevenLabs batch (pipeline on worktree branch 61f3c245, NOT main); 1–6 voices/lang precedent | silent cards |
| **3a — Speak (Gemini)** | voice tutor, shared voices | `isSpeak` flag + code in `api/` allow-sets (§5) + `SPEAK_ORDER` | ~none (26 shared Gemini voices) | absent from Speak picker |
| **3b — Speak (Voxtral)** | dedicated cloned voices | `TUTOR_VOICES` entries + sample MP3s via `scripts/generate-voices.ts` | ElevenLabs + Mistral cloning, 4–20 voices/lang precedent | falls back to Gemini path or English voice pool |
| **4 — Script Lab** | alphabet module (non-Latin only) | data pack + registry entry — see `add-script-lab-language` skill | optional ~130 clips (~2 MB) | no Alphabet tile |
| **5 — Guided** | Today mission A1 course | `GuidedTargetLanguage` union + `TARGET_LANGUAGES` set + speak locale + **10 authored lessons** with vibe variants, base text in en+de | optional `guided_tts_playback` batch (browser-speech fallback exists here) | practice-only dashboard (`mission: null`) |

Coverage today: Korean is the only language with Tier 4 and the only guided-less
full-flag language; Polish/Portuguese have Tier 5 content but aren't wizard-selectable;
Tagalog is Tier 0+3a only.

## 5. The API layer's language contract

Two different regimes in `api/`:

- **Audio endpoints validate against hardcoded allow-sets** and reject unknown
  languages: `api/voice-chat.ts` 400s unless the ISO code is a `LANGUAGE_CONFIG` key
  (`api/prompts/_shared/pedagogy.ts:16-30`, 13 codes) and routes TTS by
  `VOXTRAL_SUPPORTED` (`voice-chat.ts:100` — en/de/fr/it/es/pt/nl/hi/ar; everything
  else → Gemini). Per-code `VOICE_MAP` (`:86-96`), hardcoded retry phrases
  (`:807-821`). `api/voice-sample.ts` has its own `SUPPORTED_SAMPLE_LANGUAGES` set
  (`:33-35`). `api/prompts/gemini.ts:42` and `_shared/generic.ts:35` **throw**
  `Unsupported language` on a missing `LANGUAGE_CONFIG` entry.
- **Text endpoints take free strings**: `suggest-words`, `extract-vocabulary`,
  `translate-and-ipa` interpolate language into prompts, length-validated only. Note
  the caller inconsistency: translate-and-ipa receives ISO **codes**
  (`GeneratePG.tsx:253`), suggest/extract receive **names** (`CategoryPicker.tsx:221`).

So: a Tier-0 language needs no API changes; a Speak-enabled language **requires**
`LANGUAGE_CONFIG` + related maps in `api/` or voice-chat 400s. Remember
`npm run typecheck` does **not** cover `api/` — run `tsc -p tsconfig.api.json`
after editing functions.

## 6. Supporting per-language maps (extend when relevant)

- `components/ui/FlagIcon.tsx` — `LANG_CODE_MAP` (code→country flag) + `LANG_NAME_MAP`;
  unknown → `null` (no flag renders).
- `lib/typography/cardFonts.ts` — `CJK_LANGUAGE_CODES` {ko,zh,ja} vs
  `SUPPORTED_LATIN_LANGUAGE_CODES`; drives imageless-card/canvas font stacks. A new
  non-Latin, non-CJK script (e.g. Cyrillic) should be checked against the default stack.
- `hooks/usePronunciation.ts:25-31` — sets `SpeechSynthesisUtterance.lang` straight from
  `word.target_language` (name or code — names are invalid BCP-47; pre-existing wart).
- `data/geminiVoiceSampleSentences.ts` — per-target sample sentence, falls back to en;
  twin list inside `api/voice-sample.ts`.
- `lib/lensSaveMapping.ts`, `components/speak/SpeakHistoryPanel.tsx:103` — local
  code→name maps (not imports of `lib/languageNames.ts`, which appears
  **unimported/dead** in src/).
- `pages/StudyCanvas.tsx:138-148` — its own uppercased code resolver for canvas labels.

Additional touchpoints from the Codex sweep (extend only when the language needs them):

- `components/dashboard/articleDisplay.ts` — languages whose nouns carry
  articles/gender (de/fr/it/es/pt today); unlisted languages simply hide the article
  UI. Add an entry only for article-bearing languages.
- `api/_shared/visualScanProvider.ts:72-98` — the Lens prompt embeds per-language
  article rules and transliteration rules (Korean/Japanese/Chinese/Arabic/Russian/Thai
  already covered). Check it when adding an article-bearing or non-Latin language.
- `src/characterRegistry.ts` — Speak character voices keyed by language code; falls
  back to `TUTOR_VOICES` when a language has no character entries.
- `components/speak/ProviderToggle.tsx:31-36` — per-language provider disabling
  (currently a `fil`-only special case with Tagalog copy).
- `components/generate/steps/CategoryPicker.tsx:78-97` — picker defaults are hardcoded
  English target / German helper; `resolveVisibleLanguage` falls back to English for
  languages without category translations (special-cases `ceb`/`cebuano`, and
  `data/categories.ts:1026-1035` holds the alias resolver).
- `lib/curriculumImageSetConfig.ts:71,76` — image-set config filtered by
  `language_iso` (currently always `'en'`; future-proofed per file comments).
- `lib/scriptlab/audioManifest.generated.ts` — generated per-script audio manifest
  (regenerated by the script-lab audio tooling, not hand-edited).
- `games/slicer/components/DeckPicker.tsx:106` — an `isGerman` special case; the only
  per-language branch in the games.

## 7. Base/UI locale system (expansion B)

`Locale = 'en' | 'de' | 'fr'` (`translations.ts:14`); flat
`Record<Locale, Record<string,string>>` with **1,469 en keys** (de 1,469; fr 1,464 —
French is warn-only by policy). `createT` falls back locale → en → raw key;
missing keys warn once in DEV, never throw.

Adding locale `xx` — the compile-blocking cascade:
1. `Locale` union + full `xx` block in `translations.ts` (~1,469 strings) +
   `LANGUAGE_TO_LOCALE` entry.
2. `data/quotes.ts` — `QUOTES: Record<Locale, string[]>` forces an `xx` array.
3. `lib/scriptlab/types.ts:13` — `LocalizedText = {en,de,fr}` forces a 4th arg on every
   `lt()` call in every script data file (~100–150 strings per script) plus the
   `localizeScriptText` switch (`types.ts:143-146`).
4. Tooling: `scripts/check-i18n-coverage.ts:4-5` (`requiredLocales` /
   `warnOnlyLocales` — unedited, the new locale is not validated at all);
   optionally `scripts/test-i18n-display-labels.ts`.
5. Hardcoded de/fr ternaries to extend: `useLandingLocale.ts` (URL `?lang=` allow-list
   `:31` + browser-lang map `:14-24`), date-locale ternaries
   (`DeckViewPG.tsx:503`, `DeckView.tsx:362`, `DecksPG.tsx:430`, water label `:295`),
   landing copy (`VerbCycler.tsx:13` + `lib/spinnerVerbs.ts`, `CreatorRail.tsx:294,297`,
   `LandingHero.tsx:79`, `TideStory.tsx:36`), optional
   `staticLibraryLanguage.ts:60` level labels.
6. API: add to `LANGUAGE_CONFIG`/`NATIVE_LANGUAGE_NAMES` in
   `api/prompts/_shared/pedagogy.ts` only if absent.

Content NOT gated on Locale: `staticCategoryTranslations.ts` already carries 10
languages (es/pt/it/pl/id/ceb/ko beyond en/de/fr) — free if the new locale is one of
them. **Guided lessons base text is en/de only** (`GuidedBaseContentText`,
`guidedLessons.ts:13-21`) — not even French; extending it is ~30k content entries and a
separate decision.

**RTL is blocked.** No `dir` handling exists; fonts in `index.html:22` are Latin-only;
canvas renderers and games assume LTR coordinates. An Arabic/Hebrew base locale needs a
layout pass that does not exist yet. Do not attempt RTL as a first new locale.

## 8. Known landmines

1. **'Bisaya' vs 'Cebuano'.** Registry #1 says `Bisaya`; guided (#2) and the API's
   `LANGUAGE_CONFIG` say `Cebuano`; `useTodayMission.ts:52` bridges with
   `DASHBOARD_TO_GUIDED_LANGUAGE = { Bisaya: 'Cebuano' }`. Copy either convention into
   the wrong registry and guided Today or Speak silently breaks.
2. **Landing chips need two edits.** `isLanding: true` alone does nothing —
   `landingData.ts` `LANDING_ORDER` must also contain the name, or the chip is silently
   filtered out.
3. **The 2.8 MB guided chunk boundary.** `guidedLessons.ts` may only be imported
   dynamically (`useTodayMission.ts:74-77`); a static import from any dashboard-chunk
   module drags 2.8 MB into first paint.
4. **`api/` is outside `npm run typecheck`.** Run `tsc -p tsconfig.api.json` after
   touching Vercel functions.
5. **Unknown values never throw client-side** (`canonicalizeLanguageValue` falls
   through) but **do throw/400 in api/** (`gemini.ts:42`, `generic.ts:35`,
   `voice-chat.ts:710`). A language can look fine in the wizard and break Speak.
6. **Category pages have no browser-speech fallback** — a Tier-1 language without
   Tier-2 TTS shows silent cards (by design; guided audio does fall back).
7. **`profileBaseLanguageToIso` defaults to `'de'`**, not `'en'`, on unknown input
   (`curriculumCategories.ts:190-197`).
8. **Static-TTS generation tooling is not on main** (worktree branch 61f3c245); only
   inventory/QA scripts are. Budget Tier 2 accordingly.
9. **Mixed name/code data in `decks.target_language`** is assumed by the read paths;
   always write the canonical English name, always read via
   `canonicalizeLanguageValue`/`getLanguageQueryValues`.
10. **Wizard languages come from `wizardData.ts`**, which derives from
    `WIZARD_LANGUAGES` — but with its own label/color mapping. Colors: pick a distinct
    `wizardColor`; the fallback is gray `#6b7280`.

## 9. Open questions (require DB or owner input, not code)

- Actual contents of `decks.target_language` in production (names vs codes mix).
- Whether Supabase auth emails are localized anywhere (nothing in this repo).
- Per-language TTS batch costs — no dollar figures exist in code/docs; the only
  precedent is the Hangul batch (141 clips ≈ 198 ElevenLabs characters, effectively
  free) and voice counts per language (1–6 static-TTS profiles, 4–20 Voxtral voices).
