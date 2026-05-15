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
