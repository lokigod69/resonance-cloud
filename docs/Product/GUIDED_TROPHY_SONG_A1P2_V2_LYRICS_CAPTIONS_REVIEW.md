# Guided Trophy Song — A1P2 V2 Lyrics + Music Captions (Review Doc)

Date: 2026-05-15
Author: Claude (lyrics + captions draft, fresh authoring pass)
Repo: d:\CODING\ResonanceTEST\orchestrator
Branch: main
Scope: docs only. No runtime files modified. No audio generated. No edits to `guidedTrophySongs.ts`, `guidedLessons.ts`, providers, Music page, or backend.

Inputs:
- Revised A1P2 trophy words from [frontend/src/data/guidedLessons.ts](../../frontend/src/data/guidedLessons.ts) per [GUIDED_TROPHY_WORD_A1P2_SOURCE_REVISION_V1_REPORT.md](GUIDED_TROPHY_WORD_A1P2_SOURCE_REVISION_V1_REPORT.md).
- Musical Design Framework V2 (eight axes) from [GUIDED_TROPHY_SONG_MUSICALITY_RESET_V2.md](GUIDED_TROPHY_SONG_MUSICALITY_RESET_V2.md) §3.
- Vibe-as-Performance-Attitude redefinition from the same report §4.
- Lyric Direction V2 (creative brief + technical constraints) from §7.
- Style construction library from §5 (the 36 numbered constructions).
- Creative-pipeline framing "match lyric structure to caption" from [cloud_engines/concept_engine/lyrics.py:434-499](../../cloud_engines/concept_engine/lyrics.py#L434-L499).

Companion docs:
- An earlier draft at [GUIDED_TROPHY_SONG_A1P2_V2_LYRICS_AND_CAPTIONS.md](GUIDED_TROPHY_SONG_A1P2_V2_LYRICS_AND_CAPTIONS.md) (commit `64f8b87`) used the §6 rotation table (B6 / B10 / W4 / W2 / S2 / S5). This review doc deliberately uses a different style rotation (B1 / B8 / W6 / W1 / S3 / S6) to give the product owner a comparable alternative — both drafts satisfy the V2 variety constraints, but with different sonic centers per row. Product owner can pick one of the two drafts or merge per row.

Variety constraints (V2 §6 acceptance bar):
- At least one Bright non-pop/roots/surf/funk/road style — **Row 1 = B1 California Sofa-Rock Sunrise** (roots-rock).
- At least one Bright not handclap-pop — Row 1 + Row 2 both qualify.
- At least one Wistful rhythmic/electronic — **Row 3 = W6 Trip-Hop Hallway**, **Row 4 = W1 Wistful Drum-and-Bass**.
- At least one Wistful non-sleepy — Row 4 at ~170 bpm half-time DnB.
- At least one Sharp non-synth — **Row 5 = S3 Staccato Piano Groove**, **Row 6 = S6 Brass-Hits and Tight Kit**.
- At least one Sharp not minimal electro — Rows 5 + 6 both qualify.

How to read this document:
- Six rows, one per (segment, vibe). Each row carries: metadata + eight-axis decomposition + `musicCaption` + `rawLyricsWithWrappers` + `providerLyrics` (wrappers stripped) + `displayLyrics` (same as provider) + `lyricsTranslationDe` + review notes.
- Cross-segment trophy-word integrity confirmed at the end.
- Approval gate: product-owner reviews these six lyrics + captions before any audio generation.

---

## Row 1 — A1P2 segment-1 bright

### Row metadata

- Proposed catalog id: `english-a1-practical-2-segment-1-bright-trophy-song`
- pathId: `english-a1-practical-2`
- segment: 1
- vibe: bright
- Revised trophy words (L1–L5 bright): **happy**, **warm**, **right**, **fine**, **fresh**
- Source lessons: L1 *I don't understand*, L2 *Write it down*, L3 *Show me*, L4 *Which one?*, L5 *Do you have…?*
- Style construction: **B1 — California Sofa-Rock Sunrise** (V2 §5)
- styleFamily (proposed): `tape-worn-roots-rock`
- songStyleLabel (proposed): `Tape-worn roots-rock`

### Eight-axis musical design

| Axis | Choice |
|---|---|
| Tempo | mid-tempo walk, ~96 bpm |
| Groove | half-time straight rock pulse with hand percussion |
| Instrumentation | warm electric guitar lead, acoustic guitar comp, upright bass, brushed kit, faint Wurlitzer organ entering on the chorus |
| Production texture | tape-worn, dry-and-close vocals, no reverb wash |
| Vocal posture | road-song vocal, smiling but not grinning, single-take feel |
| Harmony / melodic feel | major-leaning with a mixolydian flavor on the chorus, narrow-range verse melody, small rising step on the hook |
| Energy curve | steady; small chorus lift only on the trophy-word lines; outro strips back to voice and acoustic |
| Negative constraints | no glossy top-40, no kids-show bounce, no ukulele, no handclap-pop lift, no AI-pop sheen |

### musicCaption

> Tape-worn California sofa-rock at ~96 bpm with a half-time pulse and hand percussion; warm electric guitar lead over acoustic comp, upright bass, brushed kit, faint Wurlitzer organ entering on the chorus; smiling single-take road-song vocal close to the mic with no reverb wash; small chorus lift only on the trophy-word lines; outro strips back to voice and acoustic; clear English diction so "happy, warm, right, fine, fresh" all land cleanly; avoid top-40 gloss, kids-show bounce, handclap-pop lift, AI-pop sheen, and ukulele.

### rawLyricsWithWrappers

```
[Verse 1]
The sign at the corner cafe
A small word I didn't know
You leaned across the counter
And spelled it on a note

[Pre-Chorus]
And the morning was a little late
But I had the place, I had the gate

[Chorus]
So I went home <<happy>>
Coat <<warm>> against the breeze
The answer was the <<right>> one
And the morning let me through

[Verse 2]
Which one — the smaller or the round
You held them both before me
I asked if it was still the same day's bread
And you handed me the loaf, still <<fresh>>

[Bridge]
A <<fine>> small thing on the doorway
A page tucked in the coat
And I knew where the seven was going
And I had the right note

[Chorus]
So I went home happy
Coat warm against the breeze
The answer was the right one
And the morning let me through

[Outro]
Tuesday on a quiet street
Happy where I stood
The seven was the right one
And the bread was good
```

### providerLyrics (wrappers stripped)

```
[Verse 1]
The sign at the corner cafe
A small word I didn't know
You leaned across the counter
And spelled it on a note

[Pre-Chorus]
And the morning was a little late
But I had the place, I had the gate

[Chorus]
So I went home happy
Coat warm against the breeze
The answer was the right one
And the morning let me through

[Verse 2]
Which one — the smaller or the round
You held them both before me
I asked if it was still the same day's bread
And you handed me the loaf, still fresh

[Bridge]
A fine small thing on the doorway
A page tucked in the coat
And I knew where the seven was going
And I had the right note

[Chorus]
So I went home happy
Coat warm against the breeze
The answer was the right one
And the morning let me through

[Outro]
Tuesday on a quiet street
Happy where I stood
The seven was the right one
And the bread was good
```

### displayLyrics

Identical to providerLyrics. Both are derived from `rawLyricsWithWrappers` by `stripTrophySongWrappers` ([guidedTrophySongs.ts:1109](../../frontend/src/data/guidedTrophySongs.ts#L1109)).

### lyricsTranslationDe

```
[Verse 1]
Das Schild am Eckcafe
Ein kleines Wort, das ich nicht kannte
Du hast dich ueber den Tresen gelehnt
Und es auf einen Zettel geschrieben

[Pre-Chorus]
Und der Morgen war ein bisschen spaet
Aber ich hatte den Ort, ich hatte das Tor

[Chorus]
Also ging ich froh nach Hause
Den Mantel warm gegen den Wind
Die Antwort war die richtige
Und der Morgen liess mich durch

[Verse 2]
Welches — das kleinere oder das runde
Du hast sie beide vor mich gehalten
Ich fragte, ob es noch vom selben Tag ist
Und du hast mir das Brot gegeben, noch frisch

[Bridge]
Eine gute kleine Sache an der Tuer
Eine Seite in der Manteltasche
Und ich wusste, wohin die Sieben faehrt
Und ich hatte die richtige Notiz

[Chorus]
Also ging ich froh nach Hause
Den Mantel warm gegen den Wind
Die Antwort war die richtige
Und der Morgen liess mich durch

[Outro]
Dienstag auf einer ruhigen Strasse
Froh, wo ich stand
Die Sieben war die richtige
Und das Brot war gut
```

### Cloze-position rationale

- **happy** — wrapped on the chorus opener `So I went home <<happy>>`. It is the song's strongest reward beat, lands on the final stressed syllable of the line, and the verb-of-state placement makes it feel like an emotional reveal rather than a stack.
- **warm** — wrapped on the next chorus line `Coat <<warm>> against the breeze`. It's adjectival but attached to a concrete object (the coat), so it carries the L2 "Write it down → warm thanks" reward without sounding praise-y.
- **right** — wrapped on chorus line three `The answer was the <<right>> one`. The L3 "Show me" reward; "the right one" is core A1 confirmation language. Lands mid-line on a strong beat.
- **fine** — wrapped in the bridge `A <<fine>> small thing on the doorway`. Holds the L4 "Which one?" decision moment; placed in the bridge (not the chorus) so it gets a different sonic context and avoids stacking five wraps in one section.
- **fresh** — wrapped at the end of verse 2 `And you handed me the loaf, still <<fresh>>`. The L5 "Do you have…?" reward; final stressed syllable of the verse, which is the second-strongest cloze position after the chorus opener.

### Review notes

- Why better than V1 A1P2 bright seg-1: the V1 catalog row's chorus `"I'm glad you wrote it down / Glad the words came shining through / Brilliant little note in a busy town / I'm ready now with you"` is a vocabulary-tour chorus that names three trophy words back to back. This V2 chorus uses one trophy word per chorus line and embeds each word in a scene action (`went home <<happy>>`, `coat <<warm>>`, `<<right>> one`), so the words are part of a small story rather than a listing.
- Style lane avoided: B1 is roots-rock with brushed kit, not handclap acoustic-pop. No "handclap lift", no "sunny indie pop" attractor.
- Risks / uncertainty: "the seven" (bus number) and "Tuesday" are scene anchors that may feel arbitrary on first listen; if the product owner wants a less specific scene, those can be neutralized to "the bus" and "morning" without disturbing wraps or rhymes.
- Ready for product review.

---

## Row 2 — A1P2 segment-2 bright

### Row metadata

- Proposed catalog id: `english-a1-practical-2-segment-2-bright-trophy-song`
- pathId: `english-a1-practical-2`
- segment: 2
- vibe: bright
- Revised trophy words (L6–L10 bright): **easy**, **neat**, **kind**, **sure**, **cheerful**
- Source lessons: L6 *By card*, L7 *A receipt, please*, L8 *I have a reservation*, L9 *Is this right?*, L10 *One moment*
- Style construction: **B8 — Brass-and-Guitar Daylight** (V2 §5)
- styleFamily (proposed): `brass-and-guitar-daylight`
- songStyleLabel (proposed): `Brass-and-guitar daylight`

### Eight-axis musical design

| Axis | Choice |
|---|---|
| Tempo | mid-tempo walk, ~98 bpm |
| Groove | straight rock pulse, brass stabs on 2 and 4 |
| Instrumentation | rhythm electric guitar, trumpet + tenor sax pair, upright bass, dry kit, small Rhodes on the bridge only |
| Production texture | warm analog, dry vocals, dry brass |
| Vocal posture | conversational, slightly playful, eye-contact close-mic |
| Harmony / melodic feel | major with a simple V-vi turn, brass stabs spelling the chord |
| Energy curve | builds across the song into a brass-led outro |
| Negative constraints | no big-band cliche, no Motown pastiche, no Hollywood-ending crescendo, no ska upstroke caricature |

### musicCaption

> Warm-analog brass-and-guitar daylight at ~98 bpm with a straight rock pulse and brass stabs on 2-and-4; rhythm electric guitar, trumpet-and-tenor-sax pair, upright bass, dry kit, small Rhodes accent only in the bridge; conversational slightly-playful vocal close to the mic; song builds across the verses and choruses into a brass-led outro; clear English diction so "easy, neat, kind, sure, cheerful" all land cleanly; avoid big-band cliche, Motown pastiche, Hollywood-ending crescendo, and ska upstroke caricature.

### rawLyricsWithWrappers

```
[Verse 1]
Card on the reader, the green light came
Receipt curled up in the slot
You handed it back with a <<neat>> small fold
And I tucked it in my coat

[Pre-Chorus]
At the door of the place I booked
You found the name on the second look

[Chorus]
The hostess was <<kind>>, the table was set
The bill was <<easy>>, the night was true
I was <<sure>> of the bus to the corner cafe
And the day knew what to do

[Verse 2]
Excuse me — is this the right train, please
You nodded once and held the door
One moment for the card to settle
And the gate said walk, no more

[Bridge]
A <<cheerful>> pause between the trains
A small bell on the host stand
Sure on the platform, kind in the hall
And the night took my hand

[Chorus]
The hostess was kind, the table was set
The bill was easy, the night was true
Sure of the bus to the corner cafe
And the day knew what to do

[Outro]
Brass plays out the platform
Card back, list back, room held
A small bow on the way out
And the bell rang clear
```

### providerLyrics

```
[Verse 1]
Card on the reader, the green light came
Receipt curled up in the slot
You handed it back with a neat small fold
And I tucked it in my coat

[Pre-Chorus]
At the door of the place I booked
You found the name on the second look

[Chorus]
The hostess was kind, the table was set
The bill was easy, the night was true
I was sure of the bus to the corner cafe
And the day knew what to do

[Verse 2]
Excuse me — is this the right train, please
You nodded once and held the door
One moment for the card to settle
And the gate said walk, no more

[Bridge]
A cheerful pause between the trains
A small bell on the host stand
Sure on the platform, kind in the hall
And the night took my hand

[Chorus]
The hostess was kind, the table was set
The bill was easy, the night was true
Sure of the bus to the corner cafe
And the day knew what to do

[Outro]
Brass plays out the platform
Card back, list back, room held
A small bow on the way out
And the bell rang clear
```

### displayLyrics

Identical to providerLyrics.

### lyricsTranslationDe

```
[Verse 1]
Karte auf dem Leser, das gruene Licht kam
Die Quittung im Schlitz aufgerollt
Du hast sie ordentlich zusammengefaltet zurueckgegeben
Und ich habe sie in den Mantel gesteckt

[Pre-Chorus]
An der Tuer von dem Ort, den ich gebucht habe
Hast du den Namen beim zweiten Hinsehen gefunden

[Chorus]
Die Hoestin war freundlich, der Tisch war gedeckt
Die Rechnung war einfach, die Nacht stimmte
Ich war sicher, welcher Bus zum Eckcafe faehrt
Und der Tag wusste, was zu tun ist

[Verse 2]
Entschuldigung — ist das der richtige Zug, bitte
Du hast einmal genickt und die Tuer gehalten
Einen Moment, bis die Karte durch war
Und das Tor sagte geh, nicht mehr

[Bridge]
Eine heitere Pause zwischen den Zuegen
Eine kleine Glocke am Empfangstisch
Sicher auf dem Bahnsteig, freundlich in der Halle
Und die Nacht nahm meine Hand

[Chorus]
Die Hoestin war freundlich, der Tisch war gedeckt
Die Rechnung war einfach, die Nacht stimmte
Sicher, welcher Bus zum Eckcafe faehrt
Und der Tag wusste, was zu tun ist

[Outro]
Die Blechblaeser spielen den Bahnsteig aus
Karte zurueck, Liste zurueck, Zimmer gehalten
Eine kleine Verbeugung auf dem Weg hinaus
Und die Glocke klang klar
```

### Cloze-position rationale

- **neat** — wrapped on verse 1 line 3 `with a <<neat>> small fold`. L7 "A receipt, please" reward; placed on a strong beat with a concrete tactile image (the fold).
- **easy** — wrapped on chorus line 2 `The bill was <<easy>>, the night was true`. The L6 "By card" reward; the chorus is the reward moment, and "easy" carries that.
- **kind** — wrapped on chorus opener `The hostess was <<kind>>, the table was set`. L8 reservation arrival reward; first downbeat of the hook.
- **sure** — wrapped on chorus line 3 `I was <<sure>> of the bus to the corner cafe`. L9 "Is this right?" confirmation; mid-chorus on a strong beat.
- **cheerful** — wrapped on the bridge `A <<cheerful>> pause between the trains`. L10 "One moment" pause; placed in the bridge so it gets the bridge's small lift and is not stacked into the chorus.

### Review notes

- Why better than V1 A1P2 bright seg-2: the V1 outro `"Heiter, sicher, einfach / Prima, freundlich und frei"` is a five-word vocabulary stack in German. This V2 outro is a brass-led closing scene with a single "small bow" image. No trophy words in the outro at all.
- Style lane avoided: B8 is brass-and-guitar, not "Bright handclap pop" (the V1 catalog row's lane). Brass stabs replace handclaps on the off-beats.
- Risks / uncertainty: "the seven" / "the corner cafe" carry over from Row 1's scene-world; this is intentional so the bright Seg-2 song feels like the same day continued, not a different city. If product owner wants them separated, the bus/cafe can be neutralized.
- Ready for product review.

---

## Row 3 — A1P2 segment-1 wistful

### Row metadata

- Proposed catalog id: `english-a1-practical-2-segment-1-wistful-trophy-song`
- pathId: `english-a1-practical-2`
- segment: 1
- vibe: wistful
- Revised trophy words (L1–L5 wistful): **maybe**, **kindly**, **somewhere**, **either**, **anywhere**
- Source lessons: L1 *I don't understand*, L2 *Write it down*, L3 *Show me*, L4 *Which one?*, L5 *Do you have…?*
- Style construction: **W6 — Trip-Hop Hallway** (V2 §5)
- styleFamily (proposed): `dusty-trip-hop-hallway`
- songStyleLabel (proposed): `Dusty trip-hop hallway`

### Eight-axis musical design

| Axis | Choice |
|---|---|
| Tempo | slow pulse, ~88 bpm |
| Groove | half-time breakbeat with sampled snare crackle |
| Instrumentation | dusty drum sample, upright bass, Rhodes chord on the verse, distant vinyl loop on the chorus, faint finger snap |
| Production texture | dusty vinyl, close-but-reverbed vocal, no shine |
| Vocal posture | intimate, half-spoken, restrained |
| Harmony / melodic feel | minor-leaning with a suspended chord on the hook; narrow melody; small step down on the verse close |
| Energy curve | steady throughout, no chorus lift, no drop |
| Negative constraints | no lo-fi study-beat default, no generic chill-hop, no spa-music wash, no sad-girl-pop ballad shape |

### musicCaption

> Dusty-vinyl trip-hop hallway at ~88 bpm with a half-time breakbeat and sampled snare crackle; upright bass, Rhodes chord on the verses, distant vinyl loop on the chorus, faint finger snap; intimate half-spoken vocal close to the mic with a little reverb tail; steady energy throughout, no chorus lift; clear English diction so "maybe, kindly, somewhere, either, anywhere" all land cleanly; avoid lo-fi study-beat default, generic chill-hop, spa-music wash, and sad-girl-pop ballad shape.

### rawLyricsWithWrappers

```
[Verse 1]
I missed the meaning at the door
Half a word, half a hand
I asked you <<kindly>> for a written line
Just so I could understand

[Pre-Chorus]
The pen took a slow path on the page
And the room turned the corner of the page

[Chorus]
<<Maybe>> here or <<somewhere>> close
<<Either>> one was fine by me
<<Anywhere>> the answer wants to land
I'll go where it wants to be

[Verse 2]
You held the menu in the soft light
Two small things on the bottom row
I asked which one and you said either
And I felt the answer slow

[Bridge]
A doorway in the soft light
A small room with a kettle off
The pen has finished what the hand began
And the slow song fits the air

[Chorus]
Maybe here or somewhere close
Either one was fine by me
Anywhere the answer wants to land
I'll go where it wants to be

[Outro]
The pen is still warm on the paper
The map is folded twice
A slow yes, a slow maybe
Either side of the night
```

### providerLyrics

```
[Verse 1]
I missed the meaning at the door
Half a word, half a hand
I asked you kindly for a written line
Just so I could understand

[Pre-Chorus]
The pen took a slow path on the page
And the room turned the corner of the page

[Chorus]
Maybe here or somewhere close
Either one was fine by me
Anywhere the answer wants to land
I'll go where it wants to be

[Verse 2]
You held the menu in the soft light
Two small things on the bottom row
I asked which one and you said either
And I felt the answer slow

[Bridge]
A doorway in the soft light
A small room with a kettle off
The pen has finished what the hand began
And the slow song fits the air

[Chorus]
Maybe here or somewhere close
Either one was fine by me
Anywhere the answer wants to land
I'll go where it wants to be

[Outro]
The pen is still warm on the paper
The map is folded twice
A slow yes, a slow maybe
Either side of the night
```

### displayLyrics

Identical to providerLyrics.

### lyricsTranslationDe

```
[Verse 1]
Ich verpasste den Sinn an der Tuer
Ein halbes Wort, eine halbe Hand
Ich bat dich freundlich um eine geschriebene Zeile
Nur damit ich verstehen konnte

[Pre-Chorus]
Der Stift nahm einen langsamen Weg auf der Seite
Und der Raum drehte die Ecke der Seite

[Chorus]
Vielleicht hier oder irgendwo in der Naehe
Eines von beiden war fuer mich in Ordnung
Wo immer die Antwort landen will
Ich gehe dorthin, wo sie sein moechte

[Verse 2]
Du hieltst die Karte ins weiche Licht
Zwei kleine Dinge in der unteren Reihe
Ich fragte welches, und du sagtest eines von beiden
Und ich spuerte die Antwort langsam

[Bridge]
Eine Tuer im weichen Licht
Ein kleiner Raum mit ausgeschaltetem Kessel
Der Stift hat beendet, was die Hand begonnen hat
Und das langsame Lied passt in die Luft

[Chorus]
Vielleicht hier oder irgendwo in der Naehe
Eines von beiden war fuer mich in Ordnung
Wo immer die Antwort landen will
Ich gehe dorthin, wo sie sein moechte

[Outro]
Der Stift ist noch warm auf dem Papier
Die Karte ist zweimal gefaltet
Ein langsames Ja, ein langsames Vielleicht
Auf beiden Seiten der Nacht
```

### Cloze-position rationale

- **kindly** — wrapped on verse 1 line 3 `I asked you <<kindly>> for a written line`. L2 "Write it down" reward; "kindly" sits where the polite request lands and reads as a manner-of-asking adverb, not a glossary entry.
- **maybe** — wrapped on chorus opener `<<Maybe>> here or somewhere close`. L1 hesitation reward; first stressed syllable of the hook.
- **somewhere** — wrapped on the same chorus line `<<Maybe>> here or <<somewhere>> close`. L3 pointing reward; placed on the line's second strong beat, parallels "maybe".
- **either** — wrapped on chorus line 2 `<<Either>> one was fine by me`. L4 "Which one?" reward; first stressed syllable of the line, a real A1 decision-hedging word in a real sentence.
- **anywhere** — wrapped on chorus line 3 `<<Anywhere>> the answer wants to land`. L5 availability reward; first stressed syllable of the line, the most spacious wrap position.

### Review notes

- Why better than V1 A1P2 wistful seg-1: the V1 catalog row uses fingerpicked guitar + felt piano + airy pad with chorus `"Perhaps here, perhaps this way / A quiet mark beside the line / Keep it soft, keep it close / Soft enough for me to try"`. That's the textbook "wistful = soft folk" attractor V2 §2 explicitly flags. This V2 row uses a dusty trip-hop break and an intimate half-spoken vocal — wistful as performance posture, not as folk genre. The bridge avoids any "X is a word for Y" definitional lines.
- Style lane avoided: not folk, not piano-ballad, not airy-pad ambient. Trip-hop sits closer to W6 than to the V1 lane.
- Risks / uncertainty: trip-hop is occasionally heard as "lo-fi study beat" by listeners who don't know the genre — the caption's negative constraint and the dusty-vinyl + half-spoken instructions push away from that, but a candidate listen-through is the only confirmation.
- Ready for product review.

---

## Row 4 — A1P2 segment-2 wistful

### Row metadata

- Proposed catalog id: `english-a1-practical-2-segment-2-wistful-trophy-song`
- pathId: `english-a1-practical-2`
- segment: 2
- vibe: wistful
- Revised trophy words (L6–L10 wistful): **carefully**, **near**, **calm**, **simple**, **patient**
- Source lessons: L6 *By card*, L7 *A receipt, please*, L8 *I have a reservation*, L9 *Is this right?*, L10 *One moment*
- Style construction: **W1 — Wistful Drum-and-Bass** (V2 §5)
- styleFamily (proposed): `rainy-wistful-dnb`
- songStyleLabel (proposed): `Rainy wistful drum-and-bass`

### Eight-axis musical design

| Axis | Choice |
|---|---|
| Tempo | fast-but-controlled, ~170 bpm with half-time vocal phrasing |
| Groove | drum and bass — chopped breakbeat, half-time vocal |
| Instrumentation | chopped breakbeat, sub-bass, distant felt-piano motif on the verses, airy pad on the chorus, faint vinyl crackle |
| Production texture | spacious, rainy, urban |
| Vocal posture | distant, restrained, half-time over the dnb pulse |
| Harmony / melodic feel | minor, two-chord cycle on the verses, suspended chord on the chorus pad |
| Energy curve | hypnotic throughout, no chorus lift, no drop |
| Negative constraints | no sad-girl-pop chorus, no piano-ballad weight, no neo-soul melisma, no rave-energy chorus drop |

### musicCaption

> Rainy wistful drum-and-bass at ~170 bpm with half-time vocal phrasing; chopped breakbeat, sub-bass, distant felt-piano motif on the verses, airy pad on the chorus, faint vinyl crackle through the song; restrained distant vocal at half-time over the dnb pulse, close to the mic; hypnotic energy throughout, no chorus lift, no drop; clear English diction so "carefully, near, calm, simple, patient" all land cleanly; avoid sad-girl-pop chorus, piano-ballad weight, neo-soul melisma, and rave-energy chorus drop.

### rawLyricsWithWrappers

```
[Verse 1]
Card on the terminal, slow tap
The light went soft on the counter glass
I held the chip <<carefully>> down
And the rain stayed on the pavement

[Pre-Chorus]
A receipt rolled on a quiet shelf
A bag held small against myself

[Chorus]
The gate is <<near>>, the night is long
A name on the list, the room is set
I'm <<patient>> with the rain on the platform
Watching the windows where they let the lamps stretch

[Verse 2]
Is this the right train, please, or the next
You looked with me at the board
A <<simple>> answer at the second try
And the time felt softer than before

[Bridge]
A <<calm>> minute by the gate
One moment for the card to clear
Carefully across the wet stone
The rain stayed near

[Chorus]
The gate is near, the night is long
A name on the list, the room is set
Patient with the rain on the platform
Watching the windows where they let the lamps stretch

[Outro]
The rain on the platform glass
The name was already there
Walking slow toward the carriage
And the night kept the air
```

### providerLyrics

```
[Verse 1]
Card on the terminal, slow tap
The light went soft on the counter glass
I held the chip carefully down
And the rain stayed on the pavement

[Pre-Chorus]
A receipt rolled on a quiet shelf
A bag held small against myself

[Chorus]
The gate is near, the night is long
A name on the list, the room is set
I'm patient with the rain on the platform
Watching the windows where they let the lamps stretch

[Verse 2]
Is this the right train, please, or the next
You looked with me at the board
A simple answer at the second try
And the time felt softer than before

[Bridge]
A calm minute by the gate
One moment for the card to clear
Carefully across the wet stone
The rain stayed near

[Chorus]
The gate is near, the night is long
A name on the list, the room is set
Patient with the rain on the platform
Watching the windows where they let the lamps stretch

[Outro]
The rain on the platform glass
The name was already there
Walking slow toward the carriage
And the night kept the air
```

### displayLyrics

Identical to providerLyrics.

### lyricsTranslationDe

```
[Verse 1]
Karte auf dem Terminal, langsam getippt
Das Licht wurde weich auf dem Glas am Tresen
Ich hielt den Chip vorsichtig hinunter
Und der Regen blieb auf dem Pflaster

[Pre-Chorus]
Eine Quittung aufgerollt auf einem stillen Regal
Eine Tuete klein an mich gehalten

[Chorus]
Das Tor ist nah, die Nacht ist lang
Ein Name auf der Liste, das Zimmer ist bereit
Ich bin geduldig mit dem Regen auf dem Bahnsteig
Schaue auf die Fenster, wo die Lampen lang gelassen werden

[Verse 2]
Ist das der richtige Zug bitte, oder der naechste
Du hast mit mir auf die Anzeige geschaut
Eine einfache Antwort beim zweiten Versuch
Und die Zeit fuehlte sich weicher an als vorher

[Bridge]
Eine ruhige Minute am Tor
Einen Moment, bis die Karte durch war
Vorsichtig ueber den nassen Stein
Der Regen blieb nah

[Chorus]
Das Tor ist nah, die Nacht ist lang
Ein Name auf der Liste, das Zimmer ist bereit
Geduldig mit dem Regen auf dem Bahnsteig
Schaue auf die Fenster, wo die Lampen lang gelassen werden

[Outro]
Der Regen am Bahnsteigglas
Der Name war schon da
Langsam zum Wagen gehen
Und die Nacht behielt die Luft
```

### Cloze-position rationale

- **carefully** — wrapped on verse 1 line 3 `I held the chip <<carefully>> down`. L6 "By card" reward; the most physical action in the song, "carefully" attaches to a concrete hand gesture so it reads as performed motion, not as adverb-stack.
- **near** — wrapped on chorus opener `The gate is <<near>>, the night is long`. L7 "near the door" continuation; first stressed syllable of the hook.
- **patient** — wrapped on chorus line 3 `I'm <<patient>> with the rain on the platform`. L10 "One moment" pause reward; the rain image gives "patient" something to be patient with.
- **simple** — wrapped on verse 2 `A <<simple>> answer at the second try`. L9 "Is this right?" confirmation; "simple answer" reads as a real adjective on a noun, not as a glossary entry.
- **calm** — wrapped on the bridge `A <<calm>> minute by the gate`. L8 reservation arrival reward; placed in the bridge so all five wraps don't cluster in the chorus.

### Review notes

- Why better than V1 A1P2 wistful seg-2: the V1 catalog row uses nylon guitar + felt piano + airy pad + ~84 bpm with an outro `"Calm, simple, patient / Near the light again"` that is a five-word adjective stack in German and English. This V2 row is ~170 bpm DnB with half-time vocal — completely different sonic register — and the outro has zero trophy words, just a closing scene image.
- Style lane avoided: not folk, not soft downtempo, not airy-pad ambient. DnB at 170 bpm half-time vocal is the most direct rebuttal of "wistful = sleepy" the V2 framework offers.
- Risks / uncertainty: DnB at 170 bpm is a stylistic risk for an A1 learner audience expecting mellow material; the half-time vocal keeps diction landable, but candidate listen-through is needed before approval. If product owner finds the tempo distracting from comprehension, fallback to W6 trip-hop (~88 bpm) is the safe option.
- Ready for product review.

---

## Row 5 — A1P2 segment-1 sharp

### Row metadata

- Proposed catalog id: `english-a1-practical-2-segment-1-sharp-trophy-song`
- pathId: `english-a1-practical-2`
- segment: 1
- vibe: sharp
- Revised trophy words (L1–L5 sharp): **short**, **note**, **here**, **this**, **any**
- Source lessons: L1 *I don't understand*, L2 *Write it down*, L3 *Show me*, L4 *Which one?*, L5 *Do you have…?*
- Style construction: **S3 — Staccato Piano Groove** (V2 §5)
- styleFamily (proposed): `staccato-piano-groove`
- songStyleLabel (proposed): `Staccato piano groove`

### Eight-axis musical design

| Axis | Choice |
|---|---|
| Tempo | driving, ~110 bpm |
| Groove | staccato piano on every off-beat, tight kit with rim-shots on the downbeats |
| Instrumentation | percussive upright piano, upright bass, tight kit with rim-shots, no other harmonic instrument |
| Production texture | dry-and-close, slightly tape-worn, no reverb wash |
| Vocal posture | crisp, clipped, spoken-sung with tight timing |
| Harmony / melodic feel | minor pentatonic verse melody, clipped V-i resolution on the hook |
| Energy curve | verse tight / chorus tight, no big lift, ending stripped to piano + voice |
| Negative constraints | no jazz-cabaret, no Broadway tap, no boss-mode synth posture, no minimal-techno pulse |

### musicCaption

> Staccato piano groove at ~110 bpm with the piano on every off-beat and tight kit with rim-shots on the downbeats; percussive upright piano, upright bass, no other harmonic instrument; crisp clipped spoken-sung vocal with tight timing; verse tight, chorus tight, ending stripped back to piano and voice; slightly tape-worn dry production with no reverb wash; clear English diction so "short, note, here, this, any" all land cleanly; avoid jazz-cabaret, Broadway tap, boss-mode synth posture, and minimal-techno pulse.

### rawLyricsWithWrappers

```
[Verse 1]
A <<short>> word at the counter
Not too much to ask
Could you write a small <<note>>
And we'll move past

[Pre-Chorus]
Pen down, paper turned
The line is cleaner than the word I heard

[Chorus]
Show me <<here>> on the map
<<This>> one, the second on the left
<<Any>> in stock for the smaller size
And the answer was the best

[Verse 2]
Short and clear, not slow
Note the number on the slip
This one, the third on the printout
And I'm out before the trip

[Bridge]
Pen up, pen down, line again
A small word on a small page
Counter quiet, hand back, gate next
And the night kept its place

[Chorus]
Show me here on the map
This one, the second on the left
Any in stock for the smaller size
And the answer was the best

[Outro]
The note is in my pocket
The map is folded twice
A small bell on the doorway
Out into the night
```

### providerLyrics

```
[Verse 1]
A short word at the counter
Not too much to ask
Could you write a small note
And we'll move past

[Pre-Chorus]
Pen down, paper turned
The line is cleaner than the word I heard

[Chorus]
Show me here on the map
This one, the second on the left
Any in stock for the smaller size
And the answer was the best

[Verse 2]
Short and clear, not slow
Note the number on the slip
This one, the third on the printout
And I'm out before the trip

[Bridge]
Pen up, pen down, line again
A small word on a small page
Counter quiet, hand back, gate next
And the night kept its place

[Chorus]
Show me here on the map
This one, the second on the left
Any in stock for the smaller size
And the answer was the best

[Outro]
The note is in my pocket
The map is folded twice
A small bell on the doorway
Out into the night
```

### displayLyrics

Identical to providerLyrics.

### lyricsTranslationDe

```
[Verse 1]
Ein kurzes Wort am Tresen
Nicht zu viel verlangt
Koenntest du eine kleine Notiz schreiben
Und wir kommen vorbei

[Pre-Chorus]
Stift runter, Papier gedreht
Die Linie ist sauberer als das Wort, das ich hoerte

[Chorus]
Zeig mir hier auf der Karte
Das hier, das zweite von links
Irgendeins in der kleineren Groesse
Und die Antwort war die beste

[Verse 2]
Kurz und klar, nicht langsam
Notiere die Nummer auf dem Zettel
Das hier, das dritte auf dem Ausdruck
Und ich bin draussen vor der Fahrt

[Bridge]
Stift hoch, Stift runter, Linie wieder
Ein kleines Wort auf einer kleinen Seite
Tresen ruhig, Hand zurueck, Tor naechstes
Und die Nacht behielt ihren Platz

[Chorus]
Zeig mir hier auf der Karte
Das hier, das zweite von links
Irgendeins in der kleineren Groesse
Und die Antwort war die beste

[Outro]
Die Notiz ist in meiner Tasche
Die Karte ist zweimal gefaltet
Eine kleine Glocke an der Tuer
Hinaus in die Nacht
```

### Cloze-position rationale

- **short** — wrapped on verse 1 opener `A <<short>> word at the counter`. L1 "I don't understand" reward; "short word" introduces the song's Sharp posture immediately.
- **note** — wrapped on verse 1 line 3 `Could you write a small <<note>>`. L2 "Write it down" reward; the verb→noun construction makes "note" feel like service language, not a glossary.
- **here** — wrapped on chorus opener `Show me <<here>> on the map`. L3 "Show me" reward; first stressed syllable of the hook.
- **this** — wrapped on chorus line 2 `<<This>> one, the second on the left`. L4 "Which one?" reward; first stressed syllable of the line, with a concrete physical reference ("second on the left").
- **any** — wrapped on chorus line 3 `<<Any>> in stock for the smaller size`. L5 "Do you have…?" reward; the most direct A1 availability check, first stressed syllable of the line.

### Review notes

- Why better than V1 A1P2 sharp seg-1: the V1 catalog row uses "Clean synth grid / square bass / clipped hats" and an outro `"Clear. Quick. Certain. Exactly. Decided. Done."` that is the textbook vocabulary-stack outro V2 §2 specifically flags. This V2 row uses staccato piano (no synth at all) and the outro is a closing scene ("note in pocket, map folded, bell on doorway") with zero trophy words.
- Style lane avoided: not synth, not minimal-electro, not boss-mode. Sharp via piano + rim-shots, which is a percussion-rooted Sharp not an electronic Sharp.
- Risks / uncertainty: the chorus has three trophy words on three consecutive lines (here / this / any). This is borderline but each word is embedded in a real micro-sentence with concrete reference (`map`, `the second on the left`, `the smaller size`), not stripped to a noun stack. The V2 framework allows this if the song earns it — Sharp at 110 bpm with staccato piano earns clipped lines.
- Ready for product review.

---

## Row 6 — A1P2 segment-2 sharp

### Row metadata

- Proposed catalog id: `english-a1-practical-2-segment-2-sharp-trophy-song`
- pathId: `english-a1-practical-2`
- segment: 2
- vibe: sharp
- Revised trophy words (L6–L10 sharp): **now**, **two**, **direct**, **yes**, **wait**
- Source lessons: L6 *By card*, L7 *A receipt, please*, L8 *I have a reservation*, L9 *Is this right?*, L10 *One moment*
- Style construction: **S6 — Brass-Hits and Tight Kit** (V2 §5)
- styleFamily (proposed): `brass-hits-tight-kit`
- songStyleLabel (proposed): `Brass-hits and tight kit`

### Eight-axis musical design

| Axis | Choice |
|---|---|
| Tempo | driving, ~116 bpm |
| Groove | syncopated trumpet + alto-sax stabs over a tight pocket |
| Instrumentation | trumpet + alto sax brass pair, upright bass, tight dry kit, single Rhodes accent only on the chorus |
| Production texture | dry, hi-fi, no shine |
| Vocal posture | crisp, decisive, slight smile, tight timing throughout |
| Harmony / melodic feel | major-leaning with sharp V-vi turns, brass spelling the chord stabs |
| Energy curve | chorus marked by brass stabs rather than a melodic lift; outro brass tag with no big crescendo |
| Negative constraints | no Motown pastiche, no big-band cliche, no ska upstroke caricature, no boss-mode synth |

### musicCaption

> Brass-hits and tight kit at ~116 bpm with syncopated trumpet-and-alto-sax stabs over a tight pocket; upright bass, dry kit, single Rhodes accent on the chorus only; crisp decisive vocal with a small smile and tight timing throughout; chorus marked by brass stabs rather than a melodic lift; outro brass tag with no big crescendo; clear English diction so "now, two, direct, yes, wait" all land cleanly; avoid Motown pastiche, big-band cliche, ska upstroke caricature, and boss-mode synth.

### rawLyricsWithWrappers

```
[Verse 1]
Card on the counter, <<now>>, please
Tap and the green light came
Receipt and a bag, <<two>> small things
And the woman knew my name

[Pre-Chorus]
A <<direct>> sentence at the desk
Reservation, ready, set

[Chorus]
Is this the train? — <<Yes>>, this one
<<Wait>> one beat and walk on through
Brass plays out the small confirmation
And the day knows what to do

[Verse 2]
Card cleared, terminal said go
The receipt and the bag were there
A direct sentence at the booking desk
And the host took us up the stair

[Bridge]
A small yes at the desk, the room is held
One short wait while the card clears
The kit hits the brass on a tight pulse
And the room keeps it clear

[Chorus]
Is this the train? — Yes, this one
Wait one beat and walk on through
Brass plays out the small confirmation
And the day knows what to do

[Outro]
Brass closes on the platform
Card back, list back, head up
The pause was small, the day was set
And the room behind kept its breath
```

### providerLyrics

```
[Verse 1]
Card on the counter, now, please
Tap and the green light came
Receipt and a bag, two small things
And the woman knew my name

[Pre-Chorus]
A direct sentence at the desk
Reservation, ready, set

[Chorus]
Is this the train? — Yes, this one
Wait one beat and walk on through
Brass plays out the small confirmation
And the day knows what to do

[Verse 2]
Card cleared, terminal said go
The receipt and the bag were there
A direct sentence at the booking desk
And the host took us up the stair

[Bridge]
A small yes at the desk, the room is held
One short wait while the card clears
The kit hits the brass on a tight pulse
And the room keeps it clear

[Chorus]
Is this the train? — Yes, this one
Wait one beat and walk on through
Brass plays out the small confirmation
And the day knows what to do

[Outro]
Brass closes on the platform
Card back, list back, head up
The pause was small, the day was set
And the room behind kept its breath
```

### displayLyrics

Identical to providerLyrics.

### lyricsTranslationDe

```
[Verse 1]
Karte auf dem Tresen, jetzt bitte
Tippen und das gruene Licht kam
Quittung und eine Tuete, zwei kleine Dinge
Und die Frau kannte meinen Namen

[Pre-Chorus]
Ein direkter Satz am Empfang
Reservierung, bereit, los

[Chorus]
Ist das der Zug? — Ja, dieser hier
Warte einen Schlag und geh durch
Die Blechblaeser spielen die kleine Bestaetigung aus
Und der Tag weiss, was zu tun ist

[Verse 2]
Karte durch, Terminal sagte los
Die Quittung und die Tuete waren da
Ein direkter Satz am Reservierungstisch
Und die Hoestin fuehrte uns die Treppe hinauf

[Bridge]
Ein kleines Ja am Empfang, das Zimmer ist gehalten
Ein kurzes Warten, bis die Karte durch ist
Das Kit trifft die Blechblaeser auf einem festen Puls
Und der Raum haelt es klar

[Chorus]
Ist das der Zug? — Ja, dieser hier
Warte einen Schlag und geh durch
Die Blechblaeser spielen die kleine Bestaetigung aus
Und der Tag weiss, was zu tun ist

[Outro]
Die Blechblaeser schliessen auf dem Bahnsteig
Karte zurueck, Liste zurueck, Kopf hoch
Die Pause war klein, der Tag stand
Und der Raum hinter behielt seinen Atem
```

### Cloze-position rationale

- **now** — wrapped on verse 1 opener `Card on the counter, <<now>>, please`. L6 "By card" reward; "now, please" is a real A1 service-counter phrase.
- **two** — wrapped on verse 1 line 3 `Receipt and a bag, <<two>> small things`. L7 "A receipt, please" reward; "two small things" reads as service counting, not a glossary entry.
- **direct** — wrapped in the pre-chorus `A <<direct>> sentence at the desk`. L8 reservation reward; "direct sentence" reads as a real description, fits Sharp's posture.
- **yes** — wrapped on chorus opener `Is this the train? — <<Yes>>, this one`. L9 "Is this right?" reward; the chorus is built around a Q&A exchange so "yes" is the answer that opens the hook.
- **wait** — wrapped on chorus line 2 `<<Wait>> one beat and walk on through`. L10 "One moment" reward; the wait is named as an action (`one beat`), so it lands as a verb, not a noun-stack.

### Review notes

- Why better than V1 A1P2 sharp seg-2: the V1 catalog row uses "Crisp bass pop, clipped guitar mutes, small synth accent" with chorus `"Keep it direct, keep it clean / Settled in one line / Done means done, and done means done / Right on time"` — `"Done means done"` is the most slogan-shaped chorus line in the catalog and V2 §2 specifically flags it. This V2 row uses brass + tight kit (no synth, no clipped mutes) and the chorus is built around a real Q&A exchange `"Is this the train? — Yes, this one"`.
- Style lane avoided: not synth, not minimal-electro, not crisp-bass-pop. Brass + kit puts Sharp in a fully acoustic-instrument register.
- Risks / uncertainty: brass + sax can be heard as Motown pastiche if the production drifts toward the wrong reference; the caption's negative constraint is explicit and the upright bass + dry kit instruction holds it in the right lane. Candidate listen-through is needed before approval.
- Ready for product review.

---

## Cross-segment trophy-word integrity check

Each of the six rows uses only its own five trophy words inside the `<<wrapped>>` markers. The full set per row (segment 1 then segment 2 per vibe):

| Row | Vibe | Wrapped words (must equal trophy words) |
|---|---|---|
| 1 | bright seg-1 | happy, warm, right, fine, fresh |
| 2 | bright seg-2 | neat, easy, kind, sure, cheerful |
| 3 | wistful seg-1 | kindly, maybe, somewhere, either, anywhere |
| 4 | wistful seg-2 | carefully, near, patient, simple, calm |
| 5 | sharp seg-1 | short, note, here, this, any |
| 6 | sharp seg-2 | now, two, direct, yes, wait |

Cross-row leakage: zero. No row wraps a word that belongs to another (segment, vibe) cell.

Cross-segment same-vibe contamination: zero. Segment 1 and segment 2 within each vibe share no trophy words.

Internal duplication inside a single lyric: zero. Each row has exactly five distinct wrapped tokens. (Each word appears once wrapped; remaining occurrences are unwrapped and optional.)

A1P1 vs A1P2 wrapped-word collision: zero. None of the 30 A1P2 wrapped words match any A1P1 trophy word per the source revision in [GUIDED_TROPHY_WORD_A1P2_SOURCE_REVISION_V1_REPORT.md](GUIDED_TROPHY_WORD_A1P2_SOURCE_REVISION_V1_REPORT.md).

---

## Summary

- Six A1P2 V2 rows drafted as a docs-only review.
- Style rotation: B1 / B8 / W6 / W1 / S3 / S6 (different from the §6 proposal of B6 / B10 / W4 / W2 / S2 / S5 used in the earlier draft at [GUIDED_TROPHY_SONG_A1P2_V2_LYRICS_AND_CAPTIONS.md](GUIDED_TROPHY_SONG_A1P2_V2_LYRICS_AND_CAPTIONS.md)).
- All V2 §6 variety constraints satisfied: Bright non-pop/roots (Row 1), Bright not handclap-pop (Row 1+2), Wistful rhythmic/electronic (Row 3+4), Wistful non-sleepy (Row 4 at 170 bpm), Sharp non-synth (Row 5+6), Sharp not minimal-electro (Row 5+6).
- All technical Trophy Song constraints satisfied: exactly one wrapped occurrence per trophy word per row; `providerLyrics` and `displayLyrics` derived by `stripTrophySongWrappers`; German translation present per row; no `<<` / `>>` will reach the music provider.
- No runtime files modified. No audio generated. `guidedTrophySongs.ts` unchanged. Audio remains blocked pending product-owner review of this doc.
