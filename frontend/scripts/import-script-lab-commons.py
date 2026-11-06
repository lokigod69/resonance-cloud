"""Import human-recorded symbol audio from Commons; no synthesis or paid APIs.

From frontend/: python scripts/import-script-lab-commons.py [--check]
The check mode is offline and decodes every imported MP3 against provenance.
Recordings below -12 dBFS peak receive constant gain toward -6 dBFS, directly
from the verified original. No trimming, gating, compression or limiting.
"""
import argparse
import datetime
import hashlib
import html
import json
import pathlib
import re
import subprocess
import tempfile
import time
import urllib.parse
import urllib.error
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
PUBLIC = ROOT / 'public' / 'scripts'
UA = 'Lingwave-ScriptLab-Audio-Import/1.0 (https://lingwave.ai)'
LICENSES = {
    'japanese-hiragana': ('Public domain', 'https://commons.wikimedia.org/wiki/Template:PD-self', 'Hakatanoshio117117'),
    'russian-cyrillic': ('CC BY-SA 3.0', 'https://creativecommons.org/licenses/by-sa/3.0/', 'Cherus'),
}
SOURCE_LICENSES = {
    'File:Ru-13-буква-Л эль.ogg': ('CC BY-SA 2.5', 'https://creativecommons.org/licenses/by-sa/2.5/', 'Pogrebnoj-Alexandroff'),
}


def request(url):
    # Public Wikimedia endpoints are shared infrastructure. One request at a
    # time, paced across metadata and media; a 429 stops the run without retry.
    time.sleep(8)
    with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=60) as response:
        return response.read()


def api(base, **args):
    return json.loads(request(base + '?' + urllib.parse.urlencode({'format': 'json', **args})))


def run(args):
    return subprocess.run(args, cwd=ROOT, check=True, capture_output=True, text=True, encoding='utf-8')


def inventories():
    # Resolve the authored IDs instead of duplicating transliteration or ordering.
    source = "import ru from './src/data/scripts/russianCyrillic.ts'; import ja from './src/data/scripts/japaneseHiragana.ts'; console.log(JSON.stringify([ru,ja].map(s=>({id:s.id,symbols:s.symbols.map(x=>({id:x.id,character:x.character,audio:x.audio}))}))))"
    return json.loads(run(['node', '--import', 'tsx', '--input-type=module', '-e', source]).stdout)


def source_titles(scripts):
    page = '利用者:Hakatanoshio117117/ファイル-日本語発音サンプル'
    table = api('https://ja.wikipedia.org/w/api.php', action='parse', page=page, prop='wikitext')['parse']['wikitext']['*']
    pairs = re.findall(r'\{\{Audio\|([^|]+)\|([^}]+)\}\}', table.split('== 濁音')[0])
    japanese = {kana: 'File:' + filename for filename, kana in pairs if kana not in ('ゐ', 'ゑ')}
    if len(japanese) != 46:
        raise ValueError('Japanese source table no longer has exactly 46 base kana')
    alphabet = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ'
    russian = {char: f'File:Ru-{index:02}-буква-{char}.ogg' for index, char in enumerate(alphabet, 1)}
    # Authored text is эль; the alternate is explicitly labeled with that name.
    russian['Л'] = 'File:Ru-13-буква-Л эль.ogg'
    return {
        script['id']: {s['audio']['itemId']: (japanese if script['id'] == 'japanese-hiragana' else russian)[s['character']] for s in script['symbols']}
        for script in scripts
    }


def metadata(titles):
    result = {}
    for start in range(0, len(titles), 50):
        data = api('https://commons.wikimedia.org/w/api.php', action='query', redirects=1,
                   prop='imageinfo', iiprop='url|sha1|timestamp|extmetadata', titles='|'.join(titles[start:start + 50]))
        pages = {p['title']: p for p in data['query']['pages'].values()}
        redirects = {r['from']: r['to'] for r in data['query'].get('redirects', [])}
        for title in titles[start:start + 50]:
            canonical = redirects.get(title, title)
            info = pages[canonical].get('imageinfo')
            if not info:
                raise ValueError('Missing source: ' + title)
            result[title] = (canonical, info[0])
    return result


def digest(data):
    return hashlib.sha256(data).hexdigest()


def inspect_audio(path):
    probe = json.loads(run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration:stream=codec_name,sample_rate,channels', '-of', 'json', str(path)]).stdout)
    duration = float(probe['format']['duration'])
    audio = probe['streams'][0]
    # A full decode verifies the complete file, rather than just its MP3 header.
    decoded = run(['ffmpeg', '-hide_banner', '-v', 'info', '-i', str(path), '-af', 'volumedetect', '-f', 'null', '-']).stderr
    peak = float(re.search(r'max_volume: (-?[\d.]+) dB', decoded).group(1))
    mean = float(re.search(r'mean_volume: (-?[\d.]+) dB', decoded).group(1))
    if not 0.15 <= duration <= 15 or peak < -45 or audio['codec_name'] != 'mp3':
        raise ValueError(f'Invalid/silent audio: {path.name}: {duration}s, peak {peak}dB')
    return {'durationSeconds': duration, 'peakDbFS': peak, 'meanDbFS': mean,
            'sampleRate': int(audio['sample_rate']), 'channels': audio['channels'], 'decoded': True}


def write_provenance(script_id, records):
    provenance = PUBLIC / script_id / 'provenance.json'
    pending = provenance.with_suffix('.tmp')
    pending.write_text(json.dumps({
        'scriptId': script_id, 'retrievedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'description': 'Human-recorded symbol audio from Wikimedia Commons; example-word audio is not included.',
        'recordings': records,
    }, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    pending.replace(provenance)


def commit_record(script_id, records, record, data, previous=None):
    """Journal the new evidence before replacing a known output, then commit it."""
    directory = PUBLIC / script_id
    item_id = record['itemId']
    if not re.fullmatch(r'symbol-[a-z0-9-]+', item_id):
        raise ValueError('Unsafe audio item ID')
    destination = directory / (item_id + '.mp3')
    previous_hash = previous['outputSha256'] if previous else None
    if destination.exists() and digest(destination.read_bytes()) != previous_hash:
        raise ValueError('Refusing to replace an unknown/changed recording: ' + item_id)
    candidate = directory / (item_id + '.mp3.pending')
    candidate.write_bytes(data)
    journal = directory / 'pending-import.json'
    journal_tmp = journal.with_suffix('.tmp')
    journal_tmp.write_text(json.dumps({'record': record, 'previousSha256': previous_hash}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    journal_tmp.replace(journal)
    recover_pending(script_id, records)


def recover_pending(script_id, records):
    directory = PUBLIC / script_id
    journal = directory / 'pending-import.json'
    if not journal.exists():
        return
    pending = json.loads(journal.read_text(encoding='utf-8'))
    record = pending['record']
    item_id = record['itemId']
    if not re.fullmatch(r'symbol-[a-z0-9-]+', item_id) or record['file'] != item_id + '.mp3':
        raise ValueError('Unsafe pending audio item')
    destination = directory / (item_id + '.mp3')
    candidate = directory / (item_id + '.mp3.pending')
    current_hash = digest(destination.read_bytes()) if destination.exists() else None
    if current_hash != record['outputSha256']:
        if current_hash != pending['previousSha256'] or not candidate.exists() or digest(candidate.read_bytes()) != record['outputSha256']:
            raise ValueError('Pending import cannot safely replace changed audio: ' + item_id)
        candidate.replace(destination)
    elif candidate.exists():
        candidate.unlink()
    records[:] = [r for r in records if r['itemId'] != item_id] + [record]
    write_provenance(script_id, records)
    write_credits(script_id, records)
    journal.unlink()


def import_one(script, symbol, title, source, ffmpeg_version, previous=None):
    canonical, info = source
    fields = info['extmetadata']
    license_name, license_url, author = SOURCE_LICENSES.get(canonical, LICENSES[script['id']])
    artist = html.unescape(re.sub('<[^>]+>', '', fields.get('Artist', {}).get('value', '')))
    if fields['LicenseShortName']['value'] != license_name or artist != author:
        raise ValueError('Unexpected author/license for ' + canonical)
    raw = request(info['url'])
    source_sha1 = hashlib.sha1(raw).hexdigest()
    if source_sha1 != info['sha1']:
        raise ValueError('Source checksum mismatch for ' + canonical)
    if previous and (source_sha1 != previous['sourceSha1'] or digest(raw) != previous['sourceSha256']):
        raise ValueError('Pinned original changed for ' + canonical)
    item_id = symbol['audio']['itemId']
    destination = PUBLIC / script['id'] / (item_id + '.mp3')
    with tempfile.TemporaryDirectory(prefix='lingwave-commons-') as temp:
        original = pathlib.Path(temp) / 'original.ogg'
        baseline = pathlib.Path(temp) / 'baseline.mp3'
        converted = pathlib.Path(temp) / 'converted.mp3'
        original.write_bytes(raw)
        def encode(output, gain=0):
            run(['ffmpeg', '-hide_banner', '-v', 'error', '-i', str(original), '-map_metadata', '-1',
                 '-af', f'volume={gain:.2f}dB', '-c:a', 'libmp3lame', '-q:a', '2', '-metadata', 'artist=' + author,
                 '-metadata', 'copyright=' + license_name + ' ' + license_url, str(output)])
        # The baseline is only a measurement, never the input to another encode.
        # Every delivered MP3 is encoded directly from the original Ogg.
        encode(baseline)
        baseline_measurements = inspect_audio(baseline)
        gain = round(-6 - baseline_measurements['peakDbFS'], 2) if baseline_measurements['peakDbFS'] < -12 else 0
        if gain:
            encode(converted, gain)
        else:
            baseline.replace(converted)
        measurements = inspect_audio(converted)
        if abs(measurements['durationSeconds'] - baseline_measurements['durationSeconds']) > 0.001:
            raise ValueError('Gain changed recording duration: ' + item_id)
        if gain and abs(measurements['peakDbFS'] + 6) > 1:
            raise ValueError('Gain did not reach the target peak: ' + item_id)
        converted_bytes = converted.read_bytes()
    record = {
        'itemId': item_id, 'symbolId': symbol['id'], 'character': symbol['character'],
        'expectedText': symbol['audio']['text'], 'file': destination.name,
        'sourceRequestedTitle': title, 'sourceTitle': canonical,
        'sourcePage': info['descriptionurl'], 'sourceUrl': info['url'].split('?')[0],
        'sourceVersionTimestamp': info['timestamp'], 'sourceSha1': source_sha1,
        'sourceSha256': digest(raw), 'outputSha256': digest(converted_bytes),
        'author': author, 'license': license_name, 'licenseUrl': license_url,
        'changes': f'Converted original Ogg Vorbis directly to MP3; constant gain {gain:+.2f} dB. No trimming, gating, compression or limiting.',
        'processingVersion': 2, 'gainDb': gain, 'baselinePeakDbFS': baseline_measurements['peakDbFS'],
        'originalDurationSeconds': baseline_measurements['durationSeconds'],
        'conversionTool': ffmpeg_version, **measurements,
    }
    return record, converted_bytes


def write_credits(script_id, records):
    rows = '\n'.join(
        '<tr><td>' + html.escape(r['character']) + '</td><td><a href="' + html.escape(r['file']) + '">' + html.escape(r['itemId']) + '</a></td><td><a href="' + html.escape(r['sourcePage']) + '">' + html.escape(r['sourceTitle']) + '</a></td><td><a href="https://commons.wikimedia.org/wiki/User:' + urllib.parse.quote(r['author']) + '">' + html.escape(r['author']) + '</a></td><td><a href="' + html.escape(r['licenseUrl']) + '">' + html.escape(r['license']) + '</a></td><td>' + html.escape(r['changes']) + '</td></tr>'
        for r in records
    )
    license_notice = (
        'The author released these recordings into the public domain worldwide. Where that is not possible, the author grants use for any purpose without conditions except those required by law.'
        if script_id == 'japanese-hiragana' else
        'The Russian recordings and converted audio are available under the individual Creative Commons Attribution-ShareAlike licenses linked below: 3.0 Unported for Cherus, and 2.5 Generic for the alternate Л recording by Pogrebnoj-Alexandroff. You may share and adapt them with attribution, the corresponding license link, an indication of changes, and the same or a compatible license for adaptations.'
    )
    body = f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Script Lab audio credits</title>
<style>body{{font:1rem/1.6 system-ui,sans-serif;max-width:65rem;margin:auto;padding:1.5rem;color:#202124;background:#fff}}a{{color:#174ea6}}a:focus-visible{{outline:3px solid #174ea6;outline-offset:3px}}table{{border-collapse:collapse;width:100%}}th,td{{text-align:left;border-bottom:1px solid #ddd;padding:.6rem;overflow-wrap:anywhere}}caption{{text-align:left;font-weight:700}}@media(prefers-color-scheme:dark){{body{{color:#eee;background:#171717}}a{{color:#a8c7fa}}}}</style></head>
<body><main><h1>Script Lab audio credits</h1><p>Symbol recordings via Wikimedia Commons. The author, original source, and license for every recording are listed below.</p>
<p>{license_notice}</p><p>Changes: converted original Ogg Vorbis directly to MP3. Quiet recordings receive only a constant gain toward a −6 dBFS peak; the gain for each file is listed below. Timing and dynamics are retained: no trimming, noise gate, compression or limiting. Audio is provided as separate licensed recordings; no endorsement is implied.</p>
<p><a href="provenance.json">Per-file provenance and checksums (JSON)</a></p>
<table><caption>{'Hiragana' if script_id == 'japanese-hiragana' else 'Russian Cyrillic'} symbol recordings</caption><thead><tr><th scope="col">Character</th><th scope="col">Recording</th><th scope="col">Original source</th><th scope="col">Author</th><th scope="col">License</th><th scope="col">Changes</th></tr></thead><tbody>{rows}</tbody></table></main></body></html>
'''
    (PUBLIC / script_id / 'credits.html').write_text(body, encoding='utf-8')


def check(scripts):
    for script in scripts:
        directory = PUBLIC / script['id']
        if (directory / 'pending-import.json').exists():
            raise ValueError('Unfinished import: resume the importer before checking ' + script['id'])
        data = json.loads((directory / 'provenance.json').read_text(encoding='utf-8'))
        records = data['recordings']
        expected = {s['audio']['itemId'] for s in script['symbols']}
        if {r['itemId'] for r in records} != expected or len(records) != len(expected):
            raise ValueError('Incomplete/duplicate provenance: ' + script['id'])
        if {p.stem for p in directory.glob('*.mp3')} != expected:
            raise ValueError('Unexpected/missing MP3 files: ' + script['id'])
        for record in records:
            filename = record['itemId'] + '.mp3'
            if record['file'] != filename:
                raise ValueError('Unexpected filename in provenance: ' + filename)
            path = directory / filename
            if digest(path.read_bytes()) != record['outputSha256']:
                raise ValueError('Output checksum mismatch: ' + str(path))
            measured = inspect_audio(path)
            if record.get('processingVersion') != 2 or 'gainDb' not in record:
                raise ValueError('Recording needs the current level-processing policy: ' + filename)
            expected_gain = round(-6 - record['baselinePeakDbFS'], 2) if record['baselinePeakDbFS'] < -12 else 0
            if record['gainDb'] != expected_gain or abs(measured['durationSeconds'] - record['originalDurationSeconds']) > 0.001:
                raise ValueError('Gain/duration provenance mismatch: ' + filename)
            if record['gainDb'] and abs(measured['peakDbFS'] + 6) > 1:
                raise ValueError('Quiet recording misses target peak: ' + filename)
        print(f"Verified {script['id']}: {len(records)} files, checksums, full decode, duration and levels")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--cooldown-seconds', type=int, default=0)
    args = parser.parse_args()
    scripts = inventories()
    if args.check:
        check(scripts)
        return
    if args.cooldown_seconds:
        print(f'Cooling down for {args.cooldown_seconds} seconds before the paced import.', flush=True)
        time.sleep(args.cooldown_seconds)
    # Snapshot the Korean files before any write and ensure they stay identical.
    korean = {p.name: digest(p.read_bytes()) for p in (PUBLIC / 'korean-hangul').glob('*.mp3')}
    titles = source_titles(scripts)
    sources = metadata([title for script in scripts for title in titles[script['id']].values()])
    ffmpeg_version = run(['ffmpeg', '-version']).stdout.splitlines()[0]
    for script in scripts:
        directory = PUBLIC / script['id']
        directory.mkdir(parents=True, exist_ok=True)
        provenance = directory / 'provenance.json'
        records = json.loads(provenance.read_text(encoding='utf-8'))['recordings'] if provenance.exists() else []
        recover_pending(script['id'], records)
        existing = {record['itemId']: record for record in records}
        for symbol in script['symbols']:
            item_id = symbol['audio']['itemId']
            previous = existing.get(item_id)
            if previous:
                current_bytes = (directory / (item_id + '.mp3')).read_bytes()
                if digest(current_bytes) != previous['outputSha256']:
                    raise ValueError('Existing output checksum mismatch: ' + item_id)
                if previous.get('processingVersion') == 2:
                    continue
                if previous['peakDbFS'] >= -12:
                    record = {**previous, 'processingVersion': 2, 'gainDb': 0,
                              'baselinePeakDbFS': previous['peakDbFS'],
                              'originalDurationSeconds': previous['durationSeconds'],
                              'changes': 'Converted original Ogg Vorbis directly to MP3; constant gain +0.00 dB. No trimming, gating, compression or limiting.'}
                    commit_record(script['id'], records, record, current_bytes, previous)
                    continue
            title = titles[script['id']][item_id]
            record, data = import_one(script, symbol, title, sources[title], ffmpeg_version, previous)
            commit_record(script['id'], records, record, data, previous)
            print(f"Imported {script['id']}/{item_id}: gain {record['gainDb']:+.2f} dB, peak {record['peakDbFS']:.1f} dBFS", flush=True)
        write_credits(script['id'], records)
        print(f"Imported {script['id']}: {len(records)} recordings")
    if korean != {p.name: digest(p.read_bytes()) for p in (PUBLIC / 'korean-hangul').glob('*.mp3')}:
        raise ValueError('Korean recordings changed')
    print(f'Korean recordings unchanged: {len(korean)} SHA-256 matches')
    print('Run npx tsx scripts/rebuild-script-lab-audio-manifest.ts to register the imported MP3s.')
    check(scripts)


if __name__ == '__main__':
    try:
        main()
    except urllib.error.HTTPError as error:
        print(f'Commons HTTP {error.code}; Retry-After: {error.headers.get("Retry-After", "not provided")}. Stopping without retry.', flush=True)
        raise SystemExit(1) from error
