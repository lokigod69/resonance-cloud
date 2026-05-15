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
    trophyWords: ['lovely', 'glad', 'brilliant', 'ready', 'charming'],
    styleFamily: 'sunlit-acoustic-pop',
    songStyleLabel: 'Sunlit acoustic pop',
    musicCaption: 'Sunlit acoustic pop with a Bright, confident, encouraging voice; mid-tempo around 104 bpm, singable and warm but not childish; bright lead vocal with light harmony on the hook, clean consonants, no melisma; acoustic guitar, soft piano taps, brushed kit, handclap lift, warm bass; clear English diction so "lovely, glad, brilliant, ready, charming" all land cleanly; avoid nursery-rhyme bounce, avoid generic commercial jingle, avoid over-polished EDM-pop.',
    audioPublicUrl: '/guided/trophy-songs/a1p2/english-a1-practical-2-segment-1-bright-trophy-song/candidate-a.mp3',
    audioCandidates: defineAudioCandidates(
      'english-a1-practical-2-segment-1-bright-trophy-song',
      'https://tempfile.aiquickdraw.com/r/953eaa629e914c3ca7eb0b94fca9b1ca.mp3',
      'https://tempfile.aiquickdraw.com/r/1519352f29cb424a9bcbea91db912c4b.mp3',
      'a1p2',
    ),
    audioStatus: 'ready',
    rawLyricsWithWrappers: `[Verse 1]
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
Brilliant, ready, thanks to you`,
    lyricsTranslationDe: `[Verse 1]
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
Prima, bereit, dank dir`,
  }),
  defineGuidedTrophySong({
    id: 'english-a1-practical-2-segment-2-bright-trophy-song',
    pathId: 'english-a1-practical-2',
    segment: 2,
    vibe: 'bright',
    trophyWords: ['easy', 'splendid', 'kind', 'sure', 'cheerful'],
    styleFamily: 'bright-handclap-pop',
    songStyleLabel: 'Bright handclap pop',
    musicCaption: 'Bright handclap pop at ~112 bpm with a warm, confident reward feel; Bright voice - encouraging, socially generous, clear, never childish; crisp lead vocal with a small group lift on the hook, no melisma; muted guitar, handclaps, light piano, rounded bass, clean pop kit; clear English diction so "easy, splendid, kind, sure, cheerful" all land cleanly; avoid kids-song cadence, avoid stadium chant, avoid glossy top-40 excess.',
    audioPublicUrl: '/guided/trophy-songs/a1p2/english-a1-practical-2-segment-2-bright-trophy-song/candidate-a.mp3',
    audioCandidates: defineAudioCandidates(
      'english-a1-practical-2-segment-2-bright-trophy-song',
      'https://tempfile.aiquickdraw.com/r/695d1a4117664fdd9708a8a9e1e7fe5f.mp3',
      'https://tempfile.aiquickdraw.com/r/6cb4542279614172ac8234f00177423e.mp3',
      'a1p2',
    ),
    audioStatus: 'ready',
    rawLyricsWithWrappers: `[Verse 1]
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

[Outro]
Cheerful, sure, easy
Splendid, kind, and free`,
    lyricsTranslationDe: `[Verse 1]
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
Prima, freundlich und frei`,
  }),
  defineGuidedTrophySong({
    id: 'english-a1-practical-2-segment-1-wistful-trophy-song',
    pathId: 'english-a1-practical-2',
    segment: 1,
    vibe: 'wistful',
    trophyWords: ['gently', 'slowly', 'perhaps', 'quiet', 'soft'],
    styleFamily: 'moonlit-indie-folk',
    songStyleLabel: 'Moonlit indie folk',
    musicCaption: 'Moonlit indie folk at ~78 bpm, soft and reflective without melodrama; Wistful voice - spacious, careful, intimate but not whispered; clear vocal with breath around phrase endings, no ASMR, no heavy vibrato; fingerpicked guitar, muted felt piano, brushed cymbals, low warm bass, faint pad; clear English diction so "gently, slowly, perhaps, quiet, soft" all land cleanly; avoid piano-ballad cliche, avoid sad-girl-pop shape, avoid sleepy monotone.',
    audioPublicUrl: '/guided/trophy-songs/a1p2/english-a1-practical-2-segment-1-wistful-trophy-song/candidate-a.mp3',
    audioCandidates: defineAudioCandidates(
      'english-a1-practical-2-segment-1-wistful-trophy-song',
      'https://tempfile.aiquickdraw.com/r/a952897ee2144ea5b2e83a8bd5bc3344.mp3',
      'https://tempfile.aiquickdraw.com/r/155b70628ffe463ca5970753dd72312f.mp3',
      'a1p2',
    ),
    audioStatus: 'ready',
    rawLyricsWithWrappers: `[Verse 1]
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
Perhaps I know it now`,
    lyricsTranslationDe: `[Verse 1]
Sag es sanft, ich bin nah
Der Raum ist voll halb gehoerter Geraeusche
Wenn du es langsam schreibst
Kann ich folgen, was ich gefunden habe

[Chorus]
Vielleicht hier, vielleicht so
Eine ruhige Markierung neben der Zeile
Halte es weich, halte es nah
Weich genug, damit ich es versuche

[Verse 2]
Du hast auf das kleinere Schild gezeigt
Und gewartet, waehrend ich verstand
Langsam, sanft, da war es
Eine Tuer, durch die ich gehen konnte

[Chorus]
Vielleicht hier, vielleicht so
Eine ruhige Markierung neben der Zeile
Halte es weich, halte es nah
Weich genug, damit ich es versuche

[Bridge]
Keine Eile in der Antwort
Keine Scham in der Pause
Nur ein weich geoeffnetes Fenster
Und eine Zeile, die fast spricht

[Outro]
Weich genug, ruhig genug
Vielleicht weiss ich es jetzt`,
  }),
  defineGuidedTrophySong({
    id: 'english-a1-practical-2-segment-2-wistful-trophy-song',
    pathId: 'english-a1-practical-2',
    segment: 2,
    vibe: 'wistful',
    trophyWords: ['again', 'near', 'calm', 'simple', 'patient'],
    styleFamily: 'soft-downtempo-folk',
    songStyleLabel: 'Soft downtempo folk',
    musicCaption: 'Soft downtempo folk at ~84 bpm with a gentle pulse and reflective space; Wistful voice - calm, patient, warm but restrained; close vocal with clean diction and soft phrase endings, no melodrama; nylon guitar, low brushed beat, small electric piano motif, airy pad, rounded bass; clear English diction so "again, near, calm, simple, patient" all land cleanly; avoid lo-fi haze, avoid piano-ballad weight, avoid overly poetic obscurity.',
    audioPublicUrl: '/guided/trophy-songs/a1p2/english-a1-practical-2-segment-2-wistful-trophy-song/candidate-a.mp3',
    audioCandidates: defineAudioCandidates(
      'english-a1-practical-2-segment-2-wistful-trophy-song',
      'https://tempfile.aiquickdraw.com/r/81b07c63ac4341aba2ddbd6b7a0fbce1.mp3',
      'https://tempfile.aiquickdraw.com/r/ed35e1d9dbab4612848d4ca19856fb24.mp3',
      'a1p2',
    ),
    audioStatus: 'ready',
    rawLyricsWithWrappers: `[Verse 1]
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
Near the light again`,
    lyricsTranslationDe: `[Verse 1]
Sag es noch einmal am Tresen
Das Kartenlicht wird gruen
Die Quittung ist irgendwo nah
Bei der Tuer, halb gesehen

[Chorus]
Bleib ruhig, bleib nah
Halte es einfach, noch eine Zeile
Geduldig, waehrend der Raum langsamer wird
Geduldig mit der Zeit

[Verse 2]
Mein Name steht auf dem Papier
Du hast ihn im Licht gefunden
Nah genug, um ihn zu beruehren
Einfach genug, um es zu wissen

[Chorus]
Bleib ruhig, bleib nah
Halte es einfach, noch eine Zeile
Geduldig, waehrend der Raum langsamer wird
Geduldig mit der Zeit

[Bridge]
Noch einmal frage ich leise
Noch einmal machst du es klar
Nahe der ruhigen Tuer
Kann ich wieder anfangen

[Outro]
Ruhig, einfach, geduldig
Nahe am Licht, noch einmal`,
  }),
  defineGuidedTrophySong({
    id: 'english-a1-practical-2-segment-1-sharp-trophy-song',
    pathId: 'english-a1-practical-2',
    segment: 1,
    vibe: 'sharp',
    trophyWords: ['clear', 'quick', 'exactly', 'decided', 'certain'],
    styleFamily: 'clean-synth-grid',
    songStyleLabel: 'Clean synth grid',
    musicCaption: 'Clean synth grid at ~108 bpm, crisp and precise with a compact reward hook; Sharp voice - direct, controlled, high-contrast, never rude or robotic; dry lead vocal with tight timing, no vocoder, no ornamentation; short synth pluck motif, clipped hats, low square bass, minimal kick, no pads washing over diction; clear English diction so "clear, quick, exactly, decided, certain" all land cleanly; avoid industrial darkness, avoid trap posture, avoid boss-mode cliche.',
    audioPublicUrl: '/guided/trophy-songs/a1p2/english-a1-practical-2-segment-1-sharp-trophy-song/candidate-a.mp3',
    audioCandidates: defineAudioCandidates(
      'english-a1-practical-2-segment-1-sharp-trophy-song',
      'https://tempfile.aiquickdraw.com/r/d77dedd0971441cf8277c158860c7703.mp3',
      'https://tempfile.aiquickdraw.com/r/c027f0663ce94e05ad98a97964d6967b.mp3',
      'a1p2',
    ),
    audioStatus: 'ready',
    rawLyricsWithWrappers: `[Verse 1]
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
Exactly. Decided. Done.`,
    lyricsTranslationDe: `[Verse 1]
Mach es klar auf der Seite
Eine saubere Zeile, kein Abdriften
Halte es schnell, ich kann es nutzen
Zeig mir, wo es passt

[Chorus]
Genau dort, kein zweites Raten
Jetzt entschieden, dieses hier
Sicher in den kleinen Schritten
Sicher, wenn es fertig ist

[Verse 2]
Tresen. Wahl. Kurze Antwort.
Das Schild ist in meinem Blick
Klar genug, um mich weiterzubringen
Schnell genug fuer richtig

[Chorus]
Genau dort, kein zweites Raten
Jetzt entschieden, dieses hier
Sicher in den kleinen Schritten
Sicher, wenn es fertig ist

[Bridge]
Keine Extra-Worte darum herum
Kein Nebel im Klang
Genau heisst, ich habe es gefunden
Entschieden heisst, ich habe gefunden

[Outro]
Klar. Schnell. Sicher.
Genau. Entschieden. Fertig.`,
  }),
  defineGuidedTrophySong({
    id: 'english-a1-practical-2-segment-2-sharp-trophy-song',
    pathId: 'english-a1-practical-2',
    segment: 2,
    vibe: 'sharp',
    trophyWords: ['straight', 'focused', 'direct', 'settled', 'done'],
    styleFamily: 'crisp-bass-pop',
    songStyleLabel: 'Crisp bass pop',
    musicCaption: 'Crisp bass pop at ~114 bpm, compact and precise with a dry rhythmic hook; Sharp voice - direct, settled, focused, warm enough for service moments but never soft-edged; tight vocal timing, no vocoder, no melisma; punchy bass, clipped guitar mutes, clean kit, small synth accent, sparse harmony only on the hook; clear English diction so "straight, focused, direct, settled, done" all land cleanly; avoid aggressive hip-hop posture, avoid cold techno, avoid motivational slogan energy.',
    audioPublicUrl: '/guided/trophy-songs/a1p2/english-a1-practical-2-segment-2-sharp-trophy-song/candidate-a.mp3',
    audioCandidates: defineAudioCandidates(
      'english-a1-practical-2-segment-2-sharp-trophy-song',
      'https://tempfile.aiquickdraw.com/r/e37d71cdd3834d00bff9833d7a267646.mp3',
      'https://tempfile.aiquickdraw.com/r/eae1db88a8a149c087001afd9cd0fe79.mp3',
      'a1p2',
    ),
    audioStatus: 'ready',
    rawLyricsWithWrappers: `[Verse 1]
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

[Outro]
Direct. Settled. Done.
Direct. Settled. Done.`,
    lyricsTranslationDe: `[Verse 1]
Karte zuerst, direkt zum Bezahlen
Quittung bei der Tuer
Augen konzentriert auf den Tresen
Ich muss nicht mehr fragen

[Chorus]
Halte es direkt, halte es sauber
Geklaert in einer Zeile
Fertig heisst fertig, und fertig heisst fertig
Genau rechtzeitig

[Verse 2]
Reservierung. Name geprueft.
Die Antwort landet an ihrem Platz
Ein direkter kleiner Satz
Geklaert auf meinem Gesicht

[Chorus]
Halte es direkt, halte es sauber
Geklaert in einer Zeile
Fertig heisst fertig, und fertig heisst fertig
Genau rechtzeitig

[Bridge]
Direkt ist der Weg hinaus
Konzentriert ist der Blick
Fertig ist die kleine Tuer, die sich schliesst
Sauber nach dir

[Outro]
Direkt. Geklaert. Fertig.
Direkt. Geklaert. Fertig.`,
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
