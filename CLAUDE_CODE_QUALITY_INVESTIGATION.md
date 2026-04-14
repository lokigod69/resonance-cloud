# Code Quality Investigation Report

## Summary Statistics
- **Total findings: 98**
- **Critical: 5 | High: 30 | Medium: 38 | Low: 25**
- **Files examined: 58 source files** (listed below)

### Orchestrator (15 files)
- `orchestrator/main.py` (17 lines)
- `orchestrator/job_runner.py` (1,873 lines)
- `orchestrator/src/__init__.py` (1 line)
- `orchestrator/src/app.py` (1,712 lines)
- `orchestrator/src/pipeline.py` (976 lines)
- `orchestrator/src/models.py` (79 lines)
- `orchestrator/src/dispatcher.py` (128 lines)
- `orchestrator/src/settings.py` (177 lines)
- `orchestrator/src/manifest.py` (151 lines)
- `orchestrator/src/workspace.py` (102 lines)
- `orchestrator/src/slugify.py` (93 lines)
- `orchestrator/src/suno.py` (392 lines)
- `orchestrator/src/csv_import.py` (224 lines)
- `orchestrator/src/voices.py` (72 lines)
- `orchestrator/src/presets.py` (98 lines)

### Concept Engine (9 files)
- `engines/concept-engine/src/__init__.py`
- `engines/concept-engine/src/engine.py`
- `engines/concept-engine/src/models.py`
- `engines/concept-engine/src/llm_client.py`
- `engines/concept-engine/src/article.py`
- `engines/concept-engine/src/caption.py`
- `engines/concept-engine/src/lyrics.py`
- `engines/concept-engine/src/syllables.py`
- `engines/concept-engine/src/templates.py`

### Song Engine (8 files)
- `engines/song-engine/src/__init__.py`
- `engines/song-engine/src/engine.py`
- `engines/song-engine/src/models.py`
- `engines/song-engine/src/acestep_base.py`
- `engines/song-engine/src/acestep_gradio.py`
- `engines/song-engine/src/acestep_http.py`
- `engines/song-engine/src/language.py`
- `engines/song-engine/src/params.py`

### Image Engine (9 files)
- `engines/image-engine/src/__init__.py`
- `engines/image-engine/src/engine.py`
- `engines/image-engine/src/models.py`
- `engines/image-engine/src/config.py`
- `engines/image-engine/src/prompt_compiler.py`
- `engines/image-engine/src/prompts.py` (1,641 lines)
- `engines/image-engine/src/renderer.py` (832 lines)
- `engines/image-engine/src/storyboard.py`
- `engines/image-engine/src/wan_provider.py`

### Video Engine (8 files)
- `engines/video-engine/src/__init__.py`
- `engines/video-engine/src/engine.py`
- `engines/video-engine/src/models.py`
- `engines/video-engine/src/config.py`
- `engines/video-engine/src/cost.py`
- `engines/video-engine/src/download.py`
- `engines/video-engine/src/router.py`
- `engines/video-engine/src/upload.py`

### Assembly Engine (11 files)
- `engines/assembly-engine/src/__init__.py`
- `engines/assembly-engine/src/engine.py`
- `engines/assembly-engine/src/models.py`
- `engines/assembly-engine/src/config.py`
- `engines/assembly-engine/src/audio.py`
- `engines/assembly-engine/src/ffmpeg_builder.py`
- `engines/assembly-engine/src/gaps.py`
- `engines/assembly-engine/src/timing.py`
- `engines/assembly-engine/src/video.py`
- `engines/assembly-engine/src/word_card.py`
- `engines/assembly-engine/ui/app.py`

### Bookend Engine (10 files)
- `engines/bookend-engine/src/__init__.py`
- `engines/bookend-engine/src/engine.py`
- `engines/bookend-engine/src/models.py`
- `engines/bookend-engine/src/config.py`
- `engines/bookend-engine/src/color.py`
- `engines/bookend-engine/src/ffmpeg_builder.py`
- `engines/bookend-engine/src/timing.py`
- `engines/bookend-engine/src/tts.py`
- `engines/bookend-engine/src/word_card.py`
- `engines/bookend-engine/ui/app.py`

## Files NOT Examined (and why)
- All `tests/` directories — out of scope (test code, not production)
- All `.venv/` directories — third-party packages
- `orchestrator/frontend/` — explicitly out of scope per instructions
- `migration/` — planning material, not code
- `engines/bookend-engine/scripts/download_fonts.py` — utility script, not engine code
- `engines/image-engine/test_korean.py`, `test_live.py` — test files at engine root

---

## Category A: Duplicate Logic

### A1. Stage-to-Directory Mapping Defined Four Times
- **Location:** `pipeline.py:177` (`STAGE_DIR_MAP`), `job_runner.py:391` (`_STAGE_DIRS`), `job_runner.py:251` (`folder_map` in `_validate_artifacts`), `app.py:1482` (inline `stage_map` in `_compute_stage_statuses`)
- **Severity:** Medium
- **Confidence:** Certain
- **Description:** The mapping from stage names (`concept`, `song`, `images`, etc.) to directory names (`concept`, `songs`, `images`, etc.) is defined as a separate dict/inline mapping in four different locations. All four contain the same values. Any change to directory naming requires updating all four.
- **Recommended action:** Create a single canonical `STAGE_DIR_MAP` in a shared constants module (e.g., `stage_config.py`) and import it everywhere.

### A2. OpenRouter LLM Client Duplicated Three Times
- **Location:** `concept-engine/src/llm_client.py` (full client class, ~100 lines), `image-engine/src/storyboard.py:141-207` (`_call_openrouter` function), `job_runner.py:118-133` (`run_enrichment` inline HTTP call), `pipeline.py:127-142` (`_resolve_creative_direction` inline HTTP call), `app.py:207-224` (`suggest_words` inline LLM call)
- **Severity:** High
- **Confidence:** Certain
- **Description:** Five separate implementations of the same OpenRouter HTTP call pattern: construct payload with model/messages/max_tokens, POST to `https://openrouter.ai/api/v1/chat/completions`, handle ConnectError/TimeoutException, check status code, extract `choices[0].message.content`. The concept-engine has a proper `OpenRouterClient` class, but neither the image-engine, orchestrator pipeline, job runner, nor app.py use it — each rolls its own.
- **Recommended action:** Extract a shared `openrouter_client.py` utility. Engines and orchestrator should all use the same client, parameterized by model/timeout/API key.

### A3. OpenRouter Endpoint URL Hardcoded in Multiple Files
- **Location:** `concept-engine/src/llm_client.py:16`, `image-engine/src/config.py:29`
- **Severity:** Medium
- **Confidence:** Certain
- **Description:** `"https://openrouter.ai/api/v1/chat/completions"` is hardcoded separately in two engine files. The orchestrator files that make OpenRouter calls also hardcode the URL inline.
- **Recommended action:** Centralize as a shared constant or make configurable via env var.

### A4. Retry Loop Pattern Duplicated Five Times in job_runner.py
- **Location:** `job_runner.py:990-999`, `1028-1038`, `1174-1196`, `1328-1351`, `1403-1426`
- **Severity:** High
- **Confidence:** Certain
- **Description:** All five follow the identical pattern: `for attempt in range(MAX_RETRIES + 1): try: ... break except: ... if attempt < MAX_RETRIES: get_fallback_overrides(...)`. The only differences are the stage name and payload function called.
- **Recommended action:** Extract a generic `retry_stage()` async helper that takes a stage name, payload builder, and max retries.

### A5. A/B Assembly+Bookend Orchestration Duplicated
- **Location:** `job_runner.py:972-1044` (inside `bake_suno_into_word`) and `job_runner.py:1297-1434` (inside `process_word`)
- **Severity:** High
- **Confidence:** Certain
- **Description:** The Pass 1 (assemblies for all versions) + Pass 2 (bookends for all versions) pattern with retry logic appears twice with nearly identical structure. Both instances iterate version labels, build payloads, call engines, and handle failures the same way.
- **Recommended action:** Extract a shared `run_ab_pipeline()` function that handles the two-pass assembly+bookend flow.

### A6. Supabase Client Creation Pattern Duplicated
- **Location:** `suno.py:36` (`_write_to_supabase` creates client), `suno.py:210-213` (`generate_song` creates another inline), `job_runner.py:71` (module-level instantiation)
- **Severity:** High
- **Confidence:** Certain
- **Description:** Each location reads the same env vars (`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`), performs the same empty-check, and creates a `Client`. No shared factory function exists.
- **Recommended action:** Create a shared `get_supabase_client()` factory, ideally with connection reuse.

### A7. Error Model Pattern Duplicated Across All Engines
- **Location:** `concept-engine/src/models.py` (`ConceptError`), `song-engine/src/models.py` (`SongError`), `image-engine/src/models.py` (`ImageError`), `video-engine/src/models.py` (`VideoError`), `assembly-engine/src/models.py` (`AssemblyError`)
- **Severity:** Medium
- **Confidence:** Certain
- **Description:** All engines define structurally identical error models with fields `message: str`, `retryable: bool`, `type: str` (except `ImageError` which lacks `type`, and bookend which uses a plain string — see C8 and C9). These could share a base class.
- **Recommended action:** If a shared package is introduced, define a single `EngineError` base. Otherwise, accept as intentional engine isolation.

### A8. `_write_generation_meta()` Pattern Duplicated Across All Engines
- **Location:** `concept-engine/src/engine.py`, `song-engine/src/engine.py`, `image-engine/src/engine.py`, `video-engine/src/engine.py`, `assembly-engine/src/engine.py`
- **Severity:** Medium
- **Confidence:** High
- **Description:** Every engine has a `_write_generation_meta()` function that constructs a metadata model/dict, serializes to JSON, writes to `output_dir / "generation-meta.json"`, and catches write failures. The pattern is identical; only the metadata fields differ.
- **Recommended action:** Consider a shared utility for the write-and-catch-errors portion, leaving metadata construction to each engine.

### A9. `GenerationMetaContext` Duplicated Across Engines
- **Location:** `concept-engine/src/models.py`, `song-engine/src/models.py` (`GenerationMetaContext`), `assembly-engine/src/models.py` (`GenerationMetaContext`), `video-engine/src/models.py` (similar structure)
- **Severity:** Medium
- **Confidence:** Certain
- **Description:** All engines define a `GenerationMetaContext` model with fields `word`, `language`, `translation`. Identical structure, different class definitions.
- **Recommended action:** Same as A7 — share if a common package is introduced.

### A10. `word_card.py` Massively Duplicated Between Assembly and Bookend
- **Location:** `assembly-engine/src/word_card.py` and `bookend-engine/src/word_card.py`
- **Severity:** High
- **Confidence:** Certain
- **Description:** The following are identical or near-identical between the two engines:
  - `_CJK_FONT_NAMES` tuple (assembly:38-44, bookend:18-24)
  - `_CJK_FILE_PATTERNS` tuple (assembly:48-57, bookend:28-37)
  - `_CJK_UNICODE_RANGES` tuple (assembly:60-68, bookend:40-48)
  - `_text_has_cjk()` function (assembly:71-80, bookend:51-60)
  - `_find_cjk_font_path()` function (assembly:83-121, bookend:63-105)
  - `_font_can_render()` function (assembly:396-429, bookend:392-425)
  - `_hex_to_rgb()` function (assembly:495-502, bookend:428-435)
  - Dynamic font scaling logic (assembly:345-361, bookend:189-207)

  This is the single largest duplication in the codebase — approximately 200+ lines of identical code.
- **Recommended action:** Extract shared word card utilities (CJK detection, font discovery, font rendering helpers) into a shared module. Both engines import from it.

### A11. Language Safety Net Logic Duplicated
- **Location:** `concept-engine/src/caption.py:354-382` (`_ensure_language`) and `song-engine/src/language.py:111-154` (`ensure_language_in_caption`)
- **Severity:** High
- **Confidence:** Certain
- **Description:** Both functions check whether a caption contains a language name and append `", {language} vocal"` as a safety net if missing. Nearly identical logic.
- **Recommended action:** Extract into a shared utility or have one engine import from the other.

### A12. `posix_path()` Duplicated Between Video and Assembly Engines
- **Location:** `video-engine/src/config.py:61-63` and `assembly-engine/src/ffmpeg_builder.py:221-223`
- **Severity:** Medium
- **Confidence:** Certain
- **Description:** Both define `posix_path(p) -> str` that converts Windows backslashes to forward slashes for ffmpeg compatibility.
- **Recommended action:** Extract to a shared utility if a common package is introduced.

### A13. Timestamp Utilities — Four Different Approaches
- **Location:** `manifest.py:13` (`now_iso()` → `'%Y-%m-%dT%H:%M:%SZ'`), `workspace.py:61` (inline → `'%Y%m%dT%H%M%S'`), `voices.py:41` (`.isoformat()`), `presets.py:82` (`.isoformat()`)
- **Severity:** Medium
- **Confidence:** Certain
- **Description:** Four different timestamp formatting approaches across four files, producing three different output formats. No canonical utility is used.
- **Recommended action:** Use `manifest.now_iso()` as the canonical timestamp function everywhere.

### A14. Settings Merge Pattern Duplicated
- **Location:** `settings.py:134` (`{**stage_defaults, **data.get(stage, {})}`) and `presets.py:64` (`{**stage_defaults, **raw_settings.get(stage, {})}`)
- **Severity:** Medium
- **Confidence:** Certain
- **Description:** Identical dict-merge logic for overlaying user settings on stage defaults.
- **Recommended action:** Extract into `settings.py` as a public utility function.

### A15. `_compute_stage_statuses` and `_compute_stages_detail` Overlap
- **Location:** `app.py:1480` and `app.py:1521`
- **Severity:** Medium
- **Confidence:** High
- **Description:** Both functions iterate over the same stages with similar logic. `_compute_stage_statuses` builds a summary; `_compute_stages_detail` builds a detailed view. The stage enumeration and status resolution logic is repeated. `_compute_stages_detail` is 110 lines.
- **Recommended action:** Refactor to compute the detailed view once and derive the summary from it.

### A16. JSON CRUD Pattern Duplicated (voices.py and presets.py)
- **Location:** `voices.py` (full file) and `presets.py` (full file)
- **Severity:** Low
- **Confidence:** High
- **Description:** Both files implement the same load-JSON / modify / save-JSON pattern for a file-backed registry. Could share a generic JSON-file-backed registry utility.
- **Recommended action:** Low priority — consider a shared `JsonRegistry` class if more JSON-backed stores are added.

---

## Category B: Oversized Functions

### B1. `job_runner.py:process_word()` — 428 lines
- **Location:** `job_runner.py:1070-1498`
- **Severity:** Critical
- **Confidence:** Certain
- **Description:** The single largest function in the entire codebase. Handles: slug resolution, manifest creation, smart retry detection, stage execution loop with retry, storyboard mnemonic extraction, Suno bake-in invocation, A/B assembly/bookend pipeline (Pass 1 + Pass 2), metadata collection, Supabase upload, and status updates. At least 8 distinct responsibilities.
- **Recommended action:** Decompose into: `_resolve_slug()`, `_run_stages_with_retry()`, `_run_suno_bakein()`, `_run_ab_pipeline()`, `_collect_and_upload()`, `_update_supabase_status()`.

### B2. `job_runner.py:bake_suno_into_word()` — 340 lines
- **Location:** `job_runner.py:723-1065`
- **Severity:** Critical
- **Confidence:** Certain
- **Description:** Handles: Suno generation, download, validation, trimming (with 3 trim paths: fade_out/clean_cut and multiple edge cases), assembly, bookend, settings override/restore. Contains a nested function `_fade_params`.
- **Recommended action:** Extract into its own module `suno_bakein.py` with sub-functions for each phase.

### B3. `bookend-engine/src/engine.py:wrap()` — 278 lines
- **Location:** `bookend-engine/src/engine.py:19-296`
- **Severity:** High
- **Confidence:** Certain
- **Description:** The entire bookend engine is one massive function. Contains: word card rendering, TTS generation, intro/outro assembly, bookend concatenation, metadata writing. No decomposition whatsoever.
- **Recommended action:** Split into `_render_word_cards()`, `_generate_tts()`, `_build_intro_outro()`, `_concatenate_bookend()`.

### B4. `assembly-engine/src/engine.py:assemble()` — 252 lines
- **Location:** `assembly-engine/src/engine.py:48-299`
- **Severity:** High
- **Confidence:** Certain
- **Description:** Handles: input validation, audio analysis, timing computation, gap filling, video scaling, FFmpeg concat, encoding, metadata writing. Deeply nested try/except/finally.
- **Recommended action:** Extract phases into: `_validate_inputs()`, `_compute_timing()`, `_build_segments()`, `_encode_final()`.

### B5. `pipeline.py:run_stage()` — 223 lines
- **Location:** `pipeline.py:753-976`
- **Severity:** High
- **Confidence:** Certain
- **Description:** Single function with a giant `if/elif` chain for 6 stages. Each branch is 20-40 lines handling: manifest reading, settings resolution, version creation, payload building, engine dispatch, lineage recording, and selection update.
- **Recommended action:** Extract per-stage handler functions (e.g., `_run_concept_stage()`, `_run_images_stage()`, etc.) and dispatch via a dict.

### B6. `concept-engine/src/engine.py:generate_concept()` — 201 lines
- **Location:** `concept-engine/src/engine.py:46-247`
- **Severity:** Medium
- **Confidence:** Certain
- **Description:** Long but mostly sequential steps in a try/except/finally block. The logic is linear and well-commented with step numbers. Less urgent than B1-B5.
- **Recommended action:** Could split pre-generation, LLM calls, and post-processing into separate functions.

### B7. `assembly-engine/src/engine.py:trim_video()` — 191 lines
- **Location:** `assembly-engine/src/engine.py:302-492`
- **Severity:** High
- **Confidence:** Certain
- **Description:** FFmpeg trim operation that also handles metadata and validation inline.
- **Recommended action:** Extract validation and metadata writing into separate functions.

### B8. `image-engine/src/renderer.py:render_scene()` — 184 lines
- **Location:** `image-engine/src/renderer.py:452-636`
- **Severity:** High
- **Confidence:** Certain
- **Description:** Contains Wan delegation, Gemini prompt assembly, safety retry, fallback image generation, and result construction. The longest function in any engine.
- **Recommended action:** Split into `_render_via_wan()`, `_render_via_gemini()`, and `_handle_safety_retry()`.

### B9. `suno.py:generate_song()` — 173 lines
- **Location:** `suno.py:144-317`
- **Severity:** High
- **Confidence:** Certain
- **Description:** Handles API calls, polling, copyright retry logic, Supabase writes, and error handling all in one monolith.
- **Recommended action:** Decompose into: `_submit_task()`, `_poll_task()`, `_handle_copyright_retry()`, `_extract_audio_url()`.

### B10. `pipeline.py:build_video_payloads()` — 168 lines
- **Location:** `pipeline.py:302-470`
- **Severity:** High
- **Confidence:** Certain
- **Description:** Contains two major code paths (text-to-video vs image-to-video) with significant duplication between them. Both build payload dicts with nearly identical structure and resolve camera motion the same way.
- **Recommended action:** Extract shared payload-building logic and use a flag for the text-to-video vs image-to-video differences.

### B11. `concept-engine/src/templates.py` — Multiple 100+ line template functions
- **Location:** `templates.py:135-219` (`generate_minimal`, 84 lines), `222-351` (`generate_standard`, 129 lines), `354-474` (`generate_reliable`, 120 lines), `507-606` (`_dramatic_no_chop`, 99 lines), `693-839` (`generate_phrase_suno_lyrics`, 146 lines)
- **Severity:** Medium
- **Confidence:** Certain
- **Description:** Template functions with many branches for `word_length_class` × `duration` × `caption_style` combinations. Significant internal duplication across templates (same `ap = f"{article} " if article else ""` pattern, same production flag, same deeply nested if/elif chains).
- **Recommended action:** Extract common template logic into helper functions. Consider a data-driven approach mapping (word_length_class, duration, caption_style) → template parameters.

### B12. `image-engine/src/storyboard.py:_sanitize_storyboard()` — 125 lines
- **Location:** `storyboard.py:238-363`
- **Severity:** Medium
- **Confidence:** Certain
- **Description:** Complex JSON cleanup with many field-level checks.
- **Recommended action:** Extract field-level sanitizers into separate functions.

### B13. `csv_import.py:import_csv()` — 118 lines
- **Location:** `csv_import.py:54-178`
- **Severity:** Medium
- **Confidence:** Certain
- **Description:** Handles CSV parsing, validation, slug generation, folder creation, manifest creation, and workspace meta update in one function.
- **Recommended action:** Split into: `_validate_csv()`, `_import_single_word()`, `_finalize_import()`.

### B14. `bookend-engine/src/word_card.py:render_word_card_image()` — 118 lines
- **Location:** `bookend-engine/src/word_card.py:143-260`
- **Severity:** Medium
- **Confidence:** Certain
- **Description:** Font loading, text layout, rendering, and file output in one function.
- **Recommended action:** Extract font selection and text layout into helpers.

### B15. `app.py:_compute_stages_detail()` — 110 lines
- **Location:** `app.py:1521-1631`
- **Severity:** Medium
- **Confidence:** Certain
- **Description:** Repeats the same pattern 6 times (concept/song/images/video/final/bookend), each doing glob + sort + build dict.
- **Recommended action:** Extract per-stage detail computation into a loop over a stage definition list.

### B16. `bookend-engine/src/tts.py:generate_pronunciation()` — 106 lines
- **Location:** `tts.py:26-131`
- **Severity:** Medium
- **Confidence:** Certain
- **Description:** API call, retry logic, file writing in one function.
- **Recommended action:** Extract retry logic into a helper.

### B17. `assembly-engine/ui/app.py:index()` — ~630 lines of inline HTML
- **Location:** `assembly-engine/ui/app.py:170-800`
- **Severity:** High
- **Confidence:** Certain
- **Description:** A massive HTML string literal is embedded directly in a Python function. This makes the code unreadable, uneditable by HTML tools, and bloats the Python file.
- **Recommended action:** Move HTML to a template file (Jinja2 or static HTML served separately).

### B18. `pipeline.py:_resolve_scene_durations()` — 98 lines
- **Location:** `pipeline.py:473-570`
- **Severity:** Medium
- **Confidence:** High
- **Description:** Complex algorithm with multiple code paths (LTX snap vs legacy clamp). Could be split into sub-functions.
- **Recommended action:** Extract LTX snap and legacy clamp into separate helper functions.

---

## Category C: Inconsistent Error Handling

### C1. No HTTP 5xx Handling in dispatcher.py
- **Location:** `dispatcher.py:92`
- **Severity:** High
- **Confidence:** High
- **Description:** After checking for HTTP 422, `call_engine()` falls through to `return response.json()`. A 500 response with an HTML error page will cause `json.JSONDecodeError`. The contract states "engines return 200 for both success and failure" but defensive coding should handle 5xx.
- **Recommended action:** Add explicit handling for non-200 responses before attempting JSON parsing.

### C2. `check_engine_health()` Silently Swallows All Exceptions
- **Location:** `dispatcher.py:111-112`
- **Severity:** Medium
- **Confidence:** Certain
- **Description:** `except Exception: pass` inside the health check loop. Any exception (including programming errors like `NameError`) is silently ignored. No logging.
- **Recommended action:** Log the exception at debug/warning level before continuing.

### C3. Bare `except Exception` with Silent Pass in csv_import.py (2 instances)
- **Location:** `csv_import.py:194` and `csv_import.py:211`
- **Severity:** Medium
- **Confidence:** Certain
- **Description:** Both silently swallow errors — one when parsing workspace meta, one when reading manifests to count languages. Corrupted files are silently ignored.
- **Recommended action:** Log a warning when catching these exceptions.

### C4. No JSON Error Handling Across 6+ Files
- **Location:** `settings.py:129`, `manifest.py:25-26`, `workspace.py:47`, `voices.py:20`, `presets.py:39,58`, `suno.py:63-66`
- **Severity:** Medium
- **Confidence:** Certain
- **Description:** All use `json.load(f)` without `JSONDecodeError` handling. A corrupted JSON file crashes the operation with an unhelpful traceback.
- **Recommended action:** Create a shared `safe_json_load()` wrapper or add targeted exception handling at each call site.

### C5. Module-Level Supabase Client Crashes on Import
- **Location:** `job_runner.py:71`
- **Severity:** Medium
- **Confidence:** Certain
- **Description:** `sb: Client = get_supabase()` is evaluated at import time. If env vars are missing, the process calls `sys.exit(1)`. This makes the module un-importable for testing or any context without Supabase credentials.
- **Recommended action:** Use lazy initialization (create client on first use) or dependency injection.

### C6. Manifest Read-Modify-Write Without Locking
- **Location:** `manifest.py:87-129` (`update_selection`, `update_settings`, `add_lineage`, `remove_version`)
- **Severity:** Medium
- **Confidence:** High
- **Description:** All four functions call `read_manifest() → modify → write_manifest()` without any file locking. Under concurrent access (e.g., autopilot running multiple words), this is a race condition that can lose writes.
- **Recommended action:** Add file locking (e.g., `fcntl.flock` or a lockfile) around the read-modify-write cycle, or serialize all manifest writes through a single async task.

### C7. `create_manifest` Mutates Caller's Dictionary
- **Location:** `manifest.py:53`
- **Severity:** Medium
- **Confidence:** Certain
- **Description:** `enrichment_data.pop('tags', '')` modifies the caller's dictionary in-place. This is a hidden side effect — the caller may not expect their dict to change.
- **Recommended action:** Copy the dict before popping: `enrichment_data = dict(enrichment_data)`.

### C8. Bookend Engine Error Is a Plain String, Not Structured
- **Location:** `bookend-engine/src/models.py:50` (`BookendResult.error` is `Optional[str]`), `bookend-engine/src/engine.py:283`
- **Severity:** High
- **Confidence:** Certain
- **Description:** Unlike all other engines which use structured error models with `message`, `retryable`, `type` fields, bookend's error is a plain string. This loses retryability and error type information, making the orchestrator unable to make smart retry decisions for bookend failures.
- **Recommended action:** Introduce a `BookendError` Pydantic model consistent with other engines.

### C9. Bookend Engine Meta Write Has No Try/Except Guard
- **Location:** `bookend-engine/src/engine.py:294-296`
- **Severity:** High
- **Confidence:** Certain
- **Description:** The `generation-meta.json` write in the `finally` block has no error handling. If writing fails (disk full, permissions), the exception propagates and masks the original error. All other engines wrap this in try/except.
- **Recommended action:** Add try/except around the meta write, logging any failure.

### C10. Bookend Engine Has No Pydantic Model for Generation Metadata
- **Location:** `bookend-engine/src/engine.py:28-51`
- **Severity:** High
- **Confidence:** Certain
- **Description:** Bookend constructs its `generation-meta.json` as a raw dict, while video-engine, assembly-engine, concept-engine, and song-engine all use typed Pydantic models. This means no validation of the metadata structure and potential field drift.
- **Recommended action:** Introduce a `BookendGenerationMeta` Pydantic model.

### C11. Bookend Engine Single Broad `except Exception` With No Differentiation
- **Location:** `bookend-engine/src/engine.py:281`
- **Severity:** High
- **Confidence:** Certain
- **Description:** The entire `wrap()` function has one catch-all that converts every exception to a string. No differentiation between validation errors, connection errors, or runtime errors. No `retryable` flag set.
- **Recommended action:** Add targeted exception handling for known failure modes.

### C12. `ImageError` Missing `type` Field
- **Location:** `image-engine/src/models.py:440`
- **Severity:** Medium
- **Confidence:** Certain
- **Description:** Concept-engine and song-engine error models have `type: str = "unknown_error"`. Image-engine's `ImageError` only has `message` and `retryable` — no error type classification.
- **Recommended action:** Add `type: str = "unknown_error"` to `ImageError` for consistency.

### C13. Bookend UI Returns HTTP 200 for All Errors
- **Location:** `bookend-engine/ui/app.py:47-55`
- **Severity:** Medium
- **Confidence:** Certain
- **Description:** Even unexpected errors return HTTP 200 with a JSON error body. The health endpoint also always returns 200 even when `healthy=False`. This masks failures from HTTP-level monitoring.
- **Recommended action:** Return HTTP 503 for unhealthy, HTTP 500 for unexpected errors.

### C14. `bookend-engine/src/tts.py` Uses `print()` Instead of Logger
- **Location:** `tts.py:62, 155, 169, 189`
- **Severity:** Medium
- **Confidence:** Certain
- **Description:** Multiple `print()` calls where `logger.info()`/`logger.warning()` should be used. All other engines use the logging module.
- **Recommended action:** Replace `print()` with proper logger calls.

### C15. `build_acestep_params()` Mutates Input Pydantic Model
- **Location:** `song-engine/src/params.py:34-37`
- **Severity:** High
- **Confidence:** Certain
- **Description:** Modifies the caller's `content` Pydantic model in-place (`content.language_code = ...`, `content.music_caption = ...`). The function is documented to return params but also silently modifies its input. This can cause subtle bugs if the caller reuses the content object.
- **Recommended action:** Create a copy of the content model before mutating: `content = content.model_copy()`.

### C16. `__del__` Used for Cleanup in Song Engine
- **Location:** `song-engine/src/acestep_http.py:246-250`, `acestep_gradio.py:334-335`
- **Severity:** Medium
- **Confidence:** High
- **Description:** Using `__del__` for cleanup is fragile — the order of destruction during interpreter shutdown is undefined and can cause `AttributeError` or `TypeError`. Should use context managers or explicit cleanup methods.
- **Recommended action:** Replace `__del__` with explicit `close()` methods or `contextlib.closing()`.

---

## Category D: Naming Issues

### D1. `resolve_lora_path()` Returns a Settings Dict, Not a Path
- **Location:** `pipeline.py:168-169`
- **Severity:** Low
- **Confidence:** High
- **Description:** The function name suggests it returns a path, but it returns a modified settings dict. It modifies settings in-place via `dict(settings)` then mutates and returns the dict.
- **Recommended action:** Rename to `resolve_lora_in_settings()` or similar.

### D2. `_err()` in wan_provider.py Is Overly Terse
- **Location:** `image-engine/src/wan_provider.py:333`
- **Severity:** Low
- **Confidence:** High
- **Description:** A helper function named `_err()` returns an error result dict. `_error_result()` would be clearer.
- **Recommended action:** Rename to `_error_result()`.

### D3. `render_scene_wan()` Returns Dict While `render_scene()` Returns Pydantic Model
- **Location:** `image-engine/src/wan_provider.py:44` (returns `dict`), `renderer.py:512-518` (manually unpacks into `RenderResult`)
- **Severity:** Medium
- **Confidence:** High
- **Description:** The Wan provider function returns a plain dict with keys `success`, `file_path`, `error_message`, `prompt_text`. These are then manually unpacked into a `RenderResult` Pydantic model in the renderer. The Wan provider should return `RenderResult` directly.
- **Recommended action:** Have `render_scene_wan()` return `RenderResult` directly.

### D4. Importing Private Function Across Modules
- **Location:** `concept-engine/src/engine.py:23` imports `_patch_vocal_gender` from `lyrics.py`
- **Severity:** Low
- **Confidence:** Certain
- **Description:** `_patch_vocal_gender` is prefixed with `_` (private convention) but is imported by another module. Either make it public or restructure the code.
- **Recommended action:** Remove the `_` prefix since it's part of the module's public API.

### D5. Bookend Engine Uses Absolute Imports Instead of Relative
- **Location:** `bookend-engine/src/engine.py:6-9`, `tts.py`, `color.py`, `ffmpeg_builder.py`
- **Severity:** Medium
- **Confidence:** Certain
- **Description:** Bookend uses `from src.config import ...` (absolute) while all other engines use `from .config import ...` (relative). This works when run from the engine root but breaks if the package is imported from elsewhere.
- **Recommended action:** Switch to relative imports for consistency and portability.

### D6. `overflow_fade` Variable Name Is Misleading
- **Location:** `assembly-engine/src/video.py:310-311`
- **Severity:** Low
- **Confidence:** Medium
- **Description:** `overflow_fade` sounds like a visual fade, but it actually means "should we fade audio for overflow." The variable controls audio behavior, not video.
- **Recommended action:** Rename to `overflow_audio_fade` for clarity.

### D7. Inconsistent Terminology: "word" vs "entry" vs "slug"
- **Location:** Throughout orchestrator — `word_slug`, `word_dir`, `word`, `entry`, `slug`, `AddWordRequest.word`
- **Severity:** Low
- **Confidence:** High
- **Description:** The codebase uses "word" to mean both the actual word/phrase being learned and the directory/entry that contains all its generated content. This conflation is manageable but occasionally confusing. The variable `word_slug_val` in `job_runner.py` suggests awareness of the ambiguity.
- **Recommended action:** Low priority — consider establishing a glossary in documentation (e.g., "word" = the text, "entry" = the workspace directory, "slug" = the URL-safe identifier).

---

## Category E: Missing or Misleading Documentation

### E1. `settings.py` Magic Numbers Undocumented
- **Location:** `settings.py:28-106`
- **Severity:** Low
- **Confidence:** Certain
- **Description:** `DEFAULT_SETTINGS` contains dozens of hardcoded values (`inference_steps: 50`, `guidance_scale: 8.0`, `lora_strength: 0.75`, `silence_threshold_db: -40.0`, `target_lufs: -14.0`, `word_card_font_size: 72`, `video_crf: 18`, `output_fps: 25`, `font_size: 144`, etc.) with no comments explaining why these values were chosen or what their units/ranges are.
- **Recommended action:** Add inline comments for non-obvious values, especially audio processing parameters.

### E2. `read_workspace_meta` Return Behavior Undocumented
- **Location:** `workspace.py:42`
- **Severity:** Low
- **Confidence:** Certain
- **Description:** Function returns `None` if the file doesn't exist, but this is not documented in a docstring.
- **Recommended action:** Add a one-line docstring: `"""Read workspace-meta.json, or None if missing."""`

### E3. Hardcoded LLM Model Identifiers
- **Location:** `settings.py:32` (`deepseek/deepseek-v3.2`), `settings.py:59` (`x-ai/grok-4.1-fast`), `job_runner.py:223-228` (same models as fallbacks)
- **Severity:** Medium
- **Confidence:** High
- **Description:** LLM model identifiers are hardcoded in default settings and as fallback choices. No documentation of why these specific models were chosen or what capabilities they need. If models are deprecated by providers, these break silently.
- **Recommended action:** Centralize model identifiers in a config file or env vars. Add comments explaining selection criteria.

### E4. `slug_collision` Behavior Undocumented in slugify.py
- **Location:** `slugify.py`
- **Severity:** Medium
- **Confidence:** High
- **Description:** The `slugify` function can produce identical slugs for different words (e.g., "cafe" and "café"). Collision handling is the caller's responsibility but this is never documented.
- **Recommended action:** Add a docstring note about collision possibility.

### E5. No Module-Level Docstrings in Several Key Files
- **Location:** `dispatcher.py`, `workspace.py`, `voices.py`, `presets.py`
- **Severity:** Low
- **Confidence:** Certain
- **Description:** These files lack module-level docstrings explaining their role in the architecture.
- **Recommended action:** Add brief module docstrings.

### E6. Image Engine `_MIN_IMAGE_BYTES` Thresholds Undocumented
- **Location:** `image-engine/src/renderer.py:38-42`
- **Severity:** Low
- **Confidence:** High
- **Description:** Magic numbers `15,000` and `10,000` bytes for refusal detection. No documentation of how these thresholds were determined empirically.
- **Recommended action:** Add a comment explaining the empirical basis.

### E7. `deprecated datetime.utcnow()` in Song Engine
- **Location:** `song-engine/src/models.py:320`
- **Severity:** Medium
- **Confidence:** Certain
- **Description:** `GenerationMeta.timestamp` default uses `datetime.utcnow()`, which is deprecated in Python 3.12+. The engine.py overrides this with `datetime.now(timezone.utc)`, but the model default is wrong. Concept-engine and image-engine use the correct approach.
- **Recommended action:** Change to `datetime.now(timezone.utc)`.

---

## Category F: Extractable Shared Utilities

### F1. OpenRouter Client (Highest Impact)
- **Location:** Used in concept-engine, image-engine, orchestrator (pipeline.py, job_runner.py, app.py)
- **Severity:** High
- **Confidence:** Certain
- **Description:** Five separate implementations of the same HTTP call pattern. Concept-engine already has a proper `OpenRouterClient` class.
- **Recommended action:** Extract to a shared `openrouter_client.py`. Should live in orchestrator for now (engines can't share code without a common package). Engines can vendor a copy until a shared package is introduced.
- **Would live:** `orchestrator/src/openrouter.py` initially; later `shared/openrouter.py`

### F2. Retry-With-Fallback Helper
- **Location:** `job_runner.py` (5 instances)
- **Severity:** High
- **Confidence:** Certain
- **Description:** The async retry pattern with fallback overrides is repeated 5 times.
- **Recommended action:** Extract to `orchestrator/src/retry.py`.
- **Would live:** `orchestrator/src/retry.py`

### F3. Stage Configuration Constants
- **Location:** `pipeline.py`, `job_runner.py`, `app.py`
- **Severity:** Medium
- **Confidence:** Certain
- **Description:** Stage names, directory mappings, stage order used in 4+ locations.
- **Recommended action:** Extract to `orchestrator/src/stage_config.py` with `STAGE_ORDER`, `STAGE_DIR_MAP`, and related constants.
- **Would live:** `orchestrator/src/stage_config.py`

### F4. Safe JSON Load Wrapper
- **Location:** 6+ files with unprotected `json.load()`
- **Severity:** Medium
- **Confidence:** Certain
- **Description:** Every JSON-reading function is vulnerable to `JSONDecodeError`.
- **Recommended action:** Create `safe_json_load(path, default=None)` that handles decode errors gracefully.
- **Would live:** `orchestrator/src/utils.py` or added to existing modules

### F5. Supabase Client Factory
- **Location:** `job_runner.py`, `suno.py` (3 instantiation sites)
- **Severity:** High
- **Confidence:** Certain
- **Description:** Duplicate env-var-reading + client creation. No connection reuse.
- **Recommended action:** Extract to `orchestrator/src/supabase_client.py`.
- **Would live:** `orchestrator/src/supabase_client.py`

### F6. Word Card / CJK Font Utilities
- **Location:** `assembly-engine/src/word_card.py`, `bookend-engine/src/word_card.py`
- **Severity:** High
- **Confidence:** Certain
- **Description:** 200+ lines of identical CJK detection, font discovery, and font rendering code.
- **Recommended action:** Extract to a shared package or have one engine be the canonical source and the other vendor a copy.
- **Would live:** `shared/word_card_utils.py` (requires architectural decision for cross-engine sharing)

### F7. Suno Bake-In Module
- **Location:** `job_runner.py:723-1065` (340 lines)
- **Severity:** High
- **Confidence:** Certain
- **Description:** `bake_suno_into_word()` is a massive self-contained feature.
- **Recommended action:** Extract to `orchestrator/src/suno_bakein.py`.
- **Would live:** `orchestrator/src/suno_bakein.py`

### F8. Metadata Collection Module
- **Location:** `job_runner.py:445-571` (`collect_word_metadata`, 122 lines)
- **Severity:** Medium
- **Confidence:** High
- **Description:** Complex metadata reading from filesystem, manifest, storyboard, and per-stage meta files.
- **Recommended action:** Extract to `orchestrator/src/metadata.py`.
- **Would live:** `orchestrator/src/metadata.py`

### F9. Enrichment Module
- **Location:** `job_runner.py:80-170` (`run_enrichment`, ~80 lines)
- **Severity:** Medium
- **Confidence:** High
- **Description:** LLM-based word enrichment with OpenRouter calls.
- **Recommended action:** Extract to `orchestrator/src/enrichment.py`.
- **Would live:** `orchestrator/src/enrichment.py`

---

## Category G: Structural / Organizational Issues

### G1. `app.py` Is 1,712 Lines With 37+ Endpoints — Should Be Split Into Routers
- **Location:** `orchestrator/src/app.py`
- **Severity:** Critical
- **Confidence:** Certain
- **Description:** A single file serves as controller for: workspaces (9 endpoints), words (12+ endpoints), pipeline (3+ endpoints), settings (2 endpoints), engines/health (2 endpoints), voices (4 endpoints), presets (4 endpoints), autopilot (4 endpoints), suno (1 endpoint), media (2 endpoints), and SPA serving (1 catch-all). Contains 13 inline Pydantic models.
- **Recommended action:** Split into FastAPI routers: `routers/workspace.py`, `routers/words.py`, `routers/pipeline.py`, `routers/settings.py`, `routers/autopilot.py`, `routers/suno.py`, etc. Move inline Pydantic models to their respective router files or to `models.py`.

### G2. `job_runner.py` Is 1,873 Lines — The Largest File in the Codebase
- **Location:** `orchestrator/job_runner.py`
- **Severity:** Critical
- **Confidence:** Certain
- **Description:** Combines enrichment, settings merging, retry logic, Suno bake-in (340 lines), A/B assembly/bookend orchestration, Supabase upload, metadata collection, job processing, and the main polling loop. At minimum 7 extractable modules identified (see Category F).
- **Recommended action:** Extract into: `enrichment.py`, `suno_bakein.py`, `upload.py`, `metadata.py`, and use shared utilities for retry and stage config.

### G3. `image-engine/src/prompts.py` Is 1,641 Lines
- **Location:** `image-engine/src/prompts.py`
- **Severity:** Medium
- **Confidence:** High
- **Description:** Mostly prompt text (string literals), not complex logic. But the file is enormous and hard to navigate. Functions include `build_system_prompt()` (95 lines), `_movie_shared_blocks()` (143 lines of text), `_output_schema_block()` (126 lines of text), plus creative-direction-specific prompt builders.
- **Recommended action:** Consider splitting into a `prompts/` package with separate files per creative direction.

### G4. Global Mutable State in app.py — Not Thread-Safe
- **Location:** `app.py:47` (`WORKSPACE_PATH` global), `app.py:254-267` (`autopilot_state`, `word_pipeline_state` dicts)
- **Severity:** High
- **Confidence:** Certain
- **Description:** `WORKSPACE_PATH` is a module-level global modified via `global WORKSPACE_PATH` in 5 endpoints. `autopilot_state` and `word_pipeline_state` are plain dicts. None of this is thread-safe and will break with multiple workers or cloud deployment.
- **Recommended action:** For local-only: use asyncio locks. For cloud: move state to database or Redis.

### G5. No `__init__.py` Public API Surface
- **Location:** `orchestrator/src/__init__.py`
- **Severity:** Low
- **Confidence:** Certain
- **Description:** The package doesn't re-export any symbols. Callers must know exact submodule paths. This is a style choice, not a defect.
- **Recommended action:** No action needed — acceptable pattern.

### G6. Engine Config Loading Is Inconsistent Across Engines
- **Location:** All six engines
- **Severity:** Medium
- **Confidence:** Certain
- **Description:**
  - **Concept engine:** `load_dotenv()` in `engine.py` at import time, env vars read inline, no `config.py`
  - **Song engine:** No `load_dotenv()`, env vars read inline in `engine.py`, no `config.py`
  - **Image engine:** Dedicated `config.py` with `load_dotenv()` and centralized constants ✓ (best pattern)
  - **Video engine:** Dedicated `config.py` with `load_dotenv()` ✓
  - **Assembly engine:** Dedicated `config.py`, no `load_dotenv()` (correct — no cloud APIs)
  - **Bookend engine:** Dedicated `config.py` with `load_dotenv()`
- **Recommended action:** Standardize all engines to use image-engine's pattern: dedicated `config.py` with centralized env var reading.

### G7. `EngineHealthStatus` Belongs in dispatcher.py, Not models.py
- **Location:** `orchestrator/src/models.py` (defines `EngineHealthStatus`), only consumed by `dispatcher.py`
- **Severity:** Medium
- **Confidence:** High
- **Description:** The model is a pure dispatcher concern. Having it in `models.py` creates coupling where dispatcher depends on models for a type that no one else uses.
- **Recommended action:** Move `EngineHealthStatus` to `dispatcher.py`.

### G8. Engine `__init__.py` Export Inconsistency
- **Location:** Concept-engine exports `ConceptPayload, ConceptResult`. Song-engine exports `SongPayload, SongResult`. Image-engine exports only `generate_images`.
- **Severity:** Low
- **Confidence:** Certain
- **Description:** Inconsistent public API across engines.
- **Recommended action:** Standardize exports — each engine should export its payload, result, and main function.

### G9. Assembly Engine Missing CORS Middleware
- **Location:** `assembly-engine/ui/app.py`
- **Severity:** Medium
- **Confidence:** Certain
- **Description:** Assembly engine's UI app does not add CORS middleware, while bookend engine's UI does (with `allow_origins=["*"]`). Browser-based cross-origin calls to assembly UI will fail.
- **Recommended action:** Add CORS middleware to assembly UI app.

### G10. `main.py` Has `reload=True` Hardcoded
- **Location:** `orchestrator/main.py:15`
- **Severity:** Medium
- **Confidence:** Certain
- **Description:** Development-only setting baked into the entry point. Will cause issues in production.
- **Recommended action:** Make configurable via env var: `reload=os.getenv("DEV_RELOAD", "").lower() == "true"`.

---

## Category H: Cloud Migration Friction Points

### H1. Hardcoded Windows Default Paths (Inconsistent!)
- **Location:** `app.py:46` (`D:/CODING/ResonanceTEST`), `job_runner.py:47` (`D:/CODING/ResonanceTEST/content`)
- **Severity:** High
- **Confidence:** Certain
- **Description:** Two different hardcoded Windows paths as defaults for `WORKSPACE_ROOT`. Not only are these Windows-specific, they disagree on the default path. This will silently cause different behavior if `WORKSPACE_ROOT` env var is not set.
- **Recommended action:** Unify the default and make it required in cloud mode (fail fast if not set).

### H2. Localhost Engine URLs as Default
- **Location:** `dispatcher.py:39` (`http://localhost:{port}`), `dispatcher.py:14-21` (hardcoded port numbers)
- **Severity:** Medium
- **Confidence:** Certain
- **Description:** All engine URLs default to `localhost` with hardcoded ports. No warning when env var is missing. In cloud deployment, engines will be at different network addresses.
- **Recommended action:** Log a warning when falling back to localhost. Consider requiring engine URLs in cloud mode.

### H3. Hardcoded Production Callback URL in suno.py
- **Location:** `suno.py:140` (`https://resonanz.pro/api/suno/callback`)
- **Severity:** High
- **Confidence:** Certain
- **Description:** The Suno callback URL is hardcoded to the production domain. This won't work in development or staging environments.
- **Recommended action:** Use env var `SUNO_CALLBACK_URL` with the production URL as default.

### H4. All File I/O Uses Local `pathlib.Path` — No Storage Abstraction
- **Location:** Every file in orchestrator that reads/writes data
- **Severity:** High
- **Confidence:** Certain
- **Description:** The entire codebase assumes local filesystem access via `pathlib.Path`. Affected modules: `manifest.py`, `workspace.py`, `settings.py`, `suno.py`, `csv_import.py`, `voices.py`, `presets.py`, `pipeline.py`, `job_runner.py`. Cloud deployment will require object storage (S3/GCS/Supabase Storage) for all artifact storage.
- **Recommended action:** This is the largest migration task. Consider introducing a storage abstraction layer (`StorageBackend` protocol) that wraps `Path` operations, with a `LocalStorageBackend` for development and cloud backends for deployment.

### H5. File-Based Data Passing Between Pipeline Stages
- **Location:** `pipeline.py` (writes to disk between stages), `job_runner.py` (reads from disk for metadata/upload)
- **Severity:** High
- **Confidence:** Certain
- **Description:** Pipeline stages communicate through the filesystem: engine output → local disk → next stage reads from disk. In a distributed cloud deployment, stages may run on different machines without shared filesystem access.
- **Recommended action:** For cloud: either use shared network storage (NFS/EFS) or pass artifact URLs/references between stages instead of file paths.

### H6. In-Memory State (Autopilot, Pipeline)
- **Location:** `app.py:254-267` (`autopilot_state`, `word_pipeline_state`)
- **Severity:** High
- **Confidence:** Certain
- **Description:** Autopilot and word pipeline state is stored in plain Python dicts. Not persisted across restarts. Not shared across workers. Will be lost on any deployment/restart.
- **Recommended action:** Move to database-backed state (Supabase already used for job state in cloud mode).

### H7. `suno.py:read_concept_data()` Bypasses Manifest Module
- **Location:** `suno.py:63-66`
- **Severity:** Medium
- **Confidence:** Certain
- **Description:** Reads `manifest.json` directly via `json.load` instead of using `read_manifest()` from `manifest.py`. This duplicates parsing logic and bypasses Pydantic model validation. If manifest format changes, this function breaks independently.
- **Recommended action:** Use `manifest.read_manifest()` instead of direct JSON read.

### H8. Hardcoded Workspace Directory Naming Convention
- **Location:** `suno.py:58` (`cloud_{user_id}_{deck_id}`)
- **Severity:** Medium
- **Confidence:** Certain
- **Description:** The workspace directory naming convention is hardcoded in the Suno module rather than derived from a shared workspace utility.
- **Recommended action:** Use workspace module functions for path construction.

### H9. Video Engine Resolution Map Mismatch (Potential Runtime Crash)
- **Location:** `video-engine/src/config.py:25-29` vs `video-engine/src/models.py:60`
- **Severity:** Critical
- **Confidence:** Certain
- **Description:** The resolution map in `config.py` defines `480p`, `720p`, `1080p`. But `VideoSettings.resolution` in `models.py` allows `1080p`, `1440p`, `2160p`. If `1440p` or `2160p` is passed, looking up the resolution map will cause a `KeyError` at runtime.
- **Recommended action:** Sync the resolution map with the model's allowed values. Either restrict the model or expand the map.

### H10. `bookend-engine/src/config.py` Has Hardcoded Windows Font Path
- **Location:** `bookend-engine/src/config.py:53`
- **Severity:** Medium
- **Confidence:** Certain
- **Description:** Hardcoded `"C:/Windows/Fonts"` path. Not using `os.environ.get("WINDIR")` like assembly-engine does. Will fail on Linux cloud containers.
- **Recommended action:** Use platform-agnostic font discovery (like assembly-engine's pattern).

### H11. Font Paths Hardcoded in Image Engine
- **Location:** `image-engine/src/renderer.py:411-416`
- **Severity:** Low
- **Confidence:** Certain
- **Description:** `"arial.ttf"` and `"/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"` hardcoded. Platform-specific, will fail silently (falling back to PIL default) on systems without these fonts.
- **Recommended action:** Use a configurable font path or the shared font discovery pattern.

### H12. Assembly Engine `word_card.py` Potential Runtime Crash
- **Location:** `assembly-engine/src/word_card.py:239`
- **Severity:** Critical
- **Confidence:** Certain
- **Description:** `img.get_flattened_data()` does not exist on Pillow `Image` objects. The correct method would be `list(img.getdata())`. The `extract_dominant_color()` function would crash at runtime with `AttributeError` if this code path is reached.
- **Recommended action:** Fix to `list(img.getdata())` or `img.tobytes()` depending on intended use. Verify whether this code path is actually exercised.

---

## Cross-Cutting Observations

### Observation 1: Assembly ↔ Bookend Engine Are 40% Duplicated
These two engines share substantial code (word card rendering, CJK font handling, FFmpeg probing, config patterns) but have diverged in quality: assembly-engine has typed Pydantic models, proper error handling, and relative imports, while bookend-engine uses raw dicts, has no error differentiation, and uses absolute imports. This represents both a **duplication issue (A10)** and a **consistency issue (C8-C11)**. Any fix to one engine's word card logic must be manually replicated to the other.

### Observation 2: The "Gateway Pattern Bug" Is Mostly Resolved
The 13 Pydantic models defined inline in `app.py` do NOT shadow or duplicate models in `models.py`. The `models.py` file contains domain models (Manifest, Enrichment, etc.) while `app.py` contains request schemas (CreateWorkspaceRequest, AddWordRequest, etc.). These are correctly separated concerns. However, there is no single source of truth for the app.py request models — they're scattered through 1,700 lines of endpoint code.

### Observation 3: Error Handling Quality Correlates With Engine Maturity
The engines show a clear quality gradient:
- **Best:** Video engine and assembly engine (structured errors, typed metadata, proper exception handling)
- **Middle:** Concept engine and image engine (mostly good, some gaps)
- **Worst:** Bookend engine (string errors, raw dict metadata, single catch-all, no meta write protection)
- **Song engine** has a unique issue with input mutation (C15)

### Observation 4: The Codebase Has No Shared Code Between Engines
This is an intentional architectural choice (engines are standalone), but it means every cross-engine improvement requires manual synchronization across 6 directories. The cloud migration will likely require introducing a shared package, which creates an opportunity to extract the duplicated utilities identified in this report.

### Observation 5: `job_runner.py` Is the Highest-Risk File
At 1,873 lines with two 300+ line functions, it contains the most complex business logic, the most duplication, and the most cloud migration friction. It's also the most critical file for the cloud pipeline. Refactoring this file should be the top priority.

---

## Prioritized Refactoring Roadmap (Suggested)

### Phase 0: Critical Bugs (Do First)
1. **H9** — Fix video engine resolution map mismatch (potential runtime crash)
2. **H12** — Fix `img.get_flattened_data()` → `list(img.getdata())` in assembly word_card.py
3. **H1** — Unify `WORKSPACE_ROOT` defaults between app.py and job_runner.py

### Phase 1: job_runner.py Decomposition (Highest Impact)
4. **B2** → **F7** — Extract `bake_suno_into_word()` to `suno_bakein.py` (340 lines out)
5. **F8** — Extract `collect_word_metadata()` to `metadata.py` (122 lines out)
6. **F9** — Extract `run_enrichment()` to `enrichment.py` (80 lines out)
7. **A4** → **F2** — Extract retry-with-fallback to `retry.py` (eliminates 5x duplication)
8. **A5** — Deduplicate A/B orchestration using shared `run_ab_pipeline()`
9. **B1** — Decompose remaining `process_word()` after extractions

### Phase 2: app.py Router Split (Improves Navigability)
10. **G1** — Split app.py into FastAPI routers (workspaces, words, pipeline, autopilot, etc.)
11. **A15** — Merge `_compute_stage_statuses` and `_compute_stages_detail`

### Phase 3: Shared Utilities (Reduces Cross-File Duplication)
12. **A1** → **F3** — Extract `stage_config.py` with canonical stage constants
13. **A2** → **F1** — Extract shared OpenRouter client
14. **A6** → **F5** — Extract Supabase client factory
15. **A13** — Consolidate timestamp utilities
16. **A14** — Consolidate settings merge pattern
17. **F4** — Add safe JSON load wrapper

### Phase 4: Bookend Engine Quality Parity
18. **C8** — Introduce `BookendError` structured model
19. **C10** — Introduce `BookendGenerationMeta` Pydantic model
20. **C9** — Add try/except around meta write in finally block
21. **C11** — Add targeted exception handling
22. **D5** — Switch to relative imports
23. **C14** — Replace `print()` with logger

### Phase 5: Cross-Engine Shared Package (Architectural Decision)
24. **A10** → **F6** — Extract shared word card / CJK utilities
25. **A11** — Extract shared language safety net
26. **A7** — Consider shared `EngineError` base class
27. **A12** — Extract shared `posix_path()` utility
28. **G6** — Standardize engine config patterns

### Phase 6: Cloud Migration Preparation
29. **H4** — Design storage abstraction layer
30. **H5** — Design artifact reference passing between stages
31. **H6** — Move in-memory state to database
32. **H3** — Make Suno callback URL configurable
33. **H10** — Fix hardcoded Windows font path in bookend
34. **G4** — Add async locks for global mutable state

### Phase 7: Polish (Low Priority)
35. **B11** — Refactor concept-engine template functions
36. **C15** — Fix `build_acestep_params()` input mutation
37. **C16** — Replace `__del__` with explicit cleanup
38. **E1** — Document magic numbers in settings
39. **E7** — Fix deprecated `datetime.utcnow()`
40. **G10** — Make `reload=True` configurable

---

*Report generated 2026-04-11. Cross-reference with independent agent report for validation.*
