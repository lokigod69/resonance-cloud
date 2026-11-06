# Guided Path — November text checkpoint

These are **offline lesson sources**, not a release manifest. The app imports none of this directory. Korean A1/A2 was separately exposed in the existing picker by app commit `59f63cfb`. No audio job, translation batch, migration, or production data write belongs to this checkpoint.

- [Index and file hashes](index.json): one row for each unique language, level, and path. Ten complete episodes per row. A revision replaces the October source named by `octoberSha256`; do not add ten to the total for it. `reviewedSourceSha256` identifies the exact local bytes. `sha256` identifies the committed copy after normalizing Windows line endings. Parsed lesson content is identical.
- [Current desktop dashboard](../../../../investigations/lingwave-guided-text-2026-11-06.html): existing A1/A2, active German B1, the archived October text, November additions, outstanding review and paths still to write. The dashboard lives in the local workspace, outside the app repository. October's recording assessment remains a separate historical report.
- [Text review dispositions](review/november-dispositions.md): pedagogical findings, including scope, limitations and which files were reviewed. The audio status of a revised lesson cannot be inferred from its text status.
- [All remaining paths](planning/remaining-by-language.json) and the [B2 progression](planning/b2-objectives.json): the writing queue for every language and the learning objective for each path. The separate German and Korean B2 planning files include draft dialogue ideas; they are excluded from the lesson totals.
- [Offline dialogue reader](../../../../investigations/lingwave-guided-reader-2026-11-06.html): open locally to read any archived intermediate draft, reveal each turn and switch between available meanings. Changing lessons here does not affect app progress. The source links in the dashboard open the full exercises.
- [October revisions compared](review/october-revisions.json): the 80 old lesson identities, which components were edited, and which canonical dialogue turns changed.
- [B2 source specifications and trophy ledgers](planning/b2-authority-map.json): portable curriculum documents with original-source and saved-file hashes. This makes the original relative scratch references in the immutable lesson files inspectable from a fresh checkout.

From the frontend folder run `node content-drafts/text-2026-11/verify.mjs` to verify file hashes, unique path and lesson identities, the four-/six-turn shape and exercise reconstruction. This is a deterministic archive check, not a substitute for a language reviewer or a rendered exercise.

## Continue

Work in ten-lesson paths from the first gap in each language, following that language's actual staged specification. Resolve trophy conflicts before drafting. Write the learner’s first response, the speaker’s new information, the learner’s follow-up and distinct transfer examples; build B2’s six turns around a real objection or constraint. Check whether hidden details become visible in an earlier step. Test all plausible correct answers, including alternatives a learner could assemble by combining distractors. A flat list of target phrases or a path outline does not count as ten lessons.

Highest priority is Korean. Its full A1 and A2 already have runtime and explanation editions. For B2, use the native progression and the shared P1–P10 objectives; verify which B1 material has actually been introduced before relying on it. Do not run the closed October P1/P2 recorder or weaken its validation to accept a new path. Once text is complete, decide separately how to handle missing audio, the twelve explanation editions, the phrase catalog and device grading before activating any intermediate drafts.
