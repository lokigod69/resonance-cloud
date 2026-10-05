/** Offline P1/P2 gate for natural bare-trophy Korean drafts. Full content review remains separate. */
import { z } from 'zod'
import { GUIDED_LESSONS } from '../../src/data/guidedLessonsAuthoring'
import { b1DraftSchema } from './guidedB1Drafts'

export const koreanB1DraftSchema = b1DraftSchema.extend({
  targetLanguage: z.literal('Korean'), targetLanguageCode: z.literal('ko-KR'),
  pathNumber: z.number().int().min(1).max(2),
}).strict()
export type KoreanB1Draft = z.infer<typeof koreanB1DraftSchema>
const specificationSchema = z.object({
  status: z.literal('architect-spec'), targetLanguage: z.literal('Korean'), targetLanguageCode: z.literal('ko-KR'),
  paths: z.array(z.object({pathNumber:z.number().int(),lessons:z.array(z.object({
    number:z.number().int(),trophy:z.string().regex(/^[가-힣]+$/u),beat:z.string().min(1),
  }).passthrough()).length(10)}).passthrough()).length(10),
}).passthrough()
const strip = (value:string) => value.replace(/^[.?,]+|[.?,]+$/gu,'')
const units = (value:string) => value.split(' ').map(strip)
const normalize = (value:string) => units(value.normalize('NFC').trim()).join(' ')
const forbiddenUnits = new Set(['네','저','저는','제가','그','좀','나','너','우리','이','가','을','를','은','는','에','에서','도','로','으로','만','까지','부터','것','분','곳'])
const addresses = ['오빠','언니','누나','형','아저씨','아줌마']
const genderedAddresses = new Set(addresses.flatMap(word => ['', '아','야','는','은','이','가','도','한테','들'].map(suffix => word+suffix)))
const fixedFormal = new Set(['안녕하세요','죄송합니다','감사합니다','알겠습니다'])
const lexicalSpans = (text:string) => [...text.matchAll(/[^ ]+/gu)].map(match=>({
  start:match.index+(match[0].match(/^[.?,]+/u)?.[0].length??0),
  end:match.index+match[0].length-(match[0].match(/[.?,]+$/u)?.[0].length??0),
}))
const wholeSpan = (text:string,start:number,length:number) => {
  const spans=lexicalSpans(text)
  return spans.some(span=>span.start===start)&&spans.some(span=>span.end===start+length)
}
const sentences = (text:string) => text.split(/[.?]/u).map(x=>x.trim()).filter(Boolean)
// Named bad self-honorific constructions from the spec, including intervening
// time adverbs and 연락. Full subject/reference semantics remain a content review.
const directSelfHonorific = (text:string) => text.split(/[.?,]/u).some(clause=>
  /(?:^| )(?:제가|저는) (?:(?:오늘|내일|지금|먼저|직접|다시|연락) )*(?:가세요|오세요|계세요|하시겠어요|드리세요)(?= |$)/u.test(clause.trim()))

export function validateKoreanB1Draft(value:unknown,specification:unknown):KoreanB1Draft {
  const draft = koreanB1DraftSchema.parse(value), spec = specificationSchema.parse(specification)
  const errors:string[] = []
  const expect = (condition:boolean,message:string) => { if(!condition) errors.push(message) }
  const occupied = new Set(GUIDED_LESSONS.filter(x=>x.targetLanguage==='Korean')
    .flatMap(lesson=>Object.values(lesson.vibeVariants).flatMap(variant=>variant?[normalize(variant.trophyWord.word)]:[])))
  spec.paths.forEach((path,p)=>{
    expect(path.pathNumber===p+1,'Specification paths must be ordered 1–10')
    path.lessons.forEach((lesson,l)=>{
      expect(lesson.number===l+1,'Specification lessons must be ordered 1–10')
      expect(!occupied.has(normalize(lesson.trophy)),`Duplicate or frozen trophy: ${lesson.trophy}`)
      occupied.add(normalize(lesson.trophy))
    })
  })
  const walk = (item:unknown) => {
    if(typeof item==='string') expect(item===item.normalize('NFC')&&!/[\p{Cc}\p{Cf}]/u.test(item),'Text must be NFC without controls')
    else if(Array.isArray(item)) item.forEach(walk)
    else if(item&&typeof item==='object'){
      const record=item as Record<string,unknown>
      if('de' in record) expect(typeof record.en==='string'&&Boolean(record.en),'English base missing')
      Object.values(record).forEach(walk)
    }
  }
  walk(draft)
  const slugs=new Set<string>()
  draft.lessons.forEach((lesson,index)=>{
    const check=(condition:boolean,message:string)=>expect(condition,`Korean P${draft.pathNumber} L${index+1}: ${message}`)
    const first=lesson.dialogue[1].targetText, second=lesson.dialogue[3].targetText
    check(!slugs.has(lesson.slug),'Duplicate slug'); slugs.add(lesson.slug)
    const spoken=[...lesson.dialogue.map(t=>t.targetText),...lesson.chunks.map(t=>t.targetText),
      ...lesson.terms.map(t=>t.targetText),...lesson.pattern.examples.map(t=>t.targetText),lesson.trophyWord.example,lesson.trophyWord.word]
    const choices=[...lesson.distractors,...lesson.recall.fallbackChoices,
      ...lesson.cloze.flatMap(part=>typeof part==='string'?[]:part.choices)]
    for(const text of [...spoken,...choices]){
      check(/^[가-힣0-9]+[.?,]?(?: [가-힣0-9]+[.?,]?)*$/u.test(text),'Only Hangul, digits and native punctuation with whole spaced eojeol')
      check(!units(text).some(token=>genderedAddresses.has(token)),'Gendered address or role token')
    }
    const checkRegister=(text:string)=>{
      for(const sentence of sentences(text)){
        const ending=units(sentence).at(-1)??''
        check(ending.endsWith('요')||fixedFormal.has(ending),'Complete sentences must use 해요체 or a licensed fixed greeting')
      }
      check(!/십시오/u.test(text),'Unlicensed formal imperative')
    }
    for(const example of [...lesson.pattern.examples.map(t=>t.targetText),lesson.trophyWord.example]){
      checkRegister(example)
      check(!directSelfHonorific(example),'Direct self-honorific construction')
    }
    lesson.dialogue.forEach((turn,n)=>{
      const size=units(turn.targetText).length, low=n===1?6:n===3?5:4, high=n===1?12:n===3?9:10
      check(size>=low&&size<=high,'Dialogue eojeol length outside native bounds')
      checkRegister(turn.targetText)
      if(n%2===1){
        check(!directSelfHonorific(turn.targetText),'Direct self-honorific construction')
        const count=sentences(turn.targetText).length
        check(count>=1&&count<=(n===1?2:1),'Learner sentence count outside native bounds')
      }
    })
    check(lesson.chunks.every(chunk=>units(chunk.targetText).length<=3),'Chunks require 1–3 whole eojeol')
    check(lesson.chunks.map(chunk=>chunk.targetText).join(' ')===first,'Chunks must reconstruct first reply')
    check(new Set([...lesson.chunks.map(x=>normalize(x.targetText)),...lesson.distractors.map(normalize)]).size===lesson.chunks.length+2,'Build chips must be distinct')
    check(new Set(lesson.terms.map(x=>normalize(x.targetText))).size===lesson.terms.length,'Terms must be distinct')
    const blanks=lesson.cloze.filter(part=>typeof part!=='string')
    check(blanks.length>=2&&blanks.length<=3,'Cloze requires 2–3 blanks')
    check(lesson.cloze.map(part=>typeof part==='string'?part:part.answer).join('')===second,'Cloze must reconstruct second reply')
    let offset=0
    for(const part of lesson.cloze){
      const text=typeof part==='string'?part:part.answer
      if(typeof part!=='string'){
        check(wholeSpan(second,offset,text.length),'Cloze must span whole eojeol at actual position')
        check(/^[가-힣0-9]+(?: [가-힣0-9]+){0,2}$/u.test(part.answer)&&!forbiddenUnits.has(part.answer),'Cloze requires a lexical eojeol or phrase')
        check(part.choices.includes(part.answer)&&new Set(part.choices.map(normalize)).size===4,'Cloze choices require one canonical answer')
        check(part.kind==='form'?Boolean(part.cue):!part.cue,'Only form blanks carry a cue')
      }
      offset+=text.length
    }
    check(lesson.recall.before+lesson.recall.answer+lesson.recall.after===first,'Recall must reconstruct first reply')
    check(wholeSpan(first,lesson.recall.before.length,lesson.recall.answer.length),'Recall must span a whole eojeol at actual position')
    check(/^[가-힣0-9]+$/u.test(lesson.recall.answer)&&!forbiddenUnits.has(lesson.recall.answer),'Recall requires a content eojeol')
    check(lesson.recall.fallbackChoices.includes(lesson.recall.answer)&&new Set(lesson.recall.fallbackChoices.map(normalize)).size===4,'Recall choices require one canonical answer')
    check(new Set(lesson.speakRequired).size===3,'Three distinct speech tokens required')
    for(const token of lesson.speakRequired) check(/^[가-힣0-9]+$/u.test(token)&&units(first).includes(token)&&!forbiddenUnits.has(token),'Speech tokens must be whole lexical eojeol')
    for(const example of lesson.pattern.examples) check(example.targetText.includes(example.highlight),'Contiguous pattern highlight required')
    check(lesson.pattern.examples.some(example=>example.targetText===first||example.targetText===second),'Pattern must reuse a learner turn')
    const trophy=lesson.trophyWord.word
    check(trophy===spec.paths[draft.pathNumber-1].lessons[index].trophy,'Trophy differs from allocation')
    // The first twenty allocations allow natural bare forms. Inflected surfaces need a future explicit reviewed extension.
    check(units(first).includes(trophy)&&units(lesson.trophyWord.example).includes(trophy)&&!forbiddenUnits.has(trophy),'Exact bare-trophy eojeol anchors required')
    for(const locale of ['de','en'] as const){
      const caption=lesson.sceneCaption[locale]??'', opening=lesson.dialogue[0].targetText
      check((locale==='de'?[`„${opening}“`,`"${opening}"`]:[`“${opening}”`,`"${opening}"`]).some(quote=>caption.includes(quote)),'Caption must quote opening in both bases')
      check(!caption.includes(lesson.dialogue[2].targetText),'Caption must not quote delayed turn')
    }
  })
  if(errors.length) throw new Error(errors.join('\n'))
  return draft
}
