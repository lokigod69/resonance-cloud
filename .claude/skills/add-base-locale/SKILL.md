---
name: add-base-locale
description: Add a new UI/base locale (the language users learn FROM) to Lingwave in frontend/ — extending the Locale union beyond en/de/fr, translating ~1,469 UI keys, and updating every type and tool that embeds the locale set. Use when asked to "translate the app into Spanish", "add Italian UI", etc. NOT for adding a learnable language (use add-target-language). RTL locales (Arabic, Hebrew) are BLOCKED until a layout pass exists.
---

# Add a base/UI locale

A base locale is a member of `Locale = 'en' | 'de' | 'fr'` in
`frontend/src/lib/translations.ts` — the language the app's own UI speaks. This is
type-cascade work plus a large natural-translation job. Read
`docs/Product/FABLE_LANGUAGE_ARCHITECTURE.md` §7 first. Line numbers drift — re-grep.

**Blockers to check before starting:**
- **RTL (Arabic, Hebrew, …) is BLOCKED.** No `dir` handling, Latin-only fonts in
  `index.html`, LTR-coordinate canvas renderers and games. Requires a layout pass that
  does not exist. Refuse and surface this rather than attempting it.
- Non-Latin scripts (Korean, Greek, Cyrillic-based UI) need a font audit —
  `index.html` loads Cormorant Garamond / VT323 / Share Tech Mono / Inter, all
  Latin-focused. Confirm glyph coverage or add a font before committing to the locale.
- Guided lessons base text supports **en/de only** (not even fr). A new locale ships
  with guided content in the English fallback unless the owner explicitly scopes the
  ~30k-entry guided translation — do not attempt it as part of this skill.

## Steps — the compile-blocking cascade first

Work in this order; the app won't build between steps 1 and 4, so do them in one pass.

1. **`frontend/src/lib/translations.ts`**
   - Add `'xx'` to the `Locale` union.
   - Add a complete `xx: { ... }` block: every key present in `en` (~1,469 — treat `en`
     as the source of truth; `scripts/check-i18n-coverage.ts` verifies). Translation
     quality rules below.
   - Add the language-name → locale entry to `LANGUAGE_TO_LOCALE` (keyed by the
     canonical English name from `lib/languages.ts`, e.g. `Spanish: 'es'`).
   - Ensure the language has `isBase: true` in `lib/languages.ts` (it must be offerable
     in Onboarding/ProfileModal to be reachable at all).
2. **`frontend/src/data/quotes.ts`** — `QUOTES: Record<Locale, string[]>` forces an
   `xx` array. Author a natural localized set (can be shorter than en's; must not be
   machine-literal translations of the en quotes).
3. **`frontend/src/lib/scriptlab/types.ts`** — `LocalizedText = { en, de, fr }` gains
   `xx: string`. This cascades: every `lt(en, de, fr)` call in every
   `frontend/src/data/scripts/*.ts` data file needs a 4th argument (~100–150 short
   strings per script), and the `localizeScriptText` switch in the same types file must
   return `text[locale] || text.en` for the new member. Run `npm run test:script-lab`
   after — the suite enforces per-locale completeness on script content.
4. **Sweep for remaining `Record<Locale, ...>` compile errors** — `npm run typecheck`
   is the discovery tool; fix every site it flags (e.g.
   `lib/staticLibraryLanguage.ts` is `Partial` and optional, but others may not be).

## Tooling

5. **`frontend/scripts/check-i18n-coverage.ts`** — add `'xx'` to `requiredLocales`
   (hard CI gate) or `warnOnlyLocales` (soft). Unedited, the new locale is not
   validated AT ALL. Default: `requiredLocales` — ship complete or don't ship.
6. **`frontend/scripts/test-i18n-display-labels.ts`** — add `createT('xx')` assertions
   mirroring the en/de/fr ones.

## Hardcoded locale branches to extend

These are `de/fr` ternaries/maps that silently ignore a new locale:

7. `frontend/src/hooks/useLandingLocale.ts` — the `?lang=` URL-param allow-list AND the
   `BROWSER_LANG_TO_LOCALE` map (add `xx`, `xx-XX` variants).
8. Date-locale ternaries — `pages/DeckViewPG.tsx`, `pages/DeckView.tsx`,
   `pages/DecksPG.tsx` (grep `toLocaleDateString` + `locale ===`); DecksPG also has a
   hardcoded water-label ternary. Prefer introducing a shared `localeToBcp47(locale)`
   helper in `lib/` over growing each ternary — but keep the diff focused.
9. Landing copy: `components/ui/VerbCycler.tsx` + `lib/spinnerVerbs.ts` (new verb
   array), `components/landing/CreatorRail.tsx` (`word.de`/`word.fr` accessors),
   `LandingHero.tsx` locale ternary, `TideStory.tsx` locale branch.
10. Optional polish: `lib/staticLibraryLanguage.ts` `STATIC_LEVEL_LABELS` overrides
    (~20 strings; falls back to English gracefully).

## Content that may already exist

- `frontend/src/data/staticCategoryTranslations.ts` already carries
  en/de/fr/es/pt/it/pl/id/ceb/ko glosses for ~1,850 concepts. If the new locale is one
  of those ten, curriculum glosses are free. Otherwise that's a separate ~1,850-term
  job (see add-target-language Tier 1 — same file, different role).
- `api/prompts/_shared/pedagogy.ts` `LANGUAGE_CONFIG`/`NATIVE_LANGUAGE_NAMES` — most
  European languages are already present; add only if missing (then run
  `npx tsc -p tsconfig.api.json`).

## Translation quality rules (non-negotiable)

- **Native-natural, never machine-literal.** Translate meaning and register, not words.
  UI brevity matters: buttons/labels must stay short enough for their containers.
- Real diacritics always (German umlauts ä/ö/ü, not ae/oe/ue; same standard for the new
  locale's orthography).
- Preserve `{var}` interpolation placeholders exactly; never translate placeholder
  names. Preserve `.one`/`.other` plural-key pairs and pluralize correctly for the
  locale's plural rules (if the locale needs more categories than one/other, flag it —
  the `tp()` helper only supports those two).
- The 26 `langName.*` keys are language names in the new locale — use the locale's
  standard exonyms.
- Brand terms (Lingwave, Speak, Script Lab product names) stay untranslated unless the
  owner says otherwise.

## Verification (from `frontend/`)

```
npm run typecheck
npm run lint
npm run check:i18n              # must pass with the new locale in requiredLocales
npm run test:i18n-display-labels
npm run test:script-lab         # LocalizedText cascade
```

Then exercise it: set `profiles.base_language` to the new language (Onboarding or
ProfileModal), reload, and click through dashboard, wizard, study, settings, landing
(`?lang=xx`) checking for missing keys (DEV console warns once per key), overflowing
labels, and wrong-locale dates.

## Do not

- Do not attempt an RTL locale (see blocker above) — surface it to the owner instead.
- Do not leave the new locale out of `check-i18n-coverage.ts` "temporarily" — an
  unvalidated locale rots immediately.
- Do not machine-translate the block in one pass and call it done; every key ships as
  user-facing product copy. Batch-draft, then review by domain (nav, study, wizard,
  errors, landing) for consistency of terminology.
- Do not touch guided-lesson base-content types (`GuidedBaseContentText` et al.)
  without an explicit owner-scoped project.
- Do not translate legal page CONTENT (externally hosted) — only the `legal.*` link
  labels, which are part of the standard key set.
