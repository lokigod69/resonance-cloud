# Guided Trophy Song A1P1 Audio Generation Report

Date: 2026-05-15
Scope: local MP3 generation and static catalog wiring for `english-a1-practical-1`

## Files changed

- `frontend/src/data/guidedTrophySongs.ts`
- `frontend/src/lib/trophySongsClient.ts`
- `frontend/scripts/test-guided-trophy-songs.ts`
- `frontend/scripts/test-guided-trophy-cloze.ts`
- `frontend/scripts/generate-guided-trophy-song-audio.ts`
- `frontend/public/guided/trophy-songs/a1p1/manifest.json`
- `frontend/public/guided/trophy-songs/a1p1/**/candidate-a.mp3`
- `frontend/public/guided/trophy-songs/a1p1/**/candidate-b.mp3`
- `docs/Product/GUIDED_TROPHY_SONG_A1P1_AUDIO_GENERATION_REPORT.md`

## Generation summary

Each catalog row was submitted once to KIE/Suno after confirming `providerLyrics` contained no `<<` or `>>` wrappers. `musicCaption` was sent as the style/caption. Candidate A is wired as the active song in the static catalog. Candidate B was returned for all six rows and saved for later review.

| Catalog ID | KIE task ID | Active | Candidate A public path | Candidate B exists |
|---|---|---|---|---|
| `english-a1-practical-1-segment-1-bright-trophy-song` | `f19a9fd7c445d2a6356d55fc3c2607aa` | A | `/guided/trophy-songs/a1p1/english-a1-practical-1-segment-1-bright-trophy-song/candidate-a.mp3` | yes |
| `english-a1-practical-1-segment-2-bright-trophy-song` | `7ac2621735c8a015d9e38761a0e51ce5` | A | `/guided/trophy-songs/a1p1/english-a1-practical-1-segment-2-bright-trophy-song/candidate-a.mp3` | yes |
| `english-a1-practical-1-segment-1-wistful-trophy-song` | `97610077c0b6b07c37a9fbd7bc8cc9b4` | A | `/guided/trophy-songs/a1p1/english-a1-practical-1-segment-1-wistful-trophy-song/candidate-a.mp3` | yes |
| `english-a1-practical-1-segment-2-wistful-trophy-song` | `f1d035290393054c305fc5612bb5bb02` | A | `/guided/trophy-songs/a1p1/english-a1-practical-1-segment-2-wistful-trophy-song/candidate-a.mp3` | yes |
| `english-a1-practical-1-segment-1-sharp-trophy-song` | `67f74b1a13555598cb5c353796e650d9` | A | `/guided/trophy-songs/a1p1/english-a1-practical-1-segment-1-sharp-trophy-song/candidate-a.mp3` | yes |
| `english-a1-practical-1-segment-2-sharp-trophy-song` | `5047da9727bcbee7b3d940b9f523f896` | A | `/guided/trophy-songs/a1p1/english-a1-practical-1-segment-2-sharp-trophy-song/candidate-a.mp3` | yes |

## Local MP3 files

- `frontend/public/guided/trophy-songs/a1p1/english-a1-practical-1-segment-1-bright-trophy-song/candidate-a.mp3`
- `frontend/public/guided/trophy-songs/a1p1/english-a1-practical-1-segment-1-bright-trophy-song/candidate-b.mp3`
- `frontend/public/guided/trophy-songs/a1p1/english-a1-practical-1-segment-2-bright-trophy-song/candidate-a.mp3`
- `frontend/public/guided/trophy-songs/a1p1/english-a1-practical-1-segment-2-bright-trophy-song/candidate-b.mp3`
- `frontend/public/guided/trophy-songs/a1p1/english-a1-practical-1-segment-1-wistful-trophy-song/candidate-a.mp3`
- `frontend/public/guided/trophy-songs/a1p1/english-a1-practical-1-segment-1-wistful-trophy-song/candidate-b.mp3`
- `frontend/public/guided/trophy-songs/a1p1/english-a1-practical-1-segment-2-wistful-trophy-song/candidate-a.mp3`
- `frontend/public/guided/trophy-songs/a1p1/english-a1-practical-1-segment-2-wistful-trophy-song/candidate-b.mp3`
- `frontend/public/guided/trophy-songs/a1p1/english-a1-practical-1-segment-1-sharp-trophy-song/candidate-a.mp3`
- `frontend/public/guided/trophy-songs/a1p1/english-a1-practical-1-segment-1-sharp-trophy-song/candidate-b.mp3`
- `frontend/public/guided/trophy-songs/a1p1/english-a1-practical-1-segment-2-sharp-trophy-song/candidate-a.mp3`
- `frontend/public/guided/trophy-songs/a1p1/english-a1-practical-1-segment-2-sharp-trophy-song/candidate-b.mp3`

## Provider input safety

- `providerLyrics` was used for every submit.
- `rawLyricsWithWrappers` was never sent to KIE/Suno.
- The generator script fails before submit if `providerLyrics` or `displayLyrics` contains wrapper markers.
- The validation script confirms `providerLyrics` and `displayLyrics` still have no wrappers.
- German translations remained intact in `lyricsTranslationDe` for all six catalog rows.

## Failures and retries

- Initial command `npx tsx scripts/generate-guided-trophy-song-audio.ts` failed before any KIE task was created because Node rejected the KIE TLS certificate chain: `UNABLE_TO_VERIFY_LEAF_SIGNATURE`.
- A local-only TLS workaround was added to the isolated prototype generation script. The subsequent run created exactly six KIE task IDs, one per catalog row.
- No KIE/Suno generation retry or quality regeneration was performed.
- No row failed after provider submission.

## Exact commands run

- `Test-Path frontend/src/data/guidedTrophySongs.ts`
- `Test-Path docs/Product/GUIDED_TROPHY_SONG_A1P1_STATIC_WIRING_REPORT.md`
- `Get-Content -Raw frontend/src/data/guidedTrophySongs.ts`
- `Get-Content -Raw frontend/src/lib/trophySongsClient.ts`
- `Get-Content -Raw src/suno.py`
- `Get-Content -Raw src/services/song_only_suno.py`
- `Get-Content -Raw docs/Product/GUIDED_TROPHY_SONG_A1P1_STATIC_WIRING_REPORT.md`
- `git status --short --branch`
- `npx tsx scripts/test-guided-trophy-songs.ts`
- `Select-String -Path .env -Pattern '^KIE_API_KEY='`
- `python -c "<httpx TLS probe>"`
- `curl.exe --ssl-no-revoke -I https://api.kie.ai/api/v1/generate/record-info?taskId=tls-check`
- `npx eslint scripts/generate-guided-trophy-song-audio.ts scripts/test-guided-trophy-songs.ts`
- `npx tsx scripts/generate-guided-trophy-song-audio.ts` - first run failed before submit due local TLS verification
- `npx tsx scripts/generate-guided-trophy-song-audio.ts` - second run submitted six KIE tasks and downloaded audio
- `Get-Content -Raw frontend/public/guided/trophy-songs/a1p1/manifest.json`
- `Get-ChildItem -Recurse frontend/public/guided/trophy-songs/a1p1 -File`
- `npx tsx scripts/test-guided-trophy-cloze.ts`
- `npx tsx scripts/test-guided-trophy-songs.ts`
- `npm run check:i18n`
- `npx eslint src/data/guidedTrophySongs.ts src/lib/trophySongsClient.ts src/components/today/trophy/TrophyLyricClozeDrill.tsx scripts/test-guided-trophy-songs.ts scripts/test-guided-trophy-cloze.ts scripts/generate-guided-trophy-song-audio.ts`
- `npm run build`
- `git diff --check`
- `git diff --cached --check`

## Explicit non-changes

No Supabase persistence was implemented.
No Music page integration was implemented.
No deck rows were created.
No word rows were created.
No user credits were charged or changed.
`frontend/src/data/guidedLessons.ts` was not modified.
The normal generation pipeline was not modified.
