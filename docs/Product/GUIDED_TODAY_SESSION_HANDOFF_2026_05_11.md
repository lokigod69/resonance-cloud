# Guided Today Session Handoff 2026-05-11

Date: 2026-05-12

## Current Shipped State

Guided Today is a local/static English A1 Practical path with 10 lessons. Bright, Wistful, and Sharp are the active selectable voices. Tender, Bold, and Cheeky remain future/non-selectable. Progress remains lesson-level and localStorage-only; changing vibe does not fork progress.

V1.4 adds selected emblem assets to the active voices and changes `/today` from immediate lesson-card launch to a cleaner path selection model. The learner now chooses a vibe identity object, selects a lesson card, then starts from the main lesson panel.

## Commit History

Relevant local Git history currently shows:

- `a979903` - `feat: wire guided today active vibe lessons`
- `2b186f4` - `Implement guided Today path overview`
- `efdbf37` - `Simplify guided Today path overview`
- `4f83875` - `Clean up Guided Today learner UX`
- `584dc8f` - `Implement guided today UX cleanup v1.3`
- V1.4 - `Implement guided today vibe emblems UX v1.4`

## What Is Working

- 10 English A1 Practical lessons resolve from static data.
- Active vibes resolve for every lesson: Bright, Wistful, Sharp.
- Future vibes are not selectable and fall back to Bright.
- Vibe selector displays production WebP emblems for active voices.
- First incomplete lesson is selected by default.
- Lesson cards select a lesson without starting the session.
- Starten/Weiter/Wiederholen happens from the main selected lesson panel.
- Session header avoids answer spoilers outside the teaching step.
- Match Pairs independently shuffles English and German columns.
- Build Phrase auto-validates visually and does not render `Richtig.` or `Antwort prüfen`.
- Completion prioritizes next lesson when one exists.
- Trophy word is completion-only and compact.

## What Remains Rough

- Authenticated visual QA is still needed on `/today`, especially mobile density and selected-card glow.
- The active emblems are optimized WebP previews, not transparent production cutouts.
- Trophy rewards are still text-first; they do not yet feel like collectible objects.
- Static lesson content still has a few manual review warnings around stylized words such as `focused` and `almost`.
- No TTS/audio inventory or video inventory exists for the path yet.
- There is no Supabase progress sync; the implementation remains intentionally local.

## Current No-Touch List

- Supabase schema
- backend persistence
- generation
- credits
- providers
- decks
- words
- `generation_jobs`
- Music
- Study
- Speak
- broad app theme system
- videos
- TTS provider calls
- trophy/deck persistence

## Next Strategic Options

1. Vibe theme tokens
   - Add Today-path-only accent tokens for Bright, Wistful, and Sharp.
   - Keep the broad app theme untouched.

2. Trophy collection V0
   - Turn completed trophy words into visual collectible cards.
   - Start local-only before considering persistence.

3. Supabase progress sync
   - Persist lesson-level completion and selected path vibe.
   - Keep raw typed answers and speech transcripts out of storage.

4. Static TTS/audio inventory
   - Define stock audio needs for core phrases, chunks, trophy words, and speak prompts.
   - Avoid live provider calls in the learner session until inventory is reviewed.

5. Lesson video inventory
   - Map each lesson/vibe to a placeholder or final scene asset plan.
   - Keep video work separate from Today interaction changes.

## Recommended Next Phase

Vibe theme tokens are the safest next phase. They build directly on the new emblem identity layer and can make Bright, Wistful, and Sharp feel more distinct without touching Supabase, generation, providers, deck persistence, or the broad app theme system.

After that, Trophy Collection V0 is the best product follow-up: make trophy words into compact visual collectibles while staying local/static.
