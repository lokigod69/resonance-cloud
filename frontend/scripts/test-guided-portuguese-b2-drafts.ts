import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {GUIDED_LESSONS} from '../src/data/guidedLessonsAuthoring';
import {PORTUGUESE_B2_AUTHORITY,PORTUGUESE_B2_ALLOCATION,validatePortugueseB2Draft,type PortugueseB2Evidence,type PortugueseB2Draft} from './lib/guidedPortugueseB2Drafts';
// Runs from frontend/. Structural gate tests only; no native approval, no publication.
const root=process.cwd();const dir=join(root,'content-drafts/b2-2026-10/portuguese');
const read=(p:string):string=>readFileSync(p,'utf8');const sha=(s:string):string=>createHash('sha256').update(s,'utf8').digest('hex');
const specSource=read(join(dir,'specification.json')),prereqSource=read(join(root,'content-drafts/b2-2026-10/latin-prerequisites.json')),planSource=read(join(root,'content-drafts/b1-2026-10/portuguese-plan.json'));
const specification:unknown=JSON.parse(specSource);const prerequisites:unknown=JSON.parse(prereqSource);
interface PrereqRow{targetLanguage:string;frozenLessonCount:number;activeCorpusSha256:string;b1AllocationSha256:string;forbiddenTrophies:string[]}
const row=(prerequisites as PrereqRow[]).find(r=>r.targetLanguage==='Portuguese');if(!row)throw new Error('Portuguese prerequisite row missing');
interface FrozenShape{targetLanguage:string;level:string;vibeVariants:Record<string,{trophyWord:{word:string}}|undefined>}
const frozen=(GUIDED_LESSONS as unknown as readonly FrozenShape[]).filter(l=>l.targetLanguage==='Portuguese'&&['A1','A2'].includes(l.level));
const frozenWords=frozen.flatMap(l=>Object.values(l.vibeVariants).flatMap(v=>v?[v.trophyWord.word]:[]));
const plan=JSON.parse(planSource) as {paths:{lessons:{trophy:string}[]}[]};const reserved=plan.paths.flatMap(p=>p.lessons.map(l=>l.trophy));
const fold=(s:string):string=>s.normalize('NFC').toLocaleLowerCase('pt-BR');
const earlierTrophies=[...new Set([...frozenWords,...reserved].map(fold))];
const evidence:PortugueseB2Evidence={specificationSource:specSource,specification,pathSpecSha256:sha(specSource),ledgerSha256:sha(specSource),prerequisitesSource:prereqSource,prerequisites,prerequisitesSha256:sha(prereqSource),trophies:PORTUGUESE_B2_ALLOCATION,earlierTrophies};
const p1=JSON.parse(read(join(dir,'p1.json'))) as unknown,p2=JSON.parse(read(join(dir,'p2.json'))) as unknown;
const clone=<T,>(v:T):T=>structuredClone(v);
type Mut=(d:PortugueseB2Draft)=>void;type Probe=readonly [string,1|2,Mut,RegExp];
const run=(d:unknown,e:PortugueseB2Evidence=evidence)=>validatePortugueseB2Draft(d,e);
test('corpus and reservation prerequisites match pinned authority',()=>{
 assert.equal(sha(specSource),PORTUGUESE_B2_AUTHORITY.specSha256);assert.equal(sha(prereqSource),PORTUGUESE_B2_AUTHORITY.prerequisitesSha256);
 assert.equal(frozen.length,200);assert.equal(sha(JSON.stringify(frozen)),row.activeCorpusSha256);assert.equal(sha(planSource),row.b1AllocationSha256);
 assert.equal(reserved.length,100);assert.equal(frozenWords.length,200);assert.equal(earlierTrophies.length,299);assert.equal(row.forbiddenTrophies.length,299);
 assert.deepEqual([...earlierTrophies].sort(),row.forbiddenTrophies.map(fold).sort());
});
test('both real paths pass the gate',()=>{const a=run(p1),b=run(p2);assert.equal(a.pathNumber,1);assert.equal(b.pathNumber,2);assert.equal(a.lessons.length+b.lessons.length,20)});
test('positive rewrites keeping every attested term and dependent field still pass',()=>{
 const d=clone(p1 as PortugueseB2Draft);d.lessons[0].dialogue[2].targetText+=' Entendo.';d.lessons[0].dialogue[2].base.de+=' Verstehe.';d.lessons[0].dialogue[2].base.en+=' I see.';run(d);
 const e=clone(p2 as PortugueseB2Draft);e.lessons[1].review.acknowledgedWarnings.push({code:'PT-NOUN-AGREEMENT',reason:'orgânico in you1 agrees with lixo, not the speaker.'});run(e);
});
test('bounds and carriers: edge-positive terms 8/10, examples 3, speech tokens 2/4, authorized P1L9 Como',()=>{
 const d=clone(p1 as PortugueseB2Draft);d.lessons[0].terms.push({targetText:'tempo',kind:'noun',base:{de:'Zeit',en:'time'}});d.lessons[0].pattern.examples.push({targetText:'Por um lado o ônibus é mais barato; por outro lado o carro dá mais liberdade.',base:{de:'Einerseits ist der Bus billiger; andererseits gibt das Auto mehr Freiheit.',en:'On one hand the bus is cheaper; on the other the car gives more freedom.'},highlights:['Por um lado','por outro lado']});d.lessons[0].speak[0].requiredTokens=['deslocamento','dura','quarenta','cai'];d.lessons[0].speak[2].requiredTokens=['ganho','pesa'];assert.equal(run(d).lessons[0].terms.length,10);
 const e=clone(p2 as PortugueseB2Draft);assert.equal(e.lessons[1].terms.length,8);assert.equal(run(e).pathNumber,2);
 const f=clone(p1 as PortugueseB2Draft);assert.ok(f.lessons[8].dialogue[3].targetText.startsWith('Como a cidade fica'));assert.equal(run(f).lessons[8].trophy.lemma,'arriscado');
});
test('authority: sha without bytes, mutated source, dummy earlier list, reordered trophies',()=>{
 assert.throws(()=>run(p1,{...evidence,specificationSource:''}),/sha alone is not authority|specification sha mismatch/);
 assert.throws(()=>run(p1,{...evidence,specificationSource:specSource.replace('"status"','"state"')}),/specification sha mismatch/);
 assert.throws(()=>run(p1,{...evidence,specification:{...(specification as object),extra:true}}),/parse inequality/);
 assert.throws(()=>run(p1,{...evidence,prerequisitesSource:prereqSource+'\n'}),/prerequisites sha mismatch/);
 assert.throws(()=>run(p1,{...evidence,earlierTrophies:Array.from({length:299},(_,i)=>`palavra${i}`)}),/earlier trophies/);
 assert.throws(()=>run(p1,{...evidence,earlierTrophies:[...earlierTrophies,'extra']}),/earlier trophies/);
 assert.throws(()=>run(p1,{...evidence,trophies:[...PORTUGUESE_B2_ALLOCATION].reverse()}),/allocation/);
 assert.throws(()=>run(p1,{...evidence,specificationSource:specSource.replace(/\n/g,'\r\n')}),/LF|sha mismatch/);
});
const probes:readonly Probe[]=[
 ['language spoof',1,d=>{(d as {targetLanguage:string}).targetLanguage='English'},/Portuguese/],
 ['code spoof',1,d=>{(d as {targetLanguageCode:string}).targetLanguageCode='pt-PT'},/pt-BR/],
 ['unknown key',1,d=>{(d.lessons[0] as unknown as Record<string,unknown>).invented=true},/Unrecognized key/],
 ['spec binding',1,d=>{d.specRef.pathSpecSha256='0'.repeat(64)},/spec binding/],
 ['you register metadata',1,d=>{d.lessons[0].dialogue[1].register='você'},/turn metadata/],
 ['senhor lesson uses você',1,d=>{d.lessons[0].dialogue[5].targetText+=' você'},/address tripwire/],
 ['você lesson uses a senhora',1,d=>{d.lessons[1].dialogue[5].targetText+=' a senhora'},/address tripwire/],
 ['tu paradigm',1,d=>{d.lessons[1].dialogue[3].targetText+=' contigo'},/Portuguese variety/],
 ['pra in P1',1,d=>{d.lessons[1].dialogue[5].targetText+=' pra'},/Portuguese variety/],
 ['European lexis',1,d=>{d.lessons[0].dialogue[3].targetText+=' autocarro'},/Portuguese variety/],
 ['estar a + infinitivo',1,d=>{d.lessons[0].dialogue[3].targetText+=' estou a trabalhar'},/European progressive/],
 ['unacknowledged noun agreement',1,d=>{d.lessons[8].review.acknowledgedWarnings=[]},/gender warning arriscado/],
 ['speaker participle without acknowledgement',1,d=>{d.lessons[0].dialogue[3].targetText+=' estou cansado'},/gender warning cansado/],
 ['digits in voiced text',1,d=>{d.lessons[0].pattern.examples[1].targetText+=' 123'},/target hygiene/],
 ['em dash',1,d=>{d.lessons[0].dialogue[1].targetText=d.lessons[0].dialogue[1].targetText.replace(';',' \u2014')},/em dash/],
 ['control glyph',1,d=>{d.lessons[0].title.de+='\u0007'},/NFC\/control/],
 ['NFD text',1,d=>{d.lessons[0].terms[3].targetText='orçamento'.normalize('NFD')},/NFC\/control/],
 ['build reconstruction',1,d=>{d.lessons[0].build.frameSuffix+='x'},/build reconstruction/],
 ['chip boundary',1,d=>{d.lessons[0].build.chunks=['o desloc','amento que','dura','quarenta minutos','cai para','quinze,']},/chip boundary|chip function/],
 ['bare article chip',1,d=>{d.lessons[0].build.chunks=['o','deslocamento que','dura','quarenta minutos','cai para','quinze,']},/chip function/],
 ['hyphen clitic is one token in speech',2,d=>{d.lessons[7].speak[0].requiredTokens[0]='precisa'},/speech token/],
 ['hyphen clitic split in recall',2,d=>{d.lessons[7].recall.before='Primeiro precisa-';d.lessons[7].recall.answer='se';d.lessons[7].recall.acceptedAnswers=['se'];d.lessons[7].recall.fallbackChoices=['se','me','te','lhe']},/bare function answer|recall boundary/],
 ['synthetic passive instead of se indeterminado',2,d=>{d.lessons[7].dialogue[1].targetText=d.lessons[7].dialogue[1].targetText.replace('precisa-se de cadastro','faz-se o cadastro')},/se indeterminado/],
 ['cloze reconstruction',1,d=>{d.lessons[0].cloze.segments.push({kind:'text',text:'x'})},/cloze reconstruction/],
 ['synthesis reconstruction',1,d=>{d.lessons[0].synthesis.blanks[0].answer='No fim das conta';d.lessons[0].synthesis.blanks[0].acceptedAnswers=['No fim das conta']},/synthesis reconstruction/],
 ['recall reconstruction',1,d=>{d.lessons[0].recall.before+='x'},/recall reconstruction/],
 ['two fallback choices accepted',1,d=>{d.lessons[0].recall.fallbackChoices=['deslocamento','trajeto','deslocados','deslocando']},/choice uniqueness/],
 ['duplicate cloze choice',1,d=>{const c=d.lessons[0].cloze.blanks[0].choices;if(c)c[1]=c[0]},/choice uniqueness/],
 ['cedilla normalized to c',1,d=>{d.lessons[2].recall.acceptedAnswers=['concentração','concentracao']},/cedilla/],
 ['accented canonical without authored stripped variant',2,d=>{d.lessons[0].recall.acceptedAnswers=['já que','porque']},/explicit accent/],
 ['missing canonical answer',1,d=>{d.lessons[0].recall.acceptedAnswers=['trajeto']},/accepted list/],
 ['form blank without cue',1,d=>{delete d.lessons[0].cloze.blanks[1].cue},/visible form cue/],
 ['deferred P2 carrier in P1',1,d=>{d.lessons[0].dialogue[5].targetText+=' de modo que'},/deferred carrier/],
 ['de modo que before P2L4',2,d=>{d.lessons[0].dialogue[3].targetText+=' de modo que'},/early P2 carrier/],
 ['late P2 carrier before P2L8',2,d=>{d.lessons[3].dialogue[5].targetText+=' em decorrência'},/early late-P2 carrier/],
 ['required carrier removed',1,d=>{d.lessons[1].dialogue[1].targetText=d.lessons[1].dialogue[1].targetText.replace('enquanto','e')},/required carrier enquanto/],
 ['duplicate moves',1,d=>{d.lessons[0].dialogue[3].move=d.lessons[0].dialogue[1].move},/moves/],
 ['trophy surface not spec inflected form',1,d=>{d.lessons[1].trophy.surface='ponderar'},/trophy allocation/],
 ['trophy turn differs from spec',1,d=>{d.lessons[1].trophy.turnIndex=1},/trophy allocation/],
 ['trophy lemma swapped',1,d=>{d.lessons[0].trophy.lemma='aluguel'},/trophy allocation/],
 ['term absent',1,d=>{d.lessons[0].terms[0].targetText='inexistente'},/term absent/],
 ['speech profile',1,d=>{d.lessons[0].speak[0].profile='b2-short'},/speech profile/],
 ['caption quote',1,d=>{d.lessons[0].sceneCaption.de='Unbekannter Eröffnungssatz'},/caption quote/],
 ['premature approval',1,d=>{d.lessons[0].review.flags.noFiller=true},/pending review/],
 ['stop word trophy',1,d=>{d.lessons[0].recall.answer='o';d.lessons[0].recall.acceptedAnswers=['o']},/bare function answer/],
 ['seven terms',2,d=>{d.lessons[1].terms.pop()},/at least 8 element/],
 ['eleven terms',1,d=>{d.lessons[1].terms.push({targetText:'cidade',kind:'noun',base:{de:'Stadt',en:'city'}})},/at most 10 element/],
 ['one pattern example',1,d=>{d.lessons[0].pattern.examples.pop()},/at least 2 element/],
 ['four pattern examples',1,d=>{const x=d.lessons[0].pattern.examples;x.push(clone(x[1]),clone(x[1]))},/at most 3 element/],
 ['one speech token',1,d=>{d.lessons[0].speak[2].requiredTokens=['ganho']},/at least 2 element/],
 ['five speech tokens',1,d=>{d.lessons[0].speak[0].requiredTokens=['deslocamento','dura','quarenta','cai','quinze']},/at most 4 element/],
 ['P1L9 causal Como removed with coupled cloze',1,d=>{const l=d.lessons[8];l.dialogue[3].targetText=l.dialogue[3].targetText.replace('Como a cidade','Quando a cidade');const b=l.cloze.blanks[0];b.answer='Quando';b.acceptedAnswers=['Quando'];b.choices=['Quando','Apesar de','Em vez de','Devido a']},/required carrier como a cidade fica/],
 ['chunk steals framePrefix trailing space',2,d=>{const b=d.lessons[0].build;b.framePrefix=b.framePrefix.slice(0,-1);b.chunks[0]=' '+b.chunks[0]},/chip edge whitespace/],
 ['chunk steals frameSuffix leading space',2,d=>{const b=d.lessons[0].build;b.frameSuffix=b.frameSuffix.slice(1);b.chunks[4]=b.chunks[4]+' '},/chip edge whitespace/],
 ['P1L2 them turn over twenty tokens',1,d=>{d.lessons[1].dialogue[2].targetText=d.lessons[1].dialogue[2].targetText.replace('quando quiser','na hora que quiser')},/turn2 length 21/]
];
for(const [label,path,mutate,re] of probes)test(`negative: ${label}`,()=>{const d=clone((path===1?p1:p2) as PortugueseB2Draft);mutate(d);assert.throws(()=>run(d),re)});
