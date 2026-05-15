import type { GuidedSegmentReviewNumber } from '@/lib/guidedCheckpoint'

export type GuidedSegmentStoryBeat = {
  lessonNumber: number
  scene: string
}

export type GuidedSegmentStory = {
  title: string
  intro: string
  beats: GuidedSegmentStoryBeat[]
}

type StoryKey = `${string}:${GuidedSegmentReviewNumber}`

const STORIES: Record<StoryKey, GuidedSegmentStory> = {
  'english-a1-practical-1:1': {
    title: 'Ein erster Morgen auf Englisch',
    intro: 'Du gehst durch die Stadt und brauchst Englisch zum ersten Mal. Fünf kleine Momente — von Hallo bis Preis.',
    beats: [
      { lessonNumber: 1, scene: 'Du sprichst die erste Person an.' },
      { lessonNumber: 2, scene: 'Du hast nicht alles verstanden und bittest höflich um Wiederholung.' },
      { lessonNumber: 3, scene: 'Du brauchst den Weg zum Bahnhof.' },
      { lessonNumber: 4, scene: 'Du gehst kurz ins Café und bestellst.' },
      { lessonNumber: 5, scene: 'An der Kasse fragst du nach dem Preis.' },
    ],
  },
  'english-a1-practical-1:2': {
    title: 'Vom Zug bis zum Abschied',
    intro: 'Der Tag geht weiter. Du planst die Reise, sagst was du brauchst, und verabschiedest dich.',
    beats: [
      { lessonNumber: 6, scene: 'Am Bahnhof fragst du nach der Abfahrt.' },
      { lessonNumber: 7, scene: 'Du sagst klar, was du gerade brauchst.' },
      { lessonNumber: 8, scene: 'Du machst Small Talk über den Ort.' },
      { lessonNumber: 9, scene: 'Ihr macht für morgen einen Plan aus.' },
      { lessonNumber: 10, scene: 'Du verabschiedest dich mit Dank.' },
    ],
  },
  'english-a1-practical-2:1': {
    title: 'Du brauchst kleine Hilfe',
    intro: 'Ein Gespräch läuft, aber du verstehst nicht alles. Fünf kleine Schritte, um Hilfe zu holen.',
    beats: [
      { lessonNumber: 1, scene: 'Du sagst ehrlich, dass du nicht verstanden hast.' },
      { lessonNumber: 2, scene: 'Du bittest, es kurz aufzuschreiben.' },
      { lessonNumber: 3, scene: 'Du bittest, es dir zu zeigen.' },
      { lessonNumber: 4, scene: 'Du fragst, welche Option es ist.' },
      { lessonNumber: 5, scene: 'Du fragst, ob es etwas gibt.' },
    ],
  },
  'english-a1-practical-2:2': {
    title: 'Du wirst konkret',
    intro: 'Jetzt wird es konkret: bezahlen, prüfen, einen kurzen Moment Zeit erbitten.',
    beats: [
      { lessonNumber: 6, scene: 'Du sagst, wie du zahlen möchtest.' },
      { lessonNumber: 7, scene: 'Du bittest um einen Beleg.' },
      { lessonNumber: 8, scene: 'Du erklärst, dass du reserviert hast.' },
      { lessonNumber: 9, scene: 'Du prüfst kurz, ob alles stimmt.' },
      { lessonNumber: 10, scene: 'Du bittest um einen Moment.' },
    ],
  },
  'english-a1-practical-3:1': {
    title: 'Unterwegs in der Stadt',
    intro: 'Du bist neu hier und musst dich orientieren. Fünf kleine Fragen für den Weg.',
    beats: [
      { lessonNumber: 1, scene: 'Du fragst nach der Richtung.' },
      { lessonNumber: 2, scene: 'Du fragst, wie weit es noch ist.' },
      { lessonNumber: 3, scene: 'Du willst wissen, ob es schon offen ist.' },
      { lessonNumber: 4, scene: 'Du fragst, welcher Bus dich hinbringt.' },
      { lessonNumber: 5, scene: 'Du klärst die nächste Haltestelle.' },
    ],
  },
  'english-a1-practical-3:2': {
    title: 'Fast da',
    intro: 'Tickets, Zeiten, kleine Korrekturen — du bist fast am Ziel.',
    beats: [
      { lessonNumber: 6, scene: 'Du kaufst dein Ticket.' },
      { lessonNumber: 7, scene: 'Du fragst nach den Öffnungszeiten.' },
      { lessonNumber: 8, scene: 'Du beschreibst eine Ecke als Orientierung.' },
      { lessonNumber: 9, scene: 'Du entscheidest dich für die Art zu kommen.' },
      { lessonNumber: 10, scene: 'Du sagst, dass du die Haltestelle verpasst hast.' },
    ],
  },
  'english-a1-practical-4:1': {
    title: 'Ankommen im Café',
    intro: 'Du kommst im Café oder Shop an. Du fragst nach Tisch, Karte, Getränk, Wunsch und Frische.',
    beats: [
      { lessonNumber: 1, scene: 'Du fragst am Eingang nach einem Tisch.' },
      { lessonNumber: 2, scene: 'Du bittest um die Karte oder schaust kurz hinein.' },
      { lessonNumber: 3, scene: 'Du bestellst ein einfaches Getränk.' },
      { lessonNumber: 4, scene: 'Du sagst klar, dass du keinen Zucker möchtest.' },
      { lessonNumber: 5, scene: 'Du fragst an der Auslage, ob es frisch ist.' },
    ],
  },
  'english-a1-practical-4:2': {
    title: 'Bestellung abschließen',
    intro: 'Die Bestellung ist fast fertig. Du sagst, was noch fehlt, nimmst etwas mit und beendest den Besuch höflich.',
    beats: [
      { lessonNumber: 6, scene: 'Du entscheidest, ob noch etwas dazukommt.' },
      { lessonNumber: 7, scene: 'Du sagst, dass du die Bestellung mitnehmen möchtest.' },
      { lessonNumber: 8, scene: 'Du gibst ein kurzes Lob nach dem Essen oder Trinken.' },
      { lessonNumber: 9, scene: 'Du machst einen kleinen Satz Small Talk am Tresen.' },
      { lessonNumber: 10, scene: 'Du fragst nach der Rechnung und schließt freundlich ab.' },
    ],
  },
  'english-a1-practical-5:1': {
    title: 'Eine kleine Panne klären',
    intro: 'Etwas läuft nicht ganz rund. Du entschuldigst dich, ordnest die Situation und kommst wieder ins Gespräch.',
    beats: [
      { lessonNumber: 1, scene: 'Du kommst spät an und entschuldigst dich kurz.' },
      { lessonNumber: 2, scene: 'Du sagst ehrlich, dass du etwas vergessen hast.' },
      { lessonNumber: 3, scene: 'Du fragst nach dem Namen, damit ihr weitermachen könnt.' },
      { lessonNumber: 4, scene: 'Du reagierst freundlich auf die Vorstellung.' },
      { lessonNumber: 5, scene: 'Du fragst locker, woher die andere Person kommt.' },
    ],
  },
  'english-a1-practical-5:2': {
    title: 'Einen einfachen Plan machen',
    intro: 'Das Gespräch wird konkreter. Du prüfst Ort und Zeit, schlägst etwas vor und bestätigst den Plan.',
    beats: [
      { lessonNumber: 6, scene: 'Du fragst, ob die Person hier wohnt.' },
      { lessonNumber: 7, scene: 'Du prüfst, ob heute Abend Zeit ist.' },
      { lessonNumber: 8, scene: 'Du schlägst das Café als Treffpunkt vor.' },
      { lessonNumber: 9, scene: 'Du verschiebst den Plan freundlich auf morgen.' },
      { lessonNumber: 10, scene: 'Du verabschiedest dich und bestätigst morgen.' },
    ],
  },
  'english-a1-practical-6:1': {
    title: 'Kleine Hilfe in der Apotheke',
    intro: 'Dir geht es nicht gut. Du suchst eine Apotheke, sagst kurz, was du brauchst, und bleibst bei einfachen Sätzen.',
    beats: [
      { lessonNumber: 1, scene: 'Du sagst, dass es dir nicht gut geht.' },
      { lessonNumber: 2, scene: 'Du fragst nach einer Apotheke in der Nähe.' },
      { lessonNumber: 3, scene: 'Du bittest allgemein um Medizin.' },
      { lessonNumber: 4, scene: 'Du zeigst, wo es weh tut.' },
      { lessonNumber: 5, scene: 'Du sagst, dass du Kopfschmerzen hast.' },
    ],
  },
  'english-a1-practical-6:2': {
    title: 'Ruhig Hilfe holen und abschließen',
    intro: 'Du klärst kleine Bedürfnisse: Wasser, Arzt, Allergie, Hilfe rufen. Am Ende sagst du, dass es besser ist.',
    beats: [
      { lessonNumber: 6, scene: 'Du bittest um Wasser.' },
      { lessonNumber: 7, scene: 'Du fragst, ob ein Arzt in der Nähe ist.' },
      { lessonNumber: 8, scene: 'Du sagst, dass du eine Allergie hast.' },
      { lessonNumber: 9, scene: 'Du bittest jemanden, Hilfe zu rufen.' },
      { lessonNumber: 10, scene: 'Du bedankst dich und sagst, dass es dir besser geht.' },
    ],
  },
  'english-a1-practical-7:1': {
    title: 'Am Bahnhof orientieren',
    intro: 'Du bist am Bahnhof oder in der Nähe. Du fragst nach Ticket, Bus, Zeit, Zug und Taxi.',
    beats: [
      { lessonNumber: 1, scene: 'Du bittest am Schalter um eine Fahrkarte.' },
      { lessonNumber: 2, scene: 'Du suchst den Bus oder die Haltestelle.' },
      { lessonNumber: 3, scene: 'Du fragst, wann Bus oder Zug abfährt.' },
      { lessonNumber: 4, scene: 'Du prüfst, ob es der richtige Zug ist.' },
      { lessonNumber: 5, scene: 'Du bittest darum, ein Taxi zu rufen.' },
    ],
  },
  'english-a1-practical-7:2': {
    title: 'Die Fahrt abschließen',
    intro: 'Du klärst das Ziel, bittest ums Anhalten, fragst nach der Dauer und sagst am Ende, dass du angekommen bist.',
    beats: [
      { lessonNumber: 6, scene: 'Du bestätigst, dass ihr dorthin fahren könnt.' },
      { lessonNumber: 7, scene: 'Du bittest den Fahrer, hier zu halten.' },
      { lessonNumber: 8, scene: 'Du sagst, dass du zum Bahnhof fährst.' },
      { lessonNumber: 9, scene: 'Du fragst, wie lange die Fahrt dauert.' },
      { lessonNumber: 10, scene: 'Du sagst, dass du angekommen bist.' },
    ],
  },
  'english-a1-practical-8:1': {
    title: 'Ankommen im Hotel',
    intro: 'Du kommst im Hotel oder Gästehaus an. Du nennst die Reservierung, fragst nach Zimmer, Schlüssel und WLAN.',
    beats: [
      { lessonNumber: 1, scene: 'Du sagst an der Rezeption, dass du eine Reservierung hast.' },
      { lessonNumber: 2, scene: 'Du bittest kurz um ein Zimmer.' },
      { lessonNumber: 3, scene: 'Du fragst, wo dein Zimmer ist.' },
      { lessonNumber: 4, scene: 'Du fragst nach dem Schlüssel.' },
      { lessonNumber: 5, scene: 'Du fragst, ob es WLAN gibt.' },
    ],
  },
  'english-a1-practical-8:2': {
    title: 'Im Zimmer und beim Abschied',
    intro: 'Du klärst einfache Dinge im Aufenthalt: Bad, Handtuch, Schlaf, Frühstück und Auschecken.',
    beats: [
      { lessonNumber: 6, scene: 'Du fragst, wo das Bad ist.' },
      { lessonNumber: 7, scene: 'Du bittest um ein Handtuch.' },
      { lessonNumber: 8, scene: 'Du sagst, dass du schlafen möchtest.' },
      { lessonNumber: 9, scene: 'Du fragst nach der Frühstückszeit.' },
      { lessonNumber: 10, scene: 'Du sagst an der Rezeption, dass du auscheckst.' },
    ],
  },
  'english-a1-practical-9:1': {
    title: 'Ein Treffen abmachen',
    intro: 'Du lernst jemanden kennen, fragst nach Zeit, schlägst später vor und einigst dich auf einen Ort.',
    beats: [
      { lessonNumber: 1, scene: 'Du begrüßt eine neue Person höflich.' },
      { lessonNumber: 2, scene: 'Du fragst, ob die Person heute Zeit hat.' },
      { lessonNumber: 3, scene: 'Du schlägst vor, euch später zu treffen.' },
      { lessonNumber: 4, scene: 'Du fragst, welche Uhrzeit passt.' },
      { lessonNumber: 5, scene: 'Du schlägst diesen Ort als Treffpunkt vor.' },
    ],
  },
  'english-a1-practical-9:2': {
    title: 'Plan klären und verabschieden',
    intro: 'Du wartest draußen, meldest eine Verspätung, änderst den Plan und schließt den Abend höflich ab.',
    beats: [
      { lessonNumber: 6, scene: 'Du sagst, dass du draußen wartest.' },
      { lessonNumber: 7, scene: 'Du meldest, dass du spät dran bist.' },
      { lessonNumber: 8, scene: 'Du fragst, ob ihr den Plan ändern könnt.' },
      { lessonNumber: 9, scene: 'Du bestätigst, dass ihr euch morgen seht.' },
      { lessonNumber: 10, scene: 'Du verabschiedest dich höflich am Abend.' },
    ],
  },
}

export function getGuidedSegmentStory(
  pathId: string,
  segment: GuidedSegmentReviewNumber,
): GuidedSegmentStory | undefined {
  return STORIES[`${pathId}:${segment}` as StoryKey]
}

export function getGuidedSegmentSceneForLesson(
  pathId: string,
  segment: GuidedSegmentReviewNumber,
  lessonNumber: number,
): string | undefined {
  return getGuidedSegmentStory(pathId, segment)?.beats.find((beat) => beat.lessonNumber === lessonNumber)?.scene
}
