import type { ActiveGuidedVibeId } from './guidedVibes'
import type { GuidedSegmentReviewNumber } from '@/lib/guidedCheckpoint'

export type GuidedTrophySongAudioStatus = 'ready' | 'missing' | 'failed'
export type GuidedTrophySongCandidateId = 'A' | 'B'

export type GuidedTrophySongAudioCandidate = {
  publicUrl: string
  durationSeconds?: number
  providerUrl?: string
}

export type GuidedTrophySongClozePosition = {
  lineIndex: number
  word: string
  startChar: number
  endChar: number
}

export type GuidedTrophySongStudyLine = {
  lineIndex: number
  line: string
  hiddenWord: string
}

export type GuidedTrophySongCatalogRow = {
  id: string
  pathId: string
  segment: GuidedSegmentReviewNumber
  vibe: ActiveGuidedVibeId
  trophyWords: string[]
  styleFamily: string
  songStyleLabel: string
  musicCaption: string
  rawLyricsWithWrappers: string
  providerLyrics: string
  displayLyrics: string
  lyricsTranslationDe: string
  studyLines: GuidedTrophySongStudyLine[]
  clozePositions: GuidedTrophySongClozePosition[]
  audioCandidates: Partial<Record<GuidedTrophySongCandidateId, GuidedTrophySongAudioCandidate>>
  activeCandidateDefault: GuidedTrophySongCandidateId
  audioPublicUrl: string | null
  audioStatus: GuidedTrophySongAudioStatus
}

type GuidedTrophySongInput = Omit<
  GuidedTrophySongCatalogRow,
  'providerLyrics' | 'displayLyrics' | 'studyLines' | 'clozePositions' | 'audioPublicUrl' | 'audioStatus' | 'activeCandidateDefault'
> & {
  audioCandidates?: Partial<Record<GuidedTrophySongCandidateId, GuidedTrophySongAudioCandidate>>
  audioPublicUrl?: string | null
  audioStatus?: GuidedTrophySongAudioStatus
  activeCandidateDefault?: GuidedTrophySongCandidateId
}

export const GUIDED_TROPHY_SONGS: GuidedTrophySongCatalogRow[] = [
  defineGuidedTrophySong({
    id: 'english-a1-practical-1-segment-1-bright-trophy-song',
    pathId: 'english-a1-practical-1',
    segment: 1,
    vibe: 'bright',
    trophyWords: ['delighted', 'marvelous', 'glad', 'eager', 'splendid'],
    styleFamily: 'acoustic-warm',
    songStyleLabel: 'Acoustic warm',
    musicCaption: 'Acoustic-warm folk-pop with a Bright, socially generous voice; mid-tempo around 100 bpm, buoyant but unhurried; smiling, present-tense vocal with generous breath and no melisma; fingerpicked acoustic guitar lead, brushed kit, soft shaker, warm low bass, occasional warm pad; clear English diction so "delighted, marvelous, glad, eager, splendid" all land cleanly; avoid sunny-day cliche, avoid children\'s-song melody shape, avoid coffeehouse-jingle vibe.',
    audioPublicUrl: '/guided/trophy-songs/a1p1/english-a1-practical-1-segment-1-bright-trophy-song/candidate-a.mp3',
    audioCandidates: defineAudioCandidates(
      'english-a1-practical-1-segment-1-bright-trophy-song',
      'https://tempfile.aiquickdraw.com/r/5a28f1c94a58457cb11d4e9d51b4bbaa.mp3',
      'https://tempfile.aiquickdraw.com/r/ec831915ef1e4ca6ba6fc9f7c3e743b9.mp3',
    ),
    audioStatus: 'ready',
    rawLyricsWithWrappers: `[Verse 1]
Morning in the corner cafe
A small bell on the door
<<Delighted>> to meet you here today
What a way to start once more

[Pre-Chorus]
You said the words, I caught them right
A <<marvelous>> reply

[Chorus]
And I'm so <<glad>> we crossed this street
So <<eager>> for the day
A <<splendid>> moment, here we meet
There's nothing in the way

[Verse 2]
I asked the question, soft and slow
You laughed and pointed near
Marvelous how the kind ones go
Out of their way to make it clear

[Chorus]
And I'm so glad we crossed this street
So eager for the day
A splendid moment, here we meet
There's nothing in the way

[Bridge]
Delighted by the smallest thing -
A cup, a word, a smile
Eager for the afternoon
Make it last a while

[Outro]
Splendid day, splendid friend
Splendid, splendid till the end`,
    lyricsTranslationDe: `[Verse 1]
Morgen im Eckcafe
Eine kleine Glocke an der Tuer
Erfreut, dich heute hier zu treffen
Was fuer ein Anfang, noch einmal

[Pre-Chorus]
Du sagtest die Worte, ich verstand sie richtig
Eine wunderbare Antwort

[Chorus]
Und ich bin so froh, dass wir diese Strasse gekreuzt haben
So gespannt auf den Tag
Ein herrlicher Moment, hier treffen wir uns
Nichts steht im Weg

[Verse 2]
Ich stellte die Frage, sanft und langsam
Du lachtest und zeigtest in die Naehe
Wunderbar, wie die freundlichen Menschen
Sich Muehe geben, es klar zu machen

[Chorus]
Und ich bin so froh, dass wir diese Strasse gekreuzt haben
So gespannt auf den Tag
Ein herrlicher Moment, hier treffen wir uns
Nichts steht im Weg

[Bridge]
Erfreut ueber die kleinste Sache -
Eine Tasse, ein Wort, ein Laecheln
Gespannt auf den Nachmittag
Lass es noch eine Weile dauern

[Outro]
Herrlicher Tag, herrlicher Freund
Herrlich, herrlich bis zum Ende`,
  }),
  defineGuidedTrophySong({
    id: 'english-a1-practical-1-segment-2-bright-trophy-song',
    pathId: 'english-a1-practical-1',
    segment: 2,
    vibe: 'bright',
    trophyWords: ['ready', 'lovely', 'charming', 'wonderful', 'brilliant'],
    styleFamily: 'bright-synth-pop',
    songStyleLabel: 'Bright synth-pop',
    musicCaption: 'Bright synth-pop at ~116 bpm, friendly and forward but never aggressive; Bright voice with a slightly more playful posture than Segment 1; smiling vocal with light layering, no autotune showcase, no melisma; pop synth lead, tight kit with claps, plucky bass, warm pad sitting under; clear English diction so "ready, lovely, charming, wonderful, brilliant" all land cleanly; avoid EDM drop, avoid nightclub posture, avoid generic top-40 chorus shape.',
    audioPublicUrl: '/guided/trophy-songs/a1p1/english-a1-practical-1-segment-2-bright-trophy-song/candidate-a.mp3',
    audioCandidates: defineAudioCandidates(
      'english-a1-practical-1-segment-2-bright-trophy-song',
      'https://tempfile.aiquickdraw.com/r/6d35fd059a754e5c9ec2ec4af5da1736.mp3',
      'https://tempfile.aiquickdraw.com/r/baa17c27d13345f4b7726a63c060e5c5.mp3',
    ),
    audioStatus: 'ready',
    rawLyricsWithWrappers: `[Verse 1]
The platform clock keeps moving
I've got my ticket here
<<Ready>> for the train at seven
With the sky so wide and clear

[Pre-Chorus]
I asked the help desk where to go
And <<lovely>> - they knew

[Chorus]
What a <<charming>> little corner of town
What a <<wonderful>> thing you do
A <<brilliant>> little moment comes around
And tomorrow I'll meet you

[Verse 2]
You smiled and said "no trouble"
You walked me to the door
Lovely how the strangers turn
Into friends you hadn't seen before

[Chorus]
What a charming little corner of town
What a wonderful thing you do
A brilliant little moment comes around
And tomorrow I'll meet you

[Bridge]
Ready, ready at the station
Charming cafe in the rain
Wonderful small conversation
We'll do it all again

[Outro]
Brilliant - thanks, goodbye
Brilliant, until next time`,
    lyricsTranslationDe: `[Verse 1]
Die Bahnsteiguhr laeuft weiter
Ich habe mein Ticket hier
Bereit fuer den Zug um sieben
Mit dem Himmel so weit und klar

[Pre-Chorus]
Ich fragte am Schalter, wohin ich gehen soll
Und schoen - sie wussten es

[Chorus]
Was fuer eine charmante kleine Ecke der Stadt
Was fuer eine wundervolle Sache, die du tust
Ein brillanter kleiner Moment kommt vorbei
Und morgen treffe ich dich

[Verse 2]
Du hast gelaechelt und gesagt: "kein Problem"
Du hast mich zur Tuer gebracht
Schoen, wie Fremde
Zu Freunden werden, die man vorher nicht kannte

[Chorus]
Was fuer eine charmante kleine Ecke der Stadt
Was fuer eine wundervolle Sache, die du tust
Ein brillanter kleiner Moment kommt vorbei
Und morgen treffe ich dich

[Bridge]
Bereit, bereit am Bahnhof
Charmantes Cafe im Regen
Wundervolles kleines Gespraech
Wir machen das alles noch einmal

[Outro]
Brillant - danke, auf Wiedersehen
Brillant, bis zum naechsten Mal`,
  }),
  defineGuidedTrophySong({
    id: 'english-a1-practical-1-segment-1-wistful-trophy-song',
    pathId: 'english-a1-practical-1',
    segment: 1,
    vibe: 'wistful',
    trophyWords: ['gently', 'slowly', 'lost', 'quiet', 'perhaps'],
    styleFamily: 'ambient-folk',
    songStyleLabel: 'Ambient folk',
    musicCaption: 'Ambient folk at ~76 bpm, spacious but not sleepy; Wistful voice - reflective, hesitant, soft, never melodramatic; intimate vocal with audible breath, restrained dynamics, no whispering, no ASMR; fingerpicked acoustic guitar under an airy ambient pad, brushed cymbals, soft upright-style bass; clear English diction so "gently, slowly, lost, quiet, perhaps" all land cleanly; avoid piano-ballad shape, avoid melodramatic sadness, avoid wistful-girl-pop cliche.',
    audioPublicUrl: '/guided/trophy-songs/a1p1/english-a1-practical-1-segment-1-wistful-trophy-song/candidate-a.mp3',
    audioCandidates: defineAudioCandidates(
      'english-a1-practical-1-segment-1-wistful-trophy-song',
      'https://tempfile.aiquickdraw.com/r/06578791e2f346f49e2593ff36750512.mp3',
      'https://tempfile.aiquickdraw.com/r/c2fde151e7054c82b9ed0a5bd784611b.mp3',
    ),
    audioStatus: 'ready',
    rawLyricsWithWrappers: `[Verse 1]
The afternoon comes in <<gently>>
Through a window I half-remember
Words I almost knew
Quieter than November

[Verse 2]
Can you say it <<slowly>>?
I'm catching only halves
The shape of what you mean
Is a path between two laughs

[Bridge]
I'm a little <<lost>> in this town tonight
The streets all lean the same way
There's a <<quiet>> table by the candle light
And I'll take it, if I may

[Verse 3]
<<Perhaps>> the answer's simple
Perhaps it's nearly mine
Gently asked, slowly answered
And the evening's doing fine

[Outro]
Slowly, perhaps, slowly
I'll find the door again`,
    lyricsTranslationDe: `[Verse 1]
Der Nachmittag kommt sanft herein
Durch ein Fenster, an das ich mich halb erinnere
Worte, die ich fast kannte
Leiser als der November

[Verse 2]
Kannst du es langsam sagen?
Ich fange nur Haelften auf
Die Form dessen, was du meinst
Ist ein Weg zwischen zwei Lachern

[Bridge]
Ich bin heute Nacht ein wenig verloren in dieser Stadt
Die Strassen neigen sich alle in dieselbe Richtung
Es gibt einen ruhigen Tisch beim Kerzenlicht
Und ich nehme ihn, wenn ich darf

[Verse 3]
Vielleicht ist die Antwort einfach
Vielleicht gehoert sie fast mir
Sanft gefragt, langsam beantwortet
Und der Abend geht gut

[Outro]
Langsam, vielleicht, langsam
Ich finde die Tuer wieder`,
  }),
  defineGuidedTrophySong({
    id: 'english-a1-practical-1-segment-2-wistful-trophy-song',
    pathId: 'english-a1-practical-1',
    segment: 2,
    vibe: 'wistful',
    trophyWords: ['almost', 'soft', 'again', 'a little', 'lingering'],
    styleFamily: 'electronic-downtempo',
    songStyleLabel: 'Electronic downtempo',
    musicCaption: 'Melancholic electronic downtempo at ~88 bpm with a reflective pulse, not danceable; Wistful voice - slightly more present and open than Segment 1, intimate but not whispered; controlled dynamics that slowly open across the song; soft sub bass, airy synth pads, subtle pulse percussion, light arpeggio, mildly reverbed vocal; clear English diction so "almost, soft, again, a little, lingering" all land cleanly - preserve the two-word "a little" with its natural spacing; avoid lo-fi study-beats cliche, avoid string-section melodrama, avoid sad-girl-pop chorus shape.',
    audioPublicUrl: '/guided/trophy-songs/a1p1/english-a1-practical-1-segment-2-wistful-trophy-song/candidate-a.mp3',
    audioCandidates: defineAudioCandidates(
      'english-a1-practical-1-segment-2-wistful-trophy-song',
      'https://tempfile.aiquickdraw.com/r/af636e1f04d24237abadadbaad8667c9.mp3',
      'https://tempfile.aiquickdraw.com/r/54b112099c3149bc887f9f08a07c3768.mp3',
    ),
    audioStatus: 'ready',
    rawLyricsWithWrappers: `[Verse 1]
<<Almost>> on the platform
The last train hums and waits
The minute holds its breath
Until the minute breaks

[Verse 2]
You spoke so <<soft>> at the pharmacy
The whole small room leaned in
Soft as a coat I borrowed
Soft as the place I've been

[Chorus]
I'd come <<again>>, I'd come closer
A <<lingering>> kind of thanks
Just <<a little>> longer at the door
Where the silence finally rests

[Verse 3]
Almost the train, almost the goodbye
Soft like a hand let go
And I'll come again, I'll come again
The way the old songs do

[Chorus]
I'd come again, I'd come closer
A lingering kind of thanks
Just a little longer at the door
Where the silence finally rests

[Outro]
A little, a little longer
Lingering, lingering home`,
    lyricsTranslationDe: `[Verse 1]
Fast auf dem Bahnsteig
Der letzte Zug summt und wartet
Die Minute haelt den Atem an
Bis die Minute bricht

[Verse 2]
Du sprachst so weich in der Apotheke
Der ganze kleine Raum lehnte sich hinein
Weich wie ein Mantel, den ich geliehen habe
Weich wie der Ort, an dem ich gewesen bin

[Chorus]
Ich wuerde wiederkommen, ich wuerde naeher kommen
Eine nachklingende Art von Dank
Nur ein wenig laenger an der Tuer
Wo die Stille endlich ruht

[Verse 3]
Fast der Zug, fast der Abschied
Weich wie eine losgelassene Hand
Und ich komme wieder, ich komme wieder
So wie die alten Lieder es tun

[Chorus]
Ich wuerde wiederkommen, ich wuerde naeher kommen
Eine nachklingende Art von Dank
Nur ein wenig laenger an der Tuer
Wo die Stille endlich ruht

[Outro]
Ein wenig, ein wenig laenger
Nachklingend, nachklingend nach Hause`,
  }),
  defineGuidedTrophySong({
    id: 'english-a1-practical-1-segment-1-sharp-trophy-song',
    pathId: 'english-a1-practical-1',
    segment: 1,
    vibe: 'sharp',
    trophyWords: ['clear', 'quick', 'straight', 'ready', 'exactly'],
    styleFamily: 'minimal-synth-pulse',
    songStyleLabel: 'Minimal synth pulse',
    musicCaption: 'Minimal synth pulse at ~104 bpm, tight and unornamented; Sharp / Precise voice - focused, direct, crisp, never rude, never robotic; controlled dry vocal with a clean attack, low ornamentation, no vocoder; one repeating synth motif, hat-driven percussion, sparse bass, no pads; clear English diction so "clear, quick, straight, ready, exactly" all land cleanly; avoid industrial darkness, avoid robot vocoder, avoid tough-guy posture, avoid EBM weight.',
    audioPublicUrl: '/guided/trophy-songs/a1p1/english-a1-practical-1-segment-1-sharp-trophy-song/candidate-a.mp3',
    audioCandidates: defineAudioCandidates(
      'english-a1-practical-1-segment-1-sharp-trophy-song',
      'https://tempfile.aiquickdraw.com/r/f462ef61197a4568a417f7aea446f6a7.mp3',
      'https://tempfile.aiquickdraw.com/r/cf19e68158394d308ca5dcf3884f1c11.mp3',
    ),
    audioStatus: 'ready',
    rawLyricsWithWrappers: `[Verse 1]
Coffee. Counter. <<Clear>> question.
You speak - I'm listening.
One short word - that's all I need.
The morning starts on time.

[Verse 2]
Repeat it once - but <<quick>>.
I caught it on the second beat.
A small ask in a busy room
And the room still feels complete.

[Chorus]
<<Straight>> ahead, three blocks down
I'm <<ready>>, count me in
<<Exactly>> on the corner, no delay
Right where we begin

[Verse 3]
Two coffees. Quick. No sugar.
Straight to the point and warm.
Clear voice, clean line, ready hand
Exactly to the form.

[Chorus]
Straight ahead, three blocks down
I'm ready, count me in
Exactly on the corner, no delay
Right where we begin

[Outro]
Clear. Quick. Set.
Straight. Ready. Exactly.`,
    lyricsTranslationDe: `[Verse 1]
Kaffee. Tresen. Klare Frage.
Du sprichst - ich hoere zu.
Ein kurzes Wort - das ist alles, was ich brauche.
Der Morgen beginnt puenktlich.

[Verse 2]
Wiederhole es einmal - aber schnell.
Ich habe es beim zweiten Schlag verstanden.
Eine kleine Bitte in einem vollen Raum
Und der Raum fuehlt sich trotzdem ganz an.

[Chorus]
Geradeaus, drei Blocks weiter
Ich bin bereit, zaehl auf mich
Genau an der Ecke, ohne Verspaetung
Dort, wo wir anfangen

[Verse 3]
Zwei Kaffees. Schnell. Kein Zucker.
Direkt auf den Punkt und warm.
Klare Stimme, saubere Linie, bereite Hand
Genau nach der Form.

[Chorus]
Geradeaus, drei Blocks weiter
Ich bin bereit, zaehl auf mich
Genau an der Ecke, ohne Verspaetung
Dort, wo wir anfangen

[Outro]
Klar. Schnell. Gesetzt.
Gerade. Bereit. Genau.`,
  }),
  defineGuidedTrophySong({
    id: 'english-a1-practical-1-segment-2-sharp-trophy-song',
    pathId: 'english-a1-practical-1',
    segment: 2,
    vibe: 'sharp',
    trophyWords: ['certain', 'focused', 'decided', 'settled', 'done'],
    styleFamily: 'crisp-percussive-pop',
    songStyleLabel: 'Crisp percussive pop',
    musicCaption: 'Crisp percussive pop at ~112 bpm, groove-led and confident; Sharp / Precise voice with a slightly warmer settled posture than Segment 1; direct vocal that is settled, not stiff, no ornamentation, no vocoder; clean drum kit forward in the mix, percussive muted plucks, melodic bass, minimal pads; clear English diction so "certain, focused, decided, settled, done" all land cleanly; avoid trap drums, avoid aggressive hip-hop posture, avoid electronic coldness, avoid boss-mode cliche.',
    audioPublicUrl: '/guided/trophy-songs/a1p1/english-a1-practical-1-segment-2-sharp-trophy-song/candidate-a.mp3',
    audioCandidates: defineAudioCandidates(
      'english-a1-practical-1-segment-2-sharp-trophy-song',
      'https://tempfile.aiquickdraw.com/r/b6393ccc7a7f4098bec1024465f5d153.mp3',
      'https://tempfile.aiquickdraw.com/r/33c67bbed8994f65b38fc03587c714b7.mp3',
    ),
    audioStatus: 'ready',
    rawLyricsWithWrappers: `[Verse 1]
<<Certain>> of the seven o'clock train
Platform two - I checked it twice
A short text, a clean reply
No guesswork, no advice

[Verse 2]
At the desk I keep it <<focused>>
One short need, one short line
"Two of these, please" - no extras
And the answer comes out fine

[Pre-Chorus]
Talked about the place out front
Yeah, it suits me well -

[Chorus]
<<Decided>>. Good place. Right call.
<<Settled>>. Seven. See you then.
<<Done>>. Thanks. On the road.
Don't have to say it twice

[Verse 3]
Certain hands, focused day
Decided on the way
Settled like the table when the meal is through
And I'm done - I'm on my way

[Chorus]
Decided. Good place. Right call.
Settled. Seven. See you then.
Done. Thanks. On the road.
Don't have to say it twice

[Outro]
Decided. Settled. Done.
Decided. Settled. Done.`,
    lyricsTranslationDe: `[Verse 1]
Sicher mit dem Zug um sieben Uhr
Bahnsteig zwei - ich habe es zweimal geprueft
Eine kurze Nachricht, eine klare Antwort
Kein Raten, kein Rat

[Verse 2]
Am Schalter bleibe ich fokussiert
Ein kurzer Bedarf, eine kurze Zeile
"Zwei davon, bitte" - nichts extra
Und die Antwort kommt gut heraus

[Pre-Chorus]
Wir sprachen ueber den Ort da vorne
Ja, er passt gut zu mir -

[Chorus]
Entschieden. Guter Ort. Richtige Wahl.
Geklaert. Sieben. Bis dann.
Fertig. Danke. Unterwegs.
Man muss es nicht zweimal sagen

[Verse 3]
Sichere Haende, fokussierter Tag
Auf dem Weg entschieden
Ruhig wie der Tisch, wenn das Essen vorbei ist
Und ich bin fertig - ich bin unterwegs

[Chorus]
Entschieden. Guter Ort. Richtige Wahl.
Geklaert. Sieben. Bis dann.
Fertig. Danke. Unterwegs.
Man muss es nicht zweimal sagen

[Outro]
Entschieden. Geklaert. Fertig.
Entschieden. Geklaert. Fertig.`,
  }),
  defineGuidedTrophySong({
    id: 'english-a1-practical-2-segment-1-bright-trophy-song',
    pathId: 'english-a1-practical-2',
    segment: 1,
    vibe: 'bright',
    trophyWords: ['happy', 'warm', 'right', 'fine', 'fresh'],
    styleFamily: 'soft-funk-open-window',
    songStyleLabel: 'Soft funk open window',
    musicCaption: 'Warm-analog soft funk at ~108 bpm with a mid-pocket syncopation and sixteenth-note ghost notes on the bass; clean chicken-pick electric guitar, live bass guitar carrying the harmony, Rhodes pad entering only on the chorus, tight dry kit with rim-shots, one handclap placed precisely on beat 2 of the chorus only; close dry vocal sitting just behind the beat, spoken-sung in the verses and lifted half a step on the chorus, single-take feel, no reverb wash; verse tight, chorus loose, settled bridge with a single Rhodes chord change, no chorus lift, no drop; clear English diction so "happy, warm, right, fine, fresh" all land cleanly inside the pocket; avoid fake corporate optimism, boss-mode posture, handclap-pop attractor, kids-show cadence, glossy top-40 lift, Vulfpeck pastiche, and smooth-jazz shimmer.',
    audioPublicUrl: '/guided/trophy-songs/a1p2/english-a1-practical-2-segment-1-bright-trophy-song/candidate-a.mp3',
    audioCandidates: defineAudioCandidates(
      'english-a1-practical-2-segment-1-bright-trophy-song',
      'https://tempfile.aiquickdraw.com/r/6922881a615e4019b3e703e3d45721b9.mp3',
      'https://tempfile.aiquickdraw.com/r/320b9ab9365f4b17a344a3bb2db1c364.mp3',
      'a1p2',
    ),
    audioStatus: 'ready',
    rawLyricsWithWrappers: `[Verse 1]
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
Which one - I held them out
You said either is <<fine>>
But the first one was the one
And you stayed a minute longer

[Bridge]
The street outside is gold
The bakery smells like a new week
I am not lost - I am late, that is all
And late today is fine

[Chorus]
I feel happy
A small, real, Friday kind of happy
You are warm, the room is fresh
And the answer was right

[Outro]
You smile, I smile
Friday is the right kind of day`,
    lyricsTranslationDe: `[Verse 1]
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
Freitag ist die richtige Art von Tag`,
  }),
  defineGuidedTrophySong({
    id: 'english-a1-practical-2-segment-2-bright-trophy-song',
    pathId: 'english-a1-practical-2',
    segment: 2,
    vibe: 'bright',
    trophyWords: ['easy', 'neat', 'kind', 'sure', 'cheerful'],
    styleFamily: 'highlife-walk',
    songStyleLabel: 'Highlife walk',
    musicCaption: 'Warm-analog highlife walk at ~100 bpm with two interlocking electric guitars, walking bass guitar, conga at the rhythmic centre, and hi-hat lifting the top end; rhythm guitar plays a soft repeating figure, lead guitar plays a brighter interlocking line, conga drives the floor, no rock kit; spoken-sung lead with a small group response on the hook only; circular two-chord pattern with a half-step lift on the hook; steady hypnotic walk, small textural lift on the bridge (conga louder, lead guitar quieter), no chorus lift, no drop; clear English diction so "easy, neat, kind, sure, cheerful" all land cleanly between the guitar parts; avoid caricature of any African idiom, children\'s-song bounce, big-band brass, stadium-anthem chord changes, and handclap-pop default.',
    audioPublicUrl: '/guided/trophy-songs/a1p2/english-a1-practical-2-segment-2-bright-trophy-song/candidate-a.mp3',
    audioCandidates: defineAudioCandidates(
      'english-a1-practical-2-segment-2-bright-trophy-song',
      'https://tempfile.aiquickdraw.com/r/8ec97eded0824121ae01df975e4766e6.mp3',
      'https://tempfile.aiquickdraw.com/r/be9b587a4b284547a20dc64b897c5e05.mp3',
      'a1p2',
    ),
    audioStatus: 'ready',
    rawLyricsWithWrappers: `[Verse 1]
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
A walking kind of song`,
    lyricsTranslationDe: `[Verse 1]
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
Eine gehende Art von Lied`,
  }),
  defineGuidedTrophySong({
    id: 'english-a1-practical-2-segment-1-wistful-trophy-song',
    pathId: 'english-a1-practical-2',
    segment: 1,
    vibe: 'wistful',
    trophyWords: ['maybe', 'kindly', 'somewhere', 'either', 'anywhere'],
    styleFamily: 'shoegaze-pulse',
    songStyleLabel: 'Shoegaze pulse',
    musicCaption: 'Shoegaze pulse at ~104 bpm with a straight rock pulse buried under two heavily reverbed electric guitars; bass guitar holding root notes, dry kit pushing through the wash, hidden vocal harmony entering only on the second chorus, no piano, no synth pad; airy buried-but-clear lead vocal that pushes through the guitar wall, never whispered, no ASMR, no heavy vibrato; minor-suspended verses with no resolution, single half-step lift only on the second chorus, outro strips back to one guitar; clear English diction so "maybe, kindly, somewhere, either, anywhere" all land cleanly through the wash; avoid trailer-crescendo, sad-girl-pop chorus shape, soft-folk default, felt-piano cliche, lo-fi study-beat haze, and karaoke vocal exposure.',
    audioPublicUrl: '/guided/trophy-songs/a1p2/english-a1-practical-2-segment-1-wistful-trophy-song/candidate-a.mp3',
    audioCandidates: defineAudioCandidates(
      'english-a1-practical-2-segment-1-wistful-trophy-song',
      'https://tempfile.aiquickdraw.com/r/26cba527c1be460aa6fc7e3e68afdbae.mp3',
      'https://tempfile.aiquickdraw.com/r/df707e96b4ca414cb7b603ff2bb94c6f.mp3',
      'a1p2',
    ),
    audioStatus: 'ready',
    rawLyricsWithWrappers: `[Verse 1]
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
And the door will stay half-open`,
    lyricsTranslationDe: `[Verse 1]
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
Und die Tuer bleibt halb offen`,
  }),
  defineGuidedTrophySong({
    id: 'english-a1-practical-2-segment-2-wistful-trophy-song',
    pathId: 'english-a1-practical-2',
    segment: 2,
    vibe: 'wistful',
    trophyWords: ['carefully', 'near', 'calm', 'simple', 'patient'],
    styleFamily: 'dub-techno-memory-loop',
    songStyleLabel: 'Dub-techno memory loop',
    musicCaption: 'Spacious dub-techno memory loop at ~118 bpm with a sparse dub pulse, kick on 1 and 3, and an off-beat detuned chord stab; sub-bass under the kick, dub-delay tail on the chord, distant pad, light clave on the off-beats, no full drum kit, no melodic synth lead; detached spoken-sung lead vocal close to the mic and slightly reverbed at the tails, patient without ever being sleepy; modal two-chord hypnotic loop, narrow melody, no chorus lift; bridge introduces one extra dub-delay layer and removes it again, no drop, no big build; clear English diction so "carefully, near, calm, simple, patient" all land cleanly above the dub delays; avoid club-anthem build-and-drop, sad-piano breakdown, lo-fi study-beat haze, ambient-folk default, and soft-felt-piano cliche.',
    audioPublicUrl: '/guided/trophy-songs/a1p2/english-a1-practical-2-segment-2-wistful-trophy-song/candidate-a.mp3',
    audioCandidates: defineAudioCandidates(
      'english-a1-practical-2-segment-2-wistful-trophy-song',
      'https://tempfile.aiquickdraw.com/r/fd0fe38ef2b145b78bf827644e592af2.mp3',
      'https://tempfile.aiquickdraw.com/r/29cd5d430dd14bab88a6c003e4aa2eeb.mp3',
      'a1p2',
    ),
    audioStatus: 'ready',
    rawLyricsWithWrappers: `[Section 1]
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
And the loop comes back`,
    lyricsTranslationDe: `[Section 1]
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
Und die Schleife kommt zurueck`,
  }),
  defineGuidedTrophySong({
    id: 'english-a1-practical-2-segment-1-sharp-trophy-song',
    pathId: 'english-a1-practical-2',
    segment: 1,
    vibe: 'sharp',
    trophyWords: ['short', 'spelling', 'sign', 'option', 'stock'],
    styleFamily: 'crisp-funk-bass-precision',
    songStyleLabel: 'Crisp funk-bass precision',
    musicCaption: 'Crisp funk-bass precision at ~108 bpm with a very tight syncopated pocket; percussive funk bass at the centre of the mix doing most of the harmonic work, muted clean electric guitar, dry kit with rim-shots and chorus-only handclaps placed precisely, one Rhodes accent on the chorus hook only, no synth, no pad; close dry vocal with tight timing, no vocoder, no melisma, no ornamentation, a crisp decisive Sharp posture with a small playful edge; steady groove, second chorus adds the Rhodes accent and removes it on the bridge, no chorus lift, no drop; clear English diction so "short, spelling, sign, option, stock" all land cleanly on the bass pocket; avoid Vulfpeck pastiche, comedy-funk, minimal-synth-grid attractor, boss-mode posture, motivational slogan energy, and smooth-jazz shimmer.',
    audioPublicUrl: '/guided/trophy-songs/a1p2/english-a1-practical-2-segment-1-sharp-trophy-song/candidate-a.mp3',
    audioCandidates: defineAudioCandidates(
      'english-a1-practical-2-segment-1-sharp-trophy-song',
      'https://tempfile.aiquickdraw.com/r/3681a5c9f96d4b4598de969762a2f491.mp3',
      'https://tempfile.aiquickdraw.com/r/c83df97002cd459fbae9ad5f6ee0b4d1.mp3',
      'a1p2',
    ),
    audioStatus: 'ready',
    rawLyricsWithWrappers: `[Verse 1]
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
"In <<stock>> today?" - "Yes, it is"
All three answered clean

[Verse 2]
A second at the page
A pen in someone's hand
Three small asks at a counter
And the bag slides into my hand

[Chorus]
The sign says open until ten
First option on the right
"In stock today?" - "Yes, it is"
All three answered clean

[Bridge]
The bass keeps the pocket
The pocket keeps the line
Three quick asks at a counter
And the corner makes me stop

[Outro]
The napkin's in my pocket
The address is in my head
Out the door, on the road`,
    lyricsTranslationDe: `[Verse 1]
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
Aus der Tuer, auf die Strasse`,
  }),
  defineGuidedTrophySong({
    id: 'english-a1-practical-2-segment-2-sharp-trophy-song',
    pathId: 'english-a1-practical-2',
    segment: 2,
    vibe: 'sharp',
    trophyWords: ['now', 'printed', 'direct', 'correct', 'wait'],
    styleFamily: 'drumline-precision',
    songStyleLabel: 'Drumline precision',
    musicCaption: 'Drumline precision at ~112 bpm with a marching snare pattern and no full drum kit; occasional bass drum hit, trumpet-and-alto-sax brass entering only on the chorus, no melodic instrument under the verses, no synth, no guitar; close dry vocal, tight timing, crisp Sharp posture that becomes briefly chant-like on the chorus hook; drums-and-voice only on the verse, brass enters on the chorus, brass exits on the verse return, bridge keeps the snare and adds a single new brass figure, no drop, no big build; clear English diction so "now, printed, direct, correct, wait" all land cleanly between the snare hits; avoid marching-band caricature, sports-anthem energy, motivational slogan tone, boss-battle posture, minimal-synth attractor, and aggressive hip-hop posture.',
    audioPublicUrl: '/guided/trophy-songs/a1p2/english-a1-practical-2-segment-2-sharp-trophy-song/candidate-a.mp3',
    audioCandidates: defineAudioCandidates(
      'english-a1-practical-2-segment-2-sharp-trophy-song',
      'https://tempfile.aiquickdraw.com/r/97cae96dd7eb42bdb9684638d6661ea0.mp3',
      'https://tempfile.aiquickdraw.com/r/dbc23e157508491ab09fdd2670882cdf.mp3',
      'a1p2',
    ),
    audioStatus: 'ready',
    rawLyricsWithWrappers: `[Verse 1]
Card on the counter, pay it <<now>>
"Could I have it <<printed>>, please?"
A small receipt slides across the desk
And the brass on the corner stays

[Chorus]
<<Direct>> at the desk, the name in line
"That is <<correct>>" - and the room is mine
A small bow back, a quick exchange
And the next door's missed

[Verse 2]
The platform sign, the route is true
Train pulling slow into the gate
"Is that the seven?" "Correct."
And the doors don't have to wait

[Chorus]
Direct at the desk, the name in line
"That is correct" - and the room is mine
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
Three small steps and out`,
    lyricsTranslationDe: `[Verse 1]
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
Drei kleine Schritte, und raus`,
  }),
]

export function deriveTrophySongClozePositions(rawLyricsWithWrappers: string): GuidedTrophySongClozePosition[] {
  const clozePattern = /<<([^<>]+)>>/
  return rawLyricsWithWrappers.split('\n').flatMap((wrappedLine, lineIndex) => {
    const match = clozePattern.exec(wrappedLine)
    if (!match) return []

    const wrappedWord = match[1] ?? ''
    const wrapperStart = match.index
    const word = normalizeTrophyWord(wrappedWord)

    return [{
      lineIndex,
      word,
      startChar: wrapperStart,
      endChar: wrapperStart + wrappedWord.length,
    }]
  })
}

export function stripTrophySongWrappers(rawLyricsWithWrappers: string) {
  return rawLyricsWithWrappers.replace(/<<([^<>]+)>>/g, '$1')
}

export function guidedTrophySongCandidateStorageKey(catalogId: string) {
  return `guided_trophy_song_candidate_${catalogId}`
}

export function resolveGuidedTrophySongCandidate(
  candidates: Partial<Record<GuidedTrophySongCandidateId, GuidedTrophySongAudioCandidate>>,
  storedCandidate: string | null | undefined,
  fallbackCandidate: GuidedTrophySongCandidateId = 'A',
): GuidedTrophySongCandidateId | undefined {
  if (isGuidedTrophySongCandidateId(storedCandidate) && candidates[storedCandidate]?.publicUrl) {
    return storedCandidate
  }
  if (candidates[fallbackCandidate]?.publicUrl) {
    return fallbackCandidate
  }
  if (candidates.A?.publicUrl) return 'A'
  if (candidates.B?.publicUrl) return 'B'
  return undefined
}

export function readGuidedTrophySongCandidate(
  catalogId: string,
  candidates: Partial<Record<GuidedTrophySongCandidateId, GuidedTrophySongAudioCandidate>>,
  fallbackCandidate: GuidedTrophySongCandidateId = 'A',
) {
  if (!canUseLocalStorage()) {
    return resolveGuidedTrophySongCandidate(candidates, undefined, fallbackCandidate)
  }

  try {
    return resolveGuidedTrophySongCandidate(
      candidates,
      window.localStorage.getItem(guidedTrophySongCandidateStorageKey(catalogId)),
      fallbackCandidate,
    )
  } catch {
    return resolveGuidedTrophySongCandidate(candidates, undefined, fallbackCandidate)
  }
}

export function writeGuidedTrophySongCandidate(catalogId: string, candidate: GuidedTrophySongCandidateId) {
  if (!canUseLocalStorage()) return

  try {
    window.localStorage.setItem(guidedTrophySongCandidateStorageKey(catalogId), candidate)
  } catch {
    // Ignore storage write failures; candidate selection still works in memory.
  }
}

function defineGuidedTrophySong(input: GuidedTrophySongInput): GuidedTrophySongCatalogRow {
  const displayLyrics = stripTrophySongWrappers(input.rawLyricsWithWrappers)
  const clozePositions = deriveTrophySongClozePositions(input.rawLyricsWithWrappers)
  const displayLines = displayLyrics.split('\n')

  return {
    ...input,
    providerLyrics: displayLyrics,
    displayLyrics,
    studyLines: clozePositions.map((position) => ({
      lineIndex: position.lineIndex,
      line: displayLines[position.lineIndex] ?? '',
      hiddenWord: position.word,
    })),
    clozePositions,
    audioCandidates: input.audioCandidates ?? {},
    activeCandidateDefault: input.activeCandidateDefault ?? 'A',
    audioPublicUrl: input.audioPublicUrl ?? null,
    audioStatus: input.audioStatus ?? 'missing',
  }
}

function normalizeTrophyWord(word: string) {
  return word.trim().toLowerCase()
}

function defineAudioCandidates(catalogId: string, providerUrlA: string, providerUrlB?: string, assetCollection = 'a1p1') {
  return {
    A: {
      publicUrl: `/guided/trophy-songs/${assetCollection}/${catalogId}/candidate-a.mp3`,
      providerUrl: providerUrlA,
    },
    ...(providerUrlB
      ? {
          B: {
            publicUrl: `/guided/trophy-songs/${assetCollection}/${catalogId}/candidate-b.mp3`,
            providerUrl: providerUrlB,
          },
        }
      : {}),
  } satisfies Partial<Record<GuidedTrophySongCandidateId, GuidedTrophySongAudioCandidate>>
}

function isGuidedTrophySongCandidateId(value: string | null | undefined): value is GuidedTrophySongCandidateId {
  return value === 'A' || value === 'B'
}

function canUseLocalStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}
