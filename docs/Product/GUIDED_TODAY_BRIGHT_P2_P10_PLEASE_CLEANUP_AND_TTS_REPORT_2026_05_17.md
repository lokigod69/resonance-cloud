# Guided Today PR6: Bright P2-P10 Please Cleanup + Phrase TTS

Date: 2026-05-17

## Scope

- Content: Bright-only English A1 Practical paths 2-10.
- TTS generation: Bright-only English A1 Practical paths 2-10, surfaces `corePhrase` and `chunk`.
- Deferred: `trophyWord`, `trophyWord.example`, lesson items as TTS, type recall, build chips, speak pre-recognition playback, review/path-check/segment-review, Wistful, Sharp, other languages, music/Suno/trophy songs.

## Final Bright P2-P10 Phrase List

### english-a1-practical-2

1. Hi there, I don't understand. Could you help me?
2. Could you write it down?
3. Could you show me on the map?
4. Which one is better, this one or that one?
5. Hi, is this available today?
6. Could I pay by card?
7. Could I get a receipt and a bag?
8. Hi, I have a booking.
9. Is this the right bus?
10. One moment! I'm almost ready.

### english-a1-practical-3

1. Excuse me, should I turn left here?
2. Is it about five minutes away?
3. Is it open now?
4. Which bus goes to the museum?
5. Is the next stop Central Park?
6. One ticket to the city, please.
7. What time does it close today?
8. Is it on the corner?
9. Should we walk there or take a taxi?
10. Sorry, I missed my stop. Could you help me?

### english-a1-practical-4

1. Could we have a table for two?
2. Could I see the menu?
3. I'd like a tea with lemon.
4. No sugar for me, thank you.
5. Is it fresh today?
6. Yes, a croissant too.
7. Could I get that to go?
8. That was lovely, thank you.
9. Beautiful day, isn't it?
10. Could I have the bill?

### english-a1-practical-5

1. I'm so sorry I'm late!
2. Oh, I forgot. Sorry!
3. What's your name?
4. Nice to meet you!
5. Where are you from?
6. Do you live here?
7. Are you free tonight?
8. Let's meet at the café!
9. Could we try tomorrow?
10. See you tomorrow!

### english-a1-practical-6

1. I don't feel well. Could you help me?
2. Could you show me a pharmacy nearby?
3. I need medicine.
4. It hurts here.
5. I have a headache.
6. Could I have some water?
7. Is there a doctor here?
8. I have an allergy.
9. Could you get help for me?
10. I feel better now, thank you.

### english-a1-practical-7

1. I need a ticket.
2. Where is the bus stop?
3. What time does the bus leave?
4. Is this the right train?
5. I need a taxi.
6. Can we go there?
7. Could you stop here?
8. I am going to the station.
9. How long does it take?
10. I have arrived, thank you.

### english-a1-practical-8

1. I have a reservation.
2. I need a room.
3. Where is my room?
4. I need the key, please.
5. Is there Wi-Fi here?
6. Where is the bathroom?
7. I need a towel.
8. I want to sleep now.
9. What time is breakfast?
10. I am checking out now.

### english-a1-practical-9

1. Hi, I'm really glad to meet you.
2. Are you free today?
3. Can we meet later?
4. What time works for you?
5. Let's meet here.
6. I am waiting outside.
7. I am running late.
8. Can we change the plan?
9. See you tomorrow.
10. Have a good evening.

### english-a1-practical-10

1. Today was good.
2. I liked this place.
3. Thank you for your help.
4. I learned a lot today.
5. I am tired now.
6. I need to go now.
7. See you next time.
8. Tomorrow works for me.
9. Have a good night.
10. Goodbye for now.

## Please Cleanup

Before PR6, Bright P2-P10 core phrases contained 18 `please` occurrences. After PR6, they contain 2.

Removed:

- P2 L2: `Could you write it down, please?` -> `Could you write it down?`
- P2 L6: `Could I pay by card, please?` -> `Could I pay by card?`
- P3 L4: `Which bus goes to the museum, please?` -> `Which bus goes to the museum?`
- P3 L6: `Could I get one ticket to the city, please?` -> `One ticket to the city, please.`
- P4 L1: `Could we have a table for two, please?` -> `Could we have a table for two?`
- P4 L2: `Could I see the menu, please?` -> `Could I see the menu?`
- P4 L3: `I'd like a tea with lemon, please.` -> `I'd like a tea with lemon.`
- P4 L6: `Yes, a croissant too, please.` -> `Yes, a croissant too.`
- P4 L7: `Could I get that to go, please?` -> `Could I get that to go?`
- P4 L10: `Could I have the bill, please?` -> `Could I have the bill?`
- P6 L3: `I need medicine, please.` -> `I need medicine.`
- P6 L6: `Could I have some water, please?` -> `Could I have some water?`
- P7 L1: `I need a ticket, please.` -> `I need a ticket.`
- P7 L5: `I need a taxi, please.` -> `I need a taxi.`
- P7 L7: `Please stop here.` -> `Could you stop here?`
- P8 L2: `I need a room, please.` -> `I need a room.`
- P8 L7: `I need a towel, please.` -> `I need a towel.`

Retained:

- P3 L6: `One ticket to the city, please.` This is a compact service-counter formula where `please` is natural.
- P8 L4: `I need the key, please.` This is a short hotel desk request where removing `please` can sound abrupt.

## Fields Changed

For changed Bright lessons, dependent fields were updated consistently:

- `corePhrase.targetText`
- `corePhrase.baseText`
- `meaning`
- `chunks`
- `build.targetText` via the shared variant builder
- `build.chips`
- `typeRecall.before`
- `typeRecall.answer`
- `typeRecall.after`
- `typeRecall.fallbackChoices` where the visible phrase changed substantially
- `speakTarget.targetPhrase` via the shared variant builder
- `speakTarget.baseCue` via the shared variant builder
- `sceneCaption` where the stop-here phrase changed from imperative to question
- `trophyWord.example` for P7 L7 to match `Could you stop here?`
- Bright lesson item chunks only where removed `please` no longer belonged in the main phrase.

Paths 5, 9, and 10 were intentionally kept unchanged.

## Dry-Run Counts

Dry-run command scope:

- paths: `english-a1-practical-2` through `english-a1-practical-10`
- vibe: `bright`
- surfaces: `corePhrase,chunks`
- emitted chunk surface: `chunk`

Dry-run totals:

- rows: 301
- ready: 11
- missing: 290
- missing_voice_profile: 0
- unique_normalized_texts: 253
- unique_cache_keys: 253
- duplicates_skipped: 48
- estimated_provider_calls: 245
- estimated_provider_characters: 3859

Per-path dry-run rows:

- P2: 37 rows, 3 ready, 34 missing
- P3: 37 rows, 2 ready, 35 missing
- P4: 33 rows, 2 ready, 31 missing
- P5: 31 rows, 0 ready, 31 missing
- P6: 35 rows, 0 ready, 35 missing
- P7: 33 rows, 0 ready, 33 missing
- P8: 34 rows, 1 ready, 33 missing
- P9: 31 rows, 1 ready, 30 missing
- P10: 30 rows, 2 ready, 28 missing

Per-surface dry-run rows:

- `corePhrase`: 90 rows, 0 ready, 90 missing
- `chunk`: 211 rows, 11 ready, 200 missing

The dry-run stayed below the stop thresholds of 450 provider calls and 8000 characters.

## Commit Generation Counts

Commit run:

- run_id: `691de06e-1d84-49f7-83f6-d7b304bb232d`
- scope_key: `a1p2-p10-bright-core-chunks`
- rows: 301
- ready at start: 11
- missing at start: 290
- generated_assets: 245
- failed_assets: 0

The generated asset count is lower than missing rows because duplicate normalized texts share cache keys and create additional usage rows without duplicate provider calls.

## Playback Verification

Live `guided_tts_playback` verification after commit:

- Bright P2-P10 `corePhrase` + `chunk` playback rows: 301
- Bright P2-P10 `corePhrase` rows: 90
- Bright P2-P10 `chunk` rows: 211
- Bright P2-P10 rows missing `public_url`: 0
- Bright P2-P10 `trophyWord` rows: 0
- P2-P10 Wistful/Sharp playback rows: 0
- Bright P1 playback rows still intact: 46
- Other-language playback rows: 0

This means `/today` Bright P2-P10 can use stored phrase audio for authenticated sessions on the PR3 playback surfaces that request `corePhrase` and `chunk`.

## Confirmations

- No `trophyWord` generation was run for P2-P10.
- No Wistful or Sharp content was edited.
- No Wistful or Sharp TTS usage rows were created for P2-P10.
- No Spanish, Italian, French, Portuguese, German, Cebuano, or Indonesian content was edited.
- No non-English TTS playback rows were created.
- No Supabase schema changes were made.
- No `guided_voice_profiles` changes were made.
- No frontend playback code changes were made.
- No music/Suno/trophy-song code changes were made.
- No `--allow-unscoped-commit` shortcut was used.

## Checks Run

- `npx tsx scripts/test-guided-today-data.ts`
- `npx tsx scripts/test-guided-vibes.ts`
- `npx tsx scripts/test-guided-today-path-overview.ts`
- `npx tsx scripts/test-guided-tts-inventory.ts`
- `npx tsx scripts/test-guided-audio-playback.ts`
- `npm run test:guided-today`
- `npm run build`
- `uv --native-tls run --with pytest pytest tests/test_guided_tts_generate.py -q`

Final lint/diff checks are run immediately before commit.

## Next Step Recommendation

PR7 should review Bright P2-P10 trophy words, then generate Bright P2-P10 `trophyWord` only if product approves the trophy vocabulary. Wistful and Sharp should remain deferred until their own content QA passes.
