# Guided Today A1P1 Cafe Video Upload And Reorder Report

Date: 2026-05-21

## Scope

Uploaded the five operator-approved A1P1 cafe MP4s from:

`D:\CODING\ResonanceTEST\home\Phase1\guided_today\a1p1\cafe`

No video was regenerated. No Supabase schema, storage policy, database row, backend persistence, generation pipeline, deck, word, job, LTX, KIE, TTS, or lip-sync code was changed.

## Source Files

| Story | Local source | Expected phrase | ffprobe status |
| --- | --- | --- | --- |
| 1 | `D:\CODING\ResonanceTEST\home\Phase1\guided_today\a1p1\cafe\1.mp4` | `Hi there, do you speak English?` | Valid MP4, H.264 video, AAC audio |
| 2 | `D:\CODING\ResonanceTEST\home\Phase1\guided_today\a1p1\cafe\2.mp4` | `Sorry, could you say that again?` | Valid MP4, H.264 video, AAC audio |
| 3 | `D:\CODING\ResonanceTEST\home\Phase1\guided_today\a1p1\cafe\3.mp4` | `I'd like a coffee, please.` | Valid MP4, H.264 video, AAC audio |
| 4 | `D:\CODING\ResonanceTEST\home\Phase1\guided_today\a1p1\cafe\4.mp4` | `How much is this?` | Valid MP4, H.264 video, AAC audio |
| 5 | `D:\CODING\ResonanceTEST\home\Phase1\guided_today\a1p1\cafe\5.mp4` | `Wonderful, thanks so much. Goodbye.` | Valid MP4, H.264 video, AAC audio |

ASR was not available in the local Python/CLI environment, so transcripts were not used as a blocking check. The files were operator-approved source of truth.

## Supabase Upload

Environment was resolved from the existing repo `.env`; secret values were not printed. Existing bucket used: `videos`.

Storage prefix:

`guided-today/a1p1/cafe/v1/`

| Story | Storage path | Public URL |
| --- | --- | --- |
| 1 | `guided-today/a1p1/cafe/v1/s01_first_contact.mp4` | `https://rkiucrrusrwgcviodysp.supabase.co/storage/v1/object/public/videos/guided-today/a1p1/cafe/v1/s01_first_contact.mp4` |
| 2 | `guided-today/a1p1/cafe/v1/s02_polite_followup.mp4` | `https://rkiucrrusrwgcviodysp.supabase.co/storage/v1/object/public/videos/guided-today/a1p1/cafe/v1/s02_polite_followup.mp4` |
| 3 | `guided-today/a1p1/cafe/v1/s03_coffee_order.mp4` | `https://rkiucrrusrwgcviodysp.supabase.co/storage/v1/object/public/videos/guided-today/a1p1/cafe/v1/s03_coffee_order.mp4` |
| 4 | `guided-today/a1p1/cafe/v1/s04_price_question.mp4` | `https://rkiucrrusrwgcviodysp.supabase.co/storage/v1/object/public/videos/guided-today/a1p1/cafe/v1/s04_price_question.mp4` |
| 5 | `guided-today/a1p1/cafe/v1/s05_cafe_exit.mp4` | `https://rkiucrrusrwgcviodysp.supabase.co/storage/v1/object/public/videos/guided-today/a1p1/cafe/v1/s05_cafe_exit.mp4` |

Upload manifest:

`D:\CODING\ResonanceTEST\home\Phase1\guided_today\a1p1\cafe\A1P1_CAFE_SUPABASE_UPLOAD_MANIFEST.json`

## Lesson Order

Old visible order:

1. First contact
2. Polite follow-up
3. Where is...?
4. I'd like...
5. How much?
6. The train
7. I need...
8. I like...
9. Tomorrow at seven
10. Thank you, goodbye

New visible order:

1. First contact
2. Polite follow-up
3. Coffee order
4. Price question
5. Café exit
6. Ask for help
7. Train station
8. Train time
9. Small talk
10. Tomorrow at seven

Old-to-new mapping:

- New 1 = old 1
- New 2 = old 2
- New 3 = old 4
- New 4 = old 5
- New 5 = old 10
- New 6 = old 7
- New 7 = old 3
- New 8 = old 6
- New 9 = old 8
- New 10 = old 9

## Static Data Wiring

Bright lessons 1-5 now carry the uploaded Supabase MP4 URLs through `placeholderMedia.url`. Existing `materializeLessonMedia()` resolves those URLs into `lessonMedia.url`, and the existing Today scene renderer already renders a `<video>` when `lessonMedia.type === "video"` and a URL exists. No component change was needed.

Bright phrases were aligned to:

1. `Hi there, do you speak English?`
2. `Sorry, could you say that again?`
3. `I'd like a coffee, please.`
4. `How much is this?`
5. `Wonderful, thanks so much. Goodbye.`
6. `Hi, could you help me, please?`
7. `Where is the train station?`
8. `What time is the train, please?`
9. `I love it here.`
10. `Tomorrow at seven? Wonderful!`

Bright was fully aligned for the approved order and phrases. Wistful and Sharp were preserved and moved with the static lesson blocks; they were not rewritten to the new Bright cafe media phrases in this pass.

Lesson IDs were preserved. Visible order is controlled by `lessonNumber` and `lessonMetadata.sequence`, so this avoids a localStorage progress-key reset while reordering the path.

## Files Changed

- `frontend/src/data/guidedLessons.ts`
- `frontend/scripts/test-guided-a1p1-cafe-wiring.ts`
- `frontend/scripts/test-guided-today-data.ts`
- `frontend/scripts/test-guided-today-path-overview.ts`
- `docs/Product/GUIDED_TODAY_A1P1_CAFE_VIDEO_UPLOAD_AND_REORDER_REPORT.md`

Local media docs:

- `D:\CODING\ResonanceTEST\home\Phase1\guided_today\a1p1\cafe\A1P1_CAFE_APPROVED_VIDEO_VALIDATION.md`
- `D:\CODING\ResonanceTEST\home\Phase1\guided_today\a1p1\cafe\A1P1_CAFE_ONLINE_WIRING_REPORT.md`
- `D:\CODING\ResonanceTEST\home\Phase1\guided_today\a1p1\A1P1_CANONICAL_MEDIA_MAP.md`
- `D:\CODING\ResonanceTEST\home\Phase1\guided_today\a1p1\A1P1_CANONICAL_MEDIA_MANIFEST.json`

## Checks Run

- `npx tsx scripts/test-guided-a1p1-cafe-wiring.ts` - passed, 86/0
- `npx tsx scripts/test-guided-today-data.ts` - passed, 9249/0
- `npx tsx scripts/test-guided-today-path-overview.ts` - passed, 293/0
- `npx tsx scripts/test-guided-vibes.ts` - passed, 99/0
- `npx eslint src/data/guidedLessons.ts scripts/test-guided-a1p1-cafe-wiring.ts scripts/test-guided-today-data.ts scripts/test-guided-today-path-overview.ts` - passed
- `npm run build` - passed; Vite reported existing chunk-size/dynamic-import warnings
- `git diff --check` - passed

Manual authenticated browser verification was not completed in this pass. The runtime rendering contract was verified through the existing `LessonMediaFrame` implementation and the focused data wiring test.
