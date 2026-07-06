---
name: add-target-language
description: Add a new target (learnable) language to Lingwave in frontend/. Use when asked to add a language users can learn, e.g. "add Russian" or "make Japanese available in the wizard". Covers the launch-tier model (wizard-only up to guided lessons), every registry that must be touched, i18n, API allow-sets, verification, and per-language content rules. For a new UI/base locale use add-base-locale; for a new writing system use add-script-lab-language.
---

# Add a target language

A "target language" is what a user learns. Adding one is a **tiered rollout**, not one
change: Tier 0 (wizard-only) is a few lines; each higher tier adds content/assets and
more registries. Read `orchestrator/docs/Product/FABLE_LANGUAGE_ARCHITECTURE.md` first
(path from repo root; the doc's internal paths are relative to `orchestrator/frontend`)
— it maps every touchpoint and landmine; this skill is the recipe. Line numbers drift: re-grep
for the symbols named here before editing.

**Decide the tier with the owner before starting.** Default for a brand-new language is
**Tier 0 + langName keys**, shipping higher tiers as separate approved steps. Paid
asset batches (TTS, voice cloning) ALWAYS need explicit owner approval first.

## Launch tiers (cumulative)

| Tier | Ships | Cost |
|---|---|---|
| 0 | wizard target, deck gen, study modes, games, music | code only |
| 1 | thematic categories browse/study (silent cards) | ~1,850 translated terms |
| 2 | curated TTS on thematic cards | paid ElevenLabs batch — owner approval |
| 3a | Speak tutor via shared Gemini voices | code only (api/ edits) |
| 3b | Speak tutor with dedicated cloned voices | paid ElevenLabs+Mistral — owner approval |
| 4 | Alphabet module (non-Latin scripts) | see `add-script-lab-language` |
| 5 | guided Today A1 course | 10 authored lessons ×2 base locales — a project of its own |

## Tier 0 — wizard-only (the floor)

1. **`frontend/src/lib/languages.ts`** — append a `LANGUAGES` entry following the header
   instructions: canonical English `value` (this exact string becomes
   `decks.target_language` — check the language's conventional English name and any
   registry that might use a different one, cf. Bisaya/Cebuano), `nativeName` in the
   native script, ISO 639-1 `code`, a `wizardColor` distinct from the existing ones
   (grep `wizardColor:` and compare), and `isWizard: true`. Leave `isBase` off (that's
   a base-locale decision), `isLanding` off unless the owner wants it showcased
   (see Tier notes below), `isSpeak` off until Tier 3 lands api/ support.
2. **`frontend/src/lib/translations.ts`** — add **six** keys, not three: each locale
   block (en/de/fr) has BOTH a `langName.<Value>` entry (e.g. `'langName.Russian'`)
   AND an ISO-alias twin `langName.<code>` (e.g. `'langName.ru'`) in the adjacent
   alias block — its in-file comment mandates keeping them in sync. Natural
   translations, real umlauts; for French, follow the casing convention of the
   existing `langName.*` entries in that block (capitalized as standalone labels).
   Without these, deck labels fall back to the raw English name via
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
     add it to `frontend/src/components/dashboard/articleDisplay.ts` and check the Lens
     prompt rules in `frontend/api/_shared/visualScanProvider.ts` cover it; languages
     without articles need nothing (the UI hides them).
   - Non-Latin script: check `visualScanProvider.ts` has a transliteration rule for it
     (ko/ja/zh/ar/ru/th are already covered).
6. Verify (see Verification); commit only per the working agreement — when the owner
   asked for it or has standing approval, never as a side effect.

That's genuinely all: `api/suggest-words.ts` and friends accept any language string, and
curriculum images are shared English-keyed assets. Do NOT add the language to guided
`TARGET_LANGUAGES`, categories, or Speak lists at this tier — those surfaces degrade
gracefully (English-fallback category picker, practice-only dashboard, absent from
Speak) and half-wiring them breaks things.

## Tier 1 — thematic curriculum

1. `frontend/src/data/categories.ts` — add the ISO code to
   `StaticCategoryTargetLanguageCode` and an entry to
   `STATIC_CATEGORY_TRANSLATION_LANGUAGES` with `status: 'experimental'` (promote to
   `'stable'` only after review) and the correct `script:` (e.g. `'Cyrillic'`).
2. `frontend/src/data/staticCategoryTranslations.ts` — add a `term` for the new code to
   every concept (~1,850). Batch-translate then review; set `needsReview` flags where
   unsure. Accuracy rules: natural everyday register, correct diacritics, no
   machine-literal phrasing; nouns in citation form unless the concept implies otherwise.
3. Known limitation to state in the PR/commit: cards are **silent** until Tier 2 (no
   browser-speech fallback on category pages — by design).

## Tier 2 — curated thematic TTS (owner approval required)

Voice profiles: `frontend/src/lib/staticThematicAudio.ts`
(`getStaticThematicVoiceProfileKeys`) + rows in the Supabase `static_tts_playback`
view's underlying table. The generation pipeline is **not on main** (worktree branch
61f3c245) — coordinate with the owner; do not rebuild it ad hoc. Precedent: 1–6 voices
per language. This is a separate approved batch step, never a side effect.

## Tier 3 — Speak tutor

Both sub-paths require api/ edits — and `npm run typecheck` does NOT cover `api/`;
run `npx tsc -p tsconfig.api.json` from `frontend/` after editing functions.

1. `frontend/api/prompts/_shared/pedagogy.ts` — add the code to `LANGUAGE_CONFIG`
   (`name`, `nativeName`, an `encouragement` phrase in the target language) and, if
   absent, `NATIVE_LANGUAGE_NAMES`. Without this, `api/voice-chat.ts` returns 400 and
   `prompts/gemini.ts`/`generic.ts` throw `Unsupported language`.
2. `frontend/api/voice-chat.ts` — add a retry phrase to `retryResponses`; decide the
   TTS route: add the code to `VOXTRAL_SUPPORTED` + `VOICE_MAP` only for 3b, otherwise
   it rides Gemini automatically.
3. `frontend/src/lib/languages.ts` — now set `isSpeak: true`.
4. `frontend/src/pages/Speak.tsx` — add the code to `SPEAK_ORDER` (picker is the
   intersection of that array and `SPEAK_LANGUAGES`).
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

The heaviest tier; treat as its own project with owner sign-off on scope. Touchpoints:
`GuidedTargetLanguage` union + lesson data in `frontend/src/data/guidedLessons.ts`
(10 lessons, vibe variants, all base text in **en AND de**), the
`GUIDED_TARGET_LANGUAGE_SPEAK_LOCALES` map in the same file, and the hand-maintained
`TARGET_LANGUAGES` set in `frontend/src/lib/todayLanguage.ts`. Mind the naming bridge
(`DASHBOARD_TO_GUIDED_LANGUAGE` in `hooks/useTodayMission.ts` — Bisaya→Cebuano) and the
**chunk boundary**: `guidedLessons.ts` may only ever be imported dynamically (the 2.8 MB
chunk must not leak into the dashboard bundle). Optional audio uses
`guided_tts_playback` and DOES fall back to browser speech.

## Landing showcase (any tier, owner's call)

Two edits or nothing happens: `isLanding: true` in `languages.ts` AND the name in
`LANDING_ORDER` in `frontend/src/components/landing/landingData.ts` (plus a distinct
`landingColor`). The marquee arrays (`DRIFT_PHRASES`, `GREETINGS`) are independent
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
- en/de/fr translations for every new UI key; German with real umlauts.
- If unsure of a linguistic fact, leave the optional field out rather than guess.

## Verification (from `frontend/`)

```
npm run typecheck          # tsc -b --noEmit (does NOT cover api/)
npx tsc -p tsconfig.api.json   # required if you touched api/
npm run lint               # zero new errors on changed lines
npm run check:i18n         # after any translations.ts change
npm run test:script-lab    # if Tier 4 was touched
```

Then exercise the flow: build a deck for the new language through the wizard (or at
minimum verify the wizard tile renders with flag + color and the language survives
canonicalization round-trips: `canonicalizeLanguageValue('<code>') === '<Value>'`).

## Do not

- Do not call ElevenLabs, Mistral voice cloning, or any paid API without explicit owner
  approval — asset batches are separate approved steps.
- Do not touch Supabase schema; language additions are code + data only.
- Do not add the language to `todayLanguage.ts` `TARGET_LANGUAGES`, `SPEAK_ORDER`, or
  category metadata "optimistically" at a lower tier — half-wired surfaces fail
  non-gracefully (voice-chat 400s, empty guided paths).
- Do not statically import `guidedLessons.ts` from anything in the dashboard chunk.
- Do not invent a second name for a language that already has a convention anywhere in
  the codebase (the Bisaya/Cebuano split is a standing source of bugs — bridge, never
  duplicate).
- Do not mark a new curriculum language `status: 'stable'` before a native-quality
  review pass (`review-language-addition` skill).
