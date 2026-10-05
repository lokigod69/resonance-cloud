"""Guarded storybook continuation of the existing local campaign. Dry-run default.

Only a source-bound owner budget, content review, execution review and exact dry-run
fingerprint permit --commit. Never publish, reset the ledger, or retry a request.
"""
from __future__ import annotations
import argparse
from contextlib import closing
import copy
from decimal import Decimal, ROUND_CEILING
import json
import os
from pathlib import Path
import shutil
import sqlite3
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
from scripts.storybooks.plan_audio import build_plan
from src.services.guided_tts import campaign

DIRECTORY = 'review-artifacts/guided-audio-20261003/api'
LOCK = 'review-artifacts/.guided-audio-api.lock'
ANCHOR = '9e179954d1e38b956f7e439687c110a9d055f7c2ae10c32281beb11a04cdf1af'
CODE = ['scripts/storybooks/run_audio.py','scripts/storybooks/plan_audio.py','scripts/storybooks/export.mjs',
        'src/services/guided_tts/campaign.py','src/services/guided_tts/inventory.py',
        'src/__init__.py','src/services/__init__.py','src/services/guided_tts/__init__.py']


def existing_campaign(root):
    location = root / DIRECTORY / 'campaign.sqlite3'
    try:
        with closing(sqlite3.connect(location.as_uri() + '?mode=ro', uri=True, timeout=30)) as db:
            if db.execute('SELECT id,cap FROM campaign').fetchall() != [(1, campaign.API_CAP)]:
                raise campaign.CampaignError('existing_campaign_required')
            if not db.execute('SELECT 1 FROM manifests WHERE fingerprint=?', (ANCHOR,)).fetchone():
                raise campaign.CampaignError('established_campaign_required')
            if not db.execute("SELECT 1 FROM requests WHERE manifest_fingerprint=? AND state='ready' AND CAST(charged AS REAL)>0 LIMIT 1",(ANCHOR,)).fetchone():
                raise campaign.CampaignError('established_receipt_required')
    except (OSError, sqlite3.Error) as error:
        raise campaign.CampaignError('existing_campaign_required') from error


def pilot_plan(plan):
    result = copy.deepcopy(plan)
    for group in result['groups']:
        item = next((i for i in group['items'] if any(c.endswith('/line') for c in i['sourceCoordinates'])), None)
        if item is None:
            raise campaign.CampaignError('representative_story_line_required')
        item['surface'] = 'corePhrase'
        group['items'] = [item]
    result['mode'] = 'pilot'
    result['uniqueAudioFiles'] = len(result['groups'])
    result['characters'] = sum(g['items'][0]['character_count'] for g in result['groups'])
    result['uses'] = sum(len(g['items'][0]['sourceCoordinates']) for g in result['groups'])
    return result


def rebuild(root, mode):
    script = "import {buildManifest} from './scripts/storybooks/export.mjs';console.log(JSON.stringify(await buildManifest()));"
    result = subprocess.run(['node','--input-type=module','-e',script],cwd=root,capture_output=True,check=True)
    manifest = json.loads(result.stdout)
    directory = root / 'frontend/content-drafts/storybooks-2026-10'
    plan = build_plan(manifest,{name:(directory/name).read_bytes() for name in manifest['sources']})
    plan['scopeKeys'] = sorted(r['cache_key'] for r in campaign.unique_requests(plan))
    plan['scopeKey'] = campaign.digest(campaign.canonical({'sources':plan['sources'],
        'profiles':[g['proposedVoiceProfile'] for g in plan['groups']]}).encode('utf-8'))
    if mode == 'pilot': plan = pilot_plan(plan)
    code = {name:campaign.digest((root/name).read_bytes()) for name in CODE}
    runtime = {'python':sys.version,'node':subprocess.run(['node','--version'],capture_output=True,check=True,text=True).stdout.strip()}
    return plan,code,runtime


def validate_evidence(evidence, plan, code, runtime, mode):
    for key in ['fableReview','independentContentReview']:
        review=evidence.get(key,{})
        if review.get('verdict') != 'PASS' or review.get('sources') != plan['sources'] or review.get('unresolvedFindings') != 0:
            raise campaign.CampaignError('source_bound_content_review_required')
    review=evidence.get('independentExecutionReview',{})
    if review.get('verdict') != 'PASS' or review.get('code') != code or review.get('runtime') != runtime:
        raise campaign.CampaignError('exact_execution_review_required')
    approval=evidence.get('ownerApproval',{})
    if (approval.get('approved') is not True or approval.get('sources') != plan['sources']
            or approval.get('campaignCeiling') != campaign.API_CAP or mode not in approval.get('modes',[])
            or approval.get('scopeKey') != plan['scopeKey']
            or not approval.get('verbatimRequest') or not approval.get('threadId')):
        raise campaign.CampaignError('owner_story_scope_and_budget_required')
    allowance = campaign.amount(approval.get('storyCreditLimit'))
    if allowance <= 0 or allowance > campaign.API_CAP:
        raise campaign.CampaignError('positive_story_budget_within_campaign_required')


def validate_audition(root, evidence, plan):
    audition=evidence.get('voiceAudition',{})
    expected=pilot_plan(plan)
    if (audition.get('verdict') != 'PASS' or audition.get('scopeKey') != plan['scopeKey']
            or not audition.get('listener') or not audition.get('evidenceReference')
            or set(audition.get('voices',{})) != {g['locale'] for g in plan['groups']}):
        raise campaign.CampaignError('bound_voice_audition_required')
    with closing(sqlite3.connect((root/DIRECTORY/'campaign.sqlite3').as_uri()+'?mode=ro',uri=True)) as db:
        for group in expected['groups']:
            request=campaign.unique_requests({**expected,'groups':[group]})[0]
            review=audition['voices'][group['locale']]
            row=db.execute('SELECT state,identity,audio_hash,audio,status,charged,request_id FROM requests WHERE key=?',
                           (request['cache_key'],)).fetchone()
            if (review.get('profile') != group['proposedVoiceProfile'] or review.get('cacheKey') != request['cache_key']
                    or review.get('localeVerdict') != 'PASS' or not review.get('listeningNotes') or not row
                    or row[0] != 'ready' or row[1] != campaign.canonical(request) or row[4] != 200
                    or campaign.amount(row[5]) <= 0 or not row[6]
                    or review.get('audioSha256') != row[2] or campaign.digest(row[3]) != row[2]
                    or campaign.digest((root/DIRECTORY/f"{request['cache_key']}.mp3").read_bytes()) != row[2]):
                raise campaign.CampaignError('matching_ready_audition_required')


def checked_in(root, names):
    for name in names:
        result=subprocess.run(['git','show',f'HEAD:{name}'],cwd=root,capture_output=True)
        if result.returncode or result.stdout.replace(b'\r\n',b'\n') != (root/name).read_bytes().replace(b'\r\n',b'\n'):
            raise campaign.CampaignError('source_or_code_not_checked_in')


def story_committed(ledger, keys):
    return sum((max(Decimal(r['reserved']),campaign.amount(r['charged']))
        if r['state'] not in {'ready','settled'} and r['charged'] is not None
        else campaign.amount(r['charged'] if r['charged'] is not None else r['reserved']))
        for r in ledger.rows() if r['key'] in keys)


def reservation_cost(request, rates):
    return int((Decimal(len(request['text'])) * campaign.amount(rates[(request['voice_id'],request['model_id'])]))
               .to_integral_value(rounding=ROUND_CEILING))


def execute_reviewed(root, plan, fingerprint, evidence, rates, provider, *,
                     decoder=campaign.decode_mp3, writer=campaign.write_audio):
    """Same durable campaign operations, with an additional per-story-scope cap.

    The global lock covers both budget checks and every reservation/receipt. A
    local budget stop occurs before reservation, so it cannot look ambiguous.
    """
    if decoder is campaign.decode_mp3 and not shutil.which('ffmpeg'):
        raise campaign.CampaignError('ffmpeg_required')
    allowance=campaign.amount(evidence['ownerApproval']['storyCreditLimit'])
    keys=set(plan['scopeKeys']); requests=campaign.unique_requests(plan)
    if allowance <= 0 or allowance > campaign.API_CAP or not {r['cache_key'] for r in requests} <= keys:
        raise campaign.CampaignError('invalid_story_budget_scope')
    with campaign.run_lock(root/LOCK):
        existing_campaign(root)
        if plan.get('mode') != 'pilot': validate_audition(root,evidence,plan)
        ledger=campaign.Campaign(root/DIRECTORY,fingerprint)
        try:
            ledger.check_clear()
            verified_rates=provider.preflight({(r['voice_id'],r['model_id']) for r in requests},rates,ledger.rate_receipts())
            dispatched=0
            for request in requests:
                cost=reservation_cost(request,verified_rates)
                if not ledger.db.execute('SELECT 1 FROM requests WHERE key=?',(request['cache_key'],)).fetchone():
                    if story_committed(ledger,keys) + cost > allowance:
                        raise campaign.CampaignError('story_budget_exceeded')
                if not ledger.reserve(request,cost): continue
                key=request['cache_key']
                try: receipt=provider.synthesize(request)
                except BaseException: ledger.block(key,'transport_ambiguous')
                ledger.save_receipt(key,receipt)
                if receipt.status != 200 or not receipt.request_id or receipt.character_cost is None:
                    ledger.block(key,'response_requires_reconciliation',receipt)
                if receipt.character_cost > cost: ledger.block(key,'billed_amount_exceeds_reservation',receipt)
                try:
                    decoder(receipt.audio,receipt.mime)
                    writer(root/DIRECTORY/f'{key}.mp3',receipt.audio)
                except Exception: ledger.block(key,'audio_validation_or_delivery_failed',receipt)
                with ledger.db: ledger.db.execute("UPDATE requests SET state='ready' WHERE key=?",(key,))
                dispatched+=1
            return {'mode':'commit','dispatched':dispatched,'storyCommittedCredits':str(story_committed(ledger,keys)),
                    'storyCreditLimit':str(allowance),'cap':campaign.API_CAP}
        finally: ledger.db.close()


def main(argv=None, *, root=ROOT, factory=campaign.ElevenLabsTransport):
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--mode',choices=['pilot','full'],default='pilot')
    p.add_argument('--rates',type=Path,required=True)
    p.add_argument('--evidence',type=Path,required=True)
    p.add_argument('--expected-input-sha256')
    p.add_argument('--commit',action='store_true')
    a=p.parse_args(argv)
    root=Path(root).resolve()
    plan,code,runtime=rebuild(root,a.mode)
    evidence=json.loads(a.evidence.read_bytes()); rates=json.loads(a.rates.read_bytes())
    fingerprint=campaign.digest(campaign.canonical({'plan':plan,'code':code,'runtime':runtime,'evidence':evidence,'rates':rates}).encode('utf-8'))
    if not a.commit:
        result=campaign.execute(plan,fingerprint,root/DIRECTORY,sample_per_voice=a.mode=='pilot')
        declared={(r['voice_id'],r['model_id']):campaign.amount(rates['models'][r['model_id']]['modelCharacterCostMultiplier'])*
                  campaign.amount(rates['models'][r['model_id']]['voices'][r['voice_id']]['creditMultiplier'])
                  for r in campaign.unique_requests(plan)}
        print(json.dumps({**result,'sources':plan['sources'],'scopeKey':plan['scopeKey'],'code':code,'runtime':runtime,
            'declaredFirstAttemptCredits':sum(reservation_cost(r,declared) for r in campaign.unique_requests(plan)),
            'storyCreditLimit':evidence.get('ownerApproval',{}).get('storyCreditLimit'),
            'evidenceValidatedForSpending':False},indent=2))
        return 0
    if a.expected_input_sha256 != fingerprint: raise campaign.CampaignError('exact_dry_run_fingerprint_required')
    validate_evidence(evidence,plan,code,runtime,a.mode)
    if rates.get('mode') != ('pilot' if a.mode=='pilot' else 'receipt-verified'):
        raise campaign.CampaignError('matching_rate_review_required')
    checked_in(root,[*CODE,*['frontend/content-drafts/storybooks-2026-10/'+n for n in plan['sources']]])
    existing_campaign(root)
    if a.mode == 'full': validate_audition(root,evidence,plan)
    provider=factory(os.getenv('ELEVENLABS_API_KEY'))
    try:
        result=execute_reviewed(root,plan,fingerprint,evidence,rates,provider)
        print(json.dumps(result,indent=2)); return 0
    finally: provider.close()


if __name__=='__main__':
    try: raise SystemExit(main())
    except (campaign.CampaignError,ValueError,KeyError,OSError,subprocess.SubprocessError) as error:
        reason=str(error) if isinstance(error,campaign.CampaignError) else 'invalid_or_stale_story_inputs'
        print(json.dumps({'status':'stopped','reason':reason}),file=sys.stderr)
        raise SystemExit(2)
