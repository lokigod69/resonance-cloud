# Code Quality Investigation Report

## Summary Statistics
- Total findings: 36
- Critical: 7 | High: 18 | Medium: 10 | Low: 1
- Files examined:
```text
engines/assembly-engine/src/__init__.py
engines/assembly-engine/src/audio.py
engines/assembly-engine/src/config.py
engines/assembly-engine/src/engine.py
engines/assembly-engine/src/ffmpeg_builder.py
engines/assembly-engine/src/gaps.py
engines/assembly-engine/src/models.py
engines/assembly-engine/src/timing.py
engines/assembly-engine/src/video.py
engines/assembly-engine/src/word_card.py
engines/assembly-engine/tests/__init__.py
engines/assembly-engine/tests/conftest.py
engines/assembly-engine/tests/test_audio.py
engines/assembly-engine/tests/test_engine.py
engines/assembly-engine/tests/test_gaps.py
engines/assembly-engine/tests/test_models.py
engines/assembly-engine/tests/test_timing.py
engines/assembly-engine/tests/test_transitions.py
engines/assembly-engine/tests/test_word_card.py
engines/assembly-engine/ui/__init__.py
engines/assembly-engine/ui/app.py
engines/bookend-engine/scripts/download_fonts.py
engines/bookend-engine/src/__init__.py
engines/bookend-engine/src/color.py
engines/bookend-engine/src/config.py
engines/bookend-engine/src/engine.py
engines/bookend-engine/src/ffmpeg_builder.py
engines/bookend-engine/src/models.py
engines/bookend-engine/src/timing.py
engines/bookend-engine/src/tts.py
engines/bookend-engine/src/word_card.py
engines/bookend-engine/ui/app.py
engines/concept-engine/src/__init__.py
engines/concept-engine/src/article.py
engines/concept-engine/src/caption.py
engines/concept-engine/src/engine.py
engines/concept-engine/src/llm_client.py
engines/concept-engine/src/lyrics.py
engines/concept-engine/src/models.py
engines/concept-engine/src/syllables.py
engines/concept-engine/src/templates.py
engines/concept-engine/tests/__init__.py
engines/concept-engine/tests/test_article.py
engines/concept-engine/tests/test_caption.py
engines/concept-engine/tests/test_engine.py
engines/concept-engine/tests/test_lyrics.py
engines/concept-engine/tests/test_syllables.py
engines/concept-engine/tests/test_templates.py
engines/concept-engine/ui/__init__.py
engines/concept-engine/ui/app.py
engines/image-engine/src/__init__.py
engines/image-engine/src/config.py
engines/image-engine/src/engine.py
engines/image-engine/src/models.py
engines/image-engine/src/prompt_compiler.py
engines/image-engine/src/prompts.py
engines/image-engine/src/renderer.py
engines/image-engine/src/storyboard.py
engines/image-engine/src/wan_provider.py
engines/image-engine/test_korean.py
engines/image-engine/test_live.py
engines/image-engine/tests/__init__.py
engines/image-engine/tests/test_engine.py
engines/image-engine/tests/test_models.py
engines/image-engine/tests/test_prompts.py
engines/image-engine/tests/test_renderer.py
engines/image-engine/tests/test_storyboard.py
engines/image-engine/ui/__init__.py
engines/image-engine/ui/app.py
engines/song-engine/src/__init__.py
engines/song-engine/src/acestep_base.py
engines/song-engine/src/acestep_gradio.py
engines/song-engine/src/acestep_http.py
engines/song-engine/src/engine.py
engines/song-engine/src/language.py
engines/song-engine/src/models.py
engines/song-engine/src/params.py
engines/song-engine/tests/__init__.py
engines/song-engine/tests/test_engine.py
engines/song-engine/tests/test_language.py
engines/song-engine/tests/test_lora.py
engines/song-engine/tests/test_models.py
engines/song-engine/tests/test_params.py
engines/song-engine/ui/__init__.py
engines/song-engine/ui/app.py
engines/video-engine/src/__init__.py
engines/video-engine/src/adapters/__init__.py
engines/video-engine/src/adapters/base.py
engines/video-engine/src/adapters/ken_burns.py
engines/video-engine/src/adapters/kling.py
engines/video-engine/src/adapters/ltx.py
engines/video-engine/src/config.py
engines/video-engine/src/cost.py
engines/video-engine/src/download.py
engines/video-engine/src/engine.py
engines/video-engine/src/models.py
engines/video-engine/src/router.py
engines/video-engine/src/upload.py
engines/video-engine/tests/__init__.py
engines/video-engine/tests/conftest.py
engines/video-engine/tests/test_adapters.py
engines/video-engine/tests/test_cost.py
engines/video-engine/tests/test_engine.py
engines/video-engine/tests/test_ken_burns.py
engines/video-engine/tests/test_kling.py
engines/video-engine/tests/test_ltx.py
engines/video-engine/tests/test_models.py
engines/video-engine/ui/__init__.py
engines/video-engine/ui/app.py
orchestrator/job_runner.py
orchestrator/main.py
orchestrator/scripts/backfill_suno_storage.py
orchestrator/src/__init__.py
orchestrator/src/app.py
orchestrator/src/csv_import.py
orchestrator/src/dispatcher.py
orchestrator/src/manifest.py
orchestrator/src/models.py
orchestrator/src/pipeline.py
orchestrator/src/presets.py
orchestrator/src/settings.py
orchestrator/src/slugify.py
orchestrator/src/suno.py
orchestrator/src/voices.py
orchestrator/src/workspace.py
```

## Files NOT Examined (and why)
- None.

## Category A: Duplicate Logic
### A1. Engine HTTP Wrapper Models Have Already Drifted From Source Contracts
- **Location:** `engines/concept-engine/ui/app.py:89-129,256-349` and `engines/concept-engine/src/models.py:29-60`; `engines/image-engine/ui/app.py:82-126,250-343` and `engines/image-engine/src/models.py:21-37,104-130,213-230`; `engines/song-engine/ui/app.py:164-190,194-218` and `engines/song-engine/src/models.py:22-54,94-98`; `engines/video-engine/ui/app.py:94-134,293-355` and `engines/video-engine/src/models.py:20-79,91-108`
- **Severity:** High
- **Confidence:** Certain
- **Description:** Each engine keeps a second set of request models in `ui/app.py` and then manually maps them into the real `src/models.py` payloads. The copies have already diverged: concept UI exposes `mnemonic` and `pos` while source expects `enrichment` and `input_type`; image UI omits `use_color_palette` and `movies_blacklist`; song UI omits `audio_format`; video UI carries `motion_type`, `motion_speed`, and settings-level `video_prompt` while source settings instead define `generate_audio` and store motion on content.
- **Recommended action:** Make `src/models.py` the single contract source and either import those models directly in the HTTP layer or generate wrapper schemas from them.

### A2. Stage Sequencing Logic Exists In Three Different Executors
- **Location:** `orchestrator/src/app.py:1186-1245`; `orchestrator/src/app.py:1375-1434`; `orchestrator/job_runner.py:1070-1498`; `orchestrator/job_runner.py:1609-1802`
- **Severity:** High
- **Confidence:** Certain
- **Description:** The gateway autopilot, the single-word pipeline runner, and the Supabase job runner all maintain their own stage iteration, progress tracking, pause/cancel handling, error collection, and post-run Suno trigger logic. They are similar enough that every pipeline rule change now needs to be made in multiple places, but different enough that behavior will drift under refactoring.
- **Recommended action:** Extract one reusable orchestration service for stage sequencing and make the gateway and job runner thin callers around it.

### A3. Settings Layering Is Implemented By Multiple Partial Mergers
- **Location:** `orchestrator/job_runner.py:173-212`; `orchestrator/src/settings.py:125-158`; `orchestrator/src/app.py:1091-1098`
- **Severity:** High
- **Confidence:** Certain
- **Description:** `job_runner.merge_settings()` overlays hardcoded defaults, profile settings, wizard overrides, and legacy top-level fields, while `settings.load_defaults()` and `settings.resolve_settings()` implement a separate defaults-plus-word-override pipeline. These functions all depend on the same `DEFAULT_SETTINGS`, but they do not share one resolver, so new fields can easily appear in one merge path and not another.
- **Recommended action:** Consolidate all settings composition into one schema-aware resolver and make every caller use that single path.

### A4. Stage-Completion Detection Is Duplicated With Different Semantics
- **Location:** `orchestrator/src/app.py:1292-1307`; `orchestrator/job_runner.py:249-292`
- **Severity:** High
- **Confidence:** Certain
- **Description:** The gateway’s `_get_incomplete_stages()` treats a stage as complete when a manifest selection exists, while the job runner’s `get_incomplete_stages()` also checks whether the selected artifacts still exist on disk. That means the same word can be treated as complete in the HTTP layer and incomplete in background processing after any filesystem drift or manual cleanup.
- **Recommended action:** Keep one authoritative completion check that combines manifest state and artifact validation.

### A5. Suno Storage And Supabase Update Logic Is Triplicated
- **Location:** `orchestrator/src/app.py:1645-1698`; `orchestrator/job_runner.py:626-660`; `orchestrator/src/suno.py:25-43,207-218`
- **Severity:** High
- **Confidence:** Certain
- **Description:** The admin Suno endpoint, the job runner, and the Suno integration module all create Supabase clients, upload audio or write task IDs, and update the `words` row with overlapping but different field sets. This is the same storage side effect implemented three times, with different error handling and different update keys.
- **Recommended action:** Move Suno persistence into one shared service that owns all storage uploads and table updates.

### A6. Media Engines Repeat The Same FFMPEG And Font Discovery Patterns
- **Location:** `engines/video-engine/src/config.py:35-62`; `engines/assembly-engine/src/config.py:26-80,83-203`; `engines/bookend-engine/src/config.py:34-89`; `engines/assembly-engine/src/word_card.py:112`; `engines/bookend-engine/src/word_card.py:96`
- **Severity:** Medium
- **Confidence:** Certain
- **Description:** Video, assembly, and bookend each implement their own FFMPEG detection and path handling, and assembly/bookend also reimplement overlapping font discovery rules in both `config.py` and `word_card.py`. That duplication matters because these are exactly the platform-sensitive paths that will need to change during migration.
- **Recommended action:** Extract shared runtime capability helpers for ffmpeg, ffprobe, font lookup, and path normalization.

## Category B: Oversized Functions
### B1. `process_word()` Is A 429-Line Cloud Workflow God Function
- **Location:** `orchestrator/job_runner.py:1070-1498`
- **Severity:** Critical
- **Confidence:** Certain
- **Description:** `process_word()` mixes manifest creation, settings resolution, fallback/retry policy, stage dispatch, storyboard enrichment write-back, bookend enablement logic, Suno trigger logic, A/B upload coordination, and job-status persistence. The function is too large to reason about safely, and it is the most likely place for migration regressions because it ties together nearly every backend responsibility.
- **Recommended action:** Split `process_word()` into small orchestration steps for setup, stage execution, retry policy, post-processing, and persistence.

### B2. `bake_suno_into_word()` Is A 343-Line Post-Processing Pipeline
- **Location:** `orchestrator/job_runner.py:723-1065`
- **Severity:** High
- **Confidence:** Certain
- **Description:** `bake_suno_into_word()` polls or reuses a Suno task, downloads audio, validates track presence, mutates bookend settings, uploads raw Suno files, reruns assembly and bookend, updates storage URLs, and patches the database. The function is not just “Suno baking”; it is a second pipeline runner embedded inside the job runner.
- **Recommended action:** Separate Suno task retrieval, asset download/upload, assembly rebuild, and Supabase mutation into dedicated units.

### B3. `run_stage()` Is A 223-Line Switchboard For Every Pipeline Rule
- **Location:** `orchestrator/src/pipeline.py:753-975`
- **Severity:** High
- **Confidence:** Certain
- **Description:** `run_stage()` validates dependencies, creates version directories, builds payloads, calls engines, writes lineage, auto-selects outputs, and handles partial-success rules for all six stages through one large `if/elif` chain. Every new stage rule increases both branching and coupling in one file.
- **Recommended action:** Replace the stage chain with a registry of stage handlers that each own payload building, dependency checks, and post-success side effects.

### B4. Gateway Endpoints Are Doing Business Logic Inline
- **Location:** `orchestrator/src/app.py:1018-1085`; `orchestrator/src/app.py:1646-1698`
- **Severity:** High
- **Confidence:** Certain
- **Description:** `trim_assembly()` does HTTP validation, output versioning, manifest reads, engine payload construction, lineage updates, and selection updates in one route. `suno_generate()` does an HTTP call, storage uploads, table updates, and warning fallback logic directly in the route handler. These are service workflows embedded in FastAPI endpoints.
- **Recommended action:** Move multi-step business workflows out of route handlers into service modules and keep endpoints limited to HTTP concerns.

### B5. Several Engine Entry Points Still Concentrate Full Workflows Inline
- **Location:** `engines/assembly-engine/src/engine.py:48-299` (252 lines); `engines/bookend-engine/src/engine.py:19-296` (278 lines); `engines/concept-engine/src/engine.py:46-247` (202 lines); `engines/image-engine/src/renderer.py:452-636` (185 lines); `engines/video-engine/src/adapters/ltx.py:137-282` (146 lines)
- **Severity:** Medium
- **Confidence:** Certain
- **Description:** Multiple engines still use single large functions that validate input, call providers, manage temp files, interpret provider output, write artifacts, and build metadata in one block. These functions are readable today, but they will be painful to adapt when providers, storage, or execution environments change.
- **Recommended action:** Break large engine workflows into explicit steps with dedicated helpers for validation, provider calls, artifact writing, and metadata assembly.

## Category C: Inconsistent Error Handling
### C1. The Dispatcher’s Contract Assumptions No Longer Match Engine Reality
- **Location:** `orchestrator/src/dispatcher.py:54-92`; `engines/concept-engine/ui/app.py:299-321`; `engines/video-engine/ui/app.py:297-302`; `engines/bookend-engine/ui/app.py:47-55`; `engines/assembly-engine/ui/app.py:831-877`
- **Severity:** Critical
- **Confidence:** Certain
- **Description:** `call_engine()` documents that “all engines return HTTP 200 for both success and failure” and only special-cases `422`, but the wrappers do not behave uniformly. Concept returns `422` and `500` JSON responses, video raises `400` for image-path problems, bookend returns `200` with a plain string error body, and assembly trims return `422` for payload validation while other failures stay in a 200 body. The orchestrator is therefore operating on a false contract.
- **Recommended action:** Define one engine error/response contract and enforce it in every engine wrapper before any migration work starts.

### C2. Bookend Is The Error-Schema Outlier
- **Location:** `engines/bookend-engine/ui/app.py:40-55`; `engines/bookend-engine/src/models.py:47-50`; `engines/bookend-engine/src/engine.py:281-296`
- **Severity:** High
- **Confidence:** Certain
- **Description:** Bookend returns `error: str | None` instead of the structured error objects used by the other engines, catches all exceptions at the UI boundary and converts them to HTTP 200 bodies, and writes a raw dict `generation-meta.json` rather than a typed metadata model. That makes it the hardest engine for the orchestrator to treat consistently.
- **Recommended action:** Bring bookend onto the same structured error and metadata schema as the other engines.

### C3. Several Failures Are Silently Swallowed
- **Location:** `orchestrator/job_runner.py:401-406`; `engines/concept-engine/ui/app.py:323-335`; `engines/video-engine/ui/app.py:153-159`; `orchestrator/src/app.py:58-62`
- **Severity:** Medium
- **Confidence:** Certain
- **Description:** `_read_json()` returns `{}` on any exception without logging, the concept UI suppresses enrichment-patching failures with `pass`, the video health endpoint swallows any FFMPEG/config exception, and recent-workspace parsing quietly drops JSON errors. These patterns reduce operator visibility exactly where migration and file-distribution issues will surface first.
- **Recommended action:** Replace silent fallback blocks with logged, typed failure paths and only suppress errors when the fallback is explicitly safe.

### C4. Health Endpoints Use Incompatible Schemas And Readiness Semantics
- **Location:** `engines/concept-engine/ui/app.py:38-40`; `engines/image-engine/ui/app.py:145-153`; `engines/song-engine/ui/app.py:80-95`; `engines/video-engine/ui/app.py:147-167`; `engines/bookend-engine/ui/app.py:18-37`; `engines/assembly-engine/ui/app.py:804-815`
- **Severity:** Medium
- **Confidence:** Certain
- **Description:** Concept returns `{status, engine}`, image returns config flags, song returns Ace-Step reachability and URL, video returns status plus capability flags, bookend returns `{healthy, checks}`, and assembly returns `{status: ok|error}`. The orchestrator currently treats any `<500` response as “reachable”, which is much weaker than “ready”.
- **Recommended action:** Standardize one health schema that distinguishes reachability, readiness, and capability checks.

## Category D: Naming Issues
### D1. `WORKSPACE_ROOT` Means Different Things In Different Processes
- **Location:** `orchestrator/src/app.py:46-47`; `orchestrator/job_runner.py:45-47`
- **Severity:** High
- **Confidence:** Certain
- **Description:** In the FastAPI gateway, `WORKSPACE_ROOT` defaults to the repository root and `WORKSPACE_PATH` defaults to `WORKSPACE_ROOT / "workspace"`. In the job runner, `WORKSPACE_ROOT` defaults directly to `D:/CODING/ResonanceTEST/content`. The same name points to different semantic levels of the filesystem.
- **Recommended action:** Rename these paths so root-of-repo, workspace-root, and active-workspace are distinct concepts everywhere.

### D2. `assembly` Versus `final` Terminology Forces Special Cases Everywhere
- **Location:** `orchestrator/src/manifest.py:85-92`; `orchestrator/src/workspace.py:94-97`; `orchestrator/job_runner.py:288-289`; `orchestrator/src/app.py:1304-1305`
- **Severity:** High
- **Confidence:** Certain
- **Description:** The stage is called `assembly`, the selected manifest field is `final`, the folder is `final`, and various helpers special-case that mismatch with alias maps or ternaries. The naming split leaks into selection updates, completion checks, and version-label generation, which is exactly the kind of terminology drift that causes subtle bugs during refactors.
- **Recommended action:** Pick one canonical name for the stage and use aliases only at explicit compatibility boundaries.

### D3. `ui/app.py` And “Testing UI” Understate The Real API Surface
- **Location:** `engines/concept-engine/ui/app.py:30,35,255-349`; `engines/image-engine/ui/app.py:30,46,249-343`; `engines/song-engine/ui/app.py:38,193-218`; `engines/video-engine/ui/app.py:30,47,292-355`
- **Severity:** Medium
- **Confidence:** Certain
- **Description:** These files are titled as testing UIs, but they also host the orchestrator-facing `/run` contract and the drift-prone request model layer. The name suggests optional developer tooling even though they are part of the engine boundary that production orchestration depends on.
- **Recommended action:** Rename or restructure these modules so the HTTP contract lives in an explicitly named API package rather than a “UI” package.

## Category E: Missing or Misleading Documentation
### E1. FastAPI Route Metadata Is Effectively Absent
- **Location:** `orchestrator/src/app.py:178-1646`; `engines/concept-engine/ui/app.py:38-412`; `engines/image-engine/ui/app.py:135-443`; `engines/song-engine/ui/app.py:71-218`; `engines/video-engine/ui/app.py:143-371`; `engines/bookend-engine/ui/app.py:18-55`; `engines/assembly-engine/ui/app.py:43-877`
- **Severity:** High
- **Confidence:** Certain
- **Description:** An automated decorator scan found no route decorators in the orchestrator or engine HTTP layers that specify `response_model`, `summary`, or `description`. That makes the API surface harder to inspect, validate, and preserve during router extraction or cloud deployment.
- **Recommended action:** Add explicit FastAPI metadata to every externally relevant route before splitting or migrating the API surface.

### E2. Several Non-Trivial Functions Have No Docstrings
- **Location:** `orchestrator/src/app.py:178-249`; `orchestrator/src/app.py:1186-1245`; `orchestrator/src/app.py:1521-1631`; `orchestrator/src/pipeline.py:191-230`; `orchestrator/src/pipeline.py:233-262`; `orchestrator/src/pipeline.py:265-299`; `orchestrator/src/pipeline.py:678-717`; `engines/image-engine/ui/app.py:157-343`
- **Severity:** Medium
- **Confidence:** Certain
- **Description:** Important entry points and helpers such as `suggest_words()`, `_run_autopilot()`, `_compute_stages_detail()`, multiple payload builders, and several engine `/run` handlers have enough branching to need intent documentation, but currently rely on the reader reverse-engineering behavior from the code.
- **Recommended action:** Add concise docstrings to non-obvious functions that encode behavior, invariants, and side effects.

### E3. Some Inline Documentation Is Already Stale Or Self-Contradictory
- **Location:** `orchestrator/job_runner.py:8-10,38`; `orchestrator/src/dispatcher.py:55-60`
- **Severity:** High
- **Confidence:** Certain
- **Description:** `job_runner.py` declares a strict import rule and then immediately violates it with `from src.suno import ...`, and `dispatcher.py` documents an all-HTTP-200 engine contract that no longer exists. Those comments are actively misleading because they describe architecture guarantees the code no longer honors.
- **Recommended action:** Update or remove stale architectural comments immediately when behavior changes, especially around contracts and import boundaries.

### E4. Operational Magic Numbers Are Scattered And Under-Explained
- **Location:** `orchestrator/job_runner.py:49-50`; `orchestrator/src/suno.py:21-22`; `engines/song-engine/src/acestep_http.py:24-26`; `engines/video-engine/src/adapters/ltx.py:246`; `orchestrator/src/app.py:1034`
- **Severity:** Medium
- **Confidence:** Certain
- **Description:** Poll intervals, retry counts, trim minimums, and timeout ceilings are spread across the repo with inconsistent naming and little rationale. Examples include job-runner polling, Suno polling, Ace-Step polling/timeouts, the Fal polling ceiling, and the hardcoded one-second trim floor.
- **Recommended action:** Centralize operational constants and document why each threshold exists.

### E5. Several Comment Separators Are Mojibake
- **Location:** `orchestrator/src/models.py:8,62`; `orchestrator/job_runner.py:43`
- **Severity:** Low
- **Confidence:** Certain
- **Description:** Decorative separator comments are stored with corrupted encoding sequences like `Ã¢â€â‚¬`, which makes files look damaged and distracts from actual structure when reading quickly.
- **Recommended action:** Normalize the files to plain ASCII separators or valid UTF-8 characters.

## Category F: Extractable Shared Utilities
### F1. The Engine Wrapper Translation Layer Should Be A Shared Utility Or Removed
- **Location:** `engines/concept-engine/ui/app.py:265-298`; `engines/image-engine/ui/app.py:261-305`; `engines/song-engine/ui/app.py:201-210`; `engines/video-engine/ui/app.py:304-347`
- **Severity:** High
- **Confidence:** Certain
- **Description:** Every wrapper hand-builds a source payload from a second request schema, often patching metadata afterward. Even if the duplicate schemas remain temporarily, the mapping logic itself is a repeated utility that is currently copied four times.
- **Recommended action:** Either delete the translation layer by reusing source models directly or centralize the wrapper-to-payload conversion in a shared helper pattern.

### F2. Storage Upload And Row-Update Helpers Should Be Centralized
- **Location:** `orchestrator/job_runner.py:587-718`; `orchestrator/job_runner.py:626-660`; `orchestrator/src/suno.py:25-43,207-218`; `orchestrator/src/app.py:1654-1694`
- **Severity:** High
- **Confidence:** Certain
- **Description:** Uploading media to storage and updating the `words` table is currently spread across job-runner helpers and Suno/gateway code paths, with repeated client creation, bucket names, path construction, and update calls. This is a textbook shared utility that has instead become scattered business logic.
- **Recommended action:** Introduce one storage/data-access layer for media uploads and `words` row updates.

### F3. Runtime Capability Checks And Temp-File Hygiene Want A Shared Module
- **Location:** `engines/video-engine/src/config.py:35-62`; `engines/assembly-engine/src/config.py:26-80`; `engines/bookend-engine/src/config.py:34-89`; `engines/assembly-engine/src/engine.py:269-276`; `engines/bookend-engine/src/engine.py:251-269`
- **Severity:** Medium
- **Confidence:** Certain
- **Description:** The engines all need some variant of environment capability checks and temp artifact cleanup, but today each one rolls its own rules. Assembly deletes `_temp` in `finally`; bookend intentionally keeps most intermediates; FFMPEG and font probing also vary per engine.
- **Recommended action:** Create shared runtime helpers for capability checks and temp-file lifecycle policies, then let engines opt into policy differences explicitly.

### F4. JSON And Small File I/O Patterns Are Repeated Across The Repo
- **Location:** `orchestrator/src/manifest.py:20-35`; `orchestrator/job_runner.py:401-406`; `orchestrator/src/app.py:54-71`; `orchestrator/src/suno.py:61-107`; `orchestrator/src/csv_import.py:187-223`
- **Severity:** Medium
- **Confidence:** Certain
- **Description:** The codebase repeatedly reimplements small JSON read/write helpers, partial-failure behavior, and ad hoc schema loading. Some versions raise, some silently default, and some merge partial data structures manually.
- **Recommended action:** Standardize a small set of typed JSON/file helpers and make failure behavior explicit at the call site.

## Category G: Structural / Organizational Issues
### G1. `orchestrator/src/app.py` Is A 1,712-Line God Module
- **Location:** `orchestrator/src/app.py:1-1712`
- **Severity:** Critical
- **Confidence:** Certain
- **Description:** The gateway file owns FastAPI setup, CORS, 13 request models, workspace CRUD, imports, word editing, preset/voice management, stage execution, autopilot state machines, media serving, defaults, engine health, and Suno admin logic. This is too much surface area for one module and makes every backend refactor more expensive than it should be.
- **Recommended action:** Split the gateway into routers plus service modules, with request models living beside their router or in a dedicated API-schema package.

### G2. `orchestrator/job_runner.py` Is A 1,873-Line God Module Outside `src/`
- **Location:** `orchestrator/job_runner.py:1-1873`
- **Severity:** Critical
- **Confidence:** Certain
- **Description:** The job runner combines Supabase polling, OpenRouter enrichment, settings composition, stage orchestration, Suno recovery, storage upload, A/B publishing, and CLI process management in one root-level file. Its root placement also reinforces a separate packaging model from the rest of the orchestrator, and `main.py` hot-reloads only `src/`, not this file.
- **Recommended action:** Move the runner into the package and split it into polling, orchestration, enrichment, and publishing submodules.

### G3. Orchestrator Model Organization Keeps HTTP Schemas Fragmented
- **Location:** `orchestrator/src/app.py:147,307,312,316,321,324,677,683,726,769,1012,1312,1639`; `orchestrator/src/models.py:10-79`
- **Severity:** High
- **Confidence:** Certain
- **Description:** `models.py` contains manifest, workspace, and health models, but all request bodies for the HTTP API live inline inside `app.py`. There is not yet direct field drift between those two files, but the “shared models” module is not actually the source of truth for gateway contracts, which preserves the historical gateway-model problem in softer form.
- **Recommended action:** Move request/response schemas into a dedicated API models module and make `app.py` consume, not define, them.

### G4. Engine Package Boundaries Are Confusing And Packaging Is Brittle
- **Location:** `engines/concept-engine/ui/app.py:30-35`; `engines/image-engine/ui/app.py:30-46`; `engines/song-engine/ui/app.py:38-46`; `engines/video-engine/ui/app.py:30-47`; `orchestrator/job_runner.py:32-38`
- **Severity:** High
- **Confidence:** Certain
- **Description:** The engines depend on `sys.path.insert()` hacks to reach sibling `src` packages, while the orchestrator runner imports `from src...` from a root-level script and the gateway uses package-relative imports. That means module boundaries depend on execution context rather than a clean package layout.
- **Recommended action:** Normalize packaging so both orchestrator and engines can be imported and run without path mutation.

## Category H: Cloud Migration Friction Points
### H1. Local Windows Paths And Font Directories Are Hardcoded In Production Code
- **Location:** `orchestrator/job_runner.py:47`; `orchestrator/src/app.py:46,626`; `engines/assembly-engine/src/config.py:168`; `engines/assembly-engine/src/word_card.py:112`; `engines/bookend-engine/src/config.py:53`; `engines/bookend-engine/src/word_card.py:96`
- **Severity:** Critical
- **Confidence:** Certain
- **Description:** The backend defaults to local drive paths like `D:/CODING/ResonanceTEST/...` and direct Windows font folders like `C:/Windows/Fonts`. Those assumptions will break immediately in Linux containers, serverless workers, or any multi-host deployment.
- **Recommended action:** Replace hardcoded local paths with injected storage/runtime configuration and platform-neutral discovery.

### H2. Localhost And Fixed-Port Assumptions Are Baked Into Engine Communication
- **Location:** `orchestrator/src/dispatcher.py:15-39`; `engines/song-engine/src/engine.py:43-44`; `engines/song-engine/src/acestep_http.py:37-46`; `engines/song-engine/src/acestep_gradio.py:29-32`; `engines/song-engine/ui/app.py:82-95`
- **Severity:** Critical
- **Confidence:** Certain
- **Description:** The dispatcher falls back to `http://localhost:{port}` for every engine, and the song engine defaults to `127.0.0.1` Ace-Step backends. Those assumptions only work when everything runs on one machine with the same local network topology.
- **Recommended action:** Treat engine endpoints and third-party backends as required deploy-time configuration, not localhost fallbacks.

### H3. Inter-Stage Payloads Depend On A Shared Filesystem
- **Location:** `orchestrator/src/pipeline.py:311-470`; `orchestrator/src/pipeline.py:686-750`; `engines/video-engine/src/engine.py:172-190`; `engines/assembly-engine/src/engine.py:495-527`; `engines/bookend-engine/src/engine.py:55-58`
- **Severity:** Critical
- **Confidence:** Certain
- **Description:** The orchestrator hands engines local disk paths such as `image_path`, `end_image_path`, `song_path`, `video_clips`, and `assembled_video`, and the engines validate or open those paths directly. That is a same-host shared-disk contract, not a cloud-ready service contract.
- **Recommended action:** Move stage handoff toward object-storage references or streamed artifacts instead of host-local filesystem paths.

### H4. Environment Loading And Workspace Identity Assume One Repo Layout
- **Location:** `orchestrator/src/app.py:25,1247-1283`; `orchestrator/main.py:7`; `orchestrator/job_runner.py:30`; `orchestrator/scripts/backfill_suno_storage.py:26`; `engines/bookend-engine/src/config.py:7`; `engines/concept-engine/src/engine.py:18`; `engines/image-engine/src/config.py:12`; `engines/video-engine/src/config.py:15`
- **Severity:** High
- **Confidence:** High
- **Description:** Multiple modules call `load_dotenv()` independently, one script hardcodes a relative `.env` path, and the Suno trigger logic derives `user_id` and `deck_id` by parsing workspace folder names like `cloud_{user_id}_{deck_id}`. These patterns assume one shared checkout, one environment file story, and one naming convention across all services.
- **Recommended action:** Define one deployment configuration boundary and pass workspace identity explicitly instead of inferring it from local folder names.

### H5. Temp And Intermediate File Lifecycle Is Inconsistent
- **Location:** `engines/assembly-engine/src/engine.py:269-276`; `engines/bookend-engine/src/engine.py:251-269`; `engines/assembly-engine/ui/app.py:823-829`; `engines/concept-engine/ui/app.py:46-48`
- **Severity:** Medium
- **Confidence:** Certain
- **Description:** Assembly aggressively deletes `_temp`, bookend intentionally keeps `_intro.mp4`, `_outro.mp4`, and `_assembled_compat.mp4` for inspection, and several UI layers create temp/session output directories. That inconsistency will matter more in cloud environments where disk is ephemeral, capacity-limited, or shared across retries.
- **Recommended action:** Define a consistent retention policy for intermediates and make inspection-mode retention an explicit option.

## Cross-Cutting Observations
- The single biggest theme is contract drift. The orchestrator assumes a uniform engine contract, but the engine wrappers are the part of the repo where schemas, HTTP status semantics, and metadata behavior have diverged the most.
- The second biggest theme is duplicated orchestration. The same stage sequencing, settings layering, and storage update concerns are implemented in the gateway, the job runner, and engine wrappers instead of being centralized.
- The codebase still shows a strong local-workstation bias: shared filesystem payloads, Windows font paths, localhost defaults, and folder-name identity parsing are all reasonable for a local prototype but expensive to unwind later.
- The image engine is structurally ahead of the others in one respect: it already has deeper internal modularization (`storyboard.py`, `renderer.py`, `prompts.py`, `models.py`). That pattern is easier to migrate than the monolithic entrypoints still common in the other engines.
- I did not find obvious missed dead-code removals that look unambiguously accidental. The backward-compat branches I saw (`movie_override`, `frame_transitions`, `ltx` aliasing, similar shims) appear intentional and were not counted as dead-code misses.

## Prioritized Refactoring Roadmap (Suggested)
1. Freeze the engine contract first. Centralize request/response models, error schemas, and health schemas before moving any modules, because almost every other refactor depends on those contracts being explicit.
2. Split `orchestrator/src/app.py` and `orchestrator/job_runner.py` into routers/services and polling/orchestration modules. These are the two highest-risk concentration points and the main blockers to safe migration work.
3. Unify stage orchestration and settings resolution. One stage executor and one settings resolver will eliminate multiple current drift vectors at once.
4. Centralize infrastructure helpers next: Supabase/media upload logic, JSON/meta helpers, ffmpeg/font capability checks, and temp-file lifecycle policy.
5. Replace same-host assumptions last but deliberately: move engine handoff away from host-local paths, remove localhost fallbacks, and stop inferring cloud identity from workspace folder names.
