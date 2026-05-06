# Pipeline-Wide Music Lyrics Verification

Date: 2026-05-06

## Tests Run

Python commands used the repo venv at `.venv\Scripts\python.exe` because the system Python did not have `pytest`.

```bash
.\.venv\Scripts\python.exe -m pytest tests/test_suno_payload_excludes_translation.py tests/test_lyrics_translation.py tests/test_music_lyrics_store.py tests/test_music_only_translation.py tests/test_video_pipeline_lyrics_persistence.py -q
```

Result:

```text
14 passed in 0.60s
```

```bash
.\.venv\Scripts\python.exe -m pytest tests/test_music_only_worker.py tests/test_orchestration_music_state.py tests/test_orchestration_worker_retries.py -q
```

Result:

```text
41 passed in 51.17s
```

```bash
npm run build
```

Result: exit 0. Vite emitted existing chunk-size/dynamic-import warnings.

```bash
git diff --check
```

Result: exit 0.

## Mandatory Privacy Proof

`tests/test_suno_payload_excludes_translation.py` asserts:

- `build_suno_payload()` ignores `translated_lyrics`
- `build_suno_payload()` ignores `display_translation`
- `payload["prompt"]` equals the original source lyrics
- `"DO NOT SEND THIS TO SUNO"` does not appear anywhere in serialized payload JSON

## Song-Only Coverage

`tests/test_music_only_translation.py` covers:

- song-only worker writes a `music_lyrics` row after concept generation
- translated text is stored in `music_lyrics`
- translated text is not included in `concept_data` passed to Suno
- translation exceptions do not stop song submission

Existing song-only worker tests still pass.

## Video Pipeline Coverage

`tests/test_video_pipeline_lyrics_persistence.py` covers the upstream video submit path:

- lyrics persistence is called before Suno submit
- a lyrics persistence exception is swallowed
- Suno submit still runs

The downstream inline submit path uses the same shared helper and is wrapped with the same best-effort guard.

## Storage Coverage

`tests/test_music_lyrics_store.py` covers:

- inserted row shape for canonical lyrics and translation fields
- song-only source-job update behavior
- latest-row lookup ordering by `created_at desc`

## Translation Coverage

`tests/test_lyrics_translation.py` covers:

- valid JSON `ok`
- `target_equals_base` skip
- empty lyrics skip
- missing API key skip
- HTTP error as `failed`
- markdown fence stripping
- section tags accepted/preserved in returned text

No paid provider calls are made in tests; HTTP clients are faked.

## Tests Not Run

The exact user command with system Python was attempted:

```bash
python -m pytest tests/test_suno_payload_excludes_translation.py tests/test_lyrics_translation.py tests/test_music_lyrics_store.py tests/test_music_only_translation.py -q
```

It failed before collection because that interpreter does not have `pytest` installed:

```text
C:\Users\micha\AppData\Local\Programs\Python\Python312\python.exe: No module named pytest
```

The equivalent command was then run successfully through `.venv\Scripts\python.exe`.
