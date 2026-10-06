"""Reserve one website pilot under the existing campaign lock; never synthesize.

The operator uses the normal browser UI once after READY_FOR_UI, then enters
DONE. Only an exact new provider-history match can settle the reservation.
Website receipts remain distinct from API receipts and cannot calibrate API rates.
"""
from __future__ import annotations
import argparse
from datetime import datetime, timezone
from decimal import Decimal
import json
from pathlib import Path
import sys
import time

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
import httpx
from dotenv import dotenv_values
from scripts.storybooks import run_audio as base
from src.services.guided_tts import campaign

SELF = 'scripts/storybooks/web_pilot.py'


def ui_binding(path, request, locale, now):
    ui = json.loads(path.read_bytes())
    observed = datetime.fromisoformat(ui['observedAt']).timestamp()
    sliders = {x['label']:x['value'] for x in ui.get('sliders',[])}
    if (not 0 <= now-observed <= 3600 or ui.get('locale') != locale
            or ui.get('text') != request['text'] or ui.get('voiceId') != request['voice_id']
            or ui.get('modelLabel') != 'Eleven v4' or request['model_id'] != 'eleven_v4'
            or sliders != {'Stability':'0.5','Similarity':'0.75'}
            or ui.get('outputLabel') != 'MP3 44.1 kHz (128kbps)'):
        raise campaign.CampaignError('exact_recent_browser_evidence_required')
    assets = {}
    for key in ['screenshot','dom']:
        name = ui.get(key,'')
        if not name or Path(name).name != name:
            raise campaign.CampaignError('browser_evidence_assets_required')
        payload = (path.parent/name).read_bytes()
        if not payload:
            raise campaign.CampaignError('browser_evidence_assets_required')
        assets[key] = {'path':str(path.parent/name),'sha256':campaign.digest(payload)}
    return {'path':str(path),'sha256':campaign.digest(path.read_bytes()),'observation':ui,'assets':assets}


def web_request(request):
    result = {**request, 'transport': 'elevenlabs-web-ui', 'sourceCacheKey': request['cache_key']}
    del result['cache_key']
    result['cache_key'] = campaign.digest(campaign.canonical(result).encode())
    return result


def history_matches(item, request, baseline_ids, started):
    dialogue = item.get('dialogue')
    exact_text = (item.get('text') == request['text'] and item.get('voice_id') == request['voice_id'])
    exact_dialogue = (isinstance(dialogue, list) and len(dialogue) == 1
        and dialogue[0].get('text') == request['text'] and dialogue[0].get('voice_id') == request['voice_id'])
    settings = item.get('settings') or {}
    return (item.get('history_item_id') not in baseline_ids
        and isinstance(item.get('date_unix'), int) and item['date_unix'] >= started
        and (exact_text or exact_dialogue) and item.get('model_id') == request['model_id']
        and settings.get('stability') == request['settings']['stability']
        and settings.get('similarity_boost', .75) == request['settings']['similarity_boost']
        and item.get('output_format') == 'mp3_44100_128' and bool(item.get('request_id')))


def charge(item, before, after, reservation):
    cost = campaign.amount(item['character_count_change_to']) - campaign.amount(item['character_count_change_from'])
    if cost <= 0 or cost > reservation or after - before != cost:
        raise campaign.CampaignError('website_charge_requires_reconciliation')
    return cost


def get_json(client, path, **kwargs):
    response = client.get(path, **kwargs)
    if response.status_code != 200:
        raise campaign.CampaignError('read_only_provider_check_failed')
    return response.json()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--locale', choices=['en-GB','es-ES'], required=True)
    parser.add_argument('--evidence', type=Path, required=True)
    parser.add_argument('--audit-directory', type=Path, required=True)
    parser.add_argument('--ui-evidence', type=Path, required=True)
    parser.add_argument('--commit', action='store_true')
    parser.add_argument('--expected-input-sha256')
    args = parser.parse_args()
    plan, code, runtime = base.rebuild(ROOT, 'pilot')
    evidence = json.loads(args.evidence.read_bytes())
    base.validate_evidence(evidence, plan, code, runtime, 'pilot')
    helper_hash = campaign.digest((ROOT/SELF).read_bytes())
    review = evidence.get('websitePilotReview', {})
    if review.get('verdict') != 'PASS' or review.get('helperSha256') != helper_hash:
        raise campaign.CampaignError('website_helper_review_required')
    approval = evidence['ownerApproval']
    if approval.get('storyCreditLimit') != 10000 or approval.get('recordingDateUtc') != '2026-10-06':
        raise campaign.CampaignError('new_free_window_approval_required')
    if 'website-pilot' not in approval.get('transports', []):
        raise campaign.CampaignError('website_pilot_scope_required')
    group = next(g for g in plan['groups'] if g['locale'] == args.locale)
    request = web_request(campaign.unique_requests({**plan,'groups':[group]})[0])
    ui = ui_binding(args.ui_evidence.resolve(),request,args.locale,time.time())
    keys = set(plan['scopeKeys'])
    full, _, _ = base.rebuild(ROOT, 'full')
    keys.update(web_request(r)['cache_key'] for r in campaign.unique_requests(full))
    cost = len(request['text']) * 10
    fingerprint = campaign.digest(campaign.canonical({'request':request,'evidence':evidence,
        'code':code,'helper':helper_hash,'runtime':runtime,'ui':ui}).encode())
    if not args.commit:
        print(json.dumps({'fingerprint':fingerprint,'request':request,'reservation':cost,'limit':10000},ensure_ascii=False))
        return
    if args.expected_input_sha256 != fingerprint:
        raise campaign.CampaignError('exact_dry_run_fingerprint_required')
    if datetime.now(timezone.utc).date().isoformat() != approval['recordingDateUtc']:
        raise campaign.CampaignError('recording_window_expired')
    base.checked_in(ROOT, [SELF,*base.CODE,*['frontend/content-drafts/storybooks-2026-10/'+n for n in plan['sources']]])
    args.audit_directory.mkdir(parents=True, exist_ok=True)
    audit_path = args.audit_directory / f'{request["cache_key"]}.json'
    if audit_path.exists():
        raise campaign.CampaignError('existing_audit_no_repeat')
    with campaign.run_lock(ROOT/base.LOCK):
        base.existing_campaign(ROOT)
        ledger = campaign.Campaign(ROOT/base.DIRECTORY, fingerprint)
        try:
            ledger.check_clear()
            if base.story_committed(ledger, keys) + cost > 10000:
                raise campaign.CampaignError('story_budget_exceeded')
            with httpx.Client(base_url='https://api.elevenlabs.io',
                    headers={'xi-api-key':dotenv_values(ROOT/'.env')['ELEVENLABS_API_KEY']},
                    timeout=30,trust_env=False,follow_redirects=False) as client:
                before = get_json(client, '/v1/user/subscription')
                if before['tier'] != 'free' or before['character_limit'] != 10000:
                    raise campaign.CampaignError('free_account_required')
                if before['character_limit'] - before['character_count'] < cost:
                    raise campaign.CampaignError('insufficient_remaining_credits')
                history = get_json(client,'/v1/history',params={'page_size':100})['history']
                baseline_ids = {item['history_item_id'] for item in history}
                started = int(time.time())
                audit = {'fingerprint':fingerprint,'request':request,'reservation':cost,
                    'beforeCount':before['character_count'],'started':started,
                    'status':'reserved-awaiting-browser','transport':'website UI; no synthesis API call','uiEvidence':ui}
                campaign.write_audio(audit_path, (json.dumps(audit,ensure_ascii=False,indent=2)+'\n').encode())
                if not ledger.reserve(request,cost):
                    raise campaign.CampaignError('existing_request_no_repeat')
                print(json.dumps({'status':'READY_FOR_UI','request':request,'reservation':cost},ensure_ascii=False),flush=True)
                if sys.stdin.readline().strip() != 'DONE' or time.time()-started > 900:
                    raise campaign.CampaignError('browser_result_uncertain_no_retry')
                items = get_json(client,'/v1/history',params={'page_size':100})['history']
                matches = [i for i in items if history_matches(i,request,baseline_ids,started)]
                if len(matches) != 1:
                    raise campaign.CampaignError('unique_exact_history_required_no_retry')
                item = matches[0]
                after = get_json(client,'/v1/user/subscription')
                actual = charge(item,Decimal(before['character_count']),Decimal(after['character_count']),cost)
                audio = client.get(f'/v1/history/{item["history_item_id"]}/audio')
                if audio.status_code != 200:
                    raise campaign.CampaignError('history_audio_download_failed_no_retry')
                receipt = campaign.Receipt(audio.content,None,item['request_id'],actual,item['content_type'])
                ledger.save_receipt(request['cache_key'],receipt)
                receipt_path = audit_path.with_name(audit_path.stem+'.receipt.json')
                campaign.write_audio(receipt_path,(json.dumps({'providerHistory':item,'afterCount':after['character_count'],
                    'audioSha256':campaign.digest(audio.content),'synthesisHttpStatus':'not observed; website generation',
                    'uiEvidence':ui,'settingsEvidence':'stability from history; similarity from bound pre-generation UI observation'},
                    ensure_ascii=False,indent=2)+'\n').encode())
                ledger.reconcile(request['cache_key'],actual,str(receipt_path),accept_audio=True)
                print(json.dumps({'status':'SAVED_FOR_LISTENING','locale':args.locale,'charged':str(actual),
                    'audio':str(ROOT/base.DIRECTORY/f'{request["cache_key"]}.mp3'),
                    'sha256':campaign.digest(audio.content),'creditsRemaining':after['character_limit']-after['character_count']}),flush=True)
        finally:
            ledger.db.close()


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        reason = str(error) if isinstance(error,campaign.CampaignError) else type(error).__name__
        print(json.dumps({'status':'STOPPED_NO_RETRY','reason':reason}),file=sys.stderr)
        raise SystemExit(2)
