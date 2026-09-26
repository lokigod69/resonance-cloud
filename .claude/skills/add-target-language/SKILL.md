---
name: add-target-language
description: Add a new target (learnable) language to Lingwave in frontend/. Use when asked to add a language users can learn, e.g. "add Thai" or "add Greek as a language to learn", or to plan a higher tier for an existing one. Covers the launch-tier model (registries up to guided lessons), the beta gate, every registry that must be touched, i18n, API allow-sets, verification, and per-language content rules. For a new UI/base locale use add-base-locale; for a new writing system use add-script-lab-language.
---

# Add a target language

A "target language" is what a user learns. Adding one is a **tiered rollout**, not one
change: Tier 0 is a few registry lines; each higher tier adds content/assets and
more registries. Paths below are from `orchestrator/` unless they start with
`frontend/`; commands run from `orchestrator/frontend`. Background:
`orchestrator/docs/Product/FABLE_LANGUAGE_ARCHITECTURE.md` — its §2/§4/§7 predate the
beta trim and the 2026-09-07 locale/guided split, so this skill wins where they differ.
Line numbers drift: re-grep for the symbols named here before editing.

**Decide the tier with the owner before starting.** Default for a brand-new language is
**Tier 0 + langName keys**, shipping higher tiers as separate approved steps. Paid
asset batches (TTS, voice cloning, translation) ALWAYS need explicit owner approval first.

## Beta visibility (owner decision 2026-07-27)

Every user-facing picker (onboarding, wizard, Library, category picker, Today, Speak)
shows only `BETA_TARGET_LANGUAGES` in `frontend/src/lib/languages.ts`; its comment lists
the graduation criteria (guided A1+A2, a Library pack, Speak in `LANGUAGE_CONFIG`, Latin
script). A new language therefore ships **dark** — registries and resolvers only — until
the owner graduates it. Never edit the beta list on your own. Graduation, when the owner
asks for it, edits `BETA_TARGET_LANGUAGES`, the literal `BETA_TARGET_LANGUAGE_VALUES` in
`frontend/src/data/categories.ts`, `SPEAK_ORDER` in `frontend/src/pages/Speak.tsx`, and
the "exactly eight" pin in `frontend/scripts/test-base-language-contract.ts`, together.

## Launch tiers (cumulative)

| Tier | Ships | Cost |
|---|---|---|
| 0 | registries: existing decks label, study, games, music (wizard only after beta graduation) | code only |
| 1 | thematic categories browse/study (silent cards) | ~1,850 translated terms |
| 2 | curated TTS on thematic cards | paid ElevenLabs batch — owner approval |
| 3a | Speak tutor via shared Gemini voices | code only (api/ edits) |
| 3b | Speak tutor with dedicated cloned voices | paid ElevenLabs+Mistral — owner approval |
| 4 | Alphabet module (non-Latin scripts) | see `add-script-lab-language` |
| 5 | guided Today course (A1 100 + A2 100 lessons per language today) | authored en/de base text plus generated editions — a project of its own |

## Tier 0 — registries (the floor)

1. **`frontend/src/lib/languages.ts`** — append a `LANGUAGES` entry following the header
   instructions: canonical English `value` (this exact string becomes
   `decks.target_language` — check the language's conventional English name and any
   registry that might use a different one, cf. Bisaya/Cebuano), `nativeName` in the
   native script, ISO 639-1 `code`, a `wizardColor` distinct from the existing ones
   (grep `wizardColor:` and compare), and `isWizard: true`. Leave `isBase` off (that's
   a base-locale decision), `isLanding` off unless the owner wants it showcased
   (see Tier notes below), `isSpeak` off until Tier 3 lands api/ support.
2. **`langName` keys in every UI locale** — each locale has BOTH a `langName.<Value>`
   entry (e.g. `'langName.Thai'`) AND an ISO-alias twin `langName.<code>` (e.g.
   `'langName.th'`) — the in-file comment mandates keeping them in sync. Add both to the
   en/de/fr blocks in `frontend/src/lib/translations.ts` and to each
   `frontend/src/lib/locales/<locale>.ts` (24 entries for 12 locales); `check:i18n`
   fails otherwise. Natural exonyms, real umlauts; for French, follow the casing
   convention of the existing `langName.*` entries (capitalized as standalone labels).
   The paid generator `frontend/scripts/generate-ui-locales.ts` needs a scoped budget
   approval. Without these keys, deck labels fall back to the raw English name via
   `lib/i18nDisplay.ts`.
3. **`frontend/src/components/ui/FlagIcon.tsx`** — three edits plus an import: import
   the flag component (`country-flag-icons/react/3x2/<CC>`), add code → component to
   `LANG_CODE_MAP`, the uppercase country code to `COUNTRY_CODE_MAP`, and the
   lowercase English name to `LANG_NAME_MAP`. Skipping any map breaks one lookup path;
   no flag renders (graceful but shabby in the wizard/pills).
4. **Font check (non-Latin scripts only)** — `frontend/src/lib/typography/cardFonts.ts`
   routes `ko/zh/ja` to a CJK stack; codes in `SUPPORTED_LATIN_LANGUAGE_CODES` get the
   default display stack; **any other code gets `LATIN_FALLBACK_STACK`** (Noto
   Sans/Arial/Segoe UI — full Cyrillic/Greek coverage; this fallback, not the default
   stack, is what makes those scripts safe). Verify which stack your code lands in and
   that its fonts cover the script; add explicit handling only if none do.
5. **Grammar-feature checks (conditional):**
   - Articles/gender: if the language marks nouns with articles (like de/fr/it/es/pt),
     extend the Lens prompt rules in `frontend/api/_shared/visualScanProvider.ts` and
     `LEADING_ARTICLES` in `frontend/src/lib/typedAnswer.ts`; languages without
     articles need nothing.
   - Non-Latin script: add the value to `NON_LATIN_SCRIPT_LANGUAGES` in
     `frontend/src/lib/languages.ts` (typed recall is Latin-only and hides behind it).
     Lens transliterates every non-Latin script generically (`visualScanProvider.ts`).
6. Verify (see Verification); then commit and push the task's files once checks pass,
   unless the owner said to hold (orchestrator/AGENTS.md). Paid runs and migrations
   need explicit owner OK.

That's genuinely all: `api/suggest-words.ts` and friends accept any target-language
string (only `base_language` is validated), and curriculum images are shared
English-keyed assets. Do NOT add the language to guided
`TARGET_LANGUAGES`, categories, or Speak lists at this tier — those surfaces degrade
gracefully (English-fallback category picker, practice-only dashboard, absent from
Speak) and half-wiring them breaks things.

## Tier 1 — thematic curriculum

1. `frontend/src/data/staticCategoryLanguages.ts` (re-exported by `categories.ts`;
   light callers import codes from here to keep the 2 MB table out of their chunk) —
   add the ISO code to `StaticCategoryTargetLanguageCode` and an entry to
   `STATIC_CATEGORY_TRANSLATION_LANGUAGES` with `status: 'experimental'` (promote to
   `'stable'` only after review) and the correct `script:` (e.g. `'Cyrillic'`).
2. `frontend/src/data/staticCategoryTranslations.ts` — add a `term` for the new code to
   every concept (~1,850). Batch-translate then review; set `needsReview` flags where
   unsure. Accuracy rules: natural everyday register, correct diacritics, no
   machine-literal phrasing; nouns in citation form unless the concept implies otherwise.
3. Known limitation to state in the commit message: cards are **silent** until Tier 2 (no
   browser-speech fallback on category pages — by design).

## Tier 2 — curated thematic TTS (owner approval required)

Voice profiles: `frontend/src/lib/staticThematicAudio.ts`
(`getStaticThematicVoiceProfileKeys`) + rows in the Supabase `static_tts_playback`
view's underlying table. Tooling is on main: `npm run tts:static:inventory` (exporter)
and `scripts/generate_static_thematic_tts.py`, resumable via `--skip-existing` and
`--max-provider-calls`. It is a paid ElevenLabs batch: get owner approval for a named
call/character budget first. Precedent: 1–6 voices per language. This is a separate
approved batch step, never a side effect.

## Tier 3 — Speak tutor

Both sub-paths require api/ edits — and `npm run typecheck` does NOT cover `api/`;
run `npm run typecheck:api` after editing functions.

1. `frontend/api/prompts/_shared/pedagogy.ts` — add the code to `LANGUAGE_CONFIG`
   (`name`, `nativeName`, an `encouragement` phrase in the target language) and, if
   absent, `NATIVE_LANGUAGE_NAMES`. Without this, `api/voice-chat.ts` returns 400 and
   `prompts/gemini.ts`/`generic.ts` throw `Unsupported language`.
2. `frontend/api/voice-chat.ts` — add a retry phrase to `retryResponses`; decide the
   TTS route: add the code to `VOXTRAL_SUPPORTED` + `VOICE_MAP` only for 3b, otherwise
   it rides Gemini automatically.
3. `frontend/src/lib/languages.ts` — now set `isSpeak: true`.
4. `frontend/src/pages/Speak.tsx` — `SPEAK_ORDER` is beta-trimmed; add the code only
   as part of an owner-approved beta graduation (see Beta visibility).
5. `frontend/src/data/geminiVoiceSampleSentences.ts` — add a natural sample sentence
   (and mirror it in `api/voice-sample.ts`'s twin list + `SUPPORTED_SAMPLE_LANGUAGES`
   if voice previews should work).
6. **3b only** (owner approval): generate voices via `scripts/generate-voices.ts`
   (needs `ELEVENLABS_API_KEY` + `MISTRAL_API_KEY`), paste results into
   `frontend/src/voiceRegistry.ts` `TUTOR_VOICES`, commit sample MP3s under
   `public/voices/`.

## Tier 4 — writing system

Non-Latin scripts only. Follow `.claude/skills/add-script-lab-language` — it requires
the language to exist in `LANGUAGES` first (Tier 0), then the script is a pure data
pack. The Study-hub Alphabet tile appears automatically when the active language has a
registered script.

## Tier 5 — guided lessons

The heaviest tier: an owner-approved project run with the `author-guided-tier` skill.
Registry touchpoints for a new guided language (all under `frontend/`):
- `GuidedTargetLanguage` and `GUIDED_TARGET_LANGUAGE_SPEAK_LOCALES` — declared in both
  the facade `src/data/guidedLessons.ts` and `src/data/guidedLessonsAuthoring.ts`;
- `GUIDED_LANGUAGE_LOADERS` in the facade; `fileNames` in
  `scripts/generate-guided-runtime-data.ts`; `files` in `src/lib/guidedBaseEditions.ts`;
  the target list in `scripts/test-guided-base-overlay-quality.ts`;
- the hand-maintained `TARGET_LANGUAGES` set in `src/lib/todayLanguage.ts`;
- the naming bridge `WIZARD_TO_GUIDED`/`GUIDED_TO_WIZARD` in `src/lib/targetLanguage.ts`
  (Bisaya→Cebuano; nothing else may re-declare it).
SQL changes — the `guided_phrase_keep` allowlist (`20260907120000`) and the phrase
catalog (`20260907130000`–`133000` pattern) — are owner-approved migrations. Ids freeze
after the TTS batch. Chunk boundary: never import `guidedLessonsAuthoring.ts` from
`src/`; keep `src/data/guided-runtime/*` bodies behind `GUIDED_LANGUAGE_LOADERS`; Home
reaches the facade only through the dynamic import in `useTodayMission`. Optional audio
uses `guided_tts_playback` and DOES fall back to browser speech.

## Landing showcase (any tier, owner's call)

Two edits or nothing happens: `isLanding: true` in `languages.ts` AND the name in
`LANDING_ORDER` in `frontend/src/components/landing/landingData.ts` (chips share one
cosmos colour). The marquee arrays (`DRIFT_PHRASES`, `GREETINGS`) are independent
hand-authored lists — extend them only with verified native phrases.

## Content-accuracy rules (non-negotiable)

- The `value` string is load-bearing everywhere (DB rows, registries, localStorage).
  Choose the standard English exonym once and never vary it. Check for existing
  divergent conventions before choosing (grep the name AND the ISO code across
  `src/` and `api/`).
- Native names, sample sentences, encouragement phrases, and retry responses must be
  natural, correctly-scripted text a native speaker would produce — verify script
  direction, diacritics, and register. Never romanize a language that isn't written in
  Latin script.
- Translations for every new UI key in all supported UI locales (`Locale` in
  `frontend/src/lib/translations.ts`); German with real umlauts.
- If unsure of a linguistic fact, leave the optional field out rather than guess.

## Verification (from `frontend/`)

```
npm run typecheck          # tsc -b --noEmit (does NOT cover api/)
npm run typecheck:api      # required if you touched api/
npm run lint               # 0 errors
npm run check:i18n         # always: langName keys land in every locale
npm run test:i18n-display-labels
npm run test:base-languages   # pins BETA_TARGET_LANGUAGES; diff its two mirrors by hand
npm run test:static-category-translations && npm run test:vocabulary-library  # Tier 1
npm run test:script-lab    # if Tier 4 was touched
```

A dark Tier 0 language cannot be checked through the wizard. Verify canonicalization
round-trips (`canonicalizeLanguageValue('<code>') === '<Value>'`,
`getLanguageCode('<Value>') === '<code>'`) and that an existing deck in the language
renders its translated label and flag. After an owner-approved graduation, build a deck
through the wizard as well.

## Do not

- Do not call ElevenLabs, Mistral voice cloning, or any paid API without explicit owner
  approval — asset batches are separate approved steps.
- Never write Supabase schema or data as a side effect. Tiers 0–3 need no SQL when every
  write uses the canonical English value. Tier 5 needs owner-approved migrations (the
  `guided_phrase_keep` allowlist, the phrase catalog). A code alias in
  `public.normalize_language_value` is optional and owner-approved.
- Do not add the language to `todayLanguage.ts` `TARGET_LANGUAGES`, `SPEAK_ORDER`, the
  beta list, or category metadata "optimistically" at a lower tier — half-wired surfaces
  fail non-gracefully (voice-chat 400s, empty guided paths).
- Never import `guidedLessonsAuthoring.ts` or a `guided-runtime/*` body statically into
  app code.
- Do not invent a second name for a language that already has a convention anywhere in
  the codebase (the Bisaya/Cebuano split is a standing source of bugs — bridge, never
  duplicate).
- Do not mark a new curriculum language `status: 'stable'` before a native-quality
  review pass (`review-language-addition` skill).
