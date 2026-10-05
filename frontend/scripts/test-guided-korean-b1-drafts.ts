/** Artificial structural fixtures only; never curriculum or provider inputs. */
import assert from 'node:assert/strict'
import { GUIDED_LESSONS } from '../src/data/guidedLessonsAuthoring'
import { validateKoreanB1Draft } from './lib/guidedKoreanB1Drafts'

function fixture(pathNumber=1){
  const base=(text:string)=>({de:text,en:text})
  const translated=(targetText:string)=>({targetText,baseText:base('Synthetic fixture')})
  const word=(n:number)=>'검증어'+String.fromCharCode(0xac00+n)
  const spec={status:'architect-spec',targetLanguage:'Korean',targetLanguageCode:'ko-KR',
    paths:Array.from({length:10},(_,p)=>({pathNumber:p+1,lessons:Array.from({length:10},(_,l)=>({number:l+1,trophy:word(p*10+l),beat:'Synthetic fixture'}))}))}
  const lessons=Array.from({length:10},(_,n)=>{
    const trophy=word((pathNumber-1)*10+n), chunks=[`어제 ${trophy}`,'공원에 갔는데','비가 와서','집으로 돌아왔어요.']
    const first=chunks.join(' '), second='그래서 집에서 차를 마시고 책을 읽었어요.'
    const opening='어제 공원에서는 어떤 일이 있었어요?', followup='집으로 돌아온 다음에는 무엇을 했어요?'
    return {slug:`fixture-${String.fromCharCode(97+n)}`,title:base('Synthetic'),situation:base('Synthetic scene'),
      pedagogicalGoal:'Nur ein Strukturtest.',register:'neutral',
      dialogue:[translated(opening),translated(first),translated(followup),translated(second)],
      pattern:{label:'Synthetic',rule:base('Synthetic rule'),examples:[{...translated(first),highlight:trophy},{...translated(second),highlight:'마시고'}]},
      cloze:['그래서 집에서 ',{kind:'choice',answer:'차를',choices:['차를','집에','나무','바다']},' 마시고 ',{kind:'choice',answer:'책을',choices:['책을','의자','바다','나무']},' 읽었어요.'],
      chunks:chunks.map(translated),terms:[trophy,'공원','차','책','비','돌아왔어요'].map(translated),
      recall:{before:'어제 ',answer:trophy,after:first.slice(('어제 '+trophy).length),fallbackChoices:[trophy,'의자','나무','바다']},
      speakRequired:[trophy,'공원에','돌아왔어요'],sceneCaption:{de:`Test: „${opening}“`,en:`Test: “${opening}”`},
      trophyWord:{word:trophy,meaning:base('Synthetic token'),example:first,whyThisWord:base('Test only')},
      distractors:['강으로 갔는데','집에서 나왔어요.'],placeholderCaption:base('Test'),songMood:'Test',visualNotes:'Test'}
  })
  return {spec,draft:{schemaVersion:1,status:'draft',level:'B1',targetLanguage:'Korean',targetLanguageCode:'ko-KR',
    baseLanguage:'German',pathNumber,title:base('Fixture'),subtitle:base('Fixture'),anchor:'Synthetic fixture only',lessons}}
}
const valid=fixture()
assert.equal(validateKoreanB1Draft(valid.draft,valid.spec).lessons.length,10)
const positive=fixture()
positive.draft.lessons[0].terms[0].targetText='인형'
positive.draft.lessons[0].terms[1].targetText='15일'
assert.equal(validateKoreanB1Draft(positive.draft,positive.spec).lessons.length,10)
const secondPath=fixture(2)
assert.equal(validateKoreanB1Draft(secondPath.draft,secondPath.spec).lessons.length,10)
for(const [targetText,highlight] of [['감사합니다.','감사합니다'],['제가 내일 서류를 보내 드릴게요.','드릴게요'],['선생님이 내일 학교에 오세요.','오세요']]){
 const licensed=fixture()
 Object.assign(licensed.draft.lessons[0].pattern.examples[1],{targetText,highlight})
 assert.equal(validateKoreanB1Draft(licensed.draft,licensed.spec).lessons.length,10)
}
let checks=0
function rejects(name:string,change:(v:ReturnType<typeof fixture>)=>void,reason:RegExp){
  const value=fixture();change(value)
  assert.throws(()=>validateKoreanB1Draft(value.draft,value.spec),reason,name);checks++
}
rejects('Wrong identity',x=>{x.draft.targetLanguage='English'},/Korean/)
rejects('Wrong locale',x=>{x.draft.targetLanguageCode='en-US'},/ko-KR/)
rejects('Later path is outside this gate',x=>{x.draft.pathNumber=3},/2/)
rejects('Partial content',x=>{x.draft.lessons.pop()},/10/)
rejects('Partial specification',x=>{x.spec.paths.pop()},/10/)
rejects('Wrong specification language',x=>{x.spec.targetLanguage='Japanese'},/Korean/)
rejects('Reordered paths',x=>{x.spec.paths[1].pathNumber=3},/ordered/)
rejects('Reordered lessons',x=>{x.spec.paths[0].lessons[1].number=3},/ordered/)
rejects('Repeated allocation',x=>{x.spec.paths[1].lessons[0].trophy=x.spec.paths[0].lessons[0].trophy},/Duplicate or frozen/)
rejects('Frozen trophy',x=>{x.spec.paths[1].lessons[0].trophy=GUIDED_LESSONS.find(l=>l.targetLanguage==='Korean'&&/^[가-힣]+$/u.test(l.vibeVariants.bright?.trophyWord.word??''))!.vibeVariants.bright!.trophyWord.word},/Duplicate or frozen/)
rejects('Missing English base',x=>{Object.assign(x.draft.lessons[0].dialogue[1].baseText,{en:undefined})},/English base/)
rejects('Unreviewed schema extension',x=>{Object.assign(x.draft.lessons[0],{acceptedPhraseVariants:['다른 말이에요.']})},/Unrecognized/)
rejects('Repeated slug',x=>{x.draft.lessons[1].slug=x.draft.lessons[0].slug},/Duplicate slug/)
rejects('NFD target',x=>{x.draft.lessons[0].terms[0].targetText='가'.normalize('NFD')},/NFC/)
rejects('Invisible controls',x=>{x.draft.title.de+='\u200b'},/controls/)
rejects('Latin in speech',x=>{x.draft.lessons[0].terms[0].targetText='hello'},/Hangul/)
rejects('Doubled spacing',x=>{x.draft.lessons[0].terms[0].targetText='어제  오늘'},/Hangul/)
rejects('Emoji',x=>{x.draft.lessons[0].terms[0].targetText='안녕🙂'},/Hangul/)
rejects('Address with particle',x=>{x.draft.lessons[0].terms[0].targetText='형한테'},/Gendered/)
rejects('Casual ending',x=>{x.draft.lessons[0].dialogue[0].targetText='어제 공원에서는 어떤 일이 있었어?'},/해요체/)
rejects('Unlicensed formal ending',x=>{x.draft.lessons[0].dialogue[0].targetText='어제 공원에서 어떤 일이 있었습니다.'},/해요체/)
rejects('Direct self honorific',x=>{x.draft.lessons[0].dialogue[3].targetText='제가 오세요 지금 집에서 차를 마셔요.'},/self-honorific/)
rejects('Too short reply',x=>{x.draft.lessons[0].dialogue[1].targetText='집으로 돌아왔어요.'},/eojeol length/)
rejects('Oversized chunk',x=>{x.draft.lessons[0].chunks[0].targetText='어제 오늘 내일 모레'},/1–3/)
rejects('Chunk reconstruction',x=>{x.draft.lessons[0].chunks[0].targetText+=' 오늘'},/reconstruct/)
rejects('Duplicate chips',x=>{x.draft.lessons[0].distractors[0]=x.draft.lessons[0].chunks[0].targetText},/chips/)
rejects('Duplicate terms',x=>{x.draft.lessons[0].terms[0]=x.draft.lessons[0].terms[1]},/Terms/)
rejects('Cloze reconstruction',x=>{x.draft.lessons[0].cloze[0]='그래서 '},/Cloze must reconstruct/)
rejects('Cloze splits eojeol despite exact reconstruction',x=>{
  const l=x.draft.lessons[0],blank=l.cloze[1]
  l.cloze[0]='그래서 집에서 차'
  if(typeof blank!=='string'){blank.answer='를';blank.choices[0]='를'}
},/whole eojeol/)
rejects('Equivalent punctuated choice',x=>{const b=x.draft.lessons[0].cloze[1];if(typeof b!=='string')b.choices[1]='차를?'},/choices/)
rejects('Missing form cue',x=>{const b=x.draft.lessons[0].cloze[1];if(typeof b!=='string')b.kind='form'},/cue/)
rejects('Bad recall',x=>{x.draft.lessons[0].recall.after+=' 오늘'},/Recall must reconstruct/)
rejects('Recall splits lexical eojeol',x=>{
 const r=x.draft.lessons[0].recall;r.before+='검';r.answer=r.answer.slice(1);r.fallbackChoices[0]=r.answer
},/whole eojeol/)
rejects('Speech substring',x=>{x.draft.lessons[0].speakRequired[1]='공원'},/whole lexical/)
rejects('Repeated speech token',x=>{x.draft.lessons[0].speakRequired[1]=x.draft.lessons[0].speakRequired[0]},/distinct speech/)
rejects('Substring trophy anchor',x=>{x.draft.lessons[0].trophyWord.example=x.draft.lessons[0].trophyWord.word+'에서 왔어요.'},/bare-trophy/)
rejects('Wrong trophy allocation',x=>{x.draft.lessons[0].trophyWord.word='새단어'},/allocation/)
rejects('Broken highlight',x=>{x.draft.lessons[0].pattern.examples[0].highlight='없는말'},/highlight/)
rejects('Caption omits opening',x=>{x.draft.lessons[0].sceneCaption.en='Missing'},/quote opening/)
rejects('Caption exposes delayed turn',x=>{x.draft.lessons[0].sceneCaption.de+=x.draft.lessons[0].dialogue[2].targetText},/delayed/)
rejects('Casual pattern sentence',x=>{x.draft.lessons[0].pattern.examples[1].targetText='그래서 집에서 차를 마시고 책을 읽었어.'},/해요체/)
rejects('Formal pattern imperative',x=>{x.draft.lessons[0].pattern.examples[1].targetText='내일 학교로 가십시오.'},/imperative/)
rejects('Casual trophy example',x=>{x.draft.lessons[0].trophyWord.example=x.draft.lessons[0].trophyWord.word+' 집에서 쉬었어.'},/해요체/)
rejects('Malformed build distractor',x=>{x.draft.lessons[0].distractors[0]='hello🙂'},/Hangul/)
rejects('Malformed cloze choice',x=>{const b=x.draft.lessons[0].cloze[1];if(typeof b!=='string')b.choices[1]='hello🙂'},/Hangul/)
rejects('Malformed recall choice',x=>{x.draft.lessons[0].recall.fallbackChoices[1]='hello🙂'},/Hangul/)
rejects('Address in distractor',x=>{x.draft.lessons[0].distractors[0]='형한테'},/Gendered/)
rejects('Punctuation cannot split a cloze eojeol',x=>{
 const l=x.draft.lessons[0]
 l.dialogue[3].targetText='그래서 집에서 차를,책을 마시고 읽었어요.'
 l.cloze[2]=',';l.cloze[4]=' 마시고 읽었어요.'
},/whole eojeol/)
rejects('Punctuation cannot split a recall eojeol',x=>{
 const l=x.draft.lessons[0],trophy=l.trophyWord.word
 l.dialogue[1].targetText=l.dialogue[1].targetText.replace(trophy+' ',trophy+',책을 ')
 l.recall.after=',책을'+l.recall.after
},/whole eojeol/)
for(const phrase of ['제가 내일 오세요','제가 연락 드리세요']){
 rejects('Intervening self honorific '+phrase,x=>{
  const l=x.draft.lessons[0]
  l.dialogue[3].targetText=phrase+' 차를 마시고 책을 읽어요.'
  l.cloze[0]=phrase+' ';l.cloze[4]=' 읽어요.'
 },/self-honorific/)
}
rejects('Second learner reply exceeds one sentence',x=>{
 const l=x.draft.lessons[0]
 l.dialogue[3].targetText='그래서 집에서 차를 마셔요. 책을 읽어요.'
 l.cloze[2]=' 마셔요. ';l.cloze[4]=' 읽어요.'
},/sentence count/)
rejects('First learner reply exceeds two sentences within eojeol bound',x=>{
 const l=x.draft.lessons[0]
 l.dialogue[1].targetText=l.dialogue[1].targetText.replace('갔는데','갔어요.').replace('와서','와요.')
},/sentence count/)
console.log(`Korean B1 P1/P2 structural gate: 6 synthetic positive fixtures and ${checks} rejection cases PASS. Native semantic review remains separate.`)
