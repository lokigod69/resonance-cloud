# Today / Guided browser fixtures

This isolated Vite harness renders the real `Today`, `TodaySession`, and
`GuidedCheckpoint` components with the real split guided corpus. Auth,
analytics, guided audio, and speech recognition are local deterministic stubs;
the run performs no paid calls.

From `frontend/`:

```text
node scripts/today-guided-fixtures/run.mjs
node scripts/today-guided-fixtures/run.mjs --only=today-overview,today-a1
```

Screenshots and the machine-readable verdict are written to `out/`. The
fixture matrix covers 320, 390, and 1440 pixel overviews; direct lower-lesson
start; Options dialog focus, Escape, and target size; a complete A1 journey;
`start=1` cold-start identity; wrong-answer reveal and repair; local draft resume
and Back; reduced motion; trophy retry; explicit phrase retention with an
idempotent lost-response retry; and French UI disclosure when authored lesson
explanations fall back to another language.
