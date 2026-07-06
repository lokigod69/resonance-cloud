---
name: review-language-addition
description: QA/review recipe for after a language lands in Lingwave — a second agent verifies a new target language, base locale, or script pack for coverage, naturalness, capability-flag consistency, chunk-size regressions, and suite health. Use after add-target-language, add-base-locale, or add-script-lab-language work, e.g. "review the Russian addition".
---

# Review a language addition

Run this as a SECOND agent (or a fresh pass) after any language work lands. The adding
agent verifies mechanically; this review verifies the addition is *correct and
coherent*, not just green. Reference: `docs/Product/FABLE_LANGUAGE_ARCHITECTURE.md`.

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
  string (or a documented bridge like `DASHBOARD_TO_GUIDED_LANGUAGE`). Any second
  spelling/synonym is a defect (cf. the standing Bisaya/Cebuano precedent).
- Capability flags in `lib/languages.ts` match reality:
  - `isWizard` → wizard tile renders with distinct `wizardColor` and flag icon. Static
    verification suffices headless: entry present, color unique among `wizardColor:`s,
    all three FlagIcon maps populated, `wizardData.ts` derivation reaches it. A browser
    screenshot is a bonus, not a requirement.
  - `isSpeak` → the code exists in `api/prompts/_shared/pedagogy.ts` `LANGUAGE_CONFIG`,
    `api/voice-chat.ts` `retryResponses`, and `pages/Speak.tsx` `SPEAK_ORDER`. An
    `isSpeak` language missing any of these 400s or is invisible — defect.
  - `isLanding` → the name is ALSO in `landingData.ts` `LANDING_ORDER` (else the chip
    silently vanishes; either both or neither).
  - `isBase` → either a real `LANGUAGE_TO_LOCALE` entry exists or English-UI fallback
    is the documented intent.
- Round-trip: `canonicalizeLanguageValue(code) === value`,
  `getLanguageCode(value) === code` (spot-check in a scratch tsx run or the test suite).

## 2. Coverage gates (mechanical — actually run them)

From `frontend/` — do not trust the adding agent's claim; re-run:

```
npm run typecheck
npx tsc -p tsconfig.api.json    # if THIS ADDITION touched api/ (not merely a dirty tree)
npm run lint                    # zero NEW errors vs changed lines
npm run check:i18n
npm run test:i18n-display-labels
npm run test:script-lab         # if a script pack or LocalizedText changed
```

If a gate fails, attribute before blaming: check whether it already fails on HEAD
(`git show HEAD:<file>` or run the gate mentally against the pre-addition state). A
pre-broken gate is reported as its own finding, and you compensate with a targeted
scratch check of what the gate would have covered (e.g. a small tsx script asserting
`canonicalizeLanguageValue`/`getDeckLanguageLabel` round-trips for the new language —
no existing suite parameterizes over newly added languages).

## 3. Naturalness spot-checks (the part machines skip)

Sample and judge as a native/near-native reader would; machine-literal phrasing is a
defect even when "accurate":

- **Target language:** `langName.*` keys in en/de/fr; `nativeName` spelling in
  `languages.ts`; sample sentence in `geminiVoiceSampleSentences.ts`; `encouragement`
  and retry phrase in api/ (must be real target-language text, correct script, correct
  diacritics).
- **Tier 1 curriculum:** random-sample ≥30 of the ~1,850 new terms in
  `staticCategoryTranslations.ts` across different categories — check register
  (everyday vocabulary, citation forms), diacritics, and that the term matches the
  *concept*, not a literal English gloss. Verify `status:` is `experimental` unless a
  review pass justified `stable`.
- **Base locale:** sample ≥50 keys across domains (nav, study, wizard, errors,
  landing); check `{var}` placeholders survived untranslated, `.one`/`.other` pairs
  are correctly pluralized, and button-length strings fit (spot-render or reason about
  the longest ones). German-standard: real umlauts.
- **Script pack:** defer to the pedagogy rules in `add-script-lab-language` (official
  romanization named in header, homophone tags, neutral carriers, no bare-jamo audio
  text) — the test suite enforces the mechanical half; you check linguistic truth.

## 4. Regression sweep

- **Chunk sizes:** `npm run build` once; no baseline artifacts are checked in, so use
  the order-of-magnitude heuristic: `guidedLessons-*.js` stays its own async chunk at
  ~2.8 MB (any jump or its disappearance into the main bundle is a blocker), new script
  packs land as their own lazy chunks (tens of kB, like `koreanHangul-*` ~32 kB), and
  the main `index-*.js` stays in the ~350 kB band. A dashboard-chunk import of
  `guidedLessons.ts` or a new eagerly-imported data file is a blocker.
- **No accidental schema/paid-asset side effects:** diff should contain no Supabase
  migrations, no new api/ calls to paid providers, no committed audio that wasn't an
  approved batch.
- **Existing languages untouched:** the diff should not modify other languages' entries
  or translations except shared type/tooling lines. Re-run one existing-language flow
  mentally (or via tests) for accidental gating changes — especially anything touching
  `WIZARD_LANGUAGES`, `SPEAK_ORDER`, `LANDING_ORDER` ordering.
- **api/ contract:** if `LANGUAGE_CONFIG` changed, confirm `prompts/gemini.ts` /
  `_shared/generic.ts` won't throw for existing codes (keys only added, never renamed).

## 5. Report

Deliver findings as: blockers (breaks a flow or violates a standing constraint),
defects (wrong content/inconsistent registry), polish (missing flag icon, gray fallback
color). For each: file:line, what's wrong, the concrete failure a user would see.
Confirmed-good areas get one line each — say what you actually verified, not "looks
fine". If everything passes, say exactly which checks ran and which were skipped
(with why).
