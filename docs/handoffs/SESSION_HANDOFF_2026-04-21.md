# SESSION HANDOFF — 2026-04-21 — PARALLELISM VALIDATED + METADATA/MNEMONIC REGRESSIONS FIXED

## TL;DR

**The pipelined orchestrator refactor is validated in production.** Three-word single-account test and two-account concurrent test both succeeded — upstream stages interleave across words and across users, video dispatcher serializes correctly at the pod, downstream runs in parallel.

**Two regressions discovered and fixed** — both caused by the 2026-04-18 refactor (08e9726) dropping two post-stage hooks from the dissolved `job_runner.py`:
1. `words.metadata` jsonb empty for all new words → `collect_word_metadata` call lost in `_upload_and_complete`.
2. Mnemonic written in English instead of base_language → post-images `mnemonic_text` writeback lost in upstream worker.

**Plus one latent bug surfaced and fixed** — enrichment system prompt never specified `{base_language}` for mnemonic or etymology fields, so etymology has always been in English for everyone. Masked for mnemonic by the storyboard override until the override itself broke.

All three fixes shipped. Metadata payload confirmed healthy end-to-end on a live generation.

**Note on cross-chat work:** The enrichment prompt implementation and the two hook restorations were implemented in a parallel chat (originally scoped for admin dashboard work). Diagnosis, investigation scoping, implementation prompts, and architectural decisions were driven from this chat. Commit history is what matters — the work is done regardless of which chat drove which agent.

---

## What shipped this session

### Commit (restored hooks — parallel chat, main)
- `src/orchestration/upstream_worker.py` — `_post_images_mnemonic_writeback()` added, dispatched at end of `_run_upstream_stage` when `stage == "images"`. Reads `storyboard.json#mnemonic_text`, writes to `words.mnemonic` and `manifest.enrichment.mnemonic`. Verbatim mirror of pre-refactor `08e9726^:job_runner.py` lines 326-347.
- `src/orchestration/downstream_worker.py` — `collect_word_metadata` import + call inside `_upload_and_complete`, between upload and `transition_stage → complete`. New `_read_profile_used(deck_id)` helper added mirroring `_bump_job_words_completed` pattern. Metadata annotated with `ab_takes` before write. Both collection and write failures swallowed with `log.warning` (matches pre-refactor).

### Commit `924f2e6` (enrichment prompt language fix, main)
- `src/services/enrichment.py` — mnemonic and etymology field specs now explicitly require output in `{base_language}`. Mirrors how translation already specified language. Two-line change. `{base_language}` was already being interpolated; no new plumbing.

### Non-blocking acknowledged trade-off
- `pipeline_duration` in metadata now reflects downstream portion only (timer is per-worker in the refactored architecture). Pre-refactor had true end-to-end wall-clock. Field is populated; precision is slightly reduced. Full end-to-end duration is its own ticket, out of scope for regression restoration.

---

## Evidence of success

### Parallelism test #1 (single account, three words — `pond`, `eyes`, `feeling fine`)
- Upstream fired across all three words in parallel; storyboards generated sequentially but overlapping upstream API calls for the other two
- Video dispatcher served clips at steady ~85s intervals with no drain gap between words
- All three words completed end-to-end
- Orchestrator feeder and queue depth logs behaved as designed

### Parallelism test #2 (two accounts, concurrent submissions)
- **Result: successful**
- Feeder bootstrapped both jobs from different user_ids
- Upstream workers interleaved words from both accounts
- Video dispatcher serialized at the pod as expected (single-slot discipline)
- No cross-user collisions, no dropped jobs, no duplicate generations

### Metadata regression fix verified on live generation
Representative metadata payload from a post-fix generation:
```json
{
  "lora": null,
  "song": {"takes": null, "duration_seconds": null},
  "video": {"mode": "ltx_fast", "duration_seconds": 91.79},
  "images": {"count": 3, "model": "wan/2-7-image", "refusals": 0, "duration_seconds": 79.65},
  "bookend": {"voice_id": "goT3UYdM9bhm0n2lmKQx", "tts_language": "en", "duration_seconds": 7.62},
  "concept": {"caption_source": "storyboard", "duration_seconds": 0.11},
  "ab_takes": {"a": "suno_a", "b": "suno_b"},
  "assembly": {"lufs": null, "duration_seconds": 14.49, "final_video_duration_seconds": 17.54},
  "art_style": "surrealism",
  "profile_used": "English1",
  "music_caption": "quirky tense jazz, male vocal singing in English, clarinet and piano, 105 BPM, clear diction",
  "movie_reference": null,
  "stages_completed": ["images", "concept", "video", "assembly", "bookend"],
  "creative_direction": "provocative",
  "pipeline_duration_seconds": 333.62
}
```
All expected fields populated: creative_direction, art_style, music_caption, per-stage timings, pipeline_duration, ab_takes. Frontend Admin → Content modal should now render the full Generation Metadata card again.

---

## Key architectural findings from this session

### Enrichment is NOT dead weight, as initially hypothesized
- Enrichment produces five fields in one LLM batch call: translation, pos, article, mnemonic, etymology.
- Only mnemonic is overwritten by storyboard. The other four are load-bearing.
- Enrichment is the **fallback** — it runs FIRST (before images), so every word has a mnemonic+etymology even if the storyboard fails or returns a too-short `mnemonic_text`.
- For phrases, enrichment is the ONLY mnemonic source (storyboard does not produce `mnemonic_text` for phrases).
- Cost: enrichment ≈ 700 tokens/word total (mnemonic portion ~70 tokens, ~1% of per-word budget). Not worth optimizing.

### Pipeline stage order (verified, authoritative)
`enrichment (bootstrap) → images → concept → song → video → assembly → bookend`
Enrichment runs before images. Storyboard mnemonic override fires AFTER images if `mnemonic_text` is present and >10 chars. This is why the English enrichment mnemonic was masked pre-refactor — the override was hiding the latent bug.

### The English etymology was always a bug, not a feature
- Pre-refactor, users saw German mnemonics because of the storyboard override.
- Etymology has always been in English because nothing overrides it.
- Nobody noticed because the mnemonic felt like "the German one" and etymology was secondary.
- Now fixed at the source — enrichment prompt explicitly specifies `{base_language}` for both fields.

### Phrase blanking is intentional and documented
`pipeline.py:277-278` comment: "Phrases skip enrichment context — etymology/mnemonic are nonsensical for phrases." Applied in both `build_concept_payload` and `build_image_payload`. This blanking decision predates phrase-mode and was written when "phrase" meant only sentence-level inputs, not compound nouns.

### Phrase detection is primitive
Single `" " in word.strip()` check at four call sites (feeder.py:557 and three others). No override, no metadata, no language-aware logic. Compound nouns like "hot dog", "kindergarten teacher", "helicopter pilot" are all treated as phrases and inherit the blanking. This is a real UX issue, parked as a separate ticket.

---

## Key learnings

1. **Cross-chat scope drift happened. Cleanly.** Investigation/diagnosis work started in this chat; implementation agents were dispatched from a parallel chat originally scoped for admin dashboard. No data was lost, work got done, but the commit ownership doesn't match the thinking ownership. For future: either keep the whole ticket in one chat, or be deliberate about which chat drives which agent.

2. **The "is this dead weight?" instinct was wrong but worth asking.** The investigation correctly identified enrichment's role as a fallback and flagged that removing it would break phrases + failure modes. Avoided a premature architectural simplification that would have broken production.

3. **A latent bug can hide behind another bug.** English etymology was a two-year-old bug that nobody noticed because the storyboard override made mnemonics look correct. When the override broke, both bugs surfaced together, which made the diagnosis look refactor-caused when only one of them actually was. Checking git blame on the suspect code (via the investigation agent's byte-identical comparison to `_spotcheck/resonance-cloud/src/services/enrichment.py`) disambiguated "refactor regression" from "pre-existing."

4. **Investigation-first paid off again.** Claude (this chat) guessed at column names (`creative_direction`, `mother_tongue`) at one point and was correctly called out. Switching to `information_schema` queries produced actual ground truth. When schema is unknown, route to agents with codebase access or query the catalog directly — never guess.

5. **The admin dashboard work stream is the real unlock.** Everything in this chat was regression cleanup. Forward motion on content quality (static third clip, seafood image for "feeling fine", storyboard prompt tuning) needs per-word LLM call visibility.

---

## What's on the horizon (ordered by priority)

### Priority 1: Compound noun detection (English-first, this is the next workstream)
Starting prompt ready — see `STARTING_PROMPT_COMPOUND_NOUN_DETECTION.md` (separate file, companion to this handoff). Scope: when an input has a space but is a semantic single concept ("hot dog", "kindergarten teacher", "ice cream"), treat it as a word — run the full enrichment + mnemonic + etymology pipeline and surface information card content. Leave phrase handling untouched for actual phrases and idioms.

### Priority 2: Admin dashboard (parallel chat, already in flight)
Already being built in another chat. Unblocks content-quality diagnosis for everything else.

### Priority 3: Queue position & ETA feature (briefing drafted, agent ready to dispatch)
Briefing prompt written earlier this session. Investigation-first scope — agent produces a data-model + UX proposal before any code moves. Can dispatch whenever bandwidth opens.

### Priority 4: Verify adversarial review for `924f2e6`
Two-line scope. Low risk. Standard discipline — different agent verifies change is scoped correctly. Not blocking, but finishes the loop.

### Priority 5: Content quality backlog (pending admin dashboard)
- Static Scene 3 clips (root cause unknown without per-scene prompt visibility)
- Storyboard producing seafood images for "feeling fine" (prompt tuning)
- Scene 3 image duplication/distortion (Wan conditioning investigation from earlier)
- Phrase song duration (~14s, too short — richer lyrics needed)
- LLM picker sophistication for advanced learners (don't just repeat the word three times)

### Priority 6: Pipeline infrastructure backlog
- Remove DIAG logging from `2a404dd` after a couple more successful generations
- Clean up dead Railway env vars (`RUNPOD_API_KEY`, `RUNPOD_DOCKER_IMAGE`, etc.)
- Workspace persistence on Railway (`/data` mount vs `/tmp/resonance/workspaces` tmpfs — not blocking but a real risk under restart)
- Port working pod code into `ltx-worker` repo (Docker Hub image stale)
- True end-to-end `pipeline_duration` mechanism (regression trade-off acknowledgment)

### Priority 7 (longer horizon)
- Retry pipeline surgery (currently recreates the full pipeline from scratch instead of resuming — wastes image/song generation on retries)
- Stripe payments
- iOS Capacitor wrapper

---

## Git state at session end

| Repo | Branch | Last commit | Status |
|------|--------|-------------|--------|
| `lokigod69/resonance-cloud` | main | `924f2e6` | Deployed via Railway auto-deploy |
| `lokigod69/ltx-worker` | main | `22c837d` | Stale vs. live pod code (Priority 6 ticket) |

## Supabase state at session end

- Queue: unpaused, auto_approve=true
- `words.current_stage` has DEFAULT 'pending' (applied 2026-04-20)
- Two-account test words in DB, all completed successfully
- Latest generation has full `metadata` jsonb — regression confirmed fixed

## Pod state at session end

- wet_pink_crawdad still running on L40S 48GB
- Savings plan covers ~3 months
- BF16 distilled i2v pipeline, serving at ~85-92s per 5-second 1080p clip
- No action needed

---

## One final note

Tonight's chat started on parallelism validation and ended with three bugs fixed and one architectural misconception corrected. The pipelined orchestrator thesis is validated: GPU stays saturated across words, across users, no drain gap. The product is genuinely alive and working — the remaining work is content quality (admin dashboard unlocks this), UX polish (queue position), and a handful of architectural edges (compound nouns, phrase-mode information cards, retry pipeline surgery).

Next chat: compound noun detection. Starting prompt below.
