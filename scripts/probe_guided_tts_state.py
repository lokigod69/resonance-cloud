"""Probe guided-TTS prod state: profiles, asset/usage counts, voices registry."""
import json, os
from collections import Counter
import httpx
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
URL = os.environ["SUPABASE_URL"].rstrip("/")
KEY = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ["SUPABASE_SERVICE_ROLE_KEY"]
H = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}

r = httpx.get(f"{URL}/rest/v1/guided_voice_profiles", headers=H, params={
    "select": "voice_profile_key,target_language_code,vibe,scope_path_id,provider_voice_id,provider_model_id,active,priority",
    "order": "voice_profile_key"}, timeout=30)
print("=== guided_voice_profiles ===")
for row in r.json():
    print(json.dumps(row, ensure_ascii=False))

for table in ("guided_tts_assets", "guided_tts_asset_usages"):
    r2 = httpx.head(f"{URL}/rest/v1/{table}", headers={**H, "Prefer": "count=exact"},
                    params={"select": "id"}, timeout=30)
    print(f"{table} count: {r2.headers.get('content-range')}")

r = httpx.get(f"{URL}/rest/v1/guided_tts_assets", headers=H, params={
    "select": "target_language_code,provider_model_id,status", "limit": "3000"}, timeout=30)
print("assets by (lang, model, status):")
for k, v in sorted(Counter((x["target_language_code"], x["provider_model_id"], x["status"]) for x in r.json()).items()):
    print("  ", k, v)

print("=== voices registry (public.voices) ===")
r = httpx.get(f"{URL}/rest/v1/voices", headers=H, params={
    "select": "name,language,language_code,voice_id,notes", "order": "language_code,name", "limit": "200"}, timeout=30)
for row in r.json():
    vid = (row.get("voice_id") or "")[:10]
    print(f"  {row.get('language_code')!s:6} {row.get('name')!s:16} {vid}...  notes={str(row.get('notes'))[:60]}")
