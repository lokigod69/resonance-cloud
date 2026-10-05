"""Build an offline ElevenLabs plan from the exact storybook speech manifest.

No credentials, provider construction, campaign connection or synthesis path.
The existing queue owner must separately review and authorise an executor.
"""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
from src.services.guided_tts.inventory import (
    NORMALIZATION_VERSION, cache_key, normalize_spoken_text, text_hash, voice_settings_hash,
)

VOICES = {'en-GB': 'AeRdCCKzvd23BpJoofzx', 'es-ES': 'ZCh4e9eZSUf41K4cmCEL'}
SETTINGS = {'stability': 0.5, 'similarity_boost': 0.75}


def build_plan(manifest, source_bytes):
    if (manifest.get('schemaVersion') != 1 or manifest.get('status') != 'offline-unvoiced'
            or manifest.get('voiceAssignments') is not None or manifest.get('spendingAuthorized') is not False):
        raise ValueError('Exact unvoiced offline manifest required')
    if set(manifest.get('sources', {})) != {'english.json', 'spanish.json'}:
        raise ValueError('Both source collections required')
    for name, expected in manifest['sources'].items():
        if hashlib.sha256(source_bytes[name]).hexdigest() != expected:
            raise ValueError('Manifest sources changed')
    if not manifest.get('phrases'):
        raise ValueError('Empty manifest')
    uses, text_keys, groups = set(), set(), []
    for locale, voice in VOICES.items():
        profile = {
            'provider': 'elevenlabs', 'target_language_code': locale,
            'voice_profile_key': f'storybooks_{locale.lower().replace("-", "_")}_narrator_v1',
            'provider_voice_id': voice, 'provider_model_id': 'eleven_v4',
            'output_format': 'mp3_44100_128', 'voice_settings': dict(SETTINGS),
            'voice_settings_hash': voice_settings_hash(SETTINGS),
        }
        items = []
        for phrase in manifest['phrases']:
            if phrase['locale'] != locale:
                continue
            original = phrase['text']
            key = hashlib.sha256((locale + '\0' + original).encode('utf-8')).hexdigest()
            if phrase['textKey'] != key or key in text_keys or phrase['characters'] != len(original):
                raise ValueError('Invalid speech identity or character count')
            text_keys.add(key)
            if not phrase['uses'] or len(set(phrase['uses'])) != len(phrase['uses']) or uses.intersection(phrase['uses']):
                raise ValueError('Invalid speech-use coordinates')
            uses.update(phrase['uses'])
            spoken = normalize_spoken_text(original)
            if not spoken or '<' in spoken or '>' in spoken:
                raise ValueError('Empty or marked-up speech')
            item = {k:profile[k] for k in ['provider_voice_id','provider_model_id','output_format',
                    'voice_profile_key','target_language_code','voice_settings_hash']}
            item.update({'source_text':original, 'normalized_text':spoken, 'character_count':len(spoken),
                         'text_hash':text_hash(spoken), 'surface':'storybook', 'surface_key':key,
                         'sourceCoordinates':phrase['uses']})
            item['cache_key'] = cache_key(provider='elevenlabs', target_language_code=locale,
                voice_profile_key=profile['voice_profile_key'], provider_voice_id=voice,
                provider_model_id='eleven_v4', output_format=profile['output_format'],
                settings_hash=profile['voice_settings_hash'], normalization_version=NORMALIZATION_VERSION,
                text_hash_value=item['text_hash'])
            items.append(item)
        if not items:
            raise ValueError('Missing locale speech')
        groups.append({'locale':locale, 'proposedVoiceProfile':profile, 'items':items})
    if len(text_keys) != len(manifest['phrases']) or len(uses) != manifest['uses']:
        raise ValueError('Unknown locale or inconsistent speech-use total')
    unique = {i['cache_key']:i for g in groups for i in g['items']}
    return {'schemaVersion':1, 'status':'offline-plan-awaiting-content-voice-budget-and-execution-review',
            'model':'eleven_v4', 'creditBudgetCeiling':200000,
            'storyBudgetApproved':False, 'contentReviewApproved':False,
            'accentListeningVerified':False, 'sources':manifest['sources'],
            'normalizationVersion':NORMALIZATION_VERSION, 'groups':groups,
            'uniqueAudioFiles':len(unique), 'characters':sum(i['character_count'] for i in unique.values()),
            'uses':len(uses), 'recordedFiles':0, 'published':False}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('manifest', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    directory = ROOT / 'frontend/content-drafts/storybooks-2026-10'
    manifest = json.loads(args.manifest.read_bytes())
    plan = build_plan(manifest, {name:(directory/name).read_bytes() for name in ['english.json','spanish.json']})
    with args.output.open('x',encoding='utf-8') as handle:
        handle.write(json.dumps(plan,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({k:v for k,v in plan.items() if k != 'groups'},ensure_ascii=False,indent=2))


if __name__ == '__main__':
    main()
