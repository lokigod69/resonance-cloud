---
name: review-language-addition
description: QA/review recipe for after a language lands in Lingwave — a second agent verifies a new target language, base locale, or script pack for coverage, naturalness, capability-flag consistency, chunk-size regressions, and suite health. Use after add-target-language, add-base-locale, or add-script-lab-language work, e.g. "review the Russian addition".
---

# Review a language addition

Run this as a SECOND agent (or a fresh pass) after any language work lands. The adding
agent verifies mechanically; this review verifies the addition is *correct and
coherent*, not just green. Commands run from `orchestrator/frontend`; paths are relative
to it unless prefixed `orchestrator/`. Background: `docs/Product/FABLE_LANGUAGE_ARCHITECTURE.md`
(partly stale; the code and this skill win where they disagree).

Establish first: **what tier was claimed, and where is the claim?** Look in the commit
message, the handoff/task prompt, and `memory/LOG.md` — if no claim is recorded
anywhere, that is itself a finding; reconstruct the scope from the diff and say you did.
Review exactly that scope — flag surfaces that were half-wired beyond the claimed tier
as defects, not bonuses.

**Scope the diff explicitly.** This repo routinely has unrelated uncommitted work from
concurrent sessions in the tree. Build the addition's file list from the claim, review
`git diff -- <those paths>` (plus a token grep for the language name/code across the
FULL diff to catch undeclared touches), and ignore the rest. Never attribute other
sessions' hunks to the addition — and never let them hide an undeclared change either.

**If the adding agent edited any skill/rules file it was executing** (learnings fold-in
is a legitimate pattern here), diff those files too and review the content changes
explicitly — judge the data against the HEAD version of the rules where they conflict,
and flag rule edits in the report so the owner sees the rulebook moved.

## 1. Registry consistency (all additions)

- One canonical `value` everywhere: grep the language's English name AND its ISO code
  across `frontend/src` and `frontend/api`. Every occurrence must use the same name
  string (or the only allowed bridge, `WIZARD_TO_GUIDED`/`GUIDED_TO_WIZARD` in
  `src/lib/targetLanguage.ts`; aliases handled inside the canonicalizers, such as
  `resolveApiBaseLanguage`, are fine). Any other second spelling/synonym is a defect
  (cf. the standing Bisaya/Cebuano precedent).
- Beta visibility (owner decision 2026-07-27): pickers show only
  `BETA_TARGET_LANGUAGES` (`src/lib/languages.ts`), mirrored as a literal
  `BETA_TARGET_LANGUAGE_VALUES` in `src/data/categories.ts` and by `SPEAK_ORDER` in
  `pages/Speak.tsx`. A non-beta language absent from pickers is intended, not a defect.
  A language present in some of the three lists but not all is a blocker. Graduating a
  language into the beta is the owner's call, and it also updates the "exactly eight"
  pin in `scripts/test-base-language-contract.ts`.
- Capability flags in `lib/languages.ts` match reality:
  - `isWizard` → wizard tile renders with distinct `wizardColor` and flag icon (for a
    beta language; `wizardData.ts` maps only `BETA_WIZARD_LANGUAGES`). Static
    verification suffices headless: entry present, color unique among `wizardColor:`s,
    all three FlagIcon maps populated. For registry-only changes, static verification
    establishes wiring. If UI layout, labels, or interaction changed, inspect the
    affected rendered surface; static checks do not establish visual correctness.
  - `isSpeak` → the code exists in `api/prompts/_shared/pedagogy.ts` `LANGUAGE_CONFIG`
    and `api/voice-chat.ts` `retryResponses`; missing either 400s — defect. Absence
    from `SPEAK_ORDER` is a defect only for a beta language.
  - `isLanding` → the name is ALSO in `landingData.ts` `LANDING_ORDER` (else the chip
    silently vanishes; either both or neither).
  - `isBase` ⇔ present in `BASE_LANGUAGE_VALUES`, `LANGUAGE_TO_LOCALE`,
    `api/_shared/baseLanguages.ts` `API_BASE_LANGUAGES` and `SUPPORTED_UI_LOCALES`
    (`src/lib/localePreference.ts`), with a complete locale pack.
- Round-trip: `canonicalizeLanguageValue(code) === value`,
  `getLanguageCode(value) === code` (spot-check in a scratch tsx run or the test suite).

## 2. Coverage gates (mechanical — actually run them)

From `frontend/` — do not trust the adding agent's claim; re-run:

```
npm run typecheck
npm run typecheck:api           # if THIS ADDITION touched api/ (not merely a dirty tree)
npm run lint                    # 0 errors
npm run check:i18n
npm run test:i18n-display-labels
npm run test:script-lab         # if a script pack or LocalizedText changed
npm run test:ui-locales         # base locale
npm run test:base-languages     # base locale, or any beta-list change
npm run test:static-category-translations && npm run test:vocabulary-library  # Tier 1
npm run test:guided-base && npm run test:guided-today  # guided content or base editions
```

If a gate fails, attribute before blaming: check whether it already fails on HEAD
through inspected baseline evidence — `git show HEAD:<file>` into the scratchpad, never
a worktree or `git stash` (the tree is shared with other agents) — or report the gate as
unverified. Static reasoning may explain a failure but is not evidence that a test passed. A
pre-broken gate is reported as its own finding, and you compensate with a targeted
scratch check of what the gate would have covered (e.g. a small tsx script asserting
`canonicalizeLanguageValue`/`getDeckLanguageLabel` round-trips for the new language —
no existing suite parameterizes over newly added languages).

## 3. Naturalness spot-checks (the part machines skip)

Sample and judge as a native/near-native reader would; machine-literal phrasing is a
defect even when "accurate":

- **Target language:** `langName.<Value>` and `langName.<code>` in every UI locale
  (en/de/fr in `translations.ts`, the rest in `src/lib/locales/*.ts`); `nativeName` spelling in
  `languages.ts`; sample sentence in `geminiVoiceSampleSentences.ts`; `encouragement`
  and retry phrase in api/ (must be real target-language text, correct script, correct
  diacritics).
- **Tier 1 curriculum:** random-sample ≥30 of the ~1,850 new terms in
  `staticCategoryTranslations.ts` across different categories — check register
  (everyday vocabulary, citation forms), diacritics, and that the term matches the
  *concept*, not a literal English gloss. Verify `status:` is `experimental` unless a
  review pass justified `stable`.
- **Base locale:** sample ≥50 keys across domains (nav, study, wizard, errors,
  landing); check `{var}` placeholders survived untranslated, plural keys cover every
  `Intl.PluralRules` category the locale uses (e.g., pl/ru few/many, as
  `scripts/test-ui-locales.ts` expects), and button-length strings fit (spot-render or reason about
  the longest ones). German-standard: real umlauts.
- **Script pack:** defer to the pedagogy rules in `add-script-lab-language` (official
  romanization named in header, homophone tags, neutral carriers, no bare-jamo audio
  text) — the test suite enforces the mechanical half; you check linguistic truth.

## 4. Regression sweep

- **Chunk sizes:** `npm run build` once and compare with the newest tracked
  `scripts/perf/results/baseline-*.md` or a HEAD build. Blockers:
  `guidedLessonsAuthoring.ts` reachable from `src/` (it stays script-only); a
  `src/data/guided-runtime/<language>` body or `pathIndex` in the entry or dashboard
  graph; a new UI locale inlined into the core `translations` chunk instead of its own
  `locales/<xx>` chunk; an eagerly imported Script Lab data or overlay pack (script
  packs are their own lazy chunks, tens of kB).
- **No accidental schema/paid-asset side effects:** diff should contain no Supabase
  migration unless it is a named, owner-approved step of the claimed tier (e.g., guided
  phrase-catalog convergence), no new api/ calls to paid providers, and no committed
  audio that wasn't an approved batch.
- **Existing languages untouched:** the diff should not modify other languages' entries
  or translations except shared type/tooling lines. Re-run one existing-language flow
  with a targeted test or interaction check for accidental gating changes — especially anything touching
  `BETA_TARGET_LANGUAGES`, `WIZARD_LANGUAGES`, `SPEAK_ORDER`, `LANDING_ORDER` ordering.
- **api/ contract:** if `LANGUAGE_CONFIG` changed, confirm `prompts/gemini.ts` /
  `_shared/generic.ts` won't throw for existing codes (keys only added, never renamed).

## 5. Report

Deliver findings as: blockers (breaks a flow or violates a standing constraint),
defects (wrong content/inconsistent registry), polish (missing flag icon, gray fallback
color). For each: file:line, what's wrong, the concrete failure a user would see.
Confirmed-good areas get one line each — say what you actually verified, not "looks
fine". If everything passes, say exactly which checks ran and which were skipped
(with why).
