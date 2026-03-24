# ENGINE_ASSEMBLY.md — Assembly Engine Abstract

**Version:** 1.0
**Status:** Abstract finalized — ready for development
**Date:** March 1, 2026
**Parent Document:** MASTER_ABSTRACT.md v1.0
**Pipeline Stage:** Stage 5 (Final Assembly)
**Purpose:** This document defines what the Assembly Engine does, what it accepts, what it produces, how it works internally, and what settings it exposes. Any agent building or modifying this engine reads this document alongside the Master Abstract.

---

## 1. Engine Purpose

The Assembly Engine is the fifth and final stage of the Resonance pipeline. It takes the song audio from Stage 2 and the video clips from Stage 4 and combines them into a finished MP4 — the deliverable that the learner watches.

This is the simplest engine in the pipeline. It is an **FFMPEG wrapper**. It makes no creative decisions about music, lyrics, images, or video content — all of that was decided upstream. Its job is time alignment, audio processing, clip sequencing, and encoding.

**Stage 5 is the time boss.** This is the only engine that cares about duration. The Song Engine produces audio of a certain length. The Video Engine produces clips of possibly different total length. The Assembly Engine resolves the difference. No other stage worries about time matching.

### 1.1 Core Responsibilities

1. **Sequence video clips** into a continuous video track (with configurable transitions)
2. **Align video to song duration** — the song is always the master clock
3. **Apply audio processing** — optional silence trimming and LUFS loudness normalization (deferred here from the Song Engine by design)
4. **Generate word cards** — optional pedagogic intro/outro frames showing the target word
5. **Encode the final MP4** — H.264 video + AAC audio with configurable quality

### 1.2 What This Engine Is NOT

- It is NOT the Song Engine. It does not generate audio.
- It is NOT the Video Engine. It does not generate video clips.
- It is NOT the Image Engine. It does not generate or process images (except rendering simple word card text via FFMPEG's drawtext filter).
- It is NOT the orchestrator. It does not read CSVs, create folders, or manage manifests.
- It does not handle settings inheritance, version selection, or workspace management. The orchestrator handles all of that.

---

## 2. Engine Contract Compliance

This engine follows the engine contract defined in Master Abstract Section 8.

### 2.1 Input

The engine receives a single payload containing the song audio path, an ordered list of video clip paths, and assembly settings.

```json
{
  "content": {
    "song_path": "/path/to/workspace/verzweiflung/songs/melodic-techno_20260228T113000/take_001.flac",
    "video_clips": [
      "/path/to/workspace/verzweiflung/video/editorial-series_20260301T130000/scene_001.mp4",
      "/path/to/workspace/verzweiflung/video/editorial-series_20260301T130000/scene_002.mp4",
      "/path/to/workspace/verzweiflung/video/editorial-series_20260301T130000/scene_003.mp4"
    ],
    "word": "Verzweiflung",
    "translation": "Desperation",
    "language": "German",
    "language_code": "de"
  },
  "settings": {
    "assembly_mode": "clean",
    "gap_strategy": "ping_pong",
    "overflow_strategy": "trim",
    "transition": "cut",
    "transition_duration": 0.5,
    "silence_trim": true,
    "silence_threshold_db": -40,
    "lufs_normalize": true,
    "target_lufs": -14.0,
    "word_card_duration": 2.0,
    "word_card_font": "Noto Sans",
    "word_card_font_size": 72,
    "word_card_color": "auto",
    "word_card_show_translation": false,
    "video_codec": "libx264",
    "video_preset": "slow",
    "video_crf": 18,
    "audio_codec": "aac",
    "audio_bitrate": "192k",
    "output_resolution": "1080p",
    "output_fps": 25
  },
  "output_dir": "/path/to/workspace/verzweiflung/final/clean-assembly_20260301T150000/",
  "metadata": {
    "word": "Verzweiflung",
    "language": "German",
    "translation": "Desperation",
    "timestamp": "2026-03-01T15:00:00Z",
    "song_version": "melodic-techno_20260228T113000/take_001",
    "video_version": "editorial-series_20260301T130000"
  }
}
```

**Key points about the input:**

- `content.song_path` is the path to the selected audio file (FLAC from the Song Engine). The orchestrator resolves which take was selected via the manifest.
- `content.video_clips` is an ordered list of MP4 clip paths from the Video Engine. The order matches the storyboard scene order. The orchestrator reads the storyboard and resolves which clips to include.
- `content.word`, `content.translation`, `content.language`, and `content.language_code` are needed for word card rendering (when `assembly_mode` is `pedagogic`).
- `settings` is the fully merged settings object (batch defaults + per-word overrides, resolved by the orchestrator). The engine does not perform any settings inheritance.
- `output_dir` is pre-created by the orchestrator. The engine writes output files here.
- `metadata` provides context for generation-meta.json. The `song_version` and `video_version` fields record which upstream outputs were used, enabling lineage tracking.

### 2.2 Output

The engine writes a single final MP4 file and generation metadata to the `output_dir`:

**Files written:**
```
clean-assembly_20260301T150000/
├── final.mp4
└── generation-meta.json
```

**Return value:**
```json
{
  "status": "success",
  "output_paths": ["final.mp4"],
  "error": null
}
```

On failure:
```json
{
  "status": "failed",
  "output_paths": [],
  "error": "FFMPEG encoding failed: audio stream duration mismatch"
}
```

**generation-meta.json is always written**, even on failure. This is an engine contract requirement.

### 2.3 What This Engine Must NOT Do

- Never read or write `manifest.json`
- Never create its own output directory
- Never communicate with other engines
- Never retain state between calls
- Never read `.env` for workspace data (no API keys needed — this engine is fully local)
- Never modify the source audio or video files — it reads them, never writes to their locations
- Never call any other engine

---

## 3. Assembly Modes

The `assembly_mode` setting determines the overall structure of the final video. There are two modes.

### 3.1 Mode: Clean (Default)

The video clips are sequenced directly with the song audio. No word cards, no pedagogic framing. The video starts immediately with the first clip.

```
┌─────────────────────────────────────────────┐
│ Song audio (master clock)                   │
├────────┬────────┬────────┬──────────────────┤
│ Clip 1 │ Clip 2 │ Clip 3 │ Gap strategy     │
└────────┴────────┴────────┴──────────────────┘
```

This is the default because it produces the most music-video-like result. Use this when the visual content is strong enough to stand alone and the learning context (word + translation) is provided by the app UI around the video.

### 3.2 Mode: Pedagogic

Adds a word card at the beginning and optionally at the end of the video. The word card is a simple frame: the target word rendered in a clean font on a black or dark background with a subtle color accent. When enabled, **every word** in the batch starts with this card — it becomes a consistent visual signature for the learning experience.

```
┌─────────────────────────────────────────────────────────┐
│ Song audio (master clock)                               │
├───────────┬────────┬────────┬────────┬─────┬───────────┤
│ Word card │ Clip 1 │ Clip 2 │ Clip 3 │ Gap │ Word card │
│ (intro)   │        │        │        │     │ (outro)   │
└───────────┴────────┴────────┴────────┴─────┴───────────┘
```

**Intro word card (always shown in pedagogic mode):**
- Duration: configurable, default 2.0 seconds
- Content: the target word in the target language, centered, large font
- Background: black with optional color accent (gradient or glow behind text)
- The word card color can be `"auto"` (derived from the dominant color of the first video clip's first frame) or a specific hex color
- Optional: translation shown smaller below the word (controlled by `word_card_show_translation`)
- Transition into first clip: quick fade (0.3s) from card to video

**Outro word card (shown if time permits after gap strategy completes):**
- Same styling as intro card
- Duration: fills remaining time after the gap strategy, minimum 1.0s, maximum same as `word_card_duration`
- If there is no remaining time after gap strategy, the outro card is skipped
- Transition: fade from last visual element to word card

**Font selection:**
- Default: `"Noto Sans"` — chosen because it supports all target languages (German, Korean, Japanese, Italian, Spanish) in a single font family with consistent aesthetics
- The font must be available on the system. The engine validates font availability at startup and falls back to Noto Sans if the requested font is not found
- `word_card_font_size` is the base size — the engine scales it relative to output resolution (72pt at 1080p)

**Learning science rationale:** The word card creates a clear "this is what you're learning" moment before the multimedia content begins. The research shows on-screen text helps vocabulary learning, and the signaling principle recommends highlighting the learning target. The brief card provides this without competing with the visual content that follows.

---

## 4. The Song Is the Master Clock

This is the fundamental rule of the Assembly Engine. Every decision flows from it.

**The final MP4 duration always equals the song duration** (after optional silence trimming). Video is stretched, looped, trimmed, or faded to match. The song is never cut short to match video. The song is never stretched or slowed.

Why: The song contains the pronunciation, the repetitions, the phonological content that drives learning. Cutting or modifying the song defeats the purpose. Video is supplementary — it reinforces meaning visually. If the video is slightly too long or too short, the learning impact is negligible. If the song is cut, the learner misses pronunciation exposures.

**Duration calculation:**

```
effective_song_duration = song_duration - trimmed_silence (if silence_trim enabled)

IF assembly_mode == "pedagogic":
    available_for_video = effective_song_duration - word_card_intro_duration
    # (outro card uses leftover time from gap strategy, not pre-allocated)
ELSE:
    available_for_video = effective_song_duration

total_clip_duration = sum(duration of each video clip)
gap = available_for_video - total_clip_duration
```

If `gap > 0`: video is shorter than song → apply gap strategy (Section 5)
If `gap < 0`: video is longer than song → apply overflow strategy (Section 6)
If `gap == 0`: perfect match → no adjustment needed

---

## 5. Gap Strategies (Video Shorter Than Song)

When the total video clip duration is less than the available time, the engine fills the remaining time. The `gap_strategy` setting determines how.

### 5.1 Strategy: Ping-Pong Loop (Default)

**Setting value:** `"ping_pong"`

After all clips have played, the engine loops back through them in reverse order (last clip plays backwards, then second-to-last backwards, etc.), then forward again, continuing until the gap is filled. The reverse playback creates a smooth visual continuity — no jarring jump cuts when the loop restarts.

**FFMPEG implementation:** Use the `reverse` filter on individual clips, then concatenate forward and reversed versions. The final clip in the loop may be trimmed to fit exactly.

**Why this is the default:** It's the smoothest option visually. Forward-reverse creates a natural breathing motion. No hard loop points are visible. Works well with Ken Burns animations (zoom in → zoom back out) and with AI-generated clips (motion reverses naturally).

**Example:** 30s song, 18s of video (3 clips × 6s), 12s gap.
- 0–6s: Clip 1 forward
- 6–12s: Clip 2 forward
- 12–18s: Clip 3 forward
- 18–24s: Clip 3 reversed → Clip 2 reversed
- 24–30s: Clip 1 reversed → Clip 1 forward (trimmed to fill)

### 5.2 Strategy: Simple Loop

**Setting value:** `"loop"`

After all clips have played, restart from the first clip and play through again sequentially. Repeat until the gap is filled. The last clip in the loop may be trimmed.

**Simpler than ping-pong** but creates a visible jump when looping back to clip 1 (unless clips 3→1 happen to be visually compatible).

### 5.3 Strategy: Fade to Black

**Setting value:** `"fade_black"`

After all clips have played, fade the last frame to black over 1.5 seconds (configurable via `transition_duration`), then hold black for the remaining duration while the song continues playing. Clean and minimal.

**Best for:** Small gaps (under 5 seconds) or when the song has a natural fade-out/outro section that doesn't need visual accompaniment.

### 5.4 Strategy: Freeze with Ken Burns

**Setting value:** `"freeze_ken_burns"`

After all clips have played, the last frame of the last clip is extracted as a still image, and a slow Ken Burns zoom-in is applied for the remaining duration. This creates gentle motion without repeating content.

**FFMPEG implementation:** Extract last frame → apply `zoompan` filter with very slow zoom toward center.

**Best for:** Medium gaps (5–10 seconds). Gives a contemplative, music-video feel. Works especially well when the last clip is visually rich.

### 5.5 Strategy: Word Card Fill

**Setting value:** `"word_card"`

After all clips have played, display a word card (same styling as the pedagogic intro card) for the remaining duration. This is the most pedagogically oriented gap fill — the learner sees the word one final time as the song plays out.

**Note:** This strategy works regardless of `assembly_mode`. Even in `clean` mode, selecting `word_card` as the gap strategy will show a word card for the gap duration. The difference is that `clean` mode with `word_card` gap strategy shows the card only at the end (during the gap), while `pedagogic` mode shows it at both the beginning and the end.

---

## 6. Overflow Strategies (Video Longer Than Song)

When the total video clip duration exceeds the available song time. This should be rare in practice — the user typically controls how many clips and what duration they are — but the engine handles it gracefully.

### 6.1 Strategy: Trim (Default)

**Setting value:** `"trim"`

Play clips sequentially until the song ends. The clip playing when time runs out is trimmed at that point. Remaining clips are not used.

This is the default because it's deterministic and simple. The clips play in storyboard order, and the last one gets cut. The assumption is that the user would rather see the first N clips in full than see all clips rushed.

### 6.2 Strategy: Fade Audio to Black

**Setting value:** `"fade_audio_black"`

Play all clips to completion. During the final 2 seconds of the song, fade the audio to silence. Then fade the video to black over 1 second. The final MP4 duration slightly exceeds the song duration (by however much the video overflows), but the audio ending is clean.

**Use case:** When every video clip is important and the overflow is small (a few seconds). The viewer sees everything at the cost of a slightly longer video.

---

## 7. Transitions Between Clips

The `transition` setting controls how one clip connects to the next.

### 7.1 Transition: Hard Cut (Default)

**Setting value:** `"cut"`

Clips are concatenated with no overlap. Frame N of clip 1 is immediately followed by frame 1 of clip 2. This is the cleanest and most music-video-like option.

### 7.2 Transition: Crossfade

**Setting value:** `"crossfade"`

Clips overlap by `transition_duration` seconds (default 0.5s). During the overlap, clip 1 fades out while clip 2 fades in. This produces smooth scene changes.

**FFMPEG implementation:** Use the `xfade` filter with `transition=fade`.

**Duration accounting:** Crossfade reduces total video duration. With 3 clips of 6s each and 0.5s crossfade, total duration = 18 - (2 × 0.5) = 17s, not 18s. The gap calculation accounts for this.

### 7.3 Transition: Dip to Black

**Setting value:** `"dip_black"`

Clip 1 fades to black, then clip 2 fades in from black. Total transition duration is `transition_duration` seconds (split evenly: half for fade-out, half for fade-in). Creates a more dramatic, chapter-like feeling between scenes.

**FFMPEG implementation:** Use the `xfade` filter with `transition=fadeblack`.

---

## 8. Audio Processing

The Song Engine produces raw Ace-Step output with only built-in peak normalization. The Assembly Engine handles all further audio processing before muxing with video.

### 8.1 Silence Trimming

**Setting:** `silence_trim` (boolean, default `true`)

Ace-Step sometimes generates silence at the beginning or end of the audio. When enabled, the engine detects and trims silence from both ends of the audio track.

**Implementation:**
- Use FFMPEG's `silencedetect` filter with configurable threshold (`silence_threshold_db`, default -40 dB)
- Trim silence from start and end only (never from the middle — pauses within the song may be intentional)
- Minimum remaining duration: never trim below 5 seconds (safety guard against over-trimming a quiet song)
- The trimmed duration becomes the new master clock for the assembly

### 8.2 LUFS Loudness Normalization

**Setting:** `lufs_normalize` (boolean, default `true`)

Normalizes the audio to a consistent perceived loudness level. This ensures all generated content plays at roughly the same volume, regardless of the music style or Ace-Step's output level.

**Implementation:**
- Use FFMPEG's `loudnorm` filter in two-pass mode for accurate normalization
- Target: `target_lufs` (default -14.0 LUFS, which is the standard for streaming platforms)
- Two-pass approach: first pass measures current loudness, second pass applies correction
- True peak limit: -1.0 dBTP (prevents clipping)

**Why -14.0 LUFS:** It's the Spotify/YouTube standard. Content normalized to this level sounds natural across different playback environments. For a language learning app, consistent volume between words is important — the learner shouldn't have to adjust volume when moving from a quiet ambient track to an energetic electronic one.

### 8.3 Audio Processing Order

When both are enabled:
1. Silence trim first (to get accurate duration for the master clock)
2. LUFS normalization second (on the trimmed audio)
3. Then use the processed audio as the master clock for video assembly

---

## 9. Video Encoding Settings

### 9.1 Codec and Quality

| Setting | Default | Description |
|---|---|---|
| `video_codec` | `"libx264"` | H.264 encoder. Universal compatibility. |
| `video_preset` | `"slow"` | Encoding speed/quality tradeoff. Slow = better compression at same quality. Since this runs locally and speed is not critical, we favor quality. |
| `video_crf` | `18` | Constant Rate Factor. Lower = higher quality, larger file. 18 is visually lossless for most content. Range: 0–51. |
| `audio_codec` | `"aac"` | AAC audio encoder. Universal compatibility. |
| `audio_bitrate` | `"192k"` | Audio bitrate. 192kbps is transparent quality for AAC. |
| `output_resolution` | `"1080p"` | Output resolution. The engine scales all video clips to this resolution before assembly. |
| `output_fps` | `25` | Output frame rate. Matches the default from the Video Engine. |

### 9.2 Resolution Handling

All input clips may have different resolutions (Ken Burns clips from high-res images, LTX-2 at 768×512, Kling at various sizes). The Assembly Engine scales all clips to the target `output_resolution` before concatenation.

| Setting value | Resolution | Aspect ratio |
|---|---|---|
| `"720p"` | 1280×720 | 16:9 |
| `"1080p"` | 1920×1080 | 16:9 |
| `"4k"` | 3840×2160 | 16:9 |

**Aspect ratio handling:** If a clip has a different aspect ratio than 16:9, the engine applies `pad` (black bars) rather than crop or stretch. Content is never distorted. The black padding blends naturally with the dark aesthetic of word cards.

**Scaling filter:** Use `lanczos` for downscaling (sharp) and `bicubic` for upscaling (smooth).

---

## 10. Word Card Rendering

When `assembly_mode` is `"pedagogic"` or when `gap_strategy` is `"word_card"`, the engine generates word card frames using FFMPEG's `drawtext` filter.

### 10.1 Visual Design

```
┌──────────────────────────────────────────┐
│                                          │
│                                          │
│                                          │
│            Verzweiflung                  │  ← Target word, large, centered
│                                          │
│            (Desperation)                 │  ← Translation, smaller, only if enabled
│                                          │
│                                          │
│                                          │
└──────────────────────────────────────────┘
  Background: solid black (#000000) or
  dark gradient with subtle color accent
```

### 10.2 Text Styling

| Element | Font | Size (at 1080p) | Color | Position |
|---|---|---|---|---|
| Target word | `word_card_font` (default: Noto Sans) | `word_card_font_size` (default: 72pt) | `word_card_color` (default: auto) | Center horizontal, 40% from top |
| Translation | `word_card_font` | 60% of word size (default: ~43pt) | Same color at 60% opacity | Center horizontal, 55% from top |

### 10.3 Color Modes

**`"auto"` (default):** The engine samples the first frame of the first video clip, extracts the dominant color, and uses a desaturated, lightened version of it for the word text. This creates a visual connection between the word card and the video that follows. If no video clips are provided, falls back to white (#FFFFFF).

**Specific hex color (e.g., `"#E8C547"`):** Uses the provided color directly. Useful for batch consistency — set one color for all German words, another for Korean, etc.

**`"white"`:** Simple white text on black. Clean and universal.

### 10.4 Font Requirements

The engine must support rendering text in all target languages: German, Korean (한국어), Japanese (日本語, ひらがな, カタカナ), Italian, Spanish. The Noto Sans family is the recommended default because it covers all these scripts in a single, visually consistent family.

**Font discovery:** The engine checks for font availability at startup using `fc-list` and stores the path. If the requested font is not found, it falls back to Noto Sans. If Noto Sans is not found, it falls back to any available sans-serif font and logs a warning.

**FFMPEG drawtext:** Uses the `fontfile` parameter with the discovered font path. Example:
```
drawtext=fontfile=/usr/share/fonts/noto/NotoSans-Bold.ttf:text='Verzweiflung':fontsize=72:fontcolor=white:x=(w-text_w)/2:y=h*0.4-text_h/2
```

---

## 11. The Assembly Pipeline

The engine executes these steps in order:

```
1. VALIDATE INPUTS
   ├── Verify song file exists and is readable
   ├── Verify all video clip files exist and are readable
   ├── Verify font availability (if pedagogic mode)
   └── Probe all media files for duration, resolution, codec info

2. PROCESS AUDIO
   ├── (If silence_trim) Detect and trim silence from song
   ├── (If lufs_normalize) Two-pass LUFS normalization
   └── Calculate effective_song_duration (= master clock)

3. CALCULATE TIMING
   ├── Sum video clip durations (accounting for transitions)
   ├── Subtract word card durations (if pedagogic mode)
   ├── Calculate gap or overflow
   └── Determine which strategy to apply

4. PREPARE VIDEO SEGMENTS
   ├── Scale all clips to target resolution
   ├── (If pedagogic mode) Generate intro word card video segment
   ├── Apply gap strategy (loop/reverse/freeze/fade/word card)
   │   OR overflow strategy (trim clips)
   ├── (If pedagogic mode + remaining time) Generate outro word card segment
   └── Build final concatenation list with transitions

5. ASSEMBLE
   ├── Concatenate all video segments with specified transitions
   ├── Mux processed audio with assembled video
   ├── Encode to final MP4 with specified codec settings
   └── Write final.mp4 to output_dir

6. WRITE METADATA
   └── Write generation-meta.json (always, even on failure)
```

### 11.1 FFMPEG Command Strategy

The engine should build a single complex FFMPEG command (or a minimal chain of 2–3 commands) rather than creating many intermediate files. Use FFMPEG's filter graph (`-filter_complex`) to handle scaling, padding, transitions, and concatenation in one pass where possible.

For cases where a single command would be too complex (e.g., ping-pong loop requiring reversed clips), the engine may create temporary intermediate files in a temp directory within `output_dir`, then clean them up after the final encode.

---

## 12. Generation Metadata

Every call produces a `generation-meta.json` in the output directory. This follows the engine contract.

```json
{
  "status": "success",
  "engine": "assembly-engine",
  "engine_version": "0.1.0",
  "timestamp": "2026-03-01T15:00:45Z",
  "duration_seconds": 8.2,

  "context": {
    "word": "Verzweiflung",
    "language": "German",
    "translation": "Desperation"
  },

  "inputs": {
    "song_version": "melodic-techno_20260228T113000/take_001",
    "video_version": "editorial-series_20260301T130000",
    "video_clips_used": ["scene_001.mp4", "scene_002.mp4", "scene_003.mp4"],
    "settings_used": {
      "assembly_mode": "clean",
      "gap_strategy": "ping_pong",
      "transition": "cut",
      "silence_trim": true,
      "lufs_normalize": true,
      "target_lufs": -14.0,
      "video_crf": 18
    }
  },

  "outputs": {
    "primary": "final.mp4",
    "format": "mp4",
    "duration_seconds": 30.0,
    "resolution": "1920x1080",
    "file_size_bytes": 12345678
  },

  "assembly_report": {
    "original_song_duration": 31.2,
    "trimmed_silence_start": 0.8,
    "trimmed_silence_end": 0.4,
    "effective_song_duration": 30.0,
    "total_clip_duration": 18.0,
    "gap_seconds": 12.0,
    "gap_strategy_applied": "ping_pong",
    "original_lufs": -18.5,
    "normalized_lufs": -14.0,
    "word_card_intro_duration": 0,
    "word_card_outro_duration": 0,
    "clips_trimmed": false,
    "clips_looped": true
  },

  "reproducibility": {
    "ffmpeg_version": "6.1.1",
    "ffmpeg_command": "ffmpeg -i ... (full command logged for debugging)"
  },

  "error": null
}
```

The `assembly_report` section is unique to this engine. It provides a detailed breakdown of every timing decision the engine made — invaluable for debugging and for understanding why a particular assembly looks the way it does.

---

## 13. Settings Schema (Complete)

### 13.1 Assembly Structure

| Setting | Type | Default | Values | Description |
|---|---|---|---|---|
| `assembly_mode` | string | `"clean"` | `"clean"`, `"pedagogic"` | Overall video structure. Clean = clips only. Pedagogic = word cards + clips. |

### 13.2 Time Alignment

| Setting | Type | Default | Values | Description |
|---|---|---|---|---|
| `gap_strategy` | string | `"ping_pong"` | `"ping_pong"`, `"loop"`, `"fade_black"`, `"freeze_ken_burns"`, `"word_card"` | How to fill time when video clips are shorter than the song. |
| `overflow_strategy` | string | `"trim"` | `"trim"`, `"fade_audio_black"` | How to handle video clips being longer than the song. |

### 13.3 Transitions

| Setting | Type | Default | Values | Description |
|---|---|---|---|---|
| `transition` | string | `"cut"` | `"cut"`, `"crossfade"`, `"dip_black"` | Transition style between consecutive clips. |
| `transition_duration` | float | `0.5` | 0.1–2.0 | Duration of crossfade or dip-to-black in seconds. Ignored for hard cuts. |

### 13.4 Audio Processing

| Setting | Type | Default | Values | Description |
|---|---|---|---|---|
| `silence_trim` | boolean | `true` | — | Trim silence from start and end of song audio. |
| `silence_threshold_db` | float | `-40` | -60 to -20 | Threshold below which audio is considered silence. |
| `lufs_normalize` | boolean | `true` | — | Apply LUFS loudness normalization. |
| `target_lufs` | float | `-14.0` | -24.0 to -8.0 | Target integrated loudness. -14 LUFS is the streaming standard. |

### 13.5 Word Card (Pedagogic Mode)

| Setting | Type | Default | Values | Description |
|---|---|---|---|---|
| `word_card_duration` | float | `2.0` | 1.0–5.0 | Duration of the intro word card in seconds. |
| `word_card_font` | string | `"Noto Sans"` | Any system font | Font family for word card text. Must support the target language script. |
| `word_card_font_size` | int | `72` | 24–144 | Font size in points at 1080p. Scales proportionally at other resolutions. |
| `word_card_color` | string | `"auto"` | `"auto"`, `"white"`, or hex color | Text color. Auto extracts from first video frame. |
| `word_card_show_translation` | boolean | `false` | — | Show the L1 translation below the target word. |

### 13.6 Video Encoding

| Setting | Type | Default | Values | Description |
|---|---|---|---|---|
| `video_codec` | string | `"libx264"` | `"libx264"`, `"libx265"` | Video encoder. H.264 for compatibility, H.265 for smaller files. |
| `video_preset` | string | `"slow"` | `"medium"`, `"slow"`, `"slower"`, `"veryslow"` | Encoding speed/quality tradeoff. Slower = better compression. |
| `video_crf` | int | `18` | 0–51 | Quality level. 18 = visually lossless. 23 = good quality, smaller files. |
| `audio_codec` | string | `"aac"` | `"aac"`, `"libopus"` | Audio encoder. AAC for compatibility, Opus for quality at low bitrates. |
| `audio_bitrate` | string | `"192k"` | `"128k"`, `"192k"`, `"256k"`, `"320k"` | Audio bitrate. |
| `output_resolution` | string | `"1080p"` | `"720p"`, `"1080p"`, `"4k"` | Output video resolution. All clips scaled to match. |
| `output_fps` | int | `25` | 24, 25, 30 | Output frame rate. |

---

## 14. Error Handling

### 14.1 Validation Errors (Fail Fast)

These are detected before any processing begins:

| Error | Action |
|---|---|
| Song file not found or unreadable | Fail immediately. Cannot assemble without audio. |
| Zero video clips provided | Fail immediately. Cannot assemble without video. |
| Video clip file not found | Log warning, skip that clip. If all clips are missing, fail. |
| Font not found (pedagogic mode) | Log warning, fall back to Noto Sans → any sans-serif. |
| Invalid settings values | Use defaults, log warning. |

### 14.2 Processing Errors

| Error | Retryable | Action |
|---|---|---|
| FFMPEG crash during encoding | No | Report failure with FFMPEG error output. |
| Silence trim produces < 5s audio | No | Disable trim, use original duration, log warning. |
| LUFS normalization fails | No | Skip normalization, use original audio, log warning. |
| Resolution scaling fails for a clip | No | Skip that clip, log warning, continue with remaining clips. |
| Disk space insufficient | No | Report failure. |

### 14.3 Graceful Degradation

The engine should degrade gracefully rather than fail hard when non-critical features encounter problems:

- Font rendering fails → fall back to simpler font, then skip word cards entirely if all fonts fail
- One clip is corrupt → skip it, assemble with remaining clips
- Color extraction fails for auto word card color → fall back to white
- Silence trim over-trims → disable trim and retry with original audio

---

## 15. Dependencies

### 15.1 Required

| Dependency | Version | Purpose |
|---|---|---|
| FFMPEG | ≥ 6.0 | Core video/audio processing. Must be compiled with libx264, libx265, aac, loudnorm filter support. |
| Python | ≥ 3.10 | Engine runtime. |
| ffmpeg-python (or subprocess) | — | Python bindings for FFMPEG command construction. The engine may use either the `ffmpeg-python` library for complex filter graphs or raw `subprocess` calls for simpler operations. |

### 15.2 Optional

| Dependency | Purpose |
|---|---|
| `fontconfig` / `fc-list` | Font discovery for word card rendering. |
| `Pillow` | Alternative method for word card frame generation (render text to image, then use as FFMPEG input). May be simpler than `drawtext` for complex multilingual text. |
| `numpy` | Only if implementing custom audio analysis beyond what FFMPEG provides. |

### 15.3 No External APIs

This engine is fully local. It requires no internet connection, no API keys, no cloud services. Everything runs through FFMPEG on the local machine.

---

## 16. Project Structure

```
engine-assembly/
├── README.md
├── requirements.txt
├── src/
│   ├── __init__.py
│   ├── engine.py              ← Main entry point: assemble()
│   ├── audio.py               ← Silence trimming + LUFS normalization
│   ├── video.py               ← Clip scaling, concatenation, transitions
│   ├── word_card.py           ← Word card frame generation
│   ├── timing.py              ← Duration calculation, gap/overflow logic
│   ├── gaps.py                ← Gap strategy implementations
│   ├── ffmpeg_builder.py      ← FFMPEG command construction helpers
│   ├── models.py              ← Data models (AssemblyPayload, AssemblyResult, AssemblySettings, etc.)
│   └── config.py              ← Font discovery, FFMPEG version check
├── tests/
│   ├── test_engine.py         ← End-to-end assembly tests
│   ├── test_audio.py          ← Silence trim + LUFS tests
│   ├── test_timing.py         ← Gap/overflow calculation tests
│   ├── test_word_card.py      ← Word card rendering tests
│   ├── test_gaps.py           ← Gap strategy tests (each strategy)
│   ├── test_transitions.py    ← Transition tests
│   └── test_models.py         ← Data model validation tests
├── fixtures/
│   ├── test_song.flac         ← Short test audio file
│   ├── test_clip_1.mp4        ← Short test video clip
│   ├── test_clip_2.mp4        ← Short test video clip
│   └── test_clip_3.mp4        ← Short test video clip
└── ui/
    └── app.py                 ← Standalone testing UI (FastAPI)
```

### 16.1 Key Function Signatures

```python
# engine.py — the engine contract entry point
def assemble(payload: AssemblyPayload) -> AssemblyResult:
    """
    Main engine function. Receives a payload with song audio, video clips,
    and assembly settings. Produces final.mp4 in the output_dir.
    Always writes generation-meta.json.
    """

# audio.py — audio processing
def trim_silence(
    audio_path: str,
    threshold_db: float,
    output_path: str
) -> tuple[str, float, float]:
    """
    Trim silence from start and end of audio.
    Returns: (output_path, trimmed_start_seconds, trimmed_end_seconds)
    """

def normalize_lufs(
    audio_path: str,
    target_lufs: float,
    output_path: str
) -> tuple[str, float, float]:
    """
    Two-pass LUFS normalization.
    Returns: (output_path, original_lufs, final_lufs)
    """

# timing.py — time alignment calculations
def calculate_timing(
    song_duration: float,
    clip_durations: list[float],
    settings: AssemblySettings
) -> TimingPlan:
    """
    Calculate the assembly timing plan: gap or overflow,
    word card allocations, transition time accounting.
    Returns a TimingPlan with all durations resolved.
    """

# gaps.py — gap strategy implementations
def apply_ping_pong(
    clips: list[str],
    gap_seconds: float,
    output_dir: str
) -> list[str]:
    """
    Generate ping-pong looped clip segments to fill the gap.
    Returns list of segment file paths in playback order.
    """

# word_card.py — word card generation
def generate_word_card(
    word: str,
    translation: str | None,
    duration: float,
    settings: AssemblySettings,
    output_path: str
) -> str:
    """
    Render a word card video segment (text on black background).
    Returns path to the generated MP4 segment.
    """
```

---

## 17. Testing Strategy

### 17.1 Unit Tests (No Media Files Needed)

- **Timing calculations:** Given song duration X and clip durations [Y, Z], verify correct gap/overflow calculation for all mode combinations
- **Settings validation:** Verify defaults, bounds checking, graceful handling of invalid values
- **Model validation:** Verify payload parsing, missing field defaults

### 17.2 Integration Tests (With Test Fixtures)

- **End-to-end clean mode:** 3 test clips + test song → verify output MP4 exists, has correct duration, has both audio and video streams
- **End-to-end pedagogic mode:** Same inputs → verify word card is present at start, duration is correct
- **Gap strategies:** Short total clip duration → verify each strategy produces correct output duration
- **Overflow handling:** Long total clip duration → verify trim works correctly
- **Transitions:** Verify crossfade and dip-black produce outputs with correct duration accounting
- **Audio processing:** Test silence trimming with a song that has known silence. Test LUFS normalization with audio at known loudness.
- **Word card rendering:** Verify text renders correctly for German, Korean, Japanese. Verify auto-color extraction works.
- **Resolution scaling:** Mix clips of different resolutions → verify output is uniform

### 17.3 Test Fixtures

The `fixtures/` directory contains minimal test media files:
- `test_song.flac` — 10-second audio file (can be generated with FFMPEG: sine wave + silence padding)
- `test_clip_1.mp4` through `test_clip_3.mp4` — 3-second video clips (can be generated with FFMPEG: colored frames with lavfi)
- These fixtures are created by a setup script, not committed as large binary files

---

## 18. Open Questions (To Be Resolved Through Testing)

### Audio Processing
- Does two-pass LUFS normalization produce noticeable artifacts on Ace-Step output? If so, should we use single-pass or a simpler approach?
- What silence threshold works best for Ace-Step output? The default -40 dB may need tuning.
- Does Ace-Step consistently produce silence at the start/end, or is it intermittent? This determines whether silence_trim should default to true or false.

### Video Assembly
- Does ping-pong reversal look smooth for AI-generated video clips (LTX/Kling), or does the reversal look unnatural? If unnatural, simple loop may be a better default.
- How does crossfade interact with Ken Burns clips vs AI video clips? Does mixing transition styles within one assembly look jarring?
- At what CRF value does visible quality degradation start for this type of content (animated/AI-generated)?

### Word Cards
- Is FFMPEG's `drawtext` filter sufficient for Korean/Japanese text rendering, or should we use Pillow to render text to PNG first and then composite?
- Does the auto-color extraction produce good results in practice, or is a fixed color palette per language a better approach?
- What word card duration feels right — is 2 seconds too long, too short?

### Performance
- For a batch of 100 words, what's the total assembly time? Is it fast enough to not need progress reporting?
- Should the engine support parallel assembly of multiple words, or is sequential fine given FFMPEG's speed?

### Integration
- How does the final MP4 quality compare when using Ken Burns clips vs LTX clips vs Kling clips in the same assembly?
- Does the pedagogic word card intro feel natural as part of the viewing experience, or does it break immersion?

---

*This document is the build specification for the Assembly Engine. A coding agent building this engine should read this document alongside MASTER_ABSTRACT.md (for architecture rules and engine contract). When testing reveals answers to the open questions in Section 18, update this document. The abstract is a living specification.*
