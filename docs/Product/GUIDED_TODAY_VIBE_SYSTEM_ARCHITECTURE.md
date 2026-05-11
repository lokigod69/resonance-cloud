# Guided Today Vibe System Architecture

Date: 2026-05-11

## Product Principle

Guided Today lessons should keep the pedagogical situation stable while allowing the learner's selected voice to change how the lesson sounds and feels.

The invariant lesson answers:

- What situation is the learner in?
- What A1 skill is being practiced?
- Which session steps must be completed?
- Which lesson id receives progress?

The vibe variant answers:

- What is the core phrase in this voice?
- Which chunks does the learner match and build?
- Which typed recall prompt and answer are used?
- Which phrase is spoken?
- Which scene caption, media placeholder, trophy word, and later song seed fit the voice?

This supports the pitch: learn a language in your voice.

## Vibe Is Not Register

A vibe is not slang, formality, dialect, or a translation mode. It is a content personality layer over the same beginner-safe task.

For example, Lesson 1 stays "ask whether someone speaks English." Bright can phrase it as `Excuse me, do you speak English?`, Wistful can soften it to `Sorry, do you speak English?`, and Sharp can tighten it to `Can you speak English?`. All remain A1 practical and usable.

The vibe must never override the lesson's language level or situation. A poetic phrase that sounds Wistful but is not useful for an A1 learner is a failed variant.

## Progress Model

Progress remains lesson-level and vibe-agnostic.

The learner completes `english-a1-practical-001-first-contact`, not `lesson 1 bright` or `lesson 1 sharp`. Changing the selected vibe does not reset completion, skipped status, known item count, type attempts, or speak summary. The selected vibe is preference state, not progress state.

This keeps future persistence simple:

- One progress record per learner/path/lesson.
- One selected-vibe preference per learner/path or target language.
- No per-vibe completion fork unless a future product explicitly adds mastery by voice.

## Selected Vibe Scope

V0 stores the selected vibe locally per Guided Today path:

```text
resonance_guided_vibe__english-a1-practical
```

This is path-scoped, which is equivalent to target-language scoped for the current launch path. Later, if multiple English paths exist, product can decide whether to share a single English vibe preference or keep each path independent.

Missing, invalid, or future vibe ids resolve to `bright`.

## Why Static First

Static/local-first is intentional for V0:

- It proves the content architecture without schema churn.
- It avoids writing incomplete vibe concepts into Supabase.
- It keeps paid provider, generation, credits, decks, words, and jobs untouched.
- It allows editorial review of the character bibles before runtime generation exists.
- It keeps user privacy simple: no raw typed answers or speech transcripts are stored.

Backend persistence can be added after the authored static shape survives real lesson and UI review.

## Future Relationships

The same variant boundary can later feed:

- Videos: `videoUrl` or a placeholder per vibe variant.
- TTS: stock audio for the resolved core phrase, chunks, and trophy word.
- Songs: reserved `songSeed` per variant, used only after phase rewards exist.
- Themes: UI aesthetic notes can inform a later skin/theme layer, but V0 does not implement broad app theming.
- Generation: authoring tools can generate one vibe's 10 lessons at a time, then validate against this static contract.

## TypeScript-Oriented Data Model

```ts
type GuidedVibeId =
  | 'bright'
  | 'wistful'
  | 'sharp'
  | 'tender'
  | 'bold'
  | 'cheeky'

type GuidedVibe = {
  id: GuidedVibeId
  label: string
  shortDescription: string
  personalitySummary: string
  wordPalette: string[]
  signaturePhrasings: string[]
  exampleSentences: string[]
  sceneMoodNotes: string
  musicGenre: string
  uiAesthetic: string
  trophyWordCandidates: string[]
  status: 'active' | 'future'
}

type GuidedLessonDefinition = {
  id: string
  pathId: string
  lessonNumber: number
  title: string
  situation: {
    en: string
    de: string
  }
  pedagogicalGoal: string
  modeSet: 'guided-today-v0'
  steps: GuidedLessonStep[]
  estimatedMinutes: number
  fallbackVibeId: ActiveGuidedVibeId
  status: 'active' | 'coming-soon'
  vibeVariants: Partial<Record<ActiveGuidedVibeId, GuidedLessonVibeVariant>>
}

type GuidedLessonVibeVariant = {
  contentStatus: 'final' | 'draft'
  corePhrase: {
    targetText: string
    baseText: string
  }
  meaning: string
  chunks: PhraseChunk[]
  lessonItems: LessonItem[]
  build: {
    targetText: string
    chips: string[]
  }
  typeRecall: {
    before: string
    answer: string
    after: string
    acceptedAnswers: string[]
    fallbackChoices: string[]
  }
  speakTarget: {
    baseCue: string
    targetPhrase: string
    language: 'en-US' | 'en-GB'
    passingThreshold: number
  }
  sceneCaption: string
  trophyWord: {
    word: string
    meaning: string
    example: string
    whyThisWord: string
  }
  videoUrl?: string
  placeholderMedia?: {
    type?: 'image' | 'video' | 'music_video'
    url?: string
    posterUrl?: string
    caption?: string
  }
  songSeed?: {
    genre: string
    mood: string
  }
  visualNotes?: string
}
```

## V0 Resolution

The UI does not consume raw definitions directly. It resolves:

```ts
resolveGuidedLessonVariant(lessonDefinition, selectedVibeId)
```

The resolver:

- rejects invalid and future ids by falling back to `bright`
- falls back to the lesson's `fallbackVibeId` if a requested active variant is missing
- materializes the existing UI-facing fields such as `corePhrase`, `phraseChunks`, `lessonMedia`, `typeRecall`, and `speak`

This keeps Lesson 1 working while moving the source of truth into a variant-capable shape.
