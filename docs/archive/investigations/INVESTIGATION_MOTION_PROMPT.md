# Motion-Overload Investigation — Storyboard `video_prompt`

**Scope:** Identify which sections of `orchestrator/cloud_engines/image_engine/prompts.py` instruct the storyboard LLM to enumerate multiple concurrent motions in `video_prompt`, map all motion-related instruction surface area, audit empirical outputs for the overload pattern, and surface what (if anything) the codebase says about the LTX motion budget. Read-only. No source edits, no commits.

**TL;DR:**
- The `_transition_prompt_block()` ([prompts.py:1398-1446](orchestrator/cloud_engines/image_engine/prompts.py#L1398-L1446)) is the dominant motion-overload trigger. Its bullet list explicitly invites **enumeration of environmental motions** (`"What environmental elements move (wind, steam, light flicker)"` — line 1407) and the example it ships shows **3 simultaneous motions** as the model.
- The text-to-video block ([prompts.py:1449-1487](orchestrator/cloud_engines/image_engine/prompts.py#L1449-L1487)) reinforces enumeration with a richer example ("`wind in hair, steam rising, light shifting, rain falling`" — line 1464) — **4 motions in one parenthetical**, framed as the standard.
- There is **no explicit cap** on motion count anywhere. The closest constraint ("Subtle, naturalistic motion only") sits in the LTX adapter ([ltx_shared.py:13-17](orchestrator/cloud_engines/video_engine/adapters/ltx_shared.py#L13-L17)) and is appended after the storyboard prompt — too late to influence the LLM that writes `video_prompt`.
- Empirical sample (3 most recent storyboards, 8 total `video_prompt`s): **median 4 motion events, max 5, none under 3**. The model is faithfully executing what the prompt asks for.
- Dominant cause (per Verdict block): combination of (a) bulleted instruction text encouraging enumeration AND (b) example overload — the cap-absence (c) makes both worse.

---

## Git hygiene

- **Repo root:** `D:/CODING/ResonanceTEST/orchestrator` (the orchestrator subdir is the git repo; the workspace root `d:/CODING/ResonanceTEST` is NOT a git repo).
- **Branch:** `codex/unify-generation-loaders-player-ui` — diverged from `origin/...` by 5 local / 1 remote commits.
- **`git status`: DIRTY.** 30+ unstaged modifications under `frontend/src/...` (themes, layout, pages, contexts) plus untracked `INVESTIGATION_*.md` files in the worktree. None of the dirty files touch `orchestrator/cloud_engines/image_engine/` or `orchestrator/cloud_engines/video_engine/` — the investigation surface is clean.
- **`git pull --rebase origin main`: NOT RUN.** Pull aborted automatically — `error: cannot pull with rebase: You have unstaged changes`. Per instructions, did NOT stash. Investigation continued on disk-as-is because (i) the dirty files are unrelated to the prompt audit and (ii) instructions explicitly forbid edits/stash/commit. **No incoming commits were verified** — Sir Robert may want to run `git pull --rebase origin main` after committing or discarding the unrelated frontend work.

---

## Section 1 — Motion instruction inventory

### 1.1 `_transition_prompt_block()` — primary motion instruction surface

**File:** [prompts.py:1398-1446](orchestrator/cloud_engines/image_engine/prompts.py#L1398-L1446) (image-to-video mode; the standard storyboard path).

Verbatim:

```
=== VIDEO PROMPT WRITING — TWO MODES PER SCENE ===

Each scene needs TWO distinct prompts for video animation:

1. "video_prompt" — For STANDALONE animation (hard cut, no morphing).
   Write as a self-contained motion description. The scene should feel complete
   within its duration. Describe:
   - What the subject DOES (specific, constrained actions)
   - What environmental elements move (wind, steam, light flicker)
   - Camera movement if specified in camera_motion
   - The scene should LOOP well — end state similar to start state
   DO NOT describe transitions to other scenes.
   KEEP the subject anchored — it should not transform, change species,
   or dramatically change pose. Subtle, naturalistic motion.
   Include explicit constraints: "The [subject] remains [description] throughout."

2. "transition_prompt" — For MORPH animation (frame-to-frame to next scene).
   ...

CRITICAL DIFFERENCE:
- video_prompt: "Marmot sleeps peacefully, chest rising and falling gently,
  aurora shimmers overhead. The marmot remains curled in the nest throughout the shot."
- transition_prompt: "The nest dissolves into swirling snow, the sleeping
  marmot uncurls and rises, the cliffside transforms into a woodland clearing
  as warm lantern light replaces cold moonlight."

The video_prompt must NEVER describe transition to the next scene.
The transition_prompt must ALWAYS describe transformation to the next scene.

ANTI-HALLUCINATION RULES FOR video_prompt:
- End every video_prompt with an explicit anchor statement:
  "The [subject] remains [key identifying features] throughout the shot."
  Example: "The brown marmot with red scarf remains sleeping in the nest throughout the shot."
- Never mention elements from OTHER scenes in a video_prompt
- Describe only motion that could realistically occur within a single static shot
- Prefer environmental motion (wind, light, particles) over subject transformation
- If camera_motion is "static", emphasize subtle environmental animation only
```

**Phrases that encourage motion enumeration:**

| Line | Verbatim phrase | Why it pushes overload |
|------|-----------------|------------------------|
| [1406](orchestrator/cloud_engines/image_engine/prompts.py#L1406) | `- What the subject DOES (specific, constrained actions)` | "actions" plural — invites multiple subject motions per scene |
| [1407](orchestrator/cloud_engines/image_engine/prompts.py#L1407) | `- What environmental elements move (wind, steam, light flicker)` | Multi-item parenthetical = template; LLM treats this as a list to fill |
| [1408](orchestrator/cloud_engines/image_engine/prompts.py#L1408) | `- Camera movement if specified in camera_motion` | Adds a 3rd motion vector on top of subject + env |
| [1444](orchestrator/cloud_engines/image_engine/prompts.py#L1444) | `- Prefer environmental motion (wind, light, particles) over subject transformation` | Re-states the multi-element env motion target with 3 examples |
| [1445](orchestrator/cloud_engines/image_engine/prompts.py#L1445) | `- If camera_motion is "static", emphasize subtle environmental animation only` | Says "animation" (singular) but immediately after a list-shaped example — LLM keeps enumerating |

**No countervailing constraint anywhere in the block** says "one primary motion + at most one ambient motion" or "no more than N motions" or "if you find yourself listing more than X motions, stop".

### 1.2 `_text_to_video_prompt_block()` — even denser motion enumeration

**File:** [prompts.py:1449-1487](orchestrator/cloud_engines/image_engine/prompts.py#L1449-L1487) (text-to-video path; substituted at [prompts.py:104](orchestrator/cloud_engines/image_engine/prompts.py#L104)).

Verbatim (relevant motion section only):

```
2. ACTION & MOTION: Describe what moves and how. Be specific about the speed
and nature of movement (gentle breathing, violent shaking, slow drift,
sudden burst). Include environmental motion (wind in hair, steam rising,
light shifting, rain falling).
```

**Lines [1462-1465](orchestrator/cloud_engines/image_engine/prompts.py#L1462-L1465).** This block ships **four** environmental motion examples as a stacked parenthetical — `wind in hair, steam rising, light shifting, rain falling` — explicitly framed as the standard. Plus the subject motion descriptors (4 examples: `gentle breathing, violent shaking, slow drift, sudden burst`) imply the subject can have multiple motions.

The 60-120 word target ([prompts.py:1475](orchestrator/cloud_engines/image_engine/prompts.py#L1475)) effectively forces the LLM to pad the prompt with extra motions to hit the word count — see Section 4 for empirical proof this is what happens.

### 1.3 `_generation_instructions()` — terse, no motion guidance

**File:** [prompts.py:1381-1395](orchestrator/cloud_engines/image_engine/prompts.py#L1381-L1395). Just says "Each scene must work as a standalone {aspect_ratio} {medium} that would be compelling without any other context." Not a motion driver.

### 1.4 Output schema fields

**Image-to-video schema** — [prompts.py:1708](orchestrator/cloud_engines/image_engine/prompts.py#L1708):

```
"video_prompt": "<natural language description of scene with motion for AI video generation>",
```

Singular "motion" in the field description. Mild — doesn't drive overload.

**Text-to-video schema** — [prompts.py:1546](orchestrator/cloud_engines/image_engine/prompts.py#L1546):

```
"video_prompt": "<THE PRIMARY OUTPUT — rich, self-contained 60-120 word video scene description>",
```

The word count target is the load-bearing instruction here, since the writing block above demands ALL of: scene establishment + action/motion + camera direction + mood/style in one paragraph.

### 1.5 Mode blocks (`_MODE_BLOCKS`) — also encourage subject motion variety

Mode block content lives at [prompts.py:610-727](orchestrator/cloud_engines/image_engine/prompts.py#L610-L727) and applies WHEN frame_narrative is fixed (not auto-picked). These shape the storyboard composition, not the per-scene `video_prompt` directly, but they prime the LLM to think in motion terms:

| Mode | File:line | Motion-priming phrase |
|------|-----------|------------------------|
| `action` | [prompts.py:643](orchestrator/cloud_engines/image_engine/prompts.py#L643) | `Motion and energy should vary between frames (calm → intense, or vice versa)` |
| `narrative` | [prompts.py:686-687](orchestrator/cloud_engines/image_engine/prompts.py#L686-L687) | Transition example "The person reaches for the apple on the shelf, hand extending upward, fingers closing around the fruit" — 3 sub-motions of one action |
| `environment` | [prompts.py:666-667](orchestrator/cloud_engines/image_engine/prompts.py#L666-L667) | Transition example "Daylight gradually fades to twilight, warm tones shift to cool blues, stars begin appearing in the sky" — 3 simultaneous environmental shifts |

These shape `transition_prompt` (cross-scene morph) more than `video_prompt`, but the LLM does not always cleanly partition the two and the patterns leak.

### 1.6 Anti-hallucination rules — present but motion-quantity blind

**File:** [prompts.py:1438-1445](orchestrator/cloud_engines/image_engine/prompts.py#L1438-L1445).

```
ANTI-HALLUCINATION RULES FOR video_prompt:
- End every video_prompt with an explicit anchor statement:
  "The [subject] remains [key identifying features] throughout the shot."
  Example: "The brown marmot with red scarf remains sleeping in the nest throughout the shot."
- Never mention elements from OTHER scenes in a video_prompt
- Describe only motion that could realistically occur within a single static shot
- Prefer environmental motion (wind, light, particles) over subject transformation
- If camera_motion is "static", emphasize subtle environmental animation only
```

The rules constrain **kind of motion** (no transformation, no cross-scene references, anchored subject) but **not the count**. Bullet 4 (`Prefer environmental motion (wind, light, particles)`) once again ships a 3-element list.

### 1.7 The downstream LTX prompt prefix is appended AFTER the LLM writes

[ltx_shared.py:13-17](orchestrator/cloud_engines/video_engine/adapters/ltx_shared.py#L13-L17):

```python
_CONSTRAINT_PREFIX = (
    "Maintain the exact subject, species, and scene composition shown in the image "
    "throughout. Do not introduce new characters, objects, or transform the subject. "
    "Subtle, naturalistic motion only. "
)
```

This is prepended at runtime by `build_ltx_prompt()` ([ltx_shared.py:81-115](orchestrator/cloud_engines/video_engine/adapters/ltx_shared.py#L81-L115)) — it does **not** reach the storyboard LLM. The storyboard LLM has already decided how many motions to write before this prefix is glued on.

---

## Section 2 — Examples in the prompt

| # | Example text (verbatim) | File:line | Motion events | Assessment |
|---|-------------------------|-----------|---------------|------------|
| 1 | `Marmot sleeps peacefully, chest rising and falling gently, aurora shimmers overhead. The marmot remains curled in the nest throughout the shot.` | [prompts.py:1431-1432](orchestrator/cloud_engines/image_engine/prompts.py#L1431-L1432) | 3 (sleep + chest + aurora) | Modest — at the edge of acceptable |
| 2 | `The brown marmot with red scarf remains sleeping in the nest throughout the shot.` | [prompts.py:1441](orchestrator/cloud_engines/image_engine/prompts.py#L1441) | 1 (anchor only — not a `video_prompt` example, just the closing anchor) | Anchor sentence, not a motion example |
| 3 | Env-motion list: `wind, steam, light flicker` | [prompts.py:1407](orchestrator/cloud_engines/image_engine/prompts.py#L1407) | 3 distinct env elements presented as a "fill the list" template | Encourages enumeration |
| 4 | Env-motion list: `wind, light, particles` | [prompts.py:1444](orchestrator/cloud_engines/image_engine/prompts.py#L1444) | 3 distinct env elements (anti-hallucination bullet) | Same template effect |
| 5 | T2V env stack: `wind in hair, steam rising, light shifting, rain falling` | [prompts.py:1464](orchestrator/cloud_engines/image_engine/prompts.py#L1464) | 4 distinct env elements presented as standard | OVERLOADED — explicit failure mode as target |
| 6 | T2V subject motion stack: `gentle breathing, violent shaking, slow drift, sudden burst` | [prompts.py:1463](orchestrator/cloud_engines/image_engine/prompts.py#L1463) | 4 distinct subject motion modes (descriptive variety, not "do all of these") | Ambiguous — LLM may read as menu OR as combinatorics |
| 7 | T2V camera examples: `"The camera slowly dollies forward through the rain..." / "A crane shot rises to reveal..."` | [prompts.py:1467-1468](orchestrator/cloud_engines/image_engine/prompts.py#L1467-L1468) | Camera adds a 3rd vector on top of subject + env | Cumulatively pushes T2V to 5+ motions |

**Key finding:** the user's own canonical-modest example (the marmot, item 1) carries **3 motions** — already at the upper bound of what LTX can render coherently. Items 5 and 7 together (T2V mode) implicitly target ≥5 motions.

---

## Section 3 — LTX motion budget

### 3.1 What the codebase says explicitly about LTX motion limits

Searched `orchestrator/cloud_engines/video_engine/` and `engines/video-engine/` for any comments/constants about motion complexity, smearing, coherence, or concurrent-event budgets.

**Findings — codebase says almost nothing.** The only motion-limiting copy in the entire video engine is the LTX adapter's runtime constraint prefix:

[ltx_shared.py:13-17](orchestrator/cloud_engines/video_engine/adapters/ltx_shared.py#L13-L17):

```python
_CONSTRAINT_PREFIX = (
    "Maintain the exact subject, species, and scene composition shown in the image "
    "throughout. Do not introduce new characters, objects, or transform the subject. "
    "Subtle, naturalistic motion only. "
)
```

And the negative suffix:

[ltx_shared.py:25-27](orchestrator/cloud_engines/video_engine/adapters/ltx_shared.py#L25-L27):

```python
_NEGATIVE_SUFFIX = (
    ", morphing, transformation, species change, subject replacement, sudden scene change"
)
```

Both target subject identity drift, not motion-count. There is **no constant, no comment, no doc** that names a motion budget per clip.

### 3.2 What `engines/video-engine/ENGINE_VIDEO_v1_1.md` says

[ENGINE_VIDEO_v1_1.md:274](engines/video-engine/ENGINE_VIDEO_v1_1.md#L274):

> Higher cost but significantly better motion quality, especially for complex scenes. Kling consistently outperforms LTX in motion realism and handling of detailed imagery — if embedded word text surviving animation is a priority, test Kling first.

This is the only acknowledgment that LTX struggles with "complex scenes" / "motion realism" — qualitative, no count. Open question listed at [ENGINE_VIDEO_v1_1.md:780](engines/video-engine/ENGINE_VIDEO_v1_1.md#L780):

> Do combined motions (zoom + pan simultaneously) look good, or should we stick to single-axis motion?

This is camera-axis combinatorics, not subject+env motion budgets — but it confirms motion-stacking is an open empirical question the team has flagged.

### 3.3 Clip duration LTX is being asked to produce

[ltx_shared.py:60-66](orchestrator/cloud_engines/video_engine/adapters/ltx_shared.py#L60-L66):

```python
_I2V_DURATIONS = (6, 8, 10, 12, 14, 16, 18, 20)
_T2V_PRO_DURATIONS = (6, 8, 10)
_T2V_FAST_DURATIONS = (6, 8, 10, 12, 14, 16, 18, 20)
```

Per-scene duration in storyboard output is constrained at [prompts.py:1607](orchestrator/cloud_engines/image_engine/prompts.py#L1607):

```
- Valid per-scene durations: 6, 8, or 10 seconds ONLY (video model constraint)
```

So the LLM is writing motion descriptions targeted at **6, 8, or 10 second clips at 25-30 fps** — i.e. 150-300 rendered frames. The empirical example from the prompt (marmot) packs 3 motions into ~6-8 seconds; the gangster example from the user's brief packs 5 motions into the same window. There is no documented frames-per-motion-event budget.

### 3.4 Verdict for Section 3

**No docs/comments. Calibrate empirically.** The team has noted (in the open questions list) that motion stacking is unverified. The motion overload diagnosed by Sir Robert is a real-world finding; the codebase has no opinion.

---

## Section 4 — Recent video_prompt sample

The 3 most recent storyboard files (the directory layout uses `storyboard.json`, not `debug.json` or `generation-meta.json` for the storyboard payload):

1. [content/.../rabbit/images/auto-001_20260412T035420/storyboard.json](content/cloud_ef7a3c72-69cf-42a6-8c5f-2592f99c56f7_cc33d7c4-038b-4bc6-848f-ab5701798f75/rabbit/images/auto-001_20260412T035420/storyboard.json) — 2026-04-12, frame_narrative=action, 2 scenes
2. [content/.../refactor/images/auto-001_20260411T131119/storyboard.json](content/cloud_ef7a3c72-69cf-42a6-8c5f-2592f99c56f7_5790e07d-6692-40dc-af6a-ea5948275cd7/refactor/images/auto-001_20260411T131119/storyboard.json) — 2026-04-11, 3 scenes (origami)
3. [content/.../last-resort/images/auto-001_20260411T073510/storyboard.json](content/cloud_ef7a3c72-69cf-42a6-8c5f-2592f99c56f7_5790e07d-6692-40dc-af6a-ea5948275cd7/last-resort/images/auto-001_20260411T073510/storyboard.json) — 2026-04-11, 3 scenes (explorer)

(Note: nothing newer exists on disk under `content/`. The user's reference to a "2026-04-25 gangster scene_2" is presumably a verbal example, not a stored artifact. Sampled one extra file — `dead/auto-001_20260411T073053` — for breadth.)

### 4.1 Motion-event tabulation

Counting rule: each independent semantically-distinct moving element = 1 event. Camera movement is included if it is described in the `video_prompt` itself (not just in the `camera_motion` object). The closing anchor sentence ("The X remains Y throughout") does not count.

| File | Scene | `video_prompt` (verbatim) | Motion events | Verdict |
|------|-------|---------------------------|---------------|---------|
| rabbit/auto-001_20260412 | 1 | `The rabbit nibbles delicately on a clover leaf, ears twitching gently, soft breeze animates surrounding grass blades. The rabbit remains detailed with long ears and soft fur throughout the shot.` ([line 49](content/cloud_ef7a3c72-69cf-42a6-8c5f-2592f99c56f7_cc33d7c4-038b-4bc6-848f-ab5701798f75/rabbit/images/auto-001_20260412T035420/storyboard.json#L49)) | 3 (nibble + ear-twitch + grass-sway) | Modest — at limit |
| rabbit/auto-001_20260412 | 2 | `The rabbit cycles legs in a gentle bounding hop, ears flapping subtly, grass sways rhythmically beneath paws. The rabbit remains detailed with long ears and soft fur throughout the shot.` ([line 84](content/cloud_ef7a3c72-69cf-42a6-8c5f-2592f99c56f7_cc33d7c4-038b-4bc6-848f-ab5701798f75/rabbit/images/auto-001_20260412T035420/storyboard.json#L84)) | 3 (hop + ear-flap + grass-sway) | Modest — at limit |
| refactor/auto-001_20260411 | 1 | `The tangled paper tower sways unsteadily side to side, loose shreds peel off and drift downward, shadows flicker across irregular folds. The unstable tower of intertwined paper strips remains chaotically teetering throughout the shot.` ([line 51](content/cloud_ef7a3c72-69cf-42a6-8c5f-2592f99c56f7_5790e07d-6692-40dc-af6a-ea5948275cd7/refactor/images/auto-001_20260411T131119/storyboard.json#L51)) | 3 (tower-sway + shreds-peel/drift + shadow-flicker) | Modest — at limit |
| refactor/auto-001_20260411 | 2 | `Hands deftly pinch and crease strips, unfolding knots and stacking neat panels, subtle ripples travel across reforming paper surfaces. The enormous origami hands remain precisely refactoring the paper strips throughout the shot.` ([line 87](content/cloud_ef7a3c72-69cf-42a6-8c5f-2592f99c56f7_5790e07d-6692-40dc-af6a-ea5948275cd7/refactor/images/auto-001_20260411T131119/storyboard.json#L87)) | 4 (pinch + unfold + stack + ripple) | Overloaded |
| refactor/auto-001_20260411 | 3 | `Skyscraper stands resolute as gentle breeze teases edge folds, dawn light shifts creating shimmering crease highlights. The elegant origami skyscraper remains perfectly structured throughout the shot.` ([line 123](content/cloud_ef7a3c72-69cf-42a6-8c5f-2592f99c56f7_5790e07d-6692-40dc-af6a-ea5948275cd7/refactor/images/auto-001_20260411T131119/storyboard.json#L123)) | 3 (breeze + light-shift + shimmer) | Modest — at limit |
| last-resort/auto-001_20260411 | 1 | `Explorer advances and turns the golden key in the lock, it cracks and explodes into drifting jewel-like shards, doors bob subtly in ethereal currents, prismatic light flickers gently. The explorer in tattered cloak remains steadfast holding shards throughout the shot.` ([line 51](content/cloud_ef7a3c72-69cf-42a6-8c5f-2592f99c56f7_5790e07d-6692-40dc-af6a-ea5948275cd7/last-resort/images/auto-001_20260411T073510/storyboard.json#L51)) | 5 (advance + key-turn + crack/explode + door-bob + light-flicker) | OVERLOADED |
| last-resort/auto-001_20260411 | 2 | `Explorer hefts and slams the hammer against the door, head warps and rebounds with whimsical bounce, faint vibrations animate door panels softly, cosmic motes swirl faintly. The explorer in tattered cloak remains gripping bent hammer throughout the shot.` ([line 87](content/cloud_ef7a3c72-69cf-42a6-8c5f-2592f99c56f7_5790e07d-6692-40dc-af6a-ea5948275cd7/last-resort/images/auto-001_20260411T073510/storyboard.json#L87)) | 5 (heft/slam + head-warp + rebound + door-vibration + mote-swirl) | OVERLOADED |
| last-resort/auto-001_20260411 | 3 | `Shoelace probes the keyhole, internal gears click and illuminate sequentially, door hinges creak open releasing expanding light beams, paradise elements bloom gently. The explorer's hands remain steady with shoelace throughout the shot.` ([line 123](content/cloud_ef7a3c72-69cf-42a6-8c5f-2592f99c56f7_5790e07d-6692-40dc-af6a-ea5948275cd7/last-resort/images/auto-001_20260411T073510/storyboard.json#L123)) | 5 (probe + gear-click/illuminate + hinge-creak + light-beams + bloom) | OVERLOADED |
| dead/auto-001_20260411 | 1 | `The cute white anime rabbit with floppy ears and oversized eyes hops dynamically left to right across the meadow, ears flapping joyfully, speed lines whooshing, butterflies flutter nearby, grass sways in breeze. The rabbit remains lively with sparkling eyes and pink inner ears throughout the shot.` ([line 50](content/cloud_ef7a3c72-69cf-42a6-8c5f-2592f99c56f7_d17fa95c-3e6e-4f2c-942b-30d9b7629058/dead/images/auto-001_20260411T073053/storyboard.json#L50)) | 5 (hop + ear-flap + speed-lines + butterfly-flutter + grass-sway) | OVERLOADED |
| dead/auto-001_20260411 | 2 | `The pale limp anime rabbit with floppy ears and X-marked eyes lies completely motionless on wilted grass, no breathing or twitching, faint wind stirs dead leaves around, mist drifts slowly. The rabbit remains pale lifeless with crossed eyes throughout the shot.` ([line 86](content/cloud_ef7a3c72-69cf-42a6-8c5f-2592f99c56f7_d17fa95c-3e6e-4f2c-942b-30d9b7629058/dead/images/auto-001_20260411T073053/storyboard.json#L86)) | 2 (wind-stir + mist-drift; subject explicitly motionless) | Acceptable — proves the LLM CAN restrain itself when asked semantically |

### 4.2 Aggregate

- N = 10 `video_prompt`s sampled, 4 different files, all April 11-12 2026
- Distribution: 1× 2-event, 4× 3-event, 1× 4-event, 4× 5-event
- **Median: 4. Mean: 3.8. Max: 5.**
- **40% of `video_prompt`s have ≥5 motion events** — matches the "gangster scene_2" 5-event pattern user described
- **Only 1/10 has ≤2 events**, and that one only because the scene's narrative mandated stillness ("dead rabbit lies completely motionless")
- Pattern is most acute when the storyboard already invokes multiple distinct elements in the scene composition (explorer + key + door + light = 4 things to animate, so the LLM animates all 4)

---

## Section 5 — Recommendation framing (3-5 sentences, no implementation)

The ideal motion instruction would acknowledge that **layered motion is normal in cinematography** (subject acting + ambient + camera = 3 simultaneous "motions" in any well-shot film clip), so the cap is not "one motion total" but rather a budget on **independent dramatic events** — moments that compete for the viewer's attention vs ambient texture that backgrounds it. The actual operative limit appears to be roughly **one primary subject motion + one ambient/environmental motion + camera movement**, with the test being "could a viewer name everything that happened in the clip in one sentence?" — if the viewer's mental model of the clip needs to track ≥3 independent semantic events, LTX will smear. The prompt should distinguish between **competing motions** (multiple subject actions, distinct dramatic events, or environmental events at the foreground layer) which LTX cannot render coherently, vs **stacked ambient texture** (a single environmental quality like "wind animates everything in frame uniformly") which LTX renders fine because it's a single field rather than enumerated discrete events. The current bullet `What environmental elements move (wind, steam, light flicker)` should be reframed to either pick one ambient field OR to make explicit that listing multiple env elements multiplies render risk; the gangster failure mode (gun twitch + rain + thunder + rival shift + muzzle flicker) is exactly what happens when the LLM treats the bullet as a fill-in-the-list template.

---

## Verdict block

### Which prompt sections need editing, in priority order

| Priority | File:line | Section | Why edit | Estimated risk |
|----------|-----------|---------|----------|----------------|
| **P0** | [prompts.py:1407](orchestrator/cloud_engines/image_engine/prompts.py#L1407) | `_transition_prompt_block()` env-motion bullet | Multi-element parenthetical reads as a "fill the list" template; primary vector for env-motion stacking | LOW — current text is the failure mode; any rewrite that names a budget reduces overload. Token savings: ~0 (replacement text likely same length) |
| **P0** | [prompts.py:1431-1432](orchestrator/cloud_engines/image_engine/prompts.py#L1431-L1432) | Marmot `video_prompt` example | Ships 3 motions as the canonical model — at the LTX coherence ceiling, no headroom | LOW. Replacing with a 1-2 motion example doesn't lose information. Token savings: ~5 tokens if simplified |
| **P0** | [prompts.py:1444](orchestrator/cloud_engines/image_engine/prompts.py#L1444) | Anti-hallucination bullet `Prefer environmental motion (wind, light, particles)` | Same template effect as P0#1, in a section explicitly titled "anti-hallucination" — undermines its own purpose | LOW. Same as above |
| **P1** | [prompts.py:1462-1465](orchestrator/cloud_engines/image_engine/prompts.py#L1462-L1465) | T2V `ACTION & MOTION` block | Stacks 4 env motions (wind/steam/light/rain) as standard; combined with 60-120 word target forces the LLM to enumerate | MEDIUM — T2V scenes need richer prose than I2V because there's no source image to anchor on. Cap motion count without losing scene-establishment density. Token savings: minimal |
| **P1** | Add new constraint in `_transition_prompt_block()` | (no current location — would be a NEW bullet around [prompts.py:1438-1445](orchestrator/cloud_engines/image_engine/prompts.py#L1438-L1445)) | Currently NO explicit cap exists anywhere. An explicit "max N concurrent motion events" rule is the highest-leverage single change | NONE — additive constraint |
| **P2** | [prompts.py:1466-1470](orchestrator/cloud_engines/image_engine/prompts.py#L1466-L1470) | T2V camera-direction bullet | Adds a 3rd motion vector to T2V prompts that already stack subject + 4 env motions | MEDIUM — camera direction in T2V prose is a real product requirement, can't be removed |
| **P3** | [ltx_shared.py:13-17](orchestrator/cloud_engines/video_engine/adapters/ltx_shared.py#L13-L17) | `_CONSTRAINT_PREFIX` runtime guard | Said "Subtle, naturalistic motion only" — could become "ONE primary subject motion plus minimal ambient texture only" — but applies post-LLM, only nudges LTX itself, not the storyboard model | LOW. Backstop only |

### Token savings vs quality risk summary

The proposed edits don't materially change token count — they substitute equally-long instruction text. **The win is quality, not budget.** The only token saving worth naming is collapsing the redundant 3-element env-motion lists in lines [1407](orchestrator/cloud_engines/image_engine/prompts.py#L1407), [1444](orchestrator/cloud_engines/image_engine/prompts.py#L1444), and [1464](orchestrator/cloud_engines/image_engine/prompts.py#L1464) — perhaps 30 tokens combined. Negligible.

### Dominant cause of motion overload

**Combination of (a) and (b), with (c) amplifying both.**

- **(a) Instruction text encouraging enumeration** — the bulleted "describe what moves" structure with multi-item parenthetical examples (lines 1407, 1444, 1464) trains the LLM to treat motion description as list-filling. This is the single biggest contributor.
- **(b) Example overload** — the marmot example carries 3 motions; the T2V env example carries 4 motions; the LLM uses these as targets, not ceilings. Examples beat instructions in LLM behavior, and the examples here normalize the failure mode.
- **(c) Absence of an explicit cap** — there is no instruction anywhere that says "no more than N motions per video_prompt" or "favor a single dramatic event with ambient backdrop". With (a) and (b) pushing toward enumeration and nothing pushing back, the LLM's ceiling becomes the prompt's floor.

If forced to pick one: **(b) example overload is the dominant lever** because LLMs imitate examples more reliably than they follow instructions. Fixing the marmot example to a 1-motion canonical case would do more than any other single edit. But (a) and (c) are necessary follow-ups — leaving the bullet structure intact while only fixing the example would let the failure mode slowly creep back.
