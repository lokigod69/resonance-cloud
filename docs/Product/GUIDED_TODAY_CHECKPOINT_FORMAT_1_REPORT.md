# Guided Today Checkpoint Format 1 Report

Date: 2026-05-12

## Commit SHA

The final commit SHA is recorded in the final delivery response after the commit and push. A Git commit cannot contain its own final SHA in a tracked file without changing that SHA.

## Files Created and Modified

Created:
- `frontend/src/components/today/CheckpointCard.tsx`
- `frontend/src/lib/guidedCheckpoint.ts`
- `frontend/src/pages/GuidedCheckpoint.tsx`
- `frontend/scripts/test-checkpoint-selection.ts`
- `frontend/scripts/test-checkpoint-trigger.ts`
- `frontend/scripts/test-checkpoint-storage.ts`
- `docs/Product/GUIDED_TODAY_CHECKPOINT_FORMAT_1_REPORT.md`

Modified:
- `frontend/src/App.tsx`
- `frontend/src/components/today/TodayPathOverview.tsx`
- `frontend/src/pages/Today.tsx`
- `frontend/scripts/test-guided-today-path-overview.ts` (line-ending normalization in source reads so the Windows checkout passes the existing source-level assertion)

## Route Path Registered

`/today/checkpoint` is registered in both skin-aware user route trees in `frontend/src/App.tsx`.

## Trigger Condition Implemented

The Today page renders the Quick Review card when:

```ts
countCompletedGuidedCheckpointPaths(progress, activeVibe) > getGuidedCheckpointCount(activeVibe)
```

Path completion is active-vibe scoped: every lesson in the path must have `vibeCompletions[activeVibe].completedAt`.

## Selection Algorithm Pseudo-code

```text
function buildCheckpoint(progress, activeVibe):
  completedPaths = all guided paths where every lesson is completed in activeVibe
  eligibleByPath = lessons in completedPaths completed in activeVibe

  if total eligible items < 8:
    return no checkpoint

  if completedPaths.length == 1:
    quotas = [8]
  else if completedPaths.length == 2:
    quotas = [4, 4]
  else if completedPaths.length == 3:
    quotas = [3, 3, 2]  // newest path receives the floor
  else:
    floor = floor(8 / completedPaths.length)
    quotas = floor for each path
    distribute remainder +1 to newest path(s)

  for each completed path:
    uniformly shuffle that path's eligible pool
    take quota items without replacement

  if defensive underfill occurs and total eligible >= 8:
    fill remaining slots from shuffled unselected eligible items

  interleave shuffled path buckets, preferring a path different from the previous item
  return first 8 checkpoint items
```

## localStorage Key Shape

Checkpoint records use:

```text
guided_checkpoint_{vibe}_{checkpointIndex}
```

Example:

```json
{
  "completedAt": "2026-05-12T00:00:00.000Z",
  "itemsReviewed": 8,
  "itemsCorrectFirstTry": 6,
  "items": [
    {
      "lessonId": "english-a1-practical-001-first-contact",
      "pathId": "english-a1-practical-1",
      "vibe": "bright",
      "firstTryCorrect": true,
      "needsReview": false
    }
  ]
}
```

`checkpointIndex` is per active vibe and advances from the highest existing index plus one.

## Edge Cases Handled

- Pool under 8 eligible active-vibe items returns no checkpoint plan and the Today card is not rendered.
- Vibe switches regenerate selection against the active vibe used at checkpoint start (`/today/checkpoint?vibe={activeVibe}`).
- Mixed-vibe completions do not count toward another vibe's path completion.
- Completion records are localStorage-only and checkpoint count is derived from `guided_checkpoint_{vibe}_*` keys.
- Defensive quota underfill fills from remaining eligible items only when the total pool still has at least 8.

## Checkpoint Flow

- Today card title: `Quick Review`.
- Subtitle: `8 items from your completed path(s)`.
- CTA: `Start`.
- Full-screen route flow: Type Recall -> Speak -> Next, repeated for 8 items.
- Type Recall shows the German `corePhrase.baseText` prompt and hides the English answer until submit.
- Type Recall uses existing `guidedAnswerMatches` tolerance.
- Incorrect Type Recall records `firstTryCorrect: false` and `needsReview: true`.
- Speak shows `speak.baseCue`, uses the existing guided browser speech-recognition helper, and records no score.
- Summary: `Quick Review complete` and `{itemsCorrectFirstTry} out of 8 correct on first try`.

## Tests Added

- `scripts/test-checkpoint-selection.ts`: distribution for 1/2/3 completed paths, active-vibe filtering, final order anti-clustering, and pool under 8.
- `scripts/test-checkpoint-trigger.ts`: completed path counting, pending checkpoint condition, partial path behavior, and mixed-vibe isolation.
- `scripts/test-checkpoint-storage.ts`: key shape, count/index behavior, record shape, first-try totals, and independent vibe counters.

## Scope Confirmations

- A1P1/A1P2/A1P3 lesson content was untouched (`frontend/src/data/guidedLessons.ts` has no diff).
- No backend, Supabase, provider, generation, TTS, video, or content-authoring changes were made.
- No new vibes were activated.
- No SRS or weakness-weighted selection was added.
- `needsReview` is captured in the checkpoint record and intentionally not fed back into lesson state.

## Browser Check

A temporary Vite server responded with HTTP 200 for `/today/checkpoint?vibe=bright`. Opening the route in the in-app browser redirected to `/login` because the route is protected by the existing auth shell, so authenticated visual inspection was not possible in this environment.

## Known Limitations

- `needsReview` is stored for future use but does not affect future sampling in V1.
- Checkpoint speech uses the existing guided browser speech-recognition helper available in this codebase; it performs no checkpoint scoring and makes no provider calls.
- The checkpoint record key is local-only and not user-scoped, matching the locked key shape in the spec.

## Verification Output

### npx tsx scripts/test-guided-vibes.ts
```text

[vibe registry]
  ok  default vibe is bright
  ok  active vibes are unique
  ok  future vibes are unique
  ok  active vibes are Bright, Wistful, Sharp
  ok  future vibes are Tender, Bold, Cheeky
  ok  bright exists in registry
  ok  bright has a label
  ok  bright has a short description
  ok  bright has a personality summary
  ok  bright has a word palette
  ok  bright has signature phrasings
  ok  bright has example sentences
  ok  bright has scene mood notes
  ok  bright has music genre
  ok  bright has UI aesthetic notes
  ok  bright has trophy candidates
  ok  wistful exists in registry
  ok  wistful has a label
  ok  wistful has a short description
  ok  wistful has a personality summary
  ok  wistful has a word palette
  ok  wistful has signature phrasings
  ok  wistful has example sentences
  ok  wistful has scene mood notes
  ok  wistful has music genre
  ok  wistful has UI aesthetic notes
  ok  wistful has trophy candidates
  ok  sharp exists in registry
  ok  sharp has a label
  ok  sharp has a short description
  ok  sharp has a personality summary
  ok  sharp has a word palette
  ok  sharp has signature phrasings
  ok  sharp has example sentences
  ok  sharp has scene mood notes
  ok  sharp has music genre
  ok  sharp has UI aesthetic notes
  ok  sharp has trophy candidates
  ok  tender exists in registry
  ok  tender has a label
  ok  tender has a short description
  ok  tender has a personality summary
  ok  tender has a word palette
  ok  tender has signature phrasings
  ok  tender has example sentences
  ok  tender has scene mood notes
  ok  tender has music genre
  ok  tender has UI aesthetic notes
  ok  tender has trophy candidates
  ok  bold exists in registry
  ok  bold has a label
  ok  bold has a short description
  ok  bold has a personality summary
  ok  bold has a word palette
  ok  bold has signature phrasings
  ok  bold has example sentences
  ok  bold has scene mood notes
  ok  bold has music genre
  ok  bold has UI aesthetic notes
  ok  bold has trophy candidates
  ok  cheeky exists in registry
  ok  cheeky has a label
  ok  cheeky has a short description
  ok  cheeky has a personality summary
  ok  cheeky has a word palette
  ok  cheeky has signature phrasings
  ok  cheeky has example sentences
  ok  cheeky has scene mood notes
  ok  cheeky has music genre
  ok  cheeky has UI aesthetic notes
  ok  cheeky has trophy candidates
  ok  bright active vibe has an emblem URL
  ok  bright active vibe has emblem alt text
  ok  bright production emblem is WebP with alpha
  ok  wistful active vibe has an emblem URL
  ok  wistful active vibe has emblem alt text
  ok  wistful production emblem is WebP with alpha
  ok  sharp active vibe has an emblem URL
  ok  sharp active vibe has emblem alt text
  ok  sharp production emblem is WebP with alpha
  ok  tender future vibe does not require an emblem
  ok  bold future vibe does not require an emblem
  ok  cheeky future vibe does not require an emblem

[active resolver]
  ok  bright is active
  ok  wistful is active
  ok  sharp is active
  ok  tender is not active
  ok  unknown is not active
  ok  resolver keeps active value
  ok  resolver falls back for invalid value
  ok  resolver falls back for future value
  ok  resolver falls back for missing value

[local storage]
  ok  storage key is path-scoped
  ok  missing selected vibe defaults to bright
  ok  selected active vibe persists locally
  ok  invalid stored vibe falls back to bright
  ok  future vibe cannot be selected in active UI helper
  ok  clearing selected vibe returns to default

98 passed, 0 failed

```

### npx tsx scripts/test-guided-today-path-overview.ts
```text

[path overview status]
  ok  A1 Practical 1 overview exposes 10 lessons
  ok  A1 Practical 2 overview exposes 10 lessons
  ok  A1 Practical 3 overview exposes 10 lessons
  ok  empty progress recommends lesson 1
  ok  empty progress is not path complete
  ok  lesson 1 is current with empty progress
  ok  lesson 2 is not started with empty progress
  ok  first incomplete advances to lesson 2 after lesson 1 completion
  ok  lesson 1 card is complete after completion
  ok  lesson 1 card exposes completed Bright vibe badge data after Bright completion
  ok  lesson 2 card is current after lesson 1 completion
  ok  lesson 3 card is not started after lesson 1 completion
  ok  clicked lesson selection updates the selected lesson panel
  ok  clicked lesson selection does not change first-incomplete recommendation
  ok  all-complete state is detectable
  ok  all-complete state has no recommended lesson
  ok  all cards are complete when path is complete

[pure selection and restart behavior]
  ok  lesson selection does not mutate progress
  ok  restart clears selected lesson progress
  ok  restart does not clear other completed lessons
  ok  completing another vibe keeps one overall completed lesson
  ok  path card exposes multiple completed active vibe badges
  ok  A1 Practical 1 count stays scoped after A1 Practical 2 completion
  ok  A1 Practical 2 count stays scoped after A1 Practical 1 completion
  ok  A1 Practical 3 count stays scoped after earlier path completions
  ok  earlier path counts stay scoped after A1 Practical 3 completion

[vibe behavior]
  ok  active vibe switch persists selected voice
  ok  path-specific vibe selection does not bleed into A1 Practical 2
  ok  A1 Practical 2 can persist its own selected voice
  ok  A1 Practical 1 keeps its selected voice
  ok  A1 Practical 3 can persist its own selected voice
  ok  A1 Practical 2 keeps its selected voice after A1 Practical 3 selection
  ok  vibe switch does not mutate progress
  ok  tender remains non-selectable
  ok  bold remains non-selectable
  ok  cheeky remains non-selectable
  ok  only active launch vibes are selectable
  ok  vibe storage key remains path-scoped

[privacy]
  ok  no raw typed answers are stored
  ok  no raw speech transcripts are stored

[source-level UX simplification]
  ok  overview lesson cards do not render trophy word labels
  ok  overview lesson cards do not render selected-vibe phrase previews
  ok  overview lesson cards do not render situation descriptions
  ok  overview renders voice selector before recommended lesson panel
  ok  vibe picker does not render palette swatches
  ok  vibe picker does not render example phrases
  ok  vibe picker renders emblem images for active voice cards
  ok  vibe picker keeps emblem images contained without stretching
  ok  Scene step does not reveal trophy word
  ok  Complete step can reveal trophy word
  ok  session exposes explicit Back to path action outside step navigation
  ok  session header does not render selected-vibe phrase text
  ok  session source avoids target phrase spoiler in compact header
  ok  session has no generic bottom Back step control
  ok  Back to path handler only exits the session view
  ok  Back to path does not mutate progress
  ok  recommended panel label is next lesson, not internal recommendation copy
  ok  Today page separates lesson selection from session start
  ok  path overview receives a select handler and separate start handler
  ok  path selector source exposes all active paths
  ok  Today page stores selected path id and passes path options to overview
  ok  path overview renders compact path selector controls
  ok  lesson cards select lessons without opening the session
  ok  selected lesson panel keeps selected/recommended label copy screen-reader only
  ok  selected lesson panel visible copy is reduced to lesson, title, action
  ok  selected lesson panel action label uses selected-vibe completion status
  ok  lesson cards render completed vibe badge emblems

[source-level atmosphere tokens]
  ok  Today root exposes selected vibe as a data attribute
  ok  Today imports scoped atmosphere CSS
  ok  Today CSS defines --today-accent
  ok  Today CSS defines --today-accent-strong
  ok  Today CSS defines --today-accent-soft
  ok  Today CSS defines --today-glow
  ok  Today CSS defines --today-border
  ok  Today CSS defines --today-panel
  ok  Today CSS defines --today-text-soft
  ok  Today CSS defines scoped bright atmosphere
  ok  Today CSS defines scoped wistful atmosphere
  ok  Today CSS defines scoped sharp atmosphere
  ok  Today CSS aliases local tokens to existing accent consumers
  ok  Today CSS accents selected vibe cards with local tokens
  ok  Today CSS accents progress indicator inside Today only
  ok  Today CSS accents default primary buttons inside Today only
  ok  Today CSS keeps vibe emblems contained
  ok  Sharp atmosphere comes from top-right
  ok  Sharp atmosphere uses a wide top-right radial falloff
  ok  Sharp atmosphere keeps only the vertical fade and no diagonal beam

[source-level UX teardown]
  ok  Today compact header does not render time estimate
  ok  lesson cards use whole-card button semantics
  ok  lesson cards avoid tiny-only open actions
  ok  match feedback avoids verbose expected correction copy
  ok  type recall wrong feedback does not reveal the answer by default
  ok  type recall correct feedback is visual-only
  ok  type recall fallback is compact answer reveal, not choice chips
  ok  build feedback remains compact without expected correction copy
  ok  build correct feedback text is not rendered
  ok  build step auto-validates without an Antwort prüfen button
  ok  completion can open the next lesson as primary action
  ok  completion restart action is visually tertiary
  ok  trophy completion avoids long why-it-matters copy
  ok  scene placeholder uses lesson media caption as primary text
  ok  completion screen renders selected vibe emblem badge with success check overlay
  ok  build chips are not presented in exact authored order
  ok  build chip shuffle avoids exact or near-original order across sampled lessons/vibes
  ok  match pair columns are independently shuffled and avoid row-aligned obvious pairs

[content coherence audit]
node.exe :   review lesson 1/sharp: weak generic lesson item "focused"
At line:1 char:1
+ & "D:\programs\nodejs/node.exe" "C:\Users\micha\AppData\Roaming\npm/n ...
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : NotSpecified: (  review lesson... item "focused":String) [], RemoteException
    + FullyQualifiedErrorId : NativeCommandError

  review lesson 6/wistful: weak generic lesson item "almost"
  review lesson 7/sharp: weak generic lesson item "focused"
  ok  Lesson 8 variants avoid known incoherent review items and chips

106 passed, 0 failed

```

### npx tsx scripts/test-guided-today-data.ts
```text

[path inventory]
  ok  A1 Practical 1 resolves 10 lessons
  ok  A1 Practical 2 resolves 10 lessons
  ok  A1 Practical 3 resolves 10 lessons
  ok  static lessons belong only to active V0 paths
  ok  lesson ids are unique
  ok  lesson numbers 1-10 exist with no gaps
  ok  A1 Practical 1 arc titles match product sequence
  ok  A1 Practical 2 arc titles match product sequence
  ok  A1 Practical 3 arc titles match product sequence
  ok  path selector source exposes all active paths

[lesson definitions]
  ok  english-a1-practical-001-first-contact preserves existing A1 Practical 1 lesson id shape
  ok  english-a1-practical-001-first-contact has invariant path id
  ok  english-a1-practical-001-first-contact has invariant lesson number
  ok  english-a1-practical-001-first-contact has invariant title
  ok  english-a1-practical-001-first-contact has invariant situation
  ok  english-a1-practical-001-first-contact has invariant pedagogical goal
  ok  english-a1-practical-001-first-contact uses guided-today-v0 mode
  ok  english-a1-practical-001-first-contact has session steps
  ok  english-a1-practical-001-first-contact has estimated minutes
  ok  english-a1-practical-001-first-contact fallback vibe is active
  ok  english-a1-practical-001-first-contact is usable now
  ok  english-a1-practical-001-first-contact only defines active V0 variants
  ok  english-a1-practical-001-first-contact has no required tender runtime variant
  ok  english-a1-practical-001-first-contact has no required bold runtime variant
  ok  english-a1-practical-001-first-contact has no required cheeky runtime variant
  ok  english-a1-practical-001-first-contact has bright variant
  ok  english-a1-practical-001-first-contact/bright content status is draft or final
  ok  english-a1-practical-001-first-contact/bright target text exists
  ok  english-a1-practical-001-first-contact/bright base text exists
  ok  english-a1-practical-001-first-contact/bright meaning exists
  ok  english-a1-practical-001-first-contact/bright chunks are non-empty
  ok  english-a1-practical-001-first-contact/bright lesson items are non-empty
  ok  english-a1-practical-001-first-contact/bright build target exists
  ok  english-a1-practical-001-first-contact/bright build chips support target phrase
  ok  english-a1-practical-001-first-contact/bright type recall answer exists
  ok  english-a1-practical-001-first-contact/bright acceptedAnswers includes answer
  ok  english-a1-practical-001-first-contact/bright type recall has fallback choices
  ok  english-a1-practical-001-first-contact/bright speak target has cue
  ok  english-a1-practical-001-first-contact/bright speak target phrase is compatible with core phrase
  ok  english-a1-practical-001-first-contact/bright speak language is supported
  ok  english-a1-practical-001-first-contact/bright speak threshold is usable
  ok  english-a1-practical-001-first-contact/bright scene caption exists
  ok  english-a1-practical-001-first-contact/bright trophy word is complete
  ok  english-a1-practical-001-first-contact/bright placeholder media exists
  ok  english-a1-practical-001-first-contact/bright song seed exists
  ok  english-a1-practical-001-first-contact/bright visual notes exist
  ok  english-a1-practical-001-first-contact has wistful variant
  ok  english-a1-practical-001-first-contact/wistful content status is draft or final
  ok  english-a1-practical-001-first-contact/wistful target text exists
  ok  english-a1-practical-001-first-contact/wistful base text exists
  ok  english-a1-practical-001-first-contact/wistful meaning exists
  ok  english-a1-practical-001-first-contact/wistful chunks are non-empty
  ok  english-a1-practical-001-first-contact/wistful lesson items are non-empty
  ok  english-a1-practical-001-first-contact/wistful build target exists
  ok  english-a1-practical-001-first-contact/wistful build chips support target phrase
  ok  english-a1-practical-001-first-contact/wistful type recall answer exists
  ok  english-a1-practical-001-first-contact/wistful acceptedAnswers includes answer
  ok  english-a1-practical-001-first-contact/wistful type recall has fallback choices
  ok  english-a1-practical-001-first-contact/wistful speak target has cue
  ok  english-a1-practical-001-first-contact/wistful speak target phrase is compatible with core phrase
  ok  english-a1-practical-001-first-contact/wistful speak language is supported
  ok  english-a1-practical-001-first-contact/wistful speak threshold is usable
  ok  english-a1-practical-001-first-contact/wistful scene caption exists
  ok  english-a1-practical-001-first-contact/wistful trophy word is complete
  ok  english-a1-practical-001-first-contact/wistful placeholder media exists
  ok  english-a1-practical-001-first-contact/wistful song seed exists
  ok  english-a1-practical-001-first-contact/wistful visual notes exist
  ok  english-a1-practical-001-first-contact has sharp variant
  ok  english-a1-practical-001-first-contact/sharp content status is draft or final
  ok  english-a1-practical-001-first-contact/sharp target text exists
  ok  english-a1-practical-001-first-contact/sharp base text exists
  ok  english-a1-practical-001-first-contact/sharp meaning exists
  ok  english-a1-practical-001-first-contact/sharp chunks are non-empty
  ok  english-a1-practical-001-first-contact/sharp lesson items are non-empty
  ok  english-a1-practical-001-first-contact/sharp build target exists
  ok  english-a1-practical-001-first-contact/sharp build chips support target phrase
  ok  english-a1-practical-001-first-contact/sharp type recall answer exists
  ok  english-a1-practical-001-first-contact/sharp acceptedAnswers includes answer
  ok  english-a1-practical-001-first-contact/sharp type recall has fallback choices
  ok  english-a1-practical-001-first-contact/sharp speak target has cue
  ok  english-a1-practical-001-first-contact/sharp speak target phrase is compatible with core phrase
  ok  english-a1-practical-001-first-contact/sharp speak language is supported
  ok  english-a1-practical-001-first-contact/sharp speak threshold is usable
  ok  english-a1-practical-001-first-contact/sharp scene caption exists
  ok  english-a1-practical-001-first-contact/sharp trophy word is complete
  ok  english-a1-practical-001-first-contact/sharp placeholder media exists
  ok  english-a1-practical-001-first-contact/sharp song seed exists
  ok  english-a1-practical-001-first-contact/sharp visual notes exist
  ok  english-a1-practical-002-polite-follow-up preserves existing A1 Practical 1 lesson id shape
  ok  english-a1-practical-002-polite-follow-up has invariant path id
  ok  english-a1-practical-002-polite-follow-up has invariant lesson number
  ok  english-a1-practical-002-polite-follow-up has invariant title
  ok  english-a1-practical-002-polite-follow-up has invariant situation
  ok  english-a1-practical-002-polite-follow-up has invariant pedagogical goal
  ok  english-a1-practical-002-polite-follow-up uses guided-today-v0 mode
  ok  english-a1-practical-002-polite-follow-up has session steps
  ok  english-a1-practical-002-polite-follow-up has estimated minutes
  ok  english-a1-practical-002-polite-follow-up fallback vibe is active
  ok  english-a1-practical-002-polite-follow-up is usable now
  ok  english-a1-practical-002-polite-follow-up only defines active V0 variants
  ok  english-a1-practical-002-polite-follow-up has no required tender runtime variant
  ok  english-a1-practical-002-polite-follow-up has no required bold runtime variant
  ok  english-a1-practical-002-polite-follow-up has no required cheeky runtime variant
  ok  english-a1-practical-002-polite-follow-up has bright variant
  ok  english-a1-practical-002-polite-follow-up/bright content status is draft or final
  ok  english-a1-practical-002-polite-follow-up/bright target text exists
  ok  english-a1-practical-002-polite-follow-up/bright base text exists
  ok  english-a1-practical-002-polite-follow-up/bright meaning exists
  ok  english-a1-practical-002-polite-follow-up/bright chunks are non-empty
  ok  english-a1-practical-002-polite-follow-up/bright lesson items are non-empty
  ok  english-a1-practical-002-polite-follow-up/bright build target exists
  ok  english-a1-practical-002-polite-follow-up/bright build chips support target phrase
  ok  english-a1-practical-002-polite-follow-up/bright type recall answer exists
  ok  english-a1-practical-002-polite-follow-up/bright acceptedAnswers includes answer
  ok  english-a1-practical-002-polite-follow-up/bright type recall has fallback choices
  ok  english-a1-practical-002-polite-follow-up/bright speak target has cue
  ok  english-a1-practical-002-polite-follow-up/bright speak target phrase is compatible with core phrase
  ok  english-a1-practical-002-polite-follow-up/bright speak language is supported
  ok  english-a1-practical-002-polite-follow-up/bright speak threshold is usable
  ok  english-a1-practical-002-polite-follow-up/bright scene caption exists
  ok  english-a1-practical-002-polite-follow-up/bright trophy word is complete
  ok  english-a1-practical-002-polite-follow-up/bright placeholder media exists
  ok  english-a1-practical-002-polite-follow-up/bright song seed exists
  ok  english-a1-practical-002-polite-follow-up/bright visual notes exist
  ok  english-a1-practical-002-polite-follow-up has wistful variant
  ok  english-a1-practical-002-polite-follow-up/wistful content status is draft or final
  ok  english-a1-practical-002-polite-follow-up/wistful target text exists
  ok  english-a1-practical-002-polite-follow-up/wistful base text exists
  ok  english-a1-practical-002-polite-follow-up/wistful meaning exists
  ok  english-a1-practical-002-polite-follow-up/wistful chunks are non-empty
  ok  english-a1-practical-002-polite-follow-up/wistful lesson items are non-empty
  ok  english-a1-practical-002-polite-follow-up/wistful build target exists
  ok  english-a1-practical-002-polite-follow-up/wistful build chips support target phrase
  ok  english-a1-practical-002-polite-follow-up/wistful type recall answer exists
  ok  english-a1-practical-002-polite-follow-up/wistful acceptedAnswers includes answer
  ok  english-a1-practical-002-polite-follow-up/wistful type recall has fallback choices
  ok  english-a1-practical-002-polite-follow-up/wistful speak target has cue
  ok  english-a1-practical-002-polite-follow-up/wistful speak target phrase is compatible with core phrase
  ok  english-a1-practical-002-polite-follow-up/wistful speak language is supported
  ok  english-a1-practical-002-polite-follow-up/wistful speak threshold is usable
  ok  english-a1-practical-002-polite-follow-up/wistful scene caption exists
  ok  english-a1-practical-002-polite-follow-up/wistful trophy word is complete
  ok  english-a1-practical-002-polite-follow-up/wistful placeholder media exists
  ok  english-a1-practical-002-polite-follow-up/wistful song seed exists
  ok  english-a1-practical-002-polite-follow-up/wistful visual notes exist
  ok  english-a1-practical-002-polite-follow-up has sharp variant
  ok  english-a1-practical-002-polite-follow-up/sharp content status is draft or final
  ok  english-a1-practical-002-polite-follow-up/sharp target text exists
  ok  english-a1-practical-002-polite-follow-up/sharp base text exists
  ok  english-a1-practical-002-polite-follow-up/sharp meaning exists
  ok  english-a1-practical-002-polite-follow-up/sharp chunks are non-empty
  ok  english-a1-practical-002-polite-follow-up/sharp lesson items are non-empty
  ok  english-a1-practical-002-polite-follow-up/sharp build target exists
  ok  english-a1-practical-002-polite-follow-up/sharp build chips support target phrase
  ok  english-a1-practical-002-polite-follow-up/sharp type recall answer exists
  ok  english-a1-practical-002-polite-follow-up/sharp acceptedAnswers includes answer
  ok  english-a1-practical-002-polite-follow-up/sharp type recall has fallback choices
  ok  english-a1-practical-002-polite-follow-up/sharp speak target has cue
  ok  english-a1-practical-002-polite-follow-up/sharp speak target phrase is compatible with core phrase
  ok  english-a1-practical-002-polite-follow-up/sharp speak language is supported
  ok  english-a1-practical-002-polite-follow-up/sharp speak threshold is usable
  ok  english-a1-practical-002-polite-follow-up/sharp scene caption exists
  ok  english-a1-practical-002-polite-follow-up/sharp trophy word is complete
  ok  english-a1-practical-002-polite-follow-up/sharp placeholder media exists
  ok  english-a1-practical-002-polite-follow-up/sharp song seed exists
  ok  english-a1-practical-002-polite-follow-up/sharp visual notes exist
  ok  english-a1-practical-003-where-is preserves existing A1 Practical 1 lesson id shape
  ok  english-a1-practical-003-where-is has invariant path id
  ok  english-a1-practical-003-where-is has invariant lesson number
  ok  english-a1-practical-003-where-is has invariant title
  ok  english-a1-practical-003-where-is has invariant situation
  ok  english-a1-practical-003-where-is has invariant pedagogical goal
  ok  english-a1-practical-003-where-is uses guided-today-v0 mode
  ok  english-a1-practical-003-where-is has session steps
  ok  english-a1-practical-003-where-is has estimated minutes
  ok  english-a1-practical-003-where-is fallback vibe is active
  ok  english-a1-practical-003-where-is is usable now
  ok  english-a1-practical-003-where-is only defines active V0 variants
  ok  english-a1-practical-003-where-is has no required tender runtime variant
  ok  english-a1-practical-003-where-is has no required bold runtime variant
  ok  english-a1-practical-003-where-is has no required cheeky runtime variant
  ok  english-a1-practical-003-where-is has bright variant
  ok  english-a1-practical-003-where-is/bright content status is draft or final
  ok  english-a1-practical-003-where-is/bright target text exists
  ok  english-a1-practical-003-where-is/bright base text exists
  ok  english-a1-practical-003-where-is/bright meaning exists
  ok  english-a1-practical-003-where-is/bright chunks are non-empty
  ok  english-a1-practical-003-where-is/bright lesson items are non-empty
  ok  english-a1-practical-003-where-is/bright build target exists
  ok  english-a1-practical-003-where-is/bright build chips support target phrase
  ok  english-a1-practical-003-where-is/bright type recall answer exists
  ok  english-a1-practical-003-where-is/bright acceptedAnswers includes answer
  ok  english-a1-practical-003-where-is/bright type recall has fallback choices
  ok  english-a1-practical-003-where-is/bright speak target has cue
  ok  english-a1-practical-003-where-is/bright speak target phrase is compatible with core phrase
  ok  english-a1-practical-003-where-is/bright speak language is supported
  ok  english-a1-practical-003-where-is/bright speak threshold is usable
  ok  english-a1-practical-003-where-is/bright scene caption exists
  ok  english-a1-practical-003-where-is/bright trophy word is complete
  ok  english-a1-practical-003-where-is/bright placeholder media exists
  ok  english-a1-practical-003-where-is/bright song seed exists
  ok  english-a1-practical-003-where-is/bright visual notes exist
  ok  english-a1-practical-003-where-is has wistful variant
  ok  english-a1-practical-003-where-is/wistful content status is draft or final
  ok  english-a1-practical-003-where-is/wistful target text exists
  ok  english-a1-practical-003-where-is/wistful base text exists
  ok  english-a1-practical-003-where-is/wistful meaning exists
  ok  english-a1-practical-003-where-is/wistful chunks are non-empty
  ok  english-a1-practical-003-where-is/wistful lesson items are non-empty
  ok  english-a1-practical-003-where-is/wistful build target exists
  ok  english-a1-practical-003-where-is/wistful build chips support target phrase
  ok  english-a1-practical-003-where-is/wistful type recall answer exists
  ok  english-a1-practical-003-where-is/wistful acceptedAnswers includes answer
  ok  english-a1-practical-003-where-is/wistful type recall has fallback choices
  ok  english-a1-practical-003-where-is/wistful speak target has cue
  ok  english-a1-practical-003-where-is/wistful speak target phrase is compatible with core phrase
  ok  english-a1-practical-003-where-is/wistful speak language is supported
  ok  english-a1-practical-003-where-is/wistful speak threshold is usable
  ok  english-a1-practical-003-where-is/wistful scene caption exists
  ok  english-a1-practical-003-where-is/wistful trophy word is complete
  ok  english-a1-practical-003-where-is/wistful placeholder media exists
  ok  english-a1-practical-003-where-is/wistful song seed exists
  ok  english-a1-practical-003-where-is/wistful visual notes exist
  ok  english-a1-practical-003-where-is has sharp variant
  ok  english-a1-practical-003-where-is/sharp content status is draft or final
  ok  english-a1-practical-003-where-is/sharp target text exists
  ok  english-a1-practical-003-where-is/sharp base text exists
  ok  english-a1-practical-003-where-is/sharp meaning exists
  ok  english-a1-practical-003-where-is/sharp chunks are non-empty
  ok  english-a1-practical-003-where-is/sharp lesson items are non-empty
  ok  english-a1-practical-003-where-is/sharp build target exists
  ok  english-a1-practical-003-where-is/sharp build chips support target phrase
  ok  english-a1-practical-003-where-is/sharp type recall answer exists
  ok  english-a1-practical-003-where-is/sharp acceptedAnswers includes answer
  ok  english-a1-practical-003-where-is/sharp type recall has fallback choices
  ok  english-a1-practical-003-where-is/sharp speak target has cue
  ok  english-a1-practical-003-where-is/sharp speak target phrase is compatible with core phrase
  ok  english-a1-practical-003-where-is/sharp speak language is supported
  ok  english-a1-practical-003-where-is/sharp speak threshold is usable
  ok  english-a1-practical-003-where-is/sharp scene caption exists
  ok  english-a1-practical-003-where-is/sharp trophy word is complete
  ok  english-a1-practical-003-where-is/sharp placeholder media exists
  ok  english-a1-practical-003-where-is/sharp song seed exists
  ok  english-a1-practical-003-where-is/sharp visual notes exist
  ok  english-a1-practical-004-id-like preserves existing A1 Practical 1 lesson id shape
  ok  english-a1-practical-004-id-like has invariant path id
  ok  english-a1-practical-004-id-like has invariant lesson number
  ok  english-a1-practical-004-id-like has invariant title
  ok  english-a1-practical-004-id-like has invariant situation
  ok  english-a1-practical-004-id-like has invariant pedagogical goal
  ok  english-a1-practical-004-id-like uses guided-today-v0 mode
  ok  english-a1-practical-004-id-like has session steps
  ok  english-a1-practical-004-id-like has estimated minutes
  ok  english-a1-practical-004-id-like fallback vibe is active
  ok  english-a1-practical-004-id-like is usable now
  ok  english-a1-practical-004-id-like only defines active V0 variants
  ok  english-a1-practical-004-id-like has no required tender runtime variant
  ok  english-a1-practical-004-id-like has no required bold runtime variant
  ok  english-a1-practical-004-id-like has no required cheeky runtime variant
  ok  english-a1-practical-004-id-like has bright variant
  ok  english-a1-practical-004-id-like/bright content status is draft or final
  ok  english-a1-practical-004-id-like/bright target text exists
  ok  english-a1-practical-004-id-like/bright base text exists
  ok  english-a1-practical-004-id-like/bright meaning exists
  ok  english-a1-practical-004-id-like/bright chunks are non-empty
  ok  english-a1-practical-004-id-like/bright lesson items are non-empty
  ok  english-a1-practical-004-id-like/bright build target exists
  ok  english-a1-practical-004-id-like/bright build chips support target phrase
  ok  english-a1-practical-004-id-like/bright type recall answer exists
  ok  english-a1-practical-004-id-like/bright acceptedAnswers includes answer
  ok  english-a1-practical-004-id-like/bright type recall has fallback choices
  ok  english-a1-practical-004-id-like/bright speak target has cue
  ok  english-a1-practical-004-id-like/bright speak target phrase is compatible with core phrase
  ok  english-a1-practical-004-id-like/bright speak language is supported
  ok  english-a1-practical-004-id-like/bright speak threshold is usable
  ok  english-a1-practical-004-id-like/bright scene caption exists
  ok  english-a1-practical-004-id-like/bright trophy word is complete
  ok  english-a1-practical-004-id-like/bright placeholder media exists
  ok  english-a1-practical-004-id-like/bright song seed exists
  ok  english-a1-practical-004-id-like/bright visual notes exist
  ok  english-a1-practical-004-id-like has wistful variant
  ok  english-a1-practical-004-id-like/wistful content status is draft or final
  ok  english-a1-practical-004-id-like/wistful target text exists
  ok  english-a1-practical-004-id-like/wistful base text exists
  ok  english-a1-practical-004-id-like/wistful meaning exists
  ok  english-a1-practical-004-id-like/wistful chunks are non-empty
  ok  english-a1-practical-004-id-like/wistful lesson items are non-empty
  ok  english-a1-practical-004-id-like/wistful build target exists
  ok  english-a1-practical-004-id-like/wistful build chips support target phrase
  ok  english-a1-practical-004-id-like/wistful type recall answer exists
  ok  english-a1-practical-004-id-like/wistful acceptedAnswers includes answer
  ok  english-a1-practical-004-id-like/wistful type recall has fallback choices
  ok  english-a1-practical-004-id-like/wistful speak target has cue
  ok  english-a1-practical-004-id-like/wistful speak target phrase is compatible with core phrase
  ok  english-a1-practical-004-id-like/wistful speak language is supported
  ok  english-a1-practical-004-id-like/wistful speak threshold is usable
  ok  english-a1-practical-004-id-like/wistful scene caption exists
  ok  english-a1-practical-004-id-like/wistful trophy word is complete
  ok  english-a1-practical-004-id-like/wistful placeholder media exists
  ok  english-a1-practical-004-id-like/wistful song seed exists
  ok  english-a1-practical-004-id-like/wistful visual notes exist
  ok  english-a1-practical-004-id-like has sharp variant
  ok  english-a1-practical-004-id-like/sharp content status is draft or final
  ok  english-a1-practical-004-id-like/sharp target text exists
  ok  english-a1-practical-004-id-like/sharp base text exists
  ok  english-a1-practical-004-id-like/sharp meaning exists
  ok  english-a1-practical-004-id-like/sharp chunks are non-empty
  ok  english-a1-practical-004-id-like/sharp lesson items are non-empty
  ok  english-a1-practical-004-id-like/sharp build target exists
  ok  english-a1-practical-004-id-like/sharp build chips support target phrase
  ok  english-a1-practical-004-id-like/sharp type recall answer exists
  ok  english-a1-practical-004-id-like/sharp acceptedAnswers includes answer
  ok  english-a1-practical-004-id-like/sharp type recall has fallback choices
  ok  english-a1-practical-004-id-like/sharp speak target has cue
  ok  english-a1-practical-004-id-like/sharp speak target phrase is compatible with core phrase
  ok  english-a1-practical-004-id-like/sharp speak language is supported
  ok  english-a1-practical-004-id-like/sharp speak threshold is usable
  ok  english-a1-practical-004-id-like/sharp scene caption exists
  ok  english-a1-practical-004-id-like/sharp trophy word is complete
  ok  english-a1-practical-004-id-like/sharp placeholder media exists
  ok  english-a1-practical-004-id-like/sharp song seed exists
  ok  english-a1-practical-004-id-like/sharp visual notes exist
  ok  english-a1-practical-005-how-much preserves existing A1 Practical 1 lesson id shape
  ok  english-a1-practical-005-how-much has invariant path id
  ok  english-a1-practical-005-how-much has invariant lesson number
  ok  english-a1-practical-005-how-much has invariant title
  ok  english-a1-practical-005-how-much has invariant situation
  ok  english-a1-practical-005-how-much has invariant pedagogical goal
  ok  english-a1-practical-005-how-much uses guided-today-v0 mode
  ok  english-a1-practical-005-how-much has session steps
  ok  english-a1-practical-005-how-much has estimated minutes
  ok  english-a1-practical-005-how-much fallback vibe is active
  ok  english-a1-practical-005-how-much is usable now
  ok  english-a1-practical-005-how-much only defines active V0 variants
  ok  english-a1-practical-005-how-much has no required tender runtime variant
  ok  english-a1-practical-005-how-much has no required bold runtime variant
  ok  english-a1-practical-005-how-much has no required cheeky runtime variant
  ok  english-a1-practical-005-how-much has bright variant
  ok  english-a1-practical-005-how-much/bright content status is draft or final
  ok  english-a1-practical-005-how-much/bright target text exists
  ok  english-a1-practical-005-how-much/bright base text exists
  ok  english-a1-practical-005-how-much/bright meaning exists
  ok  english-a1-practical-005-how-much/bright chunks are non-empty
  ok  english-a1-practical-005-how-much/bright lesson items are non-empty
  ok  english-a1-practical-005-how-much/bright build target exists
  ok  english-a1-practical-005-how-much/bright build chips support target phrase
  ok  english-a1-practical-005-how-much/bright type recall answer exists
  ok  english-a1-practical-005-how-much/bright acceptedAnswers includes answer
  ok  english-a1-practical-005-how-much/bright type recall has fallback choices
  ok  english-a1-practical-005-how-much/bright speak target has cue
  ok  english-a1-practical-005-how-much/bright speak target phrase is compatible with core phrase
  ok  english-a1-practical-005-how-much/bright speak language is supported
  ok  english-a1-practical-005-how-much/bright speak threshold is usable
  ok  english-a1-practical-005-how-much/bright scene caption exists
  ok  english-a1-practical-005-how-much/bright trophy word is complete
  ok  english-a1-practical-005-how-much/bright placeholder media exists
  ok  english-a1-practical-005-how-much/bright song seed exists
  ok  english-a1-practical-005-how-much/bright visual notes exist
  ok  english-a1-practical-005-how-much has wistful variant
  ok  english-a1-practical-005-how-much/wistful content status is draft or final
  ok  english-a1-practical-005-how-much/wistful target text exists
  ok  english-a1-practical-005-how-much/wistful base text exists
  ok  english-a1-practical-005-how-much/wistful meaning exists
  ok  english-a1-practical-005-how-much/wistful chunks are non-empty
  ok  english-a1-practical-005-how-much/wistful lesson items are non-empty
  ok  english-a1-practical-005-how-much/wistful build target exists
  ok  english-a1-practical-005-how-much/wistful build chips support target phrase
  ok  english-a1-practical-005-how-much/wistful type recall answer exists
  ok  english-a1-practical-005-how-much/wistful acceptedAnswers includes answer
  ok  english-a1-practical-005-how-much/wistful type recall has fallback choices
  ok  english-a1-practical-005-how-much/wistful speak target has cue
  ok  english-a1-practical-005-how-much/wistful speak target phrase is compatible with core phrase
  ok  english-a1-practical-005-how-much/wistful speak language is supported
  ok  english-a1-practical-005-how-much/wistful speak threshold is usable
  ok  english-a1-practical-005-how-much/wistful scene caption exists
  ok  english-a1-practical-005-how-much/wistful trophy word is complete
  ok  english-a1-practical-005-how-much/wistful placeholder media exists
  ok  english-a1-practical-005-how-much/wistful song seed exists
  ok  english-a1-practical-005-how-much/wistful visual notes exist
  ok  english-a1-practical-005-how-much has sharp variant
  ok  english-a1-practical-005-how-much/sharp content status is draft or final
  ok  english-a1-practical-005-how-much/sharp target text exists
  ok  english-a1-practical-005-how-much/sharp base text exists
  ok  english-a1-practical-005-how-much/sharp meaning exists
  ok  english-a1-practical-005-how-much/sharp chunks are non-empty
  ok  english-a1-practical-005-how-much/sharp lesson items are non-empty
  ok  english-a1-practical-005-how-much/sharp build target exists
  ok  english-a1-practical-005-how-much/sharp build chips support target phrase
  ok  english-a1-practical-005-how-much/sharp type recall answer exists
  ok  english-a1-practical-005-how-much/sharp acceptedAnswers includes answer
  ok  english-a1-practical-005-how-much/sharp type recall has fallback choices
  ok  english-a1-practical-005-how-much/sharp speak target has cue
  ok  english-a1-practical-005-how-much/sharp speak target phrase is compatible with core phrase
  ok  english-a1-practical-005-how-much/sharp speak language is supported
  ok  english-a1-practical-005-how-much/sharp speak threshold is usable
  ok  english-a1-practical-005-how-much/sharp scene caption exists
  ok  english-a1-practical-005-how-much/sharp trophy word is complete
  ok  english-a1-practical-005-how-much/sharp placeholder media exists
  ok  english-a1-practical-005-how-much/sharp song seed exists
  ok  english-a1-practical-005-how-much/sharp visual notes exist
  ok  english-a1-practical-006-the-train preserves existing A1 Practical 1 lesson id shape
  ok  english-a1-practical-006-the-train has invariant path id
  ok  english-a1-practical-006-the-train has invariant lesson number
  ok  english-a1-practical-006-the-train has invariant title
  ok  english-a1-practical-006-the-train has invariant situation
  ok  english-a1-practical-006-the-train has invariant pedagogical goal
  ok  english-a1-practical-006-the-train uses guided-today-v0 mode
  ok  english-a1-practical-006-the-train has session steps
  ok  english-a1-practical-006-the-train has estimated minutes
  ok  english-a1-practical-006-the-train fallback vibe is active
  ok  english-a1-practical-006-the-train is usable now
  ok  english-a1-practical-006-the-train only defines active V0 variants
  ok  english-a1-practical-006-the-train has no required tender runtime variant
  ok  english-a1-practical-006-the-train has no required bold runtime variant
  ok  english-a1-practical-006-the-train has no required cheeky runtime variant
  ok  english-a1-practical-006-the-train has bright variant
  ok  english-a1-practical-006-the-train/bright content status is draft or final
  ok  english-a1-practical-006-the-train/bright target text exists
  ok  english-a1-practical-006-the-train/bright base text exists
  ok  english-a1-practical-006-the-train/bright meaning exists
  ok  english-a1-practical-006-the-train/bright chunks are non-empty
  ok  english-a1-practical-006-the-train/bright lesson items are non-empty
  ok  english-a1-practical-006-the-train/bright build target exists
  ok  english-a1-practical-006-the-train/bright build chips support target phrase
  ok  english-a1-practical-006-the-train/bright type recall answer exists
  ok  english-a1-practical-006-the-train/bright acceptedAnswers includes answer
  ok  english-a1-practical-006-the-train/bright type recall has fallback choices
  ok  english-a1-practical-006-the-train/bright speak target has cue
  ok  english-a1-practical-006-the-train/bright speak target phrase is compatible with core phrase
  ok  english-a1-practical-006-the-train/bright speak language is supported
  ok  english-a1-practical-006-the-train/bright speak threshold is usable
  ok  english-a1-practical-006-the-train/bright scene caption exists
  ok  english-a1-practical-006-the-train/bright trophy word is complete
  ok  english-a1-practical-006-the-train/bright placeholder media exists
  ok  english-a1-practical-006-the-train/bright song seed exists
  ok  english-a1-practical-006-the-train/bright visual notes exist
  ok  english-a1-practical-006-the-train has wistful variant
  ok  english-a1-practical-006-the-train/wistful content status is draft or final
  ok  english-a1-practical-006-the-train/wistful target text exists
  ok  english-a1-practical-006-the-train/wistful base text exists
  ok  english-a1-practical-006-the-train/wistful meaning exists
  ok  english-a1-practical-006-the-train/wistful chunks are non-empty
  ok  english-a1-practical-006-the-train/wistful lesson items are non-empty
  ok  english-a1-practical-006-the-train/wistful build target exists
  ok  english-a1-practical-006-the-train/wistful build chips support target phrase
  ok  english-a1-practical-006-the-train/wistful type recall answer exists
  ok  english-a1-practical-006-the-train/wistful acceptedAnswers includes answer
  ok  english-a1-practical-006-the-train/wistful type recall has fallback choices
  ok  english-a1-practical-006-the-train/wistful speak target has cue
  ok  english-a1-practical-006-the-train/wistful speak target phrase is compatible with core phrase
  ok  english-a1-practical-006-the-train/wistful speak language is supported
  ok  english-a1-practical-006-the-train/wistful speak threshold is usable
  ok  english-a1-practical-006-the-train/wistful scene caption exists
  ok  english-a1-practical-006-the-train/wistful trophy word is complete
  ok  english-a1-practical-006-the-train/wistful placeholder media exists
  ok  english-a1-practical-006-the-train/wistful song seed exists
  ok  english-a1-practical-006-the-train/wistful visual notes exist
  ok  english-a1-practical-006-the-train has sharp variant
  ok  english-a1-practical-006-the-train/sharp content status is draft or final
  ok  english-a1-practical-006-the-train/sharp target text exists
  ok  english-a1-practical-006-the-train/sharp base text exists
  ok  english-a1-practical-006-the-train/sharp meaning exists
  ok  english-a1-practical-006-the-train/sharp chunks are non-empty
  ok  english-a1-practical-006-the-train/sharp lesson items are non-empty
  ok  english-a1-practical-006-the-train/sharp build target exists
  ok  english-a1-practical-006-the-train/sharp build chips support target phrase
  ok  english-a1-practical-006-the-train/sharp type recall answer exists
  ok  english-a1-practical-006-the-train/sharp acceptedAnswers includes answer
  ok  english-a1-practical-006-the-train/sharp type recall has fallback choices
  ok  english-a1-practical-006-the-train/sharp speak target has cue
  ok  english-a1-practical-006-the-train/sharp speak target phrase is compatible with core phrase
  ok  english-a1-practical-006-the-train/sharp speak language is supported
  ok  english-a1-practical-006-the-train/sharp speak threshold is usable
  ok  english-a1-practical-006-the-train/sharp scene caption exists
  ok  english-a1-practical-006-the-train/sharp trophy word is complete
  ok  english-a1-practical-006-the-train/sharp placeholder media exists
  ok  english-a1-practical-006-the-train/sharp song seed exists
  ok  english-a1-practical-006-the-train/sharp visual notes exist
  ok  english-a1-practical-007-i-need preserves existing A1 Practical 1 lesson id shape
  ok  english-a1-practical-007-i-need has invariant path id
  ok  english-a1-practical-007-i-need has invariant lesson number
  ok  english-a1-practical-007-i-need has invariant title
  ok  english-a1-practical-007-i-need has invariant situation
  ok  english-a1-practical-007-i-need has invariant pedagogical goal
  ok  english-a1-practical-007-i-need uses guided-today-v0 mode
  ok  english-a1-practical-007-i-need has session steps
  ok  english-a1-practical-007-i-need has estimated minutes
  ok  english-a1-practical-007-i-need fallback vibe is active
  ok  english-a1-practical-007-i-need is usable now
  ok  english-a1-practical-007-i-need only defines active V0 variants
  ok  english-a1-practical-007-i-need has no required tender runtime variant
  ok  english-a1-practical-007-i-need has no required bold runtime variant
  ok  english-a1-practical-007-i-need has no required cheeky runtime variant
  ok  english-a1-practical-007-i-need has bright variant
  ok  english-a1-practical-007-i-need/bright content status is draft or final
  ok  english-a1-practical-007-i-need/bright target text exists
  ok  english-a1-practical-007-i-need/bright base text exists
  ok  english-a1-practical-007-i-need/bright meaning exists
  ok  english-a1-practical-007-i-need/bright chunks are non-empty
  ok  english-a1-practical-007-i-need/bright lesson items are non-empty
  ok  english-a1-practical-007-i-need/bright build target exists
  ok  english-a1-practical-007-i-need/bright build chips support target phrase
  ok  english-a1-practical-007-i-need/bright type recall answer exists
  ok  english-a1-practical-007-i-need/bright acceptedAnswers includes answer
  ok  english-a1-practical-007-i-need/bright type recall has fallback choices
  ok  english-a1-practical-007-i-need/bright speak target has cue
  ok  english-a1-practical-007-i-need/bright speak target phrase is compatible with core phrase
  ok  english-a1-practical-007-i-need/bright speak language is supported
  ok  english-a1-practical-007-i-need/bright speak threshold is usable
  ok  english-a1-practical-007-i-need/bright scene caption exists
  ok  english-a1-practical-007-i-need/bright trophy word is complete
  ok  english-a1-practical-007-i-need/bright placeholder media exists
  ok  english-a1-practical-007-i-need/bright song seed exists
  ok  english-a1-practical-007-i-need/bright visual notes exist
  ok  english-a1-practical-007-i-need has wistful variant
  ok  english-a1-practical-007-i-need/wistful content status is draft or final
  ok  english-a1-practical-007-i-need/wistful target text exists
  ok  english-a1-practical-007-i-need/wistful base text exists
  ok  english-a1-practical-007-i-need/wistful meaning exists
  ok  english-a1-practical-007-i-need/wistful chunks are non-empty
  ok  english-a1-practical-007-i-need/wistful lesson items are non-empty
  ok  english-a1-practical-007-i-need/wistful build target exists
  ok  english-a1-practical-007-i-need/wistful build chips support target phrase
  ok  english-a1-practical-007-i-need/wistful type recall answer exists
  ok  english-a1-practical-007-i-need/wistful acceptedAnswers includes answer
  ok  english-a1-practical-007-i-need/wistful type recall has fallback choices
  ok  english-a1-practical-007-i-need/wistful speak target has cue
  ok  english-a1-practical-007-i-need/wistful speak target phrase is compatible with core phrase
  ok  english-a1-practical-007-i-need/wistful speak language is supported
  ok  english-a1-practical-007-i-need/wistful speak threshold is usable
  ok  english-a1-practical-007-i-need/wistful scene caption exists
  ok  english-a1-practical-007-i-need/wistful trophy word is complete
  ok  english-a1-practical-007-i-need/wistful placeholder media exists
  ok  english-a1-practical-007-i-need/wistful song seed exists
  ok  english-a1-practical-007-i-need/wistful visual notes exist
  ok  english-a1-practical-007-i-need has sharp variant
  ok  english-a1-practical-007-i-need/sharp content status is draft or final
  ok  english-a1-practical-007-i-need/sharp target text exists
  ok  english-a1-practical-007-i-need/sharp base text exists
  ok  english-a1-practical-007-i-need/sharp meaning exists
  ok  english-a1-practical-007-i-need/sharp chunks are non-empty
  ok  english-a1-practical-007-i-need/sharp lesson items are non-empty
  ok  english-a1-practical-007-i-need/sharp build target exists
  ok  english-a1-practical-007-i-need/sharp build chips support target phrase
  ok  english-a1-practical-007-i-need/sharp type recall answer exists
  ok  english-a1-practical-007-i-need/sharp acceptedAnswers includes answer
  ok  english-a1-practical-007-i-need/sharp type recall has fallback choices
  ok  english-a1-practical-007-i-need/sharp speak target has cue
  ok  english-a1-practical-007-i-need/sharp speak target phrase is compatible with core phrase
  ok  english-a1-practical-007-i-need/sharp speak language is supported
  ok  english-a1-practical-007-i-need/sharp speak threshold is usable
  ok  english-a1-practical-007-i-need/sharp scene caption exists
  ok  english-a1-practical-007-i-need/sharp trophy word is complete
  ok  english-a1-practical-007-i-need/sharp placeholder media exists
  ok  english-a1-practical-007-i-need/sharp song seed exists
  ok  english-a1-practical-007-i-need/sharp visual notes exist
  ok  english-a1-practical-008-i-like preserves existing A1 Practical 1 lesson id shape
  ok  english-a1-practical-008-i-like has invariant path id
  ok  english-a1-practical-008-i-like has invariant lesson number
  ok  english-a1-practical-008-i-like has invariant title
  ok  english-a1-practical-008-i-like has invariant situation
  ok  english-a1-practical-008-i-like has invariant pedagogical goal
  ok  english-a1-practical-008-i-like uses guided-today-v0 mode
  ok  english-a1-practical-008-i-like has session steps
  ok  english-a1-practical-008-i-like has estimated minutes
  ok  english-a1-practical-008-i-like fallback vibe is active
  ok  english-a1-practical-008-i-like is usable now
  ok  english-a1-practical-008-i-like only defines active V0 variants
  ok  english-a1-practical-008-i-like has no required tender runtime variant
  ok  english-a1-practical-008-i-like has no required bold runtime variant
  ok  english-a1-practical-008-i-like has no required cheeky runtime variant
  ok  english-a1-practical-008-i-like has bright variant
  ok  english-a1-practical-008-i-like/bright content status is draft or final
  ok  english-a1-practical-008-i-like/bright target text exists
  ok  english-a1-practical-008-i-like/bright base text exists
  ok  english-a1-practical-008-i-like/bright meaning exists
  ok  english-a1-practical-008-i-like/bright chunks are non-empty
  ok  english-a1-practical-008-i-like/bright lesson items are non-empty
  ok  english-a1-practical-008-i-like/bright build target exists
  ok  english-a1-practical-008-i-like/bright build chips support target phrase
  ok  english-a1-practical-008-i-like/bright type recall answer exists
  ok  english-a1-practical-008-i-like/bright acceptedAnswers includes answer
  ok  english-a1-practical-008-i-like/bright type recall has fallback choices
  ok  english-a1-practical-008-i-like/bright speak target has cue
  ok  english-a1-practical-008-i-like/bright speak target phrase is compatible with core phrase
  ok  english-a1-practical-008-i-like/bright speak language is supported
  ok  english-a1-practical-008-i-like/bright speak threshold is usable
  ok  english-a1-practical-008-i-like/bright scene caption exists
  ok  english-a1-practical-008-i-like/bright trophy word is complete
  ok  english-a1-practical-008-i-like/bright placeholder media exists
  ok  english-a1-practical-008-i-like/bright song seed exists
  ok  english-a1-practical-008-i-like/bright visual notes exist
  ok  english-a1-practical-008-i-like has wistful variant
  ok  english-a1-practical-008-i-like/wistful content status is draft or final
  ok  english-a1-practical-008-i-like/wistful target text exists
  ok  english-a1-practical-008-i-like/wistful base text exists
  ok  english-a1-practical-008-i-like/wistful meaning exists
  ok  english-a1-practical-008-i-like/wistful chunks are non-empty
  ok  english-a1-practical-008-i-like/wistful lesson items are non-empty
  ok  english-a1-practical-008-i-like/wistful build target exists
  ok  english-a1-practical-008-i-like/wistful build chips support target phrase
  ok  english-a1-practical-008-i-like/wistful type recall answer exists
  ok  english-a1-practical-008-i-like/wistful acceptedAnswers includes answer
  ok  english-a1-practical-008-i-like/wistful type recall has fallback choices
  ok  english-a1-practical-008-i-like/wistful speak target has cue
  ok  english-a1-practical-008-i-like/wistful speak target phrase is compatible with core phrase
  ok  english-a1-practical-008-i-like/wistful speak language is supported
  ok  english-a1-practical-008-i-like/wistful speak threshold is usable
  ok  english-a1-practical-008-i-like/wistful scene caption exists
  ok  english-a1-practical-008-i-like/wistful trophy word is complete
  ok  english-a1-practical-008-i-like/wistful placeholder media exists
  ok  english-a1-practical-008-i-like/wistful song seed exists
  ok  english-a1-practical-008-i-like/wistful visual notes exist
  ok  english-a1-practical-008-i-like has sharp variant
  ok  english-a1-practical-008-i-like/sharp content status is draft or final
  ok  english-a1-practical-008-i-like/sharp target text exists
  ok  english-a1-practical-008-i-like/sharp base text exists
  ok  english-a1-practical-008-i-like/sharp meaning exists
  ok  english-a1-practical-008-i-like/sharp chunks are non-empty
  ok  english-a1-practical-008-i-like/sharp lesson items are non-empty
  ok  english-a1-practical-008-i-like/sharp build target exists
  ok  english-a1-practical-008-i-like/sharp build chips support target phrase
  ok  english-a1-practical-008-i-like/sharp type recall answer exists
  ok  english-a1-practical-008-i-like/sharp acceptedAnswers includes answer
  ok  english-a1-practical-008-i-like/sharp type recall has fallback choices
  ok  english-a1-practical-008-i-like/sharp speak target has cue
  ok  english-a1-practical-008-i-like/sharp speak target phrase is compatible with core phrase
  ok  english-a1-practical-008-i-like/sharp speak language is supported
  ok  english-a1-practical-008-i-like/sharp speak threshold is usable
  ok  english-a1-practical-008-i-like/sharp scene caption exists
  ok  english-a1-practical-008-i-like/sharp trophy word is complete
  ok  english-a1-practical-008-i-like/sharp placeholder media exists
  ok  english-a1-practical-008-i-like/sharp song seed exists
  ok  english-a1-practical-008-i-like/sharp visual notes exist
  ok  english-a1-practical-009-tomorrow-at-seven preserves existing A1 Practical 1 lesson id shape
  ok  english-a1-practical-009-tomorrow-at-seven has invariant path id
  ok  english-a1-practical-009-tomorrow-at-seven has invariant lesson number
  ok  english-a1-practical-009-tomorrow-at-seven has invariant title
  ok  english-a1-practical-009-tomorrow-at-seven has invariant situation
  ok  english-a1-practical-009-tomorrow-at-seven has invariant pedagogical goal
  ok  english-a1-practical-009-tomorrow-at-seven uses guided-today-v0 mode
  ok  english-a1-practical-009-tomorrow-at-seven has session steps
  ok  english-a1-practical-009-tomorrow-at-seven has estimated minutes
  ok  english-a1-practical-009-tomorrow-at-seven fallback vibe is active
  ok  english-a1-practical-009-tomorrow-at-seven is usable now
  ok  english-a1-practical-009-tomorrow-at-seven only defines active V0 variants
  ok  english-a1-practical-009-tomorrow-at-seven has no required tender runtime variant
  ok  english-a1-practical-009-tomorrow-at-seven has no required bold runtime variant
  ok  english-a1-practical-009-tomorrow-at-seven has no required cheeky runtime variant
  ok  english-a1-practical-009-tomorrow-at-seven has bright variant
  ok  english-a1-practical-009-tomorrow-at-seven/bright content status is draft or final
  ok  english-a1-practical-009-tomorrow-at-seven/bright target text exists
  ok  english-a1-practical-009-tomorrow-at-seven/bright base text exists
  ok  english-a1-practical-009-tomorrow-at-seven/bright meaning exists
  ok  english-a1-practical-009-tomorrow-at-seven/bright chunks are non-empty
  ok  english-a1-practical-009-tomorrow-at-seven/bright lesson items are non-empty
  ok  english-a1-practical-009-tomorrow-at-seven/bright build target exists
  ok  english-a1-practical-009-tomorrow-at-seven/bright build chips support target phrase
  ok  english-a1-practical-009-tomorrow-at-seven/bright type recall answer exists
  ok  english-a1-practical-009-tomorrow-at-seven/bright acceptedAnswers includes answer
  ok  english-a1-practical-009-tomorrow-at-seven/bright type recall has fallback choices
  ok  english-a1-practical-009-tomorrow-at-seven/bright speak target has cue
  ok  english-a1-practical-009-tomorrow-at-seven/bright speak target phrase is compatible with core phrase
  ok  english-a1-practical-009-tomorrow-at-seven/bright speak language is supported
  ok  english-a1-practical-009-tomorrow-at-seven/bright speak threshold is usable
  ok  english-a1-practical-009-tomorrow-at-seven/bright scene caption exists
  ok  english-a1-practical-009-tomorrow-at-seven/bright trophy word is complete
  ok  english-a1-practical-009-tomorrow-at-seven/bright placeholder media exists
  ok  english-a1-practical-009-tomorrow-at-seven/bright song seed exists
  ok  english-a1-practical-009-tomorrow-at-seven/bright visual notes exist
  ok  english-a1-practical-009-tomorrow-at-seven has wistful variant
  ok  english-a1-practical-009-tomorrow-at-seven/wistful content status is draft or final
  ok  english-a1-practical-009-tomorrow-at-seven/wistful target text exists
  ok  english-a1-practical-009-tomorrow-at-seven/wistful base text exists
  ok  english-a1-practical-009-tomorrow-at-seven/wistful meaning exists
  ok  english-a1-practical-009-tomorrow-at-seven/wistful chunks are non-empty
  ok  english-a1-practical-009-tomorrow-at-seven/wistful lesson items are non-empty
  ok  english-a1-practical-009-tomorrow-at-seven/wistful build target exists
  ok  english-a1-practical-009-tomorrow-at-seven/wistful build chips support target phrase
  ok  english-a1-practical-009-tomorrow-at-seven/wistful type recall answer exists
  ok  english-a1-practical-009-tomorrow-at-seven/wistful acceptedAnswers includes answer
  ok  english-a1-practical-009-tomorrow-at-seven/wistful type recall has fallback choices
  ok  english-a1-practical-009-tomorrow-at-seven/wistful speak target has cue
  ok  english-a1-practical-009-tomorrow-at-seven/wistful speak target phrase is compatible with core phrase
  ok  english-a1-practical-009-tomorrow-at-seven/wistful speak language is supported
  ok  english-a1-practical-009-tomorrow-at-seven/wistful speak threshold is usable
  ok  english-a1-practical-009-tomorrow-at-seven/wistful scene caption exists
  ok  english-a1-practical-009-tomorrow-at-seven/wistful trophy word is complete
  ok  english-a1-practical-009-tomorrow-at-seven/wistful placeholder media exists
  ok  english-a1-practical-009-tomorrow-at-seven/wistful song seed exists
  ok  english-a1-practical-009-tomorrow-at-seven/wistful visual notes exist
  ok  english-a1-practical-009-tomorrow-at-seven has sharp variant
  ok  english-a1-practical-009-tomorrow-at-seven/sharp content status is draft or final
  ok  english-a1-practical-009-tomorrow-at-seven/sharp target text exists
  ok  english-a1-practical-009-tomorrow-at-seven/sharp base text exists
  ok  english-a1-practical-009-tomorrow-at-seven/sharp meaning exists
  ok  english-a1-practical-009-tomorrow-at-seven/sharp chunks are non-empty
  ok  english-a1-practical-009-tomorrow-at-seven/sharp lesson items are non-empty
  ok  english-a1-practical-009-tomorrow-at-seven/sharp build target exists
  ok  english-a1-practical-009-tomorrow-at-seven/sharp build chips support target phrase
  ok  english-a1-practical-009-tomorrow-at-seven/sharp type recall answer exists
  ok  english-a1-practical-009-tomorrow-at-seven/sharp acceptedAnswers includes answer
  ok  english-a1-practical-009-tomorrow-at-seven/sharp type recall has fallback choices
  ok  english-a1-practical-009-tomorrow-at-seven/sharp speak target has cue
  ok  english-a1-practical-009-tomorrow-at-seven/sharp speak target phrase is compatible with core phrase
  ok  english-a1-practical-009-tomorrow-at-seven/sharp speak language is supported
  ok  english-a1-practical-009-tomorrow-at-seven/sharp speak threshold is usable
  ok  english-a1-practical-009-tomorrow-at-seven/sharp scene caption exists
  ok  english-a1-practical-009-tomorrow-at-seven/sharp trophy word is complete
  ok  english-a1-practical-009-tomorrow-at-seven/sharp placeholder media exists
  ok  english-a1-practical-009-tomorrow-at-seven/sharp song seed exists
  ok  english-a1-practical-009-tomorrow-at-seven/sharp visual notes exist
  ok  english-a1-practical-010-thank-you-goodbye preserves existing A1 Practical 1 lesson id shape
  ok  english-a1-practical-010-thank-you-goodbye has invariant path id
  ok  english-a1-practical-010-thank-you-goodbye has invariant lesson number
  ok  english-a1-practical-010-thank-you-goodbye has invariant title
  ok  english-a1-practical-010-thank-you-goodbye has invariant situation
  ok  english-a1-practical-010-thank-you-goodbye has invariant pedagogical goal
  ok  english-a1-practical-010-thank-you-goodbye uses guided-today-v0 mode
  ok  english-a1-practical-010-thank-you-goodbye has session steps
  ok  english-a1-practical-010-thank-you-goodbye has estimated minutes
  ok  english-a1-practical-010-thank-you-goodbye fallback vibe is active
  ok  english-a1-practical-010-thank-you-goodbye is usable now
  ok  english-a1-practical-010-thank-you-goodbye only defines active V0 variants
  ok  english-a1-practical-010-thank-you-goodbye has no required tender runtime variant
  ok  english-a1-practical-010-thank-you-goodbye has no required bold runtime variant
  ok  english-a1-practical-010-thank-you-goodbye has no required cheeky runtime variant
  ok  english-a1-practical-010-thank-you-goodbye has bright variant
  ok  english-a1-practical-010-thank-you-goodbye/bright content status is draft or final
  ok  english-a1-practical-010-thank-you-goodbye/bright target text exists
  ok  english-a1-practical-010-thank-you-goodbye/bright base text exists
  ok  english-a1-practical-010-thank-you-goodbye/bright meaning exists
  ok  english-a1-practical-010-thank-you-goodbye/bright chunks are non-empty
  ok  english-a1-practical-010-thank-you-goodbye/bright lesson items are non-empty
  ok  english-a1-practical-010-thank-you-goodbye/bright build target exists
  ok  english-a1-practical-010-thank-you-goodbye/bright build chips support target phrase
  ok  english-a1-practical-010-thank-you-goodbye/bright type recall answer exists
  ok  english-a1-practical-010-thank-you-goodbye/bright acceptedAnswers includes answer
  ok  english-a1-practical-010-thank-you-goodbye/bright type recall has fallback choices
  ok  english-a1-practical-010-thank-you-goodbye/bright speak target has cue
  ok  english-a1-practical-010-thank-you-goodbye/bright speak target phrase is compatible with core phrase
  ok  english-a1-practical-010-thank-you-goodbye/bright speak language is supported
  ok  english-a1-practical-010-thank-you-goodbye/bright speak threshold is usable
  ok  english-a1-practical-010-thank-you-goodbye/bright scene caption exists
  ok  english-a1-practical-010-thank-you-goodbye/bright trophy word is complete
  ok  english-a1-practical-010-thank-you-goodbye/bright placeholder media exists
  ok  english-a1-practical-010-thank-you-goodbye/bright song seed exists
  ok  english-a1-practical-010-thank-you-goodbye/bright visual notes exist
  ok  english-a1-practical-010-thank-you-goodbye has wistful variant
  ok  english-a1-practical-010-thank-you-goodbye/wistful content status is draft or final
  ok  english-a1-practical-010-thank-you-goodbye/wistful target text exists
  ok  english-a1-practical-010-thank-you-goodbye/wistful base text exists
  ok  english-a1-practical-010-thank-you-goodbye/wistful meaning exists
  ok  english-a1-practical-010-thank-you-goodbye/wistful chunks are non-empty
  ok  english-a1-practical-010-thank-you-goodbye/wistful lesson items are non-empty
  ok  english-a1-practical-010-thank-you-goodbye/wistful build target exists
  ok  english-a1-practical-010-thank-you-goodbye/wistful build chips support target phrase
  ok  english-a1-practical-010-thank-you-goodbye/wistful type recall answer exists
  ok  english-a1-practical-010-thank-you-goodbye/wistful acceptedAnswers includes answer
  ok  english-a1-practical-010-thank-you-goodbye/wistful type recall has fallback choices
  ok  english-a1-practical-010-thank-you-goodbye/wistful speak target has cue
  ok  english-a1-practical-010-thank-you-goodbye/wistful speak target phrase is compatible with core phrase
  ok  english-a1-practical-010-thank-you-goodbye/wistful speak language is supported
  ok  english-a1-practical-010-thank-you-goodbye/wistful speak threshold is usable
  ok  english-a1-practical-010-thank-you-goodbye/wistful scene caption exists
  ok  english-a1-practical-010-thank-you-goodbye/wistful trophy word is complete
  ok  english-a1-practical-010-thank-you-goodbye/wistful placeholder media exists
  ok  english-a1-practical-010-thank-you-goodbye/wistful song seed exists
  ok  english-a1-practical-010-thank-you-goodbye/wistful visual notes exist
  ok  english-a1-practical-010-thank-you-goodbye has sharp variant
  ok  english-a1-practical-010-thank-you-goodbye/sharp content status is draft or final
  ok  english-a1-practical-010-thank-you-goodbye/sharp target text exists
  ok  english-a1-practical-010-thank-you-goodbye/sharp base text exists
  ok  english-a1-practical-010-thank-you-goodbye/sharp meaning exists
  ok  english-a1-practical-010-thank-you-goodbye/sharp chunks are non-empty
  ok  english-a1-practical-010-thank-you-goodbye/sharp lesson items are non-empty
  ok  english-a1-practical-010-thank-you-goodbye/sharp build target exists
  ok  english-a1-practical-010-thank-you-goodbye/sharp build chips support target phrase
  ok  english-a1-practical-010-thank-you-goodbye/sharp type recall answer exists
  ok  english-a1-practical-010-thank-you-goodbye/sharp acceptedAnswers includes answer
  ok  english-a1-practical-010-thank-you-goodbye/sharp type recall has fallback choices
  ok  english-a1-practical-010-thank-you-goodbye/sharp speak target has cue
  ok  english-a1-practical-010-thank-you-goodbye/sharp speak target phrase is compatible with core phrase
  ok  english-a1-practical-010-thank-you-goodbye/sharp speak language is supported
  ok  english-a1-practical-010-thank-you-goodbye/sharp speak threshold is usable
  ok  english-a1-practical-010-thank-you-goodbye/sharp scene caption exists
  ok  english-a1-practical-010-thank-you-goodbye/sharp trophy word is complete
  ok  english-a1-practical-010-thank-you-goodbye/sharp placeholder media exists
  ok  english-a1-practical-010-thank-you-goodbye/sharp song seed exists
  ok  english-a1-practical-010-thank-you-goodbye/sharp visual notes exist
  ok  english-a1-practical-2-001-i-dont-understand has invariant id
  ok  english-a1-practical-2-001-i-dont-understand has invariant path id
  ok  english-a1-practical-2-001-i-dont-understand has invariant lesson number
  ok  english-a1-practical-2-001-i-dont-understand has invariant title
  ok  english-a1-practical-2-001-i-dont-understand has invariant situation
  ok  english-a1-practical-2-001-i-dont-understand has invariant pedagogical goal
  ok  english-a1-practical-2-001-i-dont-understand uses guided-today-v0 mode
  ok  english-a1-practical-2-001-i-dont-understand uses existing Foundation session steps
  ok  english-a1-practical-2-001-i-dont-understand has estimated minutes
  ok  english-a1-practical-2-001-i-dont-understand fallback vibe is active
  ok  english-a1-practical-2-001-i-dont-understand is usable now
  ok  english-a1-practical-2-001-i-dont-understand has Bright, Wistful, Sharp variants
  ok  english-a1-practical-2-001-i-dont-understand only defines active V0 variants
  ok  english-a1-practical-2-001-i-dont-understand has no required tender runtime variant
  ok  english-a1-practical-2-001-i-dont-understand has no required bold runtime variant
  ok  english-a1-practical-2-001-i-dont-understand has no required cheeky runtime variant
  ok  english-a1-practical-2-001-i-dont-understand has bright variant
  ok  english-a1-practical-2-001-i-dont-understand/bright content status is draft or final
  ok  english-a1-practical-2-001-i-dont-understand/bright target text exists
  ok  english-a1-practical-2-001-i-dont-understand/bright base text exists
  ok  english-a1-practical-2-001-i-dont-understand/bright meaning exists
  ok  english-a1-practical-2-001-i-dont-understand/bright chunks are non-empty
  ok  english-a1-practical-2-001-i-dont-understand/bright lesson items are non-empty
  ok  english-a1-practical-2-001-i-dont-understand/bright build target exists
  ok  english-a1-practical-2-001-i-dont-understand/bright build chips support target phrase
  ok  english-a1-practical-2-001-i-dont-understand/bright type recall answer exists
  ok  english-a1-practical-2-001-i-dont-understand/bright acceptedAnswers includes answer
  ok  english-a1-practical-2-001-i-dont-understand/bright type recall has fallback choices
  ok  english-a1-practical-2-001-i-dont-understand/bright speak target has cue
  ok  english-a1-practical-2-001-i-dont-understand/bright speak target phrase is compatible with core phrase
  ok  english-a1-practical-2-001-i-dont-understand/bright speak language is supported
  ok  english-a1-practical-2-001-i-dont-understand/bright speak threshold is usable
  ok  english-a1-practical-2-001-i-dont-understand/bright scene caption exists
  ok  english-a1-practical-2-001-i-dont-understand/bright trophy word is complete
  ok  english-a1-practical-2-001-i-dont-understand/bright placeholder media exists
  ok  english-a1-practical-2-001-i-dont-understand/bright song seed exists
  ok  english-a1-practical-2-001-i-dont-understand/bright visual notes exist
  ok  english-a1-practical-2-001-i-dont-understand has wistful variant
  ok  english-a1-practical-2-001-i-dont-understand/wistful content status is draft or final
  ok  english-a1-practical-2-001-i-dont-understand/wistful target text exists
  ok  english-a1-practical-2-001-i-dont-understand/wistful base text exists
  ok  english-a1-practical-2-001-i-dont-understand/wistful meaning exists
  ok  english-a1-practical-2-001-i-dont-understand/wistful chunks are non-empty
  ok  english-a1-practical-2-001-i-dont-understand/wistful lesson items are non-empty
  ok  english-a1-practical-2-001-i-dont-understand/wistful build target exists
  ok  english-a1-practical-2-001-i-dont-understand/wistful build chips support target phrase
  ok  english-a1-practical-2-001-i-dont-understand/wistful type recall answer exists
  ok  english-a1-practical-2-001-i-dont-understand/wistful acceptedAnswers includes answer
  ok  english-a1-practical-2-001-i-dont-understand/wistful type recall has fallback choices
  ok  english-a1-practical-2-001-i-dont-understand/wistful speak target has cue
  ok  english-a1-practical-2-001-i-dont-understand/wistful speak target phrase is compatible with core phrase
  ok  english-a1-practical-2-001-i-dont-understand/wistful speak language is supported
  ok  english-a1-practical-2-001-i-dont-understand/wistful speak threshold is usable
  ok  english-a1-practical-2-001-i-dont-understand/wistful scene caption exists
  ok  english-a1-practical-2-001-i-dont-understand/wistful trophy word is complete
  ok  english-a1-practical-2-001-i-dont-understand/wistful placeholder media exists
  ok  english-a1-practical-2-001-i-dont-understand/wistful song seed exists
  ok  english-a1-practical-2-001-i-dont-understand/wistful visual notes exist
  ok  english-a1-practical-2-001-i-dont-understand has sharp variant
  ok  english-a1-practical-2-001-i-dont-understand/sharp content status is draft or final
  ok  english-a1-practical-2-001-i-dont-understand/sharp target text exists
  ok  english-a1-practical-2-001-i-dont-understand/sharp base text exists
  ok  english-a1-practical-2-001-i-dont-understand/sharp meaning exists
  ok  english-a1-practical-2-001-i-dont-understand/sharp chunks are non-empty
  ok  english-a1-practical-2-001-i-dont-understand/sharp lesson items are non-empty
  ok  english-a1-practical-2-001-i-dont-understand/sharp build target exists
  ok  english-a1-practical-2-001-i-dont-understand/sharp build chips support target phrase
  ok  english-a1-practical-2-001-i-dont-understand/sharp type recall answer exists
  ok  english-a1-practical-2-001-i-dont-understand/sharp acceptedAnswers includes answer
  ok  english-a1-practical-2-001-i-dont-understand/sharp type recall has fallback choices
  ok  english-a1-practical-2-001-i-dont-understand/sharp speak target has cue
  ok  english-a1-practical-2-001-i-dont-understand/sharp speak target phrase is compatible with core phrase
  ok  english-a1-practical-2-001-i-dont-understand/sharp speak language is supported
  ok  english-a1-practical-2-001-i-dont-understand/sharp speak threshold is usable
  ok  english-a1-practical-2-001-i-dont-understand/sharp scene caption exists
  ok  english-a1-practical-2-001-i-dont-understand/sharp trophy word is complete
  ok  english-a1-practical-2-001-i-dont-understand/sharp placeholder media exists
  ok  english-a1-practical-2-001-i-dont-understand/sharp song seed exists
  ok  english-a1-practical-2-001-i-dont-understand/sharp visual notes exist
  ok  english-a1-practical-2-002-write-it-down has invariant id
  ok  english-a1-practical-2-002-write-it-down has invariant path id
  ok  english-a1-practical-2-002-write-it-down has invariant lesson number
  ok  english-a1-practical-2-002-write-it-down has invariant title
  ok  english-a1-practical-2-002-write-it-down has invariant situation
  ok  english-a1-practical-2-002-write-it-down has invariant pedagogical goal
  ok  english-a1-practical-2-002-write-it-down uses guided-today-v0 mode
  ok  english-a1-practical-2-002-write-it-down uses existing Foundation session steps
  ok  english-a1-practical-2-002-write-it-down has estimated minutes
  ok  english-a1-practical-2-002-write-it-down fallback vibe is active
  ok  english-a1-practical-2-002-write-it-down is usable now
  ok  english-a1-practical-2-002-write-it-down has Bright, Wistful, Sharp variants
  ok  english-a1-practical-2-002-write-it-down only defines active V0 variants
  ok  english-a1-practical-2-002-write-it-down has no required tender runtime variant
  ok  english-a1-practical-2-002-write-it-down has no required bold runtime variant
  ok  english-a1-practical-2-002-write-it-down has no required cheeky runtime variant
  ok  english-a1-practical-2-002-write-it-down has bright variant
  ok  english-a1-practical-2-002-write-it-down/bright content status is draft or final
  ok  english-a1-practical-2-002-write-it-down/bright target text exists
  ok  english-a1-practical-2-002-write-it-down/bright base text exists
  ok  english-a1-practical-2-002-write-it-down/bright meaning exists
  ok  english-a1-practical-2-002-write-it-down/bright chunks are non-empty
  ok  english-a1-practical-2-002-write-it-down/bright lesson items are non-empty
  ok  english-a1-practical-2-002-write-it-down/bright build target exists
  ok  english-a1-practical-2-002-write-it-down/bright build chips support target phrase
  ok  english-a1-practical-2-002-write-it-down/bright type recall answer exists
  ok  english-a1-practical-2-002-write-it-down/bright acceptedAnswers includes answer
  ok  english-a1-practical-2-002-write-it-down/bright type recall has fallback choices
  ok  english-a1-practical-2-002-write-it-down/bright speak target has cue
  ok  english-a1-practical-2-002-write-it-down/bright speak target phrase is compatible with core phrase
  ok  english-a1-practical-2-002-write-it-down/bright speak language is supported
  ok  english-a1-practical-2-002-write-it-down/bright speak threshold is usable
  ok  english-a1-practical-2-002-write-it-down/bright scene caption exists
  ok  english-a1-practical-2-002-write-it-down/bright trophy word is complete
  ok  english-a1-practical-2-002-write-it-down/bright placeholder media exists
  ok  english-a1-practical-2-002-write-it-down/bright song seed exists
  ok  english-a1-practical-2-002-write-it-down/bright visual notes exist
  ok  english-a1-practical-2-002-write-it-down has wistful variant
  ok  english-a1-practical-2-002-write-it-down/wistful content status is draft or final
  ok  english-a1-practical-2-002-write-it-down/wistful target text exists
  ok  english-a1-practical-2-002-write-it-down/wistful base text exists
  ok  english-a1-practical-2-002-write-it-down/wistful meaning exists
  ok  english-a1-practical-2-002-write-it-down/wistful chunks are non-empty
  ok  english-a1-practical-2-002-write-it-down/wistful lesson items are non-empty
  ok  english-a1-practical-2-002-write-it-down/wistful build target exists
  ok  english-a1-practical-2-002-write-it-down/wistful build chips support target phrase
  ok  english-a1-practical-2-002-write-it-down/wistful type recall answer exists
  ok  english-a1-practical-2-002-write-it-down/wistful acceptedAnswers includes answer
  ok  english-a1-practical-2-002-write-it-down/wistful type recall has fallback choices
  ok  english-a1-practical-2-002-write-it-down/wistful speak target has cue
  ok  english-a1-practical-2-002-write-it-down/wistful speak target phrase is compatible with core phrase
  ok  english-a1-practical-2-002-write-it-down/wistful speak language is supported
  ok  english-a1-practical-2-002-write-it-down/wistful speak threshold is usable
  ok  english-a1-practical-2-002-write-it-down/wistful scene caption exists
  ok  english-a1-practical-2-002-write-it-down/wistful trophy word is complete
  ok  english-a1-practical-2-002-write-it-down/wistful placeholder media exists
  ok  english-a1-practical-2-002-write-it-down/wistful song seed exists
  ok  english-a1-practical-2-002-write-it-down/wistful visual notes exist
  ok  english-a1-practical-2-002-write-it-down has sharp variant
  ok  english-a1-practical-2-002-write-it-down/sharp content status is draft or final
  ok  english-a1-practical-2-002-write-it-down/sharp target text exists
  ok  english-a1-practical-2-002-write-it-down/sharp base text exists
  ok  english-a1-practical-2-002-write-it-down/sharp meaning exists
  ok  english-a1-practical-2-002-write-it-down/sharp chunks are non-empty
  ok  english-a1-practical-2-002-write-it-down/sharp lesson items are non-empty
  ok  english-a1-practical-2-002-write-it-down/sharp build target exists
  ok  english-a1-practical-2-002-write-it-down/sharp build chips support target phrase
  ok  english-a1-practical-2-002-write-it-down/sharp type recall answer exists
  ok  english-a1-practical-2-002-write-it-down/sharp acceptedAnswers includes answer
  ok  english-a1-practical-2-002-write-it-down/sharp type recall has fallback choices
  ok  english-a1-practical-2-002-write-it-down/sharp speak target has cue
  ok  english-a1-practical-2-002-write-it-down/sharp speak target phrase is compatible with core phrase
  ok  english-a1-practical-2-002-write-it-down/sharp speak language is supported
  ok  english-a1-practical-2-002-write-it-down/sharp speak threshold is usable
  ok  english-a1-practical-2-002-write-it-down/sharp scene caption exists
  ok  english-a1-practical-2-002-write-it-down/sharp trophy word is complete
  ok  english-a1-practical-2-002-write-it-down/sharp placeholder media exists
  ok  english-a1-practical-2-002-write-it-down/sharp song seed exists
  ok  english-a1-practical-2-002-write-it-down/sharp visual notes exist
  ok  english-a1-practical-2-003-show-me has invariant id
  ok  english-a1-practical-2-003-show-me has invariant path id
  ok  english-a1-practical-2-003-show-me has invariant lesson number
  ok  english-a1-practical-2-003-show-me has invariant title
  ok  english-a1-practical-2-003-show-me has invariant situation
  ok  english-a1-practical-2-003-show-me has invariant pedagogical goal
  ok  english-a1-practical-2-003-show-me uses guided-today-v0 mode
  ok  english-a1-practical-2-003-show-me uses existing Foundation session steps
  ok  english-a1-practical-2-003-show-me has estimated minutes
  ok  english-a1-practical-2-003-show-me fallback vibe is active
  ok  english-a1-practical-2-003-show-me is usable now
  ok  english-a1-practical-2-003-show-me has Bright, Wistful, Sharp variants
  ok  english-a1-practical-2-003-show-me only defines active V0 variants
  ok  english-a1-practical-2-003-show-me has no required tender runtime variant
  ok  english-a1-practical-2-003-show-me has no required bold runtime variant
  ok  english-a1-practical-2-003-show-me has no required cheeky runtime variant
  ok  english-a1-practical-2-003-show-me has bright variant
  ok  english-a1-practical-2-003-show-me/bright content status is draft or final
  ok  english-a1-practical-2-003-show-me/bright target text exists
  ok  english-a1-practical-2-003-show-me/bright base text exists
  ok  english-a1-practical-2-003-show-me/bright meaning exists
  ok  english-a1-practical-2-003-show-me/bright chunks are non-empty
  ok  english-a1-practical-2-003-show-me/bright lesson items are non-empty
  ok  english-a1-practical-2-003-show-me/bright build target exists
  ok  english-a1-practical-2-003-show-me/bright build chips support target phrase
  ok  english-a1-practical-2-003-show-me/bright type recall answer exists
  ok  english-a1-practical-2-003-show-me/bright acceptedAnswers includes answer
  ok  english-a1-practical-2-003-show-me/bright type recall has fallback choices
  ok  english-a1-practical-2-003-show-me/bright speak target has cue
  ok  english-a1-practical-2-003-show-me/bright speak target phrase is compatible with core phrase
  ok  english-a1-practical-2-003-show-me/bright speak language is supported
  ok  english-a1-practical-2-003-show-me/bright speak threshold is usable
  ok  english-a1-practical-2-003-show-me/bright scene caption exists
  ok  english-a1-practical-2-003-show-me/bright trophy word is complete
  ok  english-a1-practical-2-003-show-me/bright placeholder media exists
  ok  english-a1-practical-2-003-show-me/bright song seed exists
  ok  english-a1-practical-2-003-show-me/bright visual notes exist
  ok  english-a1-practical-2-003-show-me has wistful variant
  ok  english-a1-practical-2-003-show-me/wistful content status is draft or final
  ok  english-a1-practical-2-003-show-me/wistful target text exists
  ok  english-a1-practical-2-003-show-me/wistful base text exists
  ok  english-a1-practical-2-003-show-me/wistful meaning exists
  ok  english-a1-practical-2-003-show-me/wistful chunks are non-empty
  ok  english-a1-practical-2-003-show-me/wistful lesson items are non-empty
  ok  english-a1-practical-2-003-show-me/wistful build target exists
  ok  english-a1-practical-2-003-show-me/wistful build chips support target phrase
  ok  english-a1-practical-2-003-show-me/wistful type recall answer exists
  ok  english-a1-practical-2-003-show-me/wistful acceptedAnswers includes answer
  ok  english-a1-practical-2-003-show-me/wistful type recall has fallback choices
  ok  english-a1-practical-2-003-show-me/wistful speak target has cue
  ok  english-a1-practical-2-003-show-me/wistful speak target phrase is compatible with core phrase
  ok  english-a1-practical-2-003-show-me/wistful speak language is supported
  ok  english-a1-practical-2-003-show-me/wistful speak threshold is usable
  ok  english-a1-practical-2-003-show-me/wistful scene caption exists
  ok  english-a1-practical-2-003-show-me/wistful trophy word is complete
  ok  english-a1-practical-2-003-show-me/wistful placeholder media exists
  ok  english-a1-practical-2-003-show-me/wistful song seed exists
  ok  english-a1-practical-2-003-show-me/wistful visual notes exist
  ok  english-a1-practical-2-003-show-me has sharp variant
  ok  english-a1-practical-2-003-show-me/sharp content status is draft or final
  ok  english-a1-practical-2-003-show-me/sharp target text exists
  ok  english-a1-practical-2-003-show-me/sharp base text exists
  ok  english-a1-practical-2-003-show-me/sharp meaning exists
  ok  english-a1-practical-2-003-show-me/sharp chunks are non-empty
  ok  english-a1-practical-2-003-show-me/sharp lesson items are non-empty
  ok  english-a1-practical-2-003-show-me/sharp build target exists
  ok  english-a1-practical-2-003-show-me/sharp build chips support target phrase
  ok  english-a1-practical-2-003-show-me/sharp type recall answer exists
  ok  english-a1-practical-2-003-show-me/sharp acceptedAnswers includes answer
  ok  english-a1-practical-2-003-show-me/sharp type recall has fallback choices
  ok  english-a1-practical-2-003-show-me/sharp speak target has cue
  ok  english-a1-practical-2-003-show-me/sharp speak target phrase is compatible with core phrase
  ok  english-a1-practical-2-003-show-me/sharp speak language is supported
  ok  english-a1-practical-2-003-show-me/sharp speak threshold is usable
  ok  english-a1-practical-2-003-show-me/sharp scene caption exists
  ok  english-a1-practical-2-003-show-me/sharp trophy word is complete
  ok  english-a1-practical-2-003-show-me/sharp placeholder media exists
  ok  english-a1-practical-2-003-show-me/sharp song seed exists
  ok  english-a1-practical-2-003-show-me/sharp visual notes exist
  ok  english-a1-practical-2-004-which-one has invariant id
  ok  english-a1-practical-2-004-which-one has invariant path id
  ok  english-a1-practical-2-004-which-one has invariant lesson number
  ok  english-a1-practical-2-004-which-one has invariant title
  ok  english-a1-practical-2-004-which-one has invariant situation
  ok  english-a1-practical-2-004-which-one has invariant pedagogical goal
  ok  english-a1-practical-2-004-which-one uses guided-today-v0 mode
  ok  english-a1-practical-2-004-which-one uses existing Foundation session steps
  ok  english-a1-practical-2-004-which-one has estimated minutes
  ok  english-a1-practical-2-004-which-one fallback vibe is active
  ok  english-a1-practical-2-004-which-one is usable now
  ok  english-a1-practical-2-004-which-one has Bright, Wistful, Sharp variants
  ok  english-a1-practical-2-004-which-one only defines active V0 variants
  ok  english-a1-practical-2-004-which-one has no required tender runtime variant
  ok  english-a1-practical-2-004-which-one has no required bold runtime variant
  ok  english-a1-practical-2-004-which-one has no required cheeky runtime variant
  ok  english-a1-practical-2-004-which-one has bright variant
  ok  english-a1-practical-2-004-which-one/bright content status is draft or final
  ok  english-a1-practical-2-004-which-one/bright target text exists
  ok  english-a1-practical-2-004-which-one/bright base text exists
  ok  english-a1-practical-2-004-which-one/bright meaning exists
  ok  english-a1-practical-2-004-which-one/bright chunks are non-empty
  ok  english-a1-practical-2-004-which-one/bright lesson items are non-empty
  ok  english-a1-practical-2-004-which-one/bright build target exists
  ok  english-a1-practical-2-004-which-one/bright build chips support target phrase
  ok  english-a1-practical-2-004-which-one/bright type recall answer exists
  ok  english-a1-practical-2-004-which-one/bright acceptedAnswers includes answer
  ok  english-a1-practical-2-004-which-one/bright type recall has fallback choices
  ok  english-a1-practical-2-004-which-one/bright speak target has cue
  ok  english-a1-practical-2-004-which-one/bright speak target phrase is compatible with core phrase
  ok  english-a1-practical-2-004-which-one/bright speak language is supported
  ok  english-a1-practical-2-004-which-one/bright speak threshold is usable
  ok  english-a1-practical-2-004-which-one/bright scene caption exists
  ok  english-a1-practical-2-004-which-one/bright trophy word is complete
  ok  english-a1-practical-2-004-which-one/bright placeholder media exists
  ok  english-a1-practical-2-004-which-one/bright song seed exists
  ok  english-a1-practical-2-004-which-one/bright visual notes exist
  ok  english-a1-practical-2-004-which-one has wistful variant
  ok  english-a1-practical-2-004-which-one/wistful content status is draft or final
  ok  english-a1-practical-2-004-which-one/wistful target text exists
  ok  english-a1-practical-2-004-which-one/wistful base text exists
  ok  english-a1-practical-2-004-which-one/wistful meaning exists
  ok  english-a1-practical-2-004-which-one/wistful chunks are non-empty
  ok  english-a1-practical-2-004-which-one/wistful lesson items are non-empty
  ok  english-a1-practical-2-004-which-one/wistful build target exists
  ok  english-a1-practical-2-004-which-one/wistful build chips support target phrase
  ok  english-a1-practical-2-004-which-one/wistful type recall answer exists
  ok  english-a1-practical-2-004-which-one/wistful acceptedAnswers includes answer
  ok  english-a1-practical-2-004-which-one/wistful type recall has fallback choices
  ok  english-a1-practical-2-004-which-one/wistful speak target has cue
  ok  english-a1-practical-2-004-which-one/wistful speak target phrase is compatible with core phrase
  ok  english-a1-practical-2-004-which-one/wistful speak language is supported
  ok  english-a1-practical-2-004-which-one/wistful speak threshold is usable
  ok  english-a1-practical-2-004-which-one/wistful scene caption exists
  ok  english-a1-practical-2-004-which-one/wistful trophy word is complete
  ok  english-a1-practical-2-004-which-one/wistful placeholder media exists
  ok  english-a1-practical-2-004-which-one/wistful song seed exists
  ok  english-a1-practical-2-004-which-one/wistful visual notes exist
  ok  english-a1-practical-2-004-which-one has sharp variant
  ok  english-a1-practical-2-004-which-one/sharp content status is draft or final
  ok  english-a1-practical-2-004-which-one/sharp target text exists
  ok  english-a1-practical-2-004-which-one/sharp base text exists
  ok  english-a1-practical-2-004-which-one/sharp meaning exists
  ok  english-a1-practical-2-004-which-one/sharp chunks are non-empty
  ok  english-a1-practical-2-004-which-one/sharp lesson items are non-empty
  ok  english-a1-practical-2-004-which-one/sharp build target exists
  ok  english-a1-practical-2-004-which-one/sharp build chips support target phrase
  ok  english-a1-practical-2-004-which-one/sharp type recall answer exists
  ok  english-a1-practical-2-004-which-one/sharp acceptedAnswers includes answer
  ok  english-a1-practical-2-004-which-one/sharp type recall has fallback choices
  ok  english-a1-practical-2-004-which-one/sharp speak target has cue
  ok  english-a1-practical-2-004-which-one/sharp speak target phrase is compatible with core phrase
  ok  english-a1-practical-2-004-which-one/sharp speak language is supported
  ok  english-a1-practical-2-004-which-one/sharp speak threshold is usable
  ok  english-a1-practical-2-004-which-one/sharp scene caption exists
  ok  english-a1-practical-2-004-which-one/sharp trophy word is complete
  ok  english-a1-practical-2-004-which-one/sharp placeholder media exists
  ok  english-a1-practical-2-004-which-one/sharp song seed exists
  ok  english-a1-practical-2-004-which-one/sharp visual notes exist
  ok  english-a1-practical-2-005-do-you-have has invariant id
  ok  english-a1-practical-2-005-do-you-have has invariant path id
  ok  english-a1-practical-2-005-do-you-have has invariant lesson number
  ok  english-a1-practical-2-005-do-you-have has invariant title
  ok  english-a1-practical-2-005-do-you-have has invariant situation
  ok  english-a1-practical-2-005-do-you-have has invariant pedagogical goal
  ok  english-a1-practical-2-005-do-you-have uses guided-today-v0 mode
  ok  english-a1-practical-2-005-do-you-have uses existing Foundation session steps
  ok  english-a1-practical-2-005-do-you-have has estimated minutes
  ok  english-a1-practical-2-005-do-you-have fallback vibe is active
  ok  english-a1-practical-2-005-do-you-have is usable now
  ok  english-a1-practical-2-005-do-you-have has Bright, Wistful, Sharp variants
  ok  english-a1-practical-2-005-do-you-have only defines active V0 variants
  ok  english-a1-practical-2-005-do-you-have has no required tender runtime variant
  ok  english-a1-practical-2-005-do-you-have has no required bold runtime variant
  ok  english-a1-practical-2-005-do-you-have has no required cheeky runtime variant
  ok  english-a1-practical-2-005-do-you-have has bright variant
  ok  english-a1-practical-2-005-do-you-have/bright content status is draft or final
  ok  english-a1-practical-2-005-do-you-have/bright target text exists
  ok  english-a1-practical-2-005-do-you-have/bright base text exists
  ok  english-a1-practical-2-005-do-you-have/bright meaning exists
  ok  english-a1-practical-2-005-do-you-have/bright chunks are non-empty
  ok  english-a1-practical-2-005-do-you-have/bright lesson items are non-empty
  ok  english-a1-practical-2-005-do-you-have/bright build target exists
  ok  english-a1-practical-2-005-do-you-have/bright build chips support target phrase
  ok  english-a1-practical-2-005-do-you-have/bright type recall answer exists
  ok  english-a1-practical-2-005-do-you-have/bright acceptedAnswers includes answer
  ok  english-a1-practical-2-005-do-you-have/bright type recall has fallback choices
  ok  english-a1-practical-2-005-do-you-have/bright speak target has cue
  ok  english-a1-practical-2-005-do-you-have/bright speak target phrase is compatible with core phrase
  ok  english-a1-practical-2-005-do-you-have/bright speak language is supported
  ok  english-a1-practical-2-005-do-you-have/bright speak threshold is usable
  ok  english-a1-practical-2-005-do-you-have/bright scene caption exists
  ok  english-a1-practical-2-005-do-you-have/bright trophy word is complete
  ok  english-a1-practical-2-005-do-you-have/bright placeholder media exists
  ok  english-a1-practical-2-005-do-you-have/bright song seed exists
  ok  english-a1-practical-2-005-do-you-have/bright visual notes exist
  ok  english-a1-practical-2-005-do-you-have has wistful variant
  ok  english-a1-practical-2-005-do-you-have/wistful content status is draft or final
  ok  english-a1-practical-2-005-do-you-have/wistful target text exists
  ok  english-a1-practical-2-005-do-you-have/wistful base text exists
  ok  english-a1-practical-2-005-do-you-have/wistful meaning exists
  ok  english-a1-practical-2-005-do-you-have/wistful chunks are non-empty
  ok  english-a1-practical-2-005-do-you-have/wistful lesson items are non-empty
  ok  english-a1-practical-2-005-do-you-have/wistful build target exists
  ok  english-a1-practical-2-005-do-you-have/wistful build chips support target phrase
  ok  english-a1-practical-2-005-do-you-have/wistful type recall answer exists
  ok  english-a1-practical-2-005-do-you-have/wistful acceptedAnswers includes answer
  ok  english-a1-practical-2-005-do-you-have/wistful type recall has fallback choices
  ok  english-a1-practical-2-005-do-you-have/wistful speak target has cue
  ok  english-a1-practical-2-005-do-you-have/wistful speak target phrase is compatible with core phrase
  ok  english-a1-practical-2-005-do-you-have/wistful speak language is supported
  ok  english-a1-practical-2-005-do-you-have/wistful speak threshold is usable
  ok  english-a1-practical-2-005-do-you-have/wistful scene caption exists
  ok  english-a1-practical-2-005-do-you-have/wistful trophy word is complete
  ok  english-a1-practical-2-005-do-you-have/wistful placeholder media exists
  ok  english-a1-practical-2-005-do-you-have/wistful song seed exists
  ok  english-a1-practical-2-005-do-you-have/wistful visual notes exist
  ok  english-a1-practical-2-005-do-you-have has sharp variant
  ok  english-a1-practical-2-005-do-you-have/sharp content status is draft or final
  ok  english-a1-practical-2-005-do-you-have/sharp target text exists
  ok  english-a1-practical-2-005-do-you-have/sharp base text exists
  ok  english-a1-practical-2-005-do-you-have/sharp meaning exists
  ok  english-a1-practical-2-005-do-you-have/sharp chunks are non-empty
  ok  english-a1-practical-2-005-do-you-have/sharp lesson items are non-empty
  ok  english-a1-practical-2-005-do-you-have/sharp build target exists
  ok  english-a1-practical-2-005-do-you-have/sharp build chips support target phrase
  ok  english-a1-practical-2-005-do-you-have/sharp type recall answer exists
  ok  english-a1-practical-2-005-do-you-have/sharp acceptedAnswers includes answer
  ok  english-a1-practical-2-005-do-you-have/sharp type recall has fallback choices
  ok  english-a1-practical-2-005-do-you-have/sharp speak target has cue
  ok  english-a1-practical-2-005-do-you-have/sharp speak target phrase is compatible with core phrase
  ok  english-a1-practical-2-005-do-you-have/sharp speak language is supported
  ok  english-a1-practical-2-005-do-you-have/sharp speak threshold is usable
  ok  english-a1-practical-2-005-do-you-have/sharp scene caption exists
  ok  english-a1-practical-2-005-do-you-have/sharp trophy word is complete
  ok  english-a1-practical-2-005-do-you-have/sharp placeholder media exists
  ok  english-a1-practical-2-005-do-you-have/sharp song seed exists
  ok  english-a1-practical-2-005-do-you-have/sharp visual notes exist
  ok  english-a1-practical-2-006-by-card has invariant id
  ok  english-a1-practical-2-006-by-card has invariant path id
  ok  english-a1-practical-2-006-by-card has invariant lesson number
  ok  english-a1-practical-2-006-by-card has invariant title
  ok  english-a1-practical-2-006-by-card has invariant situation
  ok  english-a1-practical-2-006-by-card has invariant pedagogical goal
  ok  english-a1-practical-2-006-by-card uses guided-today-v0 mode
  ok  english-a1-practical-2-006-by-card uses existing Foundation session steps
  ok  english-a1-practical-2-006-by-card has estimated minutes
  ok  english-a1-practical-2-006-by-card fallback vibe is active
  ok  english-a1-practical-2-006-by-card is usable now
  ok  english-a1-practical-2-006-by-card has Bright, Wistful, Sharp variants
  ok  english-a1-practical-2-006-by-card only defines active V0 variants
  ok  english-a1-practical-2-006-by-card has no required tender runtime variant
  ok  english-a1-practical-2-006-by-card has no required bold runtime variant
  ok  english-a1-practical-2-006-by-card has no required cheeky runtime variant
  ok  english-a1-practical-2-006-by-card has bright variant
  ok  english-a1-practical-2-006-by-card/bright content status is draft or final
  ok  english-a1-practical-2-006-by-card/bright target text exists
  ok  english-a1-practical-2-006-by-card/bright base text exists
  ok  english-a1-practical-2-006-by-card/bright meaning exists
  ok  english-a1-practical-2-006-by-card/bright chunks are non-empty
  ok  english-a1-practical-2-006-by-card/bright lesson items are non-empty
  ok  english-a1-practical-2-006-by-card/bright build target exists
  ok  english-a1-practical-2-006-by-card/bright build chips support target phrase
  ok  english-a1-practical-2-006-by-card/bright type recall answer exists
  ok  english-a1-practical-2-006-by-card/bright acceptedAnswers includes answer
  ok  english-a1-practical-2-006-by-card/bright type recall has fallback choices
  ok  english-a1-practical-2-006-by-card/bright speak target has cue
  ok  english-a1-practical-2-006-by-card/bright speak target phrase is compatible with core phrase
  ok  english-a1-practical-2-006-by-card/bright speak language is supported
  ok  english-a1-practical-2-006-by-card/bright speak threshold is usable
  ok  english-a1-practical-2-006-by-card/bright scene caption exists
  ok  english-a1-practical-2-006-by-card/bright trophy word is complete
  ok  english-a1-practical-2-006-by-card/bright placeholder media exists
  ok  english-a1-practical-2-006-by-card/bright song seed exists
  ok  english-a1-practical-2-006-by-card/bright visual notes exist
  ok  english-a1-practical-2-006-by-card has wistful variant
  ok  english-a1-practical-2-006-by-card/wistful content status is draft or final
  ok  english-a1-practical-2-006-by-card/wistful target text exists
  ok  english-a1-practical-2-006-by-card/wistful base text exists
  ok  english-a1-practical-2-006-by-card/wistful meaning exists
  ok  english-a1-practical-2-006-by-card/wistful chunks are non-empty
  ok  english-a1-practical-2-006-by-card/wistful lesson items are non-empty
  ok  english-a1-practical-2-006-by-card/wistful build target exists
  ok  english-a1-practical-2-006-by-card/wistful build chips support target phrase
  ok  english-a1-practical-2-006-by-card/wistful type recall answer exists
  ok  english-a1-practical-2-006-by-card/wistful acceptedAnswers includes answer
  ok  english-a1-practical-2-006-by-card/wistful type recall has fallback choices
  ok  english-a1-practical-2-006-by-card/wistful speak target has cue
  ok  english-a1-practical-2-006-by-card/wistful speak target phrase is compatible with core phrase
  ok  english-a1-practical-2-006-by-card/wistful speak language is supported
  ok  english-a1-practical-2-006-by-card/wistful speak threshold is usable
  ok  english-a1-practical-2-006-by-card/wistful scene caption exists
  ok  english-a1-practical-2-006-by-card/wistful trophy word is complete
  ok  english-a1-practical-2-006-by-card/wistful placeholder media exists
  ok  english-a1-practical-2-006-by-card/wistful song seed exists
  ok  english-a1-practical-2-006-by-card/wistful visual notes exist
  ok  english-a1-practical-2-006-by-card has sharp variant
  ok  english-a1-practical-2-006-by-card/sharp content status is draft or final
  ok  english-a1-practical-2-006-by-card/sharp target text exists
  ok  english-a1-practical-2-006-by-card/sharp base text exists
  ok  english-a1-practical-2-006-by-card/sharp meaning exists
  ok  english-a1-practical-2-006-by-card/sharp chunks are non-empty
  ok  english-a1-practical-2-006-by-card/sharp lesson items are non-empty
  ok  english-a1-practical-2-006-by-card/sharp build target exists
  ok  english-a1-practical-2-006-by-card/sharp build chips support target phrase
  ok  english-a1-practical-2-006-by-card/sharp type recall answer exists
  ok  english-a1-practical-2-006-by-card/sharp acceptedAnswers includes answer
  ok  english-a1-practical-2-006-by-card/sharp type recall has fallback choices
  ok  english-a1-practical-2-006-by-card/sharp speak target has cue
  ok  english-a1-practical-2-006-by-card/sharp speak target phrase is compatible with core phrase
  ok  english-a1-practical-2-006-by-card/sharp speak language is supported
  ok  english-a1-practical-2-006-by-card/sharp speak threshold is usable
  ok  english-a1-practical-2-006-by-card/sharp scene caption exists
  ok  english-a1-practical-2-006-by-card/sharp trophy word is complete
  ok  english-a1-practical-2-006-by-card/sharp placeholder media exists
  ok  english-a1-practical-2-006-by-card/sharp song seed exists
  ok  english-a1-practical-2-006-by-card/sharp visual notes exist
  ok  english-a1-practical-2-007-a-receipt-please has invariant id
  ok  english-a1-practical-2-007-a-receipt-please has invariant path id
  ok  english-a1-practical-2-007-a-receipt-please has invariant lesson number
  ok  english-a1-practical-2-007-a-receipt-please has invariant title
  ok  english-a1-practical-2-007-a-receipt-please has invariant situation
  ok  english-a1-practical-2-007-a-receipt-please has invariant pedagogical goal
  ok  english-a1-practical-2-007-a-receipt-please uses guided-today-v0 mode
  ok  english-a1-practical-2-007-a-receipt-please uses existing Foundation session steps
  ok  english-a1-practical-2-007-a-receipt-please has estimated minutes
  ok  english-a1-practical-2-007-a-receipt-please fallback vibe is active
  ok  english-a1-practical-2-007-a-receipt-please is usable now
  ok  english-a1-practical-2-007-a-receipt-please has Bright, Wistful, Sharp variants
  ok  english-a1-practical-2-007-a-receipt-please only defines active V0 variants
  ok  english-a1-practical-2-007-a-receipt-please has no required tender runtime variant
  ok  english-a1-practical-2-007-a-receipt-please has no required bold runtime variant
  ok  english-a1-practical-2-007-a-receipt-please has no required cheeky runtime variant
  ok  english-a1-practical-2-007-a-receipt-please has bright variant
  ok  english-a1-practical-2-007-a-receipt-please/bright content status is draft or final
  ok  english-a1-practical-2-007-a-receipt-please/bright target text exists
  ok  english-a1-practical-2-007-a-receipt-please/bright base text exists
  ok  english-a1-practical-2-007-a-receipt-please/bright meaning exists
  ok  english-a1-practical-2-007-a-receipt-please/bright chunks are non-empty
  ok  english-a1-practical-2-007-a-receipt-please/bright lesson items are non-empty
  ok  english-a1-practical-2-007-a-receipt-please/bright build target exists
  ok  english-a1-practical-2-007-a-receipt-please/bright build chips support target phrase
  ok  english-a1-practical-2-007-a-receipt-please/bright type recall answer exists
  ok  english-a1-practical-2-007-a-receipt-please/bright acceptedAnswers includes answer
  ok  english-a1-practical-2-007-a-receipt-please/bright type recall has fallback choices
  ok  english-a1-practical-2-007-a-receipt-please/bright speak target has cue
  ok  english-a1-practical-2-007-a-receipt-please/bright speak target phrase is compatible with core phrase
  ok  english-a1-practical-2-007-a-receipt-please/bright speak language is supported
  ok  english-a1-practical-2-007-a-receipt-please/bright speak threshold is usable
  ok  english-a1-practical-2-007-a-receipt-please/bright scene caption exists
  ok  english-a1-practical-2-007-a-receipt-please/bright trophy word is complete
  ok  english-a1-practical-2-007-a-receipt-please/bright placeholder media exists
  ok  english-a1-practical-2-007-a-receipt-please/bright song seed exists
  ok  english-a1-practical-2-007-a-receipt-please/bright visual notes exist
  ok  english-a1-practical-2-007-a-receipt-please has wistful variant
  ok  english-a1-practical-2-007-a-receipt-please/wistful content status is draft or final
  ok  english-a1-practical-2-007-a-receipt-please/wistful target text exists
  ok  english-a1-practical-2-007-a-receipt-please/wistful base text exists
  ok  english-a1-practical-2-007-a-receipt-please/wistful meaning exists
  ok  english-a1-practical-2-007-a-receipt-please/wistful chunks are non-empty
  ok  english-a1-practical-2-007-a-receipt-please/wistful lesson items are non-empty
  ok  english-a1-practical-2-007-a-receipt-please/wistful build target exists
  ok  english-a1-practical-2-007-a-receipt-please/wistful build chips support target phrase
  ok  english-a1-practical-2-007-a-receipt-please/wistful type recall answer exists
  ok  english-a1-practical-2-007-a-receipt-please/wistful acceptedAnswers includes answer
  ok  english-a1-practical-2-007-a-receipt-please/wistful type recall has fallback choices
  ok  english-a1-practical-2-007-a-receipt-please/wistful speak target has cue
  ok  english-a1-practical-2-007-a-receipt-please/wistful speak target phrase is compatible with core phrase
  ok  english-a1-practical-2-007-a-receipt-please/wistful speak language is supported
  ok  english-a1-practical-2-007-a-receipt-please/wistful speak threshold is usable
  ok  english-a1-practical-2-007-a-receipt-please/wistful scene caption exists
  ok  english-a1-practical-2-007-a-receipt-please/wistful trophy word is complete
  ok  english-a1-practical-2-007-a-receipt-please/wistful placeholder media exists
  ok  english-a1-practical-2-007-a-receipt-please/wistful song seed exists
  ok  english-a1-practical-2-007-a-receipt-please/wistful visual notes exist
  ok  english-a1-practical-2-007-a-receipt-please has sharp variant
  ok  english-a1-practical-2-007-a-receipt-please/sharp content status is draft or final
  ok  english-a1-practical-2-007-a-receipt-please/sharp target text exists
  ok  english-a1-practical-2-007-a-receipt-please/sharp base text exists
  ok  english-a1-practical-2-007-a-receipt-please/sharp meaning exists
  ok  english-a1-practical-2-007-a-receipt-please/sharp chunks are non-empty
  ok  english-a1-practical-2-007-a-receipt-please/sharp lesson items are non-empty
  ok  english-a1-practical-2-007-a-receipt-please/sharp build target exists
  ok  english-a1-practical-2-007-a-receipt-please/sharp build chips support target phrase
  ok  english-a1-practical-2-007-a-receipt-please/sharp type recall answer exists
  ok  english-a1-practical-2-007-a-receipt-please/sharp acceptedAnswers includes answer
  ok  english-a1-practical-2-007-a-receipt-please/sharp type recall has fallback choices
  ok  english-a1-practical-2-007-a-receipt-please/sharp speak target has cue
  ok  english-a1-practical-2-007-a-receipt-please/sharp speak target phrase is compatible with core phrase
  ok  english-a1-practical-2-007-a-receipt-please/sharp speak language is supported
  ok  english-a1-practical-2-007-a-receipt-please/sharp speak threshold is usable
  ok  english-a1-practical-2-007-a-receipt-please/sharp scene caption exists
  ok  english-a1-practical-2-007-a-receipt-please/sharp trophy word is complete
  ok  english-a1-practical-2-007-a-receipt-please/sharp placeholder media exists
  ok  english-a1-practical-2-007-a-receipt-please/sharp song seed exists
  ok  english-a1-practical-2-007-a-receipt-please/sharp visual notes exist
  ok  english-a1-practical-2-008-i-have-a-reservation has invariant id
  ok  english-a1-practical-2-008-i-have-a-reservation has invariant path id
  ok  english-a1-practical-2-008-i-have-a-reservation has invariant lesson number
  ok  english-a1-practical-2-008-i-have-a-reservation has invariant title
  ok  english-a1-practical-2-008-i-have-a-reservation has invariant situation
  ok  english-a1-practical-2-008-i-have-a-reservation has invariant pedagogical goal
  ok  english-a1-practical-2-008-i-have-a-reservation uses guided-today-v0 mode
  ok  english-a1-practical-2-008-i-have-a-reservation uses existing Foundation session steps
  ok  english-a1-practical-2-008-i-have-a-reservation has estimated minutes
  ok  english-a1-practical-2-008-i-have-a-reservation fallback vibe is active
  ok  english-a1-practical-2-008-i-have-a-reservation is usable now
  ok  english-a1-practical-2-008-i-have-a-reservation has Bright, Wistful, Sharp variants
  ok  english-a1-practical-2-008-i-have-a-reservation only defines active V0 variants
  ok  english-a1-practical-2-008-i-have-a-reservation has no required tender runtime variant
  ok  english-a1-practical-2-008-i-have-a-reservation has no required bold runtime variant
  ok  english-a1-practical-2-008-i-have-a-reservation has no required cheeky runtime variant
  ok  english-a1-practical-2-008-i-have-a-reservation has bright variant
  ok  english-a1-practical-2-008-i-have-a-reservation/bright content status is draft or final
  ok  english-a1-practical-2-008-i-have-a-reservation/bright target text exists
  ok  english-a1-practical-2-008-i-have-a-reservation/bright base text exists
  ok  english-a1-practical-2-008-i-have-a-reservation/bright meaning exists
  ok  english-a1-practical-2-008-i-have-a-reservation/bright chunks are non-empty
  ok  english-a1-practical-2-008-i-have-a-reservation/bright lesson items are non-empty
  ok  english-a1-practical-2-008-i-have-a-reservation/bright build target exists
  ok  english-a1-practical-2-008-i-have-a-reservation/bright build chips support target phrase
  ok  english-a1-practical-2-008-i-have-a-reservation/bright type recall answer exists
  ok  english-a1-practical-2-008-i-have-a-reservation/bright acceptedAnswers includes answer
  ok  english-a1-practical-2-008-i-have-a-reservation/bright type recall has fallback choices
  ok  english-a1-practical-2-008-i-have-a-reservation/bright speak target has cue
  ok  english-a1-practical-2-008-i-have-a-reservation/bright speak target phrase is compatible with core phrase
  ok  english-a1-practical-2-008-i-have-a-reservation/bright speak language is supported
  ok  english-a1-practical-2-008-i-have-a-reservation/bright speak threshold is usable
  ok  english-a1-practical-2-008-i-have-a-reservation/bright scene caption exists
  ok  english-a1-practical-2-008-i-have-a-reservation/bright trophy word is complete
  ok  english-a1-practical-2-008-i-have-a-reservation/bright placeholder media exists
  ok  english-a1-practical-2-008-i-have-a-reservation/bright song seed exists
  ok  english-a1-practical-2-008-i-have-a-reservation/bright visual notes exist
  ok  english-a1-practical-2-008-i-have-a-reservation has wistful variant
  ok  english-a1-practical-2-008-i-have-a-reservation/wistful content status is draft or final
  ok  english-a1-practical-2-008-i-have-a-reservation/wistful target text exists
  ok  english-a1-practical-2-008-i-have-a-reservation/wistful base text exists
  ok  english-a1-practical-2-008-i-have-a-reservation/wistful meaning exists
  ok  english-a1-practical-2-008-i-have-a-reservation/wistful chunks are non-empty
  ok  english-a1-practical-2-008-i-have-a-reservation/wistful lesson items are non-empty
  ok  english-a1-practical-2-008-i-have-a-reservation/wistful build target exists
  ok  english-a1-practical-2-008-i-have-a-reservation/wistful build chips support target phrase
  ok  english-a1-practical-2-008-i-have-a-reservation/wistful type recall answer exists
  ok  english-a1-practical-2-008-i-have-a-reservation/wistful acceptedAnswers includes answer
  ok  english-a1-practical-2-008-i-have-a-reservation/wistful type recall has fallback choices
  ok  english-a1-practical-2-008-i-have-a-reservation/wistful speak target has cue
  ok  english-a1-practical-2-008-i-have-a-reservation/wistful speak target phrase is compatible with core phrase
  ok  english-a1-practical-2-008-i-have-a-reservation/wistful speak language is supported
  ok  english-a1-practical-2-008-i-have-a-reservation/wistful speak threshold is usable
  ok  english-a1-practical-2-008-i-have-a-reservation/wistful scene caption exists
  ok  english-a1-practical-2-008-i-have-a-reservation/wistful trophy word is complete
  ok  english-a1-practical-2-008-i-have-a-reservation/wistful placeholder media exists
  ok  english-a1-practical-2-008-i-have-a-reservation/wistful song seed exists
  ok  english-a1-practical-2-008-i-have-a-reservation/wistful visual notes exist
  ok  english-a1-practical-2-008-i-have-a-reservation has sharp variant
  ok  english-a1-practical-2-008-i-have-a-reservation/sharp content status is draft or final
  ok  english-a1-practical-2-008-i-have-a-reservation/sharp target text exists
  ok  english-a1-practical-2-008-i-have-a-reservation/sharp base text exists
  ok  english-a1-practical-2-008-i-have-a-reservation/sharp meaning exists
  ok  english-a1-practical-2-008-i-have-a-reservation/sharp chunks are non-empty
  ok  english-a1-practical-2-008-i-have-a-reservation/sharp lesson items are non-empty
  ok  english-a1-practical-2-008-i-have-a-reservation/sharp build target exists
  ok  english-a1-practical-2-008-i-have-a-reservation/sharp build chips support target phrase
  ok  english-a1-practical-2-008-i-have-a-reservation/sharp type recall answer exists
  ok  english-a1-practical-2-008-i-have-a-reservation/sharp acceptedAnswers includes answer
  ok  english-a1-practical-2-008-i-have-a-reservation/sharp type recall has fallback choices
  ok  english-a1-practical-2-008-i-have-a-reservation/sharp speak target has cue
  ok  english-a1-practical-2-008-i-have-a-reservation/sharp speak target phrase is compatible with core phrase
  ok  english-a1-practical-2-008-i-have-a-reservation/sharp speak language is supported
  ok  english-a1-practical-2-008-i-have-a-reservation/sharp speak threshold is usable
  ok  english-a1-practical-2-008-i-have-a-reservation/sharp scene caption exists
  ok  english-a1-practical-2-008-i-have-a-reservation/sharp trophy word is complete
  ok  english-a1-practical-2-008-i-have-a-reservation/sharp placeholder media exists
  ok  english-a1-practical-2-008-i-have-a-reservation/sharp song seed exists
  ok  english-a1-practical-2-008-i-have-a-reservation/sharp visual notes exist
  ok  english-a1-practical-2-009-is-this-right has invariant id
  ok  english-a1-practical-2-009-is-this-right has invariant path id
  ok  english-a1-practical-2-009-is-this-right has invariant lesson number
  ok  english-a1-practical-2-009-is-this-right has invariant title
  ok  english-a1-practical-2-009-is-this-right has invariant situation
  ok  english-a1-practical-2-009-is-this-right has invariant pedagogical goal
  ok  english-a1-practical-2-009-is-this-right uses guided-today-v0 mode
  ok  english-a1-practical-2-009-is-this-right uses existing Foundation session steps
  ok  english-a1-practical-2-009-is-this-right has estimated minutes
  ok  english-a1-practical-2-009-is-this-right fallback vibe is active
  ok  english-a1-practical-2-009-is-this-right is usable now
  ok  english-a1-practical-2-009-is-this-right has Bright, Wistful, Sharp variants
  ok  english-a1-practical-2-009-is-this-right only defines active V0 variants
  ok  english-a1-practical-2-009-is-this-right has no required tender runtime variant
  ok  english-a1-practical-2-009-is-this-right has no required bold runtime variant
  ok  english-a1-practical-2-009-is-this-right has no required cheeky runtime variant
  ok  english-a1-practical-2-009-is-this-right has bright variant
  ok  english-a1-practical-2-009-is-this-right/bright content status is draft or final
  ok  english-a1-practical-2-009-is-this-right/bright target text exists
  ok  english-a1-practical-2-009-is-this-right/bright base text exists
  ok  english-a1-practical-2-009-is-this-right/bright meaning exists
  ok  english-a1-practical-2-009-is-this-right/bright chunks are non-empty
  ok  english-a1-practical-2-009-is-this-right/bright lesson items are non-empty
  ok  english-a1-practical-2-009-is-this-right/bright build target exists
  ok  english-a1-practical-2-009-is-this-right/bright build chips support target phrase
  ok  english-a1-practical-2-009-is-this-right/bright type recall answer exists
  ok  english-a1-practical-2-009-is-this-right/bright acceptedAnswers includes answer
  ok  english-a1-practical-2-009-is-this-right/bright type recall has fallback choices
  ok  english-a1-practical-2-009-is-this-right/bright speak target has cue
  ok  english-a1-practical-2-009-is-this-right/bright speak target phrase is compatible with core phrase
  ok  english-a1-practical-2-009-is-this-right/bright speak language is supported
  ok  english-a1-practical-2-009-is-this-right/bright speak threshold is usable
  ok  english-a1-practical-2-009-is-this-right/bright scene caption exists
  ok  english-a1-practical-2-009-is-this-right/bright trophy word is complete
  ok  english-a1-practical-2-009-is-this-right/bright placeholder media exists
  ok  english-a1-practical-2-009-is-this-right/bright song seed exists
  ok  english-a1-practical-2-009-is-this-right/bright visual notes exist
  ok  english-a1-practical-2-009-is-this-right has wistful variant
  ok  english-a1-practical-2-009-is-this-right/wistful content status is draft or final
  ok  english-a1-practical-2-009-is-this-right/wistful target text exists
  ok  english-a1-practical-2-009-is-this-right/wistful base text exists
  ok  english-a1-practical-2-009-is-this-right/wistful meaning exists
  ok  english-a1-practical-2-009-is-this-right/wistful chunks are non-empty
  ok  english-a1-practical-2-009-is-this-right/wistful lesson items are non-empty
  ok  english-a1-practical-2-009-is-this-right/wistful build target exists
  ok  english-a1-practical-2-009-is-this-right/wistful build chips support target phrase
  ok  english-a1-practical-2-009-is-this-right/wistful type recall answer exists
  ok  english-a1-practical-2-009-is-this-right/wistful acceptedAnswers includes answer
  ok  english-a1-practical-2-009-is-this-right/wistful type recall has fallback choices
  ok  english-a1-practical-2-009-is-this-right/wistful speak target has cue
  ok  english-a1-practical-2-009-is-this-right/wistful speak target phrase is compatible with core phrase
  ok  english-a1-practical-2-009-is-this-right/wistful speak language is supported
  ok  english-a1-practical-2-009-is-this-right/wistful speak threshold is usable
  ok  english-a1-practical-2-009-is-this-right/wistful scene caption exists
  ok  english-a1-practical-2-009-is-this-right/wistful trophy word is complete
  ok  english-a1-practical-2-009-is-this-right/wistful placeholder media exists
  ok  english-a1-practical-2-009-is-this-right/wistful song seed exists
  ok  english-a1-practical-2-009-is-this-right/wistful visual notes exist
  ok  english-a1-practical-2-009-is-this-right has sharp variant
  ok  english-a1-practical-2-009-is-this-right/sharp content status is draft or final
  ok  english-a1-practical-2-009-is-this-right/sharp target text exists
  ok  english-a1-practical-2-009-is-this-right/sharp base text exists
  ok  english-a1-practical-2-009-is-this-right/sharp meaning exists
  ok  english-a1-practical-2-009-is-this-right/sharp chunks are non-empty
  ok  english-a1-practical-2-009-is-this-right/sharp lesson items are non-empty
  ok  english-a1-practical-2-009-is-this-right/sharp build target exists
  ok  english-a1-practical-2-009-is-this-right/sharp build chips support target phrase
  ok  english-a1-practical-2-009-is-this-right/sharp type recall answer exists
  ok  english-a1-practical-2-009-is-this-right/sharp acceptedAnswers includes answer
  ok  english-a1-practical-2-009-is-this-right/sharp type recall has fallback choices
  ok  english-a1-practical-2-009-is-this-right/sharp speak target has cue
  ok  english-a1-practical-2-009-is-this-right/sharp speak target phrase is compatible with core phrase
  ok  english-a1-practical-2-009-is-this-right/sharp speak language is supported
  ok  english-a1-practical-2-009-is-this-right/sharp speak threshold is usable
  ok  english-a1-practical-2-009-is-this-right/sharp scene caption exists
  ok  english-a1-practical-2-009-is-this-right/sharp trophy word is complete
  ok  english-a1-practical-2-009-is-this-right/sharp placeholder media exists
  ok  english-a1-practical-2-009-is-this-right/sharp song seed exists
  ok  english-a1-practical-2-009-is-this-right/sharp visual notes exist
  ok  english-a1-practical-2-010-one-moment has invariant id
  ok  english-a1-practical-2-010-one-moment has invariant path id
  ok  english-a1-practical-2-010-one-moment has invariant lesson number
  ok  english-a1-practical-2-010-one-moment has invariant title
  ok  english-a1-practical-2-010-one-moment has invariant situation
  ok  english-a1-practical-2-010-one-moment has invariant pedagogical goal
  ok  english-a1-practical-2-010-one-moment uses guided-today-v0 mode
  ok  english-a1-practical-2-010-one-moment uses existing Foundation session steps
  ok  english-a1-practical-2-010-one-moment has estimated minutes
  ok  english-a1-practical-2-010-one-moment fallback vibe is active
  ok  english-a1-practical-2-010-one-moment is usable now
  ok  english-a1-practical-2-010-one-moment has Bright, Wistful, Sharp variants
  ok  english-a1-practical-2-010-one-moment only defines active V0 variants
  ok  english-a1-practical-2-010-one-moment has no required tender runtime variant
  ok  english-a1-practical-2-010-one-moment has no required bold runtime variant
  ok  english-a1-practical-2-010-one-moment has no required cheeky runtime variant
  ok  english-a1-practical-2-010-one-moment has bright variant
  ok  english-a1-practical-2-010-one-moment/bright content status is draft or final
  ok  english-a1-practical-2-010-one-moment/bright target text exists
  ok  english-a1-practical-2-010-one-moment/bright base text exists
  ok  english-a1-practical-2-010-one-moment/bright meaning exists
  ok  english-a1-practical-2-010-one-moment/bright chunks are non-empty
  ok  english-a1-practical-2-010-one-moment/bright lesson items are non-empty
  ok  english-a1-practical-2-010-one-moment/bright build target exists
  ok  english-a1-practical-2-010-one-moment/bright build chips support target phrase
  ok  english-a1-practical-2-010-one-moment/bright type recall answer exists
  ok  english-a1-practical-2-010-one-moment/bright acceptedAnswers includes answer
  ok  english-a1-practical-2-010-one-moment/bright type recall has fallback choices
  ok  english-a1-practical-2-010-one-moment/bright speak target has cue
  ok  english-a1-practical-2-010-one-moment/bright speak target phrase is compatible with core phrase
  ok  english-a1-practical-2-010-one-moment/bright speak language is supported
  ok  english-a1-practical-2-010-one-moment/bright speak threshold is usable
  ok  english-a1-practical-2-010-one-moment/bright scene caption exists
  ok  english-a1-practical-2-010-one-moment/bright trophy word is complete
  ok  english-a1-practical-2-010-one-moment/bright placeholder media exists
  ok  english-a1-practical-2-010-one-moment/bright song seed exists
  ok  english-a1-practical-2-010-one-moment/bright visual notes exist
  ok  english-a1-practical-2-010-one-moment has wistful variant
  ok  english-a1-practical-2-010-one-moment/wistful content status is draft or final
  ok  english-a1-practical-2-010-one-moment/wistful target text exists
  ok  english-a1-practical-2-010-one-moment/wistful base text exists
  ok  english-a1-practical-2-010-one-moment/wistful meaning exists
  ok  english-a1-practical-2-010-one-moment/wistful chunks are non-empty
  ok  english-a1-practical-2-010-one-moment/wistful lesson items are non-empty
  ok  english-a1-practical-2-010-one-moment/wistful build target exists
  ok  english-a1-practical-2-010-one-moment/wistful build chips support target phrase
  ok  english-a1-practical-2-010-one-moment/wistful type recall answer exists
  ok  english-a1-practical-2-010-one-moment/wistful acceptedAnswers includes answer
  ok  english-a1-practical-2-010-one-moment/wistful type recall has fallback choices
  ok  english-a1-practical-2-010-one-moment/wistful speak target has cue
  ok  english-a1-practical-2-010-one-moment/wistful speak target phrase is compatible with core phrase
  ok  english-a1-practical-2-010-one-moment/wistful speak language is supported
  ok  english-a1-practical-2-010-one-moment/wistful speak threshold is usable
  ok  english-a1-practical-2-010-one-moment/wistful scene caption exists
  ok  english-a1-practical-2-010-one-moment/wistful trophy word is complete
  ok  english-a1-practical-2-010-one-moment/wistful placeholder media exists
  ok  english-a1-practical-2-010-one-moment/wistful song seed exists
  ok  english-a1-practical-2-010-one-moment/wistful visual notes exist
  ok  english-a1-practical-2-010-one-moment has sharp variant
  ok  english-a1-practical-2-010-one-moment/sharp content status is draft or final
  ok  english-a1-practical-2-010-one-moment/sharp target text exists
  ok  english-a1-practical-2-010-one-moment/sharp base text exists
  ok  english-a1-practical-2-010-one-moment/sharp meaning exists
  ok  english-a1-practical-2-010-one-moment/sharp chunks are non-empty
  ok  english-a1-practical-2-010-one-moment/sharp lesson items are non-empty
  ok  english-a1-practical-2-010-one-moment/sharp build target exists
  ok  english-a1-practical-2-010-one-moment/sharp build chips support target phrase
  ok  english-a1-practical-2-010-one-moment/sharp type recall answer exists
  ok  english-a1-practical-2-010-one-moment/sharp acceptedAnswers includes answer
  ok  english-a1-practical-2-010-one-moment/sharp type recall has fallback choices
  ok  english-a1-practical-2-010-one-moment/sharp speak target has cue
  ok  english-a1-practical-2-010-one-moment/sharp speak target phrase is compatible with core phrase
  ok  english-a1-practical-2-010-one-moment/sharp speak language is supported
  ok  english-a1-practical-2-010-one-moment/sharp speak threshold is usable
  ok  english-a1-practical-2-010-one-moment/sharp scene caption exists
  ok  english-a1-practical-2-010-one-moment/sharp trophy word is complete
  ok  english-a1-practical-2-010-one-moment/sharp placeholder media exists
  ok  english-a1-practical-2-010-one-moment/sharp song seed exists
  ok  english-a1-practical-2-010-one-moment/sharp visual notes exist
  ok  english-a1-practical-3-001-right-or-left has invariant id
  ok  english-a1-practical-3-001-right-or-left has invariant path id
  ok  english-a1-practical-3-001-right-or-left has invariant lesson number
  ok  english-a1-practical-3-001-right-or-left has invariant title
  ok  english-a1-practical-3-001-right-or-left has invariant situation
  ok  english-a1-practical-3-001-right-or-left has invariant pedagogical goal
  ok  english-a1-practical-3-001-right-or-left uses guided-today-v0 mode
  ok  english-a1-practical-3-001-right-or-left uses existing Foundation session steps
  ok  english-a1-practical-3-001-right-or-left has estimated minutes
  ok  english-a1-practical-3-001-right-or-left fallback vibe is active
  ok  english-a1-practical-3-001-right-or-left is usable now
  ok  english-a1-practical-3-001-right-or-left has Bright, Wistful, Sharp variants
  ok  english-a1-practical-3-001-right-or-left only defines active V0 variants
  ok  english-a1-practical-3-001-right-or-left has no required tender runtime variant
  ok  english-a1-practical-3-001-right-or-left has no required bold runtime variant
  ok  english-a1-practical-3-001-right-or-left has no required cheeky runtime variant
  ok  english-a1-practical-3-001-right-or-left has bright variant
  ok  english-a1-practical-3-001-right-or-left/bright content status is draft or final
  ok  english-a1-practical-3-001-right-or-left/bright target text exists
  ok  english-a1-practical-3-001-right-or-left/bright base text exists
  ok  english-a1-practical-3-001-right-or-left/bright meaning exists
  ok  english-a1-practical-3-001-right-or-left/bright chunks are non-empty
  ok  english-a1-practical-3-001-right-or-left/bright lesson items are non-empty
  ok  english-a1-practical-3-001-right-or-left/bright build target exists
  ok  english-a1-practical-3-001-right-or-left/bright build chips support target phrase
  ok  english-a1-practical-3-001-right-or-left/bright type recall answer exists
  ok  english-a1-practical-3-001-right-or-left/bright acceptedAnswers includes answer
  ok  english-a1-practical-3-001-right-or-left/bright type recall has fallback choices
  ok  english-a1-practical-3-001-right-or-left/bright speak target has cue
  ok  english-a1-practical-3-001-right-or-left/bright speak target phrase is compatible with core phrase
  ok  english-a1-practical-3-001-right-or-left/bright speak language is supported
  ok  english-a1-practical-3-001-right-or-left/bright speak threshold is usable
  ok  english-a1-practical-3-001-right-or-left/bright scene caption exists
  ok  english-a1-practical-3-001-right-or-left/bright trophy word is complete
  ok  english-a1-practical-3-001-right-or-left/bright placeholder media exists
  ok  english-a1-practical-3-001-right-or-left/bright song seed exists
  ok  english-a1-practical-3-001-right-or-left/bright visual notes exist
  ok  english-a1-practical-3-001-right-or-left has wistful variant
  ok  english-a1-practical-3-001-right-or-left/wistful content status is draft or final
  ok  english-a1-practical-3-001-right-or-left/wistful target text exists
  ok  english-a1-practical-3-001-right-or-left/wistful base text exists
  ok  english-a1-practical-3-001-right-or-left/wistful meaning exists
  ok  english-a1-practical-3-001-right-or-left/wistful chunks are non-empty
  ok  english-a1-practical-3-001-right-or-left/wistful lesson items are non-empty
  ok  english-a1-practical-3-001-right-or-left/wistful build target exists
  ok  english-a1-practical-3-001-right-or-left/wistful build chips support target phrase
  ok  english-a1-practical-3-001-right-or-left/wistful type recall answer exists
  ok  english-a1-practical-3-001-right-or-left/wistful acceptedAnswers includes answer
  ok  english-a1-practical-3-001-right-or-left/wistful type recall has fallback choices
  ok  english-a1-practical-3-001-right-or-left/wistful speak target has cue
  ok  english-a1-practical-3-001-right-or-left/wistful speak target phrase is compatible with core phrase
  ok  english-a1-practical-3-001-right-or-left/wistful speak language is supported
  ok  english-a1-practical-3-001-right-or-left/wistful speak threshold is usable
  ok  english-a1-practical-3-001-right-or-left/wistful scene caption exists
  ok  english-a1-practical-3-001-right-or-left/wistful trophy word is complete
  ok  english-a1-practical-3-001-right-or-left/wistful placeholder media exists
  ok  english-a1-practical-3-001-right-or-left/wistful song seed exists
  ok  english-a1-practical-3-001-right-or-left/wistful visual notes exist
  ok  english-a1-practical-3-001-right-or-left has sharp variant
  ok  english-a1-practical-3-001-right-or-left/sharp content status is draft or final
  ok  english-a1-practical-3-001-right-or-left/sharp target text exists
  ok  english-a1-practical-3-001-right-or-left/sharp base text exists
  ok  english-a1-practical-3-001-right-or-left/sharp meaning exists
  ok  english-a1-practical-3-001-right-or-left/sharp chunks are non-empty
  ok  english-a1-practical-3-001-right-or-left/sharp lesson items are non-empty
  ok  english-a1-practical-3-001-right-or-left/sharp build target exists
  ok  english-a1-practical-3-001-right-or-left/sharp build chips support target phrase
  ok  english-a1-practical-3-001-right-or-left/sharp type recall answer exists
  ok  english-a1-practical-3-001-right-or-left/sharp acceptedAnswers includes answer
  ok  english-a1-practical-3-001-right-or-left/sharp type recall has fallback choices
  ok  english-a1-practical-3-001-right-or-left/sharp speak target has cue
  ok  english-a1-practical-3-001-right-or-left/sharp speak target phrase is compatible with core phrase
  ok  english-a1-practical-3-001-right-or-left/sharp speak language is supported
  ok  english-a1-practical-3-001-right-or-left/sharp speak threshold is usable
  ok  english-a1-practical-3-001-right-or-left/sharp scene caption exists
  ok  english-a1-practical-3-001-right-or-left/sharp trophy word is complete
  ok  english-a1-practical-3-001-right-or-left/sharp placeholder media exists
  ok  english-a1-practical-3-001-right-or-left/sharp song seed exists
  ok  english-a1-practical-3-001-right-or-left/sharp visual notes exist
  ok  english-a1-practical-3-002-how-far-is-it has invariant id
  ok  english-a1-practical-3-002-how-far-is-it has invariant path id
  ok  english-a1-practical-3-002-how-far-is-it has invariant lesson number
  ok  english-a1-practical-3-002-how-far-is-it has invariant title
  ok  english-a1-practical-3-002-how-far-is-it has invariant situation
  ok  english-a1-practical-3-002-how-far-is-it has invariant pedagogical goal
  ok  english-a1-practical-3-002-how-far-is-it uses guided-today-v0 mode
  ok  english-a1-practical-3-002-how-far-is-it uses existing Foundation session steps
  ok  english-a1-practical-3-002-how-far-is-it has estimated minutes
  ok  english-a1-practical-3-002-how-far-is-it fallback vibe is active
  ok  english-a1-practical-3-002-how-far-is-it is usable now
  ok  english-a1-practical-3-002-how-far-is-it has Bright, Wistful, Sharp variants
  ok  english-a1-practical-3-002-how-far-is-it only defines active V0 variants
  ok  english-a1-practical-3-002-how-far-is-it has no required tender runtime variant
  ok  english-a1-practical-3-002-how-far-is-it has no required bold runtime variant
  ok  english-a1-practical-3-002-how-far-is-it has no required cheeky runtime variant
  ok  english-a1-practical-3-002-how-far-is-it has bright variant
  ok  english-a1-practical-3-002-how-far-is-it/bright content status is draft or final
  ok  english-a1-practical-3-002-how-far-is-it/bright target text exists
  ok  english-a1-practical-3-002-how-far-is-it/bright base text exists
  ok  english-a1-practical-3-002-how-far-is-it/bright meaning exists
  ok  english-a1-practical-3-002-how-far-is-it/bright chunks are non-empty
  ok  english-a1-practical-3-002-how-far-is-it/bright lesson items are non-empty
  ok  english-a1-practical-3-002-how-far-is-it/bright build target exists
  ok  english-a1-practical-3-002-how-far-is-it/bright build chips support target phrase
  ok  english-a1-practical-3-002-how-far-is-it/bright type recall answer exists
  ok  english-a1-practical-3-002-how-far-is-it/bright acceptedAnswers includes answer
  ok  english-a1-practical-3-002-how-far-is-it/bright type recall has fallback choices
  ok  english-a1-practical-3-002-how-far-is-it/bright speak target has cue
  ok  english-a1-practical-3-002-how-far-is-it/bright speak target phrase is compatible with core phrase
  ok  english-a1-practical-3-002-how-far-is-it/bright speak language is supported
  ok  english-a1-practical-3-002-how-far-is-it/bright speak threshold is usable
  ok  english-a1-practical-3-002-how-far-is-it/bright scene caption exists
  ok  english-a1-practical-3-002-how-far-is-it/bright trophy word is complete
  ok  english-a1-practical-3-002-how-far-is-it/bright placeholder media exists
  ok  english-a1-practical-3-002-how-far-is-it/bright song seed exists
  ok  english-a1-practical-3-002-how-far-is-it/bright visual notes exist
  ok  english-a1-practical-3-002-how-far-is-it has wistful variant
  ok  english-a1-practical-3-002-how-far-is-it/wistful content status is draft or final
  ok  english-a1-practical-3-002-how-far-is-it/wistful target text exists
  ok  english-a1-practical-3-002-how-far-is-it/wistful base text exists
  ok  english-a1-practical-3-002-how-far-is-it/wistful meaning exists
  ok  english-a1-practical-3-002-how-far-is-it/wistful chunks are non-empty
  ok  english-a1-practical-3-002-how-far-is-it/wistful lesson items are non-empty
  ok  english-a1-practical-3-002-how-far-is-it/wistful build target exists
  ok  english-a1-practical-3-002-how-far-is-it/wistful build chips support target phrase
  ok  english-a1-practical-3-002-how-far-is-it/wistful type recall answer exists
  ok  english-a1-practical-3-002-how-far-is-it/wistful acceptedAnswers includes answer
  ok  english-a1-practical-3-002-how-far-is-it/wistful type recall has fallback choices
  ok  english-a1-practical-3-002-how-far-is-it/wistful speak target has cue
  ok  english-a1-practical-3-002-how-far-is-it/wistful speak target phrase is compatible with core phrase
  ok  english-a1-practical-3-002-how-far-is-it/wistful speak language is supported
  ok  english-a1-practical-3-002-how-far-is-it/wistful speak threshold is usable
  ok  english-a1-practical-3-002-how-far-is-it/wistful scene caption exists
  ok  english-a1-practical-3-002-how-far-is-it/wistful trophy word is complete
  ok  english-a1-practical-3-002-how-far-is-it/wistful placeholder media exists
  ok  english-a1-practical-3-002-how-far-is-it/wistful song seed exists
  ok  english-a1-practical-3-002-how-far-is-it/wistful visual notes exist
  ok  english-a1-practical-3-002-how-far-is-it has sharp variant
  ok  english-a1-practical-3-002-how-far-is-it/sharp content status is draft or final
  ok  english-a1-practical-3-002-how-far-is-it/sharp target text exists
  ok  english-a1-practical-3-002-how-far-is-it/sharp base text exists
  ok  english-a1-practical-3-002-how-far-is-it/sharp meaning exists
  ok  english-a1-practical-3-002-how-far-is-it/sharp chunks are non-empty
  ok  english-a1-practical-3-002-how-far-is-it/sharp lesson items are non-empty
  ok  english-a1-practical-3-002-how-far-is-it/sharp build target exists
  ok  english-a1-practical-3-002-how-far-is-it/sharp build chips support target phrase
  ok  english-a1-practical-3-002-how-far-is-it/sharp type recall answer exists
  ok  english-a1-practical-3-002-how-far-is-it/sharp acceptedAnswers includes answer
  ok  english-a1-practical-3-002-how-far-is-it/sharp type recall has fallback choices
  ok  english-a1-practical-3-002-how-far-is-it/sharp speak target has cue
  ok  english-a1-practical-3-002-how-far-is-it/sharp speak target phrase is compatible with core phrase
  ok  english-a1-practical-3-002-how-far-is-it/sharp speak language is supported
  ok  english-a1-practical-3-002-how-far-is-it/sharp speak threshold is usable
  ok  english-a1-practical-3-002-how-far-is-it/sharp scene caption exists
  ok  english-a1-practical-3-002-how-far-is-it/sharp trophy word is complete
  ok  english-a1-practical-3-002-how-far-is-it/sharp placeholder media exists
  ok  english-a1-practical-3-002-how-far-is-it/sharp song seed exists
  ok  english-a1-practical-3-002-how-far-is-it/sharp visual notes exist
  ok  english-a1-practical-3-003-is-it-open has invariant id
  ok  english-a1-practical-3-003-is-it-open has invariant path id
  ok  english-a1-practical-3-003-is-it-open has invariant lesson number
  ok  english-a1-practical-3-003-is-it-open has invariant title
  ok  english-a1-practical-3-003-is-it-open has invariant situation
  ok  english-a1-practical-3-003-is-it-open has invariant pedagogical goal
  ok  english-a1-practical-3-003-is-it-open uses guided-today-v0 mode
  ok  english-a1-practical-3-003-is-it-open uses existing Foundation session steps
  ok  english-a1-practical-3-003-is-it-open has estimated minutes
  ok  english-a1-practical-3-003-is-it-open fallback vibe is active
  ok  english-a1-practical-3-003-is-it-open is usable now
  ok  english-a1-practical-3-003-is-it-open has Bright, Wistful, Sharp variants
  ok  english-a1-practical-3-003-is-it-open only defines active V0 variants
  ok  english-a1-practical-3-003-is-it-open has no required tender runtime variant
  ok  english-a1-practical-3-003-is-it-open has no required bold runtime variant
  ok  english-a1-practical-3-003-is-it-open has no required cheeky runtime variant
  ok  english-a1-practical-3-003-is-it-open has bright variant
  ok  english-a1-practical-3-003-is-it-open/bright content status is draft or final
  ok  english-a1-practical-3-003-is-it-open/bright target text exists
  ok  english-a1-practical-3-003-is-it-open/bright base text exists
  ok  english-a1-practical-3-003-is-it-open/bright meaning exists
  ok  english-a1-practical-3-003-is-it-open/bright chunks are non-empty
  ok  english-a1-practical-3-003-is-it-open/bright lesson items are non-empty
  ok  english-a1-practical-3-003-is-it-open/bright build target exists
  ok  english-a1-practical-3-003-is-it-open/bright build chips support target phrase
  ok  english-a1-practical-3-003-is-it-open/bright type recall answer exists
  ok  english-a1-practical-3-003-is-it-open/bright acceptedAnswers includes answer
  ok  english-a1-practical-3-003-is-it-open/bright type recall has fallback choices
  ok  english-a1-practical-3-003-is-it-open/bright speak target has cue
  ok  english-a1-practical-3-003-is-it-open/bright speak target phrase is compatible with core phrase
  ok  english-a1-practical-3-003-is-it-open/bright speak language is supported
  ok  english-a1-practical-3-003-is-it-open/bright speak threshold is usable
  ok  english-a1-practical-3-003-is-it-open/bright scene caption exists
  ok  english-a1-practical-3-003-is-it-open/bright trophy word is complete
  ok  english-a1-practical-3-003-is-it-open/bright placeholder media exists
  ok  english-a1-practical-3-003-is-it-open/bright song seed exists
  ok  english-a1-practical-3-003-is-it-open/bright visual notes exist
  ok  english-a1-practical-3-003-is-it-open has wistful variant
  ok  english-a1-practical-3-003-is-it-open/wistful content status is draft or final
  ok  english-a1-practical-3-003-is-it-open/wistful target text exists
  ok  english-a1-practical-3-003-is-it-open/wistful base text exists
  ok  english-a1-practical-3-003-is-it-open/wistful meaning exists
  ok  english-a1-practical-3-003-is-it-open/wistful chunks are non-empty
  ok  english-a1-practical-3-003-is-it-open/wistful lesson items are non-empty
  ok  english-a1-practical-3-003-is-it-open/wistful build target exists
  ok  english-a1-practical-3-003-is-it-open/wistful build chips support target phrase
  ok  english-a1-practical-3-003-is-it-open/wistful type recall answer exists
  ok  english-a1-practical-3-003-is-it-open/wistful acceptedAnswers includes answer
  ok  english-a1-practical-3-003-is-it-open/wistful type recall has fallback choices
  ok  english-a1-practical-3-003-is-it-open/wistful speak target has cue
  ok  english-a1-practical-3-003-is-it-open/wistful speak target phrase is compatible with core phrase
  ok  english-a1-practical-3-003-is-it-open/wistful speak language is supported
  ok  english-a1-practical-3-003-is-it-open/wistful speak threshold is usable
  ok  english-a1-practical-3-003-is-it-open/wistful scene caption exists
  ok  english-a1-practical-3-003-is-it-open/wistful trophy word is complete
  ok  english-a1-practical-3-003-is-it-open/wistful placeholder media exists
  ok  english-a1-practical-3-003-is-it-open/wistful song seed exists
  ok  english-a1-practical-3-003-is-it-open/wistful visual notes exist
  ok  english-a1-practical-3-003-is-it-open has sharp variant
  ok  english-a1-practical-3-003-is-it-open/sharp content status is draft or final
  ok  english-a1-practical-3-003-is-it-open/sharp target text exists
  ok  english-a1-practical-3-003-is-it-open/sharp base text exists
  ok  english-a1-practical-3-003-is-it-open/sharp meaning exists
  ok  english-a1-practical-3-003-is-it-open/sharp chunks are non-empty
  ok  english-a1-practical-3-003-is-it-open/sharp lesson items are non-empty
  ok  english-a1-practical-3-003-is-it-open/sharp build target exists
  ok  english-a1-practical-3-003-is-it-open/sharp build chips support target phrase
  ok  english-a1-practical-3-003-is-it-open/sharp type recall answer exists
  ok  english-a1-practical-3-003-is-it-open/sharp acceptedAnswers includes answer
  ok  english-a1-practical-3-003-is-it-open/sharp type recall has fallback choices
  ok  english-a1-practical-3-003-is-it-open/sharp speak target has cue
  ok  english-a1-practical-3-003-is-it-open/sharp speak target phrase is compatible with core phrase
  ok  english-a1-practical-3-003-is-it-open/sharp speak language is supported
  ok  english-a1-practical-3-003-is-it-open/sharp speak threshold is usable
  ok  english-a1-practical-3-003-is-it-open/sharp scene caption exists
  ok  english-a1-practical-3-003-is-it-open/sharp trophy word is complete
  ok  english-a1-practical-3-003-is-it-open/sharp placeholder media exists
  ok  english-a1-practical-3-003-is-it-open/sharp song seed exists
  ok  english-a1-practical-3-003-is-it-open/sharp visual notes exist
  ok  english-a1-practical-3-004-which-bus has invariant id
  ok  english-a1-practical-3-004-which-bus has invariant path id
  ok  english-a1-practical-3-004-which-bus has invariant lesson number
  ok  english-a1-practical-3-004-which-bus has invariant title
  ok  english-a1-practical-3-004-which-bus has invariant situation
  ok  english-a1-practical-3-004-which-bus has invariant pedagogical goal
  ok  english-a1-practical-3-004-which-bus uses guided-today-v0 mode
  ok  english-a1-practical-3-004-which-bus uses existing Foundation session steps
  ok  english-a1-practical-3-004-which-bus has estimated minutes
  ok  english-a1-practical-3-004-which-bus fallback vibe is active
  ok  english-a1-practical-3-004-which-bus is usable now
  ok  english-a1-practical-3-004-which-bus has Bright, Wistful, Sharp variants
  ok  english-a1-practical-3-004-which-bus only defines active V0 variants
  ok  english-a1-practical-3-004-which-bus has no required tender runtime variant
  ok  english-a1-practical-3-004-which-bus has no required bold runtime variant
  ok  english-a1-practical-3-004-which-bus has no required cheeky runtime variant
  ok  english-a1-practical-3-004-which-bus has bright variant
  ok  english-a1-practical-3-004-which-bus/bright content status is draft or final
  ok  english-a1-practical-3-004-which-bus/bright target text exists
  ok  english-a1-practical-3-004-which-bus/bright base text exists
  ok  english-a1-practical-3-004-which-bus/bright meaning exists
  ok  english-a1-practical-3-004-which-bus/bright chunks are non-empty
  ok  english-a1-practical-3-004-which-bus/bright lesson items are non-empty
  ok  english-a1-practical-3-004-which-bus/bright build target exists
  ok  english-a1-practical-3-004-which-bus/bright build chips support target phrase
  ok  english-a1-practical-3-004-which-bus/bright type recall answer exists
  ok  english-a1-practical-3-004-which-bus/bright acceptedAnswers includes answer
  ok  english-a1-practical-3-004-which-bus/bright type recall has fallback choices
  ok  english-a1-practical-3-004-which-bus/bright speak target has cue
  ok  english-a1-practical-3-004-which-bus/bright speak target phrase is compatible with core phrase
  ok  english-a1-practical-3-004-which-bus/bright speak language is supported
  ok  english-a1-practical-3-004-which-bus/bright speak threshold is usable
  ok  english-a1-practical-3-004-which-bus/bright scene caption exists
  ok  english-a1-practical-3-004-which-bus/bright trophy word is complete
  ok  english-a1-practical-3-004-which-bus/bright placeholder media exists
  ok  english-a1-practical-3-004-which-bus/bright song seed exists
  ok  english-a1-practical-3-004-which-bus/bright visual notes exist
  ok  english-a1-practical-3-004-which-bus has wistful variant
  ok  english-a1-practical-3-004-which-bus/wistful content status is draft or final
  ok  english-a1-practical-3-004-which-bus/wistful target text exists
  ok  english-a1-practical-3-004-which-bus/wistful base text exists
  ok  english-a1-practical-3-004-which-bus/wistful meaning exists
  ok  english-a1-practical-3-004-which-bus/wistful chunks are non-empty
  ok  english-a1-practical-3-004-which-bus/wistful lesson items are non-empty
  ok  english-a1-practical-3-004-which-bus/wistful build target exists
  ok  english-a1-practical-3-004-which-bus/wistful build chips support target phrase
  ok  english-a1-practical-3-004-which-bus/wistful type recall answer exists
  ok  english-a1-practical-3-004-which-bus/wistful acceptedAnswers includes answer
  ok  english-a1-practical-3-004-which-bus/wistful type recall has fallback choices
  ok  english-a1-practical-3-004-which-bus/wistful speak target has cue
  ok  english-a1-practical-3-004-which-bus/wistful speak target phrase is compatible with core phrase
  ok  english-a1-practical-3-004-which-bus/wistful speak language is supported
  ok  english-a1-practical-3-004-which-bus/wistful speak threshold is usable
  ok  english-a1-practical-3-004-which-bus/wistful scene caption exists
  ok  english-a1-practical-3-004-which-bus/wistful trophy word is complete
  ok  english-a1-practical-3-004-which-bus/wistful placeholder media exists
  ok  english-a1-practical-3-004-which-bus/wistful song seed exists
  ok  english-a1-practical-3-004-which-bus/wistful visual notes exist
  ok  english-a1-practical-3-004-which-bus has sharp variant
  ok  english-a1-practical-3-004-which-bus/sharp content status is draft or final
  ok  english-a1-practical-3-004-which-bus/sharp target text exists
  ok  english-a1-practical-3-004-which-bus/sharp base text exists
  ok  english-a1-practical-3-004-which-bus/sharp meaning exists
  ok  english-a1-practical-3-004-which-bus/sharp chunks are non-empty
  ok  english-a1-practical-3-004-which-bus/sharp lesson items are non-empty
  ok  english-a1-practical-3-004-which-bus/sharp build target exists
  ok  english-a1-practical-3-004-which-bus/sharp build chips support target phrase
  ok  english-a1-practical-3-004-which-bus/sharp type recall answer exists
  ok  english-a1-practical-3-004-which-bus/sharp acceptedAnswers includes answer
  ok  english-a1-practical-3-004-which-bus/sharp type recall has fallback choices
  ok  english-a1-practical-3-004-which-bus/sharp speak target has cue
  ok  english-a1-practical-3-004-which-bus/sharp speak target phrase is compatible with core phrase
  ok  english-a1-practical-3-004-which-bus/sharp speak language is supported
  ok  english-a1-practical-3-004-which-bus/sharp speak threshold is usable
  ok  english-a1-practical-3-004-which-bus/sharp scene caption exists
  ok  english-a1-practical-3-004-which-bus/sharp trophy word is complete
  ok  english-a1-practical-3-004-which-bus/sharp placeholder media exists
  ok  english-a1-practical-3-004-which-bus/sharp song seed exists
  ok  english-a1-practical-3-004-which-bus/sharp visual notes exist
  ok  english-a1-practical-3-005-the-next-stop has invariant id
  ok  english-a1-practical-3-005-the-next-stop has invariant path id
  ok  english-a1-practical-3-005-the-next-stop has invariant lesson number
  ok  english-a1-practical-3-005-the-next-stop has invariant title
  ok  english-a1-practical-3-005-the-next-stop has invariant situation
  ok  english-a1-practical-3-005-the-next-stop has invariant pedagogical goal
  ok  english-a1-practical-3-005-the-next-stop uses guided-today-v0 mode
  ok  english-a1-practical-3-005-the-next-stop uses existing Foundation session steps
  ok  english-a1-practical-3-005-the-next-stop has estimated minutes
  ok  english-a1-practical-3-005-the-next-stop fallback vibe is active
  ok  english-a1-practical-3-005-the-next-stop is usable now
  ok  english-a1-practical-3-005-the-next-stop has Bright, Wistful, Sharp variants
  ok  english-a1-practical-3-005-the-next-stop only defines active V0 variants
  ok  english-a1-practical-3-005-the-next-stop has no required tender runtime variant
  ok  english-a1-practical-3-005-the-next-stop has no required bold runtime variant
  ok  english-a1-practical-3-005-the-next-stop has no required cheeky runtime variant
  ok  english-a1-practical-3-005-the-next-stop has bright variant
  ok  english-a1-practical-3-005-the-next-stop/bright content status is draft or final
  ok  english-a1-practical-3-005-the-next-stop/bright target text exists
  ok  english-a1-practical-3-005-the-next-stop/bright base text exists
  ok  english-a1-practical-3-005-the-next-stop/bright meaning exists
  ok  english-a1-practical-3-005-the-next-stop/bright chunks are non-empty
  ok  english-a1-practical-3-005-the-next-stop/bright lesson items are non-empty
  ok  english-a1-practical-3-005-the-next-stop/bright build target exists
  ok  english-a1-practical-3-005-the-next-stop/bright build chips support target phrase
  ok  english-a1-practical-3-005-the-next-stop/bright type recall answer exists
  ok  english-a1-practical-3-005-the-next-stop/bright acceptedAnswers includes answer
  ok  english-a1-practical-3-005-the-next-stop/bright type recall has fallback choices
  ok  english-a1-practical-3-005-the-next-stop/bright speak target has cue
  ok  english-a1-practical-3-005-the-next-stop/bright speak target phrase is compatible with core phrase
  ok  english-a1-practical-3-005-the-next-stop/bright speak language is supported
  ok  english-a1-practical-3-005-the-next-stop/bright speak threshold is usable
  ok  english-a1-practical-3-005-the-next-stop/bright scene caption exists
  ok  english-a1-practical-3-005-the-next-stop/bright trophy word is complete
  ok  english-a1-practical-3-005-the-next-stop/bright placeholder media exists
  ok  english-a1-practical-3-005-the-next-stop/bright song seed exists
  ok  english-a1-practical-3-005-the-next-stop/bright visual notes exist
  ok  english-a1-practical-3-005-the-next-stop has wistful variant
  ok  english-a1-practical-3-005-the-next-stop/wistful content status is draft or final
  ok  english-a1-practical-3-005-the-next-stop/wistful target text exists
  ok  english-a1-practical-3-005-the-next-stop/wistful base text exists
  ok  english-a1-practical-3-005-the-next-stop/wistful meaning exists
  ok  english-a1-practical-3-005-the-next-stop/wistful chunks are non-empty
  ok  english-a1-practical-3-005-the-next-stop/wistful lesson items are non-empty
  ok  english-a1-practical-3-005-the-next-stop/wistful build target exists
  ok  english-a1-practical-3-005-the-next-stop/wistful build chips support target phrase
  ok  english-a1-practical-3-005-the-next-stop/wistful type recall answer exists
  ok  english-a1-practical-3-005-the-next-stop/wistful acceptedAnswers includes answer
  ok  english-a1-practical-3-005-the-next-stop/wistful type recall has fallback choices
  ok  english-a1-practical-3-005-the-next-stop/wistful speak target has cue
  ok  english-a1-practical-3-005-the-next-stop/wistful speak target phrase is compatible with core phrase
  ok  english-a1-practical-3-005-the-next-stop/wistful speak language is supported
  ok  english-a1-practical-3-005-the-next-stop/wistful speak threshold is usable
  ok  english-a1-practical-3-005-the-next-stop/wistful scene caption exists
  ok  english-a1-practical-3-005-the-next-stop/wistful trophy word is complete
  ok  english-a1-practical-3-005-the-next-stop/wistful placeholder media exists
  ok  english-a1-practical-3-005-the-next-stop/wistful song seed exists
  ok  english-a1-practical-3-005-the-next-stop/wistful visual notes exist
  ok  english-a1-practical-3-005-the-next-stop has sharp variant
  ok  english-a1-practical-3-005-the-next-stop/sharp content status is draft or final
  ok  english-a1-practical-3-005-the-next-stop/sharp target text exists
  ok  english-a1-practical-3-005-the-next-stop/sharp base text exists
  ok  english-a1-practical-3-005-the-next-stop/sharp meaning exists
  ok  english-a1-practical-3-005-the-next-stop/sharp chunks are non-empty
  ok  english-a1-practical-3-005-the-next-stop/sharp lesson items are non-empty
  ok  english-a1-practical-3-005-the-next-stop/sharp build target exists
  ok  english-a1-practical-3-005-the-next-stop/sharp build chips support target phrase
  ok  english-a1-practical-3-005-the-next-stop/sharp type recall answer exists
  ok  english-a1-practical-3-005-the-next-stop/sharp acceptedAnswers includes answer
  ok  english-a1-practical-3-005-the-next-stop/sharp type recall has fallback choices
  ok  english-a1-practical-3-005-the-next-stop/sharp speak target has cue
  ok  english-a1-practical-3-005-the-next-stop/sharp speak target phrase is compatible with core phrase
  ok  english-a1-practical-3-005-the-next-stop/sharp speak language is supported
  ok  english-a1-practical-3-005-the-next-stop/sharp speak threshold is usable
  ok  english-a1-practical-3-005-the-next-stop/sharp scene caption exists
  ok  english-a1-practical-3-005-the-next-stop/sharp trophy word is complete
  ok  english-a1-practical-3-005-the-next-stop/sharp placeholder media exists
  ok  english-a1-practical-3-005-the-next-stop/sharp song seed exists
  ok  english-a1-practical-3-005-the-next-stop/sharp visual notes exist
  ok  english-a1-practical-3-006-a-ticket-please has invariant id
  ok  english-a1-practical-3-006-a-ticket-please has invariant path id
  ok  english-a1-practical-3-006-a-ticket-please has invariant lesson number
  ok  english-a1-practical-3-006-a-ticket-please has invariant title
  ok  english-a1-practical-3-006-a-ticket-please has invariant situation
  ok  english-a1-practical-3-006-a-ticket-please has invariant pedagogical goal
  ok  english-a1-practical-3-006-a-ticket-please uses guided-today-v0 mode
  ok  english-a1-practical-3-006-a-ticket-please uses existing Foundation session steps
  ok  english-a1-practical-3-006-a-ticket-please has estimated minutes
  ok  english-a1-practical-3-006-a-ticket-please fallback vibe is active
  ok  english-a1-practical-3-006-a-ticket-please is usable now
  ok  english-a1-practical-3-006-a-ticket-please has Bright, Wistful, Sharp variants
  ok  english-a1-practical-3-006-a-ticket-please only defines active V0 variants
  ok  english-a1-practical-3-006-a-ticket-please has no required tender runtime variant
  ok  english-a1-practical-3-006-a-ticket-please has no required bold runtime variant
  ok  english-a1-practical-3-006-a-ticket-please has no required cheeky runtime variant
  ok  english-a1-practical-3-006-a-ticket-please has bright variant
  ok  english-a1-practical-3-006-a-ticket-please/bright content status is draft or final
  ok  english-a1-practical-3-006-a-ticket-please/bright target text exists
  ok  english-a1-practical-3-006-a-ticket-please/bright base text exists
  ok  english-a1-practical-3-006-a-ticket-please/bright meaning exists
  ok  english-a1-practical-3-006-a-ticket-please/bright chunks are non-empty
  ok  english-a1-practical-3-006-a-ticket-please/bright lesson items are non-empty
  ok  english-a1-practical-3-006-a-ticket-please/bright build target exists
  ok  english-a1-practical-3-006-a-ticket-please/bright build chips support target phrase
  ok  english-a1-practical-3-006-a-ticket-please/bright type recall answer exists
  ok  english-a1-practical-3-006-a-ticket-please/bright acceptedAnswers includes answer
  ok  english-a1-practical-3-006-a-ticket-please/bright type recall has fallback choices
  ok  english-a1-practical-3-006-a-ticket-please/bright speak target has cue
  ok  english-a1-practical-3-006-a-ticket-please/bright speak target phrase is compatible with core phrase
  ok  english-a1-practical-3-006-a-ticket-please/bright speak language is supported
  ok  english-a1-practical-3-006-a-ticket-please/bright speak threshold is usable
  ok  english-a1-practical-3-006-a-ticket-please/bright scene caption exists
  ok  english-a1-practical-3-006-a-ticket-please/bright trophy word is complete
  ok  english-a1-practical-3-006-a-ticket-please/bright placeholder media exists
  ok  english-a1-practical-3-006-a-ticket-please/bright song seed exists
  ok  english-a1-practical-3-006-a-ticket-please/bright visual notes exist
  ok  english-a1-practical-3-006-a-ticket-please has wistful variant
  ok  english-a1-practical-3-006-a-ticket-please/wistful content status is draft or final
  ok  english-a1-practical-3-006-a-ticket-please/wistful target text exists
  ok  english-a1-practical-3-006-a-ticket-please/wistful base text exists
  ok  english-a1-practical-3-006-a-ticket-please/wistful meaning exists
  ok  english-a1-practical-3-006-a-ticket-please/wistful chunks are non-empty
  ok  english-a1-practical-3-006-a-ticket-please/wistful lesson items are non-empty
  ok  english-a1-practical-3-006-a-ticket-please/wistful build target exists
  ok  english-a1-practical-3-006-a-ticket-please/wistful build chips support target phrase
  ok  english-a1-practical-3-006-a-ticket-please/wistful type recall answer exists
  ok  english-a1-practical-3-006-a-ticket-please/wistful acceptedAnswers includes answer
  ok  english-a1-practical-3-006-a-ticket-please/wistful type recall has fallback choices
  ok  english-a1-practical-3-006-a-ticket-please/wistful speak target has cue
  ok  english-a1-practical-3-006-a-ticket-please/wistful speak target phrase is compatible with core phrase
  ok  english-a1-practical-3-006-a-ticket-please/wistful speak language is supported
  ok  english-a1-practical-3-006-a-ticket-please/wistful speak threshold is usable
  ok  english-a1-practical-3-006-a-ticket-please/wistful scene caption exists
  ok  english-a1-practical-3-006-a-ticket-please/wistful trophy word is complete
  ok  english-a1-practical-3-006-a-ticket-please/wistful placeholder media exists
  ok  english-a1-practical-3-006-a-ticket-please/wistful song seed exists
  ok  english-a1-practical-3-006-a-ticket-please/wistful visual notes exist
  ok  english-a1-practical-3-006-a-ticket-please has sharp variant
  ok  english-a1-practical-3-006-a-ticket-please/sharp content status is draft or final
  ok  english-a1-practical-3-006-a-ticket-please/sharp target text exists
  ok  english-a1-practical-3-006-a-ticket-please/sharp base text exists
  ok  english-a1-practical-3-006-a-ticket-please/sharp meaning exists
  ok  english-a1-practical-3-006-a-ticket-please/sharp chunks are non-empty
  ok  english-a1-practical-3-006-a-ticket-please/sharp lesson items are non-empty
  ok  english-a1-practical-3-006-a-ticket-please/sharp build target exists
  ok  english-a1-practical-3-006-a-ticket-please/sharp build chips support target phrase
  ok  english-a1-practical-3-006-a-ticket-please/sharp type recall answer exists
  ok  english-a1-practical-3-006-a-ticket-please/sharp acceptedAnswers includes answer
  ok  english-a1-practical-3-006-a-ticket-please/sharp type recall has fallback choices
  ok  english-a1-practical-3-006-a-ticket-please/sharp speak target has cue
  ok  english-a1-practical-3-006-a-ticket-please/sharp speak target phrase is compatible with core phrase
  ok  english-a1-practical-3-006-a-ticket-please/sharp speak language is supported
  ok  english-a1-practical-3-006-a-ticket-please/sharp speak threshold is usable
  ok  english-a1-practical-3-006-a-ticket-please/sharp scene caption exists
  ok  english-a1-practical-3-006-a-ticket-please/sharp trophy word is complete
  ok  english-a1-practical-3-006-a-ticket-please/sharp placeholder media exists
  ok  english-a1-practical-3-006-a-ticket-please/sharp song seed exists
  ok  english-a1-practical-3-006-a-ticket-please/sharp visual notes exist
  ok  english-a1-practical-3-007-what-time-does-it-close has invariant id
  ok  english-a1-practical-3-007-what-time-does-it-close has invariant path id
  ok  english-a1-practical-3-007-what-time-does-it-close has invariant lesson number
  ok  english-a1-practical-3-007-what-time-does-it-close has invariant title
  ok  english-a1-practical-3-007-what-time-does-it-close has invariant situation
  ok  english-a1-practical-3-007-what-time-does-it-close has invariant pedagogical goal
  ok  english-a1-practical-3-007-what-time-does-it-close uses guided-today-v0 mode
  ok  english-a1-practical-3-007-what-time-does-it-close uses existing Foundation session steps
  ok  english-a1-practical-3-007-what-time-does-it-close has estimated minutes
  ok  english-a1-practical-3-007-what-time-does-it-close fallback vibe is active
  ok  english-a1-practical-3-007-what-time-does-it-close is usable now
  ok  english-a1-practical-3-007-what-time-does-it-close has Bright, Wistful, Sharp variants
  ok  english-a1-practical-3-007-what-time-does-it-close only defines active V0 variants
  ok  english-a1-practical-3-007-what-time-does-it-close has no required tender runtime variant
  ok  english-a1-practical-3-007-what-time-does-it-close has no required bold runtime variant
  ok  english-a1-practical-3-007-what-time-does-it-close has no required cheeky runtime variant
  ok  english-a1-practical-3-007-what-time-does-it-close has bright variant
  ok  english-a1-practical-3-007-what-time-does-it-close/bright content status is draft or final
  ok  english-a1-practical-3-007-what-time-does-it-close/bright target text exists
  ok  english-a1-practical-3-007-what-time-does-it-close/bright base text exists
  ok  english-a1-practical-3-007-what-time-does-it-close/bright meaning exists
  ok  english-a1-practical-3-007-what-time-does-it-close/bright chunks are non-empty
  ok  english-a1-practical-3-007-what-time-does-it-close/bright lesson items are non-empty
  ok  english-a1-practical-3-007-what-time-does-it-close/bright build target exists
  ok  english-a1-practical-3-007-what-time-does-it-close/bright build chips support target phrase
  ok  english-a1-practical-3-007-what-time-does-it-close/bright type recall answer exists
  ok  english-a1-practical-3-007-what-time-does-it-close/bright acceptedAnswers includes answer
  ok  english-a1-practical-3-007-what-time-does-it-close/bright type recall has fallback choices
  ok  english-a1-practical-3-007-what-time-does-it-close/bright speak target has cue
  ok  english-a1-practical-3-007-what-time-does-it-close/bright speak target phrase is compatible with core phrase
  ok  english-a1-practical-3-007-what-time-does-it-close/bright speak language is supported
  ok  english-a1-practical-3-007-what-time-does-it-close/bright speak threshold is usable
  ok  english-a1-practical-3-007-what-time-does-it-close/bright scene caption exists
  ok  english-a1-practical-3-007-what-time-does-it-close/bright trophy word is complete
  ok  english-a1-practical-3-007-what-time-does-it-close/bright placeholder media exists
  ok  english-a1-practical-3-007-what-time-does-it-close/bright song seed exists
  ok  english-a1-practical-3-007-what-time-does-it-close/bright visual notes exist
  ok  english-a1-practical-3-007-what-time-does-it-close has wistful variant
  ok  english-a1-practical-3-007-what-time-does-it-close/wistful content status is draft or final
  ok  english-a1-practical-3-007-what-time-does-it-close/wistful target text exists
  ok  english-a1-practical-3-007-what-time-does-it-close/wistful base text exists
  ok  english-a1-practical-3-007-what-time-does-it-close/wistful meaning exists
  ok  english-a1-practical-3-007-what-time-does-it-close/wistful chunks are non-empty
  ok  english-a1-practical-3-007-what-time-does-it-close/wistful lesson items are non-empty
  ok  english-a1-practical-3-007-what-time-does-it-close/wistful build target exists
  ok  english-a1-practical-3-007-what-time-does-it-close/wistful build chips support target phrase
  ok  english-a1-practical-3-007-what-time-does-it-close/wistful type recall answer exists
  ok  english-a1-practical-3-007-what-time-does-it-close/wistful acceptedAnswers includes answer
  ok  english-a1-practical-3-007-what-time-does-it-close/wistful type recall has fallback choices
  ok  english-a1-practical-3-007-what-time-does-it-close/wistful speak target has cue
  ok  english-a1-practical-3-007-what-time-does-it-close/wistful speak target phrase is compatible with core phrase
  ok  english-a1-practical-3-007-what-time-does-it-close/wistful speak language is supported
  ok  english-a1-practical-3-007-what-time-does-it-close/wistful speak threshold is usable
  ok  english-a1-practical-3-007-what-time-does-it-close/wistful scene caption exists
  ok  english-a1-practical-3-007-what-time-does-it-close/wistful trophy word is complete
  ok  english-a1-practical-3-007-what-time-does-it-close/wistful placeholder media exists
  ok  english-a1-practical-3-007-what-time-does-it-close/wistful song seed exists
  ok  english-a1-practical-3-007-what-time-does-it-close/wistful visual notes exist
  ok  english-a1-practical-3-007-what-time-does-it-close has sharp variant
  ok  english-a1-practical-3-007-what-time-does-it-close/sharp content status is draft or final
  ok  english-a1-practical-3-007-what-time-does-it-close/sharp target text exists
  ok  english-a1-practical-3-007-what-time-does-it-close/sharp base text exists
  ok  english-a1-practical-3-007-what-time-does-it-close/sharp meaning exists
  ok  english-a1-practical-3-007-what-time-does-it-close/sharp chunks are non-empty
  ok  english-a1-practical-3-007-what-time-does-it-close/sharp lesson items are non-empty
  ok  english-a1-practical-3-007-what-time-does-it-close/sharp build target exists
  ok  english-a1-practical-3-007-what-time-does-it-close/sharp build chips support target phrase
  ok  english-a1-practical-3-007-what-time-does-it-close/sharp type recall answer exists
  ok  english-a1-practical-3-007-what-time-does-it-close/sharp acceptedAnswers includes answer
  ok  english-a1-practical-3-007-what-time-does-it-close/sharp type recall has fallback choices
  ok  english-a1-practical-3-007-what-time-does-it-close/sharp speak target has cue
  ok  english-a1-practical-3-007-what-time-does-it-close/sharp speak target phrase is compatible with core phrase
  ok  english-a1-practical-3-007-what-time-does-it-close/sharp speak language is supported
  ok  english-a1-practical-3-007-what-time-does-it-close/sharp speak threshold is usable
  ok  english-a1-practical-3-007-what-time-does-it-close/sharp scene caption exists
  ok  english-a1-practical-3-007-what-time-does-it-close/sharp trophy word is complete
  ok  english-a1-practical-3-007-what-time-does-it-close/sharp placeholder media exists
  ok  english-a1-practical-3-007-what-time-does-it-close/sharp song seed exists
  ok  english-a1-practical-3-007-what-time-does-it-close/sharp visual notes exist
  ok  english-a1-practical-3-008-the-corner has invariant id
  ok  english-a1-practical-3-008-the-corner has invariant path id
  ok  english-a1-practical-3-008-the-corner has invariant lesson number
  ok  english-a1-practical-3-008-the-corner has invariant title
  ok  english-a1-practical-3-008-the-corner has invariant situation
  ok  english-a1-practical-3-008-the-corner has invariant pedagogical goal
  ok  english-a1-practical-3-008-the-corner uses guided-today-v0 mode
  ok  english-a1-practical-3-008-the-corner uses existing Foundation session steps
  ok  english-a1-practical-3-008-the-corner has estimated minutes
  ok  english-a1-practical-3-008-the-corner fallback vibe is active
  ok  english-a1-practical-3-008-the-corner is usable now
  ok  english-a1-practical-3-008-the-corner has Bright, Wistful, Sharp variants
  ok  english-a1-practical-3-008-the-corner only defines active V0 variants
  ok  english-a1-practical-3-008-the-corner has no required tender runtime variant
  ok  english-a1-practical-3-008-the-corner has no required bold runtime variant
  ok  english-a1-practical-3-008-the-corner has no required cheeky runtime variant
  ok  english-a1-practical-3-008-the-corner has bright variant
  ok  english-a1-practical-3-008-the-corner/bright content status is draft or final
  ok  english-a1-practical-3-008-the-corner/bright target text exists
  ok  english-a1-practical-3-008-the-corner/bright base text exists
  ok  english-a1-practical-3-008-the-corner/bright meaning exists
  ok  english-a1-practical-3-008-the-corner/bright chunks are non-empty
  ok  english-a1-practical-3-008-the-corner/bright lesson items are non-empty
  ok  english-a1-practical-3-008-the-corner/bright build target exists
  ok  english-a1-practical-3-008-the-corner/bright build chips support target phrase
  ok  english-a1-practical-3-008-the-corner/bright type recall answer exists
  ok  english-a1-practical-3-008-the-corner/bright acceptedAnswers includes answer
  ok  english-a1-practical-3-008-the-corner/bright type recall has fallback choices
  ok  english-a1-practical-3-008-the-corner/bright speak target has cue
  ok  english-a1-practical-3-008-the-corner/bright speak target phrase is compatible with core phrase
  ok  english-a1-practical-3-008-the-corner/bright speak language is supported
  ok  english-a1-practical-3-008-the-corner/bright speak threshold is usable
  ok  english-a1-practical-3-008-the-corner/bright scene caption exists
  ok  english-a1-practical-3-008-the-corner/bright trophy word is complete
  ok  english-a1-practical-3-008-the-corner/bright placeholder media exists
  ok  english-a1-practical-3-008-the-corner/bright song seed exists
  ok  english-a1-practical-3-008-the-corner/bright visual notes exist
  ok  english-a1-practical-3-008-the-corner has wistful variant
  ok  english-a1-practical-3-008-the-corner/wistful content status is draft or final
  ok  english-a1-practical-3-008-the-corner/wistful target text exists
  ok  english-a1-practical-3-008-the-corner/wistful base text exists
  ok  english-a1-practical-3-008-the-corner/wistful meaning exists
  ok  english-a1-practical-3-008-the-corner/wistful chunks are non-empty
  ok  english-a1-practical-3-008-the-corner/wistful lesson items are non-empty
  ok  english-a1-practical-3-008-the-corner/wistful build target exists
  ok  english-a1-practical-3-008-the-corner/wistful build chips support target phrase
  ok  english-a1-practical-3-008-the-corner/wistful type recall answer exists
  ok  english-a1-practical-3-008-the-corner/wistful acceptedAnswers includes answer
  ok  english-a1-practical-3-008-the-corner/wistful type recall has fallback choices
  ok  english-a1-practical-3-008-the-corner/wistful speak target has cue
  ok  english-a1-practical-3-008-the-corner/wistful speak target phrase is compatible with core phrase
  ok  english-a1-practical-3-008-the-corner/wistful speak language is supported
  ok  english-a1-practical-3-008-the-corner/wistful speak threshold is usable
  ok  english-a1-practical-3-008-the-corner/wistful scene caption exists
  ok  english-a1-practical-3-008-the-corner/wistful trophy word is complete
  ok  english-a1-practical-3-008-the-corner/wistful placeholder media exists
  ok  english-a1-practical-3-008-the-corner/wistful song seed exists
  ok  english-a1-practical-3-008-the-corner/wistful visual notes exist
  ok  english-a1-practical-3-008-the-corner has sharp variant
  ok  english-a1-practical-3-008-the-corner/sharp content status is draft or final
  ok  english-a1-practical-3-008-the-corner/sharp target text exists
  ok  english-a1-practical-3-008-the-corner/sharp base text exists
  ok  english-a1-practical-3-008-the-corner/sharp meaning exists
  ok  english-a1-practical-3-008-the-corner/sharp chunks are non-empty
  ok  english-a1-practical-3-008-the-corner/sharp lesson items are non-empty
  ok  english-a1-practical-3-008-the-corner/sharp build target exists
  ok  english-a1-practical-3-008-the-corner/sharp build chips support target phrase
  ok  english-a1-practical-3-008-the-corner/sharp type recall answer exists
  ok  english-a1-practical-3-008-the-corner/sharp acceptedAnswers includes answer
  ok  english-a1-practical-3-008-the-corner/sharp type recall has fallback choices
  ok  english-a1-practical-3-008-the-corner/sharp speak target has cue
  ok  english-a1-practical-3-008-the-corner/sharp speak target phrase is compatible with core phrase
  ok  english-a1-practical-3-008-the-corner/sharp speak language is supported
  ok  english-a1-practical-3-008-the-corner/sharp speak threshold is usable
  ok  english-a1-practical-3-008-the-corner/sharp scene caption exists
  ok  english-a1-practical-3-008-the-corner/sharp trophy word is complete
  ok  english-a1-practical-3-008-the-corner/sharp placeholder media exists
  ok  english-a1-practical-3-008-the-corner/sharp song seed exists
  ok  english-a1-practical-3-008-the-corner/sharp visual notes exist
  ok  english-a1-practical-3-009-by-foot-or-by-taxi has invariant id
  ok  english-a1-practical-3-009-by-foot-or-by-taxi has invariant path id
  ok  english-a1-practical-3-009-by-foot-or-by-taxi has invariant lesson number
  ok  english-a1-practical-3-009-by-foot-or-by-taxi has invariant title
  ok  english-a1-practical-3-009-by-foot-or-by-taxi has invariant situation
  ok  english-a1-practical-3-009-by-foot-or-by-taxi has invariant pedagogical goal
  ok  english-a1-practical-3-009-by-foot-or-by-taxi uses guided-today-v0 mode
  ok  english-a1-practical-3-009-by-foot-or-by-taxi uses existing Foundation session steps
  ok  english-a1-practical-3-009-by-foot-or-by-taxi has estimated minutes
  ok  english-a1-practical-3-009-by-foot-or-by-taxi fallback vibe is active
  ok  english-a1-practical-3-009-by-foot-or-by-taxi is usable now
  ok  english-a1-practical-3-009-by-foot-or-by-taxi has Bright, Wistful, Sharp variants
  ok  english-a1-practical-3-009-by-foot-or-by-taxi only defines active V0 variants
  ok  english-a1-practical-3-009-by-foot-or-by-taxi has no required tender runtime variant
  ok  english-a1-practical-3-009-by-foot-or-by-taxi has no required bold runtime variant
  ok  english-a1-practical-3-009-by-foot-or-by-taxi has no required cheeky runtime variant
  ok  english-a1-practical-3-009-by-foot-or-by-taxi has bright variant
  ok  english-a1-practical-3-009-by-foot-or-by-taxi/bright content status is draft or final
  ok  english-a1-practical-3-009-by-foot-or-by-taxi/bright target text exists
  ok  english-a1-practical-3-009-by-foot-or-by-taxi/bright base text exists
  ok  english-a1-practical-3-009-by-foot-or-by-taxi/bright meaning exists
  ok  english-a1-practical-3-009-by-foot-or-by-taxi/bright chunks are non-empty
  ok  english-a1-practical-3-009-by-foot-or-by-taxi/bright lesson items are non-empty
  ok  english-a1-practical-3-009-by-foot-or-by-taxi/bright build target exists
  ok  english-a1-practical-3-009-by-foot-or-by-taxi/bright build chips support target phrase
  ok  english-a1-practical-3-009-by-foot-or-by-taxi/bright type recall answer exists
  ok  english-a1-practical-3-009-by-foot-or-by-taxi/bright acceptedAnswers includes answer
  ok  english-a1-practical-3-009-by-foot-or-by-taxi/bright type recall has fallback choices
  ok  english-a1-practical-3-009-by-foot-or-by-taxi/bright speak target has cue
  ok  english-a1-practical-3-009-by-foot-or-by-taxi/bright speak target phrase is compatible with core phrase
  ok  english-a1-practical-3-009-by-foot-or-by-taxi/bright speak language is supported
  ok  english-a1-practical-3-009-by-foot-or-by-taxi/bright speak threshold is usable
  ok  english-a1-practical-3-009-by-foot-or-by-taxi/bright scene caption exists
  ok  english-a1-practical-3-009-by-foot-or-by-taxi/bright trophy word is complete
  ok  english-a1-practical-3-009-by-foot-or-by-taxi/bright placeholder media exists
  ok  english-a1-practical-3-009-by-foot-or-by-taxi/bright song seed exists
  ok  english-a1-practical-3-009-by-foot-or-by-taxi/bright visual notes exist
  ok  english-a1-practical-3-009-by-foot-or-by-taxi has wistful variant
  ok  english-a1-practical-3-009-by-foot-or-by-taxi/wistful content status is draft or final
  ok  english-a1-practical-3-009-by-foot-or-by-taxi/wistful target text exists
  ok  english-a1-practical-3-009-by-foot-or-by-taxi/wistful base text exists
  ok  english-a1-practical-3-009-by-foot-or-by-taxi/wistful meaning exists
  ok  english-a1-practical-3-009-by-foot-or-by-taxi/wistful chunks are non-empty
  ok  english-a1-practical-3-009-by-foot-or-by-taxi/wistful lesson items are non-empty
  ok  english-a1-practical-3-009-by-foot-or-by-taxi/wistful build target exists
  ok  english-a1-practical-3-009-by-foot-or-by-taxi/wistful build chips support target phrase
  ok  english-a1-practical-3-009-by-foot-or-by-taxi/wistful type recall answer exists
  ok  english-a1-practical-3-009-by-foot-or-by-taxi/wistful acceptedAnswers includes answer
  ok  english-a1-practical-3-009-by-foot-or-by-taxi/wistful type recall has fallback choices
  ok  english-a1-practical-3-009-by-foot-or-by-taxi/wistful speak target has cue
  ok  english-a1-practical-3-009-by-foot-or-by-taxi/wistful speak target phrase is compatible with core phrase
  ok  english-a1-practical-3-009-by-foot-or-by-taxi/wistful speak language is supported
  ok  english-a1-practical-3-009-by-foot-or-by-taxi/wistful speak threshold is usable
  ok  english-a1-practical-3-009-by-foot-or-by-taxi/wistful scene caption exists
  ok  english-a1-practical-3-009-by-foot-or-by-taxi/wistful trophy word is complete
  ok  english-a1-practical-3-009-by-foot-or-by-taxi/wistful placeholder media exists
  ok  english-a1-practical-3-009-by-foot-or-by-taxi/wistful song seed exists
  ok  english-a1-practical-3-009-by-foot-or-by-taxi/wistful visual notes exist
  ok  english-a1-practical-3-009-by-foot-or-by-taxi has sharp variant
  ok  english-a1-practical-3-009-by-foot-or-by-taxi/sharp content status is draft or final
  ok  english-a1-practical-3-009-by-foot-or-by-taxi/sharp target text exists
  ok  english-a1-practical-3-009-by-foot-or-by-taxi/sharp base text exists
  ok  english-a1-practical-3-009-by-foot-or-by-taxi/sharp meaning exists
  ok  english-a1-practical-3-009-by-foot-or-by-taxi/sharp chunks are non-empty
  ok  english-a1-practical-3-009-by-foot-or-by-taxi/sharp lesson items are non-empty
  ok  english-a1-practical-3-009-by-foot-or-by-taxi/sharp build target exists
  ok  english-a1-practical-3-009-by-foot-or-by-taxi/sharp build chips support target phrase
  ok  english-a1-practical-3-009-by-foot-or-by-taxi/sharp type recall answer exists
  ok  english-a1-practical-3-009-by-foot-or-by-taxi/sharp acceptedAnswers includes answer
  ok  english-a1-practical-3-009-by-foot-or-by-taxi/sharp type recall has fallback choices
  ok  english-a1-practical-3-009-by-foot-or-by-taxi/sharp speak target has cue
  ok  english-a1-practical-3-009-by-foot-or-by-taxi/sharp speak target phrase is compatible with core phrase
  ok  english-a1-practical-3-009-by-foot-or-by-taxi/sharp speak language is supported
  ok  english-a1-practical-3-009-by-foot-or-by-taxi/sharp speak threshold is usable
  ok  english-a1-practical-3-009-by-foot-or-by-taxi/sharp scene caption exists
  ok  english-a1-practical-3-009-by-foot-or-by-taxi/sharp trophy word is complete
  ok  english-a1-practical-3-009-by-foot-or-by-taxi/sharp placeholder media exists
  ok  english-a1-practical-3-009-by-foot-or-by-taxi/sharp song seed exists
  ok  english-a1-practical-3-009-by-foot-or-by-taxi/sharp visual notes exist
  ok  english-a1-practical-3-010-i-missed-my-stop has invariant id
  ok  english-a1-practical-3-010-i-missed-my-stop has invariant path id
  ok  english-a1-practical-3-010-i-missed-my-stop has invariant lesson number
  ok  english-a1-practical-3-010-i-missed-my-stop has invariant title
  ok  english-a1-practical-3-010-i-missed-my-stop has invariant situation
  ok  english-a1-practical-3-010-i-missed-my-stop has invariant pedagogical goal
  ok  english-a1-practical-3-010-i-missed-my-stop uses guided-today-v0 mode
  ok  english-a1-practical-3-010-i-missed-my-stop uses existing Foundation session steps
  ok  english-a1-practical-3-010-i-missed-my-stop has estimated minutes
  ok  english-a1-practical-3-010-i-missed-my-stop fallback vibe is active
  ok  english-a1-practical-3-010-i-missed-my-stop is usable now
  ok  english-a1-practical-3-010-i-missed-my-stop has Bright, Wistful, Sharp variants
  ok  english-a1-practical-3-010-i-missed-my-stop only defines active V0 variants
  ok  english-a1-practical-3-010-i-missed-my-stop has no required tender runtime variant
  ok  english-a1-practical-3-010-i-missed-my-stop has no required bold runtime variant
  ok  english-a1-practical-3-010-i-missed-my-stop has no required cheeky runtime variant
  ok  english-a1-practical-3-010-i-missed-my-stop has bright variant
  ok  english-a1-practical-3-010-i-missed-my-stop/bright content status is draft or final
  ok  english-a1-practical-3-010-i-missed-my-stop/bright target text exists
  ok  english-a1-practical-3-010-i-missed-my-stop/bright base text exists
  ok  english-a1-practical-3-010-i-missed-my-stop/bright meaning exists
  ok  english-a1-practical-3-010-i-missed-my-stop/bright chunks are non-empty
  ok  english-a1-practical-3-010-i-missed-my-stop/bright lesson items are non-empty
  ok  english-a1-practical-3-010-i-missed-my-stop/bright build target exists
  ok  english-a1-practical-3-010-i-missed-my-stop/bright build chips support target phrase
  ok  english-a1-practical-3-010-i-missed-my-stop/bright type recall answer exists
  ok  english-a1-practical-3-010-i-missed-my-stop/bright acceptedAnswers includes answer
  ok  english-a1-practical-3-010-i-missed-my-stop/bright type recall has fallback choices
  ok  english-a1-practical-3-010-i-missed-my-stop/bright speak target has cue
  ok  english-a1-practical-3-010-i-missed-my-stop/bright speak target phrase is compatible with core phrase
  ok  english-a1-practical-3-010-i-missed-my-stop/bright speak language is supported
  ok  english-a1-practical-3-010-i-missed-my-stop/bright speak threshold is usable
  ok  english-a1-practical-3-010-i-missed-my-stop/bright scene caption exists
  ok  english-a1-practical-3-010-i-missed-my-stop/bright trophy word is complete
  ok  english-a1-practical-3-010-i-missed-my-stop/bright placeholder media exists
  ok  english-a1-practical-3-010-i-missed-my-stop/bright song seed exists
  ok  english-a1-practical-3-010-i-missed-my-stop/bright visual notes exist
  ok  english-a1-practical-3-010-i-missed-my-stop has wistful variant
  ok  english-a1-practical-3-010-i-missed-my-stop/wistful content status is draft or final
  ok  english-a1-practical-3-010-i-missed-my-stop/wistful target text exists
  ok  english-a1-practical-3-010-i-missed-my-stop/wistful base text exists
  ok  english-a1-practical-3-010-i-missed-my-stop/wistful meaning exists
  ok  english-a1-practical-3-010-i-missed-my-stop/wistful chunks are non-empty
  ok  english-a1-practical-3-010-i-missed-my-stop/wistful lesson items are non-empty
  ok  english-a1-practical-3-010-i-missed-my-stop/wistful build target exists
  ok  english-a1-practical-3-010-i-missed-my-stop/wistful build chips support target phrase
  ok  english-a1-practical-3-010-i-missed-my-stop/wistful type recall answer exists
  ok  english-a1-practical-3-010-i-missed-my-stop/wistful acceptedAnswers includes answer
  ok  english-a1-practical-3-010-i-missed-my-stop/wistful type recall has fallback choices
  ok  english-a1-practical-3-010-i-missed-my-stop/wistful speak target has cue
  ok  english-a1-practical-3-010-i-missed-my-stop/wistful speak target phrase is compatible with core phrase
  ok  english-a1-practical-3-010-i-missed-my-stop/wistful speak language is supported
  ok  english-a1-practical-3-010-i-missed-my-stop/wistful speak threshold is usable
  ok  english-a1-practical-3-010-i-missed-my-stop/wistful scene caption exists
  ok  english-a1-practical-3-010-i-missed-my-stop/wistful trophy word is complete
  ok  english-a1-practical-3-010-i-missed-my-stop/wistful placeholder media exists
  ok  english-a1-practical-3-010-i-missed-my-stop/wistful song seed exists
  ok  english-a1-practical-3-010-i-missed-my-stop/wistful visual notes exist
  ok  english-a1-practical-3-010-i-missed-my-stop has sharp variant
  ok  english-a1-practical-3-010-i-missed-my-stop/sharp content status is draft or final
  ok  english-a1-practical-3-010-i-missed-my-stop/sharp target text exists
  ok  english-a1-practical-3-010-i-missed-my-stop/sharp base text exists
  ok  english-a1-practical-3-010-i-missed-my-stop/sharp meaning exists
  ok  english-a1-practical-3-010-i-missed-my-stop/sharp chunks are non-empty
  ok  english-a1-practical-3-010-i-missed-my-stop/sharp lesson items are non-empty
  ok  english-a1-practical-3-010-i-missed-my-stop/sharp build target exists
  ok  english-a1-practical-3-010-i-missed-my-stop/sharp build chips support target phrase
  ok  english-a1-practical-3-010-i-missed-my-stop/sharp type recall answer exists
  ok  english-a1-practical-3-010-i-missed-my-stop/sharp acceptedAnswers includes answer
  ok  english-a1-practical-3-010-i-missed-my-stop/sharp type recall has fallback choices
  ok  english-a1-practical-3-010-i-missed-my-stop/sharp speak target has cue
  ok  english-a1-practical-3-010-i-missed-my-stop/sharp speak target phrase is compatible with core phrase
  ok  english-a1-practical-3-010-i-missed-my-stop/sharp speak language is supported
  ok  english-a1-practical-3-010-i-missed-my-stop/sharp speak threshold is usable
  ok  english-a1-practical-3-010-i-missed-my-stop/sharp scene caption exists
  ok  english-a1-practical-3-010-i-missed-my-stop/sharp trophy word is complete
  ok  english-a1-practical-3-010-i-missed-my-stop/sharp placeholder media exists
  ok  english-a1-practical-3-010-i-missed-my-stop/sharp song seed exists
  ok  english-a1-practical-3-010-i-missed-my-stop/sharp visual notes exist

[type recall polish]
  ok  english-a1-practical-001-first-contact/bright type recall avoids low-value final-word target
  ok  english-a1-practical-001-first-contact/bright type recall answer appears in the visible phrase
  ok  english-a1-practical-001-first-contact/bright speak cue is learner-facing German
  ok  english-a1-practical-001-first-contact/wistful type recall avoids low-value final-word target
  ok  english-a1-practical-001-first-contact/wistful type recall answer appears in the visible phrase
  ok  english-a1-practical-001-first-contact/wistful speak cue is learner-facing German
  ok  english-a1-practical-001-first-contact/sharp type recall avoids low-value final-word target
  ok  english-a1-practical-001-first-contact/sharp type recall answer appears in the visible phrase
  ok  english-a1-practical-001-first-contact/sharp speak cue is learner-facing German
  ok  english-a1-practical-002-polite-follow-up/bright type recall avoids low-value final-word target
  ok  english-a1-practical-002-polite-follow-up/bright type recall answer appears in the visible phrase
  ok  english-a1-practical-002-polite-follow-up/bright speak cue is learner-facing German
  ok  english-a1-practical-002-polite-follow-up/wistful type recall avoids low-value final-word target
  ok  english-a1-practical-002-polite-follow-up/wistful type recall answer appears in the visible phrase
  ok  english-a1-practical-002-polite-follow-up/wistful speak cue is learner-facing German
  ok  english-a1-practical-002-polite-follow-up/sharp type recall avoids low-value final-word target
  ok  english-a1-practical-002-polite-follow-up/sharp type recall answer appears in the visible phrase
  ok  english-a1-practical-002-polite-follow-up/sharp speak cue is learner-facing German
  ok  english-a1-practical-003-where-is/bright type recall avoids low-value final-word target
  ok  english-a1-practical-003-where-is/bright type recall answer appears in the visible phrase
  ok  english-a1-practical-003-where-is/bright speak cue is learner-facing German
  ok  english-a1-practical-003-where-is/wistful type recall avoids low-value final-word target
  ok  english-a1-practical-003-where-is/wistful type recall answer appears in the visible phrase
  ok  english-a1-practical-003-where-is/wistful speak cue is learner-facing German
  ok  english-a1-practical-003-where-is/sharp type recall avoids low-value final-word target
  ok  english-a1-practical-003-where-is/sharp type recall answer appears in the visible phrase
  ok  english-a1-practical-003-where-is/sharp speak cue is learner-facing German
  ok  english-a1-practical-004-id-like/bright type recall avoids low-value final-word target
  ok  english-a1-practical-004-id-like/bright type recall answer appears in the visible phrase
  ok  english-a1-practical-004-id-like/bright speak cue is learner-facing German
  ok  english-a1-practical-004-id-like/wistful type recall avoids low-value final-word target
  ok  english-a1-practical-004-id-like/wistful type recall answer appears in the visible phrase
  ok  english-a1-practical-004-id-like/wistful speak cue is learner-facing German
  ok  english-a1-practical-004-id-like/sharp type recall avoids low-value final-word target
  ok  english-a1-practical-004-id-like/sharp type recall answer appears in the visible phrase
  ok  english-a1-practical-004-id-like/sharp speak cue is learner-facing German
  ok  english-a1-practical-005-how-much/bright type recall avoids low-value final-word target
  ok  english-a1-practical-005-how-much/bright type recall answer appears in the visible phrase
  ok  english-a1-practical-005-how-much/bright speak cue is learner-facing German
  ok  english-a1-practical-005-how-much/wistful type recall avoids low-value final-word target
  ok  english-a1-practical-005-how-much/wistful type recall answer appears in the visible phrase
  ok  english-a1-practical-005-how-much/wistful speak cue is learner-facing German
  ok  english-a1-practical-005-how-much/sharp type recall avoids low-value final-word target
  ok  english-a1-practical-005-how-much/sharp type recall answer appears in the visible phrase
  ok  english-a1-practical-005-how-much/sharp speak cue is learner-facing German
  ok  english-a1-practical-006-the-train/bright type recall avoids low-value final-word target
  ok  english-a1-practical-006-the-train/bright type recall answer appears in the visible phrase
  ok  english-a1-practical-006-the-train/bright speak cue is learner-facing German
  ok  english-a1-practical-006-the-train/wistful type recall avoids low-value final-word target
  ok  english-a1-practical-006-the-train/wistful type recall answer appears in the visible phrase
  ok  english-a1-practical-006-the-train/wistful speak cue is learner-facing German
  ok  english-a1-practical-006-the-train/sharp type recall avoids low-value final-word target
  ok  english-a1-practical-006-the-train/sharp type recall answer appears in the visible phrase
  ok  english-a1-practical-006-the-train/sharp speak cue is learner-facing German
  ok  english-a1-practical-007-i-need/bright type recall avoids low-value final-word target
  ok  english-a1-practical-007-i-need/bright type recall answer appears in the visible phrase
  ok  english-a1-practical-007-i-need/bright speak cue is learner-facing German
  ok  english-a1-practical-007-i-need/wistful type recall avoids low-value final-word target
  ok  english-a1-practical-007-i-need/wistful type recall answer appears in the visible phrase
  ok  english-a1-practical-007-i-need/wistful speak cue is learner-facing German
  ok  english-a1-practical-007-i-need/sharp type recall avoids low-value final-word target
  ok  english-a1-practical-007-i-need/sharp type recall answer appears in the visible phrase
  ok  english-a1-practical-007-i-need/sharp speak cue is learner-facing German
  ok  english-a1-practical-008-i-like/bright type recall avoids low-value final-word target
  ok  english-a1-practical-008-i-like/bright type recall answer appears in the visible phrase
  ok  english-a1-practical-008-i-like/bright speak cue is learner-facing German
  ok  english-a1-practical-008-i-like/wistful type recall avoids low-value final-word target
  ok  english-a1-practical-008-i-like/wistful type recall answer appears in the visible phrase
  ok  english-a1-practical-008-i-like/wistful speak cue is learner-facing German
  ok  english-a1-practical-008-i-like/sharp type recall avoids low-value final-word target
  ok  english-a1-practical-008-i-like/sharp type recall answer appears in the visible phrase
  ok  english-a1-practical-008-i-like/sharp speak cue is learner-facing German
  ok  english-a1-practical-009-tomorrow-at-seven/bright type recall avoids low-value final-word target
  ok  english-a1-practical-009-tomorrow-at-seven/bright type recall answer appears in the visible phrase
  ok  english-a1-practical-009-tomorrow-at-seven/bright speak cue is learner-facing German
  ok  english-a1-practical-009-tomorrow-at-seven/wistful type recall avoids low-value final-word target
  ok  english-a1-practical-009-tomorrow-at-seven/wistful type recall answer appears in the visible phrase
  ok  english-a1-practical-009-tomorrow-at-seven/wistful speak cue is learner-facing German
  ok  english-a1-practical-009-tomorrow-at-seven/sharp type recall avoids low-value final-word target
  ok  english-a1-practical-009-tomorrow-at-seven/sharp type recall answer appears in the visible phrase
  ok  english-a1-practical-009-tomorrow-at-seven/sharp speak cue is learner-facing German
  ok  english-a1-practical-010-thank-you-goodbye/bright type recall avoids low-value final-word target
  ok  english-a1-practical-010-thank-you-goodbye/bright type recall answer appears in the visible phrase
  ok  english-a1-practical-010-thank-you-goodbye/bright speak cue is learner-facing German
  ok  english-a1-practical-010-thank-you-goodbye/wistful type recall avoids low-value final-word target
  ok  english-a1-practical-010-thank-you-goodbye/wistful type recall answer appears in the visible phrase
  ok  english-a1-practical-010-thank-you-goodbye/wistful speak cue is learner-facing German
  ok  english-a1-practical-010-thank-you-goodbye/sharp type recall avoids low-value final-word target
  ok  english-a1-practical-010-thank-you-goodbye/sharp type recall answer appears in the visible phrase
  ok  english-a1-practical-010-thank-you-goodbye/sharp speak cue is learner-facing German
  ok  english-a1-practical-2-001-i-dont-understand/bright type recall avoids low-value final-word target
  ok  english-a1-practical-2-001-i-dont-understand/bright type recall answer appears in the visible phrase
  ok  english-a1-practical-2-001-i-dont-understand/bright speak cue is learner-facing German
  ok  english-a1-practical-2-001-i-dont-understand/wistful type recall avoids low-value final-word target
  ok  english-a1-practical-2-001-i-dont-understand/wistful type recall answer appears in the visible phrase
  ok  english-a1-practical-2-001-i-dont-understand/wistful speak cue is learner-facing German
  ok  english-a1-practical-2-001-i-dont-understand/sharp type recall avoids low-value final-word target
  ok  english-a1-practical-2-001-i-dont-understand/sharp type recall answer appears in the visible phrase
  ok  english-a1-practical-2-001-i-dont-understand/sharp speak cue is learner-facing German
  ok  english-a1-practical-2-002-write-it-down/bright type recall avoids low-value final-word target
  ok  english-a1-practical-2-002-write-it-down/bright type recall answer appears in the visible phrase
  ok  english-a1-practical-2-002-write-it-down/bright speak cue is learner-facing German
  ok  english-a1-practical-2-002-write-it-down/wistful type recall avoids low-value final-word target
  ok  english-a1-practical-2-002-write-it-down/wistful type recall answer appears in the visible phrase
  ok  english-a1-practical-2-002-write-it-down/wistful speak cue is learner-facing German
  ok  english-a1-practical-2-002-write-it-down/sharp type recall avoids low-value final-word target
  ok  english-a1-practical-2-002-write-it-down/sharp type recall answer appears in the visible phrase
  ok  english-a1-practical-2-002-write-it-down/sharp speak cue is learner-facing German
  ok  english-a1-practical-2-003-show-me/bright type recall avoids low-value final-word target
  ok  english-a1-practical-2-003-show-me/bright type recall answer appears in the visible phrase
  ok  english-a1-practical-2-003-show-me/bright speak cue is learner-facing German
  ok  english-a1-practical-2-003-show-me/wistful type recall avoids low-value final-word target
  ok  english-a1-practical-2-003-show-me/wistful type recall answer appears in the visible phrase
  ok  english-a1-practical-2-003-show-me/wistful speak cue is learner-facing German
  ok  english-a1-practical-2-003-show-me/sharp type recall avoids low-value final-word target
  ok  english-a1-practical-2-003-show-me/sharp type recall answer appears in the visible phrase
  ok  english-a1-practical-2-003-show-me/sharp speak cue is learner-facing German
  ok  english-a1-practical-2-004-which-one/bright type recall avoids low-value final-word target
  ok  english-a1-practical-2-004-which-one/bright type recall answer appears in the visible phrase
  ok  english-a1-practical-2-004-which-one/bright speak cue is learner-facing German
  ok  english-a1-practical-2-004-which-one/wistful type recall avoids low-value final-word target
  ok  english-a1-practical-2-004-which-one/wistful type recall answer appears in the visible phrase
  ok  english-a1-practical-2-004-which-one/wistful speak cue is learner-facing German
  ok  english-a1-practical-2-004-which-one/sharp type recall avoids low-value final-word target
  ok  english-a1-practical-2-004-which-one/sharp type recall answer appears in the visible phrase
  ok  english-a1-practical-2-004-which-one/sharp speak cue is learner-facing German
  ok  english-a1-practical-2-005-do-you-have/bright type recall avoids low-value final-word target
  ok  english-a1-practical-2-005-do-you-have/bright type recall answer appears in the visible phrase
  ok  english-a1-practical-2-005-do-you-have/bright speak cue is learner-facing German
  ok  english-a1-practical-2-005-do-you-have/wistful type recall avoids low-value final-word target
  ok  english-a1-practical-2-005-do-you-have/wistful type recall answer appears in the visible phrase
  ok  english-a1-practical-2-005-do-you-have/wistful speak cue is learner-facing German
  ok  english-a1-practical-2-005-do-you-have/sharp type recall avoids low-value final-word target
  ok  english-a1-practical-2-005-do-you-have/sharp type recall answer appears in the visible phrase
  ok  english-a1-practical-2-005-do-you-have/sharp speak cue is learner-facing German
  ok  english-a1-practical-2-006-by-card/bright type recall avoids low-value final-word target
  ok  english-a1-practical-2-006-by-card/bright type recall answer appears in the visible phrase
  ok  english-a1-practical-2-006-by-card/bright speak cue is learner-facing German
  ok  english-a1-practical-2-006-by-card/wistful type recall avoids low-value final-word target
  ok  english-a1-practical-2-006-by-card/wistful type recall answer appears in the visible phrase
  ok  english-a1-practical-2-006-by-card/wistful speak cue is learner-facing German
  ok  english-a1-practical-2-006-by-card/sharp type recall avoids low-value final-word target
  ok  english-a1-practical-2-006-by-card/sharp type recall answer appears in the visible phrase
  ok  english-a1-practical-2-006-by-card/sharp speak cue is learner-facing German
  ok  english-a1-practical-2-007-a-receipt-please/bright type recall avoids low-value final-word target
  ok  english-a1-practical-2-007-a-receipt-please/bright type recall answer appears in the visible phrase
  ok  english-a1-practical-2-007-a-receipt-please/bright speak cue is learner-facing German
  ok  english-a1-practical-2-007-a-receipt-please/wistful type recall avoids low-value final-word target
  ok  english-a1-practical-2-007-a-receipt-please/wistful type recall answer appears in the visible phrase
  ok  english-a1-practical-2-007-a-receipt-please/wistful speak cue is learner-facing German
  ok  english-a1-practical-2-007-a-receipt-please/sharp type recall avoids low-value final-word target
  ok  english-a1-practical-2-007-a-receipt-please/sharp type recall answer appears in the visible phrase
  ok  english-a1-practical-2-007-a-receipt-please/sharp speak cue is learner-facing German
  ok  english-a1-practical-2-008-i-have-a-reservation/bright type recall avoids low-value final-word target
  ok  english-a1-practical-2-008-i-have-a-reservation/bright type recall answer appears in the visible phrase
  ok  english-a1-practical-2-008-i-have-a-reservation/bright speak cue is learner-facing German
  ok  english-a1-practical-2-008-i-have-a-reservation/wistful type recall avoids low-value final-word target
  ok  english-a1-practical-2-008-i-have-a-reservation/wistful type recall answer appears in the visible phrase
  ok  english-a1-practical-2-008-i-have-a-reservation/wistful speak cue is learner-facing German
  ok  english-a1-practical-2-008-i-have-a-reservation/sharp type recall avoids low-value final-word target
  ok  english-a1-practical-2-008-i-have-a-reservation/sharp type recall answer appears in the visible phrase
  ok  english-a1-practical-2-008-i-have-a-reservation/sharp speak cue is learner-facing German
  ok  english-a1-practical-2-009-is-this-right/bright type recall avoids low-value final-word target
  ok  english-a1-practical-2-009-is-this-right/bright type recall answer appears in the visible phrase
  ok  english-a1-practical-2-009-is-this-right/bright speak cue is learner-facing German
  ok  english-a1-practical-2-009-is-this-right/wistful type recall avoids low-value final-word target
  ok  english-a1-practical-2-009-is-this-right/wistful type recall answer appears in the visible phrase
  ok  english-a1-practical-2-009-is-this-right/wistful speak cue is learner-facing German
  ok  english-a1-practical-2-009-is-this-right/sharp type recall avoids low-value final-word target
  ok  english-a1-practical-2-009-is-this-right/sharp type recall answer appears in the visible phrase
  ok  english-a1-practical-2-009-is-this-right/sharp speak cue is learner-facing German
  ok  english-a1-practical-2-010-one-moment/bright type recall avoids low-value final-word target
  ok  english-a1-practical-2-010-one-moment/bright type recall answer appears in the visible phrase
  ok  english-a1-practical-2-010-one-moment/bright speak cue is learner-facing German
  ok  english-a1-practical-2-010-one-moment/wistful type recall avoids low-value final-word target
  ok  english-a1-practical-2-010-one-moment/wistful type recall answer appears in the visible phrase
  ok  english-a1-practical-2-010-one-moment/wistful speak cue is learner-facing German
  ok  english-a1-practical-2-010-one-moment/sharp type recall avoids low-value final-word target
  ok  english-a1-practical-2-010-one-moment/sharp type recall answer appears in the visible phrase
  ok  english-a1-practical-2-010-one-moment/sharp speak cue is learner-facing German
  ok  english-a1-practical-3-001-right-or-left/bright type recall avoids low-value final-word target
  ok  english-a1-practical-3-001-right-or-left/bright type recall answer appears in the visible phrase
  ok  english-a1-practical-3-001-right-or-left/bright speak cue is learner-facing German
  ok  english-a1-practical-3-001-right-or-left/wistful type recall avoids low-value final-word target
  ok  english-a1-practical-3-001-right-or-left/wistful type recall answer appears in the visible phrase
  ok  english-a1-practical-3-001-right-or-left/wistful speak cue is learner-facing German
  ok  english-a1-practical-3-001-right-or-left/sharp type recall avoids low-value final-word target
  ok  english-a1-practical-3-001-right-or-left/sharp type recall answer appears in the visible phrase
  ok  english-a1-practical-3-001-right-or-left/sharp speak cue is learner-facing German
  ok  english-a1-practical-3-002-how-far-is-it/bright type recall avoids low-value final-word target
  ok  english-a1-practical-3-002-how-far-is-it/bright type recall answer appears in the visible phrase
  ok  english-a1-practical-3-002-how-far-is-it/bright speak cue is learner-facing German
  ok  english-a1-practical-3-002-how-far-is-it/wistful type recall avoids low-value final-word target
  ok  english-a1-practical-3-002-how-far-is-it/wistful type recall answer appears in the visible phrase
  ok  english-a1-practical-3-002-how-far-is-it/wistful speak cue is learner-facing German
  ok  english-a1-practical-3-002-how-far-is-it/sharp type recall avoids low-value final-word target
  ok  english-a1-practical-3-002-how-far-is-it/sharp type recall answer appears in the visible phrase
  ok  english-a1-practical-3-002-how-far-is-it/sharp speak cue is learner-facing German
  ok  english-a1-practical-3-003-is-it-open/bright type recall avoids low-value final-word target
  ok  english-a1-practical-3-003-is-it-open/bright type recall answer appears in the visible phrase
  ok  english-a1-practical-3-003-is-it-open/bright speak cue is learner-facing German
  ok  english-a1-practical-3-003-is-it-open/wistful type recall avoids low-value final-word target
  ok  english-a1-practical-3-003-is-it-open/wistful type recall answer appears in the visible phrase
  ok  english-a1-practical-3-003-is-it-open/wistful speak cue is learner-facing German
  ok  english-a1-practical-3-003-is-it-open/sharp type recall avoids low-value final-word target
  ok  english-a1-practical-3-003-is-it-open/sharp type recall answer appears in the visible phrase
  ok  english-a1-practical-3-003-is-it-open/sharp speak cue is learner-facing German
  ok  english-a1-practical-3-004-which-bus/bright type recall avoids low-value final-word target
  ok  english-a1-practical-3-004-which-bus/bright type recall answer appears in the visible phrase
  ok  english-a1-practical-3-004-which-bus/bright speak cue is learner-facing German
  ok  english-a1-practical-3-004-which-bus/wistful type recall avoids low-value final-word target
  ok  english-a1-practical-3-004-which-bus/wistful type recall answer appears in the visible phrase
  ok  english-a1-practical-3-004-which-bus/wistful speak cue is learner-facing German
  ok  english-a1-practical-3-004-which-bus/sharp type recall avoids low-value final-word target
  ok  english-a1-practical-3-004-which-bus/sharp type recall answer appears in the visible phrase
  ok  english-a1-practical-3-004-which-bus/sharp speak cue is learner-facing German
  ok  english-a1-practical-3-005-the-next-stop/bright type recall avoids low-value final-word target
  ok  english-a1-practical-3-005-the-next-stop/bright type recall answer appears in the visible phrase
  ok  english-a1-practical-3-005-the-next-stop/bright speak cue is learner-facing German
  ok  english-a1-practical-3-005-the-next-stop/wistful type recall avoids low-value final-word target
  ok  english-a1-practical-3-005-the-next-stop/wistful type recall answer appears in the visible phrase
  ok  english-a1-practical-3-005-the-next-stop/wistful speak cue is learner-facing German
  ok  english-a1-practical-3-005-the-next-stop/sharp type recall avoids low-value final-word target
  ok  english-a1-practical-3-005-the-next-stop/sharp type recall answer appears in the visible phrase
  ok  english-a1-practical-3-005-the-next-stop/sharp speak cue is learner-facing German
  ok  english-a1-practical-3-006-a-ticket-please/bright type recall avoids low-value final-word target
  ok  english-a1-practical-3-006-a-ticket-please/bright type recall answer appears in the visible phrase
  ok  english-a1-practical-3-006-a-ticket-please/bright speak cue is learner-facing German
  ok  english-a1-practical-3-006-a-ticket-please/wistful type recall avoids low-value final-word target
  ok  english-a1-practical-3-006-a-ticket-please/wistful type recall answer appears in the visible phrase
  ok  english-a1-practical-3-006-a-ticket-please/wistful speak cue is learner-facing German
  ok  english-a1-practical-3-006-a-ticket-please/sharp type recall avoids low-value final-word target
  ok  english-a1-practical-3-006-a-ticket-please/sharp type recall answer appears in the visible phrase
  ok  english-a1-practical-3-006-a-ticket-please/sharp speak cue is learner-facing German
  ok  english-a1-practical-3-007-what-time-does-it-close/bright type recall avoids low-value final-word target
  ok  english-a1-practical-3-007-what-time-does-it-close/bright type recall answer appears in the visible phrase
  ok  english-a1-practical-3-007-what-time-does-it-close/bright speak cue is learner-facing German
  ok  english-a1-practical-3-007-what-time-does-it-close/wistful type recall avoids low-value final-word target
  ok  english-a1-practical-3-007-what-time-does-it-close/wistful type recall answer appears in the visible phrase
  ok  english-a1-practical-3-007-what-time-does-it-close/wistful speak cue is learner-facing German
  ok  english-a1-practical-3-007-what-time-does-it-close/sharp type recall avoids low-value final-word target
  ok  english-a1-practical-3-007-what-time-does-it-close/sharp type recall answer appears in the visible phrase
  ok  english-a1-practical-3-007-what-time-does-it-close/sharp speak cue is learner-facing German
  ok  english-a1-practical-3-008-the-corner/bright type recall avoids low-value final-word target
  ok  english-a1-practical-3-008-the-corner/bright type recall answer appears in the visible phrase
  ok  english-a1-practical-3-008-the-corner/bright speak cue is learner-facing German
  ok  english-a1-practical-3-008-the-corner/wistful type recall avoids low-value final-word target
  ok  english-a1-practical-3-008-the-corner/wistful type recall answer appears in the visible phrase
  ok  english-a1-practical-3-008-the-corner/wistful speak cue is learner-facing German
  ok  english-a1-practical-3-008-the-corner/sharp type recall avoids low-value final-word target
  ok  english-a1-practical-3-008-the-corner/sharp type recall answer appears in the visible phrase
  ok  english-a1-practical-3-008-the-corner/sharp speak cue is learner-facing German
  ok  english-a1-practical-3-009-by-foot-or-by-taxi/bright type recall avoids low-value final-word target
  ok  english-a1-practical-3-009-by-foot-or-by-taxi/bright type recall answer appears in the visible phrase
  ok  english-a1-practical-3-009-by-foot-or-by-taxi/bright speak cue is learner-facing German
  ok  english-a1-practical-3-009-by-foot-or-by-taxi/wistful type recall avoids low-value final-word target
  ok  english-a1-practical-3-009-by-foot-or-by-taxi/wistful type recall answer appears in the visible phrase
  ok  english-a1-practical-3-009-by-foot-or-by-taxi/wistful speak cue is learner-facing German
  ok  english-a1-practical-3-009-by-foot-or-by-taxi/sharp type recall avoids low-value final-word target
  ok  english-a1-practical-3-009-by-foot-or-by-taxi/sharp type recall answer appears in the visible phrase
  ok  english-a1-practical-3-009-by-foot-or-by-taxi/sharp speak cue is learner-facing German
  ok  english-a1-practical-3-010-i-missed-my-stop/bright type recall avoids low-value final-word target
  ok  english-a1-practical-3-010-i-missed-my-stop/bright type recall answer appears in the visible phrase
  ok  english-a1-practical-3-010-i-missed-my-stop/bright speak cue is learner-facing German
  ok  english-a1-practical-3-010-i-missed-my-stop/wistful type recall avoids low-value final-word target
  ok  english-a1-practical-3-010-i-missed-my-stop/wistful type recall answer appears in the visible phrase
  ok  english-a1-practical-3-010-i-missed-my-stop/wistful speak cue is learner-facing German
  ok  english-a1-practical-3-010-i-missed-my-stop/sharp type recall avoids low-value final-word target
  ok  english-a1-practical-3-010-i-missed-my-stop/sharp type recall answer appears in the visible phrase
  ok  english-a1-practical-3-010-i-missed-my-stop/sharp speak cue is learner-facing German
  ok  lesson 1 Bright recalls speak, not English

[A1 Practical 2 content polish]
  ok  A1 Practical 2 bright trophy words are distinct
  ok  A1 Practical 2 bright uses at least three opener families
  ok  A1 Practical 2 wistful trophy words are distinct
  ok  A1 Practical 2 wistful uses at least three opener families
  ok  A1 Practical 2 sharp trophy words are distinct
  ok  A1 Practical 2 sharp uses at least three opener families
  ok  A1 Practical 2 lesson 1 stays distinct from A1 Practical 1 polite follow-up

[A1 Practical 3 content polish]
  ok  A1 Practical 3 bright trophy words are distinct
  ok  A1 Practical 3 bright uses at least three opener families
  ok  A1 Practical 3 wistful trophy words are distinct
  ok  A1 Practical 3 wistful uses at least three opener families
  ok  A1 Practical 3 sharp trophy words are distinct
  ok  A1 Practical 3 sharp uses at least three opener families

[vibe resolution]
  ok  current lesson defaults to lesson 1 Bright
  ok  invalid selected vibe falls back to Bright
  ok  future selected vibe falls back to Bright
  ok  bright resolves for lesson 1
  ok  wistful resolves for lesson 1
  ok  sharp resolves for lesson 1

[path helpers]
  ok  first incomplete helper starts at lesson 1 with no progress
  ok  first incomplete helper advances after lesson-level completion
  ok  next lesson helper advances by lesson id

[lesson mechanics]
  ok  matching pairs exist for each core phrase chunk
  ok  type fallback choices include one correct answer
  ok  review choices can be generated for hi-there
  ok  review choices can be generated for do-you-speak
  ok  review choices can be generated for english
  ok  review choices can be generated for delighted
  ok  review choices can be generated for glad
  ok  known-item filtering excludes marked lesson items
  ok  speech word-overlap helper passes close transcript
  ok  speech word-overlap helper fails wrong transcript

[local progress]
  ok  progress key is user-scoped
  ok  empty progress starts at schema version 2
  ok  complete status is stored at lesson level
  ok  skip status is stored at lesson level
  ok  restart clears only the lesson progress entry
  ok  completing a lesson records the active vibe completion
  ok  completing one vibe keeps the lesson complete overall
  ok  uncompleted selected vibe stays startable even when lesson is complete overall
  ok  completed vibe ids include only completed active vibes
  ok  additional vibe completion keeps one overall lesson completion
  ok  additional vibe completion appends badge-ready active vibe ids
  ok  no raw typed recall answers are stored
  ok  no raw speech transcripts are stored
  ok  completion lines include type and speak summaries
  ok  completion summary supports no known items
  ok  path progress does not mix A1 Practical 1 and A1 Practical 2 counts
  ok  vibe completion badges are path and lesson scoped
  ok  path progress does not mix A1 Practical 3 with earlier paths

[local progress migration]
  ok  legacy schema v1 localStorage is migrated to schema version 2
  ok  legacy schema v1 completed lesson remains complete overall
  ok  legacy schema v1 does not invent per-vibe badges
  ok  legacy single-path progress is migrated to A1 Practical 1 path id
  ok  legacy single-path progress key is removed after migration
  ok  written localStorage progress uses schema version 2

2697 passed, 0 failed

```

### npx tsx scripts/test-checkpoint-selection.ts
```text

[distribution]
  ok  one completed path yields 8 checkpoint items
  ok  one completed path samples only that path
  ok  two completed paths yields 8 checkpoint items
  ok  two completed paths split 4/4
  ok  three completed paths yields 8 checkpoint items
  ok  three completed paths split 3/3/2 with newest path on the floor
  ok  multi-path checkpoint order avoids adjacent same-path items where possible

[vibe filtering]
  ok  selection pool filters by active vibe only
  ok  selected items preserve the active vibe

[edge cases]
  ok  pool under 8 items does not build a checkpoint plan

10 passed, 0 failed

```

### npx tsx scripts/test-checkpoint-trigger.ts
```text

[path completion trigger]
  ok  empty progress has zero completed checkpoint paths
  ok  empty progress has no pending checkpoint
  ok  one fully completed active-vibe path counts as complete
  ok  one completed path and zero checkpoints triggers Quick Review
  ok  one completed path and one checkpoint does not trigger another Quick Review
  ok  partial second path does not advance completed path count
  ok  path completed in another vibe does not count for active vibe
  ok  same progress can trigger for the vibe that completed the second path

8 passed, 0 failed

```

### npx tsx scripts/test-checkpoint-storage.ts
```text

[keys and counts]
  ok  checkpoint key follows locked shape
  ok  empty storage has zero Bright checkpoints
  ok  first Bright checkpoint index is 0

[completion write]
  ok  completion writes index 0 record
  ok  completion record stores timestamp
  ok  completion record stores item count
  ok  completion record stores first-try total
  ok  completion record stores item review flags
  ok  read record round-trips the stored shape
  ok  Bright count advances after first completion
  ok  next Bright checkpoint index advances to 1
  ok  Wistful count is independent
  ok  second Bright completion writes index 1
  ok  second Bright completion uses independent timestamp
  ok  Bright count advances after second completion

15 passed, 0 failed

```

### npm run check:i18n
```text

> frontend@0.0.0 check:i18n
> tsx scripts/check-i18n-coverage.ts

[i18n] Source locale en: 932 keys
[i18n] de: 932/932 keys covered
node.exe : [i18n] fr: 920/932 keys covered. Missing keys are warn-only for now because French gaps are known and out
of scope for the German Phase 0 PR:
At line:1 char:1
+ & "D:\programs\nodejs/node.exe" "C:\Users\micha\AppData\Roaming\npm/n ...
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : NotSpecified: ([i18n] fr: 920/...man Phase 0 PR::String) [], RemoteException
    + FullyQualifiedErrorId : NativeCommandError

  - speak.newChatConfirmAction
  - speak.newChatConfirmDescription
  - speak.newChatConfirmTitle
  - speak.studyModeOffToast
  - speak.studyModeOnToast
  - today.trophyWord.exampleLabel
  - today.trophyWord.title
  - today.trophyWord.whyLabel
  - today.vibeIndicator
  - today.vibePicker.exampleLabel
  - today.vibePicker.subtitle
  - today.vibePicker.title

```

### npx eslint src/App.tsx src/pages/Today.tsx src/pages/GuidedCheckpoint.tsx src/components/today/TodayPathOverview.tsx src/components/today/CheckpointCard.tsx src/lib/guidedCheckpoint.ts scripts/test-guided-today-path-overview.ts scripts/test-checkpoint-selection.ts scripts/test-checkpoint-trigger.ts scripts/test-checkpoint-storage.ts
```text
(no output)
```

### npm run build
```text

> frontend@0.0.0 build
> tsc -b && vite build

[36mvite v8.0.1 [32mbuilding client environment for production...[36m[39m
[2K
transforming...✓ 2672 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                                     0.99 kB │ gzip:   0.51 kB
dist/assets/snowflake-DiwprGFY.png                  4.54 kB
dist/assets/video-137WtEx7.webp                     5.99 kB
dist/assets/canvas-aAY58ULU.webp                    7.61 kB
dist/assets/cards-CMuwZvTJ.webp                    10.65 kB
dist/assets/audio-DNhMG2SU.webp                    12.50 kB
dist/assets/mist-puff-C3fzo7QJ.png                 13.15 kB
dist/assets/breath-ring-DUEAFD-l.png               22.84 kB
dist/assets/card-frame-YV9z3bk6.png                78.89 kB
dist/assets/spirit-D2fpQXTs.png                   198.41 kB
dist/assets/ambient-01-stillwater-DvVqtN7z.mp3    481.11 kB
dist/assets/ambient-02-rainfall-B09kyyIG.mp3      481.11 kB
dist/assets/ambient-03-aurora-BdLDVUO7.mp3        481.11 kB
dist/assets/ambient-04-driftwood-uqcEjwyo.mp3     481.11 kB
dist/assets/ambient-05-tideline-BcLzRbRd.mp3      481.11 kB
dist/assets/ambient-06-geode-Cl1c3Kcc.mp3         481.11 kB
dist/assets/ambient-07-embers-CJ9fImnL.mp3        481.11 kB
dist/assets/ambient-08-mistwood-DhufxPQN.mp3      481.11 kB
dist/assets/ambient-09-solstice-BTPUrVfg.mp3      481.11 kB
dist/assets/ambient-10-reverie-yURoN8N-.mp3       481.11 kB
dist/assets/01_ahnen-DYT4wTmY.png               1,141.70 kB
dist/assets/03_paa-BmMwDwg0.png                 1,199.64 kB
dist/assets/10_zoom-eZS4E40j.png                1,211.00 kB
dist/assets/04_fernweh-CNDpIUBb.png             1,212.63 kB
dist/assets/11_azul-CQtFfzH4.png                1,280.94 kB
dist/assets/07_eventually-BKMm4Q93.png          1,388.67 kB
dist/assets/12_tito-b7OafNSf.png                1,402.78 kB
dist/assets/02_saudade-DpWSQv8l.png             1,409.31 kB
dist/assets/09_too-DYI5Ji7Z.png                 1,411.50 kB
dist/assets/08_omotenashi-Da1ztGP1.png          1,467.94 kB
dist/assets/05_mukluk-mukluk-BVpUq8NC.png       1,526.01 kB
dist/assets/06_tomar-el-pelo-DQoOxOEz.png       1,566.12 kB
dist/assets/spirit-sheet-DcuDh0qf.png           2,135.01 kB
dist/assets/bg-01-stillwater-B4yUiNeN.png       2,384.08 kB
dist/assets/bg-08-mistwood-ys8x9JSM.png         2,558.47 kB
dist/assets/bg-02-rainfall-BbuGqcxq.png         2,733.78 kB
dist/assets/bg-04-driftwood-DuOLVdHT.png        2,788.69 kB
dist/assets/bg-03-aurora-BDUd8PI3.png           2,919.90 kB
dist/assets/bg-05-tideline-CwQyBHHb.png         3,010.06 kB
dist/assets/bg-09-solstice-p1zPp6F2.png         3,031.88 kB
dist/assets/bg-06-geode-DCxLV6cs.png            3,071.23 kB
dist/assets/bg-07-embers-CWT3H3r7.png           3,124.36 kB
dist/assets/bg-10-reverie-CZg8v1hd.png          3,580.30 kB
dist/assets/SlicerGame-Cf7YOpYN.css                 2.13 kB │ gzip:   0.97 kB
dist/assets/RunnerGame-DMXeAGkI.css                 9.73 kB │ gzip:   3.06 kB
dist/assets/index-B2rAYxBF.css                    375.25 kB │ gzip:  56.39 kB
dist/assets/rolldown-runtime-COnpUsM8.js            0.81 kB │ gzip:   0.46 kB
dist/assets/useRecordGameResult-Dm-4aEwC.js         4.08 kB │ gzip:   1.85 kB
dist/assets/SlicerGame-CQhdkLnu.js                 55.44 kB │ gzip:  16.33 kB
dist/assets/RunnerGame-Bcok3Hp7.js                112.83 kB │ gzip:  34.63 kB
dist/assets/index-Co7jfQps.js                     338.10 kB │ gzip: 102.10 kB
dist/assets/vendor-phaser-BYL-_S5J.js           1,198.74 kB │ gzip: 319.27 kB

node.exe : [33m[33m[INEFFECTIVE_DYNAMIC_IMPORT] Warning:[0m src/lib/supabase.ts is dynamically imported by
src/api.ts but also statically imported by src/components/AdminRoute.tsx, src/components/ProfileModal.tsx,
src/components/RedeemCodeDialog.tsx, src/components/deck/DeckPickerSheet.tsx,
src/components/generate/steps/CategoryPicker.tsx, ..., dynamic import will not move module into another chunk.
At line:1 char:1
+ & "D:\programs\nodejs/node.exe" "C:\Users\micha\AppData\Roaming\npm/n ...
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : NotSpecified: ([33m[33m[INEF... another chunk.:String) [], RemoteException
    + FullyQualifiedErrorId : NativeCommandError

[39m
[33m[plugin builtin:vite-reporter]
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rolldownOptions.output.codeSplitting to improve chunking:
https://rolldown.rs/reference/OutputOptions.codeSplitting
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.[39m
[32m✓ built in 1.06s[39m

```

### git diff --check
```text
(no output)
```

### git diff --cached --check
```text
(no output)
```
