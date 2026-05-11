# Guided Today Vibe Content Generation Workflow

Date: 2026-05-11

## Rule

Do not bulk-generate all vibe variants in one prompt. Generate one vibe at a time.

Each vibe needs a full context pass so the authoring model can maintain a consistent voice across all 10 lessons. Bulk generation tends to collapse Bright, Wistful, and Sharp into generic polite English.

## Authoring Sequence

1. Choose one active vibe: Bright, Wistful, or Sharp.
2. Put that vibe's character bible verbatim in the system prompt.
3. Generate all 10 lessons for that one vibe in one context.
4. Keep the invariant lesson list fixed.
5. Preserve base language German and target language English.
6. Preserve A1 practicality.
7. Curate trophy words from that vibe's trophy candidate palette.
8. Run adversarial review.
9. Repeat for the next vibe.
10. Cross-compare the same lesson across Bright, Wistful, and Sharp.

## Required Prompt Frame

```text
You are authoring static Guided Today lesson content for Resonance.

Base language: German.
Target language: English.
Level: A1 Practical.

Use this vibe bible verbatim:
[paste one full vibe bible]

Generate vibeVariants for lessons 1-10 for this one vibe only.
Do not generate other vibes.
Do not invent new trophy word palettes.
Do not make phrases poetic if they stop being usable.
Do not assume runtime LLM generation in the app.
```

## Adversarial Review

Run this review after generation:

```text
Does this read as [vibe] or generic?
Quote three lines that prove the vibe is present, or flag if missing.
Also flag any line that exceeds A1 practicality.
```

If the reviewer cannot quote three specific lines, the variant is too generic and should be rewritten.

## Cross-Compare Pass

After each active vibe has a 10-lesson draft, compare the same lesson across all three active vibes.

The situation must stay invariant:

- same lesson id
- same path id
- same lesson number
- same situation
- same pedagogical goal
- same session steps

The voice should differ:

- core phrase
- chunks
- type recall prompt
- speak target
- trophy word
- scene caption
- placeholder/video direction
- song seed

## Trophy Word Rules

Trophy words must be curated from the vibe's trophy palette or a clearly compatible adjacent word. They should not be invented randomly after the phrase is written.

Examples:

- Bright can reward `please`.
- Wistful can reward `sorry`.
- Sharp can reward `clear`.

If the trophy word is not in the palette, the author must explain why it is compatible with the vibe bible.

## No Runtime Generation

The app must not call an LLM at runtime for Guided Today V0. Generated content is an authoring input that becomes checked-in static data after review.

No V0 workflow should touch:

- Supabase schema
- `submit_generation`
- `request_word_retry`
- credits or pricing
- decks, words, or `generation_jobs`
- paid providers
- ElevenLabs, KIE, Suno, or provider code

## Recommended Next Prompt

```text
Generate Bright variants for English A1 Practical lessons 1-10.

Use docs/Product/GUIDED_TODAY_VIBE_CHARACTER_BIBLES.md, Bright section, verbatim as the voice bible.
Base language: German.
Target language: English.
Keep all lessons A1 practical.
Generate only Bright.
Return TypeScript-shaped `GuidedLessonVibeVariant` objects.
Use only Bright trophy word candidates unless you explicitly justify a compatible adjacent word.
After generation, run:
"Does this read as Bright or generic? Quote three lines that prove the vibe is present, or flag if missing."
```
