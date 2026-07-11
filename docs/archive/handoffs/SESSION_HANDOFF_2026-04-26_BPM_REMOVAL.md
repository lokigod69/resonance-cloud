# SESSION HANDOFF — 2026-04-26 — BPM Removal from Music Caption Pipeline

## Session Summary

Removed BPM from the music caption pipeline end-to-end. New generations no longer emit BPM in any caption surface (storyboard LLM output, Concept Engine fallback prompts, Suno `style` field, WordCard "Music" row). Defensive runtime regex strips added in two locations to catch any LLM drift. Adversarial review found the runtime strip wiring was on the write path, not serve path — addressed via one-shot Supabase backfill rather than additional code.

Commit `0647969` shipped to `main`. BPM work closed.

Also resolved during session: Wedding word "Failed to generate" mystery (root cause was Railway redeploy mid-pipeline from an unrelated frontend push, not a code regression — handed to retry-button agent as canonical use case). Multi-agent git protocol updated in memory: removed the rebase ritual, switched to commit-only-touched-files + push + pull-on-rejection, marked solo-on-main as current workflow with dev/main split planned for test user release.

---

## Commits

| SHA | Summary |
|-----|---------|
| `0647969` | BPM removed from storyboard prompt, all four Concept Engine caption variants, defensive regex strip in `suno.py`, write-path strip in `services/metadata.py`. |

Pushed directly to `main`, fast-forward, no rebase. Codex worktree on `codex/glassy-deck-controls` left untouched throughout.

---

## What changed

### Prompt edits (forward-direction fix)

| File | Change |
|------|--------|
| `cloud_engines/image_engine/prompts.py` (lines 1278–1292) | BPM stripped from both example captions in `MUSIC CAPTION (REQUIRED)` block. New rule added: `Do NOT include BPM, tempo, or numeric values — describe energy through mood words instead`. |
| `cloud_engines/concept_engine/caption.py` (4 prompt variants) | Vocal-forward auto/manual + production auto/manual: `at BPM` removed from format specs, BPM removed from all examples, `BPM range: 80-140` and `Lead with genre and BPM` rules deleted, `Do NOT include BPM or numeric tempo values` added to each. "Lead with genre" instruction retained per spec. |

### Runtime strips (defensive net)

| File | Change |
|------|--------|
| `src/suno.py` (around line 142) | BPM regex strip added immediately after the existing `clear diction` strip, before the Bisaya/Cebuano → Filipino remap. Handles `at 120 BPM`, `120 BPM`, `120-130 BPM` ranges, `120bpm` no-space, any case. Cleans dangling commas. |
| `src/services/metadata.py` (lines 19–30, called at line 164) | Same strip applied in `collect_word_metadata`, which runs once per word at upload time as part of `DownstreamWorker._upload_and_complete`. **Note:** This is the WRITE path, not a serve path — captions get stripped before being written to Supabase, but already-stored rows are not retroactively fixed by code. |

### Supabase backfill (one-shot remediation for old artifacts)

Adversarial review surfaced that the `metadata.py` strip is write-time, not serve-time. The frontend reads `words.metadata.music_caption` directly from Supabase across five components (WordInfoPanel, DeckViewPG, MusicPG, Music legacy, WordDetailPanel admin), bypassing the orchestrator backend entirely. Already-stored captions still contained BPM and were rendering on old cards.

Resolved by running a one-shot UPDATE in the Supabase SQL Editor:

```sql
UPDATE words
SET metadata = jsonb_set(
  metadata,
  '{music_caption}',
  to_jsonb(
    trim(both ' ,' from
      regexp_replace(
        regexp_replace(
          regexp_replace(
            metadata->>'music_caption',
            '\s*\bat\s+\d{1,3}(?:\s*-\s*\d{1,3})?\s*BPM\b',
            '',
            'gi'
          ),
          '\s*\b\d{1,3}(?:\s*-\s*\d{1,3})?\s*BPM\b',
          '',
          'gi'
        ),
        ',\s*,',
        ',',
        'g'
      )
    )
  )
)
WHERE metadata->>'music_caption' ~* '\d+\s*BPM';
```

Old cards now display BPM-free.

---

## What was NOT changed (per spec)

- `clear diction` strip in `suno.py` — unchanged.
- Bisaya/Cebuano → Filipino regex in `suno.py` — unchanged.
- 1000-char `style[:1000]` truncation — unchanged.
- `_patch_vocal_gender` in `lyrics.py:60-66` — unchanged.
- `_enforce_length` post-processing in `caption.py:147` — unchanged, still invoked.
- "Lead with genre" instruction — retained in production prompt; only "and BPM" / "at BPM" tail removed.
- "Clear diction" ending requirement — retained in storyboard and production prompts.
- Frontend `split(',')[0]` derivations across `WordInfoPanel.tsx`, `DeckViewPG.tsx`, `MusicPG.tsx`, `Music.tsx` — unchanged.
- `_select_caption_prompt` selector logic — unchanged.
- `song_engine/models.py` `bpm: Optional[int]` Pydantic field and `src/settings.py` `"bpm": None` — unchanged. These are an explicit per-song manual tempo override, not part of the caption pipeline. Out of scope.

---

## Verification

- AST-parse on all four edited files: clean.
- Static grep for `BPM`: remaining hits are allowed — new "no BPM" rules in prompts, the new strip code, test fixtures (cosmetic non-issue), the `bpm` Pydantic field, settings UI for that field.
- Adversarial regex check: 17/20 cases pass cleanly. Three deviations are low-likelihood edge cases that the prompts no longer prime (BPM-before-number form, double-BPM dangling-`and`, spelled-out "beats per minute"). Accepted as cosmetic.
- Live verification: new word generated post-deploy displays without BPM on the WordCard. Old word post-backfill displays without BPM. ✅
- Suno submit path: new generations send `style` field free of BPM. Confirmed via observability deep-dive on fresh "gangster" + "Beats" deck words.

---

## Adversarial review outcome

`REVIEW_REPORT_BPM_REMOVAL.md` returned BLOCK based on the write-vs-serve-path framing in the original commit message. Substantively:

- Forward-direction prompt edits: clean, no scope violations, all "should NOT change" items verified unchanged.
- Runtime regex: 17/20 cases pass. Three minor adversarial misses, all low-likelihood given current prompts.
- Critical finding (C1): the `metadata.py` strip is write-path, so already-stored Supabase rows weren't retroactively fixed. Resolved via the backfill SQL above rather than introducing a frontend strip or new backend serve endpoint. Backfill chosen because it's the lowest-blast-radius remediation, fixes the admin `WordDetailPanel` correctly (which renders the full caption verbatim), and avoids spreading the regex across two languages.

Notable non-blocking findings parked:

- `_strip_bpm` and `build_suno_payload` strip are duplicated regexes with a "keep in sync" comment. Acceptable today; refactor into a shared helper if a third caller appears.
- `ObservabilityWordDetail` admin panel reads `metadata` from Supabase but the reviewer didn't deep-trace whether it surfaces `music_caption`. If it does, it's now BPM-free post-backfill anyway.
- Test fixtures in `test_concept_lyric_levels.py:250, :473` still contain BPM-laced exemplars. Tests pass; cosmetic only.

---

## Wedding word — environmental failure (resolved as out-of-scope)

During the session Sir Robert observed "wedding" word card showing "Failed to generate" with Retry/Remove UI. Observability deep-dive showed concept/images/video stages complete with events, Suno tracks A and B both generated, but assembly stage had zero events. No assembly = no final video.

Root cause: not a code regression. Sir Robert had pushed a frontend stabilization commit ~25 minutes before the failure. Railway auto-redeployed on the GitHub push, killing the orchestrator process between video stage finishing and assembly starting. All upstream artifacts survived (DB rows, scene videos on storage, Suno tracks on Suno's CDN). Only the local FFmpeg assembly never ran.

This is the canonical retry use case. Continuation prompt written and handed to the retry-button agent. Key points for the retry work:

1. Detect upstream artifacts that already exist (Suno A/B, per-scene videos, storyboard, concept).
2. Resume from the first incomplete stage forward.
3. Do NOT regenerate completed stages — they cost real money.
4. `pipeline_events` is the source of truth for stage completion; the last successful event per stage tells the orchestrator where to pick up.

The retry button surface already exists in the UI; the wiring behind it is what's paused.

---

## Memory updates

Multi-agent git protocol replaced. Old rule (every prompt opens with `git pull --rebase origin main`, rebase on push rejection) removed. New rule:

> Each agent commits ONLY files it touched — never `git add -A`. Push to main directly. On push rejection, pull (not rebase) and retry. NEVER rebase a dirty branch, stash, or touch another agent's worktree/branch/dirty files. If on non-main branch with dirty work it didn't create, stop and ask. Report dirty/staged files at session end. FUTURE: when test users land, switch to dev/main split with deliberate release merges.

Reason: the old rule caused Zeddy to stop mid-task because the codex worktree was on a feature branch with dirty work. Rebasing onto main would have tangled Codex's in-progress retry work with Zeddy's BPM commit. The new protocol keeps agents in their own lane.

---

## Git state at session end

| Repo | Branch | Last SHA | Status |
|------|--------|----------|--------|
| `lokigod69/resonance-cloud` | main | `0647969` | Pushed, deployed |
| codex worktree | `codex/fix-review-findings` (last seen) | `326a1e1` | Codex's parallel retry work, parked safe — not touched this session |

Codex worktree state changed during the session (external actor, likely Codex itself) — committed 14 dirty files into `3b0966e` and `326a1e1`, branched to `codex/fix-review-findings`, left worktree detached at `0e11cfa`. Nothing was lost. `codex/unify-generation-loaders-player-ui` intact at `326a1e1` with all in-progress work.

---

## Process notes / learnings

- **Commit messages need to match what the code does.** The original commit claimed "API serve-time strip" but the strip is on the write path. Adversarial review caught it. Lesson: when the review-agent reads the commit message and the code disagrees with it, the review verdict is BLOCK by default — even if the actual product behavior is fine. Worth being precise in commit messages going forward.
- **Backfill SQL beats code-level remediation when stored data is the problem.** Once the prompts are fixed and the runtime strips are in place, a one-time UPDATE on Supabase is cleaner than spreading regex across more code surfaces.
- **The rebase-by-default git protocol broke down with two agents on different defaults.** Codex creates feature branches automatically; Zeddy commits to main. Telling either to rebase onto main while the other has dirty work mid-stream is a recipe for tangled history. The new "commit only your files, push, pull on rejection" workflow is closer to how this used to work and avoids cross-contamination.
- **When an agent pauses to ask about git state, listen.** Zeddy stopped before editing because the worktree wasn't where it expected. That stop saved a tangled commit. Worth rewarding that behavior in future protocol design.

---

## Closed this session

- BPM removal — prompts, runtime strips, backfill, all verified.
- Multi-agent git protocol revision — memory updated.
- Wedding word failure investigation — diagnosed as environmental Railway redeploy, handed to retry-button agent.

## Parked / continuing

- Retry button wiring — separate Codex chat. Two commits already on `codex/fix-review-findings`. Will land when Codex completes the work.
- Suno permanent storage backfill — still pending, time-sensitive (CDN URLs expire ~14 days).
- Quality bar for content audit — not drafted this session. Sir Robert deferred to focus on LTX 2.3 and Wan 2.7 prompting research first.
- LTX 2.3 prompting investigation — Sir Robert doing his own research and documentation pass.
- Wan 2.7 prompting investigation — same. Image generation has been less satisfactory than hoped; needs system prompt review.
- Caption enrichment for higher lyric modes — out of scope this session. Candidate seams listed in `INVESTIGATION_REPORT_MUSIC_CAPTION.md` §8 if revisited later.
- Music caption could be more verbose for higher lyric modes (more instrumentation detail beyond "synth bass and drum machine"). Currently caption is identical regardless of lyric mode. A mode-aware caption prompt is a candidate enrichment.
- `system_settings.admin_pin` Supabase column cleanup — still deferred from Phase 3.
- FP8 LTX-2.3 smoke test on RunPod — still pending.

---

## Reports generated this session

At repo root (committed):
- None directly committed — investigation and review reports landed locally.

Local untracked artifacts:
- `INVESTIGATION_REPORT_MUSIC_CAPTION.md`
- `REVIEW_REPORT_BPM_REMOVAL.md`

---

## Files committed at `0647969`

- `orchestrator/cloud_engines/image_engine/prompts.py`
- `orchestrator/cloud_engines/concept_engine/caption.py`
- `orchestrator/src/suno.py`
- `orchestrator/src/services/metadata.py`

End of handoff.
