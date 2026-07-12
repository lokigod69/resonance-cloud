"""Exact per-language bright playback counts via count=exact HEAD requests."""
import os
import httpx
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
URL = os.environ["SUPABASE_URL"].rstrip("/")
KEY = os.environ["SUPABASE_SERVICE_KEY"]
H = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Prefer": "count=exact"}

langs = ["english", "spanish", "italian", "french", "portuguese",
         "german", "cebuano", "indonesian", "polish", "korean"]
total = 0
for lang in langs:
    r = httpx.head(f"{URL}/rest/v1/guided_tts_playback", headers=H, params={
        "select": "path_id", "vibe": "eq.bright",
        "path_id": f"like.{lang}-a1-practical-%"}, timeout=30)
    cr = r.headers.get("content-range", "?/?")
    n = int(cr.split("/")[-1])
    total += n
    print(f"  {lang:12s} {n}")
print(f"total bright playback rows: {total}")
