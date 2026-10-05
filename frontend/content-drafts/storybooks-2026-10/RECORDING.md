# Recording handoff

The first collection contains sixteen complete six-page stories, eight in British
English and eight in European Spanish, with two stories at each level A1–B2.
The full projection covers narration/dialogue, story/page titles, pre-taught
words, scene-object labels and scene-object descriptions. Meanings, language
notes and art directions are not narration.

No story audio has been recorded. The owner approved an allowance of **up to
50,000 API credits** for this collection, including the two-voice pilot, within
the existing **200,000-credit campaign total** and after the curriculum queue.
Approval was given in the storybook chat on 2026-10-05: “Approve up to 50,000
credits.” It covers the pilot and full batch after listening review. It is not a
reservation in the shared ledger. The runner stops before a new
request would exceed either allowance. Provider responses above their reviewed
reservation are retained and stop further requests.

## Voices and rate evidence

| Locale | Candidate | Provider voice ID | Current evidence |
|---|---|---|---|
| en-GB | Nathaniel C | AeRdCCKzvd23BpJoofzx | Authenticated GET labels British English and reports en-GB verification on earlier models; no story v4 audition yet |
| es-ES | Emilio | ZCh4e9eZSUf41K4cmCEL | Authenticated GET reports peninsular Spanish; existing positive v4 receipts; no story audition yet |

The proposed model is `eleven_v4`, with stability 0.5, similarity 0.75 and
`mp3_44100_128`. The pilot uses the first narrative line in each language and the
same cache identities as the full run, so its recordings can be reused.
Speaker names remain in the speech manifest for future character casting.

The current declared reservation multiplier is ten credits per character for
both voices. The provider's sharing rate is **not** interpreted as its billing
multiplier. A complete first-attempt reservation at that upper bound is much
larger than the proposed allowance. Actual settled charges may be lower; full
completion within 50,000 is not guaranteed. No rate discount is inferred from a
single receipt. Final costs come from durable provider receipts.

## Execution contract

- `scripts/storybooks/export.mjs` and `plan_audio.py` are offline preparation.
- `run_audio.py` defaults to a dry-run. It requires explicit source-bound owner
  approval with `storyCreditLimit`, reviewed sources/code/runtime, matching fresh
  provider rates and an exact dry-run fingerprint before `--commit`.
- Full execution additionally requires listening decisions for both locales,
  bound to the exact voice profiles, pilot request keys and saved audio hashes.
- It uses only `review-artifacts/guided-audio-20261003/api/campaign.sqlite3` and
  `review-artifacts/.guided-audio-api.lock`. No new ledger, cap reset or automatic
  retry. The existing anchor and positive receipt must remain present.
- Story commitments are counted cumulatively across pilot/full runs under that
  lock. A local budget stop happens before reservation. Uncertain provider calls
  remain blocked until reconciled, and receipts precede decoding/file delivery.
- Drafts and the reviewed execution closure must match committed HEAD. An
  operator must verify all unsigned approval/review assertions against their
  actual originating records; JSON fields cannot authenticate a human decision.

The curriculum chat owns the queue. Recheck its handoff and current ledger before
attaching an approved story batch. Do not change or replace any sealed curriculum
executor. Current campaign queues expire at 2026-10-06 04:00 UTC, before the
authenticated subscription reset at 04:27:32 UTC (12:27:32 Manila).

Audio stays local for listening review. This handoff does not authorise Supabase
writes, publication, a new live route, or translations into the remaining ten base
languages.
