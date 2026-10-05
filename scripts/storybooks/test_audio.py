"""Offline adversarial execution tests; every ledger is in a temporary directory."""
import copy
from contextlib import closing, redirect_stdout
from decimal import Decimal
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from scripts.storybooks import run_audio as runner
from scripts.storybooks.plan_audio import build_plan
from src.services.guided_tts import campaign


def fixture_plan():
    sources={name:b'fixture source' for name in ['english.json','spanish.json']}
    phrases=[]
    for locale in ['en-GB','es-ES']:
        for index,word in enumerate(['A short line.','Another line.']):
            text=locale+' '+word
            phrases.append({'locale':locale,'text':text,'characters':len(text),
                'textKey':campaign.digest((locale+'\0'+text).encode()),'uses':[f'{locale}/{index}/line']})
    manifest={'schemaVersion':1,'status':'offline-unvoiced','voiceAssignments':None,'spendingAuthorized':False,
        'sources':{k:campaign.digest(v) for k,v in sources.items()},'phrases':phrases,'uses':len(phrases)}
    plan=build_plan(manifest,sources)
    plan['scopeKeys']=sorted(r['cache_key'] for r in campaign.unique_requests(plan))
    plan['scopeKey']=campaign.digest(campaign.canonical({'sources':plan['sources'],
        'profiles':[g['proposedVoiceProfile'] for g in plan['groups']]}).encode())
    return plan


class FakeProvider:
    def __init__(self, failure=None): self.calls=[]; self.failure=failure
    def preflight(self, identities, evidence, receipts=()): return {key:Decimal(1) for key in identities}
    def synthesize(self, request):
        self.calls.append(request['cache_key'])
        if self.failure=='ambiguous': raise RuntimeError('fixture transport loss')
        cost=Decimal(99999 if self.failure=='overbound' else 1)
        return campaign.Receipt(b'fixture mp3',200,'fixture-request',cost,'audio/mpeg')


def approval(plan, limit=1000):
    return {'approved':True,'sources':plan['sources'],'campaignCeiling':200000,'scopeKey':plan['scopeKey'],
        'storyCreditLimit':limit,'modes':['pilot','full'],'verbatimRequest':'TEST FIXTURE ONLY','threadId':'fixture'}


class AudioContract(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory(); self.addCleanup(self.temp.cleanup)
        self.root=Path(self.temp.name); self.plan=fixture_plan()
        ledger=campaign.Campaign(self.root/runner.DIRECTORY,runner.ANCHOR)
        seed={'cache_key':'f'*64,'text':'Previous campaign.','voice_id':'previous','model_id':'eleven_v4','settings':{}}
        ledger.reserve(seed,20)
        ledger.save_receipt(seed['cache_key'],campaign.Receipt(b'anchor',200,'anchor-receipt',Decimal(7),'audio/mpeg'))
        campaign.write_audio(self.root/runner.DIRECTORY/(seed['cache_key']+'.mp3'),b'anchor')
        with ledger.db: ledger.db.execute("UPDATE requests SET state='ready' WHERE key=?",(seed['cache_key'],))
        ledger.db.close()
        self.evidence={'ownerApproval':approval(self.plan)}

    def run_plan(self, plan, provider=None):
        return runner.execute_reviewed(self.root,plan,'b'*64,self.evidence,{},provider or FakeProvider(),
            decoder=lambda audio,mime:None)

    def audition(self):
        pilot=runner.pilot_plan(self.plan)
        self.evidence['voiceAudition']={'verdict':'PASS','scopeKey':self.plan['scopeKey'],
            'listener':'fixture','evidenceReference':'fixture only','voices':{}}
        for group in pilot['groups']:
            item=group['items'][0]; key=item['cache_key']
            self.evidence['voiceAudition']['voices'][group['locale']]={'profile':copy.deepcopy(group['proposedVoiceProfile']),
                'cacheKey':key,'audioSha256':campaign.digest((self.root/runner.DIRECTORY/f'{key}.mp3').read_bytes()),
                'localeVerdict':'PASS','listeningNotes':'fixture only'}

    def test_pilot_full_reuse_and_budget_persistence(self):
        provider=FakeProvider()
        self.run_plan(runner.pilot_plan(self.plan),provider); self.audition()
        result=self.run_plan(self.plan,provider)
        self.assertEqual(len(provider.calls),4); self.assertEqual(len(set(provider.calls)),4)
        self.assertEqual(result['storyCommittedCredits'],'4')
        self.run_plan(self.plan,provider); self.assertEqual(len(provider.calls),4)
        with closing(campaign.sqlite3.connect(self.root/runner.DIRECTORY/'campaign.sqlite3')) as db:
            self.assertEqual(db.execute('SELECT cap FROM campaign').fetchone()[0],200000)
            self.assertEqual(db.execute('SELECT charged FROM requests WHERE key=?',('f'*64,)).fetchone()[0],'7')

    def test_budget_blocks_before_reservation_and_counts_pilot(self):
        provider=FakeProvider(); self.run_plan(runner.pilot_plan(self.plan),provider); self.audition()
        self.evidence['ownerApproval']['storyCreditLimit']=2
        with self.assertRaisesRegex(campaign.CampaignError,'story_budget_exceeded'): self.run_plan(self.plan,provider)
        self.assertEqual(len(provider.calls),2)
        with closing(campaign.sqlite3.connect(self.root/runner.DIRECTORY/'campaign.sqlite3')) as db:
            self.assertEqual(db.execute("SELECT COUNT(*) FROM requests WHERE state!='ready'").fetchone()[0],0)

    def test_budget_validation(self):
        content={'verdict':'PASS','sources':self.plan['sources'],'unresolvedFindings':0}
        evidence={**self.evidence,'fableReview':content,'independentContentReview':content,
            'independentExecutionReview':{'verdict':'PASS','code':{},'runtime':{}}}
        for invalid in [None,0,-1,'NaN','Infinity','bad',200001]:
            with self.subTest(invalid=invalid):
                evidence['ownerApproval']['storyCreditLimit']=invalid
                with self.assertRaises(campaign.CampaignError): runner.validate_evidence(evidence,self.plan,{}, {},'pilot')

    def test_audition_binding_and_tampered_audio(self):
        self.run_plan(runner.pilot_plan(self.plan)); self.audition()
        valid=copy.deepcopy(self.evidence)
        for mutate in [lambda a:a.pop('listener'),lambda a:a.update(scopeKey='stale'),
            lambda a:a['voices']['en-GB'].update(cacheKey='stale'),
            lambda a:a['voices']['es-ES']['profile'].update(provider_voice_id='wrong')]:
            self.evidence=copy.deepcopy(valid); mutate(self.evidence['voiceAudition'])
            with self.assertRaises(campaign.CampaignError): runner.validate_audition(self.root,self.evidence,self.plan)
        self.evidence=valid
        key=self.evidence['voiceAudition']['voices']['en-GB']['cacheKey']
        (self.root/runner.DIRECTORY/f'{key}.mp3').write_bytes(b'changed')
        with self.assertRaises(campaign.CampaignError): runner.validate_audition(self.root,self.evidence,self.plan)

    def test_ambiguous_never_retried(self):
        provider=FakeProvider('ambiguous')
        with self.assertRaisesRegex(campaign.CampaignError,'transport_ambiguous'):
            self.run_plan(runner.pilot_plan(self.plan),provider)
        self.assertEqual(len(provider.calls),1)
        with self.assertRaisesRegex(campaign.CampaignError,'explicit_reconciliation_required'):
            self.run_plan(runner.pilot_plan(self.plan),provider)
        self.assertEqual(len(provider.calls),1)

    def test_overbound_receipt_is_preserved(self):
        provider=FakeProvider('overbound')
        with self.assertRaisesRegex(campaign.CampaignError,'billed_amount_exceeds_reservation'):
            self.run_plan(runner.pilot_plan(self.plan),provider)
        with closing(campaign.sqlite3.connect(self.root/runner.DIRECTORY/'campaign.sqlite3')) as db:
            row=db.execute("SELECT charged,state,audio FROM requests WHERE state='blocked'").fetchone()
            self.assertEqual(row,('99999','blocked',b'fixture mp3'))
        with self.assertRaisesRegex(campaign.CampaignError,'explicit_reconciliation_required'):
            self.run_plan(runner.pilot_plan(self.plan),provider)
        self.assertEqual(len(provider.calls),1)

    def test_missing_campaign_and_occupied_lock(self):
        with self.assertRaises(campaign.CampaignError): runner.existing_campaign(self.root/'missing')
        provider=FakeProvider()
        with campaign.run_lock(self.root/runner.LOCK):
            with self.assertRaisesRegex(campaign.CampaignError,'another_run_is_active'):
                self.run_plan(runner.pilot_plan(self.plan),provider)
        self.assertEqual(provider.calls,[])

    def test_dry_run_no_provider_ledger_or_new_file_and_stale_fingerprint(self):
        rates={'mode':'pilot','models':{'eleven_v4':{'modelCharacterCostMultiplier':1,'voices':{
            g['proposedVoiceProfile']['provider_voice_id']:{'creditMultiplier':10} for g in self.plan['groups']}}}}
        (self.root/'rates.json').write_text(json.dumps(rates)); (self.root/'evidence.json').write_text('{}')
        args=['--rates',str(self.root/'rates.json'),'--evidence',str(self.root/'evidence.json')]
        before={p.relative_to(self.root):p.read_bytes() for p in self.root.rglob('*') if p.is_file()}
        with patch.object(runner,'rebuild',return_value=(runner.pilot_plan(self.plan),{},{})), \
             patch.object(campaign,'Campaign',side_effect=AssertionError('must not open ledger')):
            output=io.StringIO()
            with redirect_stdout(output):
                runner.main(args,root=self.root,factory=lambda _:self.fail('provider constructed'))
            fingerprint=json.loads(output.getvalue())['inputFingerprint']
            changed=runner.pilot_plan(self.plan); changed['sources']={**changed['sources'],'english.json':'changed'}
            with patch.object(runner,'rebuild',return_value=(changed,{},{})):
                with self.assertRaisesRegex(campaign.CampaignError,'exact_dry_run_fingerprint_required'):
                    runner.main(args+['--commit','--expected-input-sha256',fingerprint],root=self.root,
                        factory=lambda _:self.fail('provider constructed'))
        after={p.relative_to(self.root):p.read_bytes() for p in self.root.rglob('*') if p.is_file()}
        self.assertEqual(before,after)


if __name__=='__main__': unittest.main()
