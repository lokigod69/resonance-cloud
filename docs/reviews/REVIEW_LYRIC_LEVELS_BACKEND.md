# ADVERSARIAL REVIEW — Lyric Levels (Niveau) — BACKEND

**Type:** Read-only adversarial code review. You are a DIFFERENT agent from the one that implemented this branch. You have NOT seen the implementation work before. Your job is to find bugs, scope violations, silent regressions, and weak tests — not to validate the work.
**Repo:** `lokigod69/resonance-cloud`
**Branch under review:** `feat/lyric-levels-backend`, commit `cf0da5a`, not pushed.
**Your stance:** Suspicious by default. Every claim in the implementation report must be verified against the live branch code. If you cannot verify something with your own eyes, say so explicitly. If a test passes but doesn't actually prove the claim it's testing, flag it.

---

## 0. What You Have Access To

Three companion documents, in priority order:

1. `IMPLEMENTATION_LYRIC_LEVELS_BACKEND_v2.md` — the prompt that the implementing agent was asked to satisfy. This is the spec. Deviations from it are findings.
2. `IMPLEMENTATION_REPORT_LYRIC_LEVELS_BACKEND.md` — the implementing agent's own report. Claims in here must be independently verified. Do not trust it.
3. `INVESTIGATION_REPORT_LYRIC_LEVELS.md` — the original investigation that preceded the implementation. Useful for context.

Plus the branch itself. Check out `feat/lyric-levels-backend` and read the live code. Do not rely on the implementation report's code snippets — they may be selective or out of date.

---

## 1. The Single Most Important Finding You Must Report

The implementing agent added `"lyric_mode": ("concept", "lyric_mode")` to `SETTINGS_OVERRIDE_MAP` in `job_runner.py`. The original prompt (Section 4) explicitly forbade new entries in this map. The agent's justification is that the override-flow verification test in Section 3.1 could not pass without it.

**Investigate this thoroughly.** There are three possible interpretations and only one of them is acceptable:

1. **`lyric_mode` override was never working in production.** The map addition is a genuine fix for a pre-existing silent bug. Acceptable deviation — but the report should have flagged this as a pre-existing production bug, not a new deviation. If this is the case, Sir Robert needs to know: anyone who ever set a non-default `lyric_mode` on a deck was silently ignored, and their output came out as `reliable`.
2. **The map addition is unnecessary.** The override could have been made to work through the existing merge chain. The agent took the easy path instead of the correct one. This is a finding.
3. **The map addition is correct AND the investigation missed it.** The investigation report mapped 8 layers of the settings flow; if `SETTINGS_OVERRIDE_MAP` was a 9th layer that none of us noticed, the investigation itself was incomplete. This is worth noting for future reference.

For your report, answer:

- Which interpretation is correct? Cite file + line evidence from both `main` and `feat/lyric-levels-backend`.
- Was `lyric_mode` override actually working on `main` before this change? Trace the settings flow on `main` from `settings_override.concept.lyric_mode` through `merge_settings()` to the value that reaches `generate_concept()`. Specifically: does `merge_settings()` on `main` already apply stage-scoped overrides, and if so, why was a `SETTINGS_OVERRIDE_MAP` entry also needed?
- If interpretation 1 is correct, list every other concept-engine setting that has the same bug pattern (i.e., concept-engine settings NOT in `SETTINGS_OVERRIDE_MAP` that would also be silently ignored if a user tried to override them).

This finding gates everything else. Report it first.

---

## 2. Critical Checks (MUST verify each one)

### 2.1 Level 1 byte-equal regression (blocking)

For `lyric_mode == "reliable"`, `artifact.lyrics` and `artifact.suno_lyrics` must be byte-identical to the output that the same code on `main` produces for the same input.

- Locate the Level 1 regression test the agent claims to have added (Section 3.7 / test plan #7).
- Verify the test actually compares against a golden output captured from `main`, not just a snapshot from the current branch (which would be a tautology).
- Run the test. Does it pass? Does it run at all, or is it gated on a fixture that skips?
- Independent verification: check out `main`, generate `lyrics` and `suno_lyrics` for a German word like "Arzt" with `lyric_mode="reliable"` and `is_phrase=False`. Check out the branch, regenerate for the same input. Are they byte-identical? Whitespace, line endings, section tags, article capitalization — all.

If any difference exists, that's a production regression. Report it with the diff.

### 2.2 LLM call count per mode

The whole v2 design was built around ONE LLM call per word for LLM modes, zero for `reliable`.

- Locate the test(s) that assert this (Section 3.2 / test plan #1).
- Verify the tests actually count LLM invocations (e.g., `mock_llm_client.call_count == 1`), not just that the function returned.
- Trace every code path from `generate_concept()` for each mode. Count LLM calls manually:
  - `reliable` + word → must be 0 LLM calls (both fields are template-based)
  - `reliable` + phrase → must be 0 LLM calls
  - `contextual` + word → must be 1 LLM call (and the result goes to both fields)
  - `creative` + word → must be 1 LLM call
  - `dramatic` + word → must be 1 LLM call
  - `dramatic` + phrase → must be 1 LLM call
  - LLM modes + no `external_music_caption` → may still be 1 call if the existing combined-prompt path is reused, OR may be 2 (separate caption + lyrics). Report which.
- Flag any code path that could silently make a second LLM call: error retries, cached caption calls, defensive fallbacks, etc.

### 2.3 `lyrics == suno_lyrics` for LLM modes (byte-equal)

- Locate the engine.py code that writes the two fields for LLM modes.
- Verify they receive the SAME string. Look for any transformation between the two assignments (`.strip()`, `.replace()`, re-parsing, re-rendering). Any such transformation is a bug.
- Check the unit/integration test that asserts byte-equality (Section 3.3).
- Run the test. Does it actually compare strings with `==` and `assert ==`? Or does it use some lenient comparison?

### 2.4 `[Intro]` opener in all three LLM prompts

- Open the three prompt-building functions: `_contextual_lyrics_prompt()`, `_creative_lyrics_prompt()`, `_dramatic_lyrics_prompt()` (or whatever the agent named the new one).
- For each, verify the prompt string literally contains instruction to produce `[Intro]\n{article} {word}` as the first section. The phrase "[Intro]" must appear in the instruction.
- Verify the article-empty path produces `[Intro]\n{word}` with no leading space. Check the prompt template for how it handles empty article — is there a conditional formatting, or does empty-string interpolation accidentally produce `[Intro]\n {word}` (with leading space)?
- Run the prompt-generation functions with `article=""` and verify the rendered prompt doesn't contain `"[Intro]\n {word}"` (with space).

### 2.5 `music_caption` wiring for dramatic

- Locate the dramatic prompt-building function.
- Verify `music_caption` is actually interpolated into the prompt string, not just passed as a parameter that's never used.
- Check the test that asserts this (Section 3.4). Does it inspect the ACTUAL string sent to the LLM, or just that the function was called with the parameter?
- For the no-`external_music_caption` case: verify the fallback path. Does the prompt still substitute SOMETHING sensible for `music_caption`, or does it produce a malformed prompt with `{music_caption}` literally present in the output? Or an empty string that confuses the LLM?

### 2.6 Dead code elimination

- Verify `generate_dramatic()` is deleted from `templates.py`.
- Verify `_dramatic_no_chop()` and `_dramatic_with_chop()` are deleted.
- Run `grep -rn "generate_dramatic\|_dramatic_no_chop\|_dramatic_with_chop" orchestrator/cloud_engines/` and confirm zero matches in live code (comments are OK, imports and calls are not).
- Verify no test file still imports or references the deleted functions.
- Verify `TEMPLATE_MODES` at `lyrics.py:34` no longer includes `"dramatic"`.
- Verify `"dramatic"` is still in `ConceptSettings.lyric_mode` allowed-values tuple at `models.py:78` (should remain).

---

## 3. Structural Checks

### 3.1 Dispatch correctness

- The `generate_lyrics()` dispatch at `lyrics.py` must now route `contextual`, `creative`, AND `dramatic` into the LLM path, and `reliable`, `minimal`, `standard` into the template path.
- Read the live dispatch code and draw the routing table. Compare to the expected table.
- What happens if someone passes an unrecognized `lyric_mode` value? Does the engine fall through to a default, raise, or silently produce garbage? Report the behavior.

### 3.2 Phrase handling

- For `is_phrase=True` (space in the input word):
  - `reliable` mode → must still call `generate_phrase_suno_lyrics()` for `suno_lyrics`. Verify.
  - LLM modes → must route through the new unified path. Verify the LLM prompt receives the phrase (not the word+article). Verify `article` is empty for phrases. Verify the `[Intro]` opener produces `[Intro]\n{phrase}` with no leading space.
- Is there any code path where `is_phrase` branches incorrectly for LLM modes (e.g., strips the phrase to its first word, or tries to prefix an article to a phrase)?

### 3.3 Article-less languages

- For Korean (`language_code="ko"`), `article` should come back empty from `resolve_article()`.
- Verify the LLM prompt's `[Intro]` opener for Korean produces `[Intro]\n{word}` (no space, no article). Test with a Korean word.
- Check `ARTICLELESS_LANGUAGES` set — has the agent accidentally modified it?

### 3.4 `max_tokens` change

- Verify `lyrics.py` LLM call now uses `max_tokens=1024`.
- Verify `caption.py` LLM call was NOT changed (should still be 256 or whatever it was).
- Any OTHER `max_tokens` value in the concept engine that was accidentally touched?

---

## 4. Test Quality Review

The agent reports 29 new tests, all passing. Do not take this at face value.

### 4.1 Run the tests yourself

- Check out the branch. Run the concept-engine test suite. Confirm 29 new tests pass and the pre-existing 135-ish suite also still passes.
- Confirm the 2 reported pre-existing failures in `test_orchestration_music_state.py` are indeed unrelated (Windows path issue) and also fail on `main`.

### 4.2 Test honesty

For each of the Section 3 verifications in the v2 prompt, find the corresponding test(s) and answer:

- Does the test actually verify the claim, or does it pass trivially?
- Does it use real data flow through `generate_concept()`, or does it mock so much that the test proves nothing about the integrated behavior?
- Are the assertions strict (`==`) or lenient (`in`, contains, `startswith`)?
- Is there a test that would catch the bug if Level 1 output drifted by a single character? If not, Section 2.1 of this review is not adequately guarded by tests.
- Is there a test that would catch the bug if `lyrics != suno_lyrics` by even one byte? Same question.
- Is there a test that would catch the bug if the dramatic prompt omitted `music_caption`? Same question.

### 4.3 Missing tests

What's NOT tested that should have been?

- LLM failure handling. If the LLM call fails, what happens to the artifact? Is there a test?
- Malformed LLM output. If the LLM returns lyrics without the `[Intro]` section, does the engine detect and retry, accept silently, or raise? Is there a test?
- Very long LLM output. If the LLM hits the 1024 token cap mid-song, is the output usable? Truncated in the middle of a word? Is there a test?

---

## 5. "What NOT to Change" Adherence

Verify each Section 4 prohibition from the v2 prompt:

- [ ] No files modified under `orchestrator/frontend/`.
- [ ] No files modified under `engines/concept-engine/` (dev tree).
- [ ] No changes to image, video, assembly, bookend, or song engines.
- [ ] `reliable`, `minimal`, `standard` modes untouched (diff templates.py for these functions).
- [ ] `generate_suno_lyrics()` and `generate_phrase_suno_lyrics()` functions untouched.
- [ ] No new fields in `ConceptSettings` Pydantic model.
- [ ] No Supabase migrations added.
- [ ] No changes to `suno.py`.
- [ ] No changes to caption generation for non-dramatic modes.
- [ ] No changes to `caption.py` `max_tokens`.
- [ ] No git push happened (check `git log origin/feat/lyric-levels-backend` — should not exist).

For the one acknowledged deviation (`SETTINGS_OVERRIDE_MAP` addition), Section 1 of this review handles it.

Any other deviation beyond that one is a new finding.

---

## 6. Integration Risk

The concept artifact's `suno_lyrics` field is read by `orchestrator/src/suno.py`. With the new unified design, `suno_lyrics` for LLM modes is now LLM-generated text instead of the previous predictable template output. Consider:

- Does `suno.py` have any code that assumed `suno_lyrics` was always template-structured (e.g., expected a specific number of lines, expected specific section tags, expected the word to appear exactly N times)? If so, the new LLM output may break it.
- Does Suno/kie.ai have any input validation on the `prompt` field (lyric length, forbidden characters, forbidden section tags like `[Intro]`) that the old template output happened to respect but the new LLM output might violate?
- Check the `build_suno_payload()` in `suno.py` — does it do any pre-processing that matters?

Report anything suspicious.

---

## 7. Deliverable

A single file `REVIEW_REPORT_LYRIC_LEVELS_BACKEND.md` at repo root (do NOT commit it — just leave it in the working tree for Sir Robert to read).

Structure:

```
# REVIEW REPORT — Lyric Levels Backend

## Verdict
One of: PASS / PASS WITH FINDINGS / FAIL.
One paragraph explaining the verdict.

## Finding #1 — SETTINGS_OVERRIDE_MAP Addition
[your conclusion on Section 1 of this prompt, with evidence]

## Critical Findings
(if any — each with file/line evidence and reproduction steps)

## Medium Findings
(weak tests, missing edge-case coverage, small regressions)

## Low / Style Findings
(optional — nitpicks)

## What Passed
Brief list of claims that were independently verified to be correct.
Don't pad this — be specific.

## Questions for Sir Robert
Anything you couldn't answer from code alone.
```

Findings must cite file path + line number for every claim. "I think this might be wrong" without evidence is not a finding.

---

## 8. Hard Rules

- **Read-only.** Do not modify any file. Do not commit. Do not push.
- **Different agent.** If you are the same agent that implemented this branch, STOP and tell Sir Robert. Adversarial review by the same agent defeats the purpose.
- **Independent verification.** Every claim in the implementation report must be verified against live code. The report is testimony, not evidence.
- **No reconciliation.** If the code disagrees with the v2 prompt, that's a finding — don't silently assume the code is "obviously correct." If the v2 prompt disagrees with the investigation report, flag it.
- **Strict test runs.** Don't claim tests pass without running them.
- **No scope creep.** You are reviewing THIS branch against THIS prompt. Other bugs you spot in unrelated code go in a "while-I-was-here observations" appendix, not into the main findings.

End of adversarial review prompt.
