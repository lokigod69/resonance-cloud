# Infographic V4 Admin Testing Hardening Report

## What Changed

The original V4 prompt shape was too close to a rule dump: long boilerplate, JSON-style scaffolding, repeated bans, and dense compiler language. That made live Admin Lab testing slow and hard to interpret.

V4 now uses a compact final-prompt-writer path. The LLM writes a natural-language editorial image brief, then a deterministic validator checks the result before any provider call.

## Simplified V4 Prompt

The final provider prompt now uses a compact vocabulary infographic shape:

- target word/headword
- translation/gloss
- explanation language
- target-language examples/forms allowance
- vocabulary-first balance
- dense editorial design direction
- planned learning modules
- short bans

The prompt avoids raw JSON keys and repeated rule blocks. Prompt length warning metadata starts over 6000 characters, and Admin Lab validation fails over 8000 characters.

## Validator Behavior

The V4 validator checks:

- target word appears
- translation/gloss appears
- target and translation are not reversed
- prompt says horizontal 16:9
- concrete language names are present
- banned visible metadata is absent
- raw JSON keys are absent
- vocabulary-first instruction is present
- no fake facts, quotes, etymologies, or forced mnemonics
- enough learning modules are referenced
- prompt length is within bounds

If validation fails on the first writer pass, V4 asks the writer for one repair with explicit feedback. If the repaired prompt still fails, Admin Lab records the validator errors and stops before the provider. It does not silently fall back to V2.

## Admin Lab Visibility

Admin Word Detail now shows enough card-row state for paid testing:

- generation job id
- word status
- current stage
- failed stage
- retry requested and retry timestamp
- queue/worker state summary
- output URL presence
- provider model
- final prompt char count
- prompt length warning
- final prompt preview
- V4 validator passed/errors/retry count
- V4 dense editorial category and rule ratio estimate

This is intentionally not a full dashboard; it is enough to distinguish queued, waiting behind same-deck lock, provider running, failed, retry requested, complete-with-output, and complete-without-output states.

## Retry Feedback

Retry/regeneration now checks local row state before submitting a duplicate request:

- `retry_requested` shows “Retry already queued/requested”
- active processing stages show “Currently processing”
- server-side `already_requested` responses refresh the row list and show the current status

Failed rows still use the existing retry path when retry is possible.

## Isolated Deck-Per-Row Mode

Deferred. Same-deck serialization remains unchanged. A one-deck-per-row Admin Lab smoke-test mode is useful, but it touches batching/deck creation semantics and should be implemented separately after the status visibility changes are verified.

## Recommended Production Test Sequence

1. Run one V4 row with a practical noun such as `winner` / `Gewinner`.
2. Confirm Admin Word Detail shows validator metadata and `provider_model = gpt-image-2-text-to-image`.
3. Run `chess` / `Schach` and verify the prompt title/gloss orientation before approving more rows.
4. Run a short same-deck batch and use the queue/worker state summary to confirm serialization rather than stuckness.
5. Only then compare V4 output density against V1/V2/V3.

## Remaining Limitations

- The UI exposes row state but does not yet provide a full queue dashboard.
- Same-deck lock still means one bad provider job can delay later same-deck rows.
- Validator pass does not prove visual readability or final image text accuracy.
