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
