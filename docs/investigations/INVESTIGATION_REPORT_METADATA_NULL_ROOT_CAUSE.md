<!-- READ-ONLY diagnostic. No code changes, no commits. -->
<!-- Evidence-cited root-cause investigation of the null-metadata pattern. -->

# Investigation Report — `words.metadata` Null Root Cause

**Date:** 2026-04-21 00:02 local
**Mode:** Read-only. No code changes, no git writes. Report intended for Sir Robert's review only.

---

## 1. Root-cause finding

**The "bug" is almost certainly a deploy-lag artifact, not a runtime exception.** The aggregator caller was REMOVED by the 08e9726 refactor on 2026-04-18 23:07:49 +0800 and only RESTORED yesterday evening by commit 7c4cf1f at 2026-04-20 19:48:54 +0800. The 4 null-metadata words Sir Robert spot-checked — including `sultry` (id `3816484c-…`) — were virtually certainly generated inside that ~44-hour null window. There is no runtime exception being swallowed; there is no code block waiting to be repaired. Evidence: (a) the commit message on 7c4cf1f explicitly names the bug — *"collect_word_metadata was extracted to src/services/metadata.py but never reattached, leaving `words.metadata` null for every word post-refactor"*; (b) local reproduction of `collect_word_metadata()` against a real on-disk word directory and also against an empty and a nonexistent word directory succeeds in all three cases, returning a fully JSON-serializable dict with no raises — so even in worst-case environmental state the current restored block would not silently fail.

---

## 2. Scope confirmation (from prompt §2.1)

**I do not have Supabase access in this environment.** The `plugin:supabase:supabase` MCP server is installed but unauthenticated; I would need Sir Robert to initiate the OAuth flow, and that falls outside "read-only diagnostics." So I cannot confirm the null-vs-populated distribution from the DB side directly.

**What I can confirm from the prompt:** Sir Robert reports 4-of-4 recent completed words are null. **If the scope is literally 4-of-4**, and those 4 words were all generated before the deploy of 7c4cf1f landed on Railway, that's fully consistent with §1's root cause — no runtime bug required.

**Proposed verification** (Sir Robert runs this in Supabase SQL editor, 3 queries, no writes):

```sql
-- Q1: Distribution among recent complete words
SELECT COUNT(*) FILTER (WHERE metadata IS NULL) AS null_count,
       COUNT(*) FILTER (WHERE metadata IS NOT NULL) AS populated_count,
       COUNT(*) AS total
FROM public.words
WHERE status = 'complete' AND current_stage = 'complete'
  AND updated_at > now() - interval '7 days';

-- Q2: Is there a cutover in time? — null vs populated grouped by hour
SELECT date_trunc('hour', updated_at) AS hour,
       COUNT(*) FILTER (WHERE metadata IS NULL) AS null_cnt,
       COUNT(*) FILTER (WHERE metadata IS NOT NULL) AS pop_cnt
FROM public.words
WHERE status = 'complete' AND current_stage = 'complete'
  AND updated_at > now() - interval '7 days'
GROUP BY 1 ORDER BY 1 DESC;

-- Q3: Inspect one populated row if any exists
SELECT id, word, updated_at, metadata
FROM public.words
WHERE status = 'complete' AND metadata IS NOT NULL
ORDER BY updated_at DESC LIMIT 1;
```

**Expected result if §1's hypothesis is correct:** Q2 shows a transition: all null before some timestamp T, populated after T — where T is when Railway picked up the 7c4cf1f deploy. Q3 returns a row whose metadata shape matches the aggregator's output (see §5 below for the expected shape).

**Expected result if §1's hypothesis is wrong:** Q1 shows null on every row, including rows generated well after 2026-04-20 ~20:00 local. Q2 shows no cutover. Q3 returns no row. That would be World B — the block is deployed but failing silently on every run — and the next step would be Railway logs.

---

## 3. Swallowed warnings (from prompt §2.2)

Both warnings are emitted with `word_id` substituted via printf-style formatting. Exact log-message templates as they appear in the deployed code (after commit 7c4cf1f):

**Template 1** — aggregator raised: `src/orchestration/downstream_worker.py:719-722`
```
downstream_worker: metadata collection failed word=%s: %s
```
where `%s` #1 is the word's UUID and `%s` #2 is `str(exception)`. [downstream_worker.py:719-722](orchestrator/src/orchestration/downstream_worker.py#L719-L722)

**Template 2** — Supabase update raised: `src/orchestration/downstream_worker.py:746-749`
```
downstream_worker: metadata write failed word=%s: %s
```
Same substitution pattern. [downstream_worker.py:746-749](orchestrator/src/orchestration/downstream_worker.py#L746-L749)

**Railway log retrieval:** Sir Robert runs the search himself. Recommended grep strings:

- `"metadata collection failed"` — finds Template 1 hits.
- `"metadata write failed"` — finds Template 2 hits.

**Interpretation guide:**
- Zero hits of either + Q1 shows null ⇒ the block isn't running at all in production (deploy hasn't landed, or there's a prior early-return that skips it — unlikely since the word reached `status='complete'`).
- Many hits of Template 1 ⇒ aggregator raises in prod on something my local reproduction didn't exercise. Would need the exception text from one hit to locate.
- Many hits of Template 2 ⇒ Supabase-side issue (RLS, constraint, JSON serialization). Would need exception text.
- Mixed hits that start at a specific timestamp ⇒ regression from a later commit.

---

## 4. On-disk walk (from prompt §2.3)

For one representative locally-completed word, the on-disk layout matches the aggregator's expectations exactly:

Word directory: [content/cloud_ef7a3c72-69cf-42a6-8c5f-2592f99c56f7_c87fa38c-9832-4c98-b31a-163dca1e3c14/brutalitaet/](content/cloud_ef7a3c72-69cf-42a6-8c5f-2592f99c56f7_c87fa38c-9832-4c98-b31a-163dca1e3c14/brutalitaet/)

| Stage | What's on disk | `_STAGE_DIRS` expects | Match |
|-------|----------------|------------------------|-------|
| images | `images/auto-001_20260325T203400/generation-meta.json` | `word_dir/images/<versioned>/generation-meta.json` | ✅ |
| concept | `concept/generation-meta.json` (direct, not versioned) | falls through `_find_latest_meta`'s direct-file branch at [metadata.py:41-43](orchestrator/src/services/metadata.py#L41-L43) | ✅ |
| song | `songs/run-001_20260325T203609/generation-meta.json` | `word_dir/songs/<versioned>/...` | ✅ |
| video | `videos/ltx-fast-001_20260325T203623/generation-meta.json` | `word_dir/videos/<versioned>/...` | ✅ |
| assembly | `final/clean-001_20260325T203745/generation-meta.json` | `word_dir/final/<versioned>/...` | ✅ |
| bookend | `bookend/bookend-001_20260325T203755/generation-meta.json` | `word_dir/bookend/<versioned>/...` | ✅ |

**`STAGE_DIR_MAP`** at [pipeline.py:183-190](orchestrator/src/pipeline.py#L183-L190) matches `_STAGE_DIRS` at [metadata.py:17-24](orchestrator/src/services/metadata.py#L17-L24) exactly (`{concept: concept, song: songs, images: images, video: videos, assembly: final, bookend: bookend}`).

### Candidate walk (prompt §2.3 A-E)

- **Candidate A — path mismatch:** RULED OUT. Both sides use the same map (writer + reader share `STAGE_DIR_MAP` / `_STAGE_DIRS`).
- **Candidate B — argument mismatch:** RULED OUT. Call site at [downstream_worker.py:715-717](orchestrator/src/orchestration/downstream_worker.py#L715-L717) passes `(word_dir: Path, profile_used: str | None, pipeline_duration: float)`. `word_dir = workspace_path / word_slug` at [downstream_worker.py:661](orchestrator/src/orchestration/downstream_worker.py#L661), which is unambiguously a `Path`. `profile_used` is the return of `_read_profile_used()` ([line 783-804](orchestrator/src/orchestration/downstream_worker.py#L783-L804)) — `str | None`. `pipeline_duration` is `sum(timer.durations_ms().values()) / 1000.0` which produces `float`. Signatures line up with [metadata.py:71-75](orchestrator/src/services/metadata.py#L71-L75).
- **Candidate C — manifest read failure:** RULED OUT. The manifest read at [metadata.py:114-132](orchestrator/src/services/metadata.py#L114-L132) is wrapped in a `try: … except (FileNotFoundError, Exception): pass` — swallows every possible exception from manifest I/O. §5 reproduction confirms the aggregator returns a dict even with a nonexistent word_dir.
- **Candidate D — Supabase update fails on serialization:** RULED OUT on the primary input path. `json.dumps(result)` succeeds on both the all-stages output (length 1095 bytes) and after appending the `ab_takes` sub-dict (length 1166 bytes). Every returned value is strict JSON-primitive (str / int / float / bool / None / dict / list). No datetime, no Path, no set, no Pydantic object.
- **Candidate E — `ab_takes` collision with non-serializable values:** RULED OUT. `take_a` and `take_b` are set at [downstream_worker.py:509-510](orchestrator/src/orchestration/downstream_worker.py#L509-L510) as `takes[0]` / `takes[1]` from `_get_song_takes()` at [downstream_worker.py:768-781](orchestrator/src/orchestration/downstream_worker.py#L768-L781) — strings (e.g. `"run-001_20260325T203609/take_001.flac"`) or `None`. The `suno_ab` dict contents are used only via `"suno_a" if suno_ab else take_a` — the Manifest pydantic objects are never placed into `ab_takes` itself.

### New Candidate F — **deploy-lag (dominant hypothesis)**

Commit timeline (from `git log --format='%H %ai %s'`):

| Commit | Timestamp | Subject |
|--------|-----------|---------|
| 08e9726 | 2026-04-18 23:07:49 +0800 | `refactor(orchestrator): pipelined v4-final` — **DROPPED the aggregator call** |
| 2a404dd | 2026-04-20 13:53:26 +0800 | diag: workspace path observability for video stage failure |
| accad8b | 2026-04-20 14:57:11 +0800 | fix: two root-cause bugs blocking end-to-end pipeline |
| eeabff3 | 2026-04-20 19:37:20 +0800 | fix(voice-chat): bound Voxtral L0 character greeting |
| **7c4cf1f** | **2026-04-20 19:48:54 +0800** | **fix(orchestrator): restore mnemonic + metadata regressions from 08e9726** |
| 924f2e6 | 2026-04-20 19:56:53 +0800 | fix(enrichment): require base_language output for mnemonic and etymology |
| 20c86b4 | 2026-04-20 19:59:58 +0800 | fix(voice-chat): baseline Voxtral L0 dispatch |

Commit 7c4cf1f's own message says: *"collect_word_metadata was extracted to src/services/metadata.py but never reattached, leaving `words.metadata` null for every word post-refactor — the frontend 'Generation metadata not available' banner fires on that. Restored in downstream_worker._upload_and_complete between upload success and transition_stage->complete."*

Local `main` is up-to-date with `origin/main` (zero commits ahead or behind — `git log origin/main..HEAD` and `git log HEAD..origin/main` both empty). So origin/main has 7c4cf1f.

Current time is 2026-04-21 00:02 local. Commit 7c4cf1f was pushed ~4h14m ago. **Every word generated between 2026-04-18 23:07:49 and whenever Railway picked up 7c4cf1f has null metadata by design of the refactor, not by bug.** Sir Robert's spot-check of 4 null words is fully consistent with this being the entire story — provided those 4 words were generated before the Railway deploy.

### New Candidate G — deploy picked up 7c4cf1f but some runtime issue persists

Only material if §2's SQL queries show **null after the cutover hour T** too. I do not see a plausible path to this — aggregator is robust, Supabase update matches the pattern the publishing update uses successfully in the same function. Would require Railway log evidence to pursue.

---

## 5. Reproduction (from prompt §2.4)

Ran `collect_word_metadata()` from a local Python REPL (working dir `d:/CODING/ResonanceTEST/orchestrator`, `sys.path` prepended) against three inputs. Scratch REPL only — no files committed.

### Test 1 — Well-formed local word directory (all 6 stages on disk)
- Input: `content/cloud_…_c87fa38c-…/brutalitaet/`
- `word_dir.exists() = True`
- Result: **returned a dict without raising**; `stages_completed = ["images", "concept", "song", "video", "assembly", "bookend"]`
- Key fields populated correctly: `creative_direction="cinematic"`, `music_caption="tense dark ambient industrial, female vocal…"`, `images.count=3`, `song.takes=1`, `video.mode="ltx_fast"`, `assembly.lufs=-14.0`, `bookend.voice_id="Cqbq4nsuUe1we6J45miU"`, `bookend.tts_language="de"`, `lora.path="D:\\CODING\\RESONANCE\\loras\\de_male_schlager_v2\\epoch_100"`.
- `json.dumps(result)` succeeded — length 1095 bytes.
- After injecting `ab_takes`, `json.dumps` still succeeded — length 1166 bytes.

### Test 2 — Empty word directory with minimal manifest (simulates engines that wrote nothing)
- Input: freshly-created temp dir with a minimal `manifest.json` and no stage subdirectories
- Result: **returned a dict without raising**; `stages_completed = []`; dict has 14 keys; `bool(result) = True` (truthy — so the `if word_metadata:` guard at [downstream_worker.py:724](orchestrator/src/orchestration/downstream_worker.py#L724) would still fire the Supabase update).
- `json.dumps(result)` succeeded — length 608 bytes.

### Test 3 — Nonexistent word directory (`/nonexistent/path/ghost_word`)
- Result: **returned a dict without raising**; `stages_completed = []`; truthy. A `DIAG manifest.read failed` log line is emitted to stderr from [manifest.py:28-35](orchestrator/src/manifest.py#L28-L35), but the FileNotFoundError is swallowed by the `try: … except (FileNotFoundError, Exception): pass` at [metadata.py:115-132](orchestrator/src/services/metadata.py#L115-L132).

**Conclusion from reproduction:** the aggregator is extremely defensive. There is no realistic on-disk state where it raises AND every serialization-testable output is safe to feed to Supabase. If the aggregator block is running in production and raising, the exception would be something not tied to on-disk shape (e.g. `asyncio.CancelledError`, `MemoryError`, or a runtime import error), which Railway logs would surface via Template 1 of §3.

---

## 6. Supabase-side isolation (from prompt §2.5)

**Not performed.** I don't have Supabase credentials or tool access in this session. Sir Robert runs this himself if §2's query shows universal-null (including post-cutover):

```sql
-- Dry-write + readback + revert (service_role)
UPDATE public.words SET metadata = '{"__diag_test": true}'::jsonb
WHERE id = '3816484c-ed0d-426b-8cc6-2f796710baa3';

SELECT id, metadata FROM public.words
WHERE id = '3816484c-ed0d-426b-8cc6-2f796710baa3';

UPDATE public.words SET metadata = NULL
WHERE id = '3816484c-ed0d-426b-8cc6-2f796710baa3';
```

If the write succeeds and the readback shows `{"__diag_test": true}`, the column + RLS + type accept JSONB writes normally — the update path is not the problem. If the write fails, the error text points to the actual issue (trigger, type coercion, RLS block).

---

## 7. Column constraints (from prompt §2.6)

Inspected [frontend/supabase/migrations/20260325000000_admin_content_columns.sql](orchestrator/frontend/supabase/migrations/20260325000000_admin_content_columns.sql):

```sql
ALTER TABLE public.words ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT NULL;
```

**No CHECK constraint, no trigger, no column-specific RLS.** Plain JSONB column with default NULL. Row-level UPDATE is gated by the same `"Users update own words" USING (user_id = auth.uid() OR public.is_admin())` policy at [20260322210000_phase2a_tables.sql:196-201](orchestrator/frontend/supabase/migrations/20260322210000_phase2a_tables.sql#L196-L201) that also gates `video_url` updates — and those clearly succeed (video_url is populated on the null-metadata rows). Since the worker uses the service_role key, RLS is bypassed anyway.

**Grep for any trigger on `words`** across migrations: none found that touch `metadata`.

**Column constraints are not the cause.**

---

## 8. Recommended fix direction (no implementation)

**Primary action — verify deploy:** Before writing any code, Sir Robert confirms whether commit 7c4cf1f is actually running on Railway. The fastest check: generate one new word after the most recent deploy, wait for `status='complete'`, then `SELECT metadata FROM words WHERE id = <new_id>`. If populated → §1's hypothesis is correct, the fix was already shipped and the null rows are historical artifacts. If still null → §2's SQL cutover query plus §3's Railway log grep identify the actual runtime exception, which is a different class of fix (depends on the exception text).

**Secondary action — frontend UX stopgap (only if Sir Robert wants it now, separate work):** The WordDetailPanel "Generation metadata not available" banner fires indiscriminately for every pre-7c4cf1f word. If that banner is loud, the panel could gracefully render the basic fields (status, video URLs) without the metadata-derived deep-dive. That's a pure frontend change, totally independent of this investigation.

**No backfill:** Historical pre-7c4cf1f words would require re-running `collect_word_metadata()` against each word's still-existing on-disk state (if workspace cleanup didn't run). I do not recommend attempting that — it's uncosted and the data is derivable only for words whose workspaces still exist.

---

## 9. Open questions for Sir Robert

O-1. **When were the 4 null-metadata words generated?** If all `updated_at` timestamps fall before the Railway deploy of 7c4cf1f, §1's hypothesis is confirmed and no further action is needed. The SQL at §2 answers this.

O-2. **When did Railway deploy 7c4cf1f?** This is the cutover timestamp T. Railway's deployment dashboard has it; `origin/main` HEAD is `20c86b4` (2026-04-20 19:59:58), which is 3 commits past 7c4cf1f, so if the latest deploy succeeded it includes the restoration.

O-3. **Does Railway have auto-deploy on `main`?** If yes, T is roughly the push time of `20c86b4` (4h ago from now). If no, T is later — whenever a manual deploy was triggered.

O-4. **Has any new word been generated since the suspected deploy?** If yes, spot-check its metadata column. One data point resolves the whole question.

O-5. **Do I have permission to authenticate the Supabase MCP plugin in a future session** to do these checks directly, rather than handing Sir Robert SQL to run? Not required for this investigation; useful for the next one.

---

**Report complete. Stopping per prompt §5. No fix implemented, no code touched, no commits made.**
