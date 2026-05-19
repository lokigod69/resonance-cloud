# Guided Today PR5 Bright P2-P10 Content QA And Fixes

Date: 2026-05-17
Repo: `D:\CODING\ResonanceTEST\orchestrator`
Branch: `main`

## Scope

- Reviewed Bright-only English A1 Practical paths 2-10.
- Patched only minimal content issues in `frontend/src/data/guidedLessons.ts`.
- Added a Bright P2-P10 phrase baseline guardrail in `frontend/scripts/test-guided-today-data.ts`.
- No TTS generation was run.
- No ElevenLabs call was made.
- No Wistful or Sharp content was edited.
- No Spanish, Italian, French, Portuguese, or German lesson content was edited.
- No Supabase schema, `guided_voice_profiles`, playback code, music, Suno, or trophy-song code was edited.

## Audit Table

| path id | lesson | title | current Bright phrase | keep/change | proposed Bright phrase | reason |
|---|---:|---|---|---|---|---|
| english-a1-practical-2 | 1 | I don't understand | Hi there, I don't understand. Could you help me? | Keep | Hi there, I don't understand. Could you help me? | Natural A1 repair phrase. |
| english-a1-practical-2 | 2 | Write it down | Could you write it down, please? | Keep | Could you write it down, please? | Practical and natural service request. |
| english-a1-practical-2 | 3 | Show me | Could you show me on the map? | Keep | Could you show me on the map? | Clear learner-useful map request. |
| english-a1-practical-2 | 4 | Which one? | Which one is better, this one or that one? | Keep | Which one is better, this one or that one? | Slightly long but natural and useful. |
| english-a1-practical-2 | 5 | Do you have...? | Hi, is this available today? | Keep | Hi, is this available today? | Natural availability question. |
| english-a1-practical-2 | 6 | By card | Could I pay by card, please? | Keep | Could I pay by card, please? | Standard checkout phrase. |
| english-a1-practical-2 | 7 | A receipt, please | Could I get a receipt and a bag? | Keep | Could I get a receipt and a bag? | Natural checkout add-on. |
| english-a1-practical-2 | 8 | I have a reservation | Hi, my booking is ready. | Change | Hi, I have a booking. | "My booking is ready" sounded unnatural at arrival. |
| english-a1-practical-2 | 9 | Is this right? | Is this the right bus? | Keep | Is this the right bus? | Clear confirmation question. |
| english-a1-practical-2 | 10 | One moment | One moment! I'm almost ready. | Keep | One moment! I'm almost ready. | Warm but still practical. |
| english-a1-practical-3 | 1 | Right or left? | Excuse me, should I turn left here? | Keep | Excuse me, should I turn left here? | Natural street-direction question. |
| english-a1-practical-3 | 2 | How far is it? | Could you tell me, is it five minutes away? | Change | Is it about five minutes away? | Shorter and more natural for A1 distance. |
| english-a1-practical-3 | 3 | Is it open? | Is it open now, please? | Change | Is it open now? | Removed over-polite "please" from factual status question. |
| english-a1-practical-3 | 4 | Which bus? | Which bus goes to the museum, please? | Keep | Which bus goes to the museum, please? | Service-counter politeness is acceptable here. |
| english-a1-practical-3 | 5 | The next stop | Is the next stop Central Park, please? | Change | Is the next stop Central Park? | Removed unnatural "please" from confirmation question. |
| english-a1-practical-3 | 6 | A ticket, please | Could I get one ticket to the city, please? | Keep | Could I get one ticket to the city, please? | Natural ticket purchase request. |
| english-a1-practical-3 | 7 | What time does it close? | What time does it close today, please? | Change | What time does it close today? | Removed over-polite "please" from time question. |
| english-a1-practical-3 | 8 | The corner | Is it on the corner, please? | Change | Is it on the corner? | Removed unnatural "please" from landmark question. |
| english-a1-practical-3 | 9 | By foot or by taxi? | Should we walk there or take a taxi? | Keep | Should we walk there or take a taxi? | Natural transport choice. |
| english-a1-practical-3 | 10 | I missed my stop | Sorry, I missed my stop. Could you help me? | Keep | Sorry, I missed my stop. Could you help me? | Useful repair phrase. |
| english-a1-practical-4 | 1 | A table, please | Could we have a table for two, please? | Keep | Could we have a table for two, please? | Standard restaurant arrival phrase. |
| english-a1-practical-4 | 2 | The menu | Could I see the menu, please? | Keep | Could I see the menu, please? | Natural service request. |
| english-a1-practical-4 | 3 | I'd like tea | I'd love a tea with lemon, please. | Change | I'd like a tea with lemon, please. | "I'd like" is the normal A1 ordering phrase. |
| english-a1-practical-4 | 4 | No sugar | No sugar for me, thank you. | Keep | No sugar for me, thank you. | Natural preference phrase. |
| english-a1-practical-4 | 5 | Is it fresh? | Is it fresh today, please? | Change | Is it fresh today? | Removed over-polite "please" from factual freshness question. |
| english-a1-practical-4 | 6 | Anything else? | Yes, a croissant too, please. | Keep | Yes, a croissant too, please. | Natural add-on order. |
| english-a1-practical-4 | 7 | To go, please | Could I get that to go, please? | Keep | Could I get that to go, please? | Practical takeaway phrase. |
| english-a1-practical-4 | 8 | It was good | That was lovely, thank you. | Keep | That was lovely, thank you. | "Lovely" is useful in this food-service thanks context. |
| english-a1-practical-4 | 9 | Small talk at the counter | Beautiful day, isn't it? | Keep | Beautiful day, isn't it? | Short, normal small talk. |
| english-a1-practical-4 | 10 | The bill, please | Could I have the bill, please? | Keep | Could I have the bill, please? | Standard restaurant close. |
| english-a1-practical-5 | 1 | Sorry, I'm late | I'm so sorry I'm late! | Keep | I'm so sorry I'm late! | Natural apology. |
| english-a1-practical-5 | 2 | I forgot | Oh, I forgot. Sorry! | Keep | Oh, I forgot. Sorry! | Short repair phrase. |
| english-a1-practical-5 | 3 | What's your name? | What's your name? | Keep | What's your name? | Simple A1 question. |
| english-a1-practical-5 | 4 | Nice to meet you | Nice to meet you! | Keep | Nice to meet you! | Essential social phrase. |
| english-a1-practical-5 | 5 | Where are you from? | Where are you from? | Keep | Where are you from? | Essential social question. |
| english-a1-practical-5 | 6 | Do you live here? | Do you live here? | Keep | Do you live here? | Simple and useful. |
| english-a1-practical-5 | 7 | Are you free tonight? | Are you free tonight? | Keep | Are you free tonight? | Short scheduling phrase. |
| english-a1-practical-5 | 8 | Let's meet at the café | Let's meet at the café! | Keep | Let's meet at the café! | Natural simple plan. |
| english-a1-practical-5 | 9 | Maybe tomorrow | Could we try tomorrow? | Keep | Could we try tomorrow? | Polite and simple reschedule. |
| english-a1-practical-5 | 10 | See you tomorrow | See you tomorrow! | Keep | See you tomorrow! | Natural close. |
| english-a1-practical-6 | 1 | I don't feel well | I don't feel well. Could you help me? | Keep | I don't feel well. Could you help me? | Practical health phrase without medical overreach. |
| english-a1-practical-6 | 2 | A pharmacy nearby? | Could you show me a pharmacy nearby? | Keep | Could you show me a pharmacy nearby? | Useful and safe. |
| english-a1-practical-6 | 3 | I need medicine | I need medicine, please. | Keep | I need medicine, please. | Basic pharmacy request. |
| english-a1-practical-6 | 4 | It hurts here | It hurts here. | Keep | It hurts here. | Simple symptom-location phrase. |
| english-a1-practical-6 | 5 | I have a headache | I have a headache. | Keep | I have a headache. | Clear A1 health statement. |
| english-a1-practical-6 | 6 | I need water | Could I have some water, please? | Keep | Could I have some water, please? | Natural request. |
| english-a1-practical-6 | 7 | Is there a doctor? | Is there a doctor here? | Keep | Is there a doctor here? | Useful and not diagnostic. |
| english-a1-practical-6 | 8 | I have an allergy | Please, I have an allergy. | Change | I have an allergy. | Removed awkward leading "Please"; trophy changed to distinct "careful" anchor. |
| english-a1-practical-6 | 9 | Can you call for help? | Please get help for me. | Change | Could you get help for me? | More natural request while staying simple. |
| english-a1-practical-6 | 10 | I feel better now | I feel better now, thank you. | Keep | I feel better now, thank you. | Natural close to health path. |
| english-a1-practical-7 | 1 | I need a ticket | I need a ticket, please. | Keep | I need a ticket, please. | Practical transit phrase. |
| english-a1-practical-7 | 2 | Where is the bus? | Where is the bus stop? | Keep | Where is the bus stop? | Clear A1 location phrase. |
| english-a1-practical-7 | 3 | What time does it leave? | What time does the bus leave? | Keep | What time does the bus leave? | Simple transit time question. |
| english-a1-practical-7 | 4 | Is this the right train? | Is this the right train? | Keep | Is this the right train? | Clear confirmation. |
| english-a1-practical-7 | 5 | I need a taxi | I need a taxi, please. | Keep | I need a taxi, please. | Useful transport request. |
| english-a1-practical-7 | 6 | Can we go there? | Can we go there? | Keep | Can we go there? | Simple destination question. |
| english-a1-practical-7 | 7 | Please stop here | Please stop here. | Keep | Please stop here. | Short taxi/bus phrase. |
| english-a1-practical-7 | 8 | I am going to the station | I am going to the station. | Keep | I am going to the station. | Simple and useful destination statement. |
| english-a1-practical-7 | 9 | How long does it take? | How long does it take? | Change trophy only | How long does it take? | Phrase kept; trophy changed from "last" to "take" to match the actual A1 time phrase. |
| english-a1-practical-7 | 10 | I have arrived | I have arrived, thank you. | Keep | I have arrived, thank you. | Natural arrival close. |
| english-a1-practical-8 | 1 | I have a reservation | I have a reservation, please. | Change | I have a reservation. | Removed unnatural "please" from a check-in statement. |
| english-a1-practical-8 | 2 | I need a room | I need a room, please. | Keep | I need a room, please. | Simple hotel request. |
| english-a1-practical-8 | 3 | Where is my room? | Where is my room? | Keep | Where is my room? | Simple location phrase. |
| english-a1-practical-8 | 4 | I need the key | I need the key, please. | Keep | I need the key, please. | Practical reception phrase. |
| english-a1-practical-8 | 5 | Is there Wi-Fi? | Is there Wi-Fi here? | Keep | Is there Wi-Fi here? | Natural hotel question. |
| english-a1-practical-8 | 6 | Where is the bathroom? | Where is the bathroom? | Keep | Where is the bathroom? | Essential A1 location phrase. |
| english-a1-practical-8 | 7 | I need a towel | I need a towel, please. | Keep | I need a towel, please. | Practical hotel request. |
| english-a1-practical-8 | 8 | I want to sleep | I want to sleep now. | Keep | I want to sleep now. | Basic need statement. |
| english-a1-practical-8 | 9 | What time is breakfast? | What time is breakfast? | Keep | What time is breakfast? | Natural hotel question. |
| english-a1-practical-8 | 10 | I am checking out | I am checking out now. | Keep | I am checking out now. | Natural checkout phrase. |
| english-a1-practical-9 | 1 | Nice to meet you | Hi, I'm really glad to meet you. | Keep | Hi, I'm really glad to meet you. | Warm but still normal. |
| english-a1-practical-9 | 2 | Are you free today? | Are you free today? | Keep | Are you free today? | Simple availability question. |
| english-a1-practical-9 | 3 | Can we meet later? | Can we meet later? | Keep | Can we meet later? | Simple plan question. |
| english-a1-practical-9 | 4 | What time works for you? | What time works for you? | Keep | What time works for you? | Natural scheduling phrase. |
| english-a1-practical-9 | 5 | Let's meet here | Let's meet here. | Keep | Let's meet here. | Short and practical. |
| english-a1-practical-9 | 6 | I am waiting outside | I am waiting outside. | Keep | I am waiting outside. | Clear status phrase. |
| english-a1-practical-9 | 7 | I am running late | I am running late. | Keep | I am running late. | Natural delay phrase. |
| english-a1-practical-9 | 8 | Can we change the plan? | Can we change the plan? | Keep | Can we change the plan? | Useful and simple. |
| english-a1-practical-9 | 9 | See you tomorrow | See you tomorrow. | Keep | See you tomorrow. | Natural close. |
| english-a1-practical-9 | 10 | Have a good evening | Have a good evening. | Keep | Have a good evening. | Natural social close. |
| english-a1-practical-10 | 1 | Today was good | Today was good. | Keep | Today was good. | Simple reflection phrase. |
| english-a1-practical-10 | 2 | I liked this place | I liked this place. | Keep | I liked this place. | Natural and A1-safe. |
| english-a1-practical-10 | 3 | Thank you for your help | Thank you for your help. | Keep | Thank you for your help. | Essential thanks phrase. |
| english-a1-practical-10 | 4 | I learned a lot | I learned a lot today. | Keep | I learned a lot today. | Simple reflection. |
| english-a1-practical-10 | 5 | I am tired now | I am tired now. | Keep | I am tired now. | Simple status phrase. |
| english-a1-practical-10 | 6 | I need to go | I need to go now. | Keep | I need to go now. | Natural departure phrase. |
| english-a1-practical-10 | 7 | See you next time | See you next time. | Keep | See you next time. | Natural future close. |
| english-a1-practical-10 | 8 | Tomorrow works for me | Tomorrow works for me. | Keep | Tomorrow works for me. | Simple scheduling phrase. |
| english-a1-practical-10 | 9 | Have a good night | Have a good night. | Keep | Have a good night. | Natural close. |
| english-a1-practical-10 | 10 | Goodbye for now | Goodbye for now. | Keep | Goodbye for now. | Clear final close. |

## Changed Lessons

- `english-a1-practical-2` lesson 8: changed target phrase from "Hi, my booking is ready." to "Hi, I have a booking."
- `english-a1-practical-3` lessons 2, 3, 5, 7, 8: shortened one distance phrase and removed unnatural factual-question "please" usage.
- `english-a1-practical-4` lessons 3, 5: changed ordering phrase to "I'd like" and removed factual-question "please".
- `english-a1-practical-6` lessons 8, 9: removed awkward allergy lead-in and made the help request more natural.
- `english-a1-practical-7` lesson 9: kept phrase, changed trophy anchor from "last" to "take".
- `english-a1-practical-8` lesson 1: removed unnatural "please" from a check-in statement.

## Fields Changed

- `corePhrase.targetText`
- `corePhrase.baseText`
- `meaning` where phrase semantics changed
- `chunks`
- derived `lessonItems` through chunk/trophy updates
- `build.targetText` through variant construction
- `build.chips`
- `typeRecall.before`
- `typeRecall.after`
- `typeRecall.fallbackChoices` only where existing choices needed to stay aligned
- `speakTarget.targetPhrase` and `speakTarget.baseCue` through variant construction
- `trophyWord` for `english-a1-practical-6` lesson 8 and `english-a1-practical-7` lesson 9

## Lessons Intentionally Kept

All Bright English A1 Practical 2-10 lessons not listed under "Changed Lessons" were intentionally kept because the phrases were natural, A1-safe, learner-useful, and did not force awkward trophy wording into the main phrase.

## Checks Run

- `npx tsx scripts/test-guided-today-data.ts` - passed, 9054 passed / 0 failed after rebasing onto current main.
- `npx tsx scripts/test-guided-vibes.ts` - passed, 99 passed / 0 failed.
- `npx tsx scripts/test-guided-today-path-overview.ts` - passed, 229 passed / 0 failed after rebasing onto current main; existing weak generic review-item warnings remain for non-PR5 review items.
- `npx tsx scripts/test-guided-tts-inventory.ts` - passed, 38 passed / 0 failed; existing full-inventory missing voice-profile warning remains when the script prints the unscoped inventory.
- `npx tsx scripts/test-guided-audio-playback.ts` - passed, 29 passed / 0 failed.
- `npm run test:guided-today` - passed; existing unscoped TTS voice-profile warning and weak generic review-item warnings remain.
- `npm run build` - passed with existing Vite dynamic-import and chunk-size warnings.
- `npx eslint src/data/guidedLessons.ts scripts/test-guided-today-data.ts` - passed; Babel printed its existing large-file deoptimization note for `guidedLessons.ts`.
- `git diff --check` - passed.

## Safety Confirmations

- No TTS generation.
- No ElevenLabs calls.
- No Wistful changes.
- No Sharp changes.
- No Spanish, Italian, French, Portuguese, or German content changes.
- No Supabase schema changes.
- No `guided_voice_profiles` changes.
- No frontend playback changes.
- No music, Suno, or trophy-song changes.

## PR6 Recommendation

Next generation scope should be Bright-only English A1 Practical paths 2-10, lessons 1-10, surfaces `corePhrase`, `chunk`, and `trophyWord`, after a dry-run confirms:

- path ids are limited to `english-a1-practical-2` through `english-a1-practical-10`
- vibe is limited to `bright`
- surfaces are limited to `corePhrase`, `chunk`, `trophyWord`
- no Wistful or Sharp inventory rows
- no non-English paths
- `missing_voice_profile = 0`
