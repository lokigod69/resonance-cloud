# Script Lab Audio — Provider Abstraction & Upgrade Plan

**Status:** V1 shipped with manifest + browser-speech fallback; no paid provider wired
**Companions:** `FABLE_SCRIPT_LAB_ARCHITECTURE.md`, `FABLE_HANGUL_V1_PRODUCT_SPEC.md`

## The abstraction

Every playable surface in a script declares a `ScriptAudioSpec { itemId, text }`:

- `itemId` — stable, unique within the script (`symbol-g`, `syllable-g`, `word-g`, …).
  It is the future asset filename and batch-job key.
- `text` — exactly what a TTS engine should say. This is the load-bearing accuracy
  decision: engines cannot pronounce bare jamo (`ㄱ`), so consonants speak their **letter
  names** (기역), vowels speak their carrier syllable (아), finals speak an example
  syllable (악), and words speak themselves. Whatever provider we attach later inherits
  correct input for free.

Resolution (`lib/scriptlab/audio.ts → resolveScriptAudio`) feeds the existing
`playPronunciation` primitive (`hooks/usePronunciation.ts`):

```
SCRIPT_AUDIO_MANIFEST[scriptId][itemId]   → play asset URL
        (miss)                            → speechSynthesis(text, script.speechLang)
        (no engine/voice)                 → silent no-op ('none')
```

`canPlayScriptAudio` additionally checks voice availability so the quiz can skip
listening questions on voiceless devices. Components only ever call the resolver — no
provider names appear anywhere in UI code.

## Where the app's audio already comes from (context)

- **Static thematic TTS** (vocabulary levels): batch-generated offline, stored in Supabase
  storage, resolved at runtime from the `static_tts_playback` table
  (`lib/staticThematicAudio.ts`). **Korean voice profiles already exist**: Jini, Yuna,
  Kanna, Selly, Emily, Sola (`static_thematic_ko_*_raw_v1`).
- **Guided Today**: same pattern via `guided_tts_playback` + browser fallback
  (`lib/guidedAudio.ts`).
- **ElevenLabs**: only in the offline seeding script `scripts/generate-voices.ts`
  (`eleven_multilingual_v2`, needs `ELEVENLABS_API_KEY`). Not a runtime dependency.
- **Word cards**: `words.tts_audio_url` asset or browser speech (`usePronunciation`).

So the house pattern is: *batch offline → static/stored asset → browser-speech fallback*.
Script Lab V1 follows it, minus the batch step.

## Why V1 ships without generated assets

- Zero cost, zero new infra, works today in both skins and in the Capacitor shell.
- Correctness is protected by the explicit `text` fields — the fallback voice may sound
  robotic but never *teaches the wrong thing* (the classic failure is TTS spelling out a
  bare consonant; we never send one).
- The inventory (47 symbols × up to 3 specs ≈ 130 short clips) is small enough to batch in
  one sitting once approved — no reason to gate the feature launch on it.

## Pronunciation-quality risk register

| Risk | Impact | Mitigation |
|---|---|---|
| TTS misreads bare jamo | wrong sounds taught | never speak jamo; letter names/syllables only (shipped) |
| Letter *name* ≠ letter *sound* (기역 vs g-) | learner confusion | detail panel pairs the name with a playable example syllable + word (shipped) |
| Homophone pairs in listening quiz (ㅐ/ㅔ) | unanswerable questions | `homophone:*` tags exclude them as mutual distractors (shipped) |
| No ko voice on device (some Android WebViews, stripped desktop Linux) | silent buttons | `canPlayScriptAudio` gates listening questions; Learn/Build stay useful visually; fixed permanently by assets |
| Provider quality on isolated syllables (clipping, wrong pitch) | poor premium feel | QA pass in the batch workflow (listen to all ~130 clips before committing the manifest) |
| ElevenLabs Korean phoneme precision | subtle inaccuracy on letter names | prefer voices already QA'd in `static_tts_playback` (the six ko profiles) or Gemini TTS; A/B a 5-clip sample first |

## Upgrade path (when audio budget is approved)

**Recommended: Option B — reuse the static-TTS pipeline.**

- **Option A — committed public assets.** Batch-generate to
  `frontend/public/scripts/korean-hangul/<itemId>.mp3` (precedent: `/voices/*.mp3`), fill
  `SCRIPT_AUDIO_MANIFEST`, commit. Pros: no DB, CDN-cached by Vercel, offline-friendly in
  Capacitor. Cons: repo weight (~2–4 MB), no QA metadata.
- **Option B — static-TTS pipeline (recommended).** Add a `script_tts` surface to the
  existing batch tooling (`scripts/export-static-thematic-tts-inventory.ts` is the
  pattern: export an inventory JSON of `{ scriptId, itemId, spoken_text, voice_profile_key }`,
  generate, upload to Supabase storage, QA-flag rows). Then either (a) point manifest
  entries at the public storage URLs at build time, or (b) add a
  `resolveScriptAudio`-level lookup mirroring `guidedAudio.ts`. Pros: reuses QA'd Korean
  voices (Jini/Yuna/…), consistent voice identity with the vocabulary levels, QA status
  tracking. Cons: needs the pipeline run + one small table/storage prefix.
- **Option C — runtime provider calls.** Rejected: cost per tap, latency, offline failure,
  and it would put a paid key in a hot client path.

Inventory export for whichever option: walk `SCRIPTS`, `await entry.load()`, collect every
`ScriptAudioSpec` (symbol, exampleSyllable, exampleWord — the test suite already
guarantees itemId uniqueness). ~130 items for Hangul V1. Build-mode composed blocks are
intentionally **not** batched (11,172 possible blocks) — they stay on browser speech, or
later on a curated "common syllables" subset if quality demands it.

**Hard rule (unchanged):** no live paid-provider calls from the client, and no batch runs
without explicit owner approval — batch scripts must require env keys and refuse to run
without them.

## Caching

Static assets: Vercel/Supabase CDN headers handle it; filenames are content-stable via
`itemId` (bump with a `-v2` suffix on regeneration). Runtime: `playPronunciation` already
reuses a singleton `HTMLAudioElement`; no further client caching needed at this clip size.
If Capacitor offline packs become a requirement, Option A assets can ship in the app bundle.
