# Investigation — `image_model` enum migration (admin dashboard → Supabase → per-deck snapshot)

**Mode:** Read-only. No files modified, no Supabase writes.
**Date:** 2026-04-23
**Target:** Plan swap of current `image_model` enum values for a new v1 set.

## Proposed v1 enum (from the brief)

| Value | Provider / model | Role |
|---|---|---|
| `flux_pro` | Kie Flux 2 Pro (t2i + i2i) | Quality slot |
| `zturbo` | Z-Image-Turbo (provider routing internal to provider code) | Fast / cheap slot |
| `wan_fallback` | Existing Wan 2.7 integration | Safety fallback |

---

## 1. Current admin-UI enum values

**File:** `orchestrator/frontend/src/components/settings/fieldConfigs.ts:115`

```ts
{ key: 'image_model', label: 'Image Model', type: 'dropdown',
  options: ['fast', 'quality', 'wan_fast', 'wan_quality'],
  default: 'quality',
  optionLabels: {
    fast: 'Gemini Flash',
    quality: 'Gemini Pro',
    wan_fast: 'Wan 2.7',
    wan_quality: 'Wan 2.7 Pro'
  }
}
```

The dropdown is rendered from the `STAGE_FIELDS` / `IMAGE_FIELDS` array consumed by the profiles admin page at `orchestrator/frontend/src/pages/admin/Profiles.tsx`.

**Allowed values:** `fast`, `quality`, `wan_fast`, `wan_quality`. **Default:** `quality`.

## 2. Current backend enum values

### 2a. Pydantic whitelist

**File:** `orchestrator/cloud_engines/image_engine/models.py:73`

```python
IMAGE_MODELS = ("fast", "quality", "wan_fast", "wan_quality")
```

Validator at `models.py:174-180` rejects any value not in this tuple.

### 2b. Hardcoded default (fallback settings)

**File:** `orchestrator/src/settings.py:59`

```python
"image_model": "quality",
```

### 2c. Supabase column default / CHECK constraint

**File:** `orchestrator/frontend/supabase/migrations/20260322210000_phase2a_tables.sql:82-91`

`language_profiles.settings` is a plain `jsonb not null default '{}'::jsonb` column. **No DB-level CHECK constraint** for `image_model` — validation is enforced only at the Pydantic layer on write-through.

### 2d. Snapshot default JSON

`settings-defaults.json` is written per-deck from the merged profile+override at deck creation (see §6). There is no committed reference `settings-defaults.json` — the on-disk instance is derived dynamically, anchored by `DEFAULT_SETTINGS` in `src/settings.py` whose images.image_model is `"quality"` (2b).

## 3. User-facing labels across locales

**Finding:** `image_model` option labels are **hardcoded English inside `fieldConfigs.ts:115`**. They are NOT keyed into `orchestrator/frontend/src/lib/translations.ts` — a grep for `image_model|Gemini Flash|Gemini Pro|Wan 2` over `translations.ts` returned zero hits.

| Value | EN | DE | FR |
|---|---|---|---|
| `fast` | "Gemini Flash" | (same — EN hardcoded) | (same — EN hardcoded) |
| `quality` | "Gemini Pro" | (same — EN hardcoded) | (same — EN hardcoded) |
| `wan_fast` | "Wan 2.7" | (same — EN hardcoded) | (same — EN hardcoded) |
| `wan_quality` | "Wan 2.7 Pro" | (same — EN hardcoded) | (same — EN hardcoded) |

The admin dashboard is admin-only; label localisation was intentionally skipped. **Consequence:** the migration does NOT need DE/FR translation updates for this field, only `optionLabels` edits in one spot.

## 4. Frontend add-point

**Single location.** `orchestrator/frontend/src/components/settings/fieldConfigs.ts:115` — modify both `options` and `optionLabels` on that line.

```ts
// After migration (illustrative):
{ key: 'image_model', label: 'Image Model', type: 'dropdown',
  options: ['flux_pro', 'zturbo', 'wan_fallback'],
  default: 'flux_pro',
  optionLabels: {
    flux_pro: 'Flux 2 Pro',
    zturbo: 'Z-Image Turbo',
    wan_fallback: 'Wan 2.7 (fallback)'
  }
}
```

No other frontend file references these enum values directly (verified by the investigation pass).

## 5. Backend add-points

Three coordinated edits:

1. **Pydantic whitelist** — `orchestrator/cloud_engines/image_engine/models.py:73`
   ```python
   IMAGE_MODELS = ("flux_pro", "zturbo", "wan_fallback")
   ```
2. **Hardcoded default** — `orchestrator/src/settings.py:59`
   ```python
   "image_model": "flux_pro",  # was "quality"
   ```
3. **Provider router** — `orchestrator/cloud_engines/image_engine/renderer.py:70-85` (`resolve_model_id`). This is the routing table that maps enum → concrete provider model IDs. Today it reads:
   ```python
   def resolve_model_id(image_model: str) -> str:
       if image_model == "fast":
           return config.IMAGE_MODEL_FAST
       if image_model == "wan_fast":
           return "wan/2-7-image"
       if image_model == "wan_quality":
           return "wan/2-7-image-pro"
       return config.IMAGE_MODEL_QUALITY
   ```
   After migration it must route the three new values to their providers (Kie Flux 2 Pro, Z-Image-Turbo, Wan 2.7 fallback). The Wan fallback branch at `renderer.py:520-528` also refers to old values (`"wan/2-7-image"` → fall back to `config.IMAGE_MODEL_FAST`/`QUALITY`) and must be rewritten to use the new aliases.

**Supabase:** no schema change required — the column stays JSONB. Existing rows need data-level rewrites (see §7–§8), but no column DDL.

## 6. Snapshot invariant verification

### Write path — `settings.images.image_model` is copied into the per-deck blob at deck creation

**File:** `orchestrator/src/orchestration/feeder.py:461-486` (profile fetch + merge)

```python
profile_resp = await asyncio.to_thread(_read_profile)
profile_rows = list(getattr(profile_resp, "data", None) or [])
profile_settings: dict[str, Any] = {}
if profile_rows:
    profile_settings = profile_rows[0].get("settings") or {}

from job_runner import merge_settings
settings_override = job.get("settings_override") or {}
merged = merge_settings(
    profile_settings,
    job.get("art_style"),
    job.get("movie_override"),
    settings_override=settings_override,
)
```

Then at `feeder.py:581-583`:

```python
workspace_path = create_job_workspace(user_id=user_id, deck_id=deck_id)
save_defaults(workspace_path, merged)
```

`save_defaults()` lives at `orchestrator/src/settings.py:140-144` and writes the merged settings (including `images.image_model`) to `settings-defaults.json` inside the deck workspace directory.

### Read path — render time loads from the per-deck snapshot, not from `language_profiles`

**File:** `orchestrator/src/settings.py:126-137`

```python
def load_defaults(workspace_path: Path) -> dict[str, dict[str, Any]]:
    """Load settings-defaults.json, falling back to hardcoded defaults."""
    p = defaults_path(workspace_path)
    if p.exists():
        with open(p, 'r', encoding='utf-8') as f:
            data = json.load(f)
        data.pop('__doc', None)
        merged = {}
        for stage, stage_defaults in DEFAULT_SETTINGS.items():
            merged[stage] = {**stage_defaults, **data.get(stage, {})}
        return merged
    return dict(DEFAULT_SETTINGS)
```

**Invariant confirmed:** the renderer reads only from `settings-defaults.json` per deck. No code path under `cloud_engines/image_engine/` re-fetches `language_profiles`. An admin change to the active profile after deck creation cannot mutate already-created decks.

**Caveat for the migration:** decks that were snapshotted with `"image_model": "fast"` etc. will keep those legacy strings inside their `settings-defaults.json`. After the Pydantic whitelist swap, any **re-render of an old deck** would fail validation. You need either:

- a migration pass over existing deck workspaces to rewrite their snapshots, OR
- a compatibility alias layer in `resolve_model_id` / the Pydantic validator that accepts legacy values and routes them through the new mapping (transition period).

This is the biggest hidden risk and should be named explicitly in the migration plan.

## 7. Current distribution of `image_model` values across `language_profiles`

- No SQL seed file sets `image_model` at row-insert time. The table's default settings JSONB is `'{}'` (see §2c).
- Profiles are created via the admin UI at `orchestrator/frontend/src/pages/admin/Profiles.tsx:126-137` with `setEditSettings(structuredClone(p.settings))` — initial `settings` is an empty object; admins fill fields manually.
- Without a live Supabase query (out of scope), exact counts per value cannot be determined.

**Recommendation for the migration:** before shipping, run a one-shot read-only query to confirm scope:

```sql
-- READ-ONLY — run manually before the migration, not as part of it
select settings -> 'images' ->> 'image_model' as image_model, count(*)
from public.language_profiles
group by 1
order by 2 desc;
```

Rows where the key is absent (value NULL) will fall back to the Pydantic default and need no rewrite; rows holding a string literal in the legacy enum will need updating (see §8).

## 8. Proposed enum mapping

Based on the real provider routing in `renderer.py:70-85`:

| Current | Routes to today | Proposed v1 | Rationale |
|---|---|---|---|
| `fast` | Gemini Flash (`config.IMAGE_MODEL_FAST`) | **`zturbo`** | Gemini Flash is the cheap/fast slot. Z-Image-Turbo replaces that slot. |
| `quality` | Gemini Pro (`config.IMAGE_MODEL_QUALITY`) | **`flux_pro`** | Gemini Pro is the quality slot. Flux 2 Pro replaces that slot. |
| `wan_fast` | `wan/2-7-image` | **`wan_fallback`** | Wan 2.7 collapses to one fallback mode under v1. |
| `wan_quality` | `wan/2-7-image-pro` | **`wan_fallback`** | Same — collapse into single Wan entry. |

### Ambiguity flags (Sir Robert decision needed)

1. **Wan tier collapse.** Any profile that deliberately chose `wan_quality` for the Pro variant loses the quality tier. If users were routing to `wan/2-7-image-pro` on purpose, `wan_fallback` should probably default to the Pro model inside the provider code (not the cheap variant). Confirm which Wan model backs `wan_fallback`.
2. **Default value.** Current default is `quality` (maps to `flux_pro`). Should the v1 default stay on the Flux Pro quality slot, or pivot to `zturbo` as the cheap-and-cheerful default? Today's choice of `quality` as default suggests "premium unless specified" — carry that forward ⇒ default `flux_pro`.
3. **Fallback chain.** `renderer.py:520-528` currently falls back Wan → Gemini on failure. Under v1, should `wan_fallback` failures cascade to `flux_pro` or to `zturbo`? This is renderer-rewrite territory but worth flagging alongside the enum swap.
4. **Legacy deck re-renders.** See §6 caveat. Decision: one-shot snapshot migration vs compatibility aliases during a transition window.

## 9. Analytics / reporting that aggregates by `image_model`

**No aggregation code found that groups by `image_model`.**

The only consumer of the value outside rendering is metadata capture at `orchestrator/src/services/metadata.py:153`:

```python
"model": img_rendering.get("model") or img.get("settings", {}).get("image_model"),
```

This writes the value per-image into `generation-meta.json` inside each deck's word directory. There is no SQL `GROUP BY image_model`, no admin-dashboard chart, no reporting script. **Nothing downstream breaks on the enum swap beyond the legacy-snapshot concern in §6.**

## 10. Per-language vs global

**Per-language-profile. Confirmed in code.**

- **Schema:** `orchestrator/frontend/supabase/migrations/20260322210000_phase2a_tables.sql:82-91` — `language_profiles` has a `language text not null` column and a `settings jsonb` column; one row per profile, multiple profiles per language possible.
- **Admin UI:** `orchestrator/frontend/src/pages/admin/Profiles.tsx:66-71` — the edit form is bound to one `selected` profile's `settings`; there is no global settings mutator for `image_model`.

Changing the default for one language profile does not affect any other row. The migration must rewrite **each row** that holds a legacy value.

---

## Touchpoint matrix (single source of truth for the migration)

| # | File | Line | What | Change |
|---|---|---|---|---|
| 1 | `orchestrator/frontend/src/components/settings/fieldConfigs.ts` | 115 | Admin dropdown options + optionLabels | Replace enum list + labels |
| 2 | `orchestrator/cloud_engines/image_engine/models.py` | 73 | Pydantic whitelist tuple | Replace enum tuple |
| 3 | `orchestrator/src/settings.py` | 59 | Hardcoded fallback default | Update default value |
| 4 | `orchestrator/cloud_engines/image_engine/renderer.py` | 70–85 | `resolve_model_id()` router | Rewrite if-chain for new enum |
| 5 | `orchestrator/cloud_engines/image_engine/renderer.py` | 520–528 | Wan → Gemini failure fallback | Update alias references |
| 6 | `orchestrator/cloud_engines/image_engine/wan_provider.py` | 35–36 | Wan model ID constants | Review — may stay as concrete IDs |
| — | Supabase `language_profiles` rows | — | Legacy enum strings in `settings.images.image_model` | Data migration (see §7 query, §8 mapping) |
| — | Existing deck workspaces `settings-defaults.json` | — | Legacy enum strings in snapshots | Either rewrite snapshots OR keep compat aliases in validator/router |

## Out of scope for this investigation

- Live `language_profiles` row counts (no Supabase read performed).
- Renderer implementation details for the three new providers (Kie Flux 2 Pro, Z-Image-Turbo, Wan 2.7 fallback) — this investigation plans the enum swap only; the provider integrations are a separate work item.
- Migration execution — planning only per brief.
