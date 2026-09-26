---
name: add-base-locale
description: "Add a new UI/base locale — the language the app's interface and explanations speak — e.g. 'translate the app into Turkish', 'add a Vietnamese UI', 'localize Lingwave into Greek'. Not for learnable languages (add-target-language) or writing systems (add-script-lab-language). RTL locales stay blocked until an owner-scoped layout pass exists."
---

# Add a base/UI locale

A base locale is the language the app's UI speaks. Commands run from `orchestrator/frontend`; paths below are relative to it. Inspect `src/lib/translations.ts`, `src/lib/localePreference.ts`, and `scripts/check-i18n-coverage.ts` for the current supported set. Do not infer the architecture from an old locale/key count. Consult the base-locale section of `../docs/Product/FABLE_LANGUAGE_ARCHITECTURE.md` for product context; verify its implementation claims against current code.

## Establish scope and prerequisites

- Preserve the distinction between a UI locale, a learnable language, and authored learning content. Adding a UI locale does not authorize new target-language or guided-content work.
- Before exposing an RTL locale, verify direction handling, fonts, layout, and affected canvas/game coordinates. If that support is missing (today it is: nothing sets `dir="rtl"`), draft the layout scope and surface the blocker; do not build the layout pass without an owner-scoped project, and do not ship a partially supported RTL locale. Non-Latin scripts also require glyph coverage inspection.
- Guided explanations: a new UI locale is absent from `GUIDED_BASE_LOCALES` (`src/lib/guidedBaseEditions.ts`) and falls back to the authored en/de edition; report that fallback. Adding guided explanations is a separate owner-approved project: paid `scripts/generate-guided-base-editions.ts`, a phrase-catalog locale migration, and the pins in `npm run test:guided-base`. Do not change guided-lesson base-content types or translate its authored corpus without it.
- Paid translation/provider runs need existing scoped authorization, including budget. UI packs come from `scripts/generate-ui-locales.ts --locales=xx --budget=<approved>`; Script Lab overlays from `scripts/generate-script-content-locales.ts`, which has no total budget cap, so agree an explicit call limit. Read a generator before executing it; UI translation authorization alone is not spending approval.

## Extend the current architecture

1. **Messages and loading.** Preserve the `CoreLocale | LazyLocale` split in `src/lib/translations.ts`. Add new locales through the existing lazy module and loader pattern in `src/lib/locales/`; do not add a large eagerly loaded inline translation block or flatten core/lazy ownership. Match all current English source keys, interpolation slots, and the supported plural categories. Add the canonical language-name mapping to `LANGUAGE_TO_LOCALE`.
2. **Base-language registry (mandatory).** In `src/lib/languages.ts`, add the value to `BASE_LANGUAGE_VALUES`, set `isBase`, and add its `INTL_LOCALES` entry. Add the same value/code, in the same order, to `api/_shared/baseLanguages.ts` `API_BASE_LANGUAGES` — never import `src/` into `api/`. Without the API entry, `suggest-words` returns 400 for every user of the locale. Update the count pin in `scripts/test-base-language-contract.ts` deliberately in the same change.
3. **Reachability and preference.** Extend `SUPPORTED_UI_LOCALES` in `src/lib/localePreference.ts` and inspect its consumers, including browser detection, onboarding, and profile selection. Confirm explicit choices persist after reload. Locate current consumers with search rather than assuming old ternaries still exist.
4. **Authored Script Lab text.** Inspect `src/lib/scriptlab/contentLocales.ts`, its locale modules, `types.ts`, and `scripts/test-script-content-locales.ts`. Additional base languages use whole, versioned overlays keyed to the original authored text. Retain the original `LocalizedText` tuples and `lt` calls; do not add a new positional field to every authored script. Provide complete overlays through the existing loader/validation path, or surface missing content as a release blocker. Adding a writing-system module is separate scope.
5. **Remaining consumers.** Type errors find every `Record<Locale…>` gap. These lists are not type-enforced and must be edited by hand: `SUPPORTED_UI_LOCALES`; `requiredLocales` in `scripts/check-i18n-coverage.ts`; the locale arrays in `scripts/test-ui-locales.ts` and `scripts/test-script-content-locales.ts`; `API_BASE_LANGUAGES`; `LANGUAGE_TO_LOCALE`; `localeNames` in `scripts/generate-ui-locales.ts`. Also search for hardcoded locale branches, date formatting (`getIntlLocale`), and static-library labels. Preserve deliberate fallbacks; avoid unrelated rewrites. Existing category glosses may be reused only after checking availability/quality. API pedagogy maps (`api/prompts/_shared/pedagogy.ts`) change only if the locale is missing there.
6. **Coverage.** Add the new locale to `requiredLocales` in `scripts/check-i18n-coverage.ts`; never leave it temporarily unvalidated. Extend applicable locale/preference, display-label, and Script Lab tests. Inspect generators and other typed locale maps for compatibility, without running paid generation implicitly.

## Translation quality

- Translate meaning and register naturally; review in domain batches (navigation, study, wizard, errors, onboarding). Keep labels short enough for their containers. A single unchecked machine-translation pass is not completion.
- Use proper orthography and diacritics, including real German umlauts. Preserve `{var}` names exactly and validate all plural forms supported by the current formatter; do not assume only one/other exist.
- Translate all current `langName.*` keys using natural exonyms. Keep Lingwave and named product features unchanged unless the owner requests otherwise.
- Legal link labels are UI keys; externally hosted legal page content is outside this skill's scope.

## Verify and finish

From `orchestrator/frontend`, run `npm run typecheck`, `npm run typecheck:api`, `npm run lint`, `npm run check:i18n`, `npm run test:ui-locales`, `npm run test:base-languages`, `npm run test:script-lab`, and `npm run test:i18n-display-labels`. Update pins deliberately in the same commit; never loosen them.

Inspect the rendered UI using an authorized local/test profile: choose the locale through onboarding/profile settings, reload, and exercise the affected dashboard, wizard, study, and settings states. The anonymous landing (`/`) deliberately serves only en/de/fr: confirm a `?lang=xx` or xx-browser visitor gets English there without errors, and propose no landing edits. Check lazy loading/error/retry behavior, fallback text, overflow, glyphs, direction, and dates at relevant viewports, and watch the DEV console for `[i18n] Missing locale key; falling back to English`. Do not directly modify a production profile for this check without scoped authorization.

Finish with passed checks and inspected UI evidence, or explicitly report the remaining validation/content/access blocker after completing independent authorized work. Static reasoning does not establish a visual pass.
