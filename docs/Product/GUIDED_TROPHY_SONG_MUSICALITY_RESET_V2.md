# Guided Trophy Song — Musicality Reset V2 (Design Only)

Date: 2026-05-15
Author: Claude (design-only reset, no runtime edits)
Repo: d:\CODING\ResonanceTEST\orchestrator
Branch: main
Scope: docs only. No edits to `guidedLessons.ts`, no edits to `guidedTrophySongs.ts`, no audio regeneration, no trophy-word changes, no provider/pipeline/Music-page/backend modifications.

This supersedes the earlier Musical Palette V1.2 / Lyric Direction V1.2 prompt. Trophy-word duplication is being tracked separately in `GUIDED_TROPHY_WORD_SOURCE_DUPLICATION_INVESTIGATION_2026_05_15.md`; any duplication callouts in this report defer to that investigation.

---

## SECTION 1 — Current A1P2 Review Extract

All six A1P2 rows are reproduced below from [frontend/src/data/guidedTrophySongs.ts](../../frontend/src/data/guidedTrophySongs.ts), unsummarized. Lyrics shown are the raw author-written form (`rawLyricsWithWrappers`) — `providerLyrics` and `displayLyrics` are derived by stripping the `<<` / `>>` markers via `stripTrophySongWrappers` at [guidedTrophySongs.ts:1109](../../frontend/src/data/guidedTrophySongs.ts#L1109).

---

### 1.1 `english-a1-practical-2-segment-1-bright-trophy-song`

- pathId: `english-a1-practical-2`
- segment: 1
- vibe: bright
- trophyWords: `lovely`, `glad`, `brilliant`, `ready`, `charming`
- styleFamily: `sunlit-acoustic-pop`
- songStyleLabel: `Sunlit acoustic pop`
- audioPublicUrl: `/guided/trophy-songs/a1p2/english-a1-practical-2-segment-1-bright-trophy-song/candidate-a.mp3`
- audioCandidates.A.providerUrl: `https://tempfile.aiquickdraw.com/r/953eaa629e914c3ca7eb0b94fca9b1ca.mp3`
- audioCandidates.B.providerUrl: `https://tempfile.aiquickdraw.com/r/1519352f29cb424a9bcbea91db912c4b.mp3`
- activeCandidateDefault: A
- audioStatus: ready
- source: [guidedTrophySongs.ts:568-659](../../frontend/src/data/guidedTrophySongs.ts#L568-L659)

**musicCaption (full):**
> Sunlit acoustic pop with a Bright, confident, encouraging voice; mid-tempo around 104 bpm, singable and warm but not childish; bright lead vocal with light harmony on the hook, clean consonants, no melisma; acoustic guitar, soft piano taps, brushed kit, handclap lift, warm bass; clear English diction so "lovely, glad, brilliant, ready, charming" all land cleanly; avoid nursery-rhyme bounce, avoid generic commercial jingle, avoid over-polished EDM-pop.

**rawLyricsWithWrappers (full):**
```
[Verse 1]
I missed the meaning in the room
You wrote it on the page
That was <<lovely>>, thank you
Like a lamp beside the phrase

[Pre-Chorus]
You pointed once, I found the line
And the answer turned around

[Chorus]
I'm <<glad>> you wrote it down
Glad the words came shining through
<<Brilliant>> little note in a busy town
I'm <<ready>> now with you

[Verse 2]
Which one? I asked you at the counter
You smiled and made it clear
A <<charming>> little choice was waiting
Right there, right here

[Chorus]
I'm glad you wrote it down
Glad the words came shining through
Brilliant little note in a busy town
I'm ready now with you

[Bridge]
Lovely on the paper
Charming in the light
Ready for the next small question
Ready for the ride

[Outro]
Glad, glad, glad it came through
Brilliant, ready, thanks to you
```

**lyricsTranslationDe (full):**
```
[Verse 1]
Ich habe die Bedeutung im Raum verpasst
Du hast sie auf die Seite geschrieben
Das war nett, danke
Wie eine Lampe neben dem Satz

[Pre-Chorus]
Du hast einmal gezeigt, ich fand die Zeile
Und die Antwort drehte sich um

[Chorus]
Ich bin froh, dass du es aufgeschrieben hast
Froh, dass die Worte durchgeleuchtet haben
Eine prima kleine Notiz in einer vollen Stadt
Ich bin jetzt bereit mit dir

[Verse 2]
Welche? fragte ich dich am Tresen
Du hast gelaechelt und es klar gemacht
Eine charmante kleine Wahl wartete
Genau dort, genau hier

[Chorus]
Ich bin froh, dass du es aufgeschrieben hast
Froh, dass die Worte durchgeleuchtet haben
Eine prima kleine Notiz in einer vollen Stadt
Ich bin jetzt bereit mit dir

[Bridge]
Nett auf dem Papier
Charmant im Licht
Bereit fuer die naechste kleine Frage
Bereit fuer die Fahrt

[Outro]
Froh, froh, froh, dass es angekommen ist
Prima, bereit, dank dir
```

**Product issue notes:**
- Word source issue — handled by separate trophy-word investigation.
- Style: lands inside the "shiny encouraging acoustic-pop" lane. With "soft piano taps, brushed kit, handclap lift" the row is hard to distinguish from segment-1 bright in A1P1 (acoustic-warm) at a listening pass. Bright vibe is being mapped to a single emotional register: smiling, slightly twee, mid-tempo, major-key.
- Lyric: "I'm glad you wrote it down / Glad the words came shining through" is functional but reads more "vocabulary chorus" than song. The Outro `"Glad, glad, glad it came through / Brilliant, ready, thanks to you"` is the most worksheet-shaped line in the song.

---

### 1.2 `english-a1-practical-2-segment-2-bright-trophy-song`

- pathId: `english-a1-practical-2`
- segment: 2
- vibe: bright
- trophyWords: `easy`, `splendid`, `kind`, `sure`, `cheerful`
- styleFamily: `bright-handclap-pop`
- songStyleLabel: `Bright handclap pop`
- audioPublicUrl: `/guided/trophy-songs/a1p2/english-a1-practical-2-segment-2-bright-trophy-song/candidate-a.mp3`
- audioCandidates.A.providerUrl: `https://tempfile.aiquickdraw.com/r/695d1a4117664fdd9708a8a9e1e7fe5f.mp3`
- audioCandidates.B.providerUrl: `https://tempfile.aiquickdraw.com/r/6cb4542279614172ac8234f00177423e.mp3`
- activeCandidateDefault: A
- audioStatus: ready
- source: [guidedTrophySongs.ts:660-751](../../frontend/src/data/guidedTrophySongs.ts#L660-L751)

**musicCaption (full):**
> Bright handclap pop at ~112 bpm with a warm, confident reward feel; Bright voice — encouraging, socially generous, clear, never childish; crisp lead vocal with a small group lift on the hook, no melisma; muted guitar, handclaps, light piano, rounded bass, clean pop kit; clear English diction so "easy, splendid, kind, sure, cheerful" all land cleanly; avoid kids-song cadence, avoid stadium chant, avoid glossy top-40 excess.

**rawLyricsWithWrappers (full):**
```
[Verse 1]
Card on the counter, answer in the light
That was <<easy>>, thank you
Nothing got too heavy
The small machine went through

[Pre-Chorus]
A receipt near the door
One more smile before I go

[Chorus]
What a <<splendid>> little finish
<<Kind>> of you to see me through
I'm <<sure>> of where I'm going
<<Cheerful>> in the queue

[Verse 2]
Reservation under my name
You found it right away
Sure, sure, the room is waiting
And cheerful is the day

[Chorus]
What a splendid little finish
Kind of you to see me through
I'm sure of where I'm going
Cheerful in the queue

[Bridge]
Easy at the payment
Kind at the door
Splendid in the small things
I can ask for more
```

(plus repeated chorus / outro)

**lyricsTranslationDe (full):**
```
[Verse 1]
Karte auf dem Tresen, Antwort im Licht
Das war einfach, danke
Nichts wurde zu schwer
Das kleine Geraet ging durch

[Pre-Chorus]
Eine Quittung nahe der Tuer
Noch ein Laecheln, bevor ich gehe

[Chorus]
Was fuer ein prima kleiner Abschluss
Freundlich von dir, mich durchzubringen
Ich bin sicher, wohin ich gehe
Heiter in der Schlange

[Verse 2]
Reservierung unter meinem Namen
Du hast sie sofort gefunden
Sicher, sicher, das Zimmer wartet
Und heiter ist der Tag

[Chorus]
Was fuer ein prima kleiner Abschluss
Freundlich von dir, mich durchzubringen
Ich bin sicher, wohin ich gehe
Heiter in der Schlange

[Bridge]
Einfach beim Bezahlen
Freundlich an der Tuer
Prima in den kleinen Dingen
Ich kann nach mehr fragen

[Outro]
Heiter, sicher, einfach
Prima, freundlich und frei
```

**Product issue notes:**
- Word source issue — handled by separate trophy-word investigation.
- Style: another mid-tempo handclap pop. Segment-1 bright and segment-2 bright sound like the same song with a key change. Bright vibe needs intra-path style contrast.
- Lyric: scene is okay (payment → checkout → reservation), but the outro `"Heiter, sicher, einfach / Prima, freundlich und frei"` again reads as vocabulary-list bridge. "Cheerful in the queue" is borderline twee.

---

### 1.3 `english-a1-practical-2-segment-1-wistful-trophy-song`

- pathId: `english-a1-practical-2`
- segment: 1
- vibe: wistful
- trophyWords: `gently`, `slowly`, `perhaps`, `quiet`, `soft`
- styleFamily: `moonlit-indie-folk`
- songStyleLabel: `Moonlit indie folk`
- audioPublicUrl: `/guided/trophy-songs/a1p2/english-a1-practical-2-segment-1-wistful-trophy-song/candidate-a.mp3`
- audioCandidates.A.providerUrl: `https://tempfile.aiquickdraw.com/r/a952897ee2144ea5b2e83a8bd5bc3344.mp3`
- audioCandidates.B.providerUrl: `https://tempfile.aiquickdraw.com/r/155b70628ffe463ca5970753dd72312f.mp3`
- activeCandidateDefault: A
- audioStatus: ready
- source: [guidedTrophySongs.ts:752-835](../../frontend/src/data/guidedTrophySongs.ts#L752-L835)

**musicCaption (full):**
> Moonlit indie folk at ~78 bpm, soft and reflective without melodrama; Wistful voice — spacious, careful, intimate but not whispered; clear vocal with breath around phrase endings, no ASMR, no heavy vibrato; fingerpicked guitar, muted felt piano, brushed cymbals, low warm bass, faint pad; clear English diction so "gently, slowly, perhaps, quiet, soft" all land cleanly; avoid piano-ballad cliche, avoid sad-girl-pop shape, avoid sleepy monotone.

**rawLyricsWithWrappers (full):**
```
[Verse 1]
Say it <<gently>>, I am near
The room is full of half-heard sound
If you write it <<slowly>>
I can follow what I found

[Chorus]
<<Perhaps>> here, perhaps this way
A <<quiet>> mark beside the line
Keep it <<soft>>, keep it close
Soft enough for me to try

[Verse 2]
You pointed to the smaller sign
And waited while I knew
Slowly, gently, there it was
A door I could walk through

[Chorus]
Perhaps here, perhaps this way
A quiet mark beside the line
Keep it soft, keep it close
Soft enough for me to try

[Bridge]
No hurry in the answer
No shame inside the pause
Just a softly open window
And a line that almost talks

[Outro]
Soft enough, quiet enough
Perhaps I know it now
```

**lyricsTranslationDe (full):** (German translation included in source — see [guidedTrophySongs.ts:802-834](../../frontend/src/data/guidedTrophySongs.ts#L802-L834))

**Product issue notes:**
- Word source issue — handled by separate trophy-word investigation.
- Style: textbook "wistful = soft folk" mapping. Fingerpicked guitar + felt piano + brushed kit + faint pad is the third "soft-acoustic-with-pad" caption in two paths. Wistful vibe is being treated as a genre.
- Lyric: actually one of the better-shaped lyrics — has a real small scene (asking for the sign, pointing, finding the door). "A line that almost talks" is the strongest line in the catalog. But the framing of "soft / quiet / gently / slowly" still leans on the genre cliché. The bones are okay; the genre default kills the result.

---

### 1.4 `english-a1-practical-2-segment-2-wistful-trophy-song`

- pathId: `english-a1-practical-2`
- segment: 2
- vibe: wistful
- trophyWords: `again`, `near`, `calm`, `simple`, `patient`
- styleFamily: `soft-downtempo-folk`
- songStyleLabel: `Soft downtempo folk`
- audioPublicUrl: `/guided/trophy-songs/a1p2/english-a1-practical-2-segment-2-wistful-trophy-song/candidate-a.mp3`
- audioCandidates.A.providerUrl: `https://tempfile.aiquickdraw.com/r/81b07c63ac4341aba2ddbd6b7a0fbce1.mp3`
- audioCandidates.B.providerUrl: `https://tempfile.aiquickdraw.com/r/ed35e1d9dbab4612848d4ca19856fb24.mp3`
- activeCandidateDefault: A
- audioStatus: ready
- source: [guidedTrophySongs.ts:836-919](../../frontend/src/data/guidedTrophySongs.ts#L836-L919)

**musicCaption (full):**
> Soft downtempo folk at ~84 bpm with a gentle pulse and reflective space; Wistful voice — calm, patient, warm but restrained; close vocal with clean diction and soft phrase endings, no melodrama; nylon guitar, low brushed beat, small electric piano motif, airy pad, rounded bass; clear English diction so "again, near, calm, simple, patient" all land cleanly; avoid lo-fi haze, avoid piano-ballad weight, avoid overly poetic obscurity.

**rawLyricsWithWrappers (full):**
```
[Verse 1]
Say it <<again>> at the counter
The card light turns to green
The receipt is somewhere <<near>>
By the door, half-seen

[Chorus]
Stay <<calm>>, stay close
Keep it <<simple>>, one more line
<<Patient>> as the room slows down
Patient with the time

[Verse 2]
My name is on the paper
You found it in the glow
Near enough to touch it
Simple enough to know

[Chorus]
Stay calm, stay close
Keep it simple, one more line
Patient as the room slows down
Patient with the time

[Bridge]
Again, I ask it softly
Again, you make it plain
Near the quiet doorway
I can start again

[Outro]
Calm, simple, patient
Near the light again
```

**lyricsTranslationDe (full):** (German translation included in source — see [guidedTrophySongs.ts:886-918](../../frontend/src/data/guidedTrophySongs.ts#L886-L918))

**Product issue notes:**
- Word source issue — handled by separate trophy-word investigation.
- Style: same musical lane as 1.3 — nylon vs fingerpicked guitar plus electric piano motif. Two consecutive segments of "soft folk with a felt-piano motif." This is exactly the wistful-as-genre trap.
- Lyric: outro `"Calm, simple, patient / Near the light again"` is another vocabulary-stack ending.

---

### 1.5 `english-a1-practical-2-segment-1-sharp-trophy-song`

- pathId: `english-a1-practical-2`
- segment: 1
- vibe: sharp
- trophyWords: `clear`, `quick`, `exactly`, `decided`, `certain`
- styleFamily: `clean-synth-grid`
- songStyleLabel: `Clean synth grid`
- audioPublicUrl: `/guided/trophy-songs/a1p2/english-a1-practical-2-segment-1-sharp-trophy-song/candidate-a.mp3`
- audioCandidates.A.providerUrl: `https://tempfile.aiquickdraw.com/r/d77dedd0971441cf8277c158860c7703.mp3`
- audioCandidates.B.providerUrl: `https://tempfile.aiquickdraw.com/r/c027f0663ce94e05ad98a97964d6967b.mp3`
- activeCandidateDefault: A
- audioStatus: ready
- source: [guidedTrophySongs.ts:920-1003](../../frontend/src/data/guidedTrophySongs.ts#L920-L1003)

**musicCaption (full):**
> Clean synth grid at ~108 bpm, crisp and precise with a compact reward hook; Sharp voice — direct, controlled, high-contrast, never rude or robotic; dry lead vocal with tight timing, no vocoder, no ornamentation; short synth pluck motif, clipped hats, low square bass, minimal kick, no pads washing over diction; clear English diction so "clear, quick, exactly, decided, certain" all land cleanly; avoid industrial darkness, avoid trap posture, avoid boss-mode cliche.

**rawLyricsWithWrappers (full):**
```
[Verse 1]
Make it <<clear>> on the page
One clean line, no drift
Keep it <<quick>>, I can use it
Show me where it fits

[Chorus]
<<Exactly>> there, no second guess
<<Decided>> now, this one
<<Certain>> in the little steps
Certain when it's done

[Verse 2]
Counter. Choice. Short answer.
The sign is in my sight
Clear enough to move me
Quick enough for right

[Chorus]
Exactly there, no second guess
Decided now, this one
Certain in the little steps
Certain when it's done

[Bridge]
No extra words around it
No fog inside the sound
Exactly means I found it
Decided means I found

[Outro]
Clear. Quick. Certain.
Exactly. Decided. Done.
```

**lyricsTranslationDe (full):** (German translation included in source — see [guidedTrophySongs.ts:970-1002](../../frontend/src/data/guidedTrophySongs.ts#L970-L1002))

**Product issue notes:**
- Word source issue — handled by separate trophy-word investigation.
- Style: "Clean synth grid / square bass / clipped hats." This is exactly the synth-precision cliché the product owner flagged. A1P1 segment-1 sharp is also `minimal-synth-pulse`. Sharp vibe is being mapped to electronic-precision-pop in both paths.
- Lyric: the Outro `"Clear. Quick. Certain. Exactly. Decided. Done."` is the worst case of vocabulary-stack-as-chorus in the whole catalog. The Bridge `"Exactly means I found it / Decided means I found"` is also definitional rather than musical. Sharp can be confident without being a glossary.

---

### 1.6 `english-a1-practical-2-segment-2-sharp-trophy-song`

- pathId: `english-a1-practical-2`
- segment: 2
- vibe: sharp
- trophyWords: `straight`, `focused`, `direct`, `settled`, `done`
- styleFamily: `crisp-bass-pop`
- songStyleLabel: `Crisp bass pop`
- audioPublicUrl: `/guided/trophy-songs/a1p2/english-a1-practical-2-segment-2-sharp-trophy-song/candidate-a.mp3`
- audioCandidates.A.providerUrl: `https://tempfile.aiquickdraw.com/r/e37d71cdd3834d00bff9833d7a267646.mp3`
- audioCandidates.B.providerUrl: `https://tempfile.aiquickdraw.com/r/eae1db88a8a149c087001afd9cd0fe79.mp3`
- activeCandidateDefault: A
- audioStatus: ready
- source: [guidedTrophySongs.ts:1004-1087](../../frontend/src/data/guidedTrophySongs.ts#L1004-L1087)

**musicCaption (full):**
> Crisp bass pop at ~114 bpm, compact and precise with a dry rhythmic hook; Sharp voice — direct, settled, focused, warm enough for service moments but never soft-edged; tight vocal timing, no vocoder, no melisma; punchy bass, clipped guitar mutes, clean kit, small synth accent, sparse harmony only on the hook; clear English diction so "straight, focused, direct, settled, done" all land cleanly; avoid aggressive hip-hop posture, avoid cold techno, avoid motivational slogan energy.

**rawLyricsWithWrappers (full):**
```
[Verse 1]
Card first, <<straight>> to payment
Receipt set by the door
Eyes <<focused>> on the counter
No need to ask for more

[Chorus]
Keep it <<direct>>, keep it clean
<<Settled>> in one line
<<Done>> means done, and done means done
Right on time

[Verse 2]
Reservation. Name checked.
The answer lands in place
Direct little sentence
Settled on my face

[Chorus]
Keep it direct, keep it clean
Settled in one line
Done means done, and done means done
Right on time

[Bridge]
Straight is the road out
Focused is the view
Done is the small door closing
Cleanly after you
```

(plus repeated chorus / outro `Direct. Settled. Done. / Direct. Settled. Done.`)

**lyricsTranslationDe (full):** (German translation included in source — see [guidedTrophySongs.ts:1054-1086](../../frontend/src/data/guidedTrophySongs.ts#L1054-L1086))

**Product issue notes:**
- Word source issue — handled by separate trophy-word investigation.
- Style: "Crisp bass pop, clipped guitar mutes, small synth accent." Slightly less electronic than 1.5 (some guitar mutes), but still in the precision-pop lane. Both sharp rows in A1P2 are minor variants of the same brief.
- Lyric: `"Done means done, and done means done / Right on time"` is the most slogan-like chorus line in the catalog (the caption itself flags this with "avoid motivational slogan energy" — the lyric ignores its own caption). The Outro `"Direct. Settled. Done."` repeated twice is the textbook-stack failure mode again.

---

## SECTION 2 — Why the Current Music System Failed

The catalog passes its technical tests because the technical tests check shape, not music. `test-guided-trophy-songs.ts` ([test-guided-trophy-songs.ts](../../frontend/scripts/test-guided-trophy-songs.ts)) asserts row counts, trophy-word array length, wrapped-word count, asset presence, candidate selection, and German-translation presence — nothing about musical variety. So a row can be technically green and still fail product review on first listen.

The product issues that the test grid cannot see:

**Style families are too repetitive across the catalog as a whole.** Twelve rows ship six style families (`acoustic-warm`, `bright-synth-pop`, `ambient-folk`, `electronic-downtempo`, `minimal-synth-pulse`, `crisp-percussive-pop` for A1P1; `sunlit-acoustic-pop`, `bright-handclap-pop`, `moonlit-indie-folk`, `soft-downtempo-folk`, `clean-synth-grid`, `crisp-bass-pop` for A1P2). The labels look varied, but parsed by axis, they collapse into three concept clusters:
- Bright = "warm acoustic-pop with handclaps and a small lift" (4 of 4 rows)
- Wistful = "soft folk/downtempo with felt piano and an airy pad" (4 of 4 rows)
- Sharp = "minimal synth-pulse or crisp-bass-pop with clipped hats" (4 of 4 rows)

**Vibe is being treated like genre.** The mapping at the row level is one-to-one: Bright→acoustic-pop, Wistful→folk/downtempo, Sharp→synth/precision-pop. There is no Wistful drum-and-bass row, no Sharp acoustic row, no Bright disco/funk/garage row, no anything that breaks the genre fence. The genre fence is the actual content problem.

**Bright is over-associated with shiny pop.** Both A1P2 bright rows ship "handclap lift" or "handclap pop" in the caption. The brief calls this "annoying / cringy bright pop" and the evidence is in the captions: `"avoid kids-song cadence, avoid stadium chant, avoid glossy top-40 excess"` (1.2) reads as the author trying to escape an attractor they wrote themselves into.

**Sharp is over-associated with synth/electro.** Both A1P2 sharp rows are minor variants of `minimal-synth-pulse`. Caption 1.6 admits this with `"avoid cold techno, avoid motivational slogan energy"` and then writes a chorus line `"Done means done, and done means done / Right on time"` that is exactly motivational-slogan energy. Sharp's signature ("precise / clipped / focused") was conflated with a single sonic palette (square bass, clipped hats, dry vocal grid).

**Wistful is over-associated with slow folk/ballad/ambient.** Both A1P2 wistful rows have nylon-or-fingerpicked guitar + felt piano + airy pad + ~80 bpm. The brief explicitly calls this out: "the current framing makes it too sleepy / folk / ballad / ambient". The author's own captions try to negate this with `"avoid piano-ballad cliche, avoid sad-girl-pop shape, avoid sleepy monotone"` — captions describe what to avoid because the foundational palette already sits inside that attractor.

**A/B candidates cannot fix a bad style concept.** Candidate A and Candidate B were generated against the same `musicCaption`. They differ in performance (delivery, timing, vocal nuance) but not in compositional concept. If the concept is "smiling mid-tempo handclap-pop", both candidates will be smiling mid-tempo handclap-pop. A/B is a performance choice, not a style choice. The current process treats A/B as the place to fix style variance — that is the wrong tool.

**Music captions need richer compositional direction before generation.** The captions are roughly five clauses (tempo, voice, instrumentation, diction, negative constraints). That works as a baseline brief but it doesn't express:
- groove / rhythmic density
- harmonic palette (modal? minor? suspended? unresolved?)
- energy curve (steady? builds? drops?)
- melodic contour (chant? rising? circular?)
- specific stylistic references (without locking in a single genre)

So the provider has to fill those in, and the provider's fill defaults are exactly the clichés the brief was trying to avoid.

**Full lyrics and music captions must be reviewed before audio generation.** The current workflow ran lyrics + captions + audio in one bundle. Listening review found the lyrics carry the vocabulary-stack texture even on the page — there is no review checkpoint where lyrics can be rejected without burning audio credits.

---

## SECTION 3 — Musical Design Framework V2

Each Trophy Song's `musicCaption` should be composed across eight axes. Genre is only ever a shorthand label *after* the axes are picked; it is never the starting axis.

### Axis 1 — Tempo
Range, not a single number. Pick one band; the provider can settle inside it.
- still / suspended (no clear pulse, or below 60 bpm)
- slow pulse (60–80 bpm)
- mid-tempo walk (80–104 bpm)
- driving (104–120 bpm)
- fast but controlled (120–140 bpm)
- fast and restless (140–180 bpm)

### Axis 2 — Groove / Rhythm
The rhythmic personality. This is where most of the "vibe ≠ genre" work happens.
- straight rock pulse
- swung groove
- half-time
- breakbeat
- drum and bass
- jungle-lite
- motorik
- four-on-the-floor
- shuffle
- hand percussion
- no drums / implied pulse
- chopped percussion
- staccato piano / percussive piano
- marching / drumline
- syncopated funk
- sparse dub pulse

### Axis 3 — Instrumentation
A specific small palette of 3–5 instruments. Do not list "and other instruments" — that is how providers fill with defaults.
- electric guitar / surf guitar / acoustic guitar / nylon guitar
- piano / Rhodes / Wurlitzer / felt piano
- synth bass / upright bass / live bass guitar
- strings / brass / woodwinds / mallets
- drum kit / electronic drums / breakbeats / handclaps
- field recordings / choir / gang vocals
- vocoder or processed backing vocals (only when intentional)
- analog synths / modular textures
- organ / harmonica
- banjo — only if actually wanted, not as default folk

### Axis 4 — Production Texture
The "how does it sound recorded" axis.
- dry and close
- tape-worn
- glossy
- gritty
- lo-fi but not muddy
- spacious
- club-like
- cinematic
- raw rehearsal room
- radio-friendly
- distorted edge
- underwater / blurred
- cold digital
- warm analog
- dusty vinyl
- hi-fi acoustic
- industrial
- dreamlike but rhythmic

### Axis 5 — Vocal Posture
The performance attitude of the voice. This is where vibe lives most directly.
- intimate / detached / smiling / whispered (used sparingly)
- spoken-sung / chant-like / conversational
- road-song vocal
- crisp and clipped
- soft but rhythmic
- airy but awake
- urgent / restrained
- duet / group response

### Axis 6 — Harmony / Melodic Feel
- major and open
- minor but moving
- modal (dorian, mixolydian, lydian shorthand allowed)
- bluesy
- suspended
- unresolved
- chromatic
- circular
- two-chord hypnotic
- rising chorus
- narrow melody
- chant hook
- call-response
- melodic lift only in chorus

### Axis 7 — Energy Curve
- steady
- builds slowly
- starts intimate, opens wide
- drops into groove
- chorus lift
- no chorus lift (hypnotic repetition)
- sudden rhythmic break
- verse tight / chorus loose
- ending stripped down

### Axis 8 — Negative Constraints
At least one per row. The current catalog uses these well; V2 keeps them but expands the vocabulary.
- no children's-show pop
- no fake corporate optimism
- no generic EDM drop
- no sleepy coffeehouse default
- no stock folk ballad
- no overproduced worship-pop lift
- no boss-battle synth clichés
- no trap cliché
- no ukulele unless explicitly chosen
- no "AI pop" gloss
- no melodramatic trailer strings
- no generic lo-fi study beat unless deliberately chosen

A V2 `musicCaption` is one paragraph that touches every axis. Genre tag is optional shorthand at the end.

---

## SECTION 4 — Vibe as Performance Attitude

The three active vibes are emotional / performance attitudes. They are not musical genres. Re-defining them this way is the central correction.

### Bright — "warm, lucid, forward"
- emotionally open
- the voice is socially generous, awake, present
- can be rock (CCR-roots warmth), surf (Beach-Boys-bright lift), funk, disco-lite, samba/bossa, city pop, garage pop, acoustic road song, power pop, electronic-but-warm
- Bright does NOT have to be cute or shiny
- specifically avoid: cringy motivational pop, kids'-show cadence, top-40 gloss
- "Bright" lives in the *voice*, not the production gloss. A dusty roots-rock track with a smiling vocal is Bright. A glossy EDM-pop track with a slick vocal is not — that's Glossy, not Bright.

### Wistful — "reflective, longing, memory-colored, suspended, bittersweet, distant, searching"
- the voice carries the emotion, not the tempo
- can be drum-and-bass (rainy, urgent, distant), dub techno, coldwave, jungle-lite, breakbeat (rainy hallway), shoegaze, motorik dusk-ride, trip-hop, trance-like distant lift, chamber-electronic hybrid, post-rock, ambient-with-pulse, acoustic
- Wistful does NOT have to be slow
- Wistful does NOT have to be folk
- Wistful does NOT have to be sleepy
- specifically avoid: "sad ballad by default", sad-girl-pop chorus shape, generic lo-fi study beat
- A wistful drum-and-bass track is exactly the right correction for the current catalog.

### Sharp — "precise, focused, clean, decisive, clipped, alert"
- the voice is direct, controlled, high-contrast
- can be acoustic (Spanish-guitar staccato), percussive (drumline + brass), rock (Strokes-shape angular guitar pop), jazz/funk (Vulfpeck-shape tight bass), techno, post-punk, piano-driven, brass-led
- Sharp does NOT have to be synth
- Sharp does NOT have to be robotic
- specifically avoid: overusing minimal electro pulse, boss-battle synth, trap posture
- A Sharp acoustic-percussion track or a Sharp piano-driven track is exactly the right correction for the current catalog.

---

## SECTION 5 — Example Style Constructions (36)

Each construction is a starting brief, not a finished caption. The next stage (lyric+caption authoring) should blend the construction with the row's trophy-words / scene, not just paste it in.

### Bright (12)

**B1. California Sofa-Rock Sunrise**
- vibe: bright
- tempo: mid-tempo walk (~96 bpm)
- groove: half-time straight rock pulse with hand percussion
- instrumentation: warm electric guitar lead, acoustic guitar comp, upright bass, brushed kit, faint organ
- production: tape-worn, dry-and-close vocals, no reverb wash
- vocal posture: road-song vocal, smiling but not grinning
- energy curve: steady with a small chorus lift
- negative: no glossy top-40, no kids-show bounce, no ukulele
- sample caption: *Tape-worn California sofa-rock at ~96 bpm with a half-time pulse; warm electric guitar lead over acoustic comp, upright bass, brushed kit, faint organ on the hook; smiling road-song vocal close to the mic, no reverb wash; small chorus lift only on the trophy-word line; avoid top-40 gloss, kids-show bounce, ukulele.*

**B2. Garage-Pop Handshake**
- vibe: bright
- tempo: driving (~118 bpm)
- groove: straight rock pulse with handclaps in the chorus only
- instrumentation: jangly electric guitar, simple bass, tight drum kit, occasional tambourine
- production: lo-fi but not muddy
- vocal posture: conversational, slightly excited
- energy curve: verse tight / chorus loose
- negative: no stadium chant, no AI pop gloss
- sample caption: *Lo-fi garage-pop handshake at ~118 bpm; jangly electric guitar, simple bass, tight kit, chorus-only handclaps and tambourine; conversational vocal with a little excitement; verses tight, chorus opens up; avoid stadium chant and AI pop gloss.*

**B3. Disco-Lite Daylight (not nightclub)**
- vibe: bright
- tempo: driving (~110 bpm)
- groove: four-on-the-floor with syncopated bass
- instrumentation: muted disco guitar, plucky bass, light strings on the hook, hi-hat
- production: warm analog, daytime not nightclub
- vocal posture: smiling, breathy on the hook
- energy curve: steady groove, no drop
- negative: no nightclub posture, no EDM drop
- sample caption: *Daylight disco-lite at ~110 bpm, four-on-the-floor with syncopated plucky bass; muted disco guitar, warm hi-hat, soft strings appearing on the hook; smiling vocal with a breathy hook tail; warm analog production, no nightclub gloss, no EDM drop.*

**B4. Surf-Guitar Sunrise**
- vibe: bright
- tempo: mid-tempo walk (~100 bpm)
- groove: shuffle with reverb-tank surf-guitar lead
- instrumentation: spring-reverb electric guitar, walking bass, brushed snare, vibraphone accents
- production: warm analog, vintage spring reverb
- vocal posture: airy but awake
- energy curve: builds slowly into the second chorus
- negative: no kids-song cadence, no twee whistling
- sample caption: *Warm surf-guitar sunrise at ~100 bpm with a soft shuffle; spring-reverb lead guitar, walking upright bass, brushed snare, vibraphone accents on the hook; airy-but-awake vocal that opens into the second chorus; avoid kids-song cadence and twee whistling.*

**B5. Acoustic Road Song**
- vibe: bright
- tempo: mid-tempo walk (~92 bpm)
- groove: shuffle, hand percussion only
- instrumentation: two acoustic guitars (one rhythm, one fingerpicked lead), tambourine, harmonica accents
- production: hi-fi acoustic, no kit
- vocal posture: smiling and direct, single-take feel
- energy curve: steady
- negative: no stock folk ballad, no coffeehouse jingle
- sample caption: *Hi-fi acoustic road song at ~92 bpm with a soft shuffle and hand percussion only; two acoustic guitars (rhythm + fingerpicked lead), tambourine, harmonica accents; smiling single-take vocal; steady energy across the song; avoid stock folk ballad shape and coffeehouse-jingle vibe.*

**B6. Soft Funk Open Window**
- vibe: bright
- tempo: driving (~108 bpm)
- groove: syncopated funk groove, mid-pocket
- instrumentation: clean electric guitar with light chicken-pick, live bass guitar, Rhodes pads, tight drum kit
- production: dry and close, no shine
- vocal posture: spoken-sung at the edge of the pocket
- energy curve: verse tight / chorus loose
- negative: no fake corporate optimism, no boss-mode posture
- sample caption: *Soft funk open-window groove at ~108 bpm with a mid-pocket syncopation; clean chicken-pick guitar, live bass, Rhodes pad, tight kit; spoken-sung vocal that sits just behind the beat; verse tight, chorus loosens up; avoid corporate optimism and boss-mode posture.*

**B7. City-Pop Shimmer**
- vibe: bright
- tempo: driving (~112 bpm)
- groove: half-time backbeat with bright synth bass
- instrumentation: chorused electric guitar, FM-synth lead motif, slap bass, gated reverb snare
- production: glossy but vintage (1986 city-pop)
- vocal posture: smiling, confident, slightly stylized
- energy curve: chorus lift only on the hook
- negative: no generic top-40, no AI pop gloss
- sample caption: *Vintage city-pop shimmer at ~112 bpm with a half-time backbeat; chorused electric guitar, FM-synth lead motif, slap bass, gated reverb snare; smiling slightly-stylized vocal; chorus lift only on the hook; avoid generic top-40 and AI pop gloss.*

**B8. Brass-and-Guitar Daylight**
- vibe: bright
- tempo: mid-tempo walk (~98 bpm)
- groove: straight rock pulse, brass stabs on 2 and 4
- instrumentation: rhythm electric guitar, two-piece brass (trumpet + tenor sax), upright bass, dry kit
- production: warm analog, dry vocals
- vocal posture: conversational, slightly playful
- energy curve: builds across the song into a final brass-led outro
- negative: no big-band cliche, no Hollywood ending
- sample caption: *Warm-analog brass-and-guitar daylight at ~98 bpm; rhythm electric guitar, trumpet-and-sax stabs on 2-and-4, upright bass, dry kit; conversational playful vocal that grows into a brass-led outro; avoid big-band cliche and Hollywood ending.*

**B9. Power-Pop Quick Yes**
- vibe: bright
- tempo: fast-but-controlled (~134 bpm)
- groove: straight rock pulse
- instrumentation: two electric guitars (one open, one muted), bass, kit with crash on the hook
- production: radio-friendly but not over-compressed
- vocal posture: smiling and urgent, short phrases
- energy curve: steady throughout, no drop
- negative: no stadium chant, no pop-punk whine
- sample caption: *Radio-friendly power-pop quick-yes at ~134 bpm with a straight rock pulse; one open and one muted electric guitar, bass, kit with hook crashes; smiling urgent vocal with short phrases; steady energy throughout; avoid stadium chant and pop-punk whine.*

**B10. Highlife Walk**
- vibe: bright
- tempo: mid-tempo walk (~100 bpm)
- groove: highlife guitar pattern, percussion-led
- instrumentation: two interlocking electric guitars (highlife-style), bass guitar, conga, hi-hat
- production: warm analog, lifted top end
- vocal posture: spoken-sung with a small chorus response
- energy curve: steady, hypnotic
- negative: no caricature, no children's-song bounce
- sample caption: *Warm-analog highlife walk at ~100 bpm with two interlocking electric guitars, bass, conga, and hi-hat; spoken-sung lead with a small chorus response on the hook; steady hypnotic energy; avoid caricature and children's-song bounce.*

**B11. Bossa-Lite Lunchroom**
- vibe: bright
- tempo: slow pulse (~78 bpm)
- groove: bossa-nova hand pulse, brushes, no kick
- instrumentation: nylon guitar, soft brushes on snare, light shaker, soft upright bass, single flugelhorn accent
- production: hi-fi acoustic
- vocal posture: intimate but smiling
- energy curve: still — no chorus lift
- negative: no elevator-music vibe, no spa-music wash
- sample caption: *Hi-fi acoustic bossa-lite lunchroom at ~78 bpm; nylon guitar, soft brushes (no kick), shaker, soft upright bass, one flugelhorn accent on the hook; intimate-smiling vocal; no chorus lift; avoid elevator-music and spa-music wash.*

**B12. Warm-Analog Synth-Pop (single option, not a default)**
- vibe: bright
- tempo: mid-tempo walk (~104 bpm)
- groove: four-on-the-floor with off-beat synth pluck
- instrumentation: warm analog synths, synth bass, electronic kit with handclaps on the hook, small piano motif
- production: warm analog (Juno-shape), not glossy
- vocal posture: smiling, slightly stylized
- energy curve: chorus lift on the hook, no drop
- negative: no EDM drop, no AI pop gloss, no boss-mode
- sample caption: *Warm-analog synth-pop at ~104 bpm with a four-on-the-floor and off-beat synth pluck; warm Juno-shape pads, synth bass, electronic kit with chorus-only handclaps, small piano motif; smiling slightly-stylized vocal; chorus lift only on the hook; avoid EDM drop, AI pop gloss, boss-mode.*

### Wistful (12)

**W1. Wistful Drum-and-Bass (rainy)**
- vibe: wistful
- tempo: fast-but-controlled (~170 bpm half-time feel)
- groove: drum and bass with half-time vocal phrasing
- instrumentation: chopped breakbeat, sub-bass, distant felt-piano motif, airy pad, vinyl crackle
- production: spacious, rainy, urban
- vocal posture: distant, restrained, half-time over the dnb pulse
- energy curve: hypnotic, no chorus lift
- negative: no sad-girl-pop chorus, no piano-ballad weight, no neo-soul melisma
- sample caption: *Rainy wistful drum-and-bass at ~170 bpm with half-time vocal phrasing; chopped breakbeat, sub-bass, distant felt-piano motif, airy pad, faint vinyl crackle; restrained vocal at half-time over the dnb pulse; hypnotic energy, no chorus lift; avoid sad-girl-pop chorus, piano-ballad weight, neo-soul melisma.*

**W2. Dub-Techno Memory Loop**
- vibe: wistful
- tempo: driving (~118 bpm)
- groove: sparse dub pulse, kick on 1 and 3, off-beat chord stab
- instrumentation: detuned chord stab, sub-bass, dub delays, distant pad, no drums beyond kick + clave
- production: spacious, blurred, club-adjacent
- vocal posture: detached, sometimes spoken-sung
- energy curve: steady hypnotic loop, no lift
- negative: no club-anthem drop, no sad-piano breakdown
- sample caption: *Dub-techno memory loop at ~118 bpm with kick on 1 and 3, off-beat detuned chord stab, dub delays, sub-bass, distant pad, and a clave; detached spoken-sung vocal; steady hypnotic loop, no lift; avoid club-anthem drop and sad-piano breakdown.*

**W3. Coldwave Night Drive**
- vibe: wistful
- tempo: driving (~112 bpm)
- groove: motorik straight kick with arpeggiated synth
- instrumentation: cold analog synth arp, gated kick, low pulsing bass, faint reverbed guitar
- production: cold digital but warm-vocal contrast
- vocal posture: restrained, slightly detached
- energy curve: builds across two chorus iterations
- negative: no synthwave cliche, no retrowave neon
- sample caption: *Coldwave night-drive at ~112 bpm with a motorik kick and arpeggiated cold analog synth; gated kick, low pulsing bass, faint reverbed guitar; restrained slightly-detached vocal that warms across two chorus iterations; avoid synthwave cliche and retrowave neon.*

**W4. Shoegaze Pulse**
- vibe: wistful
- tempo: mid-tempo walk (~104 bpm)
- groove: straight rock pulse buried under guitar wash
- instrumentation: two heavily reverbed guitars, bass, dry kit, hidden vocal harmony
- production: spacious, slightly distorted, blurred
- vocal posture: airy, buried-but-clear (vocals push through the wash)
- energy curve: starts intimate, opens wide on the second chorus
- negative: no melodramatic build-and-drop, no trailer crescendo
- sample caption: *Shoegaze pulse at ~104 bpm with a straight rock pulse buried under two heavily reverbed guitars; bass, dry kit, hidden vocal harmony; airy buried-but-clear vocal that pushes through the wash; starts intimate, opens wide on the second chorus; avoid trailer crescendo.*

**W5. Motorik Dusk Ride**
- vibe: wistful
- tempo: driving (~120 bpm)
- groove: motorik straight-eighth pulse, no fills
- instrumentation: clean rhythm guitar pattern, simple bass, electronic kit, single synth pad
- production: warm analog, no shine
- vocal posture: restrained, slightly detached, even
- energy curve: steady throughout, hypnotic
- negative: no krautrock pastiche, no German-language affectation
- sample caption: *Warm-analog motorik dusk-ride at ~120 bpm with a straight-eighth pulse and no fills; clean rhythm guitar pattern, simple bass, electronic kit, single synth pad; even restrained vocal slightly behind the pulse; steady hypnotic energy; avoid krautrock pastiche.*

**W6. Trip-Hop Hallway**
- vibe: wistful
- tempo: slow pulse (~88 bpm)
- groove: half-time breakbeat with sampled snare crackle
- instrumentation: dusty drum sample, upright bass, Rhodes chord, distant vinyl loop
- production: dusty vinyl, close but reverbed
- vocal posture: intimate, half-spoken
- energy curve: steady, no lift
- negative: no lo-fi study beat default, no generic chill-hop
- sample caption: *Dusty-vinyl trip-hop hallway at ~88 bpm with a half-time breakbeat and sampled snare crackle; upright bass, Rhodes chord, distant vinyl loop; intimate half-spoken vocal; steady energy with no lift; avoid lo-fi study-beat and generic chill-hop.*

**W7. Trance-Distant Lift**
- vibe: wistful
- tempo: fast-but-controlled (~134 bpm)
- groove: sparse four-on-the-floor with ride pulse
- instrumentation: long detuned pad, sub-bass, ride cymbal pulse, distant arpeggio
- production: spacious, cinematic but not melodramatic
- vocal posture: airy, restrained, opens slowly
- energy curve: starts intimate, opens wide, no drop
- negative: no club-anthem build-and-drop, no festival-trance lift
- sample caption: *Cinematic trance-distant lift at ~134 bpm with sparse four-on-the-floor and a ride-cymbal pulse; long detuned pad, sub-bass, distant arpeggio; airy restrained vocal that opens slowly across the song; no drop; avoid festival-trance lift and club-anthem cliche.*

**W8. Industrial Ambient with a Beat**
- vibe: wistful
- tempo: slow pulse (~76 bpm)
- groove: half-time mechanical pulse with metallic percussion
- instrumentation: metallic percussion, sub-bass drone, distant strings, processed guitar feedback
- production: industrial, dry, slightly distorted
- vocal posture: restrained, slightly chant-like
- energy curve: builds slowly, no chorus lift
- negative: no harsh-noise, no horror-trailer
- sample caption: *Industrial ambient with a beat at ~76 bpm, half-time mechanical pulse and metallic percussion; sub-bass drone, distant strings, processed guitar feedback; restrained chant-like vocal; builds slowly without a chorus lift; avoid harsh-noise and horror-trailer.*

**W9. Chamber-Electronic Hybrid**
- vibe: wistful
- tempo: slow pulse (~80 bpm)
- groove: programmed brushed-kit feel under string trio
- instrumentation: string trio (violin, viola, cello), felt piano, electronic kick, no bass
- production: cinematic but intimate, dry strings, close piano
- vocal posture: intimate, spoken-sung at moments
- energy curve: builds, then strips down to piano in the outro
- negative: no trailer-music swell, no Hollywood ending
- sample caption: *Intimate-cinematic chamber-electronic hybrid at ~80 bpm with a programmed brushed-kit feel under a string trio; violin/viola/cello, felt piano, electronic kick, no bass; intimate vocal that becomes spoken-sung in the bridge; builds then strips down to piano in the outro; avoid trailer-music swell.*

**W10. Nylon-Guitar Memory Piece**
- vibe: wistful
- tempo: still / suspended (~62 bpm)
- groove: hand percussion only, breath as pulse
- instrumentation: nylon guitar, distant harmonica, soft upright bass, no drums
- production: warm analog, hi-fi acoustic
- vocal posture: intimate, close to the mic, breath audible
- energy curve: still
- negative: no piano-ballad weight, no soft-rock balladry
- sample caption: *Warm-analog nylon-guitar memory piece at ~62 bpm; nylon guitar, distant harmonica, soft upright bass, hand percussion only, no drums; intimate close-mic vocal with audible breath; still energy throughout; avoid piano-ballad weight and soft-rock balladry.*

**W11. Late-Night Piano (single option, not a default)**
- vibe: wistful
- tempo: slow pulse (~70 bpm)
- groove: rubato — no fixed pulse
- instrumentation: upright piano, distant trumpet, soft brushed kit late in the song, no bass
- production: spacious, cinematic, intimate
- vocal posture: intimate, half-sung
- energy curve: starts piano-only, brushed kit enters in the final chorus
- negative: no sad-piano cliche, no melodramatic vibrato
- sample caption: *Spacious late-night piano at ~70 bpm, rubato (no fixed pulse); upright piano, distant trumpet, soft brushed kit only in the final chorus, no bass; intimate half-sung vocal; piano-only opening, brushed kit enters late; avoid sad-piano cliche and melodramatic vibrato.*

**W12. Jungle-Lite Rainy Pulse**
- vibe: wistful
- tempo: fast-and-restless (~160 bpm half-time feel)
- groove: jungle-lite breaks, half-time vocal
- instrumentation: chopped breakbeat with reggae stab, sub-bass, distant rain pad, no melodic synth lead
- production: spacious, rainy, urban
- vocal posture: distant, half-time, restrained
- energy curve: hypnotic, no lift
- negative: no rave-energy chorus, no big-jungle drop
- sample caption: *Rainy jungle-lite pulse at ~160 bpm with half-time vocal phrasing; chopped breakbeat with a reggae chord stab, sub-bass, distant rain-pad, no melodic synth lead; distant restrained vocal at half-time; hypnotic, no chorus lift; avoid rave-energy chorus and big-jungle drop.*

### Sharp (12)

**S1. Dry Post-Punk Guitar**
- vibe: sharp
- tempo: driving (~120 bpm)
- groove: straight rock pulse with angular guitar stabs
- instrumentation: single angular electric guitar (no chorus pedal), live bass, tight dry kit, no synth
- production: dry and close, rehearsal-room
- vocal posture: crisp-and-clipped, spoken-sung
- energy curve: verse tight / chorus tight (no big lift, just shift)
- negative: no goth-rock, no New-Romantic excess
- sample caption: *Dry post-punk guitar at ~120 bpm with angular single-guitar stabs over a straight rock pulse; live bass, tight dry kit, no synth, no chorus pedal; crisp-and-clipped spoken-sung vocal; chorus shifts rather than lifts; rehearsal-room production; avoid goth-rock and New-Romantic excess.*

**S2. Crisp Funk-Bass Precision**
- vibe: sharp
- tempo: driving (~108 bpm)
- groove: syncopated funk groove, very tight pocket
- instrumentation: percussive funk bass (centre of the mix), muted electric guitar, dry drum kit with handclaps, single Rhodes accent
- production: dry, hi-fi, warm
- vocal posture: crisp, decisive, slightly playful
- energy curve: steady groove, no drop
- negative: no Vulfpeck pastiche, no comedy-funk
- sample caption: *Crisp funk-bass precision at ~108 bpm with a tight syncopated pocket; percussive funk bass at the centre, muted electric guitar, dry kit with handclaps, one Rhodes accent on the hook; crisp decisive vocal with a small playful edge; steady groove, no drop; avoid Vulfpeck pastiche.*

**S3. Staccato Piano Groove**
- vibe: sharp
- tempo: driving (~110 bpm)
- groove: staccato piano on every off-beat, kit on the downbeats
- instrumentation: percussive upright piano, upright bass, tight kit with rim-shots, no other harmonic instrument
- production: dry and close, slightly tape-worn
- vocal posture: crisp and clipped, spoken-sung
- energy curve: verse tight / chorus tight, no big lift
- negative: no jazz-cabaret, no Broadway tap
- sample caption: *Staccato piano groove at ~110 bpm with the piano on every off-beat and kit on the downbeats; percussive upright piano, upright bass, tight kit with rim-shots, no other harmony; crisp spoken-sung vocal; no big lift, just precision; slightly tape-worn production; avoid jazz-cabaret and Broadway tap.*

**S4. Angular Guitar-Pop**
- vibe: sharp
- tempo: driving (~118 bpm)
- groove: straight rock pulse with displaced accents
- instrumentation: two electric guitars with displaced patterns, live bass, tight kit
- production: radio-friendly but dry
- vocal posture: crisp, alert, conversational
- energy curve: chorus shift (not lift)
- negative: no Strokes pastiche, no 2000s-indie cliche
- sample caption: *Angular guitar-pop at ~118 bpm with displaced accents over a straight rock pulse; two electric guitars in interlocking patterns, live bass, tight kit; crisp alert conversational vocal; chorus shifts rather than lifts; radio-friendly but dry; avoid Strokes pastiche.*

**S5. Drumline Precision**
- vibe: sharp
- tempo: driving (~112 bpm)
- groove: marching/drumline pattern, no kit
- instrumentation: snare drumline, occasional bass drum, brass accents, no melodic instrument under the verse
- production: dry, raw, slightly room-y
- vocal posture: chant-like at moments, otherwise crisp
- energy curve: brass enters on the chorus, otherwise drums + vocals only
- negative: no marching-band caricature, no sports-anthem energy
- sample caption: *Drumline precision at ~112 bpm with a marching snare pattern and no kit; occasional bass drum, brass accents entering on the chorus, no melodic instrument under the verse; crisp vocal that becomes briefly chant-like on the hook; dry raw production; avoid sports-anthem energy.*

**S6. Brass-Hits and Tight Kit**
- vibe: sharp
- tempo: driving (~116 bpm)
- groove: syncopated brass stabs on top of a tight pocket
- instrumentation: trumpet + alto sax brass pair, upright bass, tight dry kit, single Rhodes
- production: dry, hi-fi
- vocal posture: crisp, decisive, slight smile
- energy curve: chorus marked by brass stabs
- negative: no Motown pastiche, no big-band cliche
- sample caption: *Brass-hits and tight kit at ~116 bpm with syncopated trumpet-and-alto-sax stabs over a tight pocket; upright bass, dry kit, single Rhodes accent; crisp decisive vocal with a small smile; chorus marked by brass stabs; avoid Motown pastiche and big-band cliche.*

**S7. Acoustic Percussion Grid**
- vibe: sharp
- tempo: driving (~120 bpm)
- groove: hand percussion + cajón on a tight grid
- instrumentation: nylon guitar (percussive comp), cajón, shaker, bongos, no kit
- production: hi-fi acoustic, dry
- vocal posture: crisp, decisive, spoken-sung
- energy curve: steady grid, no lift
- negative: no flamenco caricature, no campfire vibe
- sample caption: *Acoustic percussion grid at ~120 bpm with hand percussion and cajón on a tight grid; percussive nylon guitar comp, shaker, bongos, no kit; crisp spoken-sung vocal; steady grid energy, no lift; avoid flamenco caricature and campfire vibe.*

**S8. Tight Garage Rock**
- vibe: sharp
- tempo: driving (~122 bpm)
- groove: straight rock pulse, very compact arrangement
- instrumentation: one fuzzy electric guitar, bass, tight kit, no extras
- production: gritty, slightly distorted, dry
- vocal posture: crisp, urgent, slightly bratty
- energy curve: verse tight / chorus tight, no lift
- negative: no garage-revival cliche, no shouty punk
- sample caption: *Tight garage rock at ~122 bpm with a compact straight rock pulse; one fuzzy electric guitar, bass, tight kit, nothing else; crisp urgent vocal with a slight edge; no lift, just compact precision; gritty dry production; avoid shouty punk.*

**S9. Spoken-Sung Rhythmic Pop**
- vibe: sharp
- tempo: driving (~108 bpm)
- groove: tight pop pocket with chopped percussion
- instrumentation: muted plucky guitar, electronic kit, percussion fills, sub-bass
- production: dry, slightly cold but warm vocal
- vocal posture: spoken-sung verse, sung-but-clipped chorus
- energy curve: verse spoken / chorus clipped-sung
- negative: no rap pastiche, no spoken-word affectation
- sample caption: *Spoken-sung rhythmic pop at ~108 bpm with a tight pop pocket and chopped percussion; muted plucky guitar, electronic kit, sub-bass; spoken-sung verses, clipped-sung choruses; warm vocal over dry slightly-cold backing; avoid rap pastiche and spoken-word affectation.*

**S10. Minimal Techno (one option, not a default)**
- vibe: sharp
- tempo: driving (~124 bpm)
- groove: four-on-the-floor with off-beat hat, no fills
- instrumentation: clean kick, off-beat hat, single synth stab, sub-bass, no pads
- production: dry, cold, club-adjacent but not anthemic
- vocal posture: crisp, controlled, restrained
- energy curve: hypnotic, no lift
- negative: no club-anthem build-and-drop, no festival energy
- sample caption: *Minimal techno at ~124 bpm with a clean four-on-the-floor and off-beat hat; single synth stab, sub-bass, no pads, no fills; crisp restrained vocal; hypnotic energy, no lift; avoid festival energy and club-anthem build.*

**S11. Compact Jazz-Funk Precision**
- vibe: sharp
- tempo: driving (~104 bpm)
- groove: tight jazz-funk pocket, swung sixteenths
- instrumentation: Rhodes (lead), live bass, tight kit with brushed snare, occasional muted trumpet
- production: hi-fi, dry, warm
- vocal posture: crisp, decisive, slightly stylized
- energy curve: steady, no lift
- negative: no smooth-jazz cliche, no easy-listening
- sample caption: *Compact jazz-funk precision at ~104 bpm with a tight pocket on swung sixteenths; Rhodes lead, live bass, brushed-snare kit, occasional muted trumpet; crisp slightly-stylized decisive vocal; steady energy; avoid smooth-jazz and easy-listening.*

**S12. Piano + Snare Decisive**
- vibe: sharp
- tempo: driving (~114 bpm)
- groove: piano on every beat, snare on 2 and 4 only
- instrumentation: dry upright piano, single snare, upright bass, no other instrument
- production: dry, close, slightly room-y
- vocal posture: crisp, decisive, almost recitative
- energy curve: steady, no lift
- negative: no chamber-pop cliche, no orchestral entry
- sample caption: *Piano + snare decisive at ~114 bpm with piano on every beat and snare on 2 and 4 only; dry upright piano, single snare, upright bass, nothing else; crisp decisive almost-recitative vocal; steady energy, no lift; avoid chamber-pop and orchestral entry.*

---

## SECTION 6 — A1P1–A1P5 Rotation Logic and Proposal

### Rotation rules
- Adjacent paths must not reuse the same style construction.
- The same vibe must not use the same instrumentation cluster two paths in a row.
- Within a single path, the two segment rows for the same vibe must contrast on at least two of the eight axes (tempo, groove, or instrumentation must change — production-texture-only is not enough).
- A/B candidates remain performances of the same canonical lyric and approved `musicCaption`. A/B never carries style variance.
- The `musicCaption` must be product-approved before audio generation. No exception.

### Proposed rotation (one option of many)

This is a starting proposal, not a binding plan. Constructions can be swapped freely — the constraint is that the resulting table never reuses one within an adjacent path / same vibe.

| Path | Segment | Vibe | Proposed construction | Reason | Nearby styles to avoid |
|---|---|---|---|---|---|
| A1P1 | 1 | bright | B1 California Sofa-Rock Sunrise | Warm welcoming first impression that is not handclap-pop. | B7 (city-pop) is too glossy for the path opener. |
| A1P1 | 1 | wistful | W10 Nylon-Guitar Memory Piece | Opens the wistful arc with stillness; not folk-default. | W11 (late-night piano) would feel similar; pick one. |
| A1P1 | 1 | sharp | S3 Staccato Piano Groove | Sharp without synth — establishes that Sharp ≠ electro. | S10 (minimal techno) saves for later. |
| A1P1 | 2 | bright | B5 Acoustic Road Song | Contrast with B1 by losing the kit. | B2 (garage-pop) saves for P3. |
| A1P1 | 2 | wistful | W1 Wistful Drum-and-Bass | Wistful does not mean slow — establishes that early. | W12 (jungle-lite) is adjacent; save for later. |
| A1P1 | 2 | sharp | S8 Tight Garage Rock | Sharp + rock without electronics; pairs with S3 by leaving piano behind. | S1 (post-punk) is adjacent; save for later. |
| A1P2 | 1 | bright | B6 Soft Funk Open Window | Reset the "bright = handclap-pop" attractor with a funk pocket. | B3 (disco-lite) is adjacent. |
| A1P2 | 1 | wistful | W4 Shoegaze Pulse | Reset the "wistful = folk" attractor with a guitar wash. | W6 (trip-hop) saves for later. |
| A1P2 | 1 | sharp | S2 Crisp Funk-Bass Precision | Reset the "sharp = synth" attractor with funk bass. | S11 (jazz-funk) is adjacent; save for P4. |
| A1P2 | 2 | bright | B10 Highlife Walk | Different rhythmic culture; not handclap-pop, not road-rock. | B8 (brass-and-guitar) is adjacent; save for P3. |
| A1P2 | 2 | wistful | W2 Dub-Techno Memory Loop | Continues the "wistful is electronic too" thesis without repeating W1. | W3 (coldwave) is adjacent; save for P4. |
| A1P2 | 2 | sharp | S5 Drumline Precision | Sharp = percussion-led; nothing electronic. | S1, S8 saved already. |
| A1P3 | 1 | bright | B2 Garage-Pop Handshake | Re-introduces electric-guitar warmth for a different feeling. | B1, B5 already used; avoid. |
| A1P3 | 1 | wistful | W6 Trip-Hop Hallway | Slows the wistful pulse back down, but keeps it electronic. | W1 (dnb) already used. |
| A1P3 | 1 | sharp | S1 Dry Post-Punk Guitar | Brings electric guitar back to Sharp. | S8 already used; avoid. |
| A1P3 | 2 | bright | B8 Brass-and-Guitar Daylight | Adds brass; never used yet in P1/P2 bright. | B6 already used. |
| A1P3 | 2 | wistful | W9 Chamber-Electronic Hybrid | String-trio + electronic kick; never used yet. | W4 already used. |
| A1P3 | 2 | sharp | S4 Angular Guitar-Pop | Continues guitar-led sharp from S1 with a contrast in groove. | S2 already used. |
| A1P4 | 1 | bright | B11 Bossa-Lite Lunchroom | Slower bright; uses no kit; first bossa in the catalog. | B10 (highlife) already used. |
| A1P4 | 1 | wistful | W3 Coldwave Night Drive | First coldwave; not used yet. | W2 already used. |
| A1P4 | 1 | sharp | S11 Compact Jazz-Funk Precision | First jazz-funk; not used yet. | S2 already used. |
| A1P4 | 2 | bright | B4 Surf-Guitar Sunrise | Spring-reverb surf; never used. | B1, B11 already used. |
| A1P4 | 2 | wistful | W5 Motorik Dusk Ride | First motorik; not used. | W3 already used. |
| A1P4 | 2 | sharp | S6 Brass-Hits and Tight Kit | First brass-sharp; not used. | S5 already used. |
| A1P5 | 1 | bright | B7 City-Pop Shimmer | First glossy bright option, but with vocal warmth. | B4 already used. |
| A1P5 | 1 | wistful | W8 Industrial Ambient with a Beat | First industrial-ambient; not used. | W5 already used. |
| A1P5 | 1 | sharp | S7 Acoustic Percussion Grid | Final acoustic-sharp variant; first cajón-led. | S6 already used. |
| A1P5 | 2 | bright | B9 Power-Pop Quick Yes | First fast-bright; tempo contrast. | B7 already used. |
| A1P5 | 2 | wistful | W11 Late-Night Piano | Path closes with a still piano piece. | W8 already used. |
| A1P5 | 2 | sharp | S9 Spoken-Sung Rhythmic Pop | Final sharp; spoken-sung variant. | S7 already used. |

Unused constructions (B3, B12, W7, W12, S10, S12) are kept as fallback options if any of the above proves ungenerable or is rejected by product review.

---

## SECTION 7 — Lyric Direction V2

The previous lyric direction over-specified structure (verse / chorus / bridge / outro, with the trophy words wrapped in a fixed slot per section). It also gave the LLM permission to write lines like "Direct. Settled. Done. / Direct. Settled. Done." because the system told it that vocabulary-list outros are acceptable.

Replace the structural formula with the creative brief below.

### V2 creative brief (this is the prompt-facing text)

> Write a good short song using these required words. Make the words feel natural inside the lyric. The lyric should flow, sound singable, and feel like a real song. It may have a small scene, story, mood, chorus, hook, or emotional turn if that helps. Do not make it sound like a vocabulary worksheet.

### Technical constraints (kept; non-negotiable)
- Every required trophy word appears at least once.
- Exactly one occurrence per trophy word is wrapped with `<<…>>` in `rawLyricsWithWrappers` (this is the cloze position). All other occurrences are unwrapped.
- `providerLyrics` and `displayLyrics` are derived by stripping `<<` / `>>` (already handled by `stripTrophySongWrappers` at [guidedTrophySongs.ts:1109](../../frontend/src/data/guidedTrophySongs.ts#L1109)).
- Candidate A and Candidate B share the same canonical lyric.
- A separate German translation is required and is never sent to the music provider.
- The full lyric must be reviewable on the page (in this document or its successor) before audio generation.
- Never send `<<` or `>>` to the music provider. Provider receives `providerLyrics`.

### Creative guidance (rules to follow when writing the lyric)
- Write a real small song. A small song with a real shape (intro → moment → turn → close) is the target, not "verse-chorus-bridge-outro by template".
- Let the lyric breathe. Repeated phrases are allowed if they sound good musically. Repetition is not the same as a vocabulary stack.
- One or two words may become hooks if natural. Forced hooks are worse than no hook.
- A "good short song" is roughly 16–28 lines; do not pad with reprised choruses to hit a target length.
- Do not force every line to use a trophy word. Five trophy words across the song is the requirement; lines around them can carry the song without the word.
- Do not force a metaphor.
- Do not force a "human image" or a "scene caption" beat — only include one if the song wants it.
- Do not force the same structure across all rows.
- Do not use fake mnemonics (e.g. "splendid sounds like a sun" — that is a study aid, not a lyric).
- Do not use awkward adjective stacking ("Calm, simple, patient / Heiter, sicher, einfach").
- Do not repeat a trophy word three or more times in a single line unless it genuinely earns its place musically.
- Do not create generic textbook lines ("That was lovely, thank you" is borderline; "Lovely, lovely, thanks to you" is over).
- Do not write `"direct, direct, direct"` unless the musical idea actually earns it. The default answer is "it does not earn it".
- Keep the lyric readable on mobile (short lines, clean line breaks). Do not make it sterile.

### Cloze-position rule
Pick the cloze position (the `<<wrapped>>` occurrence per trophy word) on the line where the word most rewards typing it. Usually that is the line where the word lands in a strong musical position — the first beat of a hook line, the resolution of a phrase, the punctuated end of a verse. The cloze position is a teaching choice, not a structural slot.

---

## SECTION 8 — Comparison with the Normal Resonance Song Pipeline

The normal song pipeline (Music page; per-word concept songs) sits at [cloud_engines/concept_engine/lyrics.py](../../cloud_engines/concept_engine/lyrics.py) and [cloud_engines/concept_engine/caption.py](../../cloud_engines/concept_engine/caption.py). Lyrics and music captions are generated by an LLM at three lyric depths:

- **contextual** (Phrase / Level 2) — short, structured, 1–4 word lines, fixed Ace-Step section tags. Closest to the current Trophy Song formula.
- **creative** (Story / Level 3) — multi-verse with chorus/hook, target word as a thematic anchor, instructs the LLM to "prioritize musicality — these should feel like real song lyrics, not a language drill".
- **dramatic** (Song / Level 4) — full song. The music caption is generated first (or supplied from a storyboard) and the lyric is asked to **match the caption's structure**: pop/rock/folk → tight verse-chorus-bridge, rap/hip-hop/techno → looser denser flow, orchestral/cinematic/ambient → sparser, jazz/R&B → organic and hook-driven. See `_dramatic_lyrics_prompt` at [cloud_engines/concept_engine/lyrics.py:434-499](../../cloud_engines/concept_engine/lyrics.py#L434-L499).

The pipeline also explicitly asks the LLM for both a `CAPTION:` and a `LYRICS:` block in a single combined prompt — `_build_combined_prompt` at [cloud_engines/concept_engine/lyrics.py:271-321](../../cloud_engines/concept_engine/lyrics.py#L271-L321) — so the lyric is generated *in awareness of* the music caption, not after the fact.

### Why the normal pipeline often produces better songs
- The lyric is asked to "feel like a real song about that word's meaning — not a vocabulary drill" — this is the same instruction missing from the current Trophy Song process.
- The caption and lyric are aware of each other (combined prompt). The Trophy Song captions and lyrics in `guidedTrophySongs.ts` are clearly written separately — captions describe what to avoid, lyrics ignore the captions.
- The caption is generated per-song from a per-song prompt, not picked from a six-row genre palette. This is exactly what V2 needs.
- The dramatic-mode prompt routes structure to genre rather than fixing structure first — so a techno song is allowed to drop the verse-chorus-bridge skeleton.

### What Trophy Songs should borrow
- The "real song, not a drill" creative stance.
- The combined-prompt structure: caption *and* lyric in one authoring pass, with the lyric matching the caption.
- The "structure adapts to style" idea — a wistful drum-and-bass row should not have a verse/pre-chorus/chorus/bridge/outro skeleton; an acoustic-percussion-grid sharp row probably should not have a pre-chorus.

### What Trophy Songs should NOT borrow (yet)
- Trophy Songs are **local-static**: rows ship as hand-authored TS in `guidedTrophySongs.ts`. They are committed, reviewed, and gated. The normal pipeline is **dynamic**: lyrics and captions are generated per-request by an LLM at runtime. Do not move Trophy Songs to a runtime LLM call yet — the product owner wants every Trophy Song reviewed before audio is generated. Runtime generation would skip review.
- The normal pipeline serves a single target word. Trophy Songs serve five trophy words *plus* a `<<wrapped>>` cloze position per word, *plus* a separate German translation. The wrapper / study-metadata contract is specific to Trophy Songs and must be preserved.
- Ace-Step section tags (`[Verse - Gentle]`, `[Chorus - Bright]`) are pipeline-specific markup. Trophy Songs use plain `[Verse 1]` / `[Chorus]` / `[Bridge]`. Do not copy Ace-Step tags into Trophy Songs unless we move to the same provider stack.

### Recommendation
Borrow the **prompting style** (creative brief, combined caption+lyric, structure-follows-caption) without copying the **architecture** (runtime LLM call, single-word target, Ace-Step tags). Trophy Songs stay static and reviewable. They simply get authored with the same creative stance the normal pipeline already uses.

In a later phase, if the static-authoring workflow becomes a bottleneck, the trophy-song authoring step could share the same OpenRouter client and prompt scaffolding — but that is not a V2 deliverable. V2 is about better captions and better lyrics, not about a generation rewrite.

---

## SECTION 9 — Next Generation Process (Gated)

1. **Trophy-word source investigation finishes separately.** Already done — see [GUIDED_TROPHY_WORD_SOURCE_DUPLICATION_INVESTIGATION_2026_05_15.md](GUIDED_TROPHY_WORD_SOURCE_DUPLICATION_INVESTIGATION_2026_05_15.md). Product owner now needs to revise A1P2 trophy words in `guidedLessons.ts` (and the corresponding `guidedTrophySongs.ts` `trophyWords` arrays).
2. **Corrected/approved trophy words are available.** Product owner commits the revised words. The "approved" set becomes the input to step 3.
3. **Generate A1P2 V2 lyrics + captions only (no audio).** Use Musical Design Framework V2 and Lyric Direction V2. Produce six full lyrics, six full music captions, and six German translations for A1P2.
4. **Product owner reviews full lyrics and music captions on the page.** Reviewable in the next docs report (see prompt in §10).
5. **Revise lyrics / captions if needed.** Iterate before any audio generation.
6. **Only then generate Candidate A/B audio.** The audio generation script in `frontend/scripts/generate-guided-trophy-song-audio.ts` runs against the *approved* captions and lyrics.
7. **Product owner listens to A and B.** Pick A or B (or reject and revise the caption — A/B is performance variance, not style variance).
8. **Only then mark A1P2 approved or blocked.**
9. **A1P3–A1P5 remain blocked** until A1P2 V2 has been through the gated process at least once and the gating actually works. Then P3 can begin step 1 of its own cycle.

Each step writes a small status report. None of the steps modify runtime code without explicit owner approval.

---

## SECTION 10 — Next Implementation Prompt ("A1P2 V2 lyrics + music captions only, no audio")

The exact prompt to paste into the next session, when the trophy-word investigation has produced approved A1P2 words. Keep this prompt at the bottom of this document so the next handoff is self-contained.

---

> **A1P2 V2 — LYRICS AND MUSIC CAPTIONS ONLY (NO AUDIO)**
>
> Canonical repo: `D:\CODING\ResonanceTEST\orchestrator`. Work on main only.
>
> Inputs:
> - The approved A1P2 trophy words (per (segment, vibe)) from the latest trophy-word revision. If the words are not yet approved, stop and surface the gap; do not invent replacement words.
> - The Musical Design Framework V2 (§3) and Vibe-as-Performance-Attitude (§4) in `docs/Product/GUIDED_TROPHY_SONG_MUSICALITY_RESET_V2.md`.
> - The Lyric Direction V2 (§7) in the same report.
> - The proposed rotation for A1P2 (§6, four rows: B6, B10, W4, W2, S2, S5) — treat as a starting suggestion; deviation is allowed but must be argued.
>
> Mission:
> - Produce six full A1P2 V2 lyrics + captions, one per (segment, vibe). No audio, no provider calls, no audio-file writes, no modifications to runtime row data in `frontend/src/data/guidedTrophySongs.ts` yet.
> - Surface every full lyric, every full music caption, and every full German translation in a single new doc at `docs/Product/GUIDED_TROPHY_SONG_A1P2_V2_LYRICS_AND_CAPTIONS.md` (or similar dated equivalent).
> - For each of the six rows: state the chosen style construction from §5 (or document a deviation), state the eight-axis decomposition explicitly, give the full musicCaption paragraph, give the full rawLyricsWithWrappers, give the full German translation, give the cloze-position rationale per trophy word.
> - Apply the creative stance from §7: real small song, not a vocabulary worksheet. Apply the creative-pipeline-style framing observed in `cloud_engines/concept_engine/lyrics.py` for "match lyric structure to caption" without copying Ace-Step tags.
>
> Do not:
> - generate audio
> - modify `frontend/src/data/guidedTrophySongs.ts`
> - modify `frontend/src/data/guidedLessons.ts`
> - touch backend, providers, KIE/Suno, Music page integration, Supabase, decks, words, generation_jobs, credits, or the normal generation pipeline
> - propose A1P3–A1P5 in this pass — A1P2 V2 only
>
> Checks (only if any runtime file is modified — for this pass, none should be):
> - `npx tsx scripts/test-guided-trophy-songs.ts`
> - `npx tsx scripts/test-guided-trophy-cloze.ts`
> - `npx tsx scripts/test-guided-vibes.ts`
> - `npx tsx scripts/test-guided-today-data.ts`
> - `git diff --check`
> - `git diff --cached --check`
>
> Final response should include:
> - the path of the new lyrics-and-captions doc
> - confirmation that no runtime files were modified
> - confirmation that no audio was generated
> - confirmation that A1P2 V2 audio remains blocked pending product review of the new doc
> - recommended next step (product-owner review checklist for the new doc, then audio generation if approved)

---

## Final Summary

- Single artifact: this doc at `docs/Product/GUIDED_TROPHY_SONG_MUSICALITY_RESET_V2.md`.
- No runtime files touched.
- No audio generated.
- No trophy words changed.
- A1P2, A1P3, A1P4, A1P5 trophy-song generation all remain blocked.
- Full A1P2 lyrics + captions reproduced in §1.
- Musical Design Framework V2 in §3.
- Lyric Direction V2 in §7.
- Recommended next step: when the trophy-word source investigation produces approved A1P2 words, run the §10 prompt to produce six A1P2 V2 lyrics + captions in a new doc, with no audio.
