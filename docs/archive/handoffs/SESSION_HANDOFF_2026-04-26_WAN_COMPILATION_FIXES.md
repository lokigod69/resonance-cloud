# Session Handoff — 2026-04-26 — Wan Compilation Quick Fixes + Motion Cap

## What this session was supposed to be

Empirical validation of the four-value image router (`flux_pro`, `zturbo`, `wan_fast`, `wan_pro`) shipped in the previous session. Run real generations, find bugs, fix them.

## What it became

A debugging spiral that uncovered four latent bugs in `prompt_compiler.py` (since 2026-04-11), confirmed the V4 Flash empty-content failure mode in concept engine, ran git archaeology on a phantom Magritte removal, ran two formal investigations, and pushed three production fixes. Image router validation itself never finished — only Flux was tested empirically. Wan was used for the final test generations through the new compilation. Z-Turbo was never tested.

The session was productive but the original validation goal slipped. The image router is no closer to being characterized across all four providers than it was at session start.

## Commits pushed to main

| SHA | Subject | Notes |
|-----|---------|-------|
| `91eee25c` | `fix(llm): remove max_tokens caps starving V4 Flash reasoning` | Concept engine + creative direction picker — caps removed at 4 sites, token usage logging added |
| `992ac219` | `fix(image): Flux Kie.ai resolution 2K → 1080p, update cost literal` | `kie_provider.py` resolution → "1K" enum, cost literal $0.035 → $0.025 |
| `dfd7c082` | `fix(image): Wan compilation quick fixes — drop Avoid list, gate reference context, remove MJ-era preamble` | `prompt_compiler.py` + `wan_provider.py` |
| `6cfcb0d7` | `fix(prompt): cap storyboard video_prompt motion events at 2` | `prompts.py` — marmot example replaced, env-motion bullet rewritten, MOTION BUDGET rule added |

All four pushed direct to main, no rebases, scoped staging only. Dirty frontend files in the worktree were not touched.

## Investigation reports authored this session

Three formal investigations, all read-only, all in repo root:

1. `INVESTIGATION_MAGRITTE_HISTORY.md` — Sir Robert recalled removing the "Think Magritte, not Dali" anchor at some prior point. Verdict: **Magritte language has been present in the cloud repo since the file's first commit `c45dbd4` on 2026-04-11.** Pickaxe across all branches showed additions only, no removal+re-addition. Reflog and stash clean. The removal Sir Robert remembers must have happened in a different path (likely the local-orchestrator era `D:\CODING\engine-image\src\prompts.py`) before the cloud migration copied a stale version forward. Not worth more archaeology — fix is forward-only.

2. `INVESTIGATION_STORYBOARD_PROMPT_AUDIT.md` — Token bloat audit. Provocative + auto + 3 scenes = ~3445 tokens. Movie + 3 scenes = ~4966. All common configs over the 2500-token "candidate for pruning" flag. Major finding: **named-artist anchors are everywhere**, not just provocative. `_image_model_block("flux_pro")` references Gerhard Richter and Deakins; `_image_model_block("zturbo")` references iPhone, Leica M6, Kodak Portra 400; `ART_STYLE_DESCRIPTIONS` parades 30+ named artists/franchises in front of the LLM as a buffet. Provocative Magritte/Dali is the most egregious because it's a forced X-not-Y contrast (both anchor), but the rest is the same family of bug. Schema sanitizer leaks: `creative_direction` returns as `"LITERAL"`, `"VISUALLY ARRESTING"`, `"visually_arresting"` — none valid enum values. Nine ordered pruning recommendations listed.

3. `INVESTIGATION_PROVIDER_COMPILATION.md` — The headline report. **The Wan compilation bugs are not a router regression.** They've been latent in `prompt_compiler.py` since `c45dbd4` on 2026-04-11. The router work introduced parallel problems: Flux and Z-Turbo got the same scene-1 chain-on-t2i bug (Gemini-flavoured wording prepended to text-to-image scenes), `CHAIN_INSTRUCTIONS_FLUX` and `CHAIN_INSTRUCTIONS_ZTURBO` are literal `dict(CHAIN_INSTRUCTIONS)` clones of the Gemini table that the team rewrote for Wan because Gemini wording reinforced img2img dominance, and `use_color_palette` is silently ignored on both new providers.

4. `INVESTIGATION_MOTION_PROMPT.md` — Motion overload audit. Storyboard LLM producing video_prompts with **median 4 motion events, max 5, 40% have ≥5**. Three compounding causes: (a) bullet structure with multi-item parentheticals reads as "fill the list", (b) marmot canonical example shipped 3 motions as the target — example beats instruction, (c) no explicit cap exists anywhere. Codebase has zero documented LTX motion budget — `engines/video-engine/ENGINE_VIDEO_v1_1.md` flags motion stacking as an open empirical question.

## What was actually fixed

### V4 Flash empty content (commit `91eee25c`)
Concept engine returned empty content on word "hard" because reasoning tokens consumed the 256-token cap. Removed caps at:
- `cloud_engines/concept_engine/llm_client.py` — implicit 256 cap in `OpenRouterClient.generate()`
- `cloud_engines/concept_engine/caption.py` — explicit `max_tokens=256`
- `cloud_engines/concept_engine/lyrics.py` — explicit `max_tokens=1024`
- `src/pipeline.py` — creative direction picker `max_tokens=200`

Token usage logging added at all modified sites. `pipeline_events` metadata now captures `completion_tokens` and `reasoning_tokens` for concept LLM calls.

Caps deliberately kept:
- `cloud_engines/image_engine/storyboard.py` — `LLM_MAX_TOKENS=8192` already generous
- `src/routers/words.py:500` — interactive word suggestion endpoint, outside per-word concept path. Same failure mode possible if word suggestions hit V4 Flash. Park.

### Flux 2K → 1K resolution (commit `992ac219`)
Kie.ai Flux 2 Pro requests were sending `"resolution": "2K"` ($0.035/image). Downstream resize crops to 1920×1080 anyway and LTX upscales again. Switched to `"1K"` ($0.025/image), ~30% cost reduction per Flux generation. Cost literal in `cost_logger.py` updated.

Note: Kie's enum is `1K|2K`, no literal `1080p` or `FHD` value. Output dimensions at 1K need eyeballing — the existing 1920×1088 → 1920×1080 resize step is now doing real upscale work instead of cosmetic crop.

### Wan compilation fixes (commit `dfd7c082`)
Four issues in `prompt_compiler.py` latent since 2026-04-11:

1. **`Avoid:` list deleted entirely.** `DEFAULT_NEGATIVE` constant removed, emission removed. Wan exposes no `negative_prompt` API field, so the list was being concatenated into the main prompt where every word became a positive concept. "blurry eyes, bad hands, deformed anatomy, extra fingers" was teaching Wan to render those things.

2. **`Reference context:` block now gated on `has_reference_image` boolean.** New keyword-only parameter on `compile_scene_to_text`. Caller (`wan_provider.py`) passes the boolean explicitly. Scene 1 (no reference image) no longer receives chain-context language about an image that doesn't exist.

3. **`Create a high-quality image of` MJ-era preamble removed.** Bare subject opening (`{subject} in {scene_desc}.`) replaces it.

4. **`In the style of X:` prefix removed.** Labeled `Style: X.` section at position 2 carries the style on its own.

Manual verification in the agent's session report:
```
--- has_reference_image=False ---
A glass sculpture in a quiet gallery with soft morning light. Style: minimalist cinematic realism. Composition: centered three-quarter view. Lighting: diffuse window light. Mood: calm and precise. Details: fine refractions and clean edges.

--- has_reference_image=True ---
A glass sculpture in a quiet gallery with soft morning light. Style: minimalist cinematic realism. Reference context: Use the provided reference image only for subject identity. Composition: centered three-quarter view. Lighting: diffuse window light. Mood: calm and precise. Details: fine refractions and clean edges.
```

### Motion overload cap (commit `6cfcb0d7`)
Three edits in `prompts.py` `_transition_prompt_block`:

1. **Marmot canonical example replaced.** Old: `Marmot sleeps peacefully, chest rising and falling gently, aurora shimmers overhead.` (3 motion events.) New: `Marmot sleeps curled in the nest, chest rising and falling gently. Soft snow drifts across the cliff face.` (1 subject motion + 1 ambient field.)
2. **Env-motion bullet rewritten** from `(wind, steam, light flicker)` to `pick ONE: wind animating everything uniformly, OR rain texturing the frame, OR shifting light. Do not enumerate.`
3. **MOTION BUDGET bullet added** to anti-hallucination rules: `Maximum two motion events per video_prompt — one primary subject motion plus one ambient field. Camera movement is separate and does not count.`

**Sir Robert's call-out, recorded for the rework:** the cap-of-two is too restrictive. LTX likely handles sequential subject actions (smile then walk) plus ambient field plus camera. The right framing is *concurrent dramatic events* (smear) vs *sequential actions + ambient + camera* (renders fine). Cap-of-two is a quick patch that overcorrects from median-4-overload. Acceptable for now because it stops the gangster-style 5-event failure mode. Needs empirical LTX characterization in the proper rework.

## What remains broken / unverified

### Cross-provider issues introduced by router work, unobserved

Per the provider compilation investigation — these have not been hit empirically because tests have only run Wan and Flux briefly:

1. **Flux scene-1 chain-on-t2i bug.** `kie_provider.py:82-83` prepends Gemini-flavoured chain text (`"Using the provided reference image as the previous moment in the story..."`) to scene 1 even when no reference image attached. Will surface as soon as Flux gets serious testing.

2. **Z-Turbo scene-1 chain-on-t2i bug.** Same shape, `fal_provider.py:123-124`.

3. **`CHAIN_INSTRUCTIONS_FLUX` and `CHAIN_INSTRUCTIONS_ZTURBO` are unmodified Gemini clones.** The Wan table was rewritten because Gemini's "SAME subject, stays consistent" wording reinforced img2img dominance and caused scene degradation. Flux i2i and Z-Turbo i2i now inherit that exact failure mode.

4. **`use_color_palette` silently ignored on Flux and Z-Turbo.** Wan honors it; new providers don't.

5. **Flux JSON-dump compilation strategy.** `kie_provider.py:81-83` does `json.dumps(image_prompt)` and prepends chain. No structural compilation. Whether Flux 2 Pro actually parses raw JSON better than natural-language compilation is empirically unverified — it's the deep research claim that drove the design but has never been A/B tested.

### Magritte anchor still in code

The provocative creative-direction block still contains `Think: Magritte, not Dali. Purposeful strangeness, not random weirdness. Think: a cow in a business suit at a boardroom table, not a cow melting into a clock.` at lines 539–568 of `prompts.py`. Only fires when picker resolves to `provocative`. Concrete nouns and cinematic-leaning words don't hit it. Still wrong, still needs removal in the proper rework.

### Storyboard system prompt is bloated and full of anchors

Per `INVESTIGATION_STORYBOARD_PROMPT_AUDIT.md`, all common configs are over 2500 tokens. Provocative + auto + 3 scenes = ~3445. Movie + 3 = ~4966. Named-artist anchors throughout: Gerhard Richter and Deakins in `_image_model_block("flux_pro")`, Leica/Kodak Portra in `_image_model_block("zturbo")`, 30+ named artists/franchises in `ART_STYLE_DESCRIPTIONS`. Schema sanitizer leaks `"VISUALLY ARRESTING"` and `"LITERAL"` as creative_direction values that never normalize.

### Ernie-Image-Turbo not yet integrated

Was the next dedicated feature chat after this one. Remains queued.

## Image quality observations from this session

### Flux 2 Pro on "atrocious" (provocative + narrative + i2i chain)
- Scene 1 (t2i, $0.035 at 2K): Acceptable Victorian dinner scene. Magritte-surrealism style was the LLM's anchor-driven choice. The art direction was dominated by the "Think Magritte, not Dali" anchor in the provocative block.
- Scenes 2 and 3 (i2i with `flux-2/pro-image-to-image` at strength=API-default): Composition locked from scene 1 (same table, chandelier, seating), gore detail painted on top, faces distorting with each i2i pass. Stylistic collapse pass-over-pass.
- Diagnosis: narrative mode + Flux i2i is structurally hostile. i2i wants to preserve composition; narrative wants subject and setting to evolve. They fight.

### Wan 2.7 on "gangster" (cinematic + narrative + 3 scenes)
- All scenes ran through pre-fix `prompt_compiler.py`. Final API prompts contained `In the style of noir: Create a high-quality image of...`, `Reference context:` on scene 1 with no reference image, `Avoid: low quality, blurry eyes, bad hands...`. Output had distorted faces, blurry eyes, bad hands — the literal artifacts the Avoid list claimed to prevent.
- After the `dfd7c082` fix, the same scene composition compiles to clean output without negatives-as-positives.

### V4 Flash concept engine
- Predicted failure mode (reasoning eats max_tokens, returns empty content) hit on first real generation. `91eee25c` fix removes caps and adds usage logging. Need to monitor real reasoning token consumption over next few generations to see if any new ceiling is needed.

## Decisions made this session

- **Quick fixes, not proper rework.** Sir Robert explicitly chose surgical patches over a full storyboard system prompt rewrite. The proper rework will happen in a dedicated chat with empirical research on what each image model actually wants.
- **Solo-on-main protocol enforced.** No rebases, scoped commits only, dirty frontend files left untouched. Memory entry 3 is the standing rule. Earlier in the session two prompts went out with the wrong rebase-and-clean-tree protocol; addenda were sent to correct.
- **Image router validation deferred.** Original session goal was empirical validation across all four providers. Only Flux and Wan got real generations. Z-Turbo, wan_fast, wan_pro untested. The combined investigation+fix work consumed the session.
- **Motion budget cap-of-two accepted as quick patch despite being too restrictive.** Will be revisited when LTX motion budget is empirically characterized.
- **Magritte anchor removal deferred.** Only fires on `provocative` direction. Park until proper rework.

## Open prompts written but not dispatched

None. All prompts written this session were dispatched and pushed.

## Continuation prompt for next chat

The next chat should start with one stable model (Wan 2.7) and validate the four fixes in sequence before moving to Z-Turbo and Flux as separate sprints.

```
I am Sir Robert, founder and sole developer of Resonance Cloud. Previous
session handoff is attached: SESSION_HANDOFF_2026-04-26_WAN_COMPILATION_FIXES.md.
Read it first.

This chat: validate four production fixes pushed in the last session by
running real generations through Wan 2.7 first, before touching Z-Turbo
or Flux. The four fixes:

1. 91eee25c — V4 Flash max_tokens caps removed, usage logging added
2. 992ac219 — Flux Kie 2K→1K resolution
3. dfd7c082 — Wan compilation: drop Avoid, gate Reference context,
   remove MJ-era preamble, remove style prefix duplication
4. 6cfcb0d7 — MOTION BUDGET cap of 2 motion events per video_prompt

Validation order:

1. Pick a German concrete noun, generate one deck through Wan 2.7
   (image_model = wan_fast or wan_pro). After generation, inspect:
   a) Wan request body in pipeline_events — confirm no "Avoid:" string,
      no "Create a high-quality image of" preamble, no "In the style of"
      prefix, no "Reference context:" on scene 1
   b) Concept engine pipeline_events metadata — confirm reasoning_tokens
      and completion_tokens are now logged, confirm content is non-empty
   c) storyboard.json video_prompt fields per scene — count motion events,
      confirm ≤2 per scene (subject + ambient, camera separate)
   d) Resulting images — eyeball for absence of the specific artifacts
      the Avoid list was supposedly preventing (blurry eyes, bad hands)

2. If any of those checks fail, root-cause it before moving on. Each
   failure is a real bug to fix, not a configuration tweak.

3. If all four checks pass on Wan, repeat with the same word on
   Flux 2 Pro. Expected new bugs to surface (per session handoff
   "What remains broken / unverified" section): scene-1 chain-on-t2i
   with Gemini-flavoured wording, use_color_palette ignored,
   CHAIN_INSTRUCTIONS_FLUX is a stale Gemini clone. Document each as
   it appears.

4. Park Z-Turbo until Flux is characterized.

5. The motion cap of 2 is empirically known to be too restrictive.
   Sir Robert wants to test what LTX actually handles before deciding
   the right cap. After validation generations, if motion looks
   under-rendered, that's the data point that tells us the cap needs
   to relax.

DO NOT touch the storyboard system prompt this chat. The proper rework
is its own chat with deep research on what each image model wants.
This chat is empirical validation only.

DO NOT investigate Ernie-Image-Turbo. Separate dedicated chat queued
after this one.

DO NOT chase the Magritte anchor in the provocative block. It only
fires when creative_direction resolves to provocative. Park until
proper rework.

Workflow principles: investigation-first, no scope creep, root-cause
fixes only, surgical commits, no rebases. Memory entry 3 is the git
protocol. Confirm understanding and propose what word/profile combo
to test first before generating.
```

## Files referenced

- `cloud_engines/image_engine/prompt_compiler.py`
- `cloud_engines/image_engine/wan_provider.py`
- `cloud_engines/image_engine/kie_provider.py`
- `cloud_engines/image_engine/fal_provider.py`
- `cloud_engines/image_engine/prompts.py`
- `cloud_engines/image_engine/renderer.py`
- `cloud_engines/concept_engine/llm_client.py`
- `cloud_engines/concept_engine/caption.py`
- `cloud_engines/concept_engine/lyrics.py`
- `src/pipeline.py`
- `cost_logger.py`

## Reports preserved in repo

- `INVESTIGATION_MAGRITTE_HISTORY.md`
- `INVESTIGATION_STORYBOARD_PROMPT_AUDIT.md`
- `INVESTIGATION_PROVIDER_COMPILATION.md`
- `INVESTIGATION_MOTION_PROMPT.md`

All four are read-only audits, untracked or committed depending on agent behavior. Worth grepping during the proper system-prompt rework chat.
