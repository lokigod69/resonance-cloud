import {z} from 'zod';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
// Offline structural gate for pt-BR B2 P1/P2 drafts. Not a native semantic review, not approval, not publication.
export const PORTUGUESE_B2_AUTHORITY={targetLanguage:'Portuguese',code:'pt-BR',level:'B2',authoredBaseLanguage:'German',specFile:'B2_PORTUGUESE_P1_P2_AUTHORING_SPEC_V3.json',specSha256:'fd8602a8ff9f678bcfd8f3dfb0767d5915ee148a358d6922715da746233fa4e4',prerequisitesFile:'B2_LATIN_PREREQUISITES.json',prerequisitesSha256:'72f074b845ee0b2165cae99ab1739d9315a00e5b273f132d2f45c5bb3396af32',frozenLessons:200,reservedB1:100,earlierDistinct:299,allocationRows:20} as const;
export type TrophyPos='noun'|'verb'|'adjective'|'adverb'|'connector';
export interface TrophyAllocation{pathNumber:number;lessonNumber:number;lemma:string;familyKey:string;pos:TrophyPos}
export const PORTUGUESE_B2_ALLOCATION:readonly TrophyAllocation[]=[
{pathNumber:1,lessonNumber:1,lemma:'deslocamento',familyKey:'desloc',pos:'noun'},{pathNumber:1,lessonNumber:2,lemma:'ponderar',familyKey:'ponder',pos:'verb'},{pathNumber:1,lessonNumber:3,lemma:'contudo',familyKey:'contudo',pos:'connector'},{pathNumber:1,lessonNumber:4,lemma:'investimento',familyKey:'invest',pos:'noun'},{pathNumber:1,lessonNumber:5,lemma:'roteiro',familyKey:'roteiro',pos:'noun'},{pathNumber:1,lessonNumber:6,lemma:'taxa',familyKey:'taxa',pos:'noun'},{pathNumber:1,lessonNumber:7,lemma:'disciplina',familyKey:'disciplin',pos:'noun'},{pathNumber:1,lessonNumber:8,lemma:'estabilidade',familyKey:'estabil',pos:'noun'},{pathNumber:1,lessonNumber:9,lemma:'arriscado',familyKey:'risc',pos:'adjective'},{pathNumber:1,lessonNumber:10,lemma:'portanto',familyKey:'portanto',pos:'connector'},
{pathNumber:2,lessonNumber:1,lemma:'cobrança',familyKey:'cobr',pos:'noun'},{pathNumber:2,lessonNumber:2,lemma:'coleta',familyKey:'colet',pos:'noun'},{pathNumber:2,lessonNumber:3,lemma:'imprevisto',familyKey:'imprevist',pos:'noun'},{pathNumber:2,lessonNumber:4,lemma:'acumular',familyKey:'acumul',pos:'verb'},{pathNumber:2,lessonNumber:5,lemma:'sobretudo',familyKey:'sobretudo',pos:'adverb'},{pathNumber:2,lessonNumber:6,lemma:'recurso',familyKey:'recurs',pos:'noun'},{pathNumber:2,lessonNumber:7,lemma:'subestimar',familyKey:'subestim',pos:'verb'},{pathNumber:2,lessonNumber:8,lemma:'etapa',familyKey:'etapa',pos:'noun'},{pathNumber:2,lessonNumber:9,lemma:'consequência',familyKey:'consequ',pos:'noun'},{pathNumber:2,lessonNumber:10,lemma:'decorrer',familyKey:'decorr',pos:'verb'}];
// Explicit per-lesson carrier license (you1,you2,you3). The spec firstProductiveUse table conflicts with its own P1L1 exemplar for 'é verdade que'; this table is the enforced license.
const CARRIERS:ReadonlyArray<ReadonlyArray<ReadonlyArray<string>>>=[
[['por um lado','por outro lado'],['é verdade que','mas'],['no fim das contas']],[['enquanto'],['ainda assim'],['sugiro']],[['o que pesa mais para mim é'],['é verdade que','contudo'],['em resumo']],[['por um lado','por outro lado'],['vale a pena comprar'],['em vez disso']],[['a opção mais tranquila'],['enquanto'],['no fim das contas']],[['menor do que'],['tanto','quanto','em outras palavras'],['sugiro']],[['a opção mais eficaz'],['é verdade que','mas'],['em resumo']],[['o que pesa mais para mim é'],['ainda assim'],['no fim das contas']],[['é verdade que','ainda assim'],['como a cidade fica'],['sugiro']],[['em comparação com','tanto','quanto'],['em vez de'],['levando tudo em conta','portanto']],
[['já que'],['em outras palavras'],['em resumo']],[['são levados'],['enquanto'],['no fim das contas']],[['visto que'],['é verdade que'],['sugiro']],[['de modo que'],['ainda assim'],['em resumo']],[['pela queda','pelo aumento'],['enquanto'],['vale a pena']],[['é preenchido','é anexada'],['em outras palavras'],['sugiro']],[['pela falta','pelo excesso'],['é verdade que'],['em resumo']],[['precisa-se de','se chega à'],['em outras palavras'],['poderia']],[['em comparação com','enquanto'],['de modo que'],['o que resulta em']],[['em decorrência da','visto que'],['em outras palavras'],['em resumo']]];
const REGISTER=z.enum(['senhor','você']);
const MOVE=z.enum(['compare','position','reason','concede','rebut','clarify','explain','counteroffer','conclude','propose','summarize','request']);
const ANSWER_MOVES:readonly string[]=['concede','rebut','clarify','explain','compare','counteroffer'];
const CLOSING_MOVES:readonly string[]=['conclude','propose','summarize','counteroffer','request'];
const loc=z.object({de:z.string().min(1),en:z.string().min(1)}).strict();
const turn=z.object({targetText:z.string().min(1),base:loc,speaker:z.enum(['them','you']),interlocutorId:z.string().min(1).optional(),move:MOVE.optional(),register:REGISTER.optional()}).strict();
const blank=z.object({answer:z.string().min(1),acceptedAnswers:z.array(z.string().min(1)).min(1),kind:z.enum(['frame','connector','form','lexical']),cue:loc.optional(),choices:z.array(z.string().min(1)).optional()}).strict();
const segment=z.discriminatedUnion('kind',[z.object({kind:z.literal('text'),text:z.string()}).strict(),z.object({kind:z.literal('blank'),index:z.number().int().nonnegative()}).strict()]);
const exercise=z.object({segments:z.array(segment).min(1),blanks:z.array(blank).min(1),moveBlankIndex:z.number().int().nonnegative()}).strict();
const term=z.object({targetText:z.string().min(1),kind:z.enum(['connector','frame','noun','verb','adjective','adverb']),base:loc,lemma:z.string().min(1).optional(),acceptedAnswers:z.array(z.string().min(1)).optional()}).strict();
const example=z.object({targetText:z.string().min(1),base:loc,highlights:z.array(z.string().min(1)).min(1)}).strict();
const flags=z.object({argumentCoherent:z.boolean(),challengeGenuine:z.boolean(),steerGenuine:z.boolean(),b2NotInflatedB1:z.boolean(),registerNative:z.boolean(),genderClaimVerified:z.boolean(),distractorsNotAlsoCorrect:z.boolean(),patternTruthful:z.boolean(),baseTextsAccurate:z.boolean(),ttsReadable:z.boolean(),carriersStaged:z.boolean(),noFiller:z.boolean()}).strict();
const review=z.object({flags,verdict:z.enum(['pending','approved','rejected']),failingCriteria:z.array(z.string()),reviewers:z.array(z.string()),nativeStatus:z.enum(['unreviewed','reviewed']),acknowledgedWarnings:z.array(z.object({code:z.string().min(1),reason:z.string().min(1)}).strict())}).strict();
const lesson=z.object({lessonNumber:z.number().int().min(1).max(10),slug:z.string().min(1),title:loc,situation:loc,episodeShape:z.enum(['challenge','precision']),registerPlan:z.object({mode:z.literal('constant'),registers:z.array(REGISTER).length(3)}).strict(),interlocutors:z.array(z.object({id:z.string().min(1),role:loc,voiceRole:z.enum(['A','B'])}).strict()).length(1),speakerGender:z.literal('neutral'),sceneCaption:loc,dialogue:z.array(turn).length(6),build:z.object({framePrefix:z.string(),chunks:z.array(z.string().min(1)).min(5).max(8),distractors:z.array(z.string().min(1)).length(2),frameSuffix:z.string()}).strict(),cloze:exercise,synthesis:exercise,recall:z.object({before:z.string(),answer:z.string().min(1),acceptedAnswers:z.array(z.string().min(1)).min(1),fallbackChoices:z.array(z.string().min(1)).length(4),after:z.string()}).strict(),pattern:z.object({moveType:MOVE,label:loc,rule:loc,examples:z.array(example).min(2).max(3)}).strict(),terms:z.array(term).min(8).max(10),speak:z.array(z.object({turnIndex:z.number().int(),requiredTokens:z.array(z.string().min(1)).min(2).max(4),profile:z.enum(['b2-long','b2-short'])}).strict()).length(3),trophy:z.object({lemma:z.string().min(1),familyKey:z.string().min(1),surface:z.string().min(1),turnIndex:z.number().int(),pos:z.enum(['noun','verb','adjective','adverb','connector']),example:z.object({targetText:z.string().min(1),base:loc}).strict(),base:loc}).strict(),review}).strict();
export const portugueseB2DraftSchema=z.object({schemaVersion:z.literal(1),status:z.literal('draft'),targetLanguage:z.literal('Portuguese'),targetLanguageCode:z.literal('pt-BR'),authoredBaseLanguage:z.literal('German'),level:z.literal('B2'),pathNumber:z.union([z.literal(1),z.literal(2)]),slug:z.string().min(1),pathTitle:loc,pathFunction:loc,specRef:z.object({pathSpec:z.string(),pathSpecSha256:z.string(),ledger:z.string(),ledgerSha256:z.string()}).strict(),authoring:z.object({source:z.string(),runId:z.string(),date:z.string()}).strict(),lessons:z.array(lesson).length(10)}).strict();
export type PortugueseB2Draft=z.infer<typeof portugueseB2DraftSchema>;
type Lesson=PortugueseB2Draft['lessons'][number];
type Blank=z.infer<typeof blank>;
export interface PortugueseB2Evidence{specificationSource:string;specification:unknown;pathSpecSha256:string;ledgerSha256:string;prerequisitesSource:string;prerequisites:unknown;prerequisitesSha256:string;trophies:readonly TrophyAllocation[];earlierTrophies:readonly string[]}
const specSchema=z.object({targetLanguage:z.literal('Portuguese'),code:z.literal('pt-BR'),level:z.literal('B2'),authoredBaseLanguage:z.literal('German'),paths:z.array(z.object({pathNumber:z.number(),moveWhitelist:z.array(z.string()),staging:z.array(z.object({lessons:z.string(),productive:z.array(z.string())}).passthrough()),lessons:z.array(z.object({number:z.number(),slug:z.string(),register:REGISTER,trophySurface:z.string(),requiredCarrier:z.string()}).passthrough()).length(10)}).passthrough()).length(2),trophyLedger:z.object({rows:z.array(z.object({pathNumber:z.number(),lessonNumber:z.number(),lemma:z.string(),familyKey:z.string(),pos:z.enum(['noun','verb','adjective','adverb','connector'])}).strict()).length(20)}).passthrough()}).passthrough();
type Spec=z.infer<typeof specSchema>;
const prereqSchema=z.array(z.object({targetLanguage:z.string(),frozenLessonCount:z.number(),activeCorpusSha256:z.string(),b1AllocationSha256:z.string(),forbiddenTrophies:z.array(z.string()),reservationNote:z.string()}).strict());
const sha=(s:string):string=>createHash('sha256').update(s,'utf8').digest('hex');
const fold=(s:string):string=>s.normalize('NFC').toLocaleLowerCase('pt-BR');
const norm=(s:string):string=>fold(s).replace(/\u2019/g,'\'').replace(/[.,!?;:]+$/g,'').replace(/\s+/g,' ').trim();
const TOKEN=/[\p{L}\p{M}\p{N}]+(?:[\u2019'-][\p{L}\p{M}\p{N}]+)*/gu;
const tok=(s:string):string[]=>s.match(TOKEN)??[];
const boundary=(s:string,n:number):boolean=>![...s.matchAll(TOKEN)].some(m=>{const i=m.index??0;return i<n&&n<i+m[0].length});
const span=(s:string,n:number,len:number):boolean=>boundary(s,n)&&boundary(s,n+len);
const phrase=(s:string,w:string):boolean=>{const a=fold(s),b=fold(w);let i=a.indexOf(b);while(i>=0){if(span(a,i,b.length))return true;i=a.indexOf(b,i+1)}return false};
const whole=(s:string,w:string):boolean=>tok(s).map(fold).includes(fold(w));
const distinct=(a:readonly string[]):boolean=>new Set(a.map(norm)).size===a.length;
const strip=(s:string):string=>s.normalize('NFD').replace(/[\u0300-\u0326\u0328-\u036f]/g,'').normalize('NFC');
const stripAll=(s:string):string=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').normalize('NFC');
const STOP:ReadonlySet<string>=new Set(['o','a','os','as','de','em','se','me','que','não']);
const CLITIC:ReadonlySet<string>=new Set(['se','me','te','lhe','nos','lhes','não']);
const VARIETY:readonly string[]=['tu','tens','és','estás','teu','tua','contigo','pra','tá','né','autocarro','comboio','telemóvel','apanhar','pequeno-almoço','sumo','ecrã','rapariga','fixe'];
const GENDER_WORDS:readonly string[]=['sozinho','sozinha','obrigado','obrigada','cansado','cansada'];
const YOU_INDEX:Readonly<Record<string,number>>={you1:1,you2:3,you3:5};
const HYGIENE=/[0-9]|https?:|[\p{Cc}\p{Cf}]|\p{Extended_Pictographic}|[<>[\]]| {2}|\s[;:!?]/u;
type Fail=(m:string)=>void;
function answers(b:{answer:string;acceptedAnswers:readonly string[]},ck:Fail):void{
 ck(b.acceptedAnswers.includes(b.answer)&&new Set(b.acceptedAnswers).size===b.acceptedAnswers.length&&b.acceptedAnswers.length<=16?'':'accepted list');
 ck(STOP.has(fold(b.answer))?'bare function answer':'');
 if(strip(b.answer)!==b.answer)ck(b.acceptedAnswers.includes(strip(b.answer))?'':'explicit accent');
 if(/ç/u.test(b.answer))for(const v of b.acceptedAnswers)ck(stripAll(v)===stripAll(b.answer)&&!/ç/u.test(v)?'cedilla normalized to c in '+v:'');
}
function choices(a:readonly string[],accepted:readonly string[],ck:Fail):void{const acc=accepted.map(norm);ck(a.length===4&&distinct(a)&&a.filter(x=>acc.includes(norm(x))).length===1?'':'choice uniqueness')}
function verifyEvidence(e:PortugueseB2Evidence,fail:Fail):{spec:Spec;forbidden:ReadonlySet<string>}{
 const A=PORTUGUESE_B2_AUTHORITY;
 if(typeof e.specificationSource!=='string'||e.specificationSource.length===0)fail('specification source bytes missing; a sha alone is not authority');
 if(typeof e.prerequisitesSource!=='string'||e.prerequisitesSource.length===0)fail('prerequisites source bytes missing; a sha alone is not authority');
 if(/\r/.test(e.specificationSource)||/\r/.test(e.prerequisitesSource))fail('authority sources must be LF');
 if(sha(e.specificationSource)!==A.specSha256||e.pathSpecSha256!==A.specSha256||e.ledgerSha256!==A.specSha256)fail('specification sha mismatch');
 if(sha(e.prerequisitesSource)!==A.prerequisitesSha256||e.prerequisitesSha256!==A.prerequisitesSha256)fail('prerequisites sha mismatch');
 const parse=(s:string):unknown=>{try{return JSON.parse(s)}catch{return Symbol('unparsable')}};
 if(!isDeepStrictEqual(parse(e.specificationSource),e.specification))fail('specification parse inequality');
 if(!isDeepStrictEqual(parse(e.prerequisitesSource),e.prerequisites))fail('prerequisites parse inequality');
 const sp=specSchema.safeParse(e.specification);if(!sp.success)fail('specification shape '+sp.error.message);
 const pr=prereqSchema.safeParse(e.prerequisites);if(!pr.success)fail('prerequisites shape '+pr.error.message);
 const row=pr.success?pr.data.find(r=>r.targetLanguage==='Portuguese'):undefined;
 const forbidden=new Set<string>();
 if(!row)fail('Portuguese prerequisite row missing');else{
  if(row.frozenLessonCount!==A.frozenLessons)fail('frozen lesson count');
  row.forbiddenTrophies.forEach(w=>forbidden.add(fold(w)));
  if(forbidden.size!==A.earlierDistinct||row.forbiddenTrophies.length!==A.earlierDistinct)fail('forbidden list must hold exactly 299 distinct earlier trophies');
  const earlier=new Set(e.earlierTrophies.map(fold));
  if(e.earlierTrophies.length!==A.earlierDistinct||earlier.size!==A.earlierDistinct||[...earlier].some(w=>!forbidden.has(w)))fail('earlier trophies (200 frozen + 100 reserved) do not equal the 299 prerequisite forbidden set');
 }
 if(!isDeepStrictEqual([...e.trophies],PORTUGUESE_B2_ALLOCATION))fail('trophy allocation differs from literal 20-row allocation');
 if(sp.success&&!isDeepStrictEqual(sp.data.trophyLedger.rows,PORTUGUESE_B2_ALLOCATION))fail('specification ledger differs from literal allocation');
 const ids=new Set<string>();PORTUGUESE_B2_ALLOCATION.forEach((r,i)=>{if(r.pathNumber!==Math.floor(i/10)+1||r.lessonNumber!==i%10+1)fail('allocation order');for(const v of new Set([r.lemma,r.familyKey])){if(ids.has(fold(v))||forbidden.has(fold(v)))fail('allocation collision '+v);ids.add(fold(v))}});
 if(!sp.success)throw new Error('specification unusable');
 return {spec:sp.data,forbidden};
}
export function validatePortugueseB2Draft(value:unknown,evidence:PortugueseB2Evidence):PortugueseB2Draft{
 const errors:string[]=[];const fail:Fail=m=>{if(m)errors.push(m)};
 const {spec,forbidden}=verifyEvidence(evidence,fail);
 const d=portugueseB2DraftSchema.parse(value);
 const A=PORTUGUESE_B2_AUTHORITY;
 fail(d.specRef.pathSpec===A.specFile&&d.specRef.ledger===A.specFile&&d.specRef.pathSpecSha256===A.specSha256&&d.specRef.ledgerSha256===A.specSha256?'':'spec binding');
 const walk=(v:unknown,p:string):void=>{if(typeof v==='string'){if(v!==v.normalize('NFC')||/[\p{Cc}\p{Cf}]/u.test(v))fail(p+' NFC/control')}else if(Array.isArray(v))v.forEach((x,i)=>walk(x,p+'/'+i));else if(v&&typeof v==='object'){const o=v as Record<string,unknown>;if('de'in o&&Object.keys(o).sort().join(',')!=='de,en')fail(p+' bases');Object.entries(o).forEach(([k,x])=>walk(x,p+'/'+k))}};walk(d,'');
 const sp=spec.paths[d.pathNumber-1];const starts=new Set<string>(),slugs=new Set<string>();
 d.lessons.forEach((l:Lesson,i:number)=>{
  const label=`P${d.pathNumber}L${i+1}`;const ck:Fail=m=>{if(m)errors.push(label+' '+m)};const sl=sp.lessons[i];
  ck(l.lessonNumber===i+1&&l.slug===sl.slug?'':'order/slug');ck(slugs.has(l.slug)?'duplicate slug':'');slugs.add(l.slug);
  ck(l.episodeShape===(d.pathNumber===1?'challenge':'precision')?'':'episode shape');ck(l.registerPlan.registers.every(x=>x===sl.register)?'':'spec register');
  const moves=[1,3,5].map(n=>l.dialogue[n].move??'');ck(new Set(moves).size===3&&sp.moveWhitelist.includes(moves[0])?'':'moves');ck(ANSWER_MOVES.includes(moves[1])?'':'answer move');ck(CLOSING_MOVES.includes(moves[2])?'':'closing move');
  l.dialogue.forEach((t,n)=>{const you=n%2===1,b=n===1?[14,26]:n===3?[12,24]:n===5?[10,22]:[6,20],size=tok(t.targetText).length;ck(t.speaker===(you?'you':'them')?'':'speaker');ck((you?t.register===sl.register&&t.interlocutorId===undefined:t.interlocutorId===l.interlocutors[0].id&&t.register===undefined&&t.move===undefined)?'':'turn metadata');ck(size>=b[0]&&size<=b[1]?'':`turn${n} length ${size}`)});
  const first=l.dialogue[1].targetText,focus=l.build.chunks.join(' ');ck(starts.has(first)?'duplicate reply':'');starts.add(first);
  ck(l.build.framePrefix+focus+l.build.frameSuffix===first?'':'build reconstruction');ck(tok(focus).length>=7&&tok(focus).length<=12?'':'build focus length');ck(l.build.chunks.every(x=>tok(x).length>=1&&tok(x).length<=4)?'':'chip length');ck(distinct([...l.build.chunks,...l.build.distractors])?'':'chip distinct');
  [...l.build.chunks,...l.build.distractors].forEach(x=>ck(x!==x.trim()?'chip edge whitespace: '+x:''));
  l.build.chunks.forEach(x=>{const w=tok(x).map(fold);ck(w.every(y=>STOP.has(y)||CLITIC.has(y))?'chip function/clitic token alone: '+x:'');ck(w[w.length-1]==='não'?'negation split from verb chunk: '+x:'')});
  let pos=l.build.framePrefix.length;l.build.chunks.forEach(x=>{ck(span(first,pos,x.length)?'':'chip boundary');pos+=x.length+1});
  for(const [e,n,min,max] of [[l.cloze,3,2,4],[l.synthesis,5,1,2]] as const){
   const target=l.dialogue[n].targetText;ck(e.blanks.length>=min&&e.blanks.length<=max?'':'blank count');ck(JSON.stringify(e.segments.filter(x=>x.kind==='blank').map(x=>x.kind==='blank'?x.index:-1))===JSON.stringify(e.blanks.map((_,k)=>k))?'':'blank indexes');
   ck(e.segments.map(x=>x.kind==='text'?x.text:e.blanks[x.index]?.answer??'').join('')===target?'':(n===3?'cloze':'synthesis')+' reconstruction');ck(e.blanks.filter(x=>x.choices).length<=1?'':'choice count');ck(['frame','connector'].includes(e.blanks[e.moveBlankIndex]?.kind??'')?'':'move blank');
   let at=0;for(const seg of e.segments){const text=seg.kind==='text'?seg.text:e.blanks[seg.index]?.answer??'';if(seg.kind==='blank')ck(span(target,at,text.length)?'':'blank boundary');at+=text.length}
   for(const b of e.blanks as Blank[]){answers(b,ck);ck(tok(b.answer).length>=1&&tok(b.answer).length<=(b.kind==='frame'?4:3)?'':'blank length');ck((b.kind==='form'?Boolean(b.cue):b.cue===undefined)?'':'visible form cue');if(b.choices)choices(b.choices,b.acceptedAnswers,ck)}
  }
  answers(l.recall,ck);ck(l.recall.before+l.recall.answer+l.recall.after===first?'':'recall reconstruction');ck(tok(l.recall.answer).length>=1&&tok(l.recall.answer).length<=3&&span(first,l.recall.before.length,l.recall.answer.length)?'':'recall boundary/length');choices(l.recall.fallbackChoices,l.recall.acceptedAnswers,ck);
  ck(moves.includes(l.pattern.moveType)?'':'pattern move');ck(l.pattern.examples.some(x=>[1,3,5].some(n=>x.targetText===l.dialogue[n].targetText))?'':'pattern reuse');l.pattern.examples.forEach(x=>ck(x.highlights.every(h=>x.targetText.includes(h))?'':'pattern highlight'));
  const spoken=[...l.dialogue.map(x=>x.targetText),...l.pattern.examples.map(x=>x.targetText)];ck(distinct(l.terms.map(x=>x.targetText))?'':'term distinct');ck(l.terms.filter(t=>['connector','frame'].includes(t.kind)).length>=2&&l.terms.filter(t=>['noun','verb','adjective','adverb'].includes(t.kind)).length>=3?'':'term kinds');
  l.terms.forEach(t=>{ck(spoken.some(x=>phrase(x,t.targetText))?'':'term absent '+t.targetText);if(t.acceptedAnswers)answers({answer:t.targetText,acceptedAnswers:t.acceptedAnswers},ck)});
  ck(JSON.stringify(l.speak.map(x=>x.turnIndex))==='[1,3,5]'?'':'speech targets');for(const s of l.speak){ck(s.profile===(s.turnIndex===5?'b2-short':'b2-long')?'':'speech profile');ck(distinct(s.requiredTokens)&&s.requiredTokens.every(w=>tok(w).length===1&&whole(l.dialogue[s.turnIndex].targetText,w)&&!STOP.has(fold(w)))?'':'speech token');if(s.turnIndex===1)ck(s.requiredTokens.filter(w=>whole(focus,w)).length>=2?'':'speech focus')}
  const a=evidence.trophies[(d.pathNumber-1)*10+i];const sur=/^(\S+) \((you[123])/u.exec(sl.trophySurface);
  ck(sur&&l.trophy.lemma===a.lemma&&l.trophy.familyKey===a.familyKey&&l.trophy.pos===a.pos&&l.trophy.surface===sur[1]&&l.trophy.turnIndex===YOU_INDEX[sur[2]]?'':'trophy allocation (surface/turn anchored to spec)');
  ck([1,3,5].includes(l.trophy.turnIndex)&&whole(l.dialogue[l.trophy.turnIndex]?.targetText??'',l.trophy.surface)?'':'trophy turn');ck([l.trophy.lemma,l.trophy.surface,l.trophy.familyKey].some(w=>forbidden.has(fold(w)))?'trophy collision':'');ck(whole(l.trophy.example.targetText,l.trophy.lemma)||whole(l.trophy.example.targetText,l.trophy.surface)?'':'trophy example');
  for(const text of [...spoken,l.trophy.example.targetText,...l.build.chunks,...l.build.distractors,...l.terms.map(t=>t.targetText),...l.cloze.blanks.flatMap(b=>b.choices??[]),...l.synthesis.blanks.flatMap(b=>b.choices??[]),...l.recall.fallbackChoices]){ck(HYGIENE.test(text)?'target hygiene':'');ck(/\u2014/u.test(text)?'em dash':'')}
  for(const lc of ['de','en'] as const){ck(l.sceneCaption[lc].includes(l.dialogue[0].targetText)?'':'caption quote');l.dialogue.slice(1).forEach(t=>ck(l.sceneCaption[lc].includes(t.targetText)||l.situation[lc].includes(t.targetText)?'spoiler':''))}
  CARRIERS[(d.pathNumber-1)*10+i].forEach((set,n)=>set.forEach(c=>ck(phrase(l.dialogue[n*2+1].targetText,c)?'':'required carrier '+c)));
  const productive=sp.staging.filter(b=>Number(b.lessons.split('\u2013')[0])<=i+1).flatMap(b=>b.productive);ck(productive.includes(sl.requiredCarrier)?'':'required carrier staged');
  for(const n of [1,3,5]){
   const text=l.dialogue[n].targetText,words=tok(text).map(fold);
   ck(words.some(w=>VARIETY.includes(w))?'Portuguese variety/register':'');
   ck((sl.register==='senhor'?!words.some(w=>['você','te','teu','tua','contigo'].includes(w)):!/\b(?:o senhor|a senhora)\b/iu.test(text))?'':'address tripwire');
   ck(/\b(?:estou|está|estamos|estão|estar) a \p{L}+r\b/iu.test(text)?'European progressive':'');
   for(const hit of words.filter(w=>/(?:ado|ada|ido|ida|oso|osa)$/u.test(w)||GENDER_WORDS.includes(w)))ck(l.review.acknowledgedWarnings.some(w=>w.code==='PT-NOUN-AGREEMENT'&&w.reason.includes(hit))?'':'gender warning '+hit);
   if(d.pathNumber===1)ck(/\b(?:já que|visto que|de modo que|embora|mesmo que|ou seja|resumindo|proponho que)\b/iu.test(text)?'deferred carrier':'');
   else{ck(/\b(?:ou seja|trata-se de)\b/iu.test(text)?'deferred carrier':'');if(i<3)ck(/\b(?:de modo que|precisa-se)\b/iu.test(text)?'early P2 carrier':'');if(i<7)ck(/\b(?:em decorrência|o que resulta em)\b/iu.test(text)?'early late-P2 carrier':'')}
  }
  if(d.pathNumber===2&&i===7)ck(/\p{L}+-se\b(?! (?:de|da|do|das|dos|a|à|em|no|na)\b)/iu.test(l.dialogue[1].targetText)?'se indeterminado must be the VTI index (precisa-se de), not a synthetic passive':'');
  ck(l.review.reviewers.length===0&&l.review.verdict==='pending'&&l.review.nativeStatus==='unreviewed'&&Object.values(l.review.flags).every(v=>v===false)?'':'pending review');
 });
 if(errors.length)throw new Error(errors.join('\n'));
 return d;
}
