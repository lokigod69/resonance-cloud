# Investigation: Unified Duration Pipeline — Phase 0

**Date:** 2026-04-28
**Scope:** orchestration / pipeline / settings / adapter side. Read-only. No code modified.
**Tree audited:** `orchestrator/` (live).

---

## 1. fal.ai routing confirmation

**Conclusion:** fal.ai is **not** unreachable. It is the **default fallback** in code: it gets selected whenever `video_mode in ("ltx_fast", "ltx_pro", "ltx")` AND `VIDEO_BACKEND` is anything other than exactly `"runpod"` or `"self_hosted"`. The default value of `VIDEO_BACKEND` in code is `"fal"`. Whether fal is actually reached at runtime depends on whether the deployed environment explicitly sets `VIDEO_BACKEND` to `runpod` or `self_hosted`.

### Routing trace

[router.py:13-52](orchestrator/cloud_engines/video_engine/router.py#L13-L52):

| Condition | Adapter | File |
|---|---|---|
| `video_mode == "ken_burns"` | `KenBurnsAdapter` | [adapters/ken_burns.py](orchestrator/cloud_engines/video_engine/adapters/ken_burns.py) |
| `VIDEO_BACKEND == "runpod"` AND LTX mode | `LTXRunPodAdapter` | [adapters/ltx_runpod.py](orchestrator/cloud_engines/video_engine/adapters/ltx_runpod.py) |
| `VIDEO_BACKEND == "self_hosted"` AND LTX mode | `LTXSelfHostedAdapter` | [adapters/ltx_selfhosted.py](orchestrator/cloud_engines/video_engine/adapters/ltx_selfhosted.py) |
| Any other `VIDEO_BACKEND` AND LTX mode | `LTXAdapter` (fal.ai) | [adapters/ltx.py](orchestrator/cloud_engines/video_engine/adapters/ltx.py) |
| Kling mode | `KlingAdapter` | [adapters/kling.py](orchestrator/cloud_engines/video_engine/adapters/kling.py) |
| Anything else | `ValueError` | — |

[config.py:25](orchestrator/cloud_engines/video_engine/config.py#L25): `VIDEO_BACKEND: str = os.getenv("VIDEO_BACKEND", "fal")` — fal is the **code default**. Local `orchestrator/.env` does not set `VIDEO_BACKEND`. `.env.cloud.example` documents the runpod/self_hosted lines as commented-out optional examples.

### `LTXAdapter` (fal) references

| File:line | Reference | Routing significance |
|---|---|---|
| [router.py:41-42](orchestrator/cloud_engines/video_engine/router.py#L41-L42) | `from .adapters.ltx import LTXAdapter; return LTXAdapter(tier=video_mode)` | Sole runtime selection site (fall-through branch). |
| [adapters/__init__.py:6, 12](orchestrator/cloud_engines/video_engine/adapters/__init__.py#L6) | Imports + re-exports `LTXAdapter` | Package export only; no other runtime callers found. |
| [adapters/ltx.py:54](orchestrator/cloud_engines/video_engine/adapters/ltx.py#L54) | Class definition | The fal implementation. |
| [adapters/ltx_runpod.py:70](orchestrator/cloud_engines/video_engine/adapters/ltx_runpod.py#L70), [adapters/ltx_selfhosted.py:58](orchestrator/cloud_engines/video_engine/adapters/ltx_selfhosted.py#L58) | Comments only | Reference text in docstrings. |

`fal_client` itself is imported lazily inside `LTXAdapter.generate()` at [ltx.py:113](orchestrator/cloud_engines/video_engine/adapters/ltx.py#L113), and is declared as a runtime dependency in [pyproject.toml](orchestrator/pyproject.toml).

### Is `adapters/ltx.py` a deletion candidate?

**Conditional yes.** It can be deleted only after Phase 1 first removes the fal-fallback branch from the router and either makes the runpod/self_hosted decision explicit or makes an unrecognized backend raise rather than silently route to fal. If today's fall-through stays, deleting the file would crash the pipeline whenever `VIDEO_BACKEND` is unset, misspelled, or otherwise not one of the two accepted values.

**Phase 1 prompt should ask Sir Robert** to confirm `VIDEO_BACKEND=runpod` (or `self_hosted`) is set in every deployed environment (Railway production, any preview env, local runs that exercise the video stage). If confirmed, the deletion bundle is:

- File: `orchestrator/cloud_engines/video_engine/adapters/ltx.py`.
- Line: `from .ltx import LTXAdapter` and entry in `__all__` at [adapters/__init__.py](orchestrator/cloud_engines/video_engine/adapters/__init__.py#L6).
- Branch: [router.py:40-42](orchestrator/cloud_engines/video_engine/router.py#L40-L42).
- Branch: [cost.py:50-56](orchestrator/cloud_engines/video_engine/cost.py#L50-L56) (the flat-rate $0.20 LTX path triggered only when `VIDEO_BACKEND` is not runpod/self_hosted).
- Config: `FAL_KEY` at [config.py:21](orchestrator/cloud_engines/video_engine/config.py#L21) and the `fal_client` dep in pyproject.
- Legacy enum constants at [ltx_shared.py:64-66](orchestrator/cloud_engines/video_engine/adapters/ltx_shared.py#L64-L66) and `_snap_duration` at [ltx_shared.py:69-75](orchestrator/cloud_engines/video_engine/adapters/ltx_shared.py#L69-L75) become dead.

If fal **stays** as a fallback, `ltx.py` keeps its enum-snap logic (because the fal API itself enforces the enum — see comment at [ltx.py:6](orchestrator/cloud_engines/video_engine/adapters/ltx.py#L6)). The legacy enum can still be removed from `pipeline.py` and from the runpod/self-hosted adapters; only the fal adapter would keep a localized copy as a private detail.

---

## 2. Hardcoded duration deletion checklist

Classifications:

- **REAL** — semantic constant, stays.
- **LEGACY-FAL** — exists only because of fal LTX enum, deletes (or localizes to fal adapter only if §1 keeps fal).
- **DUAL-MODE** — exists because of short/normal split, deletes.
- **TEST** — needs updating after unification.
- **PYDANTIC-BOUND** — settings-model bound, may need adjusting.
- **PROMPT-BODY** — body of `prompts.py` storyboard prompt; out-of-scope per investigation brief but flagged for the parallel chat.
- **UNRELATED** — duration-shaped number that means something else (RGB, word count, etc.).

### 2.1 `short_mode` references — all DUAL-MODE, all delete

| File:line | Snippet | Action |
|---|---|---|
| [orchestrator/src/settings.py:54](orchestrator/src/settings.py#L54) | `"short_mode": False` (in `images` defaults) | Delete |
| [orchestrator/src/pipeline.py:27-30](orchestrator/src/pipeline.py#L27-L30) | `_short_mode_from_images(...)` helper | Delete |
| [orchestrator/src/pipeline.py:545-555](orchestrator/src/pipeline.py#L545-L555) | `if settings.get("short_mode", False) and num_images >= 2: normalize…` | Generalize: always normalize to `target=settings["_target_duration"]`; merge with the `valid_durations is None` branch into one unified path |
| [orchestrator/src/pipeline.py:650-682](orchestrator/src/pipeline.py#L650-L682) | `def _normalize_short_mode_durations(...)` | Rename to `_normalize_scene_durations`; remove `target=15` default (require explicit target) |
| [orchestrator/src/pipeline.py:891-892](orchestrator/src/pipeline.py#L891-L892) | concept stage: `if _short: settings["duration"] = 15` | Delete (concept duration derives from `clip_duration` instead — §3.4) |
| [orchestrator/src/pipeline.py:916-917](orchestrator/src/pipeline.py#L916-L917) | song stage: `if _short: settings["duration"] = 15` | Delete |
| [orchestrator/src/pipeline.py:953-956](orchestrator/src/pipeline.py#L953-L956) | images stage: `if short_mode: clip_duration=15; coerce image_count` | Delete |
| [orchestrator/src/pipeline.py:996-998](orchestrator/src/pipeline.py#L996-L998) | video stage: `_target = 15 if _short else concept_settings.get("duration", 20)` | Replace with `_target = clip_duration` from canonical source. Drop `short_mode` from per-scene settings dict |
| [orchestrator/src/services/suno_bakein.py:114](orchestrator/src/services/suno_bakein.py#L114) | `def bake_suno_into_word(..., short_mode: bool = False, ...)` | Drop the `short_mode` kwarg |
| [orchestrator/src/services/suno_bakein.py:431](orchestrator/src/services/suno_bakein.py#L431) | `"overflow_strategy": "video_full" if short_mode else "trim"` | Replace with one unified policy (recommendation in §3.5) |
| [orchestrator/src/orchestration/downstream_worker.py:344-372](orchestrator/src/orchestration/downstream_worker.py#L344-L372) | resolves `short_mode` and passes to bake | Drop the resolve + kwarg |
| [orchestrator/cloud_engines/image_engine/models.py:131-134](orchestrator/cloud_engines/image_engine/models.py#L131-L134) | `short_mode: bool = Field(...)` on `ImageSettings` | Delete the field |
| [orchestrator/cloud_engines/image_engine/storyboard.py:76, 87, 126](orchestrator/cloud_engines/image_engine/storyboard.py#L76-L87) | reads/passes/logs `settings.short_mode` | Drop variable + kwarg + metadata key |
| [orchestrator/cloud_engines/image_engine/prompts.py:27](orchestrator/cloud_engines/image_engine/prompts.py#L27) | `build_system_prompt(..., short_mode=False, ...)` signature | Drop kwarg |
| [orchestrator/cloud_engines/image_engine/prompts.py:65, 76](orchestrator/cloud_engines/image_engine/prompts.py#L65) | passes `short_mode` to `_image_count_instruction` | Drop |
| [orchestrator/cloud_engines/image_engine/prompts.py:110](orchestrator/cloud_engines/image_engine/prompts.py#L110) | passes `short_mode` to `_duration_allocation_block` | Drop |
| [orchestrator/cloud_engines/image_engine/prompts.py:778, 782, 795-797](orchestrator/cloud_engines/image_engine/prompts.py#L778-L797) | `_image_count_instruction(short_mode=...)` body branch | Drop param + branch |
| [orchestrator/cloud_engines/image_engine/prompts.py:1631-1664](orchestrator/cloud_engines/image_engine/prompts.py#L1631-L1664) | `_duration_allocation_block(short_mode=...)` two-branch body | Collapse to one block (PROMPT-BODY collapse is parallel-chat work; this report only confirms the two-branch site exists) |
| [orchestrator/cloud_engines/video_engine/models.py:79-82](orchestrator/cloud_engines/video_engine/models.py#L79-L82) | `VideoSettings.short_mode: bool` field | Delete |
| [orchestrator/cloud_engines/video_engine/adapters/ltx_runpod.py:75-86](orchestrator/cloud_engines/video_engine/adapters/ltx_runpod.py#L75-L86) | `if getattr(adjusted, "short_mode", False): return` early-bypass; then snap | Drop the bypass; drop the entire snap (per §1, runpod adapter does not need fal enum). Adapter already sends `settings.duration` straight to the worker at [ltx_runpod.py:174](orchestrator/cloud_engines/video_engine/adapters/ltx_runpod.py#L174) |
| [orchestrator/cloud_engines/video_engine/adapters/ltx_selfhosted.py:63-74](orchestrator/cloud_engines/video_engine/adapters/ltx_selfhosted.py#L63-L74) | same shape | Same: drop bypass, drop snap |
| [orchestrator/frontend/src/components/settings/fieldConfigs.ts:70](orchestrator/frontend/src/components/settings/fieldConfigs.ts#L70) | UI toggle for `short_mode` | Delete |
| [orchestrator/tests/test_short_mode_durations.py](orchestrator/tests/test_short_mode_durations.py) (entire file) | tests `_normalize_short_mode_durations` | Rename + parametrize for arbitrary `target` (e.g. 12, 15, 20, 25, 30) |

### 2.2 `AUTO_IMAGE_COUNT_MAP` and `_RECOMMENDED_RANGE` — DUAL-MODE-adjacent, replace with function

| File:line | Snippet | Action |
|---|---|---|
| [orchestrator/cloud_engines/image_engine/models.py:581-587](orchestrator/cloud_engines/image_engine/models.py#L581-L587) | `AUTO_IMAGE_COUNT_MAP: dict[int, int] = {5:1, 10:2, 15:2, 20:3, 30:3}` | Delete dict |
| [orchestrator/cloud_engines/image_engine/models.py:590-601](orchestrator/cloud_engines/image_engine/models.py#L590-L601) | `resolve_image_count` consumer of the dict | Replace dict lookup with `auto_scene_count(settings.clip_duration)` (function defined in §4) |
| [orchestrator/cloud_engines/image_engine/models.py:72](orchestrator/cloud_engines/image_engine/models.py#L72) | `CLIP_DURATIONS = (5, 10, 15, 20, 30)` | Replace with bounds constants per §4 range |
| [orchestrator/cloud_engines/image_engine/models.py:116](orchestrator/cloud_engines/image_engine/models.py#L116) | `clip_duration: int = Field(default=30)` | PYDANTIC-BOUND — set default to 15, add `ge=6, le=30` |
| [orchestrator/cloud_engines/image_engine/models.py:167-172](orchestrator/cloud_engines/image_engine/models.py#L167-L172) | `validate_clip_duration` enum check | Replace with bounded validator (or rely on `Field(ge=, le=)`) |
| [orchestrator/cloud_engines/image_engine/prompts.py:766-772](orchestrator/cloud_engines/image_engine/prompts.py#L766-L772) | `_RECOMMENDED_RANGE = {5:"1", 10:"1-2", 15:"2-3", 20:"2-3", 30:"2-3"}` | Replace with banded function (§4.4) |

### 2.3 Legacy fal enum constants — LEGACY-FAL

These exist only because of the fal API enum. After §1 deletion of fal adapter (or localization), they go away or move into `ltx.py` only.

| File:line | Snippet | Action |
|---|---|---|
| [orchestrator/cloud_engines/video_engine/adapters/ltx_shared.py:60-66](orchestrator/cloud_engines/video_engine/adapters/ltx_shared.py#L60-L66) | `_I2V_DURATIONS`, `_T2V_PRO_DURATIONS`, `_T2V_FAST_DURATIONS` + comment block | Delete (move to fal `ltx.py` only if that file survives) |
| [orchestrator/cloud_engines/video_engine/adapters/ltx_shared.py:69-75](orchestrator/cloud_engines/video_engine/adapters/ltx_shared.py#L69-L75) | `_snap_duration` | Same — move-or-delete |
| [orchestrator/cloud_engines/video_engine/adapters/ltx.py:25-37](orchestrator/cloud_engines/video_engine/adapters/ltx.py#L25-L37) | imports of the enum constants + `_snap_duration` | If file deleted: gone; if kept: localize |
| [orchestrator/cloud_engines/video_engine/adapters/ltx.py:81-88, 156-162](orchestrator/cloud_engines/video_engine/adapters/ltx.py#L81-L88) | `validate_settings` and `generate` snap logic | Same |
| [orchestrator/cloud_engines/video_engine/adapters/ltx_runpod.py:32-39](orchestrator/cloud_engines/video_engine/adapters/ltx_runpod.py#L32-L39) | imports of `_*_DURATIONS`, `_snap_duration` | Delete imports |
| [orchestrator/cloud_engines/video_engine/adapters/ltx_selfhosted.py:24-31](orchestrator/cloud_engines/video_engine/adapters/ltx_selfhosted.py#L24-L31) | same | Delete imports |
| [orchestrator/src/pipeline.py:515-516](orchestrator/src/pipeline.py#L515-L516) | docstring referencing fal enums | Update docstring |
| [orchestrator/src/pipeline.py:575-620](orchestrator/src/pipeline.py#L575-L620) | LTX-mode greedy-fill against `valid_durations` | Delete entire branch — after unification, all paths use the unified `_normalize_scene_durations(raw, target=clip_duration, min=3, max=10)` |
| [orchestrator/src/pipeline.py:625-626](orchestrator/src/pipeline.py#L625-L626) | `_LTX_PRO_DURATIONS`, `_LTX_FAST_DURATIONS` (duplicated in pipeline) | Delete |
| [orchestrator/src/pipeline.py:629-636](orchestrator/src/pipeline.py#L629-L636) | `_get_valid_durations` | Delete |
| [orchestrator/src/pipeline.py:639-647](orchestrator/src/pipeline.py#L639-L647) | `_snap_down` | Delete |

### 2.4 Hardcoded `15` and `20` literals — case-by-case

| File:line | Value | Classification | Action |
|---|---|---|---|
| [orchestrator/src/settings.py:28](orchestrator/src/settings.py#L28) | `concept.duration: 20` | DUAL-MODE-derived | Default → 15. Keep field as a runtime mirror synced from `clip_duration` at dispatch time — §3.4. |
| [orchestrator/src/settings.py:34](orchestrator/src/settings.py#L34) | `song.duration: 20` | DUAL-MODE-derived | Same. (Note: Suno API does NOT accept duration — see §3.2.) |
| [orchestrator/src/settings.py:53](orchestrator/src/settings.py#L53) | `images.clip_duration: 20` | REAL (canonical setting) | Default → 15 |
| [orchestrator/src/settings.py:64](orchestrator/src/settings.py#L64) | `video.duration: 6` | REAL (per-scene default) | Keep as-is. This is the per-scene fallback when storyboard provides no allocation. |
| [orchestrator/src/pipeline.py:548](orchestrator/src/pipeline.py#L548) | `target=(target or 15)` (short-mode normalizer fallback) | DUAL-MODE | Delete fallback. After unification, target is always `settings["_target_duration"]` |
| [orchestrator/src/pipeline.py:652](orchestrator/src/pipeline.py#L652) | `def _normalize_short_mode_durations(... target: int = 15, ...)` | DUAL-MODE | Drop default; require caller to pass explicitly |
| [orchestrator/src/pipeline.py:892](orchestrator/src/pipeline.py#L892) | `settings["duration"] = 15` (concept short-mode) | DUAL-MODE | Delete (§2.1) |
| [orchestrator/src/pipeline.py:917](orchestrator/src/pipeline.py#L917) | `settings["duration"] = 15` (song short-mode) | DUAL-MODE | Delete |
| [orchestrator/src/pipeline.py:950](orchestrator/src/pipeline.py#L950) | `settings['clip_duration'] = concept_settings.get('duration', 20)` | DUAL-MODE-adjacent | After unification, **invert direction**: concept inherits from `clip_duration`, not the other way around. Replace fallback with `15`. See §3.4. |
| [orchestrator/src/pipeline.py:954](orchestrator/src/pipeline.py#L954) | `settings["clip_duration"] = 15` (images short-mode override) | DUAL-MODE | Delete |
| [orchestrator/src/pipeline.py:997](orchestrator/src/pipeline.py#L997) | `_target = 15 if _short else concept_settings.get("duration", 20)` | DUAL-MODE | Replace with `_target = images_settings["clip_duration"]` (canonical source — §3.4) |
| [orchestrator/cloud_engines/image_engine/prompts.py:796](orchestrator/cloud_engines/image_engine/prompts.py#L796) | `"Short mode: the card is exactly 15 seconds total..."` | PROMPT-BODY DUAL-MODE | Out of scope; flag |
| [orchestrator/cloud_engines/image_engine/prompts.py:1644](orchestrator/cloud_engines/image_engine/prompts.py#L1644) | `"15 seconds, ..."` in short branch of `_duration_allocation_block` | PROMPT-BODY DUAL-MODE | Out of scope; flag. The block should collapse to a single body parameterized by `total_duration` and per-scene min/max. |
| [orchestrator/cloud_engines/image_engine/prompts.py:1647-1664](orchestrator/cloud_engines/image_engine/prompts.py#L1647-L1664) | normal-mode body: "close to {total} seconds within ±2s", "Valid per-scene durations: 6, 8, or 10 seconds ONLY", "10+10=20s", "6+6+8=20s or 6+8+8=22s" | PROMPT-BODY LEGACY-FAL + DUAL-MODE | Out of scope; flag. Drop the "6/8/10 ONLY" line and the ±2s tolerance (normalizer enforces exactness). Parameterize examples. |
| [orchestrator/cloud_engines/image_engine/prompts.py:1331](orchestrator/cloud_engines/image_engine/prompts.py#L1331) | `"- Be 15-30 words, single line, no line breaks"` | UNRELATED (word count) | Keep |
| [orchestrator/cloud_engines/image_engine/models.py:72](orchestrator/cloud_engines/image_engine/models.py#L72) | `CLIP_DURATIONS = (5, 10, 15, 20, 30)` | DUAL-MODE-adjacent | Replace with bounds constants (§4) |
| [orchestrator/cloud_engines/image_engine/models.py:362](orchestrator/cloud_engines/image_engine/models.py#L362), [422](orchestrator/cloud_engines/image_engine/models.py#L422) | `suggested_duration: Optional[int] = Field(default=None, ge=3, le=10)` | REAL (per-scene contract) | Keep — these are the per-scene min/max bounds the unified system relies on |
| [orchestrator/cloud_engines/image_engine/models.py:584-585](orchestrator/cloud_engines/image_engine/models.py#L584-L585) | `15: 2, 20: 3` in `AUTO_IMAGE_COUNT_MAP` | DUAL-MODE-adjacent | Delete entire dict (§2.2) |
| [orchestrator/cloud_engines/image_engine/prompts.py:766-772](orchestrator/cloud_engines/image_engine/prompts.py#L766-L772) | `_RECOMMENDED_RANGE = {5:"1", 10:"1-2", 15:"2-3", 20:"2-3", 30:"2-3"}` | DUAL-MODE-adjacent | Replace with banded function (§4.4) |
| [orchestrator/cloud_engines/song_engine/models.py:42](orchestrator/cloud_engines/song_engine/models.py#L42) | `duration: int = Field(default=30, ...)` | PYDANTIC-BOUND DUAL-MODE-adjacent | Default → 15 |
| [orchestrator/cloud_engines/song_engine/models.py:56-61](orchestrator/cloud_engines/song_engine/models.py#L56-L61) | `if v not in (15, 20, 30): raise` | PYDANTIC-BOUND | Replace with bounded validator (`ge=6, le=30` per §4) |
| [orchestrator/cloud_engines/song_engine/models.py:182](orchestrator/cloud_engines/song_engine/models.py#L182) | `requested_duration: int = 30` (metadata) | DUAL-MODE-adjacent | Default → 15 |
| [orchestrator/cloud_engines/concept_engine/models.py:91-96](orchestrator/cloud_engines/concept_engine/models.py#L91-L96) | `if v not in (15, 20, 30, 60): raise` | PYDANTIC-BOUND | Replace with bounded validator. **Flag for Sir Robert**: nothing in the unified pipeline targets 60s — drop or keep as a non-video-mode? |
| [orchestrator/cloud_engines/concept_engine/models.py:57](orchestrator/cloud_engines/concept_engine/models.py#L57) (approx) | concept `duration` default 30 | DUAL-MODE-adjacent | Default → 15 |
| [orchestrator/cloud_engines/concept_engine/lyrics.py:347, 383](orchestrator/cloud_engines/concept_engine/lyrics.py#L347) | LLM prompt `duration` default 30 | DUAL-MODE-adjacent | Default → 15 or require explicit |
| [orchestrator/cloud_engines/concept_engine/lyrics.py:350](orchestrator/cloud_engines/concept_engine/lyrics.py#L350) | `reps = "2-3" if duration == 15 else "3-5"` | DUAL-MODE TEMPLATE | Generalize: `"2-3" if duration <= 17 else "3-5"` (or band by §4 boundaries). See §3.1. |
| [orchestrator/cloud_engines/concept_engine/lyrics.py:386](orchestrator/cloud_engines/concept_engine/lyrics.py#L386) | `reps = "5-6" if duration == 15 else "6-8"` | DUAL-MODE TEMPLATE | Same |
| [orchestrator/cloud_engines/concept_engine/templates.py:136, 223, 355](orchestrator/cloud_engines/concept_engine/templates.py) | template duration defaults 30 | DUAL-MODE-adjacent | Default → 15 or require explicit |
| [orchestrator/cloud_engines/concept_engine/templates.py:146, 165, 184, 203, 233, 273, 312](orchestrator/cloud_engines/concept_engine/templates.py#L146) | `if duration == 15` lyric template branches (minimal/standard) | DUAL-MODE TEMPLATE | Generalize: `if duration <= 17` or band by §4 boundaries |
| [orchestrator/cloud_engines/concept_engine/templates.py:395](orchestrator/cloud_engines/concept_engine/templates.py#L395) | `if duration <= 15:` (reliable mode) | TEMPLATE | Already banded — fine for any int |
| [orchestrator/cloud_engines/concept_engine/templates.py:414](orchestrator/cloud_engines/concept_engine/templates.py#L414) | `if duration >= 60:` | TEMPLATE | Already banded — fine for any int. Whether 60 stays in scope depends on the concept-60s flag above. |
| [orchestrator/cloud_engines/concept_engine/templates.py:483-650](orchestrator/cloud_engines/concept_engine/templates.py#L483) | Templates A-E for Suno verse-chorus-outro (hardcoded "20-25s", "30-35s") | UNRELATED — these are commentary about Suno *output* duration | Keep |
| [orchestrator/cloud_engines/concept_engine/caption.py:227, 259](orchestrator/cloud_engines/concept_engine/caption.py#L227) | `"Under 20 words total"` | UNRELATED (word count) | Keep |
| [orchestrator/cloud_engines/video_engine/models.py:56-59](orchestrator/cloud_engines/video_engine/models.py#L56-L59) | `VideoSettings.duration: int = Field(default=6, ge=3, le=20, ...)` | PYDANTIC-BOUND | This is per-clip (one scene). Tighten `le=20` → `le=10` (matches per-scene max from §4). Default 6 stays. |
| [orchestrator/cloud_engines/video_engine/cost.py:14-16](orchestrator/cloud_engines/video_engine/cost.py#L14-L16) | `"ltx_*": {"type": "flat", "cost": 0.20}` | UNRELATED (`0.20` = dollars) | Keep |
| [orchestrator/cloud_engines/video_engine/cost.py:40, 42](orchestrator/cloud_engines/video_engine/cost.py#L40-L42) | `(duration / 6.0) * 540`, `(duration / 6.0) * 90` | REAL cost-estimate constants | Keep |
| [orchestrator/cloud_engines/video_engine/adapters/kling.py:64-72](orchestrator/cloud_engines/video_engine/adapters/kling.py) | Kling `5/10` enum rounding | REAL provider constraint | Keep |
| [orchestrator/cloud_engines/bookend_engine/color.py:218](orchestrator/cloud_engines/bookend_engine/color.py#L218) | `(15, 15, 15)` | UNRELATED (RGB) | Keep |
| [orchestrator/cloud_engines/image_engine/renderer.py:133](orchestrator/cloud_engines/image_engine/renderer.py#L133) | `mean_val < 15` | UNRELATED (pixel mean threshold) | Keep |
| [orchestrator/cloud_engines/assembly_engine/gaps.py:290-298](orchestrator/cloud_engines/assembly_engine/gaps.py#L290) | `1.15` zoom factor, `0.15 / total_frames` | UNRELATED | Keep |
| [orchestrator/cloud_engines/assembly_engine/models.py:54](orchestrator/cloud_engines/assembly_engine/models.py#L54) | `overflow_strategy: Literal["trim", "fade_audio_black", "video_full"] = "video_full"` | REAL assembly policy default | Keep — already the default. See §3.5. |
| [orchestrator/src/cloud_dispatcher.py:128](orchestrator/src/cloud_dispatcher.py#L128) (approx) | placeholder duration fallback `30` | DUAL-MODE-adjacent | Fallback → 15 |
| [orchestrator/src/services/suno_bakein.py:22-23](orchestrator/src/services/suno_bakein.py#L22) | `SUNO_MIN_USABLE_DURATION = 12.0`, `SUNO_MAX_USABLE_DURATION = 150.0` | REAL safety guard for returned Suno audio | Keep |
| [orchestrator/src/services/suno_bakein.py:259-261, 351-353](orchestrator/src/services/suno_bakein.py#L259) | reject Suno audio `<12s` | REAL safety guard | Keep |
| [orchestrator/src/services/suno_bakein.py:300-308, 337, 370-377](orchestrator/src/services/suno_bakein.py#L300) | trim/fade against probed `clip_duration` (local var = probed video duration) | REAL unified behavior | Keep |
| [orchestrator/tests/manual/test_pod_prewarm.py:259](orchestrator/tests/manual/test_pod_prewarm.py#L259) | `wait_for_prewarm_threads(timeout=15.0)` | UNRELATED | Keep |
| [orchestrator/tests/test_short_mode_durations.py](orchestrator/tests/test_short_mode_durations.py) | tests assert `sum(result) == 15` | TEST | Rename file → `test_scene_duration_normalizer.py`. Parametrize across multiple `target` values (12, 15, 20, 25, 30) |
| [orchestrator/tests/test_concept_lyric_levels.py](orchestrator/tests/test_concept_lyric_levels.py) | duration=30 fixtures | TEST | Update only as needed after concept density changes |
| [orchestrator/tests/test_image_storyboard_schema_compiler.py:62](orchestrator/tests/test_image_storyboard_schema_compiler.py#L62) | `suggested_duration=8` | TEST (valid per-scene) | Keep |
| [orchestrator/frontend/src/components/settings/fieldConfigs.ts:44](orchestrator/frontend/src/components/settings/fieldConfigs.ts#L44) | `concept.duration` dropdown `[15, 20, 30, 60], default: 20` | UI-bound DUAL-MODE-adjacent | After unification, concept duration syncs from `clip_duration`. Either remove the dropdown entirely (preferred — single source of truth for the user) or update options/default |
| [orchestrator/frontend/src/components/settings/fieldConfigs.ts:51](orchestrator/frontend/src/components/settings/fieldConfigs.ts#L51) | `song.duration` dropdown `[15, 20, 30, 60], default: 20` | UI-bound DUAL-MODE-adjacent | Same — likely remove from UI. Note backend song validator does not allow 60. |
| [orchestrator/frontend/src/components/settings/fieldConfigs.ts:69](orchestrator/frontend/src/components/settings/fieldConfigs.ts#L69) | `image_count` options `1-8` | Broader than auto cap of 3 | Consider narrowing UI to 1-3 (auto cap matches storyboard cap) |
| [orchestrator/frontend/src/components/settings/fieldConfigs.ts:128](orchestrator/frontend/src/components/settings/fieldConfigs.ts#L128) | Ken Burns duration slider `min: 3, max: 30` | UI-bound | Keep as-is for Ken Burns manual setting |
| [orchestrator/frontend/src/components/settings/fieldConfigs.ts:131](orchestrator/frontend/src/components/settings/fieldConfigs.ts#L131) | LTX duration slider `min: 6, max: 10, step: 1, default: 6` | LEGACY-FAL UI | This is per-scene LTX duration; gets overridden by storyboard allocation anyway. Either align bounds to per-scene 3-10 or remove the field entirely (storyboard owns it). |
| (no UI field for `clip_duration`) | — | MISSING UI | After unification, the user needs a `clip_duration` slider somewhere (image settings is the natural home). |

### 2.5 Files Phase 1 will edit

Backend Python:
- `orchestrator/src/settings.py`
- `orchestrator/src/pipeline.py`
- `orchestrator/src/services/suno_bakein.py`
- `orchestrator/src/orchestration/downstream_worker.py`
- `orchestrator/src/cloud_dispatcher.py` (placeholder duration fallback)
- `orchestrator/cloud_engines/image_engine/models.py`
- `orchestrator/cloud_engines/image_engine/storyboard.py`
- `orchestrator/cloud_engines/image_engine/prompts.py` (signature changes only — body changes are parallel work)
- `orchestrator/cloud_engines/concept_engine/models.py`
- `orchestrator/cloud_engines/concept_engine/lyrics.py`
- `orchestrator/cloud_engines/concept_engine/templates.py`
- `orchestrator/cloud_engines/song_engine/models.py`
- `orchestrator/cloud_engines/video_engine/models.py`
- `orchestrator/cloud_engines/video_engine/router.py` (drop fal fallback if §1 confirmed)
- `orchestrator/cloud_engines/video_engine/config.py` (drop `FAL_KEY` if §1 confirmed)
- `orchestrator/cloud_engines/video_engine/cost.py` (drop fal-only branch if §1 confirmed)
- `orchestrator/cloud_engines/video_engine/adapters/__init__.py`
- `orchestrator/cloud_engines/video_engine/adapters/ltx.py` (delete if §1 confirmed)
- `orchestrator/cloud_engines/video_engine/adapters/ltx_shared.py` (drop legacy enum + `_snap_duration`)
- `orchestrator/cloud_engines/video_engine/adapters/ltx_runpod.py`
- `orchestrator/cloud_engines/video_engine/adapters/ltx_selfhosted.py`

Frontend:
- `orchestrator/frontend/src/components/settings/fieldConfigs.ts`

Tests:
- `orchestrator/tests/test_short_mode_durations.py` (rename + parametrize)

---

## 3. Non-standard-target behavior assessment

### 3.1 Concept engine — lyric density at non-standard targets

Concept generates lyrics in two ways: template path ([lyrics.py:121-181](orchestrator/cloud_engines/concept_engine/lyrics.py#L121-L181)) and LLM path ([lyrics.py:188-251](orchestrator/cloud_engines/concept_engine/lyrics.py#L188-L251)). Both branch on duration, often as binary "is it 15?" checks.

Hard blockers:

- [concept_engine/models.py:91-96](orchestrator/cloud_engines/concept_engine/models.py#L91-L96) rejects anything except `15, 20, 30, 60`. `clip_duration=12, 18, 25` fails Pydantic validation today.
- [lyrics.py:350](orchestrator/cloud_engines/concept_engine/lyrics.py#L350) (`_contextual_lyrics_prompt`): `reps = "2-3" if duration == 15 else "3-5"`. At `duration=12`: requests "3-5" reps (likely overflows 12s). At `duration=25`: also "3-5" (acceptable).
- [lyrics.py:386](orchestrator/cloud_engines/concept_engine/lyrics.py#L386) (`_creative_lyrics_prompt`): `reps = "5-6" if duration == 15 else "6-8"`. Same shape.
- [templates.py:146..312](orchestrator/cloud_engines/concept_engine/templates.py#L146-L312) (`generate_minimal`/`generate_standard`): every word-length-class branches on `if duration == 15`. At 12, 18, 25, 30 they fall into the longer-template default.
- [templates.py:355-481](orchestrator/cloud_engines/concept_engine/templates.py#L355-L481) (`generate_reliable`): bands by `<=15` and `>=60`. Already generalizes for any int.

**Verdict:** lyric density is **not catastrophic** at non-standard targets, but lazy. Three concrete issues:

1. At `clip_duration=12`, contextual/creative modes request more reps than fit. Suno picks song length from lyrics; the bake-in then trims audio to actual video length. UX impact: minor.
2. At `clip_duration=25`, prompts request the same density as 30s. Suno produces ~30s of song; bake-in trims to 25s. Acceptable.
3. The minimal/standard template branches for non-15 durations fall through to the 30s case. Cosmetic, not catastrophic.

**Fixable in this refactor?** Yes, cheaply. Generalize the `if duration == 15` checks to `if duration <= 17` (or band by §4 boundaries). Two files, very small change. **Recommendation:** do it in Phase 1.

### 3.2 Song engine (Suno) — duration acceptance and quality

Suno is invoked via kie.ai. The request payload at [suno.py:152-161](orchestrator/src/suno.py#L152-L161) does **not** include a `duration` field:

```python
{
    "prompt": lyrics,
    "customMode": True,
    "instrumental": False,
    "model": "V5_5",
    "style": style[:1000],
    "title": title[:80],
    "vocalGender": suno_gender,
    "callBackUrl": "https://resonanz.pro/api/suno/callback",
}
```

So:

- Q: "Does the Suno API accept any integer duration?" → **No duration parameter at all.** We have no direct control.
- Q: "Does music quality degrade outside specific values?" → No — quality is independent of duration in Suno V5.5.
- Q: "What duration is requested vs returned vs stored?" → Requested: none (Suno picks based on lyrics + style + model). Returned: actual song length, probed via `_probe_audio_duration` at [suno_bakein.py:254](orchestrator/src/services/suno_bakein.py#L254). Stored: trimmed result vs probed video duration.

Sanity bounds at [suno_bakein.py:22-23](orchestrator/src/services/suno_bakein.py#L22-L23): `SUNO_MIN_USABLE_DURATION = 12.0`, `SUNO_MAX_USABLE_DURATION = 150.0`.

**Implication:** "Song duration" is fictional at the Suno API layer. The `concept.duration` knob steers which lyric template gets rendered, which influences Suno's song length, but does not directly control it. The `song.duration` field is essentially vestigial — it's read by `SongSettings.duration` validation but never sent to Suno.

**Implication for Phase 1:** Sir Robert's intuition that "the song fits the video, audio adapts to video length" is what already happens at the bake-in trim layer. The `clip_duration=12` vs `clip_duration=25` choice changes:

1. Which lyric template gets rendered (mild effect on lyric density).
2. How the storyboard LLM allocates per-scene durations (target sum = `clip_duration`).
3. The actual final video length (after assembly).

It does **not** meaningfully change Suno's actual output length, only what gets trimmed afterward.

There is also a placeholder path: [src/cloud_dispatcher.py](orchestrator/src/cloud_dispatcher.py) creates a silent FLAC of `settings.duration` seconds when `MUSIC_MODE` is not `suno` (or as a fallback). That path obeys whatever integer is passed. Not blocking.

### 3.3 Bake-in `clip_duration` source clarification

The local `clip_duration` variable inside `bake_suno_into_word` is **not** the settings field. It's the **probed actual video duration** from [suno_bakein.py:253](orchestrator/src/services/suno_bakein.py#L253) — `_probe_clip_durations(word_dir / "videos" / video_version)` reads the assembled video file and returns its real duration. So bake-in is already duration-agnostic — it works against whatever the assembly engine produced. After unification this code does not need to change semantically; only the `short_mode`-driven `overflow_strategy` toggle needs replacement (§3.5).

### 3.4 Where does `clip_duration` come from after unification?

The brief proposes `clip_duration` as the canonical setting. Today the canonical-source semantics are inverted: `concept.duration` is the source, and the image stage syncs `settings['clip_duration']` from it ([pipeline.py:946-950](orchestrator/src/pipeline.py#L945-L950)).

**Recommendation for Phase 1:** flip the direction so that `images.clip_duration` is the source of truth, and the concept/song/video stages derive their `duration` from it at dispatch time. Reasons:

- Default in [settings.py:21-119](orchestrator/src/settings.py) currently has both `concept.duration` and `images.clip_duration` as user-facing knobs. Unification means one knob.
- `images` is the FIRST stage in `STAGE_ORDER` ([pipeline.py:33](orchestrator/src/pipeline.py#L33)). The storyboard LLM produces per-scene durations. Natural for the *image* stage's setting to be authoritative.
- Phase 2 auto-duration ("LLM picks duration based on creative direction") happens in the storyboard LLM. The chosen value should be written back to `images.clip_duration` and inherited downstream (see §5).
- This matches Sir Robert's stated preference for one duration concept and one rule.

Concrete plan: at concept dispatch, do `concept_settings["duration"] = images_settings["clip_duration"]`. At song dispatch, same. At video dispatch, `_target_duration = images_settings["clip_duration"]`.

The pydantic `concept.duration` and `song.duration` fields can stay as resolved values mirrored from `clip_duration` (useful for downstream readers), or be dropped from the user-facing settings UI but kept as runtime fields.

### 3.5 Unified `overflow_strategy` policy

Today: [suno_bakein.py:431](orchestrator/src/services/suno_bakein.py#L431) — `"overflow_strategy": "video_full" if short_mode else "trim"`.

The three strategies from [assembly_engine/models.py:54](orchestrator/cloud_engines/assembly_engine/models.py#L54):

- `"trim"` — clips trimmed/discarded if video > audio. Audio is master.
- `"fade_audio_black"` — fade audio out; video plays full length.
- `"video_full"` — pad audio with silence; video plays full length.

Note: in the suno bake-in path, audio is already trimmed/faded against probed video duration *before* assembly runs ([suno_bakein.py:288-381](orchestrator/src/services/suno_bakein.py#L288-L381)). So `overflow_strategy` only handles residual mismatch (sub-second).

In short mode today (`video_full`): video plays out, audio pads with silence if needed. Cinematic feel.
In normal mode today (`trim`): video gets clipped if video > audio. Audio is master.

**Sir Robert's stated preference: song fits video, audio adapts to video length.** That maps to **`video_full`** — video is master, audio extends with silence.

Of the brief's three options:

| Option | Recommendation | Rationale |
|---|---|---|
| Always trim audio to actual video duration (i.e. video_full overflow) | **Recommended** | Matches Sir Robert's preference. The bake-in already pre-trims audio; `video_full` handles the residual sub-second mismatch by padding audio rather than clipping video. |
| Always pad video / silence-extend if audio is longer | Not recommended | Doesn't match the stated preference. |
| Adaptive | Overkill | Post-trim, mismatch is always sub-second; `video_full` is gentle in both directions. |

**Phase 1 change:** replace the conditional at [suno_bakein.py:431](orchestrator/src/services/suno_bakein.py#L431) with `"overflow_strategy": "video_full"`. Could also drop the override entirely since `video_full` is already the global default at [settings.py:78](orchestrator/src/settings.py#L78) and at [assembly_engine/models.py:54](orchestrator/cloud_engines/assembly_engine/models.py#L54).

### 3.6 Will `clip_duration=12` or `clip_duration=25` produce noticeably worse output?

| Stage | At 12s | At 25s | Severity | Fixable in Phase 1? |
|---|---|---|---|---|
| Storyboard duration allocation | Fine — normalizer accepts any target | Same | None | n/a |
| Storyboard scene-count auto | Needs new banding (§4) | Needs new banding (§4) | Required | Yes |
| Concept lyric density | Mild — wrong band selected | Mild — wrong band selected | Cosmetic | Yes (cheap) |
| Concept reliable mode | Already banded by `<=15` and `>=60` | Same | None | n/a |
| Suno output | Suno picks own length, trim-back works | Same | None | n/a |
| Video adapter (RunPod / self-hosted) | Already accepts any int 3-10 per scene | Same | None | n/a |
| Video adapter (fal) | Snaps to enum — loses 12s precision | Snaps to enum — loses 25s precision | Critical if fal still active | Resolve via §1 |
| Suno bake-in trim | Probes actual video, trims audio | Same | None | n/a |
| Assembly | Reads clip files, builds timing | Same | None | n/a |

**Bottom line:** non-standard targets work cleanly *if* §1 (fal removal/decision), §4 (auto_scene_count), §3.5 (unified overflow), and the cheap lyric-density generalization ship together. No deep blockers found.

---

## 4. `auto_scene_count` function and clamped range

### 4.1 Recommended range

**Recommend `clip_duration ∈ [6, 30]` (inclusive).** Rationale:

- **Lower bound 6.** Below 6s, only 1 scene fits cleanly (per-scene min 3 forces 3+3=6 as the only 2-scene composition, which is uncomfortably tight at the per-scene minimum). Single-scene at <6s has no "song hits" UX rationale and Sir Robert flagged the brand concern that very-short videos feel like users got less for their credit. 6s is the natural floor.
- **Upper bound 30.** With 3 scenes max (storyboard prompt + auto count both hard-cap at 3) and per-scene max 10, 3×10 = 30 is the structural ceiling. Above 30 either needs >3 scenes (not currently supported by the storyboard prompt's duration block — see §6) or per-scene >10s (motion overload risk; LTX 2.3 sweet spot is 6-10s/scene).
- **Currently validated** values are 15 and 20. Mid-range probes (12, 16, 18, 25) work cleanly per §3 — no Suno or concept blocker found.

If Sir Robert prefers narrower-and-safer initially, `[10, 18]` is also reasonable. But `[6, 30]` does not break anything per this audit. **My recommendation: `[6, 30]`**, with the understanding that the default stays at 15.

### 4.2 `auto_scene_count` function

```python
def auto_scene_count(clip_duration: int) -> int | str:
    """Resolve auto image count from the unified clip_duration setting.

    Returns an int (fixed scene count) or "auto" (storyboard LLM picks 2 or 3).

    Constraints:
        - Per-scene min: 3 seconds
        - Per-scene max: 10 seconds
        - Scene count: 1, 2, or 3 (storyboard prompt + auto cap)

    Boundaries:
        - 6s: only 1 scene fits cleanly
        - 7-9s: exactly 2 scenes (3+4..3+6, etc.)
        - 10-18s: LLM picks 2 or 3 — both compositions are clean
        - 19-30s: exactly 3 scenes (2-scene at 19s would need one >9s; at 20s
          would need 10+10 which over-relies on the per-scene max)
    """
    if not 6 <= clip_duration <= 30:
        raise ValueError(
            f"clip_duration {clip_duration} outside supported range [6, 30]"
        )
    if clip_duration <= 6:
        return 1
    if clip_duration <= 9:
        return 2
    if clip_duration <= 18:
        return "auto"
    return 3
```

### 4.3 Edge-case validation

- **`clip_duration=6`** → 1 scene of 6s. Single-scene is correct here. 2-scene at 6s requires 3+3 (per-scene at minimum), too tight.
- **`clip_duration=9`** → 2 scenes. Valid: 3+6, 4+5. Clean.
- **`clip_duration=10`** → "auto". Valid: 2-scene as 4+6, 3+7 etc.; 3-scene as 3+3+4. Both clean. Borderline — 10 also works as a single 10s clip (per-scene max). The storyboard prompt today says "choose 2 or 3"; a 1-scene return would be unusual. Accept the rare 1-scene return.
- **`clip_duration=12`** → "auto". 2-scene: 4+8, 5+7, 6+6. 3-scene: 3+4+5, 4+4+4. Both feel acceptable.
- **`clip_duration=15`** → "auto". Today's short-mode default. 2-scene: 5+10, 7+8; 3-scene: 5+5+5, 4+5+6. Production-validated.
- **`clip_duration=16`** → "auto". 2-scene: 6+10, 8+8; 3-scene: 5+5+6. Both clean.
- **`clip_duration=18`** → "auto". 2-scene: 8+10, 9+9; 3-scene: 6+6+6. Both clean.
- **`clip_duration=19`** → 3 scenes. 2-scene would be 9+10 (only one valid composition; tight). Force 3-scene.
- **`clip_duration=20`** → 3 scenes. Today's normal-mode default. 3-scene: 6+7+7, 6+6+8. Production-validated.
- **`clip_duration=25`** → 3 scenes. 3-scene: 7+9+9, 8+8+9. Clean.
- **`clip_duration=30`** → 3 scenes at the absolute max: 10+10+10 (the only composition). Visually motion-saturated. Acceptable as a rare extreme. Sir Robert may want to flag 30 as "supported but consult product before defaulting users here". Not a Phase 1 blocker.

The `19/20` boundary: the function snaps from "auto" to "exactly 3" at 19. At 19s only 9+10 is valid 2-scene (tight). At 20s a 2-scene would need 10+10 (over-relies on per-scene max). 3-scene from 19 onward is the right boundary.

### 4.4 Auxiliary: `_RECOMMENDED_RANGE` replacement

Today at [prompts.py:766-772](orchestrator/cloud_engines/image_engine/prompts.py#L766-L772). After unification, replace with a function that mirrors `auto_scene_count`:

```python
def _recommended_scene_range(clip_duration: int) -> str:
    n = auto_scene_count(clip_duration)
    return str(n) if isinstance(n, int) else "2-3"
```

The *prompt body* tells the LLM the recommended range; the *resolution function* tells the storyboard machinery the actual cap. Same shape.

---

## 5. Phase 2 auto-duration architecture readiness

Phase 2 wants `clip_duration: int | Literal["auto"]`. The Phase 1 architecture proposed above does **not** preclude Phase 2.

### 5.1 Settings model accepts `int | Literal["auto"]`

Today [image_engine/models.py:116](orchestrator/cloud_engines/image_engine/models.py#L116) types `clip_duration: int = Field(default=30)`. Pydantic v2 supports `Union[int, Literal["auto"]]` cleanly. Pattern already in use for `image_count` ([models.py:115-165](orchestrator/cloud_engines/image_engine/models.py#L115-L165) — `Union[str, int]` accepting "auto" or a number).

Phase 1 leaves `clip_duration: int` (with `ge=6, le=30`); Phase 2 widens to `Union[int, Literal["auto"]]` without breaking anything.

### 5.2 Pipeline can pass `clip_duration="auto"` through to storyboard

Storyboard already runs in stage 1 ([pipeline.py:33](orchestrator/src/pipeline.py#L33)). `build_system_prompt` accepts `settings.clip_duration: int` today; widening to accept "auto" is mechanical. The storyboard LLM in Phase 2 is told "if `clip_duration` is 'auto', pick a duration in [6, 30] based on creative direction and return it as `chosen_clip_duration` in your output JSON."

The image engine post-parse step ([storyboard.py:144-149](orchestrator/cloud_engines/image_engine/storyboard.py#L144-L149)) already runs post-parsing logic; adding a "resolve auto duration" step is mechanically the same as the existing "resolve frame_narrative" step.

### 5.3 Resolved value propagates downstream

Today [pipeline.py:980-983](orchestrator/src/pipeline.py#L980-L983) records resolved-from-auto values for `art_style` and `creative_direction` in lineage settings. Same pattern works for `clip_duration_setting="auto"`, `clip_duration_resolved=15` (LLM's pick). The resolved value gets written back to the manifest's image-stage settings, and concept/song/video stages read it from there.

### 5.4 `auto_scene_count` and normalizer work after the LLM picks

Once the LLM picks an integer `clip_duration`, `auto_scene_count(value)` resolves to a count, the normalizer takes that integer as `target=`, and downstream stages read the resolved value. No early-binding in the proposed Phase 1 architecture. ✅

### 5.5 Surfaced conflicts

**None blocking.** One **risk to flag**: today `clip_duration` is read by `pipeline.py:950` from `concept_settings.duration` and back-propagated. If Phase 1 keeps that direction (concept → images), Phase 2 would have to invert it. **Recommend Phase 1 inverts the direction now** (images.clip_duration is canonical; concept derives), so Phase 2 just adds the "auto" literal handler.

---

## 6. Out-of-scope observations (flagged, not investigated)

- **Duplicate orchestrator trees.** Multiple stale copies of orchestrator code at: `engines/video-engine/`, `phase2b_push/`, `speak-scroll-fix-main/`, `tmp/lyric-levels-main-review/`, `tmp/phase2a_push_main/`, `tmp/phase2a_restore_main/`, `tmp/phase2a_revert_main/`. Each contains its own copy of `cloud_engines/video_engine/{config,router,cost}.py`. Risk: future changes drift. Worth deleting in a separate cleanup if confirmed dead.
- **Frontend LTX duration slider min/max=6-10.** [fieldConfigs.ts:131](orchestrator/frontend/src/components/settings/fieldConfigs.ts#L131) — this is the *per-scene* duration (gets overridden by storyboard allocation anyway). Cosmetic, but worth widening to `min: 3` or removing the field altogether.
- **No UI field for `clip_duration` itself.** The unified setting is currently surfaced indirectly via `concept.duration`. After Phase 1, the user should see one slider for `clip_duration`. The `IMAGE_FIELDS` section is the logical home (since `images` owns the canonical setting).
- **`concept.duration=60` option** ([concept_engine/models.py:94](orchestrator/cloud_engines/concept_engine/models.py#L94)). The current code allows 60s lyrics but nothing in the unified pipeline targets 60s. Either surface it as a lyric-only mode or drop it. **Sir Robert decision needed.**
- **`SongSettings` allows only 15/20/30, frontend song dropdown includes 60.** Pre-existing inconsistency.
- **`pipeline.py:41-45` direction weights** include literal numbers like 30, 25, 20, 15, 5 that look like durations but are *creative-direction weights*. Easy to confuse during a search.
- **Storyboard prompt `_duration_allocation_block` has no upper cap branch.** [prompts.py:1637](orchestrator/cloud_engines/image_engine/prompts.py#L1637) — `if scene_count <= 1: return ""`. Otherwise produces text. If a user manually sets `image_count=8` (validator allows 1-8), the prompt still asks for per-scene durations summing to total — would force per-scene <3.75s, breaching the per-scene min. Auto-picker only allows up to 3, but manual override allows up to 8. Worth narrowing manual UI to 1-3 (flagged in §2.4).
- **`concept_engine/templates.py` Templates A-E** ([templates.py:483-650](orchestrator/cloud_engines/concept_engine/templates.py#L483-L650)) describe Suno verse-chorus-outro with hardcoded "20-25s", "30-35s" comments. Those reference Suno's *output* duration (which we don't control) and are independent of `clip_duration`. Confusing naming, but functional.
- **Pydantic `extra` behavior.** No `model_config = ConfigDict(extra=...)` in any settings model. Pydantic v2 default is `ignore`, so existing snapshots with `short_mode` get silently dropped on load. The brief's assumption holds.
- **`_LTX_FAST_DURATIONS` is duplicated** in [pipeline.py:625-626](orchestrator/src/pipeline.py#L625-L626) AND in [adapters/ltx_shared.py:64-66](orchestrator/cloud_engines/video_engine/adapters/ltx_shared.py#L64-L66). The pipeline copy was added when short-mode generalized away from adapter-only enums. Both delete in Phase 1.
- **`engines/video-engine/src/router.py`** lacks the `runpod` branch the orchestrator copy has. The two diverge silently. Either dead, or running somewhere that loses the runpod path. Flag for ops audit.
- **Suno_v5_5 model name** is hardcoded in many places ([suno.py:156, 217, 234, 263, 345, 481, 540, 640](orchestrator/src/suno.py)). Not duration-related but worth one constant.
- **Direct `MUSIC_MODE=suno` bypasses typed `SongPayload` validation** by creating a placeholder before model validation. Useful for arbitrary duration, but means song-model bounds may be dead or only relevant in non-direct paths.

---

## End of report

No code modified. Only file written: this report at the repo root.

When Phase 1 starts, this report's §2 is the deletion checklist, §3.5 is the unified overflow policy decision, §4 is the function/range definitions, and §5 is the architectural-shape constraint for Phase 2. §1's fal-deletion question needs Sir Robert's confirmation of `VIDEO_BACKEND` deployment value before Phase 1 commits to deleting `adapters/ltx.py`.
