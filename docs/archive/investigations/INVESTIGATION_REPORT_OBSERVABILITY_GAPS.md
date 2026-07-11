<!-- READ-ONLY investigation. No code changes, no migrations, no git writes. -->
<!-- Evidence-cited gap analysis for Sir Robert + adversarial review. -->

# Investigation Report — Engine Observability Gaps, admin_pin Fix Options, Ferrari Scoping (Narrowed)

**Date:** 2026-04-20
**Repo under inspection:** `d:\CODING\ResonanceTEST\` (active code lives under `orchestrator/`; git-connected frontend is `orchestrator/frontend/`).
**Mode:** Read-only. No files edited, no migrations authored, no git writes.
**Prior artifact ingested:** [INVESTIGATION_REPORT_ADMIN_OBSERVABILITY.md](_spotcheck/resonance-cloud/INVESTIGATION_REPORT_ADMIN_OBSERVABILITY.md) (operated on an older snapshot — some of its claims are now stale; see §2 + §4).

---

## 1. Executive summary

**Headline finding, Topic 1 (observability):** Every engine writes a per-stage `generation-meta.json` to disk, but the depth of capture is wildly uneven. The **image engine** already captures full prompts, full LLM responses, and per-scene image prompts — not in `generation-meta.json` but in a sibling **`debug.json`** ([image_engine/engine.py:301-335](orchestrator/cloud_engines/image_engine/engine.py#L301-L335)). The **video engine** captures the final video prompt, settings used, seed, and Fal.ai request_id ([video_engine/engine.py:219-326](orchestrator/cloud_engines/video_engine/engine.py#L219-L326)). The **concept engine** captures only `llm_calls_made` (a count) and `caption_source` — full prompts and full responses are lost ([concept_engine/engine.py:327-335](orchestrator/cloud_engines/concept_engine/engine.py#L327-L335)). The **song stage is a stub**: `cloud_engines/song_engine/` contains only `models.py` + `language.py`; the placeholder at [cloud_dispatcher.py:111-151](orchestrator/cloud_dispatcher.py#L111-L151) creates a silent FLAC and writes NO `generation-meta.json`. The **assembly engine** captures original + normalized LUFS but does not re-measure the final mux's LUFS or peak; gap/overflow strategy is implied via flags rather than named. The **bookend engine** captures voice_id, model_id, characters_used, extracted colors, but no TTS retry count, no TTS LUFS values, no voice-cloned-vs-library flag.

**Compounding gap:** `collect_word_metadata()` at [metadata.py:71-196](orchestrator/src/services/metadata.py#L71-L196) — the aggregator that the prior investigation said feeds `words.metadata` — is **defined but never called** in the current `orchestrator/` codebase. `words.metadata` (jsonb column, migration [20260325000000_admin_content_columns.sql:4](orchestrator/frontend/supabase/migrations/20260325000000_admin_content_columns.sql#L4)) is orphaned. The Admin Metrics and WordDetailPanel pages that the prior investigation described as reading this column will be reading `null`.

**Schema proposal headline:** A new `pipeline_events` table (append-only, one row per LLM call / external API call / named engine decision) with full-text prompt + response columns and a JSONB `metadata` grab-bag. JSON files on disk stay as belt-and-braces ground truth; DB becomes the queryable mirror and the source of truth for cross-stage aggregates (cost, tokens, timings, failure rates).

**Instrumentation headline:** A thin `logged_llm_call()` / `logged_api_call()` helper wrapping each outbound client is the cleanest insertion point — image engine already wraps OpenRouter through a single `_call_openrouter()` ([storyboard.py:145-224](orchestrator/cloud_engines/image_engine/storyboard.py#L145-L224)) that instruments naturally. Failure writes must be best-effort-never-raise; large payloads (>256 KB) get offloaded to Supabase Storage with a URL reference.

**admin_pin recommendation:** **Option C (drop the PIN entirely)**. The PIN defaults to the literal string `'1337'` ([20260325000000_admin_content_columns.sql:9-10](orchestrator/frontend/supabase/migrations/20260325000000_admin_content_columns.sql#L9-L10)), sits in a row readable by `anon` via RLS `using (true)` ([20260322210000_phase2a_tables.sql:258-261](orchestrator/frontend/supabase/migrations/20260322210000_phase2a_tables.sql#L258-L261)), is fetched client-side by [AdminRoute.tsx:39-43](orchestrator/frontend/src/components/AdminRoute.tsx#L39-L43), and compared in-browser at line 51. It was never a secret. The real admin boundary is already `public.is_admin()` applied consistently across decks/words/jobs RLS — Option A (server-side verify RPC) buys defense-in-depth at cost; Option C removes UX friction with zero security loss. Recommend Option C + keep the role/RLS layer untouched.

**Ferrari verdict:** **GREEN**, narrowed to two new admin routes. Admin routes are already isolated under their own `<AppLayout>` wrapper at [App.tsx:157-168](orchestrator/frontend/src/App.tsx#L157-L168). A nested `<FerrariAdminLayout>` wrapping only the two new routes, applying `data-theme="ferrari-obs"` as a CSS scope, overrides the 28 `:root` oklch tokens in [index.css](orchestrator/frontend/src/index.css) without touching the six existing admin pages. **Inter is already loaded at weights 400/500/600/700** ([index.html:10](orchestrator/frontend/index.html#L10)) so the Body-Font substitute can be Inter + 1px letter-spacing at zero new-dep cost. **There is no chart library installed** — Metrics/Costs use hand-rolled `<div>`-based bars — so introducing one (or building Ferrari charts hand-rolled from scratch) is a distinct Phase-2 decision, not a "use what we have" freebie.

---

## 2. Per-engine inventory

### 2.0 Authoritative stage order (correction of prior investigation)

`STAGE_ORDER = ['images', 'concept', 'song', 'video', 'assembly', 'bookend']` — [pipeline.py:33](orchestrator/src/pipeline.py#L33). Images run first (storyboard anchors scenes for everything downstream). This contradicts the original prompt's bullet ordering "concept / image / song / video / assembly / bookend" and matches the prior investigation's §3.2.

### 2.1 Concept engine

#### A. `generation-meta.json` schema
Written unconditionally in `finally` block via `_write_generation_meta()` at [concept_engine/engine.py:231-245](orchestrator/cloud_engines/concept_engine/engine.py#L231-L245). Model definition: `GenerationMeta` at [concept_engine/models.py:232-246](orchestrator/cloud_engines/concept_engine/models.py#L232-L246).

Top-level keys (always present): `status` (Literal["success","failed"]), `engine` ("concept-engine"), `engine_version`, `timestamp` (ISO UTC), `duration_seconds` (float), `context`, `inputs`, `outputs` (null on failure), `reproducibility` (null on failure), `error` (null on success).

- `context` ([models.py:198-203](orchestrator/cloud_engines/concept_engine/models.py#L198-L203)): `word`, `language`, `translation`.
- `inputs` ([models.py:206-209](orchestrator/cloud_engines/concept_engine/models.py#L206-L209)): `settings_used` = `payload.settings.model_dump()` (the whole settings blob, no truncation).
- `outputs` ([models.py:212-222](orchestrator/cloud_engines/concept_engine/models.py#L212-L222), success-only, built at [engine.py:327-335](orchestrator/cloud_engines/concept_engine/engine.py#L327-L335)): `primary`, `format` ("json"), `lyrics_source` ("template"|"llm"|"llm_fallback"), `caption_source`, `llm_calls_made` (int: 0 or 1), `syllable_count`, `word_length_class`, `word_repetitions`.
- `reproducibility` ([models.py:225-230](orchestrator/cloud_engines/concept_engine/models.py#L225-L230)): `llm_model`, `note` (hard-coded determinism note).
- `error` ([models.py:178-183](orchestrator/cloud_engines/concept_engine/models.py#L178-L183), failure-only): `message`, `retryable`, `type`.

**Prompt/response capture:** FULL system prompt, FULL user prompt, FULL LLM response — **all absent from `generation-meta.json`**. The artifact JSON (the lyrics/caption payload itself) is written separately; it contains the *output* caption and lyrics but not the prompt that produced them. Tokens (in/out) and cost are computed inside `OpenRouterClient.generate()` ([llm_client.py:39-129](orchestrator/cloud_engines/concept_engine/llm_client.py#L39-L129)) and emitted to the `log_cost()` logger at [llm_client.py:112-126](orchestrator/cloud_engines/concept_engine/llm_client.py#L112-L126) — not persisted to meta.

#### B. Outbound call table

| # | Site | Call | sys prompt | user prompt | response | tokens_in | tokens_out | cost_usd | latency_ms | error_on_fail |
|---|------|------|------------|-------------|----------|-----------|-----------|----------|------------|---------------|
| C1 | [llm_client.py:39-129](orchestrator/cloud_engines/concept_engine/llm_client.py#L39-L129) | OpenRouter chat completions (model from `settings.llm_model`, default `deepseek/deepseek-v3.2`) | meta: ❌ / log: ❌ | meta: ❌ / log: ❌ | meta: ❌ / log: ❌ | meta: ❌ / log: ✅ (line 128) | meta: ❌ / log: ✅ | meta: ❌ / log: ✅ (line 124) | meta: ❌ / log: ✅ (line 113) | meta: ✅ via `error` block / log: ✅ |
| C2 | [caption.py:40-44](orchestrator/cloud_engines/concept_engine/caption.py#L40-L44) → C1 | Caption generation LLM call | ❌ / ❌ | ❌ / ❌ | ❌ / ❌ | ❌ / ✅ | ❌ / ✅ | ❌ / ✅ | ❌ / ✅ | meta: `caption_source` string only |
| C3 | [lyrics.py:140-143](orchestrator/cloud_engines/concept_engine/lyrics.py#L140-L143) → C1 | Reliable-mode article discovery LLM call | ❌ / ❌ | ❌ / ❌ | ❌ / ❌ | ❌ / ✅ | ❌ / ✅ | ❌ / ✅ | ❌ / ✅ | `article_used` only |

#### C. Engine decisions
- **`base_language` / `target_language` passthrough.** `base_language` is taken from `payload.content.language_code` at [engine.py:80](orchestrator/cloud_engines/concept_engine/engine.py#L80); `target_language` comes via `payload.content.translation` context. Both are fed into the system prompt that the LLM uses to generate lyrics/caption. **The values enter `inputs.settings_used` as a settings dict dump** but there is no explicit `base_language_resolved` / `target_language_resolved` field — meaning if the English-language regression recurs, you must grep the full settings_used blob to find which language strings the engine received.
- **Lyric mode routing** (template vs LLM, including `llm_fallback`): recorded as `outputs.lyrics_source`. Rationale for fallback (e.g. *why* the LLM path was skipped) is NOT recorded.
- **Genre mode selection**: `GenerationInfo.genre_mode` in artifact JSON ([models.py:155](orchestrator/cloud_engines/concept_engine/models.py#L155)), not in meta.
- **Article resolution**: `resolve_article()` at [article.py:61-85](orchestrator/cloud_engines/concept_engine/article.py#L61-L85) sets `article_used` in `GenerationInfo`; discovery method (enrichment string parse vs LLM discovery) not labeled.
- **Whether external music_caption was patched for vocal_gender** ([vocals.py:45-61](orchestrator/cloud_engines/concept_engine/vocals.py#L45-L61)): not captured.

#### D. Helpers involved
[llm_client.py](orchestrator/cloud_engines/concept_engine/llm_client.py), [lyrics.py](orchestrator/cloud_engines/concept_engine/lyrics.py), [caption.py](orchestrator/cloud_engines/concept_engine/caption.py), [article.py](orchestrator/cloud_engines/concept_engine/article.py), [templates.py](orchestrator/cloud_engines/concept_engine/templates.py), [vocals.py](orchestrator/cloud_engines/concept_engine/vocals.py). Only `llm_client.py` + `caption.py` + `lyrics.py` issue outbound calls (all to OpenRouter via C1 at the same function).

---

### 2.2 Song engine

#### A. `generation-meta.json` schema
**`cloud_engines/song_engine/` contains only `models.py` and `language.py` — there is no `engine.py`.** The actual song stage for Direct Mode is handled by `_create_song_placeholder()` in [cloud_dispatcher.py:111-151](orchestrator/cloud_dispatcher.py#L111-L151), which creates a silent FLAC via `ffmpeg anullsrc` and returns `{"status": "success", "output_paths": ["take_001.flac"], "error": None}` at line 147-151. **The placeholder does not write any `generation-meta.json` file.** 

The schema `GenerationMeta` is *defined* at [song_engine/models.py:212-232](orchestrator/cloud_engines/song_engine/models.py#L212-L232) (with a rich `timing` block for AceStep, a `lora` block, and a `reproducibility.seeds` list), but no code path in the current repo writes it. If a real `generation-meta.json` appears in `content/.../songs/run-001_.../`, it is written by an external backend (remote AceStep service or the GPU worker) outside this repo.

#### B. Outbound call table

| # | Site | Call | Captured |
|---|------|------|----------|
| S1 | [cloud_dispatcher.py:131-137](orchestrator/cloud_dispatcher.py#L131-L137) | Local `ffmpeg anullsrc` subprocess (silent FLAC) | no meta file at all |
| S2 | [src/suno.py:153-239](orchestrator/src/suno.py#L153-L239) | kie.ai Suno submit `/generate` (POST) | ❌ meta (engine contract); `log_cost()` at line 339-347 |
| S3 | [src/suno.py:241-389](orchestrator/src/suno.py#L241-L389) | kie.ai poll `/generate/record-info` (POLL_INTERVAL=10s, MAX_POLL_TIME=180s) | ❌ meta; polling status logged |
| S4 | [src/suno.py:367-411](orchestrator/src/suno.py#L367-L411) | Copyright-retry with simplified payload | ❌ meta; retry logged line 369-371 |
| S5 | [src/services/suno_bakein.py:104-151](orchestrator/src/services/suno_bakein.py#L104-L151) | Suno audio bake-in orchestration | ❌ meta |

Suno runs **entirely outside the engine contract** — it's triggered by `suno_bakein.py` as a side path, writes results directly back to the `words` table (`suno_audio_url`, `suno_task_id`, `suno_audio_url_b` — [20260331000000_suno_columns.sql:1-3](orchestrator/frontend/supabase/migrations/20260331000000_suno_columns.sql#L1-L3)), and never produces a per-stage meta file.

#### C. Engine decisions
Not applicable to the placeholder. For the Suno side path (which is where all real decisions live):
- **Suno vs AceStep routing**: gated by `MUSIC_MODE` env var ([cloud_dispatcher.py:108](orchestrator/cloud_dispatcher.py#L108)). The switch itself is not captured to any meta file.
- **Copyright-retry** ([suno.py:367-411](orchestrator/src/suno.py#L367-L411)): detects the string "copyright" in the error, re-submits with a simplified pop-style prompt. The retry decision + original + retried prompts are only in process logs.
- **LoRA** (defined in [song_engine/models.py:192-201](orchestrator/cloud_engines/song_engine/models.py#L192-L201)): schema exists for LoRA path/strength/constraints, but no application code in the current codebase writes it.

#### D. Helpers involved
[src/suno.py](orchestrator/src/suno.py), [src/services/suno_bakein.py](orchestrator/src/services/suno_bakein.py), [cloud_dispatcher.py](orchestrator/cloud_dispatcher.py). All three emit to `log_cost()` but none write to a song-stage meta file in the current codebase.

---

### 2.3 Image engine

#### A. `generation-meta.json` schema
Written at [image_engine/engine.py:227-298](orchestrator/cloud_engines/image_engine/engine.py#L227-L298). Model: `GenerationMeta` at [image_engine/models.py:526-546](orchestrator/cloud_engines/image_engine/models.py#L526-L546).

Top-level (always): `engine` ("image"), `engine_version`, `timestamp`, `status` ("success"|"partial"|"failed"), `duration_seconds`, `input`, `settings`, `steps`, optionally `outputs`, optionally `error`.

- `input` ([engine.py:255-260](orchestrator/cloud_engines/image_engine/engine.py#L255-L260)): `word`, `language`, `language_code`, optional `concept_version`.
- `settings` ([engine.py:261-272](orchestrator/cloud_engines/image_engine/engine.py#L261-L272)): `creative_direction`, `frame_narrative`, `image_count`, `image_count_source` ("auto"|"manual"), `aspect_ratio`, `art_style`, `word_in_image`, `llm_model`, `image_model`, `vocal_gender`.
- `outputs` ([engine.py:273-278](orchestrator/cloud_engines/image_engine/engine.py#L273-L278), conditional): `images_generated`, `images_requested`, `image_files`, `storyboard_file`.
- `steps` ([engine.py:279-282](orchestrator/cloud_engines/image_engine/engine.py#L279-L282)):
  - `storyboard_generation` ([models.py:462-470](orchestrator/cloud_engines/image_engine/models.py#L462-L470)): `llm_model`, `llm_provider`, `prompt_tokens`, `completion_tokens`, `duration_seconds`, `cost_estimate_usd`. **Tokens + cost are first-class.**
  - `image_rendering` ([models.py:473-483](orchestrator/cloud_engines/image_engine/models.py#L473-L483)): `model`, `scenes_attempted`, `scenes_succeeded`, `scenes_failed`, `scenes_safety_blocked`, `skipped_rendering`, `per_scene_seconds` (list), `total_duration_seconds`.
- `error`: `message`, `retryable`.

#### A-bis. `debug.json` — a second sibling file

The image engine uniquely writes a second file, `debug.json`, at [engine.py:301-335](orchestrator/cloud_engines/image_engine/engine.py#L301-L335). This file **captures the full storyboard system_prompt, user_prompt, raw_llm_response, and a `scene_image_prompts` dict** (per-scene rendering prompt JSON). **This is a working precedent for the kind of capture `pipeline_events` should mirror for all engines.** Today it is on-disk only and not surfaced anywhere.

#### B. Outbound call table

| # | Site | Call | prompt | response | tokens | cost_usd | latency | err |
|---|------|------|--------|----------|--------|----------|---------|-----|
| I1 | [storyboard.py:145-224](orchestrator/cloud_engines/image_engine/storyboard.py#L145-L224) | OpenRouter chat completions (storyboard) | FULL in `debug.json` / absent in meta | FULL in `debug.json` / absent in meta | ✅ meta.steps.storyboard_generation | ✅ meta (estimated) | ✅ meta (line 62, 126) | ✅ meta.error |
| I2 | [renderer.py:490-512](orchestrator/cloud_engines/image_engine/renderer.py#L490-L512), [wan_provider.py:77-81](orchestrator/cloud_engines/image_engine/wan_provider.py#L77-L81) | Wan 2.7 via kie.ai `wan/2-7-image[-pro]` | FULL in `debug.json.scene_image_prompts` / absent in meta | PNG bytes only | ❌ | `log_cost()` (line 715-733) only | per-scene ms in meta | fallback to Gemini (line 520-528) |
| I3 | [renderer.py:583-637](orchestrator/cloud_engines/image_engine/renderer.py#L583-L637), [renderer.py:759-835](orchestrator/cloud_engines/image_engine/renderer.py#L759-L835) | Google Gemini image generation (`google-genai` SDK) | FULL in `debug.json` | image bytes only | ❌ | `estimate_gemini_image_cost(model_id)` to logger | per-scene ms in meta | softened retry on safety block, then typographic fallback (line 598-617) |

#### C. Engine decisions
- **Storyboard scene count** (the 2-vs-3 regression): resolved by `resolve_image_count()` at [models.py:559-570](orchestrator/cloud_engines/image_engine/models.py#L559-L570). Auto-map: 5s→1, 10s→2, 15s→2, 20s→3, 30s→3 ([models.py:550-556](orchestrator/cloud_engines/image_engine/models.py#L550-L556)). Captured as `settings.image_count` + `settings.image_count_source`. The auto→manual distinction is preserved.
- **Frame narrative / creative direction** (auto/collection/scale/action/…): `settings.frame_narrative` in meta ([engine.py:262](orchestrator/cloud_engines/image_engine/engine.py#L262)).
- **Art style**: `settings.art_style` in meta ([engine.py:267](orchestrator/cloud_engines/image_engine/engine.py#L267)).
- **Full storyboard LLM prompt & response**: in `debug.json` only.
- **Safety-block retry path**: the flag `scenes_safety_blocked` is counted in meta, but the *path taken* (softened prompt vs typographic fallback) is logger-only ([renderer.py:600, 608, 521-523](orchestrator/cloud_engines/image_engine/renderer.py#L600)).
- **Wan → Gemini fallback**: logger-only.
- **Image chaining mode** (sequential vs pinned-anchor — [renderer.py:663-709](orchestrator/cloud_engines/image_engine/renderer.py#L663-L709)): logger-only.
- **LoRA**: the prompt's §4.1.3 item about "LoRA selection (image engine — which LoRA, why, strength value actually applied)" — **no LoRA logic is present in `image_engine/`**. Search confirms zero matches. The LoRA model lives in `song_engine/models.py` (unused, see §2.2). The prompt's framing was speculative; flag as open question O-3 in §9.

#### D. Helpers involved
[storyboard.py](orchestrator/cloud_engines/image_engine/storyboard.py), [renderer.py](orchestrator/cloud_engines/image_engine/renderer.py), [wan_provider.py](orchestrator/cloud_engines/image_engine/wan_provider.py), [prompt_compiler.py](orchestrator/cloud_engines/image_engine/prompt_compiler.py), [prompts.py](orchestrator/cloud_engines/image_engine/prompts.py).

---

### 2.4 Video engine

#### A. `generation-meta.json` schema
Written at [video_engine/engine.py:219-326](orchestrator/cloud_engines/video_engine/engine.py#L219-L326). Model: `GenerationMeta` at [video_engine/models.py:136-200](orchestrator/cloud_engines/video_engine/models.py#L136-L200).

Top-level (always): `status`, `engine` ("video-engine"), `engine_version`, `timestamp`, `duration_seconds`, `context`, `inputs`, conditionally `outputs`, `cost`, `reproducibility`, `error`.

- `context` (always): `word`, `language`, `translation`.
- `inputs` (always) ([engine.py:297-304](orchestrator/cloud_engines/video_engine/engine.py#L297-L304)): `image_version`, `scene_number`, **`video_prompt` (FULL text)**, `settings_used` (dict, post-`validate_settings`), `transition` (bool), `end_image_path`.
- `outputs` (success only): `primary`, `thumbnail`, `format`, `codec`, `resolution`, `fps`, `duration_seconds`, `file_size_bytes`.
- `cost` ([engine.py:259-267](orchestrator/cloud_engines/video_engine/engine.py#L259-L267)): `estimated_usd`, `duration_seconds`, `provider`, `model`, `note`.
- `reproducibility` ([engine.py:269-283](orchestrator/cloud_engines/video_engine/engine.py#L269-L283)): `seed` (if ≥0), `model_version`, `provider`, `fal_request_id` (cloud modes), `ffmpeg_version`, `note`.
- `error`: `message`, `retryable`, `type` ("validation_error"|"connection_error"|etc).

#### B. Outbound call table

| # | Site | Call | prompt | neg | response | cost_usd | latency | err |
|---|------|------|--------|-----|----------|----------|---------|-----|
| V1 | [adapters/ltx.py:92-238](orchestrator/cloud_engines/video_engine/adapters/ltx.py#L92-L238) | Fal.ai LTX 2.3 i2v or t2v | built by `build_ltx_prompt()` ([ltx_shared.py:81-115](orchestrator/cloud_engines/video_engine/adapters/ltx_shared.py#L81-L115)) — FULL text in `inputs.video_prompt` | built by `build_ltx_negative()` — NOT separately stored | Fal.ai dict `video.url` | ✅ meta.cost (estimated) | polling elapsed captured | TimeoutError after 300s |
| V2 | [adapters/kling.py:72-177](orchestrator/cloud_engines/video_engine/adapters/kling.py#L72-L177) | Fal.ai Kling | FULL in `inputs.video_prompt` | `settings.negative_prompt` (in settings_used) | Fal.ai dict | ✅ meta.cost | polling elapsed | TimeoutError after 300s |
| V3 | [adapters/ken_burns.py:82-197](orchestrator/cloud_engines/video_engine/adapters/ken_burns.py#L82-L197) | Local `ffmpeg libx264` (no API) | N/A | N/A | subprocess exit code | $0 (local) | subprocess elapsed | RuntimeError on non-zero exit |
| V4 | [upload.py](orchestrator/cloud_engines/video_engine/upload.py) | Fal.ai File Upload | N/A | N/A | URL string | ❌ | round-trip | ConnectionError propagated |
| V5 | [download.py](orchestrator/cloud_engines/video_engine/download.py) | HTTP GET MP4 | N/A | N/A | bytes to disk | ❌ | transfer | RuntimeError |

#### C. Engine decisions
- **Adapter routing** (ken_burns / ltx_fal / ltx_runpod / ltx_selfhosted / kling): router logic at [router.py:13-52](orchestrator/cloud_engines/video_engine/router.py#L13-L52) based on `VIDEO_BACKEND` env + `video_mode` setting. Captured in meta as `reproducibility.provider` + `reproducibility.model_version` + `cost.provider` + `cost.model`.
- **Duration snapping**: LTX snaps to enum {6,8,10,12,14,16,18,20} per tier ([ltx.py:69-87](orchestrator/cloud_engines/video_engine/adapters/ltx.py#L69-L87)); Kling snaps to "5" or "10" ([kling.py:49-70](orchestrator/cloud_engines/video_engine/adapters/kling.py#L49-L70)). **Snapped value is in `inputs.settings_used` but the original requested value is not** — you can't see what was requested vs what was snapped.
- **Per-scene LTX prompt**: built at [ltx.py:134-139](orchestrator/cloud_engines/video_engine/adapters/ltx.py#L134-L139) from base video_prompt + camera-motion injection ([ltx_shared.py:30-51](orchestrator/cloud_engines/video_engine/adapters/ltx_shared.py#L30-L51)). **The final composed prompt IS stored as `inputs.video_prompt`** — this is the best-captured prompt in any engine.
- **Seed**: stored as `reproducibility.seed` when ≥0.
- **Negative prompt enhancement** ([ltx_shared.py:118-121](orchestrator/cloud_engines/video_engine/adapters/ltx_shared.py#L118-L121)): LTX appends a standard suffix ("morphing, transformation, species change…"). The *final* negative prompt sent to Fal.ai is NOT separately stored — only the base in `settings_used.negative_prompt`.
- **Camera motion mapping** (extended→basic for Ken Burns): recorded as `inputs.settings_used["camera_motion"]` dict; the mapping decision (which extended type collapsed to which basic type) is logger-only.
- **Transition support**: `inputs.transition` + `inputs.end_image_path`; Ken Burns / Kling explicitly warn-and-ignore ([ken_burns.py:102-106](orchestrator/cloud_engines/video_engine/adapters/ken_burns.py#L102-L106), [kling.py:93-97](orchestrator/cloud_engines/video_engine/adapters/kling.py#L93-L97)) — the warning is logger-only.
- **Fal.ai request_id**: stored as `reproducibility.fal_request_id` for LTX + Kling ([ltx.py:200](orchestrator/cloud_engines/video_engine/adapters/ltx.py#L200), [kling.py:139](orchestrator/cloud_engines/video_engine/adapters/kling.py#L139)) — this is gold for cross-referencing with Fal.ai's own logs.

There is no "stage-1 / stage-2 parameters" concept in the current LTX adapter — the prompt's §4.2 mention was presumably based on older docs. Flag as open question O-4.

#### D. Helpers involved
[router.py](orchestrator/cloud_engines/video_engine/router.py), [adapters/ltx.py](orchestrator/cloud_engines/video_engine/adapters/ltx.py), [adapters/ltx_shared.py](orchestrator/cloud_engines/video_engine/adapters/ltx_shared.py), [adapters/kling.py](orchestrator/cloud_engines/video_engine/adapters/kling.py), [adapters/ken_burns.py](orchestrator/cloud_engines/video_engine/adapters/ken_burns.py), [upload.py](orchestrator/cloud_engines/video_engine/upload.py), [download.py](orchestrator/cloud_engines/video_engine/download.py), [cost.py](orchestrator/cloud_engines/video_engine/cost.py).

---

### 2.5 Assembly engine

#### A. `generation-meta.json` schema
Written in `finally` at [assembly_engine/engine.py:645-659](orchestrator/cloud_engines/assembly_engine/engine.py#L645-L659) (always, even on failure). Model: `GenerationMeta` at [assembly_engine/models.py:276-293](orchestrator/cloud_engines/assembly_engine/models.py#L276-L293).

Top-level: `status`, `engine` ("assembly-engine"), `engine_version`, `timestamp`, `duration_seconds`, `context`, `inputs`, conditionally `outputs`, `assembly_report`, `reproducibility`, `error`.

- `inputs` ([engine.py:631-636](orchestrator/cloud_engines/assembly_engine/engine.py#L631-L636)): `song_version`, `video_version`, `video_clips_used` (list of validated clip filenames), `settings_used` (full `AssemblySettings.model_dump()`).
- `outputs` (success): `primary` ("final.mp4"), `format`, `duration_seconds`, `resolution`, `file_size_bytes`.
- `assembly_report` ([engine.py:568-617](orchestrator/cloud_engines/assembly_engine/engine.py#L568-L617), present when `audio_report` or `timing_plan` exists): **`original_lufs`, `normalized_lufs`** (rounded 2 dp), `original_song_duration`, `trimmed_silence_start`, `trimmed_silence_end`, `effective_song_duration`, `total_clip_duration`, `gap_seconds`, **`gap_strategy_applied`** (from `timing_plan.strategy_to_apply`), `word_card_intro_duration`, `word_card_outro_duration`, `clips_trimmed` (bool), `clips_looped` (bool).
- `reproducibility`: `ffmpeg_version` only.

#### B. Outbound call table (key entries)

| # | Site | Call | Captured to meta |
|---|------|------|------------------|
| A1 | [engine.py:79](orchestrator/cloud_engines/assembly_engine/engine.py#L79) | `config.check_ffmpeg()` | `reproducibility.ffmpeg_version` |
| A2 | [engine.py:83](orchestrator/cloud_engines/assembly_engine/engine.py#L83) | `probe_media(song_path)` | song duration captured; codec NOT captured (log only) |
| A3 | [audio.py:146-153](orchestrator/cloud_engines/assembly_engine/audio.py#L146-L153) | FFmpeg `loudnorm` pass 1 (JSON measurement) | `original_lufs` (parsed from JSON) |
| A4 | [audio.py:157-180](orchestrator/cloud_engines/assembly_engine/audio.py#L157-L180) | FFmpeg `loudnorm` pass 2 (applied correction, target = `-14.0` default) | `normalized_lufs` = target_lufs (NOT re-measured) |
| A5 | [engine.py:124-128](orchestrator/cloud_engines/assembly_engine/engine.py#L124-L128) | `timing.calculate_timing()` | `gap_seconds`, `gap_strategy_applied`, word_card durations |
| A6 | [engine.py:172-182](orchestrator/cloud_engines/assembly_engine/engine.py#L172-L182) | `gaps.apply_gap_strategy()` | only `gap_strategy_applied` surfaces |
| A7 | [engine.py:186-195](orchestrator/cloud_engines/assembly_engine/engine.py#L186-L195) | `video.apply_overflow_trim()` / inline trim | `clips_trimmed` bool |
| A8 | [engine.py:216-221](orchestrator/cloud_engines/assembly_engine/engine.py#L216-L221) | `video.concatenate_with_transitions()` | not logged (transitions silent) |
| A9 | [engine.py:233-241](orchestrator/cloud_engines/assembly_engine/engine.py#L233-L241) | `video.assemble_final()` | `outputs.file_size_bytes`, `outputs.resolution`, `outputs.duration_seconds` |

#### C. Engine decisions
- **LUFS measurement**: two-pass ffmpeg `loudnorm` ([audio.py:146-180](orchestrator/cloud_engines/assembly_engine/audio.py#L146-L180)). Pass 1 measures, JSON-parses at [audio.py:196-228](orchestrator/cloud_engines/assembly_engine/audio.py#L196-L228). Pass 2 applies. **`normalized_lufs` in meta is the *target* (e.g. -14.0), not a re-measurement of the final output.** True-peak limit is hard-coded -1.0 dBTP ([audio.py:149, 173](orchestrator/cloud_engines/assembly_engine/audio.py#L149)). Gain applied is implicit (pass-1 measured values fed to pass 2). **Final peak after normalization is NOT verified.**
- **LUFS normalization fallback**: if normalization fails ([audio.py:275-282](orchestrator/cloud_engines/assembly_engine/audio.py#L275-L282)), falls back to original audio with `original_lufs` / `normalized_lufs` set to None — indistinguishable in meta from "we never tried to normalize this".
- **Silence trim fallback**: if trim fails ([audio.py:266-270](orchestrator/cloud_engines/assembly_engine/audio.py#L266-L270)), trimmed_start/end set to 0.0 — indistinguishable from "no silence found".
- **Gap / overflow strategy**: if `gap >= -0.01`, apply one of {ping_pong, loop, freeze_ken_burns, fade_black, word_card}; if `gap < -0.01`, apply one of {trim, fade_audio_black, video_full}. Strategy name in `gap_strategy_applied` but the *reason* for selection (e.g. "chose trim because setting X") is not persisted.
- **Transition operations** ([engine.py:216-221](orchestrator/cloud_engines/assembly_engine/engine.py#L216-L221)): no telemetry captured (transition type + duration in `settings_used` only).
- **Word-card generation**: intro/outro word cards generated at [engine.py:150, 200](orchestrator/cloud_engines/assembly_engine/engine.py#L150); durations captured via `timing_plan` but whether generation succeeded/what font was used is not captured.

#### D. Helpers involved
[audio.py](orchestrator/cloud_engines/assembly_engine/audio.py), [video.py](orchestrator/cloud_engines/assembly_engine/video.py), [timing.py](orchestrator/cloud_engines/assembly_engine/timing.py), [gaps.py](orchestrator/cloud_engines/assembly_engine/gaps.py), [word_card.py](orchestrator/cloud_engines/assembly_engine/word_card.py), [config.py](orchestrator/cloud_engines/assembly_engine/config.py).

---

### 2.6 Bookend engine

#### A. `generation-meta.json` schema
Written in `finally` at [bookend_engine/engine.py:297-307](orchestrator/cloud_engines/bookend_engine/engine.py#L297-L307). Model: `BookendGenerationMeta` at [bookend_engine/models.py:18-31](orchestrator/cloud_engines/bookend_engine/models.py#L18-L31).

Top-level: `status` (defaults "failed", flipped to "success" on completion), `engine` ("bookend-engine"), `engine_version` ("0.1.0"), `timestamp`, `duration_seconds`, `context`, `inputs`, conditionally `outputs`, `tts`, `visual`, `reproducibility`, `error`.

- `tts` ([engine.py:119-127](orchestrator/cloud_engines/bookend_engine/engine.py#L119-L127)): `characters_used` (`len(word)` or 0 if reused), `voice_id`, `model_id` (default `eleven_flash_v2_5`), `audio_duration_seconds`, `audio_file`, `language_code`, `language_code_elevenlabs` (mapped via `to_elevenlabs_lang()` at [tts.py:25-27](orchestrator/cloud_engines/bookend_engine/tts.py#L25-L27)).
- `visual` ([engine.py:159-174](orchestrator/cloud_engines/bookend_engine/engine.py#L159-L174)): `text_color_mode`, `text_color_resolved`, `text_color_source` ("preset_white"|"manual"|extracted), `font_used`, `word_displayed`, `translation_displayed`, `phonetic_displayed` (hard-coded None), `gradient_background`, `gradient_tint_color`, `gradient_tint_source`.
- `outputs` (success) ([engine.py:250-259](orchestrator/cloud_engines/bookend_engine/engine.py#L250-L259)): `primary`, `format`, `total_duration_seconds`, `intro_duration_seconds`, `outro_duration_seconds`, `assembled_video_duration_seconds`, `resolution`, `file_size_bytes`.
- `reproducibility`: `ffmpeg_version`, `elevenlabs_model`.
- `error` (string).

#### B. Outbound call table

| # | Site | Call | Captured |
|---|------|------|----------|
| BE1 | [engine.py:110-117](orchestrator/cloud_engines/bookend_engine/engine.py#L110-L117) | `generate_pronunciation(word, voice_id, model_id, ...)` → ElevenLabs `/v1/text-to-speech/{voice_id}` ([tts.py:68-90](orchestrator/cloud_engines/bookend_engine/tts.py#L68-L90)) | `tts` dict (voice_id, model_id, characters_used, audio_duration_seconds, language_code) |
| BE2 | [tts.py:91-147](orchestrator/cloud_engines/bookend_engine/tts.py#L91-L147) | Retry loop (3 attempts, exp backoff on 429/500+) | **retry count NOT captured**; `characters_used = 0` if reused from prior bookend |
| BE3 | [tts.py:101-112](orchestrator/cloud_engines/bookend_engine/tts.py#L101-L112) | `log_cost()` | logger only |
| BE4 | [engine.py:130](orchestrator/cloud_engines/bookend_engine/engine.py#L130) | `normalize_tts_audio(tts_output, target_lufs=-14.0)` (two-pass loudnorm) | **TTS LUFS values logged but NOT in meta** |
| BE5 | [engine.py:142-150](orchestrator/cloud_engines/bookend_engine/engine.py#L142-L150) | `extract_dominant_color(assembled_video)` (when auto) | `visual.text_color_resolved`, `visual.text_color_source` |
| BE6 | [engine.py:155](orchestrator/cloud_engines/bookend_engine/engine.py#L155) | `extract_background_tint` (when gradient) | `visual.gradient_tint_color`, `visual.gradient_tint_source` |
| BE7 | various | FFmpeg segment generation, re-encode, concat | no telemetry |

#### C. Engine decisions
- **Voice selection**: `voice_id` + `model_id` captured. **Whether voice is library-native vs cloned is NOT captured** (no `voice_origin` field). This matters because cloned voices can regress independently of library voices if the clone expires.
- **Language mapping** (`to_elevenlabs_lang` — e.g. manifest "tl" → ElevenLabs "fil"): both sides captured.
- **TTS retry**: 3 attempts with 1/2/4s exp backoff on 429, 2s on 5xx. **Retry attempt count is NOT in meta** — success on attempt 2 is indistinguishable from attempt 1.
- **TTS reuse**: [engine.py:99-108](orchestrator/cloud_engines/bookend_engine/engine.py#L99-L108) scans previous bookend versions for `tts_pronunciation.mp3`; if found, copy and skip API call. Detected only indirectly (characters_used=0); no explicit `reused_from` field.
- **Font fallback**: latin-extended fallback at [engine.py:84-90](orchestrator/cloud_engines/bookend_engine/engine.py#L84-L90); CJK fallback at line 94. `visual.font_used` captures the *final* font but not whether it's the requested font or a fallback.
- **TTS LUFS normalization metrics** ([tts.py:150-206](orchestrator/cloud_engines/bookend_engine/tts.py#L150-L206)): measured + normalized LUFS go to stderr (`logger.info`), not to meta. Pass-1-parse fallback to single-pass loudnorm ([tts.py:170-181](orchestrator/cloud_engines/bookend_engine/tts.py#L170-L181)) is unrecorded.

#### D. Helpers involved
[tts.py](orchestrator/cloud_engines/bookend_engine/tts.py), [color.py](orchestrator/cloud_engines/bookend_engine/color.py) (dominant-color + tint extract), [word_card.py](orchestrator/cloud_engines/bookend_engine/word_card.py), [ffmpeg_builder.py](orchestrator/cloud_engines/bookend_engine/ffmpeg_builder.py), [config.py](orchestrator/cloud_engines/bookend_engine/config.py).

---

### 2.7 Cross-cutting finding — metadata aggregator is dormant

`collect_word_metadata()` at [metadata.py:71-196](orchestrator/src/services/metadata.py#L71-L196) reads the six per-stage `generation-meta.json` files + `storyboard.json` + `manifest.json`, produces the summary dict structure that [WordDetailPanel.tsx:137-220](orchestrator/frontend/src/components/admin/WordDetailPanel.tsx#L137-L220) and [Metrics.tsx:212-247](orchestrator/frontend/src/pages/admin/Metrics.tsx#L212-L247) expect — but **no caller exists in the current `orchestrator/` tree**. The prior investigation cited `job_runner.py:565-579` as the write site; that line range in the current `job_runner.py` does not invoke the aggregator (the architecture has moved to `downstream_worker.py` which writes `video_url` / `thumbnail_url` via `publishing.py:140-153` but does not update `words.metadata`).

**Consequence:** `words.metadata` (JSONB column, [20260325000000_admin_content_columns.sql:4](orchestrator/frontend/supabase/migrations/20260325000000_admin_content_columns.sql#L4)) is null on every word generated under the current architecture. WordDetailPanel and Metrics pages that depend on it display empty or fallback content. **This is both an observability gap and a latent product bug** — the admin UI was built against a schema the runner no longer populates. Any observability design must decide whether to revive the aggregator, replace it with `pipeline_events` reads, or do both.

### 2.8 Words table — denormalized enrichment columns that DO exist

Per [20260322210000_phase2a_tables.sql:32-54](orchestrator/frontend/supabase/migrations/20260322210000_phase2a_tables.sql#L32-L54), the `words` table already has dedicated columns for enrichment fields: `mnemonic text`, `etymology text`, `pos text`, `article text`, plus `translation text`. Suno columns added separately ([20260331000000_suno_columns.sql](orchestrator/frontend/supabase/migrations/20260331000000_suno_columns.sql)). Rating and A/B video columns added in [20260327000000_add_rating_columns.sql](orchestrator/frontend/supabase/migrations/20260327000000_add_rating_columns.sql) and [20260329000000_ab_dual_take.sql](orchestrator/frontend/supabase/migrations/20260329000000_ab_dual_take.sql).

**Columns NOT in `words`:** `creative_direction`, `music_caption`, `base_language`, `target_language`, `tts_voice_id`, `tts_model_id`, `assembly_lufs`, `video_provider_used`. These are all spread across per-stage `generation-meta.json` files today.

---

## 3. Driver-regression coverage matrix

The five regressions Sir Robert needs answerable from dashboard data alone. For each, the precise data needed, current capture status across JSON files, `words.metadata` (orphan), logs, and the gap to close.

### Regression 1 — Language metadata (German base, English target → English mnemonic/etymology)

| Data point | In `generation-meta.json` | In `words.metadata` | In logs only | Gap to close |
|---|---|---|---|---|
| `base_language` string that entered the concept engine | **inside `inputs.settings_used`** dict at concept/meta ([engine.py:351](orchestrator/cloud_engines/concept_engine/engine.py#L351)) — not a named top-level field | null (aggregator dormant) | yes | Need explicit `base_language_resolved` + `target_language_resolved` columns in `pipeline_events` |
| Full system prompt sent to concept LLM (that should have told it "write in German") | **❌ absent** | null | ❌ | Capture FULL prompt — this is the most critical miss |
| Full LLM response (to confirm what it actually returned) | **❌ absent** | null | ❌ | Capture FULL response body |
| `words.mnemonic` / `words.etymology` populated values (to compare with response) | column exists + populated by enrichment | N/A | N/A | values are on `words`, joinable — OK |
| Frontend `SELECT` column list (does [DeckView](orchestrator/frontend/src/pages/DeckView.tsx) request mnemonic/etymology?) | N/A | N/A | N/A | Verify at UI, out of scope for DB observability |
| Language determination path (did profile provide base_language? did deck override? did manifest pass it through?) | settings_used blob only | null | partial | Capture at each stage boundary as `base_language` + `base_language_source` (profile/deck/override) |

**Root-cause answerability today: NO.** The only path to a root cause is reading the per-word concept `generation-meta.json` and cross-referencing the manifest.json. Even then, you can't see the actual LLM prompt or response.

### Regression 2 — Storyboard scene count variance (2 vs 3)

| Data point | In meta | In `words.metadata` | In logs | Gap |
|---|---|---|---|---|
| Resolved `image_count` (1/2/3) | ✅ `settings.image_count` in image meta | null | yes | Replicate to `pipeline_events.metadata.image_count` |
| Auto vs manual source | ✅ `settings.image_count_source` | null | yes | Replicate |
| Storyboard LLM system prompt | **`debug.json` only** ([engine.py:320-323](orchestrator/cloud_engines/image_engine/engine.py#L320-L323)) | null | ❌ | Elevate from `debug.json` to DB — `pipeline_events.system_prompt` |
| Storyboard LLM user prompt | `debug.json` only | null | ❌ | Elevate |
| Storyboard LLM raw JSON response | `debug.json` only | null | ❌ | Elevate |
| Per-scene `image_prompt` JSON | `debug.json.scene_image_prompts` dict | null | ❌ | Elevate (one row per scene) |

**Root-cause answerability today: PARTIAL** (requires `debug.json` shell access). After instrumentation: YES.

### Regression 3 — Static / underbaked LTX clips

| Data point | In meta | In `words.metadata` | In logs | Gap |
|---|---|---|---|---|
| Per-scene final LTX prompt (as sent to Fal.ai) | ✅ `inputs.video_prompt` (FULL) in video meta ([engine.py:300](orchestrator/cloud_engines/video_engine/engine.py#L300)) | null | yes | Replicate to DB |
| Source image used | stored on disk (`image_path`) referenced in `inputs` | N/A | yes | Need explicit `source_image_version` + `source_image_path` in DB row |
| Seed | ✅ `reproducibility.seed` | null | yes | Replicate |
| Negative prompt (final, with LTX suffix) | ⚠️ only base in `settings_used.negative_prompt`; the appended suffix ([ltx_shared.py:118-121](orchestrator/cloud_engines/video_engine/adapters/ltx_shared.py#L118-L121)) is not captured | null | yes | Capture the final composed negative prompt |
| "Stage-1 / stage-2 parameters" | N/A — current LTX adapter is single-call (see O-4) | — | — | Open question — the prompt's framing here appears stale |
| Fal.ai request_id | ✅ `reproducibility.fal_request_id` | null | yes | Replicate (enables Fal.ai-side trace correlation) |
| Duration-snapping (requested vs snapped) | ⚠️ only snapped value stored in `settings_used` | null | yes | Store both `duration_requested` + `duration_snapped` |

**Root-cause answerability today: MOSTLY YES** (video engine is the best-instrumented) but missing the snap audit trail and the final negative-prompt composition.

### Regression 4 — Enrichment field population vs rendering

| Data point | In meta | In `words` columns | Gap |
|---|---|---|---|
| `mnemonic` value captured | yes (concept artifact JSON) | ✅ `words.mnemonic` (populated by enrichment step outside engines) | OK for storage; the gap is *whether enrichment ran successfully* |
| `etymology`, `pos`, `article` | yes (artifacts) | ✅ `words.*` columns | same |
| `creative_direction` resolved | ✅ in `settings.creative_direction` (image meta) and `manifest.lineage.settings_snapshot.creative_direction_resolved` | ❌ no column — only in meta blob | Add column OR query `pipeline_events.metadata->>creative_direction` |
| `music_caption` | ✅ in concept artifact + storyboard.json | ❌ no column | Same — promote to `pipeline_events` row type "music_caption_resolved" |
| Frontend fetch: does `DeckView` SELECT these columns? | N/A | verify separately | Out of scope for DB observability |

**Root-cause answerability today: PARTIAL** — you can see the values on `words` if enrichment ran, but not whether the concept / image stages successfully received + rendered them.

### Regression 5 — Loudness normalization actuals

| Data point | In meta | In `words.metadata` | In logs | Gap |
|---|---|---|---|---|
| `measured_lufs` (assembly, original song) | ✅ `assembly_report.original_lufs` | null | yes | Replicate to DB |
| `target_lufs` | ⚠️ in `settings_used` only | null | yes | Add explicit column |
| `normalized_lufs` (assembly) | ⚠️ **stored as target, NOT re-measured** ([audio.py:157-180](orchestrator/cloud_engines/assembly_engine/audio.py#L157-L180)) | null | — | Consider post-mux verification OR flag this as "assumed applied, not verified" |
| Gain applied | ❌ implicit (pass 2 offset derived from pass 1) | — | — | Capture from loudnorm JSON if useful |
| Peak after normalization (dBTP) | ❌ not measured | — | — | Optional: post-mux ebur128 probe |
| TTS (bookend) measured LUFS | ❌ logger-only ([tts.py:185, 205](orchestrator/cloud_engines/bookend_engine/tts.py#L185)) | null | yes | Capture to DB |
| TTS target LUFS (-14.0) | ❌ hard-coded only | — | — | Capture |
| TTS normalized LUFS (final) | ❌ logger-only | null | yes | Capture |

**Root-cause answerability today: NO** for bookend LUFS; PARTIAL for assembly (you get original + target, not a verified final peak). Post-mux verification is a separate decision — might belong in Phase 2.5.

---

## 4. Proposed `pipeline_events` schema

### 4.1 Design principles
1. **Append-only, one row per named event** (LLM call, external API call, engine decision, stage boundary). Never UPDATE — events are immutable history.
2. **`generation-meta.json` + `debug.json` stay on disk** as ground truth. `pipeline_events` is the queryable mirror and the single place where previously log-only data becomes queryable.
3. **Full prompts + full responses are TEXT columns** (no truncation). JSON remains JSONB with a separate `metadata` bag for stage-specific extras.
4. **Every row carries `word_id`, `deck_id`, `user_id`** as indexed foreign keys (join freely with `words`, `decks`, `profiles`, `generation_jobs`).
5. **Cost-additive columns** are first-class (`cost_usd` numeric) so every aggregate is a `SUM()` away.

### 4.2 Proposed columns

| column | type | null | default | purpose | addresses |
|--------|------|------|---------|---------|-----------|
| `id` | `uuid` | no | `gen_random_uuid()` | PK | — |
| `created_at` | `timestamptz` | no | `now()` | wall-clock event start | all aggregates |
| `event_source` | `text` | no | — | "engine" \| "orchestrator" \| "suno_bakein" \| "enrichment" \| "publishing" | cross-stage tracing |
| `stage` | `text` | no | — | one of: `images`, `concept`, `song`, `video`, `assembly`, `bookend`, `enrichment`, `publishing`, `suno_bakein` | per-stage analytics |
| `sub_step` | `text` | yes | null | free-text (e.g. "storyboard_llm", "scene_1_render", "loudnorm_pass_1", "tts_api_call") | fine-grained slicing |
| `word_id` | `uuid` | yes | null | FK `words(id)` | per-word deep-dive |
| `deck_id` | `uuid` | yes | null | FK `decks(id)` | per-deck aggregates |
| `user_id` | `uuid` | yes | null | FK `profiles(id)` | per-user analytics |
| `job_id` | `uuid` | yes | null | FK `generation_jobs(id)` | job-level traces |
| `attempt` | `int2` | yes | null | retry attempt number (1 = first try) | **Regression 1-5** — distinguish retry successes |
| `model_provider` | `text` | yes | null | "openrouter" \| "google" \| "kie_ai" \| "fal_ai" \| "elevenlabs" \| "suno" \| "local_ffmpeg" | cost slicing by provider |
| `model_name` | `text` | yes | null | e.g. "deepseek/deepseek-v3.2", "gemini-2.5-flash-image", "fal-ai/ltx-2.3-pro", "eleven_flash_v2_5" | per-model slicing |
| `status` | `text` | no | — | "success" \| "failed" \| "partial" \| "skipped" \| "retried" | error-rate aggregates |
| `error_message` | `text` | yes | null | human-readable failure reason | top-errors aggregate |
| `error_type` | `text` | yes | null | "validation" \| "connection" \| "timeout" \| "safety_block" \| "rate_limit" \| "copyright" \| "unexpected" | error taxonomy |
| `latency_ms` | `int4` | yes | null | wall-clock for the event | stage-duration distributions |
| `cost_usd` | `numeric(10,6)` | yes | null | per-row additive cost | cost-per-word, cost-per-deck |
| `tokens_in` | `int4` | yes | null | prompt tokens | token analytics |
| `tokens_out` | `int4` | yes | null | completion tokens | token analytics |
| `system_prompt` | `text` | yes | null | FULL text, no truncation | **Regressions 1, 2** |
| `user_prompt` | `text` | yes | null | FULL text | **Regressions 1, 2, 3** |
| `response_body` | `text` | yes | null | FULL response text (JSON stringified where applicable) | **Regressions 1, 2** |
| `response_ref` | `text` | yes | null | optional Supabase Storage path if `response_body > 256 KB` | oversize handling |
| `request_id` | `text` | yes | null | provider-side request id (e.g. `fal_request_id`, suno task_id) | cross-system correlation |
| `metadata` | `jsonb` | yes | `'{}'::jsonb` | grab-bag (e.g. `{"seed": 42, "negative_prompt": "...", "lufs_measured": -18.3, "lufs_target": -14.0, "voice_id": "...", "scene_number": 2}`) | stage-specific extras without schema churn |

### 4.3 Why each column, mapped to evidence

- `system_prompt` / `user_prompt` / `response_body`: Regression 1 (concept captures NONE), Regression 2 (storyboard captures in `debug.json` only).
- `tokens_in` / `tokens_out` / `cost_usd`: image storyboard is the only engine with these today; all others rely on `log_cost()` which is logger-only.
- `attempt`: bookend TTS retries 3x silently ([tts.py:91-147](orchestrator/cloud_engines/bookend_engine/tts.py#L91-L147)); LTX / Kling retry-via-timeout patterns; Suno copyright-retry.
- `request_id`: `fal_request_id` is already gold in video meta — promoting it here enables one-click Fal.ai-dashboard correlation.
- `metadata` JSONB accommodates: loudnorm pass values, seed, snapped-vs-requested duration, safety-block branch taken, voice-origin (cloned vs library), gap strategy rationale.
- `event_source` + `stage` + `sub_step`: lets the admin UI pivot between "all LLM calls for this word" vs "all video-engine failures last week."

### 4.4 Proposed indexes
```
CREATE INDEX ix_events_word_id_created_at ON pipeline_events(word_id, created_at DESC);
CREATE INDEX ix_events_deck_id_created_at ON pipeline_events(deck_id, created_at DESC);
CREATE INDEX ix_events_user_id_created_at ON pipeline_events(user_id, created_at DESC);
CREATE INDEX ix_events_job_id ON pipeline_events(job_id);
CREATE INDEX ix_events_stage_status ON pipeline_events(stage, status);
CREATE INDEX ix_events_model_name_created_at ON pipeline_events(model_name, created_at DESC);
CREATE INDEX ix_events_created_at ON pipeline_events(created_at DESC);
```

### 4.5 Row-count and storage estimate

Per word, rough upper bound assuming instrumentation of every LLM/API call + named decision:
- images: 1 storyboard LLM + N scene renders (avg 2.3) + 1 storyboard decision + 1 art-style decision = ~5 rows
- concept: 1 caption LLM + 1 (optional) article-discovery LLM + 1 lyrics-source decision + 1 genre-mode decision = 2-4 rows
- song (stub today): 1 placeholder "stage complete" row + optional bake-in pair if Suno runs = 1-3 rows
- video: N scenes (avg 2.3) × 1 LTX/Kling call each + 1 upload each + 1 download each = ~7 rows
- assembly: 1 loudnorm pass-1 + 1 loudnorm pass-2 + 1 gap-strategy decision + 1 mux finalization = 4 rows
- bookend: 1 TTS call + 1 color-extract + 1 mux = 3 rows
- publishing: 1 upload-complete row = 1 row

≈ **25 rows per word**, with the system/user/response text payloads dominating size. Typical concept prompt ~4 KB, typical storyboard response ~6 KB, typical scene image_prompt ~1.5 KB. Heavy rows avg ~10 KB; lightweight rows ~1 KB. Mean row ≈ 4-5 KB.

**1000 words ≈ 25,000 rows ≈ 100-150 MB.** A year of heavy usage (100k words) ≈ 10-15 GB on DB — comfortably within Supabase's Pro plan. TOAST handles oversize TEXT transparently; the `response_ref` offload column is the safety valve for anomaly payloads (>256 KB).

### 4.6 What `pipeline_events` does NOT cover
- Final-output peak verification (post-mux ebur128 probe): a separate decision (Phase 2.5 scope).
- Frontend render telemetry (did `DeckView` actually render `mnemonic`?): client-side concern; out of DB observability scope.
- Historical backfill of existing generated content: do not attempt; start forward from deployment.

---

## 5. Instrumentation strategy

### 5.1 Recommended mechanism — `logged_llm_call()` / `logged_api_call()` wrapper helpers

Two thin context-manager helpers, placed in a new module `orchestrator/src/services/events.py`. They wrap the single outbound-call function in each existing client (e.g. `OpenRouterClient.generate()` at [llm_client.py:39-129](orchestrator/cloud_engines/concept_engine/llm_client.py#L39-L129)) without refactoring the call sites.

**Why a wrapper, not a decorator:** call sites are already in function bodies; adding a decorator needs N function-boundary changes. Wrappers used as context managers around the existing `httpx.post(...)` / `client.generate(...)` calls require single-line insertions.

**Why not inline writes everywhere:** duplicates 10-20 lines of capture logic per call site, easy to drift.

**Why not a background async writer:** needless complexity; event writes are cheap, sync is fine.

### 5.2 Shape of an instrumented call site (pseudocode — NOT committed)

Before ([llm_client.py:67-89](orchestrator/cloud_engines/concept_engine/llm_client.py#L67-L89)):
```python
response = httpx.post(OPENROUTER_URL, json=payload, timeout=60.0)
data = response.json()
content = data["choices"][0]["message"]["content"]
log_cost(model=self.model, usage=data.get("usage"), category="concept.caption")
return content
```

After (pseudocode):
```python
with logged_llm_call(
    stage="concept",
    sub_step="caption_llm",
    word_id=ctx.word_id,
    deck_id=ctx.deck_id,
    user_id=ctx.user_id,
    job_id=ctx.job_id,
    attempt=ctx.attempt,
    model_provider="openrouter",
    model_name=self.model,
    system_prompt=payload["messages"][0]["content"],
    user_prompt=payload["messages"][1]["content"],
) as ev:
    response = httpx.post(OPENROUTER_URL, json=payload, timeout=60.0)
    data = response.json()
    content = data["choices"][0]["message"]["content"]
    ev.record_response(
        response_body=content,
        tokens_in=data["usage"]["prompt_tokens"],
        tokens_out=data["usage"]["completion_tokens"],
        cost_usd=estimate_openrouter_cost(self.model, data["usage"]),
        request_id=data.get("id"),
    )
    log_cost(model=self.model, usage=data.get("usage"), category="concept.caption")
    return content
```

On exception, `logged_llm_call.__exit__` records `status="failed"`, `error_message`, `error_type`, then re-raises.

### 5.3 Failure-mode handling
- **Event write MUST never crash generation.** The context manager catches any `Exception` from the Supabase insert, logs a `warning("pipeline_events write failed: %s", exc)`, and continues. Generation proceeds with only logger trace.
- Supabase insert uses the `service_role` key already held by the runner — no RLS concerns.
- No retry on event-write failure; next event restarts cleanly.

### 5.4 Very large payloads (>256 KB)

Offload threshold chosen to match Supabase's TOAST-friendliness without being gratuitous. Helper pseudocode:
```
if len(response_body.encode("utf-8")) > 256 * 1024:
    storage_path = f"pipeline_events/{event_id}/response.txt"
    supabase.storage.from_("pipeline-events").upload(storage_path, response_body.encode())
    row.response_body = None
    row.response_ref = storage_path
```
Bucket `pipeline-events` is private, admin-read only via RLS.

### 5.5 Circular-call exclusion

The `logged_llm_call` / `logged_api_call` helpers use the Supabase Python client directly. **They must not be instrumented themselves** — that would recurse. Enforced by convention: the helpers live in `orchestrator/src/services/events.py` and never import from `cloud_engines/` or `src/services/metadata.py`. A one-sentence module docstring documents this.

### 5.6 Plumbing — how `word_id` / `deck_id` / `user_id` reach each engine

At the `downstream_worker` level, each call to an engine already has `word["id"]`, `fresh["deck_id"]`, `fresh["user_id"]` in scope ([downstream_worker.py:647-721](orchestrator/downstream_worker.py#L647-L721) per the assembly+bookend agent's finding). The current engine payload dataclasses (`ConceptPayload`, `ImagePayload`, etc.) have a `metadata` bag that carries word/language/translation but **not word_id/deck_id/user_id**. Required plumbing changes:

| Engine | Payload class | Current metadata carries | Needs to carry |
|--------|---------------|--------------------------|----------------|
| concept | `ConceptPayload` | word, language, translation | + word_id, deck_id, user_id, job_id, attempt |
| image | `ImagePayload` | word, language, language_code, concept_version | + word_id, deck_id, user_id, job_id, attempt |
| song | (placeholder) | — | + the ids (when real implementation arrives) |
| video | `VideoPayload` | word, language, translation, image_version, scene_number | + word_id, deck_id, user_id, job_id, attempt |
| assembly | `AssemblyPayload` | word, language, translation, song_version, video_version | + ids |
| bookend | `BookendPayload` | word, language, translation, assembly_version | + ids |

The addition is additive (optional fields), not breaking, and lets each engine pass identity into `logged_llm_call(...)` calls inside its private helpers.

### 5.7 What NOT to instrument
- FFmpeg subprocess calls (assembly, ken_burns, bookend) — noisy, repetitive, local, already covered by `stage_duration_seconds`. Keep a single "stage_complete" row per stage instead.
- Filesystem reads/writes (manifest I/O, artifact JSON writes) — out of scope.
- `log_cost()` internals — it's already emitting structured; leave it as the secondary channel.

---

## 6. Aggregate query surface preview

For each target aggregate the admin UI will want, the one-sentence SQL/RPC shape. No full SQL — this is a sanity check that the schema in §4 supports every aggregate.

1. **Cost per word, time series** — `SELECT date_trunc('hour', created_at), SUM(cost_usd) FROM pipeline_events WHERE word_id IS NOT NULL GROUP BY 1 ORDER BY 1` — uses `cost_usd` + `created_at`.
2. **Token usage per model, stacked bar** — `SELECT model_name, SUM(tokens_in), SUM(tokens_out) FROM pipeline_events GROUP BY model_name` — uses `model_name` + `tokens_in/out`.
3. **Stage duration distributions (p50/p95)** — `SELECT stage, percentile_cont(0.5) WITHIN GROUP (ORDER BY latency_ms), percentile_cont(0.95) ... GROUP BY stage` — uses `stage` + `latency_ms`.
4. **Success/failure per stage** — `SELECT stage, status, COUNT(*) FROM pipeline_events GROUP BY stage, status` — uses `stage` + `status`.
5. **Top 10 errors last 24h** — `SELECT error_type, error_message, COUNT(*) FROM pipeline_events WHERE status='failed' AND created_at > now() - interval '24 hours' GROUP BY 1, 2 ORDER BY COUNT DESC LIMIT 10` — uses `error_type` + `error_message`.
6. **Suno bake-in rate** — `SELECT COUNT(DISTINCT word_id) FILTER (WHERE event_source='suno_bakein') / COUNT(DISTINCT word_id)` — uses `event_source`.
7. **Video provider split** — `SELECT metadata->>'provider', COUNT(*) FROM pipeline_events WHERE stage='video' AND status='success' GROUP BY 1` — uses `stage` + `metadata`.
8. **Per-model call volume** — `SELECT model_name, COUNT(*) FROM pipeline_events WHERE model_name IS NOT NULL GROUP BY model_name ORDER BY COUNT DESC` — uses `model_name`.

All eight aggregates satisfiable from the proposed schema. No schema additions required.

---

## 7. `admin_pin` current state + fix options

### 7.1 Current state — cited evidence

- **Storage:** `admin_pin TEXT DEFAULT '1337'` on `public.system_settings` ([20260325000000_admin_content_columns.sql:9-10](orchestrator/frontend/supabase/migrations/20260325000000_admin_content_columns.sql#L9-L10)).
- **Base table:** `system_settings` is a single-row (id=1) config table ([20260322210000_phase2a_tables.sql:110-119](orchestrator/frontend/supabase/migrations/20260322210000_phase2a_tables.sql#L110-L119)).
- **RLS SELECT policy:** `"Anyone can read system settings" ... using (true)` ([20260322210000_phase2a_tables.sql:258-261](orchestrator/frontend/supabase/migrations/20260322210000_phase2a_tables.sql#L258-L261)). Grants all roles — `anon`, `authenticated`, `service_role` — unrestricted `SELECT` on every column including `admin_pin`.
- **RLS UPDATE policy:** `using (public.is_admin())` ([20260322210000_phase2a_tables.sql:263-265](orchestrator/frontend/supabase/migrations/20260322210000_phase2a_tables.sql#L263-L265)) — admin-only writes.
- **Frontend fetch:** [AdminRoute.tsx:39-43](orchestrator/frontend/src/components/AdminRoute.tsx#L39-L43) `supabase.from('system_settings').select('admin_pin').eq('id', 1).single()`.
- **Client-side compare:** [AdminRoute.tsx:51](orchestrator/frontend/src/components/AdminRoute.tsx#L51) `if (pin === data.admin_pin)`.
- **Session cache:** `sessionStorage.admin_unlocked` once matched.

### 7.2 Threat model

- **Anon (unauthenticated user):** CAN read the PIN. `supabase.from('system_settings').select('admin_pin')` from any browser, cURL, or script with just the anon key succeeds.
- **Authenticated non-admin learner:** CAN read the PIN (same policy, no role distinction on SELECT).
- **Network-trace extraction during legitimate admin load:** the PIN travels from Postgres → Supabase API → browser over HTTPS; visible in DevTools Network tab on any admin's machine, and visible in any MITM/proxy context.
- **No separation from brand default:** `'1337'` is in git history as the literal default. Unless an admin explicitly rotated it (UPDATE requires admin role), production is running the published default.
- **RLS does not distinguish admin vs non-admin on SELECT.** The already-well-used `public.is_admin()` helper ([20260322210000_phase2a_tables.sql:165-171](orchestrator/frontend/supabase/migrations/20260322210000_phase2a_tables.sql#L165-L171), later refactored in [20260416004500_admin_roles_rls_fix.sql:75-87](orchestrator/frontend/supabase/migrations/20260416004500_admin_roles_rls_fix.sql#L75-L87) to read from a dedicated `admin_roles` table) is the real enforcement, applied to decks/words/jobs/language_profiles — examples at [20260322210000_phase2a_tables.sql:174-188](orchestrator/frontend/supabase/migrations/20260322210000_phase2a_tables.sql#L174-L188), [190-205](orchestrator/frontend/supabase/migrations/20260322210000_phase2a_tables.sql#L190-L205), [224-239](orchestrator/frontend/supabase/migrations/20260322210000_phase2a_tables.sql#L224-L239).

### 7.3 Fix options

| # | Option | UX | Security gain | Cost | Trade-offs |
|---|--------|-----|---------------|------|-----------|
| A | Server-side verify via `SECURITY DEFINER` RPC `verify_admin_pin(pin text) → boolean`; client sends PIN, gets boolean. `admin_pin` SELECT policy narrows to `is_admin()` or gets revoked entirely. | unchanged | PIN no longer leaves server (except as incoming comparison arg) | 1 migration + 1 small `AdminRoute.tsx` change | Doesn't fix the fundamental issue (PIN is still trivial to brute-force if the RPC is exposed unthrottled). Buys defense-in-depth without solving the "not actually secret" problem. |
| B | Store `admin_pin` as bcrypt/argon2 hash in `system_settings`. | unchanged | Near zero — a 4-6 digit PIN is trivially brute-forceable even hashed; `pgcrypto`+attacker-compute makes this minutes. | 1 migration + compare change | **Security theater.** Flag and reject. |
| C | **Drop the PIN entirely.** Rely on `profiles.role='admin'` (or `admin_roles` post-refactor) + RLS, which is what actually enforces admin capability. Remove the PIN gate from `AdminRoute.tsx`. | One fewer prompt at admin entry. | Zero loss (PIN was never security). Closes the leak by removing the leaked asset. | Smallest. 1 frontend change; `admin_pin` column can stay or drop in a cleanup migration. | No extra friction for attackers who compromise an admin's auth — but they already had full admin capability the moment they did. |
| D | Move `admin_pin` to its own table with admin-only SELECT. | unchanged | Closes the leak. | 1 migration + small frontend change. | Still solves a non-problem at data-layer cost. |
| E | Combination of A + hashed storage. | unchanged | Defense in depth. | 2 migrations + frontend. | Over-engineering the non-secret. |

### 7.4 Recommendation — **Option C**

The PIN solves no security problem that `is_admin()`-gated RLS doesn't already solve. Keep the role/RLS layer untouched. Remove the PIN prompt from `AdminRoute.tsx`. Keep the `admin_pin` column for a release cycle (to not break any out-of-band tooling) then drop it.

**Interaction with observability work:** If the two new admin routes plug in under the same `<AdminRoute>` guard at [App.tsx:157-168](orchestrator/frontend/src/App.tsx#L157-L168), Option C simplifies the new pages' auth path — they inherit the same role check and stop needing a PIN. No design change to observability work.

---

## 8. Ferrari scoping (narrowed — two new pages only)

### 8.1 Route insertion

- Current admin routes live under a single `<Route element={<AppLayout />}>` wrapper at [App.tsx:157-168](orchestrator/frontend/src/App.tsx#L157-L168): `/admin/queue`, `/admin/profiles`, `/admin/users`, `/admin/content`, `/admin/metrics`, `/admin/costs`, `/admin/voices`.
- **Insertion point:** after line 168, add a parallel route block with its own layout wrapper:

```jsx
<Route element={<AppLayout />}>
  <Route element={<AdminRoute />}>
    <Route element={<FerrariAdminLayout />}>
      <Route path="/admin/observability" element={<AggregateAnalytics />} />
      <Route path="/admin/observability/word/:id" element={<WordDetailDeepDive />} />
    </Route>
  </Route>
</Route>
```

- **FerrariAdminLayout** is a new tiny component that renders `<AppHeader /><main><Outlet /></main>` under a scoping attribute (`data-theme="ferrari-obs"`) on the outer `<div>`.
- **No changes** to AppLayout, existing admin pages, SkinContext, ThemeContext, or the six theme classes.

### 8.2 Global CSS leak analysis

- `index.css` is 578 lines. `:root` defines 28 oklch custom properties + `--radius: 0.625rem` + `--font-body: 'Inter', ...` + chart tokens `--chart-1..5` ([index.css:46-82](orchestrator/frontend/src/index.css#L46-L82)). `.dark` redefines them ([index.css:84-117](orchestrator/frontend/src/index.css#L84-L117)). Six `.theme-*` classes redefine the same 28 tokens each.
- `.skin-glassy` already scopes its overrides via `.skin-glassy .glass { ... }` ([index.css:500-538](orchestrator/frontend/src/index.css#L500-L538)) — **this is the precedent**; the pattern works.
- **Utilities that would fight Ferrari tokens** if unscoped: `.glass` family, `.gradient-bg`, `.glow-purple`, `.glow-green`, `.pg-glass`. All can be overridden inside `[data-theme="ferrari-obs"]`.
- **One `!important`** at [index.css:334](orchestrator/frontend/src/index.css#L334) (`.classic-deck-card:hover .classic-deck-bg-layer { opacity: 0.5 !important; }`) — isolated to the classic deck card, not used by Ferrari pages. No conflict.
- **Tailwind v4** via `@tailwindcss/vite: ^4.2.2` ([package.json:13-28](orchestrator/frontend/package.json#L13-L28)); `@theme inline` block rebinds Tailwind tokens to `var(--foo)`, so scoping the CSS vars within `[data-theme="ferrari-obs"]` automatically re-maps `bg-background`, `text-foreground`, etc., inside the scope.

**Verdict — CSS:** clean. A single new `src/themes/ferrari-observability.css` file imported in `main.tsx` is enough.

### 8.3 Font audit

Fonts currently loaded:

| Family | Source | Weights | Usage |
|--------|--------|---------|-------|
| Inter | Google ([index.html:10](orchestrator/frontend/index.html#L10)) | 400/500/600/700 | `--font-body` default |
| Nunito | Google ([index.css:1](orchestrator/frontend/src/index.css#L1)) | 400/500/600/700 | imported, no CSS var assignment |
| Outfit | Google ([index.css:3](orchestrator/frontend/src/index.css#L3)) | 400/500/600/700 | `.font-display` utility |
| VT323, Share Tech Mono | Google ([index.html:10](orchestrator/frontend/index.html#L10)) | default | retro accents |
| Material Symbols Outlined | Google ([index.css:2](orchestrator/frontend/src/index.css#L2)) | variable | icon system |
| `system-ui`, monospace fallbacks | System | — | fallbacks |

**Inter is already loaded at 400/500/600/700 — confirmed.** FerrariSans is proprietary and not available; the DESIGN-ferrari.md doc itself calls it exclusive to Ferrari.

**Body-Font substitute recommendation:** **Inter + 1px letter-spacing under `text-transform: uppercase`**. Zero new font, zero new HTTP request. Applied only inside `[data-theme="ferrari-obs"] .label-upper { font-family: var(--font-body); text-transform: uppercase; letter-spacing: 0.0625rem; font-size: 0.75rem; font-weight: 400; }`. If Sir Robert later wants genuine condensed proportions, add IBM Plex Sans Condensed (Google Fonts, ~15-20 KB gzipped) as Phase 2.5 — out of initial scope.

### 8.4 Chart library — IMPORTANT FINDING

**There is no chart library installed.** `package.json` contains React 19, React Router 7, Supabase client, framer-motion, lucide-react icons, Tailwind v4 — no recharts, no visx, no Chart.js, no plotly, no ECharts. Grep for `from 'recharts'` across `orchestrator/frontend/src/**` returns zero matches.

The existing Metrics and Costs admin pages use **hand-rolled `<div>`-based bars** — a `StatBar()` helper at [Metrics.tsx:114-137](orchestrator/frontend/src/pages/admin/Metrics.tsx#L114-L137) and `CostBar()` at [Costs.tsx:86-117](orchestrator/frontend/src/pages/admin/Costs.tsx#L86-L117), both inline-styled with Tailwind classes like `bg-yellow-500`, `bg-purple-500`, `bg-green-500`, `bg-red-500` ([Metrics.tsx:66-88](orchestrator/frontend/src/pages/admin/Metrics.tsx#L66-L88)).

**Consequence:** The prompt's §6.3 asks to "confirm recharts is installed." It is not. Ferrari scoping must therefore take a position:

- **Option I:** Introduce `recharts` as a new dependency scoped to the two Ferrari pages. Lightweight (~80 KB gzipped), idiomatic in React. Theme via per-chart CSS variables or a small theme wrapper.
- **Option II:** Build Ferrari charts hand-rolled using the same `<div>` / SVG patterns as existing admin. Works for bars, stacked bars, KPI tiles; painful for time series with tooltips/zoom.
- **Option III:** Adopt `recharts` across the codebase (touches existing Metrics + Costs). **Out of scope** for "Ferrari to two new pages only."

**Recommendation:** **Option I** (recharts scoped to Ferrari pages). Theming approach: a small `ferrariChartTheme = {grid: '#8F8F8F', axis: '#666666', tooltip: { bg: '#FFFFFF', text: '#181818', border: '#D2D2D2' }, categorical: ['#8F8F8F', '#666666', '#181818', '#D2D2D2'], error: '#DA291C', emphasis: '#FFF200', success: '#03904A'}` passed as props where recharts needs explicit colors. Reserve Ferrari Red for the single "failure" data series per chart.

### 8.5 Component Ferrari-intent sketches (natural language only)

- **Per-word page header strip** — cinematic band on Dark Surface `#303030` spanning full width, 80px tall. Word in FerrariSans-substitute (Inter weight 500) 26px white. To its right, translation in Inter 16px Mid Gray `#8F8F8F`. Status badge — a razor-precision 2px radius pill, white bg Near Black `#181818` text for "complete", red fill `#DA291C` white text ONLY for "failed". Final MP4 tile 16:9 right-aligned with 2px border `#D2D2D2`.
- **Stage panel card** — white editorial card on `#FFFFFF`, 1px `#D2D2D2` border, zero shadow, 2px radius. Stage name uppercase Body-Font-substitute (Inter 12px 1px letter-spacing) Mid Gray `#8F8F8F`. Big number below in Inter 26px weight 500 Near Black `#181818` (cost_usd or duration_seconds). Sub-label Dark Gray `#666666` 13px.
- **Prompt / response viewer** — monospace block, Inter's fallback `ui-monospace` or `Cascadia Code`, 12px, 1.5 line-height, Near Black `#181818` on Pure White `#FFFFFF`. 1px `#CCCCCC` border, 2px radius. Expand/collapse with a tiny "MORE" uppercase Body-Font-substitute link bottom-right.
- **Media preview row** — horizontal strip of 16:9 tiles (images, then scene videos, then final MP4), each with a 2px-radius 1px `#D2D2D2` border. Tiles flex-shrink 0 with 16px gap. No shadow, no rounding beyond 2px.
- **Raw events table** — dense rows (32px row height), 13px Inter 400 body, uppercase Inter 12px 1px letter-spacing column headers. No zebra striping. Timestamps in Mid Gray `#8F8F8F`, stage names Near Black, status cells color only when "failed" (Ferrari Red `#DA291C` text, no background fill). Row click opens prompt/response viewer.
- **Aggregate page KPI tile** — white tile, 40px padding, uppercase micro-label top in Body-Font-substitute Mid Gray `#8F8F8F`, big number 40-48px Inter 500 Near Black. For the one "failure rate" tile only, a **2px accent line along the top edge in Ferrari Red `#DA291C`** as the single red moment on the page.
- **Aggregate time series chart panel** — white panel 1px `#D2D2D2` border. Recharts LineChart: X/Y axes Dark Gray `#666666`, grid Light Gray `#D2D2D2`. Failure series Ferrari Red `#DA291C` 2px stroke. One "emphasis" series (e.g. the model being spotlighted that day) Racing Yellow `#FFF200` 2px. Everything else grayscale (`#181818`, `#666666`, `#8F8F8F`). Tooltip white bg with 1px `#D2D2D2` border and 2px radius.

### 8.6 Verdict — **GREEN**

Justification:
1. Route isolation is clean via nested `<FerrariAdminLayout>` at a parallel route block.
2. CSS scoping via `[data-theme="ferrari-obs"]` has a working precedent (`.skin-glassy`) and encounters one tame `!important` that is already isolated.
3. Inter at 400/500/600/700 is already loaded. Body-Font substitute = Inter + 1px letter-spacing, zero new deps.
4. Chart library introduction (recharts) is a new dep decision, but small and scoped. Not a blocker.
5. Zero changes to AppLayout, SkinContext, ThemeContext, or any of the six existing admin pages.

**Recommend Ferrari ships with Phase 2** of observability work, as long as Sir Robert approves the recharts dep (or accepts Option II hand-rolled). Defer only if that dep decision needs its own cycle.

---

## 9. Open questions for Sir Robert

O-1. **`collect_word_metadata()` is dormant.** Do we revive it (write to `words.metadata` on publication) or deprecate it in favor of `pipeline_events` queries driving the UI? If both, who owns keeping them in sync?

O-2. **Song engine is a stub.** Is the "song engine" contract (placeholder in `cloud_dispatcher.py`) a permanent architecture choice because song generation runs on an external GPU worker / AceStep service, or is it a migration in progress? This decides whether instrumentation must be added to the external service or the stub suffices.

O-3. **LoRA — where does it actually live?** The prompt assumes LoRA lives in the image engine. The code has LoRA only in `song_engine/models.py` (unused). Is LoRA active anywhere in production, or is this stale schema from a prior design?

O-4. **LTX "stage-1 / stage-2 parameters."** The prompt's §4.2 mentions these. The current LTX adapter is a single-call pattern. Is this stale language, or was there a two-stage LTX pipeline that has since been consolidated?

O-5. **Post-mux LUFS/peak verification.** Is it acceptable that `normalized_lufs` in assembly meta is the *target*, not a re-measured final? Adding a post-mux ebur128 probe is ~1-2s extra time per word and doubles confidence.

O-6. **Voice-origin telemetry.** Should the bookend engine meta record `voice_origin: "library"|"cloned"`? Requires joining against the `voices` table ([20260329200000_voices_table.sql](orchestrator/frontend/supabase/migrations/20260329200000_voices_table.sql)) to classify.

O-7. **Recharts dependency.** Introduce it scoped to the two Ferrari pages, or hand-roll Ferrari charts, or defer Ferrari entirely until a recharts decision?

O-8. **Backfill.** Start `pipeline_events` from a deployment cut-off date (no backfill) — agreed?

O-9. **Retention policy.** 90 days? 365 days? Forever? Affects storage projections and index sizing.

O-10. **Admin UI dependency on `words.metadata`.** Current [WordDetailPanel.tsx:137-220](orchestrator/frontend/src/components/admin/WordDetailPanel.tsx#L137-L220) expects a `metadata` shape that is now always null. Do we change WordDetailPanel to read from `pipeline_events` in place, or populate `words.metadata` as a denormalized summary derived from `pipeline_events`?

---

## 10. Risk register

| # | Risk | Severity | Mitigation |
|---|------|----------|-----------|
| R-1 | `pipeline_events` write failures cascade into generation failures if not defensive. | HIGH | `logged_llm_call.__exit__` catches all insert exceptions, logs a warning, never re-raises. Covered in §5.3. |
| R-2 | PII leakage: user-entered words can be sensitive (e.g. medical terms, relationship topics). FULL prompts capture them. | MEDIUM | `pipeline_events` SELECT is admin-only via `is_admin()` RLS. Admin PIN fix (Option C) does NOT change this — role+RLS already enforces. Document in operator docs. |
| R-3 | Storage growth unbounded without retention. | MEDIUM | §9 O-9; apply a scheduled deletion job once retention policy is chosen. |
| R-4 | Instrumentation drift — new engine added without `logged_llm_call` wrapper. | MEDIUM | One-time doc in `orchestrator/docs/` explaining the helpers + a PR-review checklist item. |
| R-5 | Concept engine has 3 distinct LLM call sites (C1/C2/C3) all funneling to one function; easy to misclassify `sub_step` and lose pivot granularity. | LOW | Wrapper takes `sub_step` explicitly at each caller. |
| R-6 | Song-engine stub means no telemetry for the actual music pipeline unless the external AceStep service is also instrumented. | HIGH | Flagged as O-2. Either accept the blind spot (Suno bake-in captures the provider side; AceStep is opaque) or require external-service instrumentation as a prerequisite. |
| R-7 | `words.metadata` remains orphaned. | MEDIUM | Decided in O-1. Either revive aggregator writing a summary derived from `pipeline_events`, or update WordDetailPanel to query `pipeline_events` directly. |
| R-8 | Ferrari CSS scoping collides with a future sibling `.skin-*` or `.theme-*` class added after this work ships. | LOW | Use `[data-theme="ferrari-obs"]` attribute selector; document pattern in `orchestrator/docs/frontend-themes.md` (new file, out of scope here). |
| R-9 | Recharts dep bloats initial admin bundle. | LOW | Admin pages are lazy-loaded by route; bundle impact isolated. Confirmed feasible without measurement. |
| R-10 | admin_pin Option C (remove) leaves any operator scripts that rely on the PIN broken. | LOW | Grep codebase for `admin_pin` references: only `AdminRoute.tsx` + migrations use it. Agent confirmed (§7). No other consumers. |
| R-11 | Post-cutover, any `pipeline_events` schema change becomes expensive (append-only rows accrete). | MEDIUM | Use `metadata` JSONB for any field whose need is uncertain; promote to columns only when confident. |
| R-12 | Frontend assumes `words.metadata` shape; pipeline_events rewrite of WordDetailPanel is a non-trivial refactor not costed here. | MEDIUM | Flagged in O-10; cost separately in Phase-2 implementation plan. |

---

## 11. Adversarial self-review

Deliberately arguing against the above proposals. At least 5 points required; providing 8.

**S-1. The schema duplicates `generation-meta.json` rather than replacing it.** Why keep both? Answer: the JSON is the authoritative "what the engine saw" record written in the engine's own process, surviving even if the DB is unreachable. The DB is the queryable mirror. Weakness: this means two sources of truth; drift is possible if an engine is edited to write to one but not the other. A stricter architecture would remove `generation-meta.json` entirely. I do not recommend that because the write costs are tiny and the disk file survives the rare case of a catastrophic DB-write failure, but the duplication risk is real.

**S-2. "One row per event" is potentially noisy.** At 25 rows per word × thousands of words per day, every aggregate query is a scan of millions of rows within weeks. The indexes in §4.4 cover the common cases, but ad-hoc admin queries (e.g. "show me all prompts that contain the word 'sailing'") require a full-text index on `system_prompt` / `user_prompt` / `response_body`, not proposed. Adding `gin (tsvector)` indexes triples storage for those columns. A reviewer should flag whether text search is needed and accept the cost.

**S-3. `metadata` JSONB is an escape hatch that hides growth.** Stage-specific extras going into `metadata` means `metadata->>seed`, `metadata->>lufs_measured`, `metadata->>voice_origin` are unindexed by default. If analytics end up pivoting heavily on any of these, we'll regret not promoting them to columns. Proposal does not commit to a promotion discipline.

**S-4. LLM prompt capture may violate concept-engine determinism claims.** `reproducibility.note` in concept meta says "deterministic given inputs." If we capture prompts and the prompt itself is templated with a nondeterministic part (e.g. a dynamic date or random seed in the system prompt), this becomes a de facto record of seeds we did not previously track. Sounds fine, but it means we may accidentally surface inconsistencies we were unaware of. Good for debugging, not free.

**S-5. Instrumentation plumbing requires touching every engine's payload class.** §5.6 says "additive, non-breaking." True for new fields, but the engines currently accept payloads over HTTP from the orchestrator (per the prior investigation §3.1, though §2.7 here shows `downstream_worker.py` is now the orchestrator). The orchestrator → engine boundary is a JSON schema; changing it means both sides deploy in lockstep. A reviewer should verify this deploys cleanly or propose default values in the engine models that fall back to "unknown" if not supplied.

**S-6. Option C (drop `admin_pin`) is a UX regression for shared-workstation admins.** A user who leaves their session logged in but briefly steps away — the PIN was the "second lock" between an opened browser tab and admin actions. Removing it means anyone with physical access to the unlocked device gets admin. Counter: this is a minor threat; session timeouts and screen locks are the real solution. But it's not nothing. A reviewer may prefer Option A (RPC verify) despite the security theatre, for this UX.

**S-7. Ferrari scoping assumes new recharts dep is uncontroversial.** I recommended it at §8.4 but the codebase has been bundling lean (framer-motion is the heaviest extant dep). Adding recharts costs ~80 KB gzipped even route-lazy-loaded; it's a meaningful per-admin-session cost. A reviewer should ask whether hand-rolled is preferred even with the complexity cost.

**S-8. The "keep `debug.json` on disk forever" assumption is unexamined.** Image engine's `debug.json` is written per-word per-image-stage run. Across thousands of words × multiple retries, that's a meaningful storage line item that's been silently accruing. If we're moving prompts/responses into DB, we should at least consider whether `debug.json` can now be opt-in (env flag) rather than always-on. Not a hard recommendation — ground truth is valuable — but worth questioning rather than assuming permanence.

**S-9. Song-stage opacity is partly accepted rather than solved.** O-2 flags it; the schema supports events from a future song engine, but none arrive today. Saying "GREEN, ship it" while one of six stages remains a black box is an asymmetry a reviewer should push on. Possible mitigation: require Suno bake-in to emit to `pipeline_events` as a first-class stage (it already has enough state via `suno.py` + `suno_bakein.py` to emit structured events), even if placeholder AceStep does not.

**S-10. No cost cap / rate limit on `pipeline_events` inserts.** If something in the engine retries in a tight loop (not impossible given §2.6 bookend retries x3 silently), a storm of event writes could hit Supabase hard. Supabase connection pooling mitigates, but a per-runner-instance in-memory rate limit on event writes (e.g. 100/sec) would be prudent. Not specified.

---

## 12. Appendix — Gate and next actions

This report is saved at `d:\CODING\ResonanceTEST\INVESTIGATION_REPORT_OBSERVABILITY_GAPS.md`. No `git add`, no commit, no push — Sir Robert commits.

**Stop here.** Do not proceed to implementation. Do not write migrations or code. Await Sir Robert + adversarial-review critique before an implementation prompt is dispatched.
