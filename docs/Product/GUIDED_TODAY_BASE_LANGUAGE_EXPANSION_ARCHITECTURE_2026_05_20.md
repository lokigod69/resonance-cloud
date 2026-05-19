# Guided Today Base-Language Expansion Architecture - 2026-05-20

## Scope

This is a docs-only investigation and architecture recommendation. It does not implement schema, rendering, test, metadata, or content changes.

Goal: expand Guided Today paths so a path authored with one base-language audience can also serve learners whose `profile.base_language` is different, without duplicating conceptual progress.

The local deep investigation report is stored outside the repo at:

```text
D:\CODING\ResonanceTEST\investigations\GUIDED_TODAY_BASE_LANGUAGE_EXPANSION_INVESTIGATION_2026_05_20.md
```

Baseline checked in the investigation worktree:

- `git log --oneline -10` started at `6b054cd polish(guided-today): cebuano a1 vocab repetition sweep`.
- `cd frontend && npm run test:guided-today` passed with exit code 0.

Read-first note:

- `docs/Product/GUIDED_TODAY_A1_LANGUAGE_EXPANSION_ARCHITECTURE_2026_05_15.md` was not present in this checkout.
- `docs/Product/GUIDED_TODAY_A1_LANGUAGE_EXPANSION_ADDENDUM_2026_05_17.md` was not present in this checkout.

## 1. Current State

Primary data source: `frontend/src/data/guidedLessons.ts`.

The current lesson schema is single-locale for base-language lesson content. `GuidedBaseLanguage` is only `'German' | 'English'` (`guidedLessons.ts:20`), `GuidedPathMetadata.baseLanguage` is a single `GuidedBaseLanguage` (`guidedLessons.ts:23-31`), and every main base-language lesson field is currently a `string`.

Current base-language and learner-facing text surfaces:

| Surface | Current type | Location | Current consumers |
|---|---:|---|---|
| `corePhrase.baseText` | `string` | `guidedLessons.ts:88-93` | `TodayHero.tsx:194-199`, `TodaySession.tsx:181-186`, `GuidedCheckpoint.tsx:450-465` |
| `meaning` | `string` | `guidedLessons.ts:94` | Tested in `test-guided-today-data.ts:2456`; not broadly rendered in Today session chrome. |
| `chunks[].baseText` | `string` | `guidedLessons.ts:40-44`, `95` | `MatchPairsStep.tsx:151` through deterministic match columns. |
| `lessonItems[].baseText` | `string` | `guidedLessons.ts:48-54`, `96` | `TodayHero.tsx:225-250`, `ReviewStep.tsx:103-109` |
| `typeRecall.before/after` | `string` | `guidedLessons.ts:101-107` | `TypeRecallStep.tsx:79-88`, `GuidedCheckpoint.tsx:440-448`; these are target-language prompt fragments, not base-language text. |
| `speakTarget.baseCue` | `string` | `guidedLessons.ts:108-120` | `SpeakStep.tsx:19-23`, `GuidedCheckpoint.tsx:570-573` |
| `speakTarget.germanPrompt` | `string | undefined` | `guidedLessons.ts:112` | Same speech prompt consumers; this name is a German-specific escape hatch. |
| `sceneCaption` | `string` | `guidedLessons.ts:121`, materialized at `60012` | Fallback media caption via `materializeLessonMedia()` at `guidedLessons.ts:60116-60122`; language is not uniformly base-language. |
| `placeholderMedia.caption` | `string | undefined` | `guidedLessons.ts:81-86` | `LessonMediaFrame` in `TodayHero.tsx:31-132` through `lessonMedia.caption`. |
| `trophyWord.meaning` | `string` | `guidedLessons.ts:69-73` | `TodaySession.tsx:256-258`, `TrophyWordCard.tsx:13-15` |
| `trophyWord.whyThisWord` | `string` | `guidedLessons.ts:69-73` | Tested in `test-guided-today-data.ts:2470`; not a primary visible card today. |
| `situation` | `{ en: string; de: string }` | `guidedLessons.ts:140-143` | Rendered as `situation.de` in `TodayHero.tsx:186-188` and `TodaySession.tsx:159-164`. |
| `nextLessonTeaser.situation` | `string` | `guidedLessons.ts:150-153` | German-scanned in `test-guided-today-data.ts:2526-2529`. |

`resolveGuidedLessonVariant()` exposes raw strings unchanged (`guidedLessons.ts:59975-60014`). There is no content-locale resolver in the rendering path today.

### Path Distribution

Path metadata constants begin at `guidedLessons.ts:195` and run through `1071`. `getGuidedTodayPathOptions()` exposes 80 paths at `guidedLessons.ts:59793-59875`; `getGuidedPathLessons(pathId)` filters by path id at `guidedLessons.ts:59878-59882`.

| Path family | targetLanguage | baseLanguage | Lesson count | Sample lesson ID |
|---|---|---|---:|---|
| `english-a1-practical-*` | English | German | 100 | `english-a1-practical-001-first-contact` |
| `spanish-a1-practical-*` | Spanish | German | 100 | `spanish-a1-practical-001-primer-contacto` |
| `italian-a1-practical-*` | Italian | German | 100 | `italian-a1-practical-001-primo-contatto` |
| `french-a1-practical-*` | French | German | 100 | `french-a1-practical-1-lesson-1-bonjour-francais` |
| `portuguese-a1-practical-*` | Portuguese | German | 100 | `portuguese-a1-practical-1-lesson-1-ola-portugues` |
| `cebuano-a1-practical-*` | Cebuano | German | 100 | `cebuano-a1-practical-1-lesson-1` |
| `german-a1-practical-*` | German | English | 100 | `german-a1-practical-1-lesson-1-first-contact` |
| `indonesian-a1-practical-*` | Indonesian | German | 100 | `indonesian-a1-practical-1-lesson-1-first-contact` |

Conclusion: German is uniformly the authored base for every target family except German-target, which is authored with English base. The current live set is 800 A1 lessons.

### `profile.base_language` Flow

Database and auth:

- `frontend/supabase/migrations/20260322210000_phase2a_tables.sql:8` adds `public.profiles.base_language text default 'English'`.
- `frontend/src/lib/supabase.ts:12-24` defines `Profile.base_language: string | null`.
- `frontend/src/hooks/useAuth.ts:131-138` fetches `base_language` from `profiles`; `useAuth.ts:160-163` stores it in state and the local auth profile cache.
- Onboarding updates the column at `frontend/src/pages/Onboarding.tsx:47-72`.
- Settings updates the column at `frontend/src/pages/Settings.tsx:57-89`.

Valid/selectable base values:

- `frontend/src/lib/languages.ts:33-47` defines language values. `BASE_LANGUAGES` are English, German, French, Italian, Bisaya, Tagalog, Korean, and Spanish.
- UI locale support is narrower. `frontend/src/lib/translations.ts:14` defines `Locale = 'en' | 'de' | 'fr'`.
- `LANGUAGE_TO_LOCALE` maps English, German, French, Korean, and Spanish at `translations.ts:19-25`; Korean and Spanish currently fall back to English UI.

UI i18n:

- `useTranslation()` reads `profile?.base_language`, maps through `LANGUAGE_TO_LOCALE`, and defaults to English at `frontend/src/hooks/useTranslation.ts:17-25`.
- Guided Today chrome uses `useTranslation()`, but authored lesson content fields are rendered directly.

Progress:

- `TodayCourseProgress` stores `baseLanguage` and `targetLanguage` at `frontend/src/lib/todayProgress.ts:54-61`.
- New progress uses `baseLanguage: lesson.baseLanguage`, not `profile.base_language`, at `todayProgress.ts:314-322`.
- Guided progress remains keyed by path id (`guidedLessons.ts:59907-59916`).

Finding: the code does not enforce `lesson.baseLanguage === profile.base_language`, but the UI implicitly assumes the path's authored base is appropriate for the learner. English-L1 learners can therefore see German content on non-German target paths.

### Rendering Layer

Every relevant Today surface reads authored lesson strings directly:

- `TodayHero.tsx` renders `situation.de`, `corePhrase.baseText`, and `lessonItems[].baseText`.
- `TodaySession.tsx` renders `situation.de`, `corePhrase.baseText`, and `trophyWord.meaning`.
- `MatchPairsStep.tsx` renders `pair.baseText`.
- `ReviewStep.tsx` renders `item.baseText`.
- `SpeakStep.tsx` and `GuidedCheckpoint.tsx` render `speak.germanPrompt ?? speak.baseCue`.
- `GuidedCheckpoint.tsx` renders `corePhrase.baseText` for checkpoint prompts.
- `TrophyWordCard.tsx` renders `trophyWord.meaning` and `trophyWord.example`.
- `LessonMediaFrame` renders `lessonMedia.caption`, which is `placeholderMedia.caption ?? sceneCaption`.

Implication: a schema migration needs a content resolver separate from `useTranslation()`. UI chrome should continue to use `t(key)`. Authored lesson content should use a helper that maps `profile.base_language` to a content locale, selects that locale when present, and falls back to the authored base locale.

### Test Surface

Important test references:

- `frontend/package.json:12` defines `test:guided-today`.
- `frontend/scripts/test-guided-i18n.ts` does not exist in this checkout; the actual Today i18n test is `frontend/scripts/test-guided-today-i18n.ts`.
- `test-guided-today-data.ts:2200-2213` hardcodes German-scanned learner-facing field kinds.
- `test-guided-today-data.ts:2448-2472` asserts base text, meaning, chunks, lesson items, speak cue, scene caption, placeholder caption, and trophy fields are non-empty strings.
- `test-guided-today-data.ts:2520-2552` scans German fields when `lessonDefinition.baseLanguage === 'German'`.
- `test-guided-today-i18n.ts:20-37` checks Today UI translation key coverage for `en`, `de`, and `fr`, not lesson content.
- `test-guided-trophy-word-uniqueness.ts:109-114` expects trophy fields to be non-empty strings.

If lesson content becomes locale-keyed, tests must shift from `field is string` to `field.de/en is string or fallback-allowed`, and the German guard must scan locale leaves rather than whole fields.

## 2. Audience Prioritization

Highest impact: English-L1 learners studying the 7 non-German target families currently authored with German base:

- Spanish
- Italian
- French
- Portuguese
- Cebuano
- Indonesian
- future Korean/Japanese or other non-German targets

German-L1 -> German target does not make product sense. Spanish-L1 and French-L1 audiences are valuable later, but English-L1 is the reach unlock.

Recommended rollout:

1. Build the schema/resolver foundation with zero behavior change for current authored bases.
2. Fill English-L1 -> Spanish first.
3. Fill English-L1 -> French, Italian, and Portuguese.
4. Fill English-L1 -> Indonesian and Cebuano with extra review.
5. Add future base audiences only after the two-base model is proven.

## 3. Architectural Options

### Option A: Additive Parallel Path Families

Create new path ids per base audience, such as `spanish-en-a1-practical-1` and `spanish-de-a1-practical-1`.

Costs:

- Path count doubles from 80 to 160 for only two bases.
- `getGuidedTodayPathOptions()` and path directory filtering become target+base aware.
- Content duplicates target phrases, chips, accepted answers, trophy words, and TTS inventory.
- Path-progress fragments if a learner changes `profile.base_language`.
- Reversal is hard once progress exists under base-specific path ids.

Benefit: little schema surgery.

Recommendation: avoid. It creates permanent duplication and fights the existing path-id progress model.

### Option B: Multi-Locale Fields on Existing Paths

Convert base-language fields to locale maps, for example:

```ts
baseText: {
  de: 'Hallo, wie geht es Ihnen?',
  en: 'Hello, how are you?',
}
```

Costs:

- Broad type migration in `guidedLessons.ts`.
- Renderer updates across Today components and Guided Checkpoint.
- Mechanical migration for 800 lessons and all active vibe variants.
- Test updates for locale maps and German guard scanning.

Benefits:

- Single source of truth per conceptual lesson.
- Progress remains path-id based and unaffected.
- Adding a third base language is another locale slot, not another path family.
- Aligns with the existing profile-driven UI i18n model while keeping authored content separate from chrome keys.

Recommendation: best steady-state architecture.

### Option C: Hybrid Structure Now, Content Later

Adopt Option B's structure and resolver, but allow missing locale slots to fall back to the authored base until content is filled.

Costs:

- Same schema and renderer work as Option B.
- Requires explicit fallback behavior and possibly UI wording for missing translation.
- Mixed-locale UX is possible during transition.

Benefits:

- Schema can land before every English baseText is drafted and reviewed.
- English-L1 content fill becomes one target-family goal at a time.
- Reversal is manageable before content proliferation, and progress remains stable.

Recommendation: choose Option C as the rollout strategy, with Option B as the final steady-state.

## 4. Content Provenance

Do not copy English-target lessons as English baseText for non-English target paths.

The current German baseText on Spanish, Italian, French, Portuguese, Cebuano, and Indonesian paths is a gloss of that target phrase in that lesson's situation and vibe. English-target lessons were authored as target content for German-L1 learners, not as neutral English glosses for every other target phrase.

Recommended provenance model:

- Draft English base text from the authored German baseText, the actual target phrase, the situation, and the vibe.
- Use corresponding English-target lessons only as reference for tone and path spine.
- Require adversarial review per target language to confirm A1 naturalness, target alignment, and no drift from the actual target phrase.

## 5. Phased Implementation Plan

Phase 1: Schema migration.

- Convert selected base-language fields to locale maps.
- Existing German-base values populate `de`; existing German-target English-base values populate `en`.
- Add a content resolver keyed by `profile.base_language`.
- Update Today and checkpoint renderers to resolve content.
- Update tests for locale maps and fallback behavior.
- Preserve existing behavior for current German-base and English-base users.

Phase 2: English-L1 content fill per target language.

- Start with Spanish.
- Then French, Italian, Portuguese.
- Then Indonesian and Cebuano.
- Each fill goal should include content drafting, automated validation, and adversarial review.

Phase 3: UI selector polish.

- Path direction and column labels should reflect the learner's resolved base language when content exists.
- Labels should avoid "German -> Spanish" for an English-L1 learner who is receiving English base text.
- Decide whether fallback is silent or visibly marked while Option C is incomplete.

Phase 4+: Future base-language audiences.

- Add Spanish-L1, French-L1, and other audiences after English-L1 succeeds.
- Treat every new base audience as a content and QA project, not just a schema fill.

## 5A. Phase 1 Implementation Status

Sir Robert resolved the architecture after this investigation: Option C rollout to Option B steady-state, with no Option A path-family duplication.

Phase 1 is split into mandatory direct-to-main implementation slices:

- PR A foundation: add the `GuidedBaseContentLocale` / `GuidedBaseContentText` model, resolver helpers, temporary `string | GuidedBaseContentText` field unions, renderer resolver usage, base-neutral checkpoint labels, and resolver-aware tests. No lesson data is migrated in PR A.
- PR B German-target migration: wrap `german-a1-practical-*` base-language fields as `{ en: existingValue }`.
- PR C-I German-base migrations: wrap the remaining families as `{ de: existingValue }` in this order: English, Spanish, French, Italian, Portuguese, Indonesian, Cebuano.
- PR J strict schema: remove temporary string unions after all 800 lessons are migrated.

PR A foundation commit subject:

```text
feat(guided-today): add base-language content resolver foundation
```

PR A intentionally leaves all existing lesson data as strings. The resolver treats legacy string fields as authored-base content, so current rendering remains content-equivalent while later migration commits convert each path family to explicit locale maps.

Effective base-language labels must reflect the resolved content locale, not merely the learner profile preference. During Option C fallback, an English-L1 learner on a German-authored Spanish path still sees `German -> Spanish`; once English content exists, the same resolver can produce `English -> Spanish`.

## 6. Open Decisions for Sir Robert

1. Option A vs B vs C. Recommendation: C rollout, B steady-state.
2. First English-L1 target pair. Recommendation: Spanish first.
3. Content provenance standard: fresh English glosses with English-target lessons as reference only.
4. Fallback UX: silent authored-base fallback or visible "translation pending" hint.
5. Phase 1 PR shape: one broad schema PR or split by field/path family.
6. Keep the deep investigation local-only or commit it later. Recommendation: keep local-only per dispatch.
7. Label policy for non-German base languages and same-language edge cases.

## 7. Risks

- The schema migration touches 800 lessons and multiple active vibe variants.
- Translation quality is the main product risk; base glosses must match target phrases, not copied English curriculum.
- Test churn is broad because many assertions assume string fields.
- Learners who change `profile.base_language` mid-study need stable fallback behavior.
- Option A would fragment path progress because progress is keyed by path id.
- Bundle size grows as each lesson carries two or more base-language strings.
- `sceneCaption`, `placeholderMedia.caption`, and `trophyWord.example` need field classification before automatic conversion because they are not uniformly base-language glosses.

## 8. Non-Goals

- A2 content.
- UI chrome i18n beyond already shipped Today i18n work.
- Multi-target-language paths.
- Per-region base variants such as `en-US` vs `en-GB`.
- Runtime schema implementation.
- Adding English baseText content.
- Touching rendering code, tests, path metadata, or existing lessons in this goal.
