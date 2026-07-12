"""Post-batch verification: playback-view coverage per language + audio spot-checks.

Exits nonzero on any failed asset, missing public_url, or BAD spot-check —
a green exit code IS the certification, not the printed summary.
"""
import os, random, sys
from collections import Counter
import httpx
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
URL = os.environ["SUPABASE_URL"].rstrip("/")
KEY = os.environ["SUPABASE_SERVICE_KEY"]
H = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}

# failed assets remaining?
r = httpx.head(f"{URL}/rest/v1/guided_tts_assets", headers={**H, "Prefer": "count=exact"},
               params={"select": "id", "status": "eq.failed"}, timeout=30)
content_range = r.headers.get("content-range", "")
print("failed assets remaining:", content_range)
failed_assets = int(content_range.split("/")[-1]) if "/" in content_range else -1
problems: list[str] = []
if failed_assets != 0:
    problems.append(f"{failed_assets} failed assets remaining (or count unreadable)")

# playback rows per language prefix (bright only, paged)
rows = []
offset = 0
while True:
    r = httpx.get(f"{URL}/rest/v1/guided_tts_playback", headers=H, params={
        "select": "path_id,vibe,surface,public_url", "vibe": "eq.bright",
        "limit": "1000", "offset": str(offset)}, timeout=60)
    page = r.json()
    rows.extend(page)
    if len(page) < 1000:
        break
    offset += 1000
langs = Counter(p["path_id"].split("-a1-")[0] for p in rows)
print(f"bright playback rows: {len(rows)} total")
for lang, n in sorted(langs.items()):
    print(f"  {lang:12s} {n}")
missing_urls = [p for p in rows if not p["public_url"]]
print("rows missing public_url:", len(missing_urls))
if missing_urls:
    problems.append(f"{len(missing_urls)} playback rows missing public_url")
if not rows:
    problems.append("no bright playback rows at all")

# spot-check audio URLs across languages incl. the retried Cebuano clip
random.seed(7)
picks = []
for lang in ("korean", "polish", "german", "cebuano", "english", "indonesian"):
    cand = [p for p in rows if p["path_id"].startswith(lang)]
    picks.extend(random.sample(cand, min(2, len(cand))))
# the retried clip specifically
r = httpx.get(f"{URL}/rest/v1/guided_tts_playback", headers=H, params={
    "select": "path_id,surface,surface_key,public_url",
    "path_id": "eq.cebuano-a1-practical-1", "surface": "eq.corePhrase",
    "vibe": "eq.bright", "limit": "1"}, timeout=30)
picks.extend(r.json())
ok = 0
for p in picks:
    url = p["public_url"]
    resp = httpx.head(url, timeout=30, follow_redirects=True)
    ct = resp.headers.get("content-type", "?")
    cl = resp.headers.get("content-length", "?")
    status = "OK" if resp.status_code == 200 and "audio" in ct and int(cl or 0) > 2000 else "BAD"
    if status == "OK":
        ok += 1
    print(f"  {status} {p['path_id']:28s} {p['surface']:10s} {resp.status_code} {ct} {cl}B")
print(f"spot-checks passed: {ok}/{len(picks)}")
if ok != len(picks):
    problems.append(f"{len(picks) - ok} audio spot-checks BAD")

if problems:
    print("VERIFICATION FAILED:")
    for p in problems:
        print(f"  - {p}")
    sys.exit(1)
print("VERIFICATION PASSED")
