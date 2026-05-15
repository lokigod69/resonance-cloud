# Guided Trophy Song — A1P2 V2 Lyrics + Music Captions (Review Pack, V2.1)

Date: 2026-05-15
Author: Claude (lyrics + captions, fresh authoring pass V2.1)
Repo: d:\CODING\ResonanceTEST\orchestrator
Branch: main
Scope: docs only. Authoring of six A1P2 V2 Trophy Song lyrics + captions for product-owner review. No audio. No runtime files modified. No edits to `guidedTrophySongs.ts`, `guidedLessons.ts`, providers, Music page, decks, words, jobs, credits, or backend.

This pack uses the V2 §6 **proposed** rotation (B6 / B10 / W4 / W2 / S2 / S5) per the prompt's suggestion, with targeted revisions to two weak spots inherited from the earlier B6/B10 draft at [GUIDED_TROPHY_SONG_A1P2_V2_LYRICS_AND_CAPTIONS.md](GUIDED_TROPHY_SONG_A1P2_V2_LYRICS_AND_CAPTIONS.md): Row 4 section 4 (adjective-stack rewritten as a real image) and Row 6 bridge ("X is X" definitional lines rewritten as a real drumline/street image, with the cloze for `wait` preserved on a verb instead of a refrain). A parallel B1/B8/W6/W1/S3/S6 draft remains in-repo at the same path on an earlier commit; product owner can compare per row.

The companion authoring report at [GUIDED_TROPHY_SONG_A1P2_V2_AUTHORING_REPORT.md](GUIDED_TROPHY_SONG_A1P2_V2_AUTHORING_REPORT.md) summarises files changed, status, and the next-step implementation prompt.

## Inputs used

- Revised A1P2 trophy words from [frontend/src/data/guidedLessons.ts](../../frontend/src/data/guidedLessons.ts) per [GUIDED_TROPHY_WORD_A1P2_SOURCE_REVISION_V1_REPORT.md](GUIDED_TROPHY_WORD_A1P2_SOURCE_REVISION_V1_REPORT.md).
- Musical Design Framework V2 — eight axes — from [GUIDED_TROPHY_SONG_MUSICALITY_RESET_V2.md](GUIDED_TROPHY_SONG_MUSICALITY_RESET_V2.md) §3.
- Vibe-as-Performance-Attitude redefinition from §4.
- Lyric Direction V2 (creative brief + technical constraints) from §7.
- Style construction library from §5 (36 numbered constructions).
- Trophy-word source duplication context from [GUIDED_TROPHY_WORD_SOURCE_DUPLICATION_INVESTIGATION_2026_05_15.md](GUIDED_TROPHY_WORD_SOURCE_DUPLICATION_INVESTIGATION_2026_05_15.md).
- Combined caption+lyric framing observed in [cloud_engines/concept_engine/lyrics.py:434-499](../../cloud_engines/concept_engine/lyrics.py#L434-L499) (creative stance only — no code or Ace-Step tags copied; Trophy Songs stay static and pre-reviewed).

## Variety acceptance bar (V2 §6)

- At least one Bright non-pop/roots/surf/funk/road style — **Row 1 = B6 Soft Funk Open Window** (funk pocket).
- At least one Bright not handclap-pop — Row 1 (chorus-only handclap *accent*, not handclap-pop default) and Row 2 (no handclaps at all).
- At least one Wistful rhythmic/electronic — **Row 3 = W4 Shoegaze Pulse** (guitar wash, rock pulse), **Row 4 = W2 Dub-Techno Memory Loop** (dub pulse, kick on 1+3).
- At least one Wistful non-sleepy — Row 4 driving at ~118 bpm with a kick on 1 and 3.
- At least one Sharp non-synth — **Row 5 = S2 Crisp Funk-Bass Precision** (funk bass, no synth), **Row 6 = S5 Drumline Precision** (snare + brass, no synth).
- At least one Sharp not minimal-electro — Rows 5 + 6 both qualify (no electro at all).

**Tempo spread:** ~100 → ~118 bpm. Narrower than the parallel B1/B8/W6/W1/S3/S6 draft (~88 → ~170 bpm half-time). This rotation trades extreme tempo range for stronger intra-vibe contrast on instrumentation and groove. The product owner picks: wider tempo range (parallel draft) or stronger groove/instrumentation differentiation (this draft).

## How to read this document

Six rows, one per (segment, vibe). Each row carries:

1. Row metadata (catalog id, path id, segment, vibe, trophy words, source lessons, chosen style construction, style family, style label)
2. Eight-axis musical design (tempo, groove, instrumentation, production texture, vocal posture, harmony/melodic feel, energy curve, negative constraints)
3. Full `musicCaption` (one provider-ready paragraph)
4. Full `rawLyricsWithWrappers` with exactly one `<<wrapped>>` cloze per trophy word
5. Derived `providerLyrics` (wrappers stripped — what the music provider receives)
6. Derived `displayLyrics` (wrappers stripped — what the learner sees)
7. Full `lyricsTranslationDe` (separate from provider; ASCII transliteration of umlauts per existing catalog convention)
8. Review notes (why this beats A1P2 V1, which style lane it avoids, risk/uncertainty, ready verdict)

A cross-segment trophy-word audit and a Lyric Direction V2 compliance grid follow the six rows.

---

## Row 1 — A1P2 segment-1 bright

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

Identical to `providerLyrics`. Wrappers are study-pipeline-only; learner sees the same line text the provider sings.

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

- **Why this beats A1P2 V1.** V1 row 1.1 was Sunlit Acoustic Pop with brushed kit, soft piano taps, and handclap lift — indistinguishable from A1P1 segment-1 bright on a listening pass — and ended with the outro `"Glad, glad, glad it came through / Brilliant, ready, thanks to you"`, the worst vocabulary-stack failure in the V1 catalog. This row replaces both: funk pocket instead of acoustic-pop, an ordinary Friday scene instead of praise-spam, and an outro that names a feeling rather than stacking adjectives.
- **Style lane this avoids.** Avoids Bright = handclap-pop / brushed-kit / felt-piano cliche. The handclap here is a single precise accent on beat 2 of the chorus, not a wash that signals "smile."
- **Cloze position rationale.**
  - `happy` — chorus opener "I feel <<happy>>". First downbeat of the hook; carries the verse-1 emotional reveal. L1 "I don't understand" pay-off after the help arrives.
  - `warm` — chorus third line "You are <<warm>>, the room is <<fresh>>". Names the helper plus the room in one breath; cloze on the start of the bar.
  - `fresh` — same line, paired against `warm`. The room's atmosphere as a sensed thing; L5 "Do you have…?" — fresh bread / fresh stock — the visceral pay-off.
  - `right` — chorus closer "And the answer was <<right>>". Final downbeat of the hook — the strongest cloze position in the song. L3 "Show me" resolution.
  - `fine` — verse 2 mid-line "You said either is <<fine>>". L4 "Which one?" — `fine` describes the small choice as low-stakes positive; mid-line on a strong beat.
- **Risk / uncertainty.** Chorus packs two clozes on one line (`warm` and `fresh`). Provider should keep both words intelligible — caption explicitly says "clear English diction so 'happy, warm, right, fine, fresh' all land cleanly." If audio review finds `warm`/`fresh` blurring, the fix is to widen the chorus from 4 to 5 lines and split the cloze pair across two bars; the wrap positions still resolve to one occurrence per word.
- **Ready for product-owner review.** Yes.

---

## Row 2 — A1P2 segment-2 bright

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
| Vocal posture | spoken-sung lead with a small group response on the hook; warm, conversational, genuinely friendly without ever being twee |
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

- **Why this beats A1P2 V1.** V1 row 1.2 was Bright Handclap Pop with `"Cheerful in the queue"` and an outro of `"Heiter, sicher, einfach / Prima, freundlich und frei"` — the textbook adjective-stack outro. This row replaces it with a real walking scene (payment → receipt → reservation → keys → leaving) and uses each trophy word inside a sentence with content, not as an item in a list.
- **Style lane this avoids.** Avoids handclap-pop entirely. Highlife percussion is genuinely different from anything in A1P1 or A1P2 V1 — no kit at all; conga at centre; two interlocking guitars instead of strummed rhythm + brushed snare. The B6/B10 pair stays within Bright but uses two different rhythmic centres: B6's funk pocket vs B10's highlife walk.
- **Cloze position rationale.**
  - `neat` — verse 1 mid-line "A <<neat>> receipt slides over". L7 receipt scene; word lands on the strong beat at the start of the bar.
  - `easy` — chorus opener "Step by step, <<easy>> like a Tuesday". L6 payment reward; second beat of the chorus, the pocket's first emphasized syllable.
  - `kind` — chorus second line "<<Kind>> hands at every door". L8 reservation arrival; cloze starts the bar; "kind hands" is real English without praise-spam.
  - `sure` — chorus third line "I am <<sure>> the room is waiting". L9 confirmation; the line names the room as a real thing.
  - `cheerful` — bridge "A <<cheerful>> bow on the way". L10 "One moment" pause; deliberately placed in the bridge so it gets the small textural lift (conga louder, lead guitar quieter) and reads as a real adjective rather than another chorus stack.
- **Risk / uncertainty.** Highlife providers sometimes default to a caricatured "kalimba + light beat" interpretation. Caption explicitly says "two interlocking electric guitars" and "conga at the rhythmic centre" to lock in the actual idiom. If audio review finds the guitars too thin, the fix is to add "rhythm guitar palm-muted, lead guitar with chorus pedal" to the caption.
- **Ready for product-owner review.** Yes.

---

## Row 3 — A1P2 segment-1 wistful

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

- **Why this beats A1P2 V1.** V1 row 1.3 was Moonlit Indie Folk — fingerpicked guitar + felt piano + brushed kit + faint pad — the textbook "wistful = sleepy soft folk" attractor V2 §4 was explicitly trying to break. This row uses a guitar wall and a buried rock pulse: the wistfulness is in the *voice* pushing through the wash, not in the tempo or the instrumentation.
- **Style lane this avoids.** Avoids soft-folk default, felt-piano cliche, fingerpicked-acoustic, sleepy-coffeehouse default, and the airy-pad backing that A1P1 segment-1 wistful already used.
- **Cloze position rationale.**
  - `maybe` — verse 1 opener "<<Maybe>> in the half-heard room". Sets the song's posture; lands on the first downbeat before the wash builds.
  - `kindly` — verse 2 opener "Could you <<kindly>> write the line". L2 "Write it down" politeness; the word does the polite-request work.
  - `somewhere` — chorus opener "<<Somewhere>> in the second column". L3 "Show me" suspended pointing as the chorus opens; the cloze is the chorus's first downbeat.
  - `either` — chorus second line "<<Either>> the one above or below". L4 "Which one?" — the choice the song refuses to resolve.
  - `anywhere` — chorus third line "<<Anywhere>> the answer rests". L5 "Do you have…?" scope; start of line.
- **Risk / uncertainty.** Shoegaze providers sometimes default to washy lo-fi haze instead of pushing the vocal through. Caption explicitly says "airy buried-but-clear" — if Candidate A and Candidate B both come back with vocals lost under the wash, the fix is to add "vocals slightly raised in the mix, guitars panned wide, lead vocal centered" to the caption before re-running A/B; do not change the construction.
- **Ready for product-owner review.** Yes.

---

## Row 4 — A1P2 segment-2 wistful

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

- **Why this beats A1P2 V1.** V1 row 1.4 was Soft Downtempo Folk — nylon guitar + brushed kit + electric piano motif + airy pad — the second consecutive "soft folk with a felt-piano motif" wistful row in A1P2. This row drops the whole acoustic-folk palette and uses dub-techno space: the wistfulness lives in the *detachment and the delays*, not in the tempo or the pad.
- **Style lane this avoids.** Avoids the wistful-as-folk attractor V2 §4 calls out specifically. Dub-techno wistful is the V2 thesis ("wistful does not have to be slow / folk / sleepy") rendered as a real catalog row.
- **Revision from prior B6/B10 draft.** Section 4 in the earlier draft was an adjective stack ("Near the door, near the desk / Carefully the small machine / Calm at the reservation / Simple at the queue") that put every trophy word into a list-line. This pack rewrites Section 4 to a content-bearing image (the slow check, the green light returning, the patient hour, the held booking) that still belongs to the dub-techno texture (sparse, suspended) without naming the trophy words as adjectives in sequence.
- **Cloze position rationale.**
  - `carefully` — section 1 mid-line "I press it <<carefully>>, slow". L6 "By card" slow-payment posture; the adverb does the work; lands on a strong beat.
  - `near` — section 1 closing "The receipt is sitting <<near>>". L7 receipt scene; end-of-line, rings into next bar.
  - `calm` — section 2 closing "The hostess marks it <<calm>>". L8 reservation arrival; describes host's posture and the song's mood at once.
  - `simple` — section 3 opener "A <<simple>> check before the bus". L9 "Is this right?" confirmation; first beat of the bar.
  - `patient` — section 3 closing "A <<patient>> minute on the road". L10 "One moment" pause; lands at end of section before the loop turns over.
- **Risk / uncertainty.** Dub-techno providers sometimes interpret "two-chord hypnotic loop" as "ambient pad wash with no rhythm." Caption explicitly says "kick on 1 and 3" and "light clave on the off-beats" to lock in the pulse. Section 5's chant repetition ("Patient by the door / Patient by the door / The loop comes back around / And the loop comes back around") is intentional dub-techno texture — one image looping — not adjectives queued up.
- **Ready for product-owner review.** Yes.

---

## Row 5 — A1P2 segment-1 sharp

### 1. Row metadata

- **Proposed catalog id:** `english-a1-practical-2-segment-1-sharp-trophy-song`
- **Path id:** `english-a1-practical-2`
- **Segment:** 1
- **Vibe:** sharp
- **Revised trophy words (L1–L5 sharp):** `short`, `note`, `here`, `this`, `any`
- **Source lessons:** L1 I don't understand, L2 Write it down, L3 Show me, L4 Which one?, L5 Do you have…?
- **Style construction:** S2 — Crisp Funk-Bass Precision (V2 §5)
- **Style family (proposed):** `crisp-funk-bass-precision`
- **Style label (proposed):** Crisp funk-bass precision

### 2. Eight-axis musical design

| Axis | Choice |
|---|---|
| Tempo | driving, ~108 bpm |
| Groove | syncopated funk groove, very tight pocket |
| Instrumentation | percussive funk bass at the centre of the mix, muted clean electric guitar, dry kit with rim-shots and chorus-only handclaps placed precisely, single Rhodes accent on the chorus hook, no synth, no pad |
| Production texture | dry, hi-fi, warm |
| Vocal posture | crisp, decisive, slightly playful edge, tight timing, no melisma, no vocoder, no ornamentation |
| Harmony / melody | modal around the bass riff, narrow melody in the verses, single rhythmic hook on the chorus line, no big chord change |
| Energy curve | steady groove; second chorus adds the Rhodes accent and removes it on the bridge; no lift, no drop |
| Negative constraints | no Vulfpeck pastiche, no comedy-funk, no minimal-synth-grid attractor, no boss-mode posture, no motivational slogan energy, no smooth-jazz shimmer |

### 3. musicCaption

> Crisp funk-bass precision at ~108 bpm with a very tight syncopated pocket; percussive funk bass at the centre of the mix doing most of the harmonic work, muted clean electric guitar, dry kit with rim-shots and chorus-only handclaps placed precisely, one Rhodes accent on the chorus hook only, no synth, no pad; close dry vocal with tight timing, no vocoder, no melisma, no ornamentation, a crisp decisive Sharp posture with a small playful edge; steady groove, second chorus adds the Rhodes accent and removes it on the bridge, no chorus lift, no drop; clear English diction so "short, note, here, this, any" all land cleanly on the bass pocket; avoid Vulfpeck pastiche, comedy-funk, minimal-synth-grid attractor, boss-mode posture, motivational slogan energy, and smooth-jazz shimmer.

### 4. rawLyricsWithWrappers

```
[Verse 1]
<<Short>> question at the counter
I will keep it on one breath
Could you put it on a <<note>>
Where the address fits

[Chorus]
<<Here>> — that is the line
<<This>> is the one I need
<<Any>> in stock today
All good, we are moving on

[Verse 2]
A second at the page
A pen in someone's hand
The note comes back, I read it
Here, this, and the smaller bag

[Chorus]
Here — that is the line
This is the one I need
Any in stock today
All good, we are moving on

[Bridge]
The note is in my pocket
The address is clean
Here on the corner, there on the map
Any one will work tonight

[Outro]
The bag is in my hand
The address is in my head
Out the door, on the road
```

### 5. Derived providerLyrics

```
[Verse 1]
Short question at the counter
I will keep it on one breath
Could you put it on a note
Where the address fits

[Chorus]
Here — that is the line
This is the one I need
Any in stock today
All good, we are moving on

[Verse 2]
A second at the page
A pen in someone's hand
The note comes back, I read it
Here, this, and the smaller bag

[Chorus]
Here — that is the line
This is the one I need
Any in stock today
All good, we are moving on

[Bridge]
The note is in my pocket
The address is clean
Here on the corner, there on the map
Any one will work tonight

[Outro]
The bag is in my hand
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
Koenntest du es auf eine Notiz schreiben
Wo die Adresse hinpasst

[Chorus]
Hier - das ist die Zeile
Das ist das, was ich brauche
Welche heute auf Lager
Alles gut, wir gehen weiter

[Verse 2]
Eine Sekunde an der Seite
Ein Stift in jemandes Hand
Die Notiz kommt zurueck, ich lese sie
Hier, das, und die kleinere Tuete

[Chorus]
Hier - das ist die Zeile
Das ist das, was ich brauche
Welche heute auf Lager
Alles gut, wir gehen weiter

[Bridge]
Die Notiz ist in meiner Tasche
Die Adresse ist sauber
Hier an der Ecke, dort auf der Karte
Irgendeine geht heute Abend

[Outro]
Die Tuete ist in meiner Hand
Die Adresse ist in meinem Kopf
Aus der Tuer, auf die Strasse
```

### 8. Review notes

- **Why this beats A1P2 V1.** V1 row 1.5 was Clean Synth Grid with the outro `"Clear. Quick. Certain. Exactly. Decided. Done."` — the textbook vocabulary-stack chorus and the most direct example of "Sharp = synth-precision-pop" the V2 reset called out. This row replaces both: funk-bass pocket instead of synth grid, real short-shop scene instead of word-list outro.
- **Style lane this avoids.** Avoids minimal-synth-grid, clipped-hat / square-bass cliche, and motivational slogan energy. The Sharp posture here is a *bass-led pocket with a crisp vocal* — Sharp without synth, exactly the V2 thesis.
- **Revision from prior B6/B10 draft.** Bridge in the earlier draft was "Short answer, short question / Note clean, address set / Here on the corner — there on the map / Any one will work tonight" — compact but still leaning compact-list. This pack rewrites the bridge to lines that are full subject-predicate phrases ("The note is in my pocket / The address is clean / Here on the corner, there on the map / Any one will work tonight") — the same content shape with the listy first two lines turned into real sentences.
- **Cloze position rationale.**
  - `short` — verse 1 opener "<<Short>> question at the counter". L1 "I don't understand" Sharp variant: keep the ask compact; opens the song.
  - `note` — verse 1 closing-half "Could you put it on a <<note>>". L2 "Write it down" — noun-as-request that defines this Sharp variant.
  - `here` — chorus opener "<<Here>> — that is the line". L3 "Show me" Sharp pointing; one syllable on the first beat.
  - `this` — chorus second line "<<This>> is the one I need". L4 "Which one?" decisive demonstrative.
  - `any` — chorus third line "<<Any>> in stock today". L5 "Do you have…?" Sharp availability check.
- **Risk / uncertainty.** Bridge "The note is in my pocket / The address is clean" is still compact and could read close to V1's stack pattern — the saving difference is that each line is a complete declarative phrase with a verb. If product review reads this as too dense, swap to a single image: "The note is in my pocket and the address is clean / Here on the corner, there on the map / Any one will work tonight / And the small bag goes with me" — cloze positions unchanged.
- **Ready for product-owner review.** Yes.

---

## Row 6 — A1P2 segment-2 sharp

### 1. Row metadata

- **Proposed catalog id:** `english-a1-practical-2-segment-2-sharp-trophy-song`
- **Path id:** `english-a1-practical-2`
- **Segment:** 2
- **Vibe:** sharp
- **Revised trophy words (L6–L10 sharp):** `now`, `two`, `direct`, `yes`, `wait`
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

> Drumline precision at ~112 bpm with a marching snare pattern and no full drum kit; occasional bass drum hit, trumpet-and-alto-sax brass entering only on the chorus, no melodic instrument under the verses, no synth, no guitar; close dry vocal, tight timing, crisp Sharp posture that becomes briefly chant-like on the chorus hook; drums-and-voice only on the verse, brass enters on the chorus, brass exits on the verse return, bridge keeps the snare and adds a single new brass figure, no drop, no big build; clear English diction so "now, two, direct, yes, wait" all land cleanly between the snare hits; avoid marching-band caricature, sports-anthem energy, motivational slogan tone, boss-battle posture, minimal-synth attractor, and aggressive hip-hop posture.

### 4. rawLyricsWithWrappers

```
[Verse 1]
Card on the counter, pay it <<now>>
Receipt and bag, <<two>> in hand
No extra words, no extra step
I am at the next stand

[Chorus]
<<Direct>> at the desk, the name in line
"<<Yes>>, you are on the list"
A small bow back, a quick exchange
And the next door's missed

[Verse 2]
The platform sign, the route is true
Train pulling slow into the gate
"Is that the seven?" "Yes."
And the doors don't have to wait

[Chorus]
Direct at the desk, the name in line
"Yes, you are on the list"
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
Receipt and bag, two in hand
No extra words, no extra step
I am at the next stand

[Chorus]
Direct at the desk, the name in line
"Yes, you are on the list"
A small bow back, a quick exchange
And the next door's missed

[Verse 2]
The platform sign, the route is true
Train pulling slow into the gate
"Is that the seven?" "Yes."
And the doors don't have to wait

[Chorus]
Direct at the desk, the name in line
"Yes, you are on the list"
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
Quittung und Tuete, zwei in der Hand
Keine Extra-Worte, kein Extra-Schritt
Ich bin am naechsten Stand

[Chorus]
Direkt am Empfang, der Name in der Reihe
"Ja, Sie stehen auf der Liste"
Eine kleine Verbeugung zurueck, ein schneller Austausch
Und die naechste Tuer ist versaeumt

[Verse 2]
Das Bahnsteigschild, die Strecke stimmt
Der Zug rollt langsam ins Tor
"Ist das die Sieben?" "Ja."
Und die Tueren muessen nicht warten

[Chorus]
Direkt am Empfang, der Name in der Reihe
"Ja, Sie stehen auf der Liste"
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

- **Why this beats A1P2 V1.** V1 row 1.6 was Crisp Bass Pop with the chorus `"Done means done, and done means done / Right on time"` — exactly the motivational-slogan posture the V2 reset called out (the V1 caption itself flagged "avoid motivational slogan energy" while the lyric ignored its own caption). This row replaces both the synth-leaning palette and the slogan: drumline + brass with no kit, real platform/desk scene instead of slogan refrain.
- **Style lane this avoids.** Avoids the Sharp = minimal-synth / clipped-hat attractor entirely. Drumline + brass-on-chorus is genuinely different from anything in A1P1 or A1P2 V1 — no synth, no guitar, no rock kit.
- **Revision from prior B6/B10 draft.** Bridge in the earlier draft was `"Now is now and two is two / Direct is one clean line / Yes is one clean word back / Wait means one clean beat"` — four "X is X" / "X means Y" definitional lines, exactly the V2 "do not define the trophy word inside the lyric" rule. This pack replaces the bridge with a real drumline/street image (snare on the corner counting in, brass on the stair, waiting for the green to turn, crossing when the count says go). The cloze position for `wait` is preserved on a verb instead of a definitional refrain.
- **Cloze position rationale.**
  - `now` — verse 1 first-line closing "Card on the counter, pay it <<now>>". L6 "By card" scene; the word lands on the end-of-line snare hit.
  - `two` — verse 1 second-line closing "Receipt and bag, <<two>> in hand". L7 receipt scene; the number names the small list compactly.
  - `direct` — chorus opener "<<Direct>> at the desk, the name in line". L8 reservation arrival; opens the chorus on the first downbeat after the brass stab enters.
  - `yes` — chorus second line `"<<Yes>>, you are on the list"`. L9 "Is this right?" confirmation; lands on the most decisive beat of the song; the line is a direct-quoted reply, not a stack.
  - `wait` — bridge third line "I <<wait>> for the green to turn". L10 "One moment" — the word is a verb describing a real action (waiting for a traffic light), not a definitional X-is-Y refrain. Placed in the bridge so it gets the new brass figure and a textural change.
- **Risk / uncertainty.** Drumline providers sometimes default to sports-anthem or marching-band-caricature deliveries. Caption explicitly names both as exclusions. If Candidate A and Candidate B both come back with sports-anthem energy, the fix is to tighten the caption ("solo snare drumline, no marching-band cymbal crash, no anthem brass entry") before re-running, not to change the construction.
- **Ready for product-owner review.** Yes.

---

## Cross-segment trophy-word audit

To avoid confusing the learner, no song wraps a trophy word that belongs to a different (segment, vibe) cell of A1P2. Plain (unwrapped) occurrences of other A1P2 trophy words are not problematic — the cloze drill only acts on wrapped occurrences — but they were minimized.

| Row | Wrapped target words (5) | Plain occurrences of other A1P2 trophy words |
|---|---|---|
| Row 1 — seg-1 bright | happy, warm, right, fine, fresh | none |
| Row 2 — seg-2 bright | easy, neat, kind, sure, cheerful | none |
| Row 3 — seg-1 wistful | maybe, kindly, somewhere, either, anywhere | none |
| Row 4 — seg-2 wistful | carefully, near, calm, simple, patient | none |
| Row 5 — seg-1 sharp | short, note, here, this, any | none |
| Row 6 — seg-2 sharp | now, two, direct, yes, wait | none |

Each row uses exactly 5 wrapped trophy words. Total wrapped tokens: 30. No A1P2 trophy word appears as a wrapped target in more than one row.

## Lyric Direction V2 compliance grid

| Rule | Row 1 | Row 2 | Row 3 | Row 4 | Row 5 | Row 6 |
|---|---|---|---|---|---|---|
| Real small song shape (intro → moment → turn → close) | ✓ | ✓ | ✓ | ✓ (sectioned loop) | ✓ | ✓ |
| 16–28 lines | 24 | 22 | 22 | 24 | 24 | 24 |
| Every trophy word appears at least once | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Exactly one wrapped occurrence per trophy word | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| No fake mnemonics | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| No "X means Y" definitional lines | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ (revised) |
| No awkward adjective stacking as section/outro | ✓ | ✓ | ✓ | ✓ (revised) | ✓ (revised) | ✓ |
| No triple-word slogan lines | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| No forced metaphor / forced human image | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Same structure NOT forced across all rows | ✓ — verse-pre-chorus-bridge | ✓ — walk-form with bridge | ✓ — verse-verse-chorus | ✓ — sectioned loop | ✓ — verse-chorus-bridge | ✓ — verse-chorus-bridge (drumline) |
| Lyric structure adapts to caption | funk groove → spoken-sung pocket | highlife walk → chant-response | shoegaze → buried verse, opening chorus | dub-techno loop → looping sections | funk pocket → punctuated hook | drumline → drum-and-voice verse, brass chorus |

## Technical contract reminder (for the future runtime-wiring pass)

When these lyrics eventually move into `frontend/src/data/guidedTrophySongs.ts` (separate pass, after product approval), the row author must preserve:

- Exactly one `<<word>>` wrap per trophy word per row (5 wraps per row, 30 total).
- `providerLyrics` = `rawLyricsWithWrappers` with all `<<` and `>>` stripped, computed by `stripTrophySongWrappers` at [guidedTrophySongs.ts:1109](../../frontend/src/data/guidedTrophySongs.ts#L1109).
- `displayLyrics` = same as `providerLyrics`.
- `lyricsTranslationDe` is kept separate and is never sent to the music provider.
- `clozePositions` are derived from the wrappers by `deriveTrophySongClozePositions` at [guidedTrophySongs.ts:1090](../../frontend/src/data/guidedTrophySongs.ts#L1090).
- Provider must receive `providerLyrics`, not `rawLyricsWithWrappers`. Never send `<<` or `>>` to a music provider.

## Product-owner review checklist

Before this pack moves to audio generation, please confirm row-by-row:

1. The chosen style construction is the right call for this segment and vibe (or pick an alternative from V2 §5).
2. The eight-axis decomposition matches what you want the song to sound like.
3. The `musicCaption` is one paragraph that reads cleanly to a music provider.
4. The lyric reads as a real small song, not a vocabulary worksheet.
5. The cloze position for each trophy word lands on the strongest musical position you can find.
6. The German translation is acceptable (it never goes to the provider, but it does appear in the in-app study panel).
7. (Cross-draft comparison.) Compare each row against the parallel B1/B8/W6/W1/S3/S6 draft and pick: (a) this pack, (b) the parallel draft, (c) a per-row merge, (d) reject and respec.

If any row is rejected, the failure mode falls into one of three buckets and the fix is small:

- "Wrong style construction" → swap the construction (V2 §5); rewrite caption and lyric.
- "Right style, wrong lyric" → keep caption, rewrite lyric.
- "Right lyric, wrong cloze choice" → move the `<<>>` markers; everything else stays.

## What this pack did not do

- No `guidedTrophySongs.ts` runtime row added or modified.
- No `guidedLessons.ts` modified.
- No audio generated.
- No provider call (KIE / Suno / ElevenLabs untouched).
- No `frontend/public/guided/trophy-songs/**` touched.
- No backend / Music page / Supabase / decks / providers / normal pipeline touched.
- No A1P3 / A1P4 / A1P5 authoring.

## Status

- A1P2 V2 lyrics + music captions: **drafted in this pack** awaiting product-owner review.
- A1P2 V2 audio: **still blocked**.
- A1P3 / A1P4 / A1P5: **still blocked** until A1P2 V2 cycle completes end-to-end.

## Summary

- Six A1P2 V2 rows authored as a docs-only review pack.
- Style rotation: **B6 / B10 / W4 / W2 / S2 / S5** (V2 §6 proposed rotation).
- All V2 §6 variety constraints satisfied: Bright funk (Row 1) + Bright highlife (Row 2); Wistful shoegaze (Row 3) + Wistful dub-techno (Row 4); Sharp funk-bass (Row 5) + Sharp drumline (Row 6). Two Bright that are not handclap-pop; two Wistful that are rhythmic/electronic and non-sleepy; two Sharp that are non-synth and not minimal-electro.
- Tempo spread ~100 → ~118 bpm; trades extreme tempo range for stronger intra-vibe instrumentation contrast vs the parallel B1/B8/W6/W1/S3/S6 draft.
- All technical Trophy Song constraints satisfied: exactly one wrapped occurrence per trophy word per row; `providerLyrics` and `displayLyrics` derived by `stripTrophySongWrappers`; German translation present per row; no `<<` / `>>` will reach the music provider.
- Two weak spots from the earlier B6/B10 draft revised: Row 4 section 4 (adjective stack → real image), Row 6 bridge ("X is X" → real drumline/street image with `wait` placed on a verb).
- No runtime files modified. No audio generated. `guidedTrophySongs.ts` unchanged. Audio remains blocked pending product-owner review of this doc.
