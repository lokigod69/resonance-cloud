# Lingwave storybooks — first collection

Started 2026-10-05. Working name: **Worlds**. Original explorable fiction alongside
the guided curriculum. This folder is offline editorial material, not an active
course or a new live navigation destination.

The first collection is sixteen six-page stories: eight in contemporary British
English (`en-GB`) and eight in European Spanish (`es-ES`), two per level A1–B2.
English and German explanation editions make the local preview reviewable. The
other ten base-language editions remain future work; this is not twelve-base
publication readiness. Artwork, animation, quizzes and microphone scoring follow
after the first reading/listening layer.

Each page has three spoken story lines and two explorable objects. Story titles,
page titles, object labels and descriptions are also included in the audio
inventory. Every target-language text that the preview presents as learnable is
an explicit speech entry; base-language explanations and production directions
are never sent to TTS. Repeated exact strings share one recording per locale and
voice configuration. Character voice casting is deferred; speaker metadata is
kept for later.

## Local preview

From `orchestrator/`, run `node scripts/storybooks/serve.mjs`, then open the printed
localhost address. Three reader treatments are proposals for owner review. They
use the same content and interactions; they do not establish an approved design.
No real recording is represented by a browser-generated substitute. Missing audio
is visibly marked. A future checked audio map can supply local recordings.

## Editorial and recording gates

1. Full-field Fable collaboration and a fresh independent content review.
2. Structural validation and exact overlap check against the existing curriculum.
3. Frozen content hashes and a complete phrase manifest with exact character count.
4. Verified `en-GB` / `es-ES` voice audition and rate evidence.
5. Owner's story-specific budget, within the existing shared campaign ceiling.
6. Reviewed execution adapter and handoff to the existing queue owner. No second
   ledger, cap reset, concurrent synthesis, or automatic retry of uncertain calls.
7. Saved/decoded audio, followed by listening review. Production publication,
   twelve-base integration and live route placement are separate gates.

The offline exporter cannot synthesise, access credentials, mutate the campaign
ledger, or upload anything. Draft/catalogue coverage, review status, saved audio
and published content are reported separately. A planned story is not a completed
lesson or recorded story.

## Reviewed checkpoint — 2026-10-05

| Item | Completed scope |
|---|---|
| Stories/pages | 16 / 96 |
| Spoken uses / unique recordings planned | 832 / 830 |
| Characters after speech normalization | 39,388 (20,675 en-GB; 18,713 es-ES) |
| Fable collaboration | Four authored batches per language; 69 exact arbitration edits plus documented parent refinements; full final read and correction closure PASS |
| Independent content review | Full-field initial and final reads; no unresolved findings after prescribed owl-count clarification |
| Existing-curriculum comparison | No whole-string matches of four or more words; 13 short common-language matches across live corpus and 14 staged EN/ES files |
| Saved story audio / published stories | 0 / 0 |

Source-bound evidence is in [review/fable.json](review/fable.json),
[review/independent-content.json](review/independent-content.json),
[review/execution.json](review/execution.json) and [review/overlap.json](review/overlap.json).
The independent final review's exact prescribed corrections were applied with
old-value assertions; its evidence distinguishes the full-read hashes from the
derived final hashes. Fable then confirmed the corrected stories. Neither review
claims native-human certification or formal CEFR certification.

The full [speech manifest](recording/manifest.json), compatible [audio plan](recording/plan.json),
voice metadata and default dry-runs are preserved under `recording/`.
`evidence.UNAPPROVED.json` deliberately grants no spending permission. The declared
two-clip pilot bound is 790 credits; the full declared first-attempt bound is
393,880 before ready-file reuse and settled receipts. Those are reservations,
not prices or promised actual costs.

Validation: strict collection/extraction checks including nine invalid-input
cases; eight fake-provider execution tests; frontend verify (zero lint errors,
two existing fixture warnings); test:local (28 passed, five documented stale
suites skipped). Visually verified in the Codex browser on desktop and 390/320px
phone layouts with both explanation languages. Runtime app code did not change;
an app build was not needed. Design/voice listening and production publication
remain separate owner decisions.

The separate guarded executor is described in [RECORDING.md](RECORDING.md). Its
default is a dry-run. The owner approved up to 50,000 API credits on 2026-10-05,
within the existing shared 200,000-credit cap and after the curriculum queue.
The voice pilot and subsequent listening review still precede the full run. The local
reader's disabled Listen buttons reflect the actual absence of story recordings.

## Content contract

`catalogue.json` holds Fable's editorial architecture and episode outlines.
`english.json` and `spanish.json` hold complete episodes with schema version 1.
Every episode has a stable id, locale, level, world, title (`text`, `meaning.en`,
`meaning.de`), learning focus, fiction note, up to three pre-taught words, and six
pages. Each page has a similarly structured title, an English art brief, three
lines (`id`, `speaker`, `text`, `meaning`, `note`) and two hotspots (`id`, `label`,
`text`, `meaning`, `note`, `x`, `y`). Notes have explicit English/German editions;
coordinates are percentages for the future illustration. Pre-taught words use
the same `text`/`meaning` structure and are recorded as well.

No art brief, filename, meaning, explanation or CEFR label is part of narration.
Level labels are editorial targets, not a certification or a learner assessment.
Scientific and cultural references need sources if presented as facts; these
first stories use explicitly fictional settings. Language variety is a voice
and text requirement, not a claim that a whole country speaks one way.
