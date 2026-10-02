# Lingwave frontend — feature map

React/Vite app and Vercel functions. Read the [shared working rules](../AGENTS.md)
first. **Every command below runs from `orchestrator/frontend/`; links are relative
to this README.** App git lives one level up; workspace coordination lives two
levels up. See [command roots](../AGENTS.md#command-and-search-roots) when switching.

## Find the relevant code

Use this table to choose an entry point, then follow imports or search the relevant
directory. It is a navigation map, not an exhaustive dependency inventory.

| Work on | Start here | Focused offline check |
|---|---|---|
| Routes, auth and shipped shell | [App.tsx](src/App.tsx), [useAuth.ts](src/hooks/useAuth.ts), [PolishGlassLayout.tsx](src/components/layout/PolishGlassLayout.tsx) | `npm run test:oauth-onboarding` |
| Home / Word Stream | [FirstLightHome.tsx](src/components/home/FirstLightHome.tsx), [useWordStream.ts](src/hooks/useWordStream.ts), [wordStream.ts](src/lib/wordStream.ts) | `npm run test:word-stream` |
| Today / guided lesson flow | [Today.tsx](src/pages/Today.tsx), [useTodayMission.ts](src/hooks/useTodayMission.ts), [guidedLessons.ts](src/data/guidedLessons.ts) runtime facade | `npm run test:guided-today` |
| Guided content and audio | [guidedLessonsAuthoring.ts](src/data/guidedLessonsAuthoring.ts), [per-language authoring](src/data/guided/), [runtime generator](scripts/generate-guided-runtime-data.ts), [Python TTS service](../src/services/guided_tts/) | `npm run test:guided-today`; use the authoring skill below for the regeneration chain |
| Speak / Live voice | [Speak.tsx](src/pages/Speak.tsx), [useVoiceTutor.ts](src/hooks/useVoiceTutor.ts), [useGrokRealtime.ts](src/hooks/useGrokRealtime.ts), [voice-chat.ts](api/voice-chat.ts), [grok-token.ts](api/grok-token.ts) | `npm run test:speak-polish`, `npm run test:speak-personas` |
| Lens scan / save | [Lens.tsx](src/pages/Lens.tsx), [useLensScan.ts](src/hooks/useLensScan.ts), [useLensSave.ts](src/hooks/useLensSave.ts), [visual-scan.ts](api/visual-scan.ts) | `npm run test:lens` |
| Generation and worker dispatch | [GenerateGO.tsx](src/pages/GenerateGO.tsx), [job_runner.py](../job_runner.py), [orchestration](../src/orchestration/), [cloud_dispatcher.py](../src/cloud_dispatcher.py) | `npm run test:lane-payload`, `npm run test:card-generation-progress`; worker checks depend on the changed service |
| Deck study / offline recall | [StudyPG.tsx](src/pages/StudyPG.tsx), [dailyHabits.ts](src/lib/dailyHabits.ts), [recallAttemptQueue.ts](src/lib/recallAttemptQueue.ts) | `npm run test:local` (its summary lists known-stale skips) |
| UI locales / guided explanations | [translations.ts](src/lib/translations.ts), [lazy UI packs](src/lib/locales/), [guidedBaseEditions.ts](src/lib/guidedBaseEditions.ts), [API base registry](api/_shared/baseLanguages.ts) | `npm run test:ui-locales`, `npm run test:base-languages`, `npm run test:guided-base` |
| Plans / billing | [PlansPage.tsx](src/pages/PlansPage.tsx), [create-checkout-session.ts](api/create-checkout-session.ts), [webhooks.ts](api/webhooks.ts), [stripeBilling.ts](api/_shared/stripeBilling.ts) | `npm run test:stripe-billing` |

## Project workflows (Claude and Codex)

These skills are stored under `orchestrator/.claude/skills/` and apply to both agents.
Open only the skill relevant to the task; the files own the detailed procedures.

| Task | Read |
|---|---|
| Add a learnable language | [add-target-language](../.claude/skills/add-target-language/SKILL.md) |
| Add an interface/base language | [add-base-locale](../.claude/skills/add-base-locale/SKILL.md) |
| Add a writing system | [add-script-lab-language](../.claude/skills/add-script-lab-language/SKILL.md) |
| Author a guided tier | [author-guided-tier](../.claude/skills/author-guided-tier/SKILL.md) |
| Review a language addition | [review-language-addition](../.claude/skills/review-language-addition/SKILL.md) |
| Independently review an implementation | [independent-review](../.claude/skills/independent-review/SKILL.md) |
| Run a visual critique | [ui-critic-loop](../.claude/skills/ui-critic-loop/SKILL.md) |

## Run locally and verify

`npm ci` installs the locked dependencies; `npm run dev` starts Vite. Vite alone
does not emulate the Vercel functions in `api/`. For a repeatable signed-in UI
preview with stubbed auth and no paid calls, use the matching fixture harness:

| Surface | Command | Screenshots and verdict |
|---|---|---|
| Home / Word Stream | `node scripts/first-light-fixtures/run.mjs` | [first-light output](scripts/first-light-fixtures/out/) |
| Today / guided | `node scripts/today-guided-fixtures/run.mjs` | [today-guided output](scripts/today-guided-fixtures/out/) |
| Speak / Lens | `node scripts/speak-lens-fixtures/run.mjs` | [speak-lens output](scripts/speak-lens-fixtures/out/) |

The `out/` folders are generated locally by a run. Fixture success does not prove
live provider behavior or physical iPhone behavior.

[AGENTS.md](../AGENTS.md#checking-your-work) owns the required completion checks.
The main commands are `npm run verify`, `npm run test:local`, and, when app code
changes, `npm run build`. Focused checks above help during development; they do not
replace the required checks. [package.json](package.json) defines the commands;
[run-local-tests.mjs](scripts/run-local-tests.mjs) defines the offline suites and
known-stale exclusions. `npm run check:skills` validates project-skill references.
`npm run env:check` reports environment names/presence without printing values.

## Search and current context

```powershell
# Run from orchestrator/frontend; pass filename patterns with -g on Windows.
rg --files src/components/home src/hooks
rg -n 'SPEAK_LLM_MODEL' api/voice-chat.ts
rg -n 'B1' src/data -g 'guided*.ts'
```

Read [memory/INDEX.md](../memory/INDEX.md) and [STATE.md](../memory/STATE.md) for
implementation or a resume. Open topic notes selectively; search the large LOG
and DECISIONS files by topic/date instead of loading both in full. Current work
and owner actions live in workspace `protocol/`; app product references live in
`orchestrator/docs/Product/`, distinct from workspace `docs/Product/`.
