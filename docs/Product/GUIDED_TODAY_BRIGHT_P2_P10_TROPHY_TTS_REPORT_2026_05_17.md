# Guided Today PR7: Bright P2-P10 TrophyWord TTS

Date: 2026-05-17

## Scope

- TTS generation: Bright-only English A1 Practical paths 2-10, surface `trophyWord` only.
- Voice profile: `english_a1_bright_v1`.
- Expected voice: Elisa.
- Model: `eleven_flash_v2_5`.
- Output format: `mp3_44100_128`.
- Deferred: `corePhrase`, `chunk`, `trophyWord.example`, lesson items, type recall, build chips, speak pre-recognition playback, review/path-check/segment-review, Wistful, Sharp, other languages, videos, music/Suno, and trophy songs.

## TrophyWord Audit

All 90 Bright P2-P10 trophy words have a non-blank `word`, `meaning`, and `example`.

| Path | Lesson | Title | trophyWord.word | trophyWord.meaning | trophyWord.example |
| --- | ---: | --- | --- | --- | --- |
| english-a1-practical-2 | 1 | I don't understand | happy | froh | Happy, thank you. |
| english-a1-practical-2 | 2 | Write it down | warm | herzlich | Warm thanks. |
| english-a1-practical-2 | 3 | Show me | map | Karte | On the map. |
| english-a1-practical-2 | 4 | Which one? | fine | gut / in Ordnung | A fine choice. |
| english-a1-practical-2 | 5 | Do you have...? | fresh | frisch | Fresh, thank you. |
| english-a1-practical-2 | 6 | By card | pay | bezahlen | I can pay by card. |
| english-a1-practical-2 | 7 | A receipt, please | neat | ordentlich | Neat, thanks. |
| english-a1-practical-2 | 8 | I have a reservation | kind | freundlich | Kind of you, thanks. |
| english-a1-practical-2 | 9 | Is this right? | sure | sicher | Sure, thank you. |
| english-a1-practical-2 | 10 | One moment | cheerful | heiter | Cheerful, thank you. |
| english-a1-practical-3 | 1 | Right or left? | friendly | freundlich | Friendly direction, thanks. |
| english-a1-practical-3 | 2 | How far is it? | minutes | Minuten | Five minutes away. |
| english-a1-practical-3 | 3 | Is it open? | hours | Öffnungszeiten | What are your hours? |
| english-a1-practical-3 | 4 | Which bus? | museum | Museum | Which bus to the museum? |
| english-a1-practical-3 | 5 | The next stop | steady | ruhig | Steady, next stop. |
| english-a1-practical-3 | 6 | A ticket, please | valid | gültig | Valid ticket. |
| english-a1-practical-3 | 7 | What time does it close? | closing | Schließung | Closing time, please. |
| english-a1-practical-3 | 8 | The corner | corner | Ecke | On the corner. |
| english-a1-practical-3 | 9 | By foot or by taxi? | walkable | zu Fuß machbar | It is walkable. |
| english-a1-practical-3 | 10 | I missed my stop | helped | geholfen | You helped me. |
| english-a1-practical-4 | 1 | A table, please | welcome | willkommen | Welcome in. |
| english-a1-practical-4 | 2 | The menu | choice | Auswahl | Good choice. |
| english-a1-practical-4 | 3 | I'd like tea | cozy | gemütlich | Cozy tea, thanks. |
| english-a1-practical-4 | 4 | No sugar | clean | klar | Clean taste. |
| english-a1-practical-4 | 5 | Is it fresh? | crisp | knusprig | Crisp today. |
| english-a1-practical-4 | 6 | Anything else? | plenty | reichlich | Plenty, thank you. |
| english-a1-practical-4 | 7 | To go, please | bag | Tüte | In a bag, please. |
| english-a1-practical-4 | 8 | It was good | lovely | sehr schön | That was lovely. |
| english-a1-practical-4 | 9 | Small talk at the counter | chatty | gesprächig | A chatty day. |
| english-a1-practical-4 | 10 | The bill, please | settled | bezahlt | All settled. |
| english-a1-practical-5 | 1 | Sorry, I'm late | sincere | aufrichtig | Sincere sorry. |
| english-a1-practical-5 | 2 | I forgot | recover | wiederfinden | Recover and smile. |
| english-a1-practical-5 | 3 | What's your name? | curious | neugierig | Curious hello. |
| english-a1-practical-5 | 4 | Nice to meet you | pleasure | Vergnügen | A pleasure to meet you. |
| english-a1-practical-5 | 5 | Where are you from? | open | offen | Open question. |
| english-a1-practical-5 | 6 | Do you live here? | neighbor | Nachbar | Neighbor nearby. |
| english-a1-practical-5 | 7 | Are you free tonight? | tonight | heute Abend | Free tonight? |
| english-a1-practical-5 | 8 | Let's meet at the café | invite | einladen | I invite you! |
| english-a1-practical-5 | 9 | Maybe tomorrow | hopeful | hoffnungsvoll | Hopeful tomorrow. |
| english-a1-practical-5 | 10 | See you tomorrow | farewell | Abschied | Warm farewell. |
| english-a1-practical-6 | 1 | I don't feel well | safe | sicher | I want to feel safe. |
| english-a1-practical-6 | 2 | A pharmacy nearby? | pharmacy | Apotheke | The pharmacy is nearby. |
| english-a1-practical-6 | 3 | I need medicine | medicine | Medizin | I need medicine. |
| english-a1-practical-6 | 4 | It hurts here | here | hier | It hurts here. |
| english-a1-practical-6 | 5 | I have a headache | headache | Kopfschmerzen | I have a headache. |
| english-a1-practical-6 | 6 | I need water | water | Wasser | Could I have water? |
| english-a1-practical-6 | 7 | Is there a doctor? | visit | Besuch | A doctor visit, please. |
| english-a1-practical-6 | 8 | I have an allergy | careful | vorsichtig | Careful, I have an allergy. |
| english-a1-practical-6 | 9 | Can you call for help? | get | holen | Could you get help? |
| english-a1-practical-6 | 10 | I feel better now | pleased | erfreut | Pleased to be okay. |
| english-a1-practical-7 | 1 | I need a ticket | ticket | Fahrkarte | I need a ticket. |
| english-a1-practical-7 | 2 | Where is the bus? | bus | Bus | Where is the bus? |
| english-a1-practical-7 | 3 | What time does it leave? | leave | abfahren | What time does it leave? |
| english-a1-practical-7 | 4 | Is this the right train? | train | Zug | Is this the right train? |
| english-a1-practical-7 | 5 | I need a taxi | taxi | Taxi | I need a taxi. |
| english-a1-practical-7 | 6 | Can we go there? | there | dorthin | Can we go there? |
| english-a1-practical-7 | 7 | Please stop here | stop | halten | Could you stop here? |
| english-a1-practical-7 | 8 | I am going to the station | station | Bahnhof | I am going to the station. |
| english-a1-practical-7 | 9 | How long does it take? | ride | Fahrt | Short ride. |
| english-a1-practical-7 | 10 | I have arrived | arrived | angekommen | I have arrived. |
| english-a1-practical-8 | 1 | I have a reservation | reservation | Reservierung | I have a reservation. |
| english-a1-practical-8 | 2 | I need a room | room | Zimmer | I need a room. |
| english-a1-practical-8 | 3 | Where is my room? | floor | Etage | Which floor? |
| english-a1-practical-8 | 4 | I need the key | key | Schlüssel | I need the key. |
| english-a1-practical-8 | 5 | Is there Wi-Fi? | Wi-Fi | WLAN | Is there Wi-Fi? |
| english-a1-practical-8 | 6 | Where is the bathroom? | bathroom | Bad | Where is the bathroom? |
| english-a1-practical-8 | 7 | I need a towel | towel | Handtuch | I need a towel. |
| english-a1-practical-8 | 8 | I want to sleep | sleep | schlafen | I want to sleep. |
| english-a1-practical-8 | 9 | What time is breakfast? | breakfast | Frühstück | What time is breakfast? |
| english-a1-practical-8 | 10 | I am checking out | checking out | auschecken | I am checking out. |
| english-a1-practical-9 | 1 | Nice to meet you | meet | treffen | I'm really glad to meet you. |
| english-a1-practical-9 | 2 | Are you free today? | free | frei | Are you free today? |
| english-a1-practical-9 | 3 | Can we meet later? | later | später | Can we meet later? |
| english-a1-practical-9 | 4 | What time works for you? | time | Zeit | What time works for you? |
| english-a1-practical-9 | 5 | Let's meet here | café | Café | Let's meet at the café. |
| english-a1-practical-9 | 6 | I am waiting outside | waiting | warten | I am waiting outside. |
| english-a1-practical-9 | 7 | I am running late | late | spät | I am running late. |
| english-a1-practical-9 | 8 | Can we change the plan? | change | ändern | Can we change the plan? |
| english-a1-practical-9 | 9 | See you tomorrow | day | Tag | See you another day. |
| english-a1-practical-9 | 10 | Have a good evening | evening | Abend | Have a good evening. |
| english-a1-practical-10 | 1 | Today was good | today | heute | Today was good. |
| english-a1-practical-10 | 2 | I liked this place | place | Ort | I liked this place. |
| english-a1-practical-10 | 3 | Thank you for your help | thank you | danke | Thank you for your help. |
| english-a1-practical-10 | 4 | I learned a lot | learned | gelernt | I learned a lot today. |
| english-a1-practical-10 | 5 | I am tired now | nap | Nickerchen | A short nap. |
| english-a1-practical-10 | 6 | I need to go | go | gehen | I need to go now. |
| english-a1-practical-10 | 7 | See you next time | next time | nächstes Mal | See you next time. |
| english-a1-practical-10 | 8 | Tomorrow works for me | tomorrow | morgen | Tomorrow works for me. |
| english-a1-practical-10 | 9 | Have a good night | night | Nacht | Have a good night. |
| english-a1-practical-10 | 10 | Goodbye for now | goodbye | auf Wiedersehen | Goodbye for now. |

## Dry-Run Counts

Dry-run command scope:

- paths: `english-a1-practical-2` through `english-a1-practical-10`
- vibe: `bright`
- surface: `trophyWord`

Dry-run totals:

- rows: 90
- ready: 19
- missing: 71
- missing_voice_profile: 0
- unique_normalized_texts: 90
- unique_cache_keys: 90
- duplicates_skipped: 0
- estimated_provider_calls: 71
- estimated_provider_characters: 400
- total_character_count_all_voices: 516

Per-path dry-run rows:

- P2: 10 rows, 0 ready, 10 missing, 44 estimated provider characters
- P3: 10 rows, 0 ready, 10 missing, 64 estimated provider characters
- P4: 10 rows, 1 ready, 9 missing, 49 estimated provider characters
- P5: 10 rows, 1 ready, 9 missing, 62 estimated provider characters
- P6: 10 rows, 2 ready, 8 missing, 47 estimated provider characters
- P7: 10 rows, 5 ready, 5 missing, 28 estimated provider characters
- P8: 10 rows, 2 ready, 8 missing, 50 estimated provider characters
- P9: 10 rows, 3 ready, 7 missing, 32 estimated provider characters
- P10: 10 rows, 5 ready, 5 missing, 24 estimated provider characters

The dry-run stayed below the stop thresholds of 120 provider calls and 2000 provider characters. The inventory contained no Wistful rows, no Sharp rows, no non-English paths, and no surfaces other than `trophyWord`.

## Commit Generation Counts

Commit run:

- run_id: `65b3e17d-5e43-4963-a616-69030a6b0977`
- scope_key: `a1p2-p10-bright-trophyword`
- rows: 90
- ready at start: 19
- missing at start: 71
- generated_assets: 71
- failed_assets: 0
- provider calls: 71
- provider characters: 400
- total scoped characters: 516
- reused/cache-hit assets: 19
- duplicate normalized texts skipped: 0
- usage rows now present for the scope: 90

No `--allow-unscoped-commit` shortcut was used.

## Playback Verification

Live `guided_tts_playback` verification after commit:

- Bright P2-P10 `trophyWord` playback rows: 90
- Bright P2-P10 `trophyWord` rows missing `public_url`: 0
- Bright P2-P10 `corePhrase` + `chunk` playback rows still ready: 301
- Bright P2-P10 `corePhrase` rows: 90
- Bright P2-P10 `chunk` rows: 211
- Bright P1 playback rows still intact: 46
- P2-P10 Wistful/Sharp `trophyWord` playback rows: 0
- P2-P10 Bright `trophyWord.example` playback rows: 0
- Bright P2-P10 `trophyWord` usage rows: 90

This means `/today` Bright English A1 P1-P10 now has stored MP3 playback available for the PR3 playback surfaces: `corePhrase`, `chunk`, and `trophyWord`.

## Confirmations

- No content changes were made.
- No Wistful or Sharp generation was run.
- No other-language generation was run.
- No `corePhrase` generation was run in PR7.
- No `chunk` generation was run in PR7.
- No `trophyWord.example` generation was run.
- No Supabase schema changes were made.
- No `guided_voice_profiles` changes were made.
- No frontend playback code changes were made.
- No music/Suno/trophy-song code changes were made.

## Checks Run

- `npx tsx scripts/test-guided-today-data.ts`
- `npx tsx scripts/test-guided-vibes.ts`
- `npx tsx scripts/test-guided-today-path-overview.ts`
- `npx tsx scripts/test-guided-tts-inventory.ts`
- `npx tsx scripts/test-guided-audio-playback.ts`
- `npm run test:guided-today`
- `npm run build`
- `uv --native-tls run --with pytest pytest tests/test_guided_tts_generate.py -q`
- `python -m py_compile src/services/guided_tts/generate.py src/services/guided_tts/inventory.py`
- `git diff --check`

## Next Step Recommendation

PR8 should manually spot-check authenticated `/today` playback for a few Bright P2-P10 trophy listens and then decide whether Wistful/Sharp content QA should start before expanding any non-Bright TTS scope.
