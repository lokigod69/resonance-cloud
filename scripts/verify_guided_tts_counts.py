"""Exact per-language bright playback counts via count=exact HEAD requests.

Exits nonzero if any listed language has zero bright playback rows — the
script must never certify a batch that silently skipped a language.
"""
import os
import sys
import httpx
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
URL = os.environ["SUPABASE_URL"].rstrip("/")
KEY = os.environ["SUPABASE_SERVICE_KEY"]
H = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Prefer": "count=exact"}

langs = ["english", "spanish", "italian", "french", "portuguese",
         "german", "cebuano", "indonesian", "polish", "korean"]
total = 0
empty = []
for lang in langs:
    r = httpx.head(f"{URL}/rest/v1/guided_tts_playback", headers=H, params={
        "select": "path_id", "vibe": "eq.bright",
        "path_id": f"like.{lang}-a1-practical-%"}, timeout=30)
    cr = r.headers.get("content-range", "?/?")
    n = int(cr.split("/")[-1])
    total += n
    if n == 0:
        empty.append(lang)
    print(f"  {lang:12s} {n}")
print(f"total bright playback rows: {total}")
if empty:
    print(f"VERIFICATION FAILED: zero rows for {', '.join(empty)}")
    sys.exit(1)
print("VERIFICATION PASSED")
