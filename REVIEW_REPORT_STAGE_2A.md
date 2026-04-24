# REVIEW REPORT - Stage 2 Phase A Identity Plumbing

## 1. Overall verdict

**FAIL**

I do not recognize this implementation as my own work. The actual live diff under review is the uncommitted working tree in `D:\CODING\ResonanceTEST\orchestrator`; the prompt file named in the request was not present there, so I reviewed against the request text plus the live diff. The identity plumbing itself is mostly correct in `src/pipeline.py` and the four metadata models, but the working diff is **six files, not five**, because `src/services/events.py` was also modified. That violates the Phase 2A hard-no scope and introduces non-plumbing behavior changes in the existing Stage 1 observability path. I also found a smaller consistency issue in `BookendMetadata`, and I could not complete the required live Supabase/FFmpeg acceptance from this shell.

## 2. Ten-point checklist results (Section 3)

**3.1 - PASS**  
`src/pipeline.py` has exactly four modified builder bodies in the working diff: `build_image_payload()` (`src/pipeline.py:271-318`), `build_video_payloads()` (`src/pipeline.py:321-485`), `build_assembly_payload()` (`src/pipeline.py:744-803`), and `build_bookend_payload()` (`src/pipeline.py:806-842`). `build_concept_payload()` remains untouched by this diff and serves as the reference pattern at `src/pipeline.py:197-241`.

**3.2 - PASS**  
The reference pattern is present in `build_concept_payload()` at `src/pipeline.py:218-240`: `identity = manifest_data.identity or {}` followed by five `.get()` extractions. The same pattern appears in `build_image_payload()` at `src/pipeline.py:294-316`, `build_video_payloads()` at `src/pipeline.py:332-388` and `src/pipeline.py:479-483`, `build_assembly_payload()` at `src/pipeline.py:777-801`, and `build_bookend_payload()` at `src/pipeline.py:818-840`.

**3.3 - PASS**  
Each of the four engine metadata models gained exactly five optional fields with defaults: `word_id`, `deck_id`, `user_id`, `job_id`, `attempt`. See `cloud_engines/image_engine/models.py:217-229`, `cloud_engines/video_engine/models.py:95-110`, `cloud_engines/assembly_engine/models.py:120-133`, and `cloud_engines/bookend_engine/models.py:61-71`. No required field was added.

**3.4 - PASS**  
`ConceptMetadata` uses `str | None` / `int | None` for the identity fields at `cloud_engines/concept_engine/models.py:100-115`. All four modified models match that style exactly: `cloud_engines/image_engine/models.py:223-228`, `cloud_engines/video_engine/models.py:101-108`, `cloud_engines/assembly_engine/models.py:126-131`, and `cloud_engines/bookend_engine/models.py:65-69`.

**3.5 - PASS**  
There is no tracked diff in `src/services/metadata.py`, and `collect_word_metadata()` remains at `src/services/metadata.py:71-195`. Its downstream caller is unchanged at `src/orchestration/downstream_worker.py:715-717`.

**3.6 - FAIL**  
`src/services/events.py` is modified, which directly violates the hard-no list. The changes are substantive, not cosmetic: new async dispatch and credential fallback were added at `src/services/events.py:29-76`, event writes were rerouted through `_submit_write()` at `src/services/events.py:171-172` and `src/services/events.py:300-301`, and orphan-storage cleanup was added at `src/services/events.py:357-367`. I did not find new `src.services.events` imports or `logged_llm_call` / `logged_api_call` / `write_event_row` calls in the five plumbing files, but this checklist item still fails because the event helper itself changed.

**3.7 - PASS**  
`git diff --name-only -- cloud_engines` lists only `cloud_engines/assembly_engine/models.py`, `cloud_engines/bookend_engine/models.py`, `cloud_engines/image_engine/models.py`, and `cloud_engines/video_engine/models.py`. The modified code is confined to the metadata classes at `cloud_engines/image_engine/models.py:217-229`, `cloud_engines/video_engine/models.py:95-110`, `cloud_engines/assembly_engine/models.py:120-133`, and `cloud_engines/bookend_engine/models.py:61-71`. No tracked diff exists under any `engine.py`, `renderer.py`, `storyboard.py`, or `adapters/` path.

**3.8 - PASS**  
`git diff --name-only -- src/suno.py src/services/suno_bakein.py frontend src/orchestration src/services/metadata.py` returns no tracked changes. The tracked diff is limited to `src/pipeline.py`, the four engine `models.py` files, and `src/services/events.py`. No tracked Suno-path, queue-positioning, admin-pin, or frontend code changes are present in the diff.

**3.9 - PASS**  
`build_video_payloads()` extracts `identity` once at the top of the function (`src/pipeline.py:330-332`) and reuses that same dict in both the text-to-video loop (`src/pipeline.py:377-388`) and the standard image-to-video loop (`src/pipeline.py:472-483`). `scene_number` still varies per payload (`src/pipeline.py:367` and `src/pipeline.py:440`, then `src/pipeline.py:383` and `src/pipeline.py:478`), while identity stays constant.

**3.10 - FAIL**  
The working diff changes existing event-emission behavior in `src/services/events.py`, so Phase 2A is no longer "pure plumbing" with unchanged event behavior. Specifically, `_get_client()` now falls back from `SUPABASE_SERVICE_KEY` to `SUPABASE_KEY` (`src/services/events.py:45-53`), writes are now fire-and-forget when an event loop is running (`src/services/events.py:62-76`, `src/services/events.py:171-172`, `src/services/events.py:300-301`), and failed inserts now trigger storage cleanup (`src/services/events.py:357-367`). I could not run the required live DB row-count verification from this shell, but the code already violates the "no new event behavior" constraint.

## 3. Additive-safety verification (Section 4)

**Test scope**

Repository test search found orchestration coverage around `run_stage` and `read_manifest`, but not direct coverage for the four payload builders or the four metadata models.

- `tests/test_orchestration_integration.py:27-67` stubs `src.pipeline.run_stage` and `src.manifest.read_manifest`.
- `tests/test_orchestration_timers.py:35-67` stubs `src.pipeline.run_stage` and `src.manifest.read_manifest`.
- `tests/test_orchestration_worker_retries.py:107-119` stubs `src.manifest.read_manifest`, and additional `run_stage` stubs appear elsewhere in that file.
- `tests/test_orchestration_music_state.py:336-369` and `tests/test_orchestration_music_state.py:461` also touch `read_manifest`.
- Repo-wide test search found **no test references** to `build_image_payload`, `build_video_payloads`, `build_assembly_payload`, `build_bookend_payload`, `ImageMetadata`, `VideoMetadata`, `AssemblyMetadata`, `BookendMetadata`, or `collect_word_metadata`.

**Events helper coverage**

There is direct coverage for the existing event helper in `tests/test_events_helper.py:1-301`, and that file passes. However, those tests still do **not** exercise the new running-loop executor path, the new `SUPABASE_KEY` fallback, or the new orphan-delete cleanup path. The current tests monkeypatch `_get_client()` directly at `tests/test_events_helper.py:62-66`, and the exercised call sites are synchronous (`tests/test_events_helper.py:73-102`, `tests/test_events_helper.py:247-301`).

**Test execution**

- Implementer's selected test file: `python -m pytest tests/test_concept_lyric_levels.py` -> **29 passed**.
- Direct events helper check: `python -m pytest tests/test_events_helper.py` -> **11 passed**.
- Raw full suite: `python -m pytest` -> **collection error before execution** because `tests/manual/test_pod_manager.py` hard-asserts `RUNPOD_API_KEY`.
- Automated subset: `python -m pytest tests --ignore=tests/manual` -> **137 collected, 135 passed, 2 failed**.
- The two automated failures are both in `tests/test_orchestration_music_state.py`, and both assert the old workspace path behavior (`tests/test_orchestration_music_state.py:177-180` and `tests/test_orchestration_music_state.py:273-277`). They appear unrelated to the Phase 2A diff, but the branch is still not green from a plain automated pytest run.

**CI verification**

I did not find repo-level CI configuration under `.github/workflows`, `tox.ini`, `noxfile.py`, `pytest.ini`, CircleCI, Azure Pipelines, or GitLab CI. If the intended CI is simply "run pytest", it would currently fail at collection on the manual RUNPOD test, and the automated subset is also not clean.

## 4. Implementation quality review (Section 5)

**5.1 - PASS**  
The four builders use the same identity plumbing pattern as `build_concept_payload()`: one `identity = manifest_data.identity or {}` assignment and five `.get()` lookups. See `src/pipeline.py:218-240` for the concept reference and `src/pipeline.py:294-316`, `src/pipeline.py:332-388`, `src/pipeline.py:479-483`, `src/pipeline.py:777-801`, `src/pipeline.py:818-840` for the modified builders.

**5.2 - FAIL**  
The new identity fields are **not** positioned consistently across the four models. `ImageMetadata`, `VideoMetadata`, and `AssemblyMetadata` place them immediately after `timestamp` (`cloud_engines/image_engine/models.py:223-229`, `cloud_engines/video_engine/models.py:101-109`, `cloud_engines/assembly_engine/models.py:126-132`), matching the concept style (`cloud_engines/concept_engine/models.py:108-115`). `BookendMetadata` instead places them before `assembly_version` and before `timestamp` (`cloud_engines/bookend_engine/models.py:61-71`).

**5.3 - FAIL**  
There is gratuitous, out-of-scope scope creep in `src/services/events.py`. The added imports, caching, credential fallback, async executor dispatch, and orphan cleanup at `src/services/events.py:29-76`, `src/services/events.py:171-172`, `src/services/events.py:300-301`, and `src/services/events.py:357-367` broaden the diff well beyond "identity plumbing only".

**5.4 - PASS**  
Within the five intended plumbing files, I did not find stale or misleading docstring/comment edits. The builder/model changes are minimal and self-explanatory. The problematic comments are in `src/services/events.py`, which is already out of scope and covered in 3.6 / 5.3.

**5.5 - PASS**  
`build_video_payloads()` correctly applies the new identity fields in both branches: the text-to-video branch at `src/pipeline.py:341-388` and the standard image-to-video branch at `src/pipeline.py:412-483`.

## 5. Live acceptance status (Section 6)

**6.1 - UNVERIFIABLE from my shell**  
I do not have a Supabase MCP plugin in this environment, I do not have confirmed live provider credentials, and I did not generate a new end-to-end word from this shell. Sir Robert should run one fresh generation, then run:

```sql
SELECT id, word, created_at FROM public.words
WHERE created_at > now() - interval '1 hour'
ORDER BY created_at DESC
LIMIT 5;
```

Then inspect these files on disk for the newest word:

- `content/cloud_<user>_<deck>/<word_slug>/images/<latest>/generation-meta.json`
- `content/cloud_<user>_<deck>/<word_slug>/videos/<latest>/generation-meta.json`
- `content/cloud_<user>_<deck>/<word_slug>/final/<latest>/generation-meta.json`
- `content/cloud_<user>_<deck>/<word_slug>/bookend/<latest>/generation-meta.json`

Expected metadata keys in each:

```json
{
  "word_id": "<uuid>",
  "deck_id": "<uuid>",
  "user_id": "<uuid>",
  "job_id": "<uuid>",
  "attempt": null
}
```

**6.2 - UNVERIFIABLE from my shell**  
Sir Robert should run:

```sql
SELECT stage, sub_step, COUNT(*) AS cnt
FROM public.pipeline_events
WHERE word_id = '<new_word_id>'
GROUP BY stage, sub_step
ORDER BY stage, sub_step;
```

Expected: Stage 1 row types only. No `images`, `video`, `assembly`, or `bookend` stage rows. Because `src/services/events.py` changed, this check is especially important.

**6.3 - UNVERIFIABLE from my shell**  
I did not have a suitable pre-Phase-2A / post-Phase-2A matched generation pair and did not re-run a word with provider access. Sir Robert should compare content streams, not container bytes:

```bash
ffmpeg -i old.mp4 -map 0:v -f md5 -
ffmpeg -i new.mp4 -map 0:v -f md5 -
ffmpeg -i old.mp4 -map 0:a -f md5 -
ffmpeg -i new.mp4 -map 0:a -f md5 -
```

Both video-stream MD5s must match each other, and both audio-stream MD5s must match each other.

## 6. Findings requiring fix before merge

1. **Blocker** - `src/services/events.py` was modified even though Phase 2A explicitly forbids event-helper/instrumentation work. This is not a harmless refactor. The diff widens credential fallback (`src/services/events.py:45-53`), changes write timing by offloading from synchronous calls to fire-and-forget executor work (`src/services/events.py:62-76`, `src/services/events.py:171-172`, `src/services/events.py:300-301`), and adds a new storage side effect on failed inserts (`src/services/events.py:357-367`). That means Phase 2A is no longer pure identity plumbing with zero behavior change.

2. **Low** - `BookendMetadata` does not match the placement/order used by `ConceptMetadata`, `ImageMetadata`, `VideoMetadata`, and `AssemblyMetadata`. It declares identity fields before `assembly_version` and `timestamp` (`cloud_engines/bookend_engine/models.py:61-71`) instead of immediately after `timestamp` like the others (`cloud_engines/concept_engine/models.py:108-115`, `cloud_engines/image_engine/models.py:223-229`, `cloud_engines/video_engine/models.py:101-109`, `cloud_engines/assembly_engine/models.py:126-132`). This is not a functional blocker by itself, but it is an avoidable schema inconsistency in a supposedly surgical diff.

## 7. Minor notes for Sir Robert (not requiring fix)

1. The file `IMPLEMENTATION_PROMPT_STAGE_2_PHASE_A_IDENTITY_PLUMBING.md` was not present in the live implementation repo root, so I reviewed against the request text and the working diff instead.

2. The workspace contains multiple copies of the repo (`_review/resonance-cloud`, `_spotcheck/resonance-cloud`, and `orchestrator`). The actual uncommitted Phase 2A diff is in `D:\CODING\ResonanceTEST\orchestrator`; the nested `_review/resonance-cloud` copy does **not** contain this plumbing diff.

3. There is at least one unrelated untracked frontend file in the worktree, `frontend/supabase/migrations/20260422000000_pipeline_events_fk_set_null.sql`. It is not part of `git diff`, but it is easy to accidentally stage later.

## 8. Adversarial self-review

1. I could not execute the live Supabase / FFmpeg acceptance checks, so my strongest conclusions come from code-scope review and local test execution, not from production-equivalent runtime evidence.

2. The repo layout is messy: the requested repo name and the actual modified worktree did not line up cleanly, and the named implementation prompt file was missing. I chose `D:\CODING\ResonanceTEST\orchestrator` because it is the only git worktree with the claimed uncommitted Phase 2A diff, but if Sir Robert intended a different worktree, this review should be re-run there.

3. The two failing automated tests in `tests/test_orchestration_music_state.py` look unrelated to Phase 2A, and I treated them as branch-safety context rather than proof that the plumbing diff broke behavior. That is a judgment call; a stricter reviewer could insist on a fully green automated suite before any merge, regardless of fault.

4. I may be slightly stricter than necessary on `BookendMetadata` field order because it is a consistency problem more than a behavioral bug. The `src/services/events.py` scope violation is the real blocker.
