# Infographic V4 Validator Relaxation Report

## Why This Was Needed

Live Admin Lab showed safe words such as `onomatopoeia` / `Lautmalerei` failing before provider with “Validator failed before provider.” That meant GPT Image-2 was never called even though the prompt was not unsafe; the validator was treating missing ideal wording as a hard blocker.

## New Validator Behavior

V4 validation now separates hard errors from warnings.

Hard errors still block provider:

- empty final prompt
- target word missing
- translation/gloss missing
- target word and translation clearly reversed
- banned visible metadata such as `Zielsprache`, `Basissprache`, `target language`, `base language`, backend/model/template labels, enum values, or V1/V2/V3/V4
- raw JSON keys leaked into the provider prompt, including `type`, `style`, `composition`, `info_panels`, `visual_elements`, and `design_goals`
- prompt over the 8000 character hard limit

Warnings do not block provider:

- missing optional/ideal module count
- missing concrete language name
- missing horizontal 16:9 wording
- prompt over the soft warning threshold but under the hard limit
- missing exact `70/30` phrase when the prompt is otherwise vocabulary-first
- equivalent safety wording such as “avoid invented facts” instead of exact “no fake facts”

## Repair Flow

The V4 writer still gets one repair attempt when hard errors are present. After repair:

- hard errors remaining: fail before provider and record `failure_origin = validator`
- only warnings remaining: proceed to provider and record warnings
- no warnings: proceed normally

## Metadata

V4 metadata now includes:

- `validator_passed`
- `validator_errors` for backwards compatibility, currently hard errors
- `validator_hard_errors`
- `validator_warnings`
- `validator_retry_count`
- `provider_reached`
- `failure_origin` when failed before provider

Admin Word Detail shows hard errors and warnings separately.

## Safe Word Coverage

Tests cover safe V4 validation and provider reach for:

- `onomatopoeia` / `Lautmalerei`
- `flamboyant` / `extravagant`
- `punctuality` / `Pünktlichkeit`
- `authority` / `Autorität`
- `failure` / `Scheitern`

Mocked provider tests confirm warning-only V4 rows reach `gpt-image-2-text-to-image` with `aspect_ratio = 16:9`, `resolution = 1K`, and no `input_urls`.

## Remaining Risks

The validator now errs on not blocking safe prompts. It still cannot prove the generated image will be readable or faithful; Admin Lab review remains the source of truth for visual quality.
