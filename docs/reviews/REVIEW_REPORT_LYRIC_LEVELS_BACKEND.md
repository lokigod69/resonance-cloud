# REVIEW REPORT — Lyric Levels Backend

## Verdict
PASS WITH FINDINGS.

The branch implements the core backend behavior correctly: `dramatic` is now on the LLM path, LLM modes write the same string to both `lyrics` and `suno_lyrics`, reliable-mode outputs remain byte-identical to `main` when compared deterministically, and the branch stays within the intended code surface. The main deviation in `job_runner.py` is a real fix for a pre-existing silent production bug, not an arbitrary scope violation. The remaining issues are medium-severity spec drift and test-quality gaps: the creative prompt was rewritten more aggressively than the v2 prompt allowed, and the new tests overclaim what they prove about call counts, Level 1 regression safety, and `[Intro]` enforcement.

## Finding #1 — SETTINGS_OVERRIDE_MAP Addition
Interpretation 1 is correct: on `main`, a per-job `settings_override.lyric_mode` override was silently ignored in production. The feature-branch addition in [`job_runner.py:93-103`](job_runner.py:93-103) is therefore a genuine bug fix, even though the v2 prompt explicitly forbade it.

Evidence on `main`:

- `feeder.bootstrap_job()` passes `job.get("settings_override") or {}` straight into `merge_settings()` without reshaping it into a nested `concept` dict; see `main` [`src/orchestration/feeder.py:479-486`](src/orchestration/feeder.py:479-486).
- `merge_settings()` applies stage-scoped `profile_settings` via `merged[stage] = {**defaults, **profile_stage}`, but per-job `settings_override` is a separate flat-key path that only honors keys present in `SETTINGS_OVERRIDE_MAP`; see `main` `job_runner.py:110-123` from `git show main:job_runner.py`.
- On `main`, `SETTINGS_OVERRIDE_MAP` only contains `genre`, `creative_direction`, `art_style`, `visual_reference`, and `frame_narrative`; it does not contain `lyric_mode`; see `main` `job_runner.py:93-99` from `git show main:job_runner.py`.
- The default reaching the concept stage is still `DEFAULT_SETTINGS["concept"]["lyric_mode"] = "reliable"`; see [`src/settings.py:21-32`](src/settings.py:21-32).
- The frontend wizard payload shape for job overrides is flat, not nested: `settings_override: Record<string, string | undefined>` at [`frontend/src/components/generate/useWizardState.ts:121-130`](frontend/src/components/generate/useWizardState.ts:121-130), with top-level keys emitted at [`frontend/src/components/generate/useWizardState.ts:168-180`](frontend/src/components/generate/useWizardState.ts:168-180) and similarly in [`frontend/src/pages/GenerateGO.tsx:279-290`](frontend/src/pages/GenerateGO.tsx:279-290).

Conclusion:

- `merge_settings()` on `main` does not already apply stage-scoped wizard overrides for `lyric_mode`.
- It only applies stage-scoped profile settings and then a flat, map-driven per-job override layer.
- Because the wizard sends flat keys and `lyric_mode` was absent from the map on `main`, the override could not reach `generate_concept()`.
- The implementation report should have framed this as a pre-existing production bug plus a prompt/investigation miss, not merely as a local deviation.

Other concept-engine settings with the same silent-drop pattern on `main`:

- `vocal_gender`
- `caption_style`
- `use_art_style`
- `art_style_hint`
- `syllable_chop`
- `duration`
- `visual_hint`
- `llm_model`

Those fields exist on [`cloud_engines/concept_engine/models.py:47-59`](cloud_engines/concept_engine/models.py:47-59), but `main` `SETTINGS_OVERRIDE_MAP` only mapped `genre` on the concept side. Any attempt to send the others as flat `settings_override` keys would also have been ignored.

## Critical Findings
None.

## Medium Findings
1. The creative prompt was rewritten more aggressively than the v2 prompt allowed. The spec said to splice in the `[Intro]` rule and otherwise leave the existing contextual and creative prompts intact. Instead, the branch changes the creative prompt’s lead sentence, tag guidance, line-length guidance, repetition counts, and removes the old “maximum of 5 unique non-target words” constraint; compare current [`cloud_engines/concept_engine/lyrics.py:380-417`](cloud_engines/concept_engine/lyrics.py:380-417) with `main` `cloud_engines/concept_engine/lyrics.py:344-375` from `git show main:cloud_engines/concept_engine/lyrics.py`. This is a spec deviation, not a proven runtime bug, but it is broader behavioral drift than the prompt authorized.
2. The `[Intro]` requirement is not enforced at parse time; it is only requested in the prompt. `_parse_lyrics_only_response()` accepts any non-empty `LYRICS:` block and even accepts raw tag-structured text without checking for `[Intro]`; see [`cloud_engines/concept_engine/lyrics.py:503-519`](cloud_engines/concept_engine/lyrics.py:503-519). `_parse_combined_response()` likewise accepts any non-empty `lyrics_text` without validating the opener; see [`cloud_engines/concept_engine/lyrics.py:537-548`](cloud_engines/concept_engine/lyrics.py:537-548). The new tests use canned fake responses that already include `[Intro]`; see [`tests/test_concept_lyric_levels.py:79-95`](tests/test_concept_lyric_levels.py:79-95) and the unification tests at [`tests/test_concept_lyric_levels.py:297-320`](tests/test_concept_lyric_levels.py:297-320). If the model omits `[Intro]`, the branch will silently accept output that violates the feature contract.
3. Several new tests are materially weaker than the implementation report claims. The call-count tests assert `artifact["generation_info"]["llm_calls"]`, which is derived state in the artifact, not the fake client’s actual invocation count, even though the fake tracks `call_count`; see [`tests/test_concept_lyric_levels.py:63-75`](tests/test_concept_lyric_levels.py:63-75) and [`tests/test_concept_lyric_levels.py:337-359`](tests/test_concept_lyric_levels.py:337-359). The Level 1 regression tests do not compare `generate_concept()` outputs against `main` goldens; they hardcode only `generate_reliable()` output at [`tests/test_concept_lyric_levels.py:442-462`](tests/test_concept_lyric_levels.py:442-462) and only smoke-test randomized `generate_suno_lyrics()` structure at [`tests/test_concept_lyric_levels.py:473-479`](tests/test_concept_lyric_levels.py:473-479). Because [`cloud_engines/concept_engine/templates.py:482-497`](cloud_engines/concept_engine/templates.py:482-497) randomizes article placement in `generate_suno_lyrics()`, that test would not catch a one-character drift in the actual Level 1 `suno_lyrics` artifact. I independently verified the branch is correct here by running seeded `main` vs branch comparisons through `generate_concept()`, but the new tests do not prove that claim on their own.

## Low / Style Findings
None.

## What Passed
- `dramatic` was removed from template routing and added to LLM routing. `TEMPLATE_MODES` is now `("minimal", "standard", "reliable")` and `LLM_MODES` is now `("contextual", "creative", "dramatic")`; see [`cloud_engines/concept_engine/lyrics.py:38-41`](cloud_engines/concept_engine/lyrics.py:38-41). The validator still allows `"dramatic"`; see [`cloud_engines/concept_engine/models.py:75-80`](cloud_engines/concept_engine/models.py:75-80).
- The old dramatic template code is gone from live production code. `git grep` over `cloud_engines/` returned no live `generate_dramatic`, `_dramatic_no_chop`, or `_dramatic_with_chop` references; the only remaining hits are the negative assertions in [`tests/test_concept_lyric_levels.py:185-190`](tests/test_concept_lyric_levels.py:185-190).
- `engine.py` writes the exact same `lyrics_result.lyrics` string to both artifact fields for LLM modes, with no transformation in between; see [`cloud_engines/concept_engine/engine.py:186-199`](cloud_engines/concept_engine/engine.py:186-199).
- Actual LLM invocation counts match the intended design in the tested code paths. Using a counting fake client, I verified: reliable word + external caption = 0 calls, reliable phrase + external caption = 0 calls, contextual/creative/dramatic + external caption = 1 call each, and contextual/creative/dramatic without external caption = 1 combined call each.
- The dramatic prompt really does include music-caption context when external caption is present and references Section 1 when it is absent; see [`cloud_engines/concept_engine/lyrics.py:248-298`](cloud_engines/concept_engine/lyrics.py:248-298) and [`cloud_engines/concept_engine/lyrics.py:421-477`](cloud_engines/concept_engine/lyrics.py:421-477). Manual prompt-capture runs confirmed both cases.
- Article-less opener behavior is correct for Korean: `resolve_article()` still returns empty for `ko` at [`cloud_engines/concept_engine/article.py:25-28`](cloud_engines/concept_engine/article.py:25-28), and manual prompt capture showed `[Intro]\nchaek` with no leading space.
- Phrase + dramatic routing is correct on the branch: phrases get `article=""` upstream at [`cloud_engines/concept_engine/engine.py:107-112`](cloud_engines/concept_engine/engine.py:107-112), then route through the LLM path and unify `lyrics`/`suno_lyrics`.
- Reliable-mode regression checks passed independently. Because `generate_suno_lyrics()` is randomized, I seeded `random` and compared `generate_concept()` outputs for `word="Arzt"` / `lyric_mode="reliable"` / external caption on `main` and on the branch; the resulting `lyrics`, `suno_lyrics`, and `generation_info.llm_calls` were byte-identical.
- Scope adherence is clean apart from the justified `job_runner.py` deviation. `git diff --name-status main...HEAD` only shows changes to `cloud_engines/concept_engine/engine.py`, `cloud_engines/concept_engine/lyrics.py`, `cloud_engines/concept_engine/templates.py`, `job_runner.py`, the new test file, and the implementation report. No frontend files, no `engines/concept-engine/` dev-tree files, no other engine directories, no `src/suno.py`, no `cloud_engines/concept_engine/caption.py`, and no `cloud_engines/concept_engine/models.py` were modified.
- The branch is local-only. `git ls-remote --heads origin feat/lyric-levels-backend` returned no remote branch head.
- Test runs matched the implementation report. `tests/test_concept_lyric_levels.py` passes all 29 tests on the branch. The broader suite currently lands at 135 passed / 2 failed on the branch, and the same two `tests/test_orchestration_music_state.py` failures reproduce on an extracted `main` snapshot.

## Questions for Sir Robert
- The review prompt names `IMPLEMENTATION_LYRIC_LEVELS_BACKEND_v2.md` as the primary spec file, but that file is not present in the repo root. I used the prompt supplied in this thread as the authoritative v2 spec. If there is a canonical checked-in copy elsewhere, point future reviewers at it directly.
- Should the `[Intro]` requirement remain prompt-only, or should the parser reject / retry LLM outputs that do not start with the required opener? Right now the feature contract depends on model compliance.
- Was the larger creative-prompt rewrite intentional? The implementation report acknowledges it, but the branch is not a literal minimal-delta implementation of Section 2.3.
