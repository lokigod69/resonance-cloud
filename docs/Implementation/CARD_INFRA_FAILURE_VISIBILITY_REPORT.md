# Card Infrastructure Failure Visibility Report

## Why This Pass Was Needed

Admin Lab card testing was too opaque for paid prompt experiments. A row could show a generic card/image failure without making it clear whether it failed in the V4 validator, prompt writer, planner, provider request, provider polling, upload, recovery, or queueing.

This pass adds a small shared diagnostic classifier and surfaces the result in Deck View and Admin Word Detail.

## Failure Classifications

Rows are classified into:

- `validator_failed`
- `prompt_writer_failed`
- `planner_failed`
- `provider_rejected`
- `provider_timeout`
- `provider_failed`
- `upload_failed`
- `recovery_terminalized`
- `retry_already_requested`
- `waiting_same_deck_lock`
- `queued`
- `provider_running`
- `complete_with_output`
- `complete_missing_output`
- `unknown_failed`

## Fields Used

The classifier uses:

- `words.status`
- `words.current_stage`
- `words.failed_stage`
- `words.error_message`
- `words.retry_requested`
- `words.retry_requested_at`
- `words.thumbnail_url`
- `words.image_url`
- `words.card_image_url`
- `words.metadata.gpt_image_2_card.provider_model`
- `words.metadata.gpt_image_2_card.provider_reached`
- `words.metadata.gpt_image_2_card.provider_task_id`
- `words.metadata.gpt_image_2_card.kie_task_id`
- `words.metadata.gpt_image_2_card.provider_error_summary`
- `words.metadata.gpt_image_2_card.validator_passed`
- `words.metadata.gpt_image_2_card.validator_errors`
- generation job status/error when present on the row object

## UI Changes

Deck View now shows a compact diagnostic line for card deck rows that are failed, queued, or processing, such as:

- “Validator failed before provider”
- “Provider rejected request”
- “Provider timed out”
- “Waiting behind same-deck job”
- “Retry already requested / queued”
- “Queued”
- “Provider running”
- “Complete but output missing”

Admin Word Detail now shows:

- failure classification
- provider reach state
- generation job id/status/error when available
- output URL presence
- provider model
- provider task/KIE task id when available
- provider error summary
- validator passed/errors/retry count
- prompt writer model
- final prompt chars/warning/preview

If metadata says the provider was not reached, the detail panel explicitly shows “Provider was not reached.”

## Retry Behavior

The retry button now uses the same classifier:

- `retry_requested` blocks duplicate retries and shows “Retry already requested / queued.”
- active provider/worker rows show “Currently processing; retry not submitted.”
- complete rows with output do not submit a retry.
- provider failures and validator failures still allow retry, but the diagnostic text explains the origin.

## Backend Metadata

V4 before-provider failures now persist diagnostic metadata:

- validator failures: `provider_reached = false`, `failure_origin = validator`
- prompt writer failures: `provider_reached = false`, `failure_origin = prompt_writer`
- provider calls: `provider_reached = true`, plus `provider_task_id` / `kie_task_id` when returned
- provider failures: `provider_error_summary`

## Remaining Limitations

- Generation job status/error only appears when the row payload includes job data.
- The classifier is heuristic for legacy rows that lack structured metadata.
- Upload failures depend on `failed_stage` or error text being persisted by the worker/recovery path.
