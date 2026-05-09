# Precheck: Generate / DeckView German i18n + UI cleanup

Mission: clean up English leftovers and duplicate queue status in the
Generate flow and deck views, especially under base_language=German /
glassy skin. No backend changes.

## 1. Where "In Warteschlange" / "Queued" is rendered twice

Both DeckView pages render the pending status **twice on the same card**:

- `frontend/src/pages/DeckView.tsx`
  - Pending placeholder block (lines 587–608)
    - Inside the aspect-video media area:
      `<span className="text-xs ...">{t('deckview.queued')}…</span>` (line 589–593)
    - Below the title, *under the word*: same string again (lines 597–601).
  - The lower paragraph is the duplicate. Word title `<p>{word.word}</p>`
    must remain.

- `frontend/src/pages/DeckViewPG.tsx`
  - Pending placeholder block in carousel media area (lines 750–759)
    `<span className="text-xs text-white/35">…queued…</span>`
  - Then again under the word title in the info area (lines 858–866):
    `<p className="text-xs text-gray-500 mt-1">…queued…</p>`
  - The lower paragraph is the duplicate.

Fix: keep the placeholder status (inside the media area). Drop the second
status text under the word for non-failed pending/processing cards. Keep
the failed-state action row (Retry/Remove) intact and only show error
text when it adds info beyond the placeholder.

## 2. Hardcoded English strings

Locations of hardcoded strings to localize:

- `frontend/src/components/generate/shared/GlassInput.tsx:57`
  Default placeholder `'Type a word and press Enter'` — also passed in
  `WordsStep.tsx:112`.
- `frontend/src/components/generate/steps/WordsStep.tsx`
  - line 49 `Maximum ${MAX_WORDS} words per deck` (already covered by `generate.maxWords`)
  - line 45 `'Duplicate word'` (already covered by `generate.wordExists`)
  - line 112 placeholder prop `Type a word and press Enter`
  - line 121 `Back`
  - line 171 `Quick Generate`
  - line 182 `Customize`
- `frontend/src/components/generate/steps/CategoryPicker.tsx`
  - line 77 error `Pick a target language first`
  - line 85 error `Your session expired. Please sign in again.`
  - line 111 error `No suggestions returned`
  - line 115 error `Failed to fetch suggestions`
  - line 143 error `Add at least one word`
  - line 174 slider endpoint `Max 20`
  - line 211 group label `{group.label}` (English from CATEGORY_GROUPS)
  - line 220 category label `{cat.name}`
  - line 233 inline `← Back`
  - line 244 `Finding words…`
  - line 263 `Change category`
  - line 289 word input placeholder `word`
  - line 296 translation input placeholder `translation`
  - line 307 aria-label `Remove word`
  - line 357 `Regenerate All`
  - line 366 error `Add at least one word`
- `frontend/src/data/categories.ts` — entire file: English `label` and
  `name` fields are display strings. Fix needed to keep English values
  for backend API while showing German labels in UI.

## 3. Both standard and glassy flows?

- `WordsStep`, `GlassInput`, `CategoryPicker`, `PremiumQuickModePanel`
  are shared by GenerateGO (glassy) and GeneratePG. Strings appear in
  both skins. CSS classes (`words-back-button`, `premium-quick-primary`,
  …) are glassy theme rules — text-content fixes are skin-agnostic.

- DeckView vs DeckViewPG: DeckView is the classic skin, DeckViewPG is
  the glassy skin (Premium/Glass). The duplicate-status pattern exists
  in **both**.

## 4. Are category names used as backend/API values?

Yes. `CategoryPicker.fetchSuggestions(category)` posts
`{ category }` to `/api/suggest-words` and to OpenAI prompts on the
backend. Category names like `Greetings & Introductions` are sent as
the `category` field. Group labels (e.g. `Essentials`) are display-only
and not sent. We must NOT translate the value sent to the API.

## 5. Existing translation keys

Existing keys (en/de/fr) we already have that we will reuse:

- `generate.words.addTitle`
- `generate.words.typeOwn`
- `generate.words.pickCategory`
- `generate.maxWords` (count placeholder)
- `generate.wordExists`
- `generate.quickGenerate`
- `generate.customize`
- `generate.wordCountSlider.{one,other}` via `tp`
- `common.retry`, `common.cancel`
- `deckview.queued`, `deckview.processing`, `deckview.cardCreation`
- `deckview.failed`, `deckview.cardFailure`

## 6. New keys we need

- `common.back` — short back label, "← Back" / "← Zurück" / "← Retour"
- `generate.primaryGenerate` — primary user action label,
  Generate / Generieren / Générer (separate from `generate.quickGenerate`
  which is admin/internal Premium Card)
- `generate.words.manualPlaceholder` — `Type a word and press Enter`
- `generate.words.addWordAriaLabel` — accessible name for + button
- `generate.words.changeCategory` — "Change category"
- `generate.words.regenerateAll` — "Regenerate All"
- `generate.words.findingWords` — "Finding words…"
- `generate.words.wordPlaceholder` — input placeholder "word"
- `generate.words.translationPlaceholder` — input placeholder "translation"
- `generate.words.addAtLeastOne` — "Add at least one word"
- `generate.words.pickTargetLanguageFirst`
- `generate.words.noSuggestionsReturned`
- `generate.words.fetchSuggestionsFailed`
- `generate.words.maxCount` — "Max. 20" (with {max} variable)
- `generate.words.removeWordAriaLabel` — "Remove word"
- `generate.words.sessionExpired` — session expired error
- `category.group.<slug>` — display label per CATEGORY_GROUPS group
- `category.<slug>` — display label per category

## 7. Approach: keep API values stable, translate display labels

Plan:

- Keep `CATEGORY_GROUPS` keyed by stable English `name` (the value
  posted to `/api/suggest-words`). Add `groupKey` and `categoryKey`
  fields used solely as i18n keys. Render via `t(group.groupKey)` and
  `t(cat.categoryKey)` while still passing `cat.name` (English) to
  `fetchSuggestions`.
- `displayLabel(category)` becomes `t(cat.categoryKey)` → falls back
  to English `cat.name` if no translation exists.
- All display-only group headers and category buttons read translated
  copy; the network call is unchanged.

## 8. Generate / Customize hierarchy

- `WordsStep` (non-premium): currently uses `Quick Generate` and
  `Customize` literal strings with both `glow` highlighted. For normal
  user flow we render the primary as "Generieren" / "Generate"
  (`generate.primaryGenerate`) using `PillButton` with stronger size
  and `glow`. The Customize secondary uses `variant="secondary"` and a
  smaller scale (no glow override).
- `CategoryPicker` preview buttons mirror the same approach. The
  Premium Card path (`state.productLane === 'card_premium'`) keeps
  using `PremiumQuickModePanel` and `PREMIUM_QUICK_MODE_OPTIONS`
  internal keys; we only retitle the panel's main button via
  `generate.primaryGenerate`. Internal mode values (`quick_generate`)
  are untouched.
- "Quick Generate" English copy continues to live at
  `generate.quickGenerate` for any admin/internal contexts that might
  still reference it.

## 9. Risks / non-goals

- We will NOT touch backend categories, supabase RPCs, prompts, or
  card queue state machine.
- We will NOT alter premium internal mode values.
- We will NOT change global queue display behavior — `shouldUseGlobalQueuePosition`
  already returns false for card decks.
- French translations get added for the new keys to keep parity, even
  though German is the active scenario.
