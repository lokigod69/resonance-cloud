---
name: independent-review
description: Brief and verdict format for an independent review of a Lingwave change by a fresh agent that did not write it. Use before pushing auth, billing, data deletion, migrations, paid pipelines, provider/model changes or learner-facing content, e.g. "get this reviewed", "independent review of the storage sweep". Not needed for copy or CSS tweaks.
---

# Independent review

A review earns its cost when a fresh reader checks the change against the code, not the
author's story. On this project reviews caught cross-user file deletion, double charges and
answer leaks; they also wasted hours when reviewers inherited the author's context or
re-reviewed a moving HEAD. Keep them independent, scoped and short.

## When

Required: auth and permissions, billing and credits, anything that deletes data or files,
Supabase migrations, paid pipelines (TTS, images, songs, LLM batches), provider or model
changes, learner-facing content (lessons, prompts, translations). Optional: copy, CSS,
docs. A self-review never counts.

## How to launch

- Use a fresh agent (a new subagent or a Codex task), never a fork of the authoring
  thread. Give it the brief below, nothing else from the conversation.
- The reviewer is read-only: no edits, no database writes, no paid calls. Name that.
- Point at commits (`git show <sha>`) or explicit paths, not "the recent changes": the tree
  is shared and HEAD moves.
- One reviewer per change set. Parallel reviewers only for different change sets.

## Brief template

```
You are an independent reviewer; read-only (no edits, no database, no paid calls).
Change: <commits or paths>. Intent: <one or two sentences>.
Rationale / spec: <file path, if any>.
Check hard:
1. <the failure you fear most, e.g. "can this delete another user's file?">
2. <correctness against the real code paths it touches>
3. <safety rules that must survive: …>
4. <tests: do they cover the change, or pass vacuously?>
Report findings ranked BLOCKER / HIGH / MEDIUM / LOW with file:line and a concrete fix;
"no issue" for checks that pass; end with PASS or REWORK. Under <N> words.
```

## Verdicts and rounds

- Severity: BLOCKER (must not ship), HIGH, MEDIUM, LOW. Verdict: PASS or REWORK.
- Fix every BLOCKER and HIGH; fix or record MEDIUM/LOW with a reason.
- Re-review once after fixes, by messaging the same reviewer with the fix commit. A third
  round only if the second found a new BLOCKER.
- Record the verdict and the fix commit in the task's log line (plan, protocol LOG or brain
  LOG), e.g. "reviewer: 0 blocker, 1 high fixed in `abc1234`, PASS on re-check".

## Codex as reviewer

Launch through the codex-companion plugin from the repository you want reviewed (the
workspace root and `orchestrator/` are different job registries). Pass flags as flags, never
inside the prompt text, and never send `--help` as a task: it starts a real thread. The
workspace PreToolUse hook blocks that. The Codex sandbox cannot run tsx or Chrome; ask for
static review, or run those checks yourself.
