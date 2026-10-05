/** Offline authoring contract. Drafts are deliberately absent from the app registry. */
import { z } from 'zod'
import { GUIDED_LESSONS } from '../../src/data/guidedLessonsAuthoring'

const text = z.string().min(1).refine(value => value === value.trim(), 'Unexpected edge whitespace')
const base = z.object({ de: text, en: text.optional() }).strict()
const bilingual = z.object({ de: text, en: text }).strict()
const translated = z.object({ targetText: text, baseText: base }).strict()
const blank = z.object({
  kind: z.enum(['form', 'connector', 'choice']), answer: text,
  cue: text.optional(), choices: z.array(text).length(4),
}).strict()
export const b1DraftSchema = z.object({
  schemaVersion: z.literal(1), status: z.literal('draft'), level: z.literal('B1'),
  targetLanguage: z.enum(['English', 'Spanish', 'French', 'Italian', 'Portuguese']),
  targetLanguageCode: z.enum(['en-US', 'es-ES', 'fr-FR', 'it-IT', 'pt-BR']),
  baseLanguage: z.literal('German'), pathNumber: z.number().int().min(1).max(10),
  title: base, subtitle: base, anchor: text,
  lessons: z.array(z.object({
    slug: text.refine(value => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value), 'Expected an ASCII slug'),
    title: base, situation: bilingual, pedagogicalGoal: text,
    register: z.enum(['neutral', 'formal', 'informal']),
    dialogue: z.tuple([translated, translated, translated, translated]),
    pattern: z.object({ label: text, rule: base, examples: z.array(translated.extend({ highlight: text }).strict()).min(2).max(3) }).strict(),
    cloze: z.array(z.union([z.string(), blank])).min(3),
    chunks: z.array(translated).min(4).max(7),
    terms: z.array(translated).min(6).max(8),
    recall: z.object({ before: z.string(), answer: text, after: z.string(), fallbackChoices: z.array(text).length(4) }).strict(),
    speakRequired: z.tuple([text, text, text]), sceneCaption: base,
    trophyWord: z.object({ word: text, meaning: base, example: text, whyThisWord: base }).strict(),
    distractors: z.tuple([text, text]), placeholderCaption: base,
    songMood: text, visualNotes: text,
  }).strict()).length(10),
}).strict()
export type B1Draft = z.infer<typeof b1DraftSchema>
const fold = (value: string) => value.normalize('NFC').toLocaleLowerCase()
const words = (value: string): string[] => fold(value).match(/[\p{L}\p{N}]+/gu) ?? []

type Rule = { re: RegExp; scope: 'learner' | 'all'; except?: number[] }
type LanguageRules = { register?: 'formal'; deInformal: RegExp; deFormal: RegExp; clitic: RegExp; rules: Rule[] }
/** Unicode-safe word boundary: JS \b is ASCII-only, so accented edges (andò, és, tá) need lookarounds. */
const w = (source: string) => new RegExp(String.raw`(?<![\p{L}\p{N}])(?:${source})(?![\p{L}\p{N}])`, 'iu')
const LANGUAGE_RULES: Partial<Record<B1Draft['targetLanguage'], LanguageRules>> = {
  Italian: {
    register: 'formal', deInformal: w(String.raw`du|dich|dir|dein\p{L}*`), deFormal: w('Ihnen'), clitic: /^(lo|la|li|le|ne|ci|mi|ti|si|vi|gli)$/u,
    rules: [
      { scope: 'learner', re: w(String.raw`(sono|ero|sarei)\s+(stat|andat|arrivat|uscit|entrat|tornat|partit|rimast|venut|riuscit|cadut|salit|sces|divent|nat|cresciut|trasferit|iscritt)[oa]`) },
      { scope: 'learner', re: w(String.raw`(mi\s+(sono|ero|sarei)|ci\s+(siamo|eravamo|saremmo))\s+\p{L}+[oaie]`) },
      { scope: 'learner', re: w(String.raw`(siamo|eravamo)\s+(stat|andat|arrivat|uscit|entrat|tornat|partit|rimast|venut|riuscit)[ie]`) },
      { scope: 'learner', re: w(String.raw`(sono|ero|sarei|mi\s+sento|mi\s+sentivo|resto|rimango|divento)\s+(molto\s+|davvero\s+|già\s+|ancora\s+|un\s+po[’']\s+)?(stanc|content|sicur|pront|preoccupat|interessat|curios|dispiaciut|convint|soddisfatt|sorpres|emozionat|stupit|nervos|tranquill|arrabbiat|abituat|fortunat|grat|liber|iscritt|allergic|occupat)[oa]`) },
      { scope: 'learner', re: w(String.raw`(lo|la|li|ne|l[’'])\s*(ho|hai|ha|abbiamo|avete|hanno|avevo|avevi|aveva|avevamo|avevate|avevano)`) },
      { scope: 'all', re: w(String.raw`(avevo|avevi|aveva|avevamo|avevate|avevano)\s+(già\s+|appena\s+|non\s+)?(\p{L}+(at|ut|it|est|ost|ert|ist)[oaie]|dett[oaie]|fatt[oaie]|pres[oaie]|vist[oaie]|scritt[oaie]|lett[oaie]|mess[oaie])`) },
      { scope: 'all', re: w(String.raw`(ero|eri|era|eravamo|eravate|erano)\s+(già\s+|appena\s+)?(stat|andat|arrivat|uscit|entrat|tornat|partit|rimast|venut|success|riuscit)[oaie]`) },
      { scope: 'all', re: w(String.raw`\p{L}{2,}(arono|irono|erono)|fu|furono|ebbe|ebbero|disse|dissero|fece|fecero|venne|vennero|andò|arrivò|trovò|rispose|vide|mise|rimase|ebbi|feci|vidi|andai|trovai|dissi|chiesi`) },
      { scope: 'learner', except: [2, 10], re: w('sia|siano|abbia|abbiano|possa|possano|debba|debbano|faccia|facciano|venga|vengano|vada|vadano|stia|stiano|serva|servano|riesca|convenga|sappia') },
      { scope: 'all', re: w('fossi|fosse|fossero|avessi|avesse|avessero|potessi|potesse|dovessi|dovesse|volessi|volesse|facessi|facesse') },
      { scope: 'all', re: w(String.raw`scusa|ciao|dimmi|senti|hai|puoi|sai|vuoi|devi|tu|tuo|tua|tuoi|tue|ti|avete|siete|potete|sapete|volete|dovete|voi|vostr[oaie]`) },
      { scope: 'learner', re: w(String.raw`da\s+(bambin|piccol|ragazz)[oa]`) },
      { scope: 'learner', re: w(String.raw`(ho|abbiamo)\s+(abitat|vissut|lavorat|studiat|frequentat|conosciut)[oa]\s+(\p{L}+\s+){0,2}da\s+(un|uno|una|due|tre|quattro|cinque|sei|dieci|molt|poc|tant|qualche)`) },
      { scope: 'learner', except: [7, 9, 10], re: w(String.raw`\p{L}+(erò|erà|eremo|eranno|irò|irà|iremo|iranno)|(sar|avr|far|potr|dovr|verr|andr|vorr|dar|star|terr|vedr)(ò|à|emo|anno)`) },
      { scope: 'all', re: w(String.raw`perche|piu|gia|cosi|citta|puo|e'`) },
    ],
  },
  Portuguese: {
    deInformal: w(String.raw`du|dich|dir|dein\p{L}*`), deFormal: w('Ihnen'), clitic: /^(o|a|os|as|me|te|se|lhe|lhes|nos|lo|la|los|las|no|na)$/u,
    rules: [
      { scope: 'learner', re: w(String.raw`(tenho|temos|tinha|tínhamos|tinham)\s+(já\s+|não\s+)?(\p{L}+(ado|ido|eito|isto|osto|erto)|dito|vindo|posto)s?`) },
      { scope: 'learner', re: w(String.raw`(estou|fiquei|fico|sou|fui|estive|me\s+sinto|me\s+senti|ando|continuo|continuei)\s+(muito\s+|meio\s+|bem\s+|um\s+pouco\s+|super\s+|bastante\s+)?(cansad|animad|preocupad|interessad|convidad|prepar|pront|satisfeit|surpres|ocupad|sozinh|nervos|tranquil|acostumad|atrasad|perdid|chatead|empolgad|aliviad|grat|curios|decidid|confus|assustad|acompanhad|sentad|parad|acordad|casad|formad|chegad)[oa]s?`) },
      { scope: 'learner', re: w('obrigad[oa]') },
      { scope: 'learner', re: w(String.raw`(quando\s+)?eu\s+era\s+(muito\s+|bem\s+)?(pequen|menin|garot|nov|solteir|casad)[oa]`) },
      { scope: 'all', re: w('tu|tens|és|podes|queres|sabes|fazes|vais|estás|teu|tua|teus|tuas|contigo') },
      { scope: 'all', re: w(String.raw`autocarro|comboio|telemóvel|rapariga|ecrã|fixe|pequeno-almoço|casa\s+de\s+banho|pra|pro|pras|pros|tá|tô|né`) },
      { scope: 'all', re: w(String.raw`(estou|está|estava|estamos|estão)\s+a\s+\p{L}+(ar|er|ir)`) },
      { scope: 'learner', except: [7, 9, 10], re: w(String.raw`para\s+que|seja|sejam|esteja|estejam|tenha|tenham|possa|possam|faça|façam|funcione|participem|chegue|saiba|saibam|consiga|consigam|encontre|fique|fiquem|venha|venham|haja|queira|precise`) },
      { scope: 'learner', except: [3, 7, 9, 10], re: w(String.raw`(se|quando|assim\s+que|depois\s+que|enquanto)\s+(\p{L}+\s+){0,3}(tiver|tiverem|puder|puderem|for|forem|estiver|estiverem|houver|vier|vierem|fizer|fizerem|quiser|quiserem|souber|der|disser|trouxer)`) },
      { scope: 'all', re: w('nao|voce|tambem|ja|ate|cafe|manha|opiniao|entao|amanha') },
    ],
  },
}

export function validateB1Draft(value: unknown): B1Draft {
  const draft = b1DraftSchema.parse(value)
  const errors: string[] = []
  const expect = (condition: boolean, label: string) => { if (!condition) errors.push(label) }
  const forbidden = new Set(GUIDED_LESSONS.filter(lesson => lesson.targetLanguage === draft.targetLanguage)
    .flatMap(lesson => Object.values(lesson.vibeVariants).flatMap(variant => variant ? [fold(variant.trophyWord.word)] : [])))
  const slugs = new Set<string>()
  const codes = { English: 'en-US', Spanish: 'es-ES', French: 'fr-FR', Italian: 'it-IT', Portuguese: 'pt-BR' }
  expect(draft.targetLanguageCode === codes[draft.targetLanguage], 'Target language/code mismatch')
  const checkBases = (record: unknown, path: string) => {
    if (!record || typeof record !== 'object') return
    if (Array.isArray(record)) { record.forEach((item, index) => checkBases(item, `${path}/${index}`)); return }
    const obj = record as Record<string, unknown>
    if ('de' in obj) {
      expect(typeof obj.de === 'string' && Boolean(obj.de), `${path}: German explanation missing`)
      if (draft.targetLanguage !== 'English' || path.endsWith('/situation')) {
        expect(typeof obj.en === 'string' && Boolean(obj.en), `${path}: English explanation missing`)
      } else expect(!('en' in obj), `${path}: English target uses its existing German explanation convention`)
    }
    Object.entries(obj).forEach(([key, child]) => checkBases(child, `${path}/${key}`))
  }
  checkBases(draft, draft.targetLanguage)
  for (const [index, lesson] of draft.lessons.entries()) {
    const label = `${draft.targetLanguage} P${draft.pathNumber} L${index + 1} ${lesson.slug}`
    const check = (condition: boolean, message: string) => expect(condition, `${label}: ${message}`)
    check(!slugs.has(lesson.slug), 'Duplicate slug'); slugs.add(lesson.slug)
    const youOne = lesson.dialogue[1].targetText
    const youTwo = lesson.dialogue[3].targetText
    check(youOne.split(/\s+/).length >= 8 && youOne.split(/\s+/).length <= 16, 'First learner turn must have 8–16 words')
    check(youTwo.split(/\s+/).length >= 6 && youTwo.split(/\s+/).length <= 12, 'Follow-up must have 6–12 words')
    check(lesson.chunks.map(chunk => chunk.targetText).join(' ') === youOne, 'Chunks must reconstruct first turn exactly')
    check(new Set([...lesson.chunks.map(chunk => chunk.targetText), ...lesson.distractors]).size === lesson.chunks.length + 2, 'Build chips must be distinct')
    check(new Set(lesson.terms.map(term => fold(term.targetText))).size === lesson.terms.length, 'Vocabulary items must be distinct')
    const blanks = lesson.cloze.filter(part => typeof part !== 'string')
    check(blanks.length >= 2 && blanks.length <= 3, 'Follow-up requires 2–3 blanks')
    check(lesson.cloze.map(part => typeof part === 'string' ? part : part.answer).join('') === youTwo, 'Cloze must reconstruct follow-up exactly')
    for (const part of blanks) {
      check(part.choices.includes(part.answer) && new Set(part.choices.map(fold)).size === 4, 'Cloze choices need exactly one canonical answer')
      check(part.answer.split(/\s+/).length <= 3, 'Blank answer exceeds 3 words')
      check(!/[’']/u.test(part.answer), 'Cloze must not blank contractions or elisions')
      check(part.kind !== 'form' || Boolean(part.cue), 'Form blank requires a cue')
      check(part.kind === 'form' || !part.cue, 'Only form blanks have cues')
    }
    check(lesson.recall.before + lesson.recall.answer + lesson.recall.after === youOne, 'Checkpoint recall must reconstruct first turn')
    check(lesson.recall.fallbackChoices.includes(lesson.recall.answer) && new Set(lesson.recall.fallbackChoices.map(fold)).size === 4, 'Recall choices need one canonical answer')
    check(!/[’'-]/u.test(lesson.recall.answer), 'Recall must not blank contractions/hyphenated forms')
    check(new Set(lesson.speakRequired.map(fold)).size === 3, 'Three distinct speech tokens required')
    for (const token of lesson.speakRequired) check(/^[\p{L}\p{N}]+$/u.test(token) && words(youOne).includes(fold(token)), `Invalid required speech token: ${token}`)
    for (const example of lesson.pattern.examples) check(example.targetText.includes(example.highlight), 'Pattern highlight must be contiguous')
    check(lesson.pattern.examples.some(example => example.targetText === youOne || example.targetText === youTwo), 'A pattern example must reuse an episode turn')
    check(lesson.sceneCaption.de.includes(lesson.dialogue[0].targetText), 'Scene caption must quote opening turn')
    check(!lesson.sceneCaption.de.includes(lesson.dialogue[2].targetText), 'Scene must not reveal later turn')
    const rules = LANGUAGE_RULES[draft.targetLanguage]
    if (rules) {
      const learnerTexts = [youOne, youTwo, lesson.trophyWord.example, ...lesson.pattern.examples.map(example => example.targetText)]
      const allTexts = [...lesson.dialogue.map(turn => turn.targetText), ...learnerTexts, ...lesson.chunks.map(chunk => chunk.targetText), ...lesson.terms.map(term => term.targetText)]
      for (const rule of rules.rules) {
        if (rule.except?.includes(draft.pathNumber)) continue
        for (const text of rule.scope === 'all' ? allTexts : learnerTexts) check(!rule.re.test(text), `Banned ${rule.scope} pattern ${rule.re.source} in: ${text}`)
      }
      check(lesson.register !== 'informal', 'Lei/você episodes are formal or neutral, never informal')
      if (rules.register) check(lesson.register === rules.register, `Register must be ${rules.register}`)
      for (const text of lesson.dialogue.map(turn => turn.baseText.de)) {
        if (lesson.register === 'formal') check(!rules.deInformal.test(text), `Formal episode must not use du-forms in: ${text}`)
        if (lesson.register === 'neutral') check(!rules.deFormal.test(text), `Neutral episode must not use Ihnen in: ${text}`)
      }
      if (draft.targetLanguage === 'Portuguese' && lesson.register === 'formal') for (const text of learnerTexts) check(!w('te').test(text), `Formal você episode must not mix te in: ${text}`)
      for (const token of [lesson.recall.answer, lesson.trophyWord.word, ...lesson.speakRequired]) check(!rules.clitic.test(fold(token)), `Clitic/article is not a valid recall, trophy or speech token: ${token}`)
      lesson.cloze.forEach((part, n) => {
        if (typeof part === 'string' || part.kind !== 'form') return
        const match = /^\p{L}+(?:\s\p{L}+)?\s\(([^()]+)\)$/u.exec(part.cue ?? '')
        const tag = match?.[1] ?? ''
        const samePerson = /^(stessa persona|mesma pessoa)$/iu.test(tag)
        const literalBefore = lesson.cloze.slice(0, n).map(piece => typeof piece === 'string' ? piece : ' ').join('')
        const subjectPattern = tag ? w(fold(tag).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, String.raw`\s+`)) : null
        check(Boolean(match) && (samePerson || Boolean(subjectPattern?.test(fold(literalBefore)))), `Form blank needs cue "infinitive (explicit subject)" with that subject as a whole word in the literal text before the blank (earlier blank answers do not count), or a reviewer-signed same-person tag: ${part.answer}`)
      })
    }
    const trophy = fold(lesson.trophyWord.word)
    check(!forbidden.has(trophy), `Trophy already used: ${trophy}`); forbidden.add(trophy)
    check(words(youOne).includes(trophy), 'Trophy must be a single word in the first learner turn')
    check(words(lesson.trophyWord.example).includes(trophy), 'Trophy example must contain trophy')
  }
  if (errors.length) throw new Error(errors.join('\n'))
  return draft
}

/** Include vocabulary-item audio: B1 matching plays these using chunk/item IDs. */
export function draftTtsLessons(draft: B1Draft) {
  const slug = draft.targetLanguage.toLowerCase()
  const pathId = `${slug}-b1-practical-${draft.pathNumber}`
  return draft.lessons.map((lesson, index) => {
    const prefix = lesson.slug.split('-')[0]
    const tierNumber = (draft.pathNumber - 1) * 10 + index + 1
    return {
      id: `${pathId}-${String(tierNumber).padStart(3, '0')}-${lesson.slug}`,
      pathId, lessonNumber: index + 1,
      vibeVariants: { bright: {
        corePhrase: { targetText: lesson.dialogue[1].targetText },
        chunks: [
          ...lesson.chunks.map((chunk, n) => ({ id: `${prefix}-${n + 1}`, targetText: chunk.targetText })),
          ...lesson.terms.map((term, n) => ({ id: `${prefix}-item-${n + 1}`, targetText: term.targetText })),
        ],
        trophyWord: { word: lesson.trophyWord.word },
        dialogue: lesson.dialogue.map(turn => ({ targetText: turn.targetText })),
        pattern: { examples: lesson.pattern.examples.map(example => ({ targetText: example.targetText })) },
      } },
    }
  })
}
