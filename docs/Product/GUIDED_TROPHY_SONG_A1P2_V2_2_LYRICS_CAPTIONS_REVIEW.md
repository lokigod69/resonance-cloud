# Guided Trophy Song — A1P2 V2.2 Lyrics + Music Captions (Review Pack)

Date: 2026-05-16
Author: Claude (refresh authoring pass V2.2 after Sharp trophy-word revision)
Repo: d:\CODING\ResonanceTEST\orchestrator
Branch: main
Scope: docs only. Authoring of six A1P2 V2.2 Trophy Song lyrics + captions for product-owner review. No audio. No runtime files modified. No edits to `guidedTrophySongs.ts`, `guidedLessons.ts`, providers, Music page, decks, words, jobs, credits, or backend.

This pack refreshes A1P2 V2 against the revised A1P2 Sharp trophy words committed at `b0c23e8` (see [GUIDED_TROPHY_WORD_A1P2_SHARP_REVISION_V1_REPORT.md](GUIDED_TROPHY_WORD_A1P2_SHARP_REVISION_V1_REPORT.md)). The earlier V2.1 review pack at [GUIDED_TROPHY_SONG_A1P2_V2_LYRICS_CAPTIONS_REVIEW.md](GUIDED_TROPHY_SONG_A1P2_V2_LYRICS_CAPTIONS_REVIEW.md) used the rejected Sharp tokens (`note / here / this / any / two / yes`) and is Sharp-stale.

V2.2 changes:
- **Bright rows (Row 1, Row 2): unchanged from V2.1.** Trophy words still valid; lyrics still meet Lyric Direction V2.
- **Wistful rows (Row 3, Row 4): unchanged from V2.1.** Trophy words still valid; lyrics still meet Lyric Direction V2.
- **Sharp rows (Row 5, Row 6): fully rewritten.** Built from the new Sharp trophy words `short / spelling / sign / option / stock` (seg-1) and `now / printed / direct / correct / wait` (seg-2). Style constructions (S2 Crisp Funk-Bass Precision, S5 Drumline Precision) carried forward; captions updated to reflect the new diction targets.

## Inputs used

- Revised A1P2 trophy words from [frontend/src/data/guidedLessons.ts](../../frontend/src/data/guidedLessons.ts) per [GUIDED_TROPHY_WORD_A1P2_SOURCE_REVISION_V1_REPORT.md](GUIDED_TROPHY_WORD_A1P2_SOURCE_REVISION_V1_REPORT.md) (initial revision) and [GUIDED_TROPHY_WORD_A1P2_SHARP_REVISION_V1_REPORT.md](GUIDED_TROPHY_WORD_A1P2_SHARP_REVISION_V1_REPORT.md) (Sharp quality pass).
- Musical Design Framework V2 — eight axes — from [GUIDED_TROPHY_SONG_MUSICALITY_RESET_V2.md](GUIDED_TROPHY_SONG_MUSICALITY_RESET_V2.md) §3.
- Vibe-as-Performance-Attitude redefinition from §4.
- Lyric Direction V2 (creative brief + technical constraints) from §7.
- Style construction library from §5.
- V2.1 review pack [GUIDED_TROPHY_SONG_A1P2_V2_LYRICS_CAPTIONS_REVIEW.md](GUIDED_TROPHY_SONG_A1P2_V2_LYRICS_CAPTIONS_REVIEW.md) for Bright + Wistful row reference.

## Current A1P2 trophy-word state

| Segment | Vibe | Trophy words (5) |
|---|---|---|
| 1 | bright | happy, warm, right, fine, fresh |
| 1 | wistful | maybe, kindly, somewhere, either, anywhere |
| 1 | sharp | **short, spelling, sign, option, stock** |
| 2 | bright | easy, neat, kind, sure, cheerful |
| 2 | wistful | carefully, near, calm, simple, patient |
| 2 | sharp | **now, printed, direct, correct, wait** |

Bold = changed since V2.1 (Sharp rows). Plain = unchanged.

## How to read this document

Six rows, one per (segment, vibe). Each row carries:

1. Row metadata (catalog id, path id, segment, vibe, trophy words, source lessons, chosen style construction, style family, style label)
2. Eight-axis musical design
3. Full `musicCaption`
4. Full `rawLyricsWithWrappers` with exactly one wrapped occurrence per trophy word
5. Derived `providerLyrics` (wrappers stripped — what the music provider receives)
6. Derived `displayLyrics` (wrappers stripped — what the learner sees)
7. Full `lyricsTranslationDe` (separate; ASCII transliteration of umlauts per existing catalog convention)
8. Review notes

A cross-segment trophy-word audit and Lyric Direction V2 compliance grid follow the six rows.

---

## Row 1 — A1P2 segment-1 bright (unchanged from V2.1)

### 1. Row metadata

- **Proposed catalog id:** `english-a1-practical-2-segment-1-bright-trophy-song`
- **Path id:** `english-a1-practical-2`
- **Segment:** 1
- **Vibe:** bright
- **Revised trophy words (L1–L5 bright):** `happy`, `warm`, `right`, `fine`, `fresh`
- **Source lessons:** L1 I don't understand, L2 Write it down, L3 Show me, L4 Which one?, L5 Do you have…?
- **Style construction:** B6 — Soft Funk Open Window (V2 §5)
- **Style family (proposed):** `soft-funk-open-window`
- **Style label (proposed):** Soft funk open window

### 2. Eight-axis musical design

| Axis | Choice |
|---|---|
| Tempo | driving, ~108 bpm |
| Groove | syncopated funk groove, mid-pocket, sixteenth-note ghost notes on the bass |
| Instrumentation | clean chicken-pick electric guitar, live bass guitar carrying the harmony, Rhodes pad on the chorus only, tight dry kit with rim-shots, chorus-only handclap placed precisely on beat 2 |
| Production texture | warm analog, dry-and-close vocal, no reverb wash, no shine |
| Vocal posture | spoken-sung at the edge of the pocket, slightly behind the beat, smiling but not glossy, single-take feel |
| Harmony / melody | major-modal funk centred on the bass riff, narrow melody in the verses, half-step rise on the hook line, single Rhodes chord change on the bridge |
| Energy curve | verse tight, chorus loose, settled bridge, no chorus lift, no drop |
| Negative constraints | no fake corporate optimism, no boss-mode posture, no handclap-pop attractor, no kids-show cadence, no top-40 gloss, no Vulfpeck pastiche, no smooth-jazz shimmer |

### 3. musicCaption

> Warm-analog soft funk at ~108 bpm with a mid-pocket syncopation and sixteenth-note ghost notes on the bass; clean chicken-pick electric guitar, live bass guitar carrying the harmony, Rhodes pad entering only on the chorus, tight dry kit with rim-shots, one handclap placed precisely on beat 2 of the chorus only; close dry vocal sitting just behind the beat, spoken-sung in the verses and lifted half a step on the chorus, single-take feel, no reverb wash; verse tight, chorus loose, settled bridge with a single Rhodes chord change, no chorus lift, no drop; clear English diction so "happy, warm, right, fine, fresh" all land cleanly inside the pocket; avoid fake corporate optimism, boss-mode posture, handclap-pop attractor, kids-show cadence, glossy top-40 lift, Vulfpeck pastiche, and smooth-jazz shimmer.

### 4. rawLyricsWithWrappers

```
[Verse 1]
Friday afternoon, I ask too much
You slow it down so I can hear
Word by word the shop gets clearer
I am small and I am here

[Pre-Chorus]
You point at the line, then you point twice
You wait while I catch up
And the right card lands in my hand

[Chorus]
I feel <<happy>>
A small, real, Friday kind of happy
You are <<warm>>, the room is <<fresh>>
And the answer was <<right>>

[Verse 2]
Which one — I held them out
You said either is <<fine>>
But the first one was the one
And you stayed a minute longer

[Bridge]
The street outside is gold
The bakery smells like a new week
I am not lost — I am late, that is all
And late today is fine

[Chorus]
I feel happy
A small, real, Friday kind of happy
You are warm, the room is fresh
And the answer was right

[Outro]
You smile, I smile
Friday is the right kind of day
```

### 5. Derived providerLyrics

```
[Verse 1]
Friday afternoon, I ask too much
You slow it down so I can hear
Word by word the shop gets clearer
I am small and I am here

[Pre-Chorus]
You point at the line, then you point twice
You wait while I catch up
And the right card lands in my hand

[Chorus]
I feel happy
A small, real, Friday kind of happy
You are warm, the room is fresh
And the answer was right

[Verse 2]
Which one — I held them out
You said either is fine
But the first one was the one
And you stayed a minute longer

[Bridge]
The street outside is gold
The bakery smells like a new week
I am not lost — I am late, that is all
And late today is fine

[Chorus]
I feel happy
A small, real, Friday kind of happy
You are warm, the room is fresh
And the answer was right

[Outro]
You smile, I smile
Friday is the right kind of day
```

### 6. Derived displayLyrics

Identical to `providerLyrics`.

### 7. lyricsTranslationDe

```
[Verse 1]
Freitagnachmittag, ich frage zu viel
Du machst es langsamer, damit ich es hoere
Wort fuer Wort wird der Laden klarer
Ich bin klein und ich bin hier

[Pre-Chorus]
Du zeigst auf die Zeile, dann zeigst du zweimal
Du wartest, waehrend ich aufhole
Und die richtige Karte landet in meiner Hand

[Chorus]
Ich fuehle mich gluecklich
Eine kleine, echte Freitags-Art von gluecklich
Du bist warm, der Raum ist frisch
Und die Antwort war richtig

[Verse 2]
Welche - ich hielt sie heraus
Du sagtest, beide sind gut
Aber die erste war die eine
Und du bliebst eine Minute laenger

[Bridge]
Die Strasse draussen ist golden
Die Baeckerei riecht nach einer neuen Woche
Ich bin nicht verloren - ich bin nur spaet
Und spaet heute ist in Ordnung

[Chorus]
Ich fuehle mich gluecklich
Eine kleine, echte Freitags-Art von gluecklich
Du bist warm, der Raum ist frisch
Und die Antwort war richtig

[Outro]
Du laechelst, ich laechle
Freitag ist die richtige Art von Tag
```

### 8. Review notes

- **Carried forward unchanged from V2.1.** Trophy words `happy, warm, right, fine, fresh` are unaffected by the Sharp revision.
- **Style lane this avoids.** Bright = handclap-pop / brushed-kit / felt-piano cliche.
- **Cloze positions:** `happy` (chorus L1, first downbeat), `warm` + `fresh` (chorus L3, paired), `right` (chorus L4 closer), `fine` (verse 2 L2).
- **Ready for product-owner review.** Yes.

---

## Row 2 — A1P2 segment-2 bright (unchanged from V2.1)

### 1. Row metadata

- **Proposed catalog id:** `english-a1-practical-2-segment-2-bright-trophy-song`
- **Path id:** `english-a1-practical-2`
- **Segment:** 2
- **Vibe:** bright
- **Revised trophy words (L6–L10 bright):** `easy`, `neat`, `kind`, `sure`, `cheerful`
- **Source lessons:** L6 By card, L7 A receipt, please, L8 I have a reservation, L9 Is this right?, L10 One moment
- **Style construction:** B10 — Highlife Walk (V2 §5)
- **Style family (proposed):** `highlife-walk`
- **Style label (proposed):** Highlife walk

### 2. Eight-axis musical design

| Axis | Choice |
|---|---|
| Tempo | mid-tempo walk, ~100 bpm |
| Groove | highlife guitar interlock, percussion-led, no rock kit |
| Instrumentation | two interlocking electric guitars (rhythm figure + brighter lead line), bass guitar walking with the figure, conga at the rhythmic centre, hi-hat keeping the top end, optional small chorus response on the hook |
| Production texture | warm analog, lifted top end, dry close vocal |
| Vocal posture | spoken-sung lead with a small group response on the hook; warm, conversational |
| Harmony / melody | major-modal over a circular two-chord pattern, narrow melody in the verses, half-step lift on the hook |
| Energy curve | steady hypnotic walk; small textural lift on the bridge (conga louder, lead guitar quieter); no drop |
| Negative constraints | no caricature of any African idiom, no children's-song bounce, no big-band brass, no stadium-anthem chord changes, no handclap-pop default |

### 3. musicCaption

> Warm-analog highlife walk at ~100 bpm with two interlocking electric guitars, walking bass guitar, conga at the rhythmic centre, and hi-hat lifting the top end; rhythm guitar plays a soft repeating figure, lead guitar plays a brighter interlocking line, conga drives the floor, no rock kit; spoken-sung lead with a small group response on the hook only; circular two-chord pattern with a half-step lift on the hook; steady hypnotic walk, small textural lift on the bridge (conga louder, lead guitar quieter), no chorus lift, no drop; clear English diction so "easy, neat, kind, sure, cheerful" all land cleanly between the guitar parts; avoid caricature of any African idiom, children's-song bounce, big-band brass, stadium-anthem chord changes, and handclap-pop default.

### 4. rawLyricsWithWrappers

```
[Verse 1]
Card on the counter, two lines on the screen
You tap, I tap, it works
A <<neat>> receipt slides over
The bell on the door, no rush

[Chorus]
Step by step, <<easy>> like a Tuesday
<<Kind>> hands at every door
I am <<sure>> the room is waiting
And the lobby holds the floor

[Verse 2]
Reservation under my last name
You spell it back like a tune
Two keys in a small envelope
Sun across the room at noon

[Chorus]
Step by step, easy like a Tuesday
Kind hands at every door
I am sure the room is waiting
And the lobby holds the floor

[Bridge]
Brass on the corner, conga on the block
No hurry in the city today
Receipt in the pocket, key in the palm
A <<cheerful>> bow on the way

[Outro]
Doors and small kindnesses
A walking kind of song
```

### 5. Derived providerLyrics

```
[Verse 1]
Card on the counter, two lines on the screen
You tap, I tap, it works
A neat receipt slides over
The bell on the door, no rush

[Chorus]
Step by step, easy like a Tuesday
Kind hands at every door
I am sure the room is waiting
And the lobby holds the floor

[Verse 2]
Reservation under my last name
You spell it back like a tune
Two keys in a small envelope
Sun across the room at noon

[Chorus]
Step by step, easy like a Tuesday
Kind hands at every door
I am sure the room is waiting
And the lobby holds the floor

[Bridge]
Brass on the corner, conga on the block
No hurry in the city today
Receipt in the pocket, key in the palm
A cheerful bow on the way

[Outro]
Doors and small kindnesses
A walking kind of song
```

### 6. Derived displayLyrics

Identical to `providerLyrics`.

### 7. lyricsTranslationDe

```
[Verse 1]
Karte auf dem Tresen, zwei Zeilen auf dem Schirm
Du tippst, ich tippe, es klappt
Eine ordentliche Quittung gleitet herueber
Die Glocke an der Tuer, keine Eile

[Chorus]
Schritt fuer Schritt, einfach wie ein Dienstag
Freundliche Haende an jeder Tuer
Ich bin sicher, das Zimmer wartet
Und die Lobby haelt den Boden

[Verse 2]
Reservierung unter meinem Nachnamen
Du buchstabierst ihn zurueck wie eine Melodie
Zwei Schluessel in einem kleinen Umschlag
Sonne ueber dem Zimmer am Mittag

[Chorus]
Schritt fuer Schritt, einfach wie ein Dienstag
Freundliche Haende an jeder Tuer
Ich bin sicher, das Zimmer wartet
Und die Lobby haelt den Boden

[Bridge]
Bleche an der Ecke, Conga im Block
Keine Eile in der Stadt heute
Quittung in der Tasche, Schluessel in der Hand
Eine heitere Verbeugung auf dem Weg

[Outro]
Tueren und kleine Freundlichkeiten
Eine gehende Art von Lied
```

### 8. Review notes

- **Carried forward unchanged from V2.1.** Trophy words `easy, neat, kind, sure, cheerful` are unaffected by the Sharp revision.
- **Cloze positions:** `neat` (verse 1 L3), `easy` (chorus L1), `kind` (chorus L2), `sure` (chorus L3), `cheerful` (bridge L4).
- **Ready for product-owner review.** Yes.

---

## Row 3 — A1P2 segment-1 wistful (unchanged from V2.1)

### 1. Row metadata

- **Proposed catalog id:** `english-a1-practical-2-segment-1-wistful-trophy-song`
- **Path id:** `english-a1-practical-2`
- **Segment:** 1
- **Vibe:** wistful
- **Revised trophy words (L1–L5 wistful):** `maybe`, `kindly`, `somewhere`, `either`, `anywhere`
- **Source lessons:** L1 I don't understand, L2 Write it down, L3 Show me, L4 Which one?, L5 Do you have…?
- **Style construction:** W4 — Shoegaze Pulse (V2 §5)
- **Style family (proposed):** `shoegaze-pulse`
- **Style label (proposed):** Shoegaze pulse

### 2. Eight-axis musical design

| Axis | Choice |
|---|---|
| Tempo | mid-tempo walk, ~104 bpm |
| Groove | straight rock pulse buried under guitar wash |
| Instrumentation | two heavily reverbed electric guitars, bass guitar on root notes, dry drum kit pushing through the wash, hidden vocal harmony on the second chorus, no piano, no synth pad |
| Production texture | spacious, slightly distorted, blurred but never melodramatic |
| Vocal posture | airy, buried-but-clear — vocal pushes through the wall, never whispered |
| Harmony / melody | minor-suspended verses with no resolution, narrow melody, single half-step lift only on the second chorus |
| Energy curve | starts intimate, opens wide on the second chorus, strips back to one guitar in the outro, no build-and-drop |
| Negative constraints | no trailer-crescendo, no sad-girl-pop chorus shape, no soft-folk default, no felt-piano cliche, no lo-fi study-beat haze, no karaoke vocal exposure |

### 3. musicCaption

> Shoegaze pulse at ~104 bpm with a straight rock pulse buried under two heavily reverbed electric guitars; bass guitar holding root notes, dry kit pushing through the wash, hidden vocal harmony entering only on the second chorus, no piano, no synth pad; airy buried-but-clear lead vocal that pushes through the guitar wall, never whispered, no ASMR, no heavy vibrato; minor-suspended verses with no resolution, single half-step lift only on the second chorus, outro strips back to one guitar; clear English diction so "maybe, kindly, somewhere, either, anywhere" all land cleanly through the wash; avoid trailer-crescendo, sad-girl-pop chorus shape, soft-folk default, felt-piano cliche, lo-fi study-beat haze, and karaoke vocal exposure.

### 4. rawLyricsWithWrappers

```
[Verse 1]
<<Maybe>> in the half-heard room
Maybe just a half-clear shape
The window does not close, the rain
Has nothing to say

[Verse 2]
Could you <<kindly>> write the line
Where the letters go
Soft as the paper takes the ink
And the door waits in a row

[Chorus]
<<Somewhere>> in the second column
<<Either>> the one above or below
<<Anywhere>> the answer rests
I will watch for it slow

[Verse 3]
You waited while I held the page
Half a word, half a sigh
Either or another way
Somewhere almost clear

[Chorus]
Somewhere in the second column
Either the one above or below
Anywhere the answer rests
I will watch for it slow

[Outro]
Maybe the rain will lift by six
And the door will stay half-open
```

### 5. Derived providerLyrics

```
[Verse 1]
Maybe in the half-heard room
Maybe just a half-clear shape
The window does not close, the rain
Has nothing to say

[Verse 2]
Could you kindly write the line
Where the letters go
Soft as the paper takes the ink
And the door waits in a row

[Chorus]
Somewhere in the second column
Either the one above or below
Anywhere the answer rests
I will watch for it slow

[Verse 3]
You waited while I held the page
Half a word, half a sigh
Either or another way
Somewhere almost clear

[Chorus]
Somewhere in the second column
Either the one above or below
Anywhere the answer rests
I will watch for it slow

[Outro]
Maybe the rain will lift by six
And the door will stay half-open
```

### 6. Derived displayLyrics

Identical to `providerLyrics`.

### 7. lyricsTranslationDe

```
[Verse 1]
Vielleicht in dem halb gehoerten Raum
Vielleicht nur eine halb-klare Form
Das Fenster schliesst sich nicht, der Regen
Hat nichts zu sagen

[Verse 2]
Koenntest du es freundlich schreiben
Wohin die Buchstaben gehoeren
Sanft, wie das Papier die Tinte aufnimmt
Und die Tuer wartet in einer Reihe

[Chorus]
Irgendwo in der zweiten Spalte
Entweder die darueber oder darunter
Wo auch immer die Antwort ruht
Ich werde langsam darauf warten

[Verse 3]
Du hast gewartet, waehrend ich die Seite hielt
Ein halbes Wort, ein halber Seufzer
So oder anders
Irgendwo fast klar

[Chorus]
Irgendwo in der zweiten Spalte
Entweder die darueber oder darunter
Wo auch immer die Antwort ruht
Ich werde langsam darauf warten

[Outro]
Vielleicht hebt sich der Regen um sechs
Und die Tuer bleibt halb offen
```

### 8. Review notes

- **Carried forward unchanged from V2.1.** Trophy words unaffected by the Sharp revision.
- **Cloze positions:** `maybe` (V1 L1), `kindly` (V2 L1), `somewhere` (chorus L1), `either` (chorus L2), `anywhere` (chorus L3).
- **Ready for product-owner review.** Yes.

---

## Row 4 — A1P2 segment-2 wistful (unchanged from V2.1)

### 1. Row metadata

- **Proposed catalog id:** `english-a1-practical-2-segment-2-wistful-trophy-song`
- **Path id:** `english-a1-practical-2`
- **Segment:** 2
- **Vibe:** wistful
- **Revised trophy words (L6–L10 wistful):** `carefully`, `near`, `calm`, `simple`, `patient`
- **Source lessons:** L6 By card, L7 A receipt, please, L8 I have a reservation, L9 Is this right?, L10 One moment
- **Style construction:** W2 — Dub-Techno Memory Loop (V2 §5)
- **Style family (proposed):** `dub-techno-memory-loop`
- **Style label (proposed):** Dub-techno memory loop

### 2. Eight-axis musical design

| Axis | Choice |
|---|---|
| Tempo | driving, ~118 bpm |
| Groove | sparse dub pulse, kick on 1 and 3, off-beat detuned chord stab |
| Instrumentation | sub-bass under the kick, dub-delay tail on the chord stab, distant pad, light clave on the off-beats, no full kit, no melodic synth lead |
| Production texture | spacious, blurred, club-adjacent but never anthemic |
| Vocal posture | detached, spoken-sung, close to the mic, slightly reverbed at the tails, patient without ever being sleepy |
| Harmony / melody | modal, two-chord hypnotic loop, narrow melody, no chorus lift |
| Energy curve | steady hypnotic loop; bridge introduces one extra delay layer and removes it again; no drop |
| Negative constraints | no club-anthem build-and-drop, no sad-piano breakdown, no lo-fi study-beat haze, no ambient-folk default, no soft-felt-piano cliche |

### 3. musicCaption

> Spacious dub-techno memory loop at ~118 bpm with a sparse dub pulse, kick on 1 and 3, and an off-beat detuned chord stab; sub-bass under the kick, dub-delay tail on the chord, distant pad, light clave on the off-beats, no full drum kit, no melodic synth lead; detached spoken-sung lead vocal close to the mic and slightly reverbed at the tails, patient without ever being sleepy; modal two-chord hypnotic loop, narrow melody, no chorus lift; bridge introduces one extra dub-delay layer and removes it again, no drop, no big build; clear English diction so "carefully, near, calm, simple, patient" all land cleanly above the dub delays; avoid club-anthem build-and-drop, sad-piano breakdown, lo-fi study-beat haze, ambient-folk default, and soft-felt-piano cliche.

### 4. rawLyricsWithWrappers

```
[Section 1]
The terminal turns green
I press it <<carefully>>, slow
The receipt is sitting <<near>>
By the door, half-glow

[Section 2]
At the desk I say the name
My booking is on the page
The hostess marks it <<calm>>
And the room is open stage

[Section 3]
A <<simple>> check before the bus
The driver gives a nod
I stand until the next light
A <<patient>> minute on the road

[Section 4]
Slow check at the desk
The light comes back to green
A whole quiet hour between
And the booking holds the room

[Section 5]
Patient by the door
Patient by the door
The loop comes back around
And the loop comes back around

[Outro]
The terminal goes green
The room holds the name
And the loop comes back
```

### 5. Derived providerLyrics

```
[Section 1]
The terminal turns green
I press it carefully, slow
The receipt is sitting near
By the door, half-glow

[Section 2]
At the desk I say the name
My booking is on the page
The hostess marks it calm
And the room is open stage

[Section 3]
A simple check before the bus
The driver gives a nod
I stand until the next light
A patient minute on the road

[Section 4]
Slow check at the desk
The light comes back to green
A whole quiet hour between
And the booking holds the room

[Section 5]
Patient by the door
Patient by the door
The loop comes back around
And the loop comes back around

[Outro]
The terminal goes green
The room holds the name
And the loop comes back
```

### 6. Derived displayLyrics

Identical to `providerLyrics`.

### 7. lyricsTranslationDe

```
[Section 1]
Das Terminal wird gruen
Ich druecke es vorsichtig, langsam
Die Quittung liegt nah
Bei der Tuer, im Halblicht

[Section 2]
Am Empfang sage ich den Namen
Meine Buchung steht auf der Seite
Die Hostess haelt es ruhig
Und das Zimmer ist offene Buehne

[Section 3]
Ein einfacher Check vor dem Bus
Der Fahrer nickt
Ich stehe bis zum naechsten Licht
Eine geduldige Minute auf der Strasse

[Section 4]
Langsamer Check am Empfang
Das Licht kommt zurueck auf gruen
Eine ganze ruhige Stunde dazwischen
Und die Buchung haelt das Zimmer

[Section 5]
Geduldig an der Tuer
Geduldig an der Tuer
Die Schleife kommt zurueck
Und die Schleife kommt zurueck

[Outro]
Das Terminal wird gruen
Der Raum haelt den Namen
Und die Schleife kommt zurueck
```

### 8. Review notes

- **Carried forward unchanged from V2.1.** Trophy words unaffected by the Sharp revision.
- **Cloze positions:** `carefully` (S1 L2), `near` (S1 L3), `calm` (S2 L3), `simple` (S3 L1), `patient` (S3 L4).
- **Ready for product-owner review.** Yes.

---

## Row 5 — A1P2 segment-1 sharp (REWRITTEN for revised trophy words)

### 1. Row metadata

- **Proposed catalog id:** `english-a1-practical-2-segment-1-sharp-trophy-song`
- **Path id:** `english-a1-practical-2`
- **Segment:** 1
- **Vibe:** sharp
- **Revised trophy words (L1–L5 sharp):** `short`, `spelling`, `sign`, `option`, `stock`
- **Source lessons:** L1 I don't understand, L2 Write it down, L3 Show me, L4 Which one?, L5 Do you have…?
- **Style construction:** S2 — Crisp Funk-Bass Precision (V2 §5)
- **Style family (proposed):** `crisp-funk-bass-precision`
- **Style label (proposed):** Crisp funk-bass precision

### 2. Eight-axis musical design

| Axis | Choice |
|---|---|
| Tempo | driving, ~108 bpm |
| Groove | syncopated funk groove, very tight pocket |
| Instrumentation | percussive funk bass at the centre of the mix carrying the harmony, muted clean electric guitar, dry kit with rim-shots and chorus-only handclaps placed precisely, single Rhodes accent on the chorus hook, no synth, no pad |
| Production texture | dry, hi-fi, warm |
| Vocal posture | crisp, decisive, slightly playful edge, tight timing, no melisma, no vocoder, no ornamentation |
| Harmony / melody | modal around the bass riff, narrow melody in the verses, single rhythmic hook on the chorus line, no big chord change |
| Energy curve | steady groove; second chorus adds the Rhodes accent and removes it on the bridge; no lift, no drop |
| Negative constraints | no Vulfpeck pastiche, no comedy-funk, no minimal-synth-grid attractor, no boss-mode posture, no motivational slogan energy, no smooth-jazz shimmer |

### 3. musicCaption

> Crisp funk-bass precision at ~108 bpm with a very tight syncopated pocket; percussive funk bass at the centre of the mix doing most of the harmonic work, muted clean electric guitar, dry kit with rim-shots and chorus-only handclaps placed precisely, one Rhodes accent on the chorus hook only, no synth, no pad; close dry vocal with tight timing, no vocoder, no melisma, no ornamentation, a crisp decisive Sharp posture with a small playful edge; steady groove, second chorus adds the Rhodes accent and removes it on the bridge, no chorus lift, no drop; clear English diction so "short, spelling, sign, option, stock" all land cleanly on the bass pocket; avoid Vulfpeck pastiche, comedy-funk, minimal-synth-grid attractor, boss-mode posture, motivational slogan energy, and smooth-jazz shimmer.

### 4. rawLyricsWithWrappers

```
[Verse 1]
<<Short>> question at the counter
I will keep it on one breath
Could you tell me the <<spelling>>
Letter by letter, please

[Pre-Chorus]
You write it on the napkin
And the address comes back clean

[Chorus]
The <<sign>> says open until ten
First <<option>> on the right
"In <<stock>> today?" — "Yes, it is"
All three answered clean

[Verse 2]
A second at the page
A pen in someone's hand
Three small asks at a counter
And the bag slides into my hand

[Chorus]
The sign says open until ten
First option on the right
"In stock today?" — "Yes, it is"
All three answered clean

[Bridge]
The bass keeps the pocket
The pocket keeps the line
Three quick asks at a counter
And the corner makes me stop

[Outro]
The napkin's in my pocket
The address is in my head
Out the door, on the road
```

### 5. Derived providerLyrics

```
[Verse 1]
Short question at the counter
I will keep it on one breath
Could you tell me the spelling
Letter by letter, please

[Pre-Chorus]
You write it on the napkin
And the address comes back clean

[Chorus]
The sign says open until ten
First option on the right
"In stock today?" — "Yes, it is"
All three answered clean

[Verse 2]
A second at the page
A pen in someone's hand
Three small asks at a counter
And the bag slides into my hand

[Chorus]
The sign says open until ten
First option on the right
"In stock today?" — "Yes, it is"
All three answered clean

[Bridge]
The bass keeps the pocket
The pocket keeps the line
Three quick asks at a counter
And the corner makes me stop

[Outro]
The napkin's in my pocket
The address is in my head
Out the door, on the road
```

### 6. Derived displayLyrics

Identical to `providerLyrics`.

### 7. lyricsTranslationDe

```
[Verse 1]
Kurze Frage am Tresen
Ich halte sie in einem Atem
Koenntest du mir die Schreibweise sagen
Buchstabe fuer Buchstabe, bitte

[Pre-Chorus]
Du schreibst sie auf eine Serviette
Und die Adresse kommt sauber zurueck

[Chorus]
Das Schild sagt "offen bis zehn"
Erste Option rechts
"Heute auf Lager?" - "Ja, ist es"
Alle drei sauber beantwortet

[Verse 2]
Eine Sekunde an der Seite
Ein Stift in jemandes Hand
Drei kleine Fragen an einem Tresen
Und die Tuete gleitet in meine Hand

[Chorus]
Das Schild sagt "offen bis zehn"
Erste Option rechts
"Heute auf Lager?" - "Ja, ist es"
Alle drei sauber beantwortet

[Bridge]
Der Bass haelt die Pocket
Die Pocket haelt die Linie
Drei schnelle Fragen an einem Tresen
Und die Ecke laesst mich anhalten

[Outro]
Die Serviette ist in meiner Tasche
Die Adresse ist in meinem Kopf
Aus der Tuer, auf die Strasse
```

### 8. Review notes

- **Why this beats V2.1 Row 5.** V2.1 Row 5 used the rejected Sharp tokens (`short, note, here, this, any`) and the chorus packed two utility deictics (`here`, `this`) into one line — exactly the "function token as trophy" failure the product owner called out. V2.2 Row 5 uses content-bearing nouns (`spelling`, `sign`, `option`, `stock`) inside a real service scene: ask for the spelling, read the sign, pick the option, check the stock. Each word does work in its line.
- **Style lane this avoids.** Minimal-synth-grid (the A1P2 V1 Sharp attractor) and clipped-hat / square-bass cliche. Bass-led pocket carries the Sharp posture without synth.
- **Cloze position rationale.**
  - `short` — verse 1 opener "<<Short>> question at the counter". L1 "I don't understand" Sharp variant: keep the ask compact; opens the song.
  - `spelling` — verse 1 closing half "Could you tell me the <<spelling>>". L2 "Write it down" — the actual decisive Sharp ask in this scene (not "write it somewhere", but "tell me the exact letters").
  - `sign` — chorus opener "The <<sign>> says open until ten". L3 "Show me" — naming the artifact the eye points at; first chorus downbeat.
  - `option` — chorus second line "First <<option>> on the right". L4 "Which one?" — decisive choice noun.
  - `stock` — chorus third line "In <<stock>> today?". L5 "Do you have…?" — the loaded word in the literal target phrase.
- **Risk / uncertainty.** Chorus is three trophy words across three lines (`sign`, `option`, `stock`). Caption explicitly demands "clear English diction so 'short, spelling, sign, option, stock' all land cleanly." If audio review finds the chorus too dense, fix is to drop the half-step lift on the third line and let the bass do the work alone there — wraps are unaffected.
- **Ready for product-owner review.** Yes.

---

## Row 6 — A1P2 segment-2 sharp (REWRITTEN for revised trophy words)

### 1. Row metadata

- **Proposed catalog id:** `english-a1-practical-2-segment-2-sharp-trophy-song`
- **Path id:** `english-a1-practical-2`
- **Segment:** 2
- **Vibe:** sharp
- **Revised trophy words (L6–L10 sharp):** `now`, `printed`, `direct`, `correct`, `wait`
- **Source lessons:** L6 By card, L7 A receipt, please, L8 I have a reservation, L9 Is this right?, L10 One moment
- **Style construction:** S5 — Drumline Precision (V2 §5)
- **Style family (proposed):** `drumline-precision`
- **Style label (proposed):** Drumline precision

### 2. Eight-axis musical design

| Axis | Choice |
|---|---|
| Tempo | driving, ~112 bpm |
| Groove | marching/drumline snare pattern, no full drum kit |
| Instrumentation | snare drumline (centre), occasional bass drum, trumpet-and-alto-sax brass entering only on the chorus, no melodic instrument under the verses, no synth, no guitar |
| Production texture | dry, raw, slightly room-y |
| Vocal posture | crisp lead, briefly chant-like on the chorus hook, alert, controlled, never aggressive |
| Harmony / melody | modal implied by the brass stabs on the chorus only; verses live on rhythm alone; single new brass figure on the bridge |
| Energy curve | drums-and-voice only on verse; brass enters chorus; brass exits on verse return; bridge keeps the snare and adds a single new brass figure; no drop, no big build |
| Negative constraints | no marching-band caricature, no sports-anthem energy, no motivational slogan tone, no boss-battle posture, no minimal-synth attractor, no aggressive hip-hop posture |

### 3. musicCaption

> Drumline precision at ~112 bpm with a marching snare pattern and no full drum kit; occasional bass drum hit, trumpet-and-alto-sax brass entering only on the chorus, no melodic instrument under the verses, no synth, no guitar; close dry vocal, tight timing, crisp Sharp posture that becomes briefly chant-like on the chorus hook; drums-and-voice only on the verse, brass enters on the chorus, brass exits on the verse return, bridge keeps the snare and adds a single new brass figure, no drop, no big build; clear English diction so "now, printed, direct, correct, wait" all land cleanly between the snare hits; avoid marching-band caricature, sports-anthem energy, motivational slogan tone, boss-battle posture, minimal-synth attractor, and aggressive hip-hop posture.

### 4. rawLyricsWithWrappers

```
[Verse 1]
Card on the counter, pay it <<now>>
"Could I have it <<printed>>, please?"
A small receipt slides across the desk
And the brass on the corner stays

[Chorus]
<<Direct>> at the desk, the name in line
"That is <<correct>>" — and the room is mine
A small bow back, a quick exchange
And the next door's missed

[Verse 2]
The platform sign, the route is true
Train pulling slow into the gate
"Is that the seven?" "Correct."
And the doors don't have to wait

[Chorus]
Direct at the desk, the name in line
"That is correct" — and the room is mine
A small bow back, a quick exchange
And the next door's missed

[Bridge]
The snare on the corner counts me off
Brass on the stair, brass at the door
I <<wait>> for the green to turn
And cross when the count says go

[Outro]
The seven is the seven
The platform clears the gate
Three small steps and out
```

### 5. Derived providerLyrics

```
[Verse 1]
Card on the counter, pay it now
"Could I have it printed, please?"
A small receipt slides across the desk
And the brass on the corner stays

[Chorus]
Direct at the desk, the name in line
"That is correct" — and the room is mine
A small bow back, a quick exchange
And the next door's missed

[Verse 2]
The platform sign, the route is true
Train pulling slow into the gate
"Is that the seven?" "Correct."
And the doors don't have to wait

[Chorus]
Direct at the desk, the name in line
"That is correct" — and the room is mine
A small bow back, a quick exchange
And the next door's missed

[Bridge]
The snare on the corner counts me off
Brass on the stair, brass at the door
I wait for the green to turn
And cross when the count says go

[Outro]
The seven is the seven
The platform clears the gate
Three small steps and out
```

### 6. Derived displayLyrics

Identical to `providerLyrics`.

### 7. lyricsTranslationDe

```
[Verse 1]
Karte auf den Tresen, jetzt zahlen
"Koennte ich es gedruckt haben, bitte?"
Eine kleine Quittung gleitet ueber den Tresen
Und die Bleche an der Ecke bleiben

[Chorus]
Direkt am Empfang, der Name in der Reihe
"Das stimmt" - und das Zimmer ist meins
Eine kleine Verbeugung zurueck, ein schneller Austausch
Und die naechste Tuer ist versaeumt

[Verse 2]
Das Bahnsteigschild, die Strecke stimmt
Der Zug rollt langsam ins Tor
"Ist das die Sieben?" "Stimmt."
Und die Tueren muessen nicht warten

[Chorus]
Direkt am Empfang, der Name in der Reihe
"Das stimmt" - und das Zimmer ist meins
Eine kleine Verbeugung zurueck, ein schneller Austausch
Und die naechste Tuer ist versaeumt

[Bridge]
Die Snare an der Ecke zaehlt mich ein
Bleche auf der Treppe, Bleche an der Tuer
Ich warte, dass die Ampel umspringt
Und gehe, wenn der Takt es sagt

[Outro]
Die Sieben ist die Sieben
Der Bahnsteig leert das Tor
Drei kleine Schritte, und raus
```

### 8. Review notes

- **Why this beats V2.1 Row 6.** V2.1 Row 6 used the rejected Sharp tokens (`now, two, direct, yes, wait`) and put the trophy word `yes` on the chorus's most decisive beat — the embarrassment case the product owner called out. V2.2 Row 6 replaces `yes` with `correct` (a real service-confirmation word) and `two` with `printed` (a real distinction at the checkout). Verse 1 now opens with a content-bearing receipt-format ask ("Could I have it printed, please?") instead of stacking a number.
- **Style lane this avoids.** Sharp = minimal-synth / clipped-hat attractor. Drumline + brass-on-chorus carries the Sharp posture without electronics.
- **Cloze position rationale.**
  - `now` — verse 1 first-line closing "Card on the counter, pay it <<now>>". L6 "By card" scene; word lands on the end-of-line snare hit.
  - `printed` — verse 1 second line "Could I have it <<printed>>, please?". L7 receipt scene; the word names the actual format ask, the loaded distinction in the line.
  - `direct` — chorus opener "<<Direct>> at the desk, the name in line". L8 reservation arrival; opens the chorus on the first downbeat after the brass enters.
  - `correct` — chorus second line "That is <<correct>>". L9 "Is this right?" confirmation; the word replaces V2.1's `yes` with a grown-up Sharp confirmation; lands on the most decisive beat of the song.
  - `wait` — bridge third line "I <<wait>> for the green to turn". L10 "One moment" — verb describing a real action (waiting for a traffic light); placed in the bridge for textural change.
- **Risk / uncertainty.** Drumline providers sometimes default to sports-anthem or marching-band-caricature deliveries. Caption explicitly names both as exclusions. If Candidate A and Candidate B both come back with sports-anthem energy, fix is to tighten the caption ("solo snare drumline, no marching-band cymbal crash, no anthem brass entry") before re-running, not to change the construction.
- **Ready for product-owner review.** Yes.

---

## Cross-segment trophy-word audit

To avoid confusing the learner, no song wraps a trophy word that belongs to a different (segment, vibe) cell of A1P2.

| Row | Wrapped target words (5) | Plain occurrences of other A1P2 trophy words |
|---|---|---|
| Row 1 — seg-1 bright | happy, warm, right, fine, fresh | none |
| Row 2 — seg-2 bright | easy, neat, kind, sure, cheerful | none |
| Row 3 — seg-1 wistful | maybe, kindly, somewhere, either, anywhere | none |
| Row 4 — seg-2 wistful | carefully, near, calm, simple, patient | none |
| Row 5 — seg-1 sharp | short, spelling, sign, option, stock | none |
| Row 6 — seg-2 sharp | now, printed, direct, correct, wait | "Correct." (plain, verse 2) — wrapped target in same row, no cross-row collision |

Each row uses exactly 5 wrapped trophy words. Total wrapped tokens: 30. No A1P2 trophy word appears as a wrapped target in more than one row.

## Lyric Direction V2 compliance grid

| Rule | Row 1 | Row 2 | Row 3 | Row 4 | Row 5 | Row 6 |
|---|---|---|---|---|---|---|
| Real small song shape | ✓ | ✓ | ✓ | ✓ (sectioned loop) | ✓ | ✓ |
| 16–28 lines | 24 | 22 | 22 | 24 | 24 | 24 |
| Every trophy word appears at least once | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Exactly one wrapped occurrence per trophy word | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| No fake mnemonics | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| No "X means Y" definitional lines | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| No awkward adjective stacking | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| No triple-word slogan lines | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| No forced metaphor / forced human image | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Same structure NOT forced across all rows | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Lyric structure adapts to caption | funk pocket | highlife walk | shoegaze | dub-techno loop | funk pocket (varied from Row 1) | drumline |

## Technical contract reminder (for the future runtime-wiring pass)

When these lyrics eventually move into `frontend/src/data/guidedTrophySongs.ts` (separate pass, after product approval):

- Exactly one `<<word>>` wrap per trophy word per row (5 wraps per row, 30 total).
- `providerLyrics` = `rawLyricsWithWrappers` with all `<<` and `>>` stripped, computed by `stripTrophySongWrappers` at [guidedTrophySongs.ts:1109](../../frontend/src/data/guidedTrophySongs.ts#L1109).
- `displayLyrics` = same as `providerLyrics`.
- `lyricsTranslationDe` separate; never sent to the music provider.
- `clozePositions` derived from the wrappers by `deriveTrophySongClozePositions` at [guidedTrophySongs.ts:1090](../../frontend/src/data/guidedTrophySongs.ts#L1090).
- Provider receives `providerLyrics`. Never send `<<` or `>>` to a music provider.

## Product-owner review checklist

For each row, confirm:

1. The chosen style construction is the right call for this segment and vibe.
2. The eight-axis decomposition matches the intent.
3. The `musicCaption` reads cleanly to a music provider.
4. The lyric reads as a real small song, not a vocabulary worksheet.
5. The cloze position for each trophy word lands on the strongest musical position.
6. The German translation is acceptable.

If any row is rejected: "wrong style" → swap construction; "right style, wrong lyric" → rewrite lyric only; "right lyric, wrong cloze" → move the `<<>>` markers.

## What this pack did not do

- No `guidedTrophySongs.ts` runtime row added or modified.
- No `guidedLessons.ts` modified.
- No audio generated.
- No provider call.
- No `frontend/public/guided/trophy-songs/**` touched.
- No backend / Music page / Supabase / decks / providers / normal pipeline touched.
- No A1P1, A1P3, A1P4, A1P5 authoring.

## Status

- A1P2 V2.2 lyrics + music captions: **drafted in this pack** awaiting product-owner review.
- A1P2 V2.2 audio: **still blocked**.
- A1P3 / A1P4 / A1P5: **still blocked** until A1P2 V2 cycle completes end-to-end.

## Summary

- Six A1P2 V2.2 rows authored.
- **Rows 1–4 unchanged from V2.1** (Bright × 2, Wistful × 2): trophy words and lyrics still valid.
- **Rows 5–6 fully rewritten** around the revised Sharp trophy words: Row 5 uses `short / spelling / sign / option / stock`; Row 6 uses `now / printed / direct / correct / wait`.
- Style rotation: B6 / B10 / W4 / W2 / S2 / S5 (V2 §6 proposed rotation, unchanged from V2.1).
- All Lyric Direction V2 constraints satisfied.
- All technical Trophy Song wrap constraints satisfied: exactly one wrapped occurrence per trophy word per row; `providerLyrics` and `displayLyrics` derived by `stripTrophySongWrappers`; German translation per row; no `<<` / `>>` will reach the music provider.
- No runtime files modified. No audio generated. `guidedTrophySongs.ts` unchanged. Audio remains blocked pending product-owner review of this pack.
