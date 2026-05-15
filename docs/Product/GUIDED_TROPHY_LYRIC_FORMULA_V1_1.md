# Guided Trophy Lyric Formula V1.1

## Purpose

Formula V1.1 preserves the current Guided Trophy Song architecture while improving the next lyric-generation pass.

This document does not rewrite A1P1. It defines the lyric standard to use for future trophy-song writing, especially A1P2-A1P5, and for any later A1P1 revision pass if product review requests one.

## Preserve From V0

### Music Caption Strategy

Keep the existing caption strategy:

- style family and song style label stay separate from vibe/voice
- `musicCaption` gives Suno/KIE production direction
- captions include tempo, vocal posture, instrumentation, diction targets, and negative constraints
- captions explicitly name the trophy words so the model lands them cleanly
- captions do not replace lyric craft; they guide arrangement and vocal delivery

### One Canonical Song Per Trophy Set

Each `(pathId, segment, vibe)` trophy set has one canonical authored song.

Audio may have Candidate A/B generations for review, but both candidates are performances of the same canonical lyric and study metadata.

### One Wrapped Study Occurrence Per Trophy Word

Each trophy word must have exactly one wrapped study occurrence:

`<<word>>`

For a five-word trophy set, the raw lyric must contain exactly five wrapped occurrences. Each wrapped occurrence derives one cloze/study position.

### Wrapper Separation

`rawLyricsWithWrappers` is app-side metadata only.

`providerLyrics` is the Suno/KIE input and must strip all wrappers before submit.

Learners see `displayLyrics`, not provider metadata and not wrapper markup.

### Provider Safety Rule

Never send `<<` or `>>` to Suno/KIE.

Generation scripts and validation should continue to fail before submit if `providerLyrics` contains wrapper markers.

## Improve In V1.1

### One Highlight Trophy Word Per Song

When suitable, choose one trophy word as the song's memory anchor.

That word may appear in the hook or chorus more than once, but only one occurrence is wrapped. The unwrapped repetitions reinforce memory without creating extra study positions.

Use this only when it fits the voice and song. Do not force a highlight word if all five words need equal weight.

### Stronger Hook And Chorus Repetition

Write songs around a memorable repeated phrase, not only a linear scene.

The hook should be short enough to remember and should survive without reading the whole lyric. Repetition is allowed when it creates a real song shape.

Good target:

- a chorus line that repeats with slight variation
- a bridge or outro that returns to the hook
- one phrase the learner can hum or quote after playback

Avoid:

- five disconnected example lines
- pure narrative recaps with no repeated anchor
- chorus sections that introduce new information but do not hook

### Rhythmic And Phonetic Placement

Place trophy words where a singer can deliver them clearly.

Prefer positions with:

- natural stress on the trophy word
- clean vowel or consonant landing
- enough surrounding space for A1 learners to hear the word
- phrase endings or repeated hook positions when the word is central

Avoid burying trophy words in fast connector phrases or awkward syntax.

### Unwrapped Repeated Trophy Words Are Allowed

A trophy word may repeat unwrapped after its single wrapped study occurrence.

Rules:

- exactly one wrapped occurrence per trophy word
- repeated unwrapped uses are allowed if musically useful
- unwrapped repeats must not confuse which line is the study line
- repeated words should strengthen memory, not pad the lyric

### Fewer Purely Narrative Lyrics

A lesson situation can seed the scene, but the final lyric should feel like a song, not a scenario transcript.

Use compact images, emotional turns, repeated phrases, and voice-specific cadence. Do not walk through every lesson as a plot checklist.

### More Singable Memory Anchors

Each song should contain at least one singable anchor:

- a short repeated line
- a rhythmic phrase
- a call-and-response shape
- a repeated ending word
- a phrase that pairs one trophy word with a clear emotional gesture

The anchor should help learners remember sound and meaning together.

### Clearer Study Lines

Wrapped study lines should be self-contained enough to review.

They should:

- contain the trophy word in a natural phrase
- give enough context to recall meaning
- avoid being so poetic that the target word becomes ambiguous
- avoid being so generic that it feels like a textbook sentence

### No Generic Textbook Lines

Do not use lines that sound like vocabulary workbook filler.

Avoid patterns like:

- "I am happy to see the sun."
- "This is a soft thing."
- "I feel glad today."
- "The answer is clear."

The line may remain simple, but it should carry voice, rhythm, and a reason to sing it.

## Before / After Example

This example uses the A1P1 word `soft`. It is illustrative only. Do not patch it into the current catalog.

### Before: Too Textbook

```text
[Verse]
The evening is <<soft>> and slow
I walk again beside the road
```

Why it is weak:

- `soft` is understandable, but the line is generic
- there is no hook or rhythmic memory anchor
- the word does not land in a memorable vocal position
- the lyric behaves like a descriptive sentence

### After: Formula V1.1 Direction

```text
[Chorus]
Keep it <<soft>>, keep it close
Soft on the window, soft in my voice
Keep it soft when the old light goes
I come back again by choice
```

Why it is stronger:

- `soft` is the highlight trophy word
- only the first `soft` is wrapped
- unwrapped repetitions create a hook without extra cloze positions
- the phrase has a singable memory anchor: "Keep it soft"
- the word lands on a short, stressed phrase
- the lyric remains simple without becoming textbook filler

## Authoring Checklist

For each future trophy song:

- one canonical lyric per trophy set
- exactly five wrapped occurrences for five trophy words
- exactly one wrapped occurrence per trophy word
- no wrappers in `providerLyrics`
- no wrappers in `displayLyrics`
- one optional highlight trophy word when musically suitable
- hook or chorus has real repetition
- trophy words land in clear rhythmic positions
- unwrapped trophy-word repeats are intentional
- study lines are clear and natural
- no generic textbook filler lines
- no German meaning inserted into the English lyric
- German translation remains separate in `lyricsTranslationDe`

## Next Implementation Prompts

1. Product review matrix for A1P1 A/B candidates.
2. A1P2-A1P5 lyric generation using Formula V1.1.
3. Future lyric-recognition UX redesign.
4. Future Supabase/Music architecture.
