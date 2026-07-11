# Investigation Report: Admin Dashboard

**Date:** 2026-03-25
**Scope:** Complete read-only investigation of existing admin pages, backend routes, job runner, database schema, and filesystem structure.

---

## Part 1: Frontend Admin Pages

### 1.1 Job Queue (`orchestrator/frontend/src/pages/admin/Queue.tsx`)

**What it does:** Full-featured job management page. Displays all generation jobs with status badges, progress bars, word lists, and admin controls.

**Data fetching pattern:** Direct Supabase client calls via `useEffect` + `useCallback`. Polls every 10 seconds.

```typescript
// Jobs: direct Supabase query with join
const { data } = await supabase
  .from('generation_jobs')
  .select('*, profiles(display_name)')
  .order('priority', { ascending: true })
  .order('created_at', { ascending: true })

// System settings: separate table
const { data } = await supabase
  .from('system_settings')
  .select('*')
  .eq('id', 1)
  .single()

// Expanded job words: query by deck_id
const { data } = await supabase
  .from('words')
  .select('id, word, translation, status, error_message')
  .eq('deck_id', job.deck_id)
  .order('created_at')
```

**Columns displayed per job row:**
- Status badge (color-coded: pending/approved/processing/complete/partial/failed/rejected)
- User display name (from joined `profiles` table)
- Target language
- Progress bar (`words_completed + words_failed / words_total`)
- Created timestamp
- Action buttons (Approve/Reject — only for `pending` status)

**Expanded detail shows:** Job ID, language, art style, movie override, profile used, priority, creative direction, genre, timestamps, duration, error message, and word list with per-word status.

**Actions available:**
- **Approve** — updates `generation_jobs.status` to `'approved'`
- **Reject** — refunds credits to user's profile, updates status to `'rejected'`
- **Toggle Auto-approve** — updates `system_settings.auto_approve`
- **Pause/Resume Queue** — updates `system_settings.queue_paused`
- **Refresh** — manual re-fetch

**Auto-approve in UI:** Toggle switch that writes to `system_settings` table. The job runner reads this flag and auto-approves pending jobs when enabled.

### 1.2 Profiles (`orchestrator/frontend/src/pages/admin/Profiles.tsx`)

**What it does:** Two-panel layout for managing language profiles. Left panel shows profiles grouped by language; right panel shows a settings editor with vertical tabs per engine stage.

**Data fetching:** Direct Supabase queries.

```typescript
const { data } = await supabase
  .from('language_profiles')
  .select('*')
  .order('language')
  .order('name')
```

**Engine settings are stored in:** `language_profiles.settings` column (JSONB). Structure: `{ concept: {...}, song: {...}, images: {...}, ... }`.

**Tabbed settings UI:** Uses `STAGE_FIELDS` from `fieldConfigs.ts` and `StageSettingsPanel` from `SettingsControls.tsx`. Vertical tabs for: Concept, Song, Images, Video, Assembly, Bookend.

**Settings controls:** Rendered dynamically from `FieldDef` definitions — supports dropdown, combo, slider, toggle, number, text, readonly, lora, voice field types. Some fields are conditionally shown via `condition` functions.

**Actions:**
- Create profile (language + name)
- Save profile (name, notes, settings)
- Activate/Deactivate (only one active per language)
- Duplicate profile
- Delete profile

### 1.3 Users (`orchestrator/frontend/src/pages/admin/Users.tsx`)

**Status: EMPTY PLACEHOLDER.** Just shows an icon, "User Management" title, and "Coming soon — this page will be built in Phase 2".

### 1.4 Content (`orchestrator/frontend/src/pages/admin/Content.tsx`)

**Status: EMPTY PLACEHOLDER.** Same pattern — icon, "Content Management" title, "Coming soon" message.

### 1.5 Metrics (`orchestrator/frontend/src/pages/admin/Metrics.tsx`)

**Status: EMPTY PLACEHOLDER.** Same pattern — icon, "Metrics" title, "Coming soon" message.

### 1.6 Sidebar/Navigation (`orchestrator/frontend/src/components/layout/AppSidebar.tsx`)

**Admin gating:** Role-based visibility. Admin nav links are only rendered when `profile?.role === 'admin'`.

```typescript
const { profile } = useAuth()
const isAdmin = profile?.role === 'admin'
// ...
{isAdmin && (
  <>
    <Separator />
    <p>Admin</p>
    {adminNav.map(...)}
  </>
)}
```

**IMPORTANT GAP:** Admin pages are **only hidden in the sidebar** — there is **no route-level protection**. Any authenticated user who navigates directly to `/admin/queue` can access it. The `ProtectedRoute` wrapper only checks `session` (logged in), not `role`.

**Admin nav items:** Job Queue, Profiles, Users, Content, Metrics.
**Main nav items:** Dashboard, Generate, Study, Settings.

---

## Part 2: Backend Routes

### Complete Endpoint Inventory (`orchestrator/src/app.py`)

All routes are **filesystem-based** (workspace/manifest files). **None of these endpoints use Supabase.** The backend is the local orchestrator that runs pipeline stages — it is separate from the cloud job runner.

| Method | Path | Summary | Data Source |
|--------|------|---------|-------------|
| **Workspace** | | | |
| GET | `/api/workspace/info` | Current workspace metadata | Filesystem |
| POST | `/api/workspace/import` | Import CSV of words | Filesystem |
| GET | `/api/workspaces` | List all workspaces | Filesystem |
| POST | `/api/workspaces/create` | Create new workspace | Filesystem |
| POST | `/api/workspaces/switch` | Switch active workspace | Filesystem |
| POST | `/api/workspaces/rename` | Rename workspace | Filesystem |
| DELETE | `/api/workspaces` | Delete workspace | Filesystem |
| GET | `/api/workspaces/recent` | Recent workspaces | JSON file |
| POST | `/api/workspaces/open-folder` | Open arbitrary folder as workspace | Filesystem |
| **Words** | | | |
| GET | `/api/words` | List all words with stage status | Filesystem (manifests) |
| GET | `/api/words/{slug}` | Full word details + stages | Filesystem |
| GET | `/api/words/{slug}/manifest` | Raw manifest | Filesystem |
| POST | `/api/words` | Add single word | Filesystem |
| DELETE | `/api/words/{slug}` | Delete word + content | Filesystem |
| PUT | `/api/words/{slug}/settings/{stage}` | Update word settings | Filesystem |
| GET | `/api/words/{slug}/settings/{stage}` | Get effective settings | Filesystem |
| DELETE | `/api/words/{slug}/settings/{stage}` | Clear word settings | Filesystem |
| PUT | `/api/words/{slug}/select/{stage}` | Select version | Filesystem |
| POST | `/api/words/{slug}/mute` | Mute/unmute word | Filesystem |
| POST | `/api/words/mute-all` | Mute/unmute all | Filesystem |
| PUT | `/api/words/{slug}/approve` | Toggle approved | Filesystem |
| **Pipeline** | | | |
| POST | `/api/words/{slug}/run/{stage}` | Run pipeline stage | Engines + Filesystem |
| POST | `/api/words/{slug}/pipeline/start` | Start full word pipeline | Engines + Filesystem |
| GET | `/api/words/{slug}/pipeline/status` | Pipeline run status | In-memory state |
| POST | `/api/words/{slug}/pipeline/cancel` | Cancel pipeline | In-memory state |
| POST | `/api/words/{slug}/pipeline/resume` | Resume after song pause | In-memory state |
| **Autopilot** | | | |
| POST | `/api/autopilot/run` | Start batch autopilot | Engines + Filesystem |
| POST | `/api/autopilot/cancel` | Cancel autopilot | In-memory state |
| POST | `/api/autopilot/resume` | Resume from song pause | In-memory state |
| GET | `/api/autopilot/status` | Autopilot progress | In-memory state |
| **Stage Files** | | | |
| DELETE | `/api/words/{slug}/images/{version}/{filename}` | Delete specific image | Filesystem |
| DELETE | `/api/words/{slug}/versions/{stage}/{version}` | Delete version folder | Filesystem |
| GET | `/api/words/{slug}/concept/{version}` | Read concept JSON | Filesystem |
| PUT | `/api/words/{slug}/concept/{version}` | Save edited concept | Filesystem |
| POST | `/api/words/{slug}/trim/assembly` | Trim assembly video | Engine + Filesystem |
| GET | `/api/words/{slug}/stages/{stage}/{version}/meta` | Read generation-meta.json | Filesystem |
| **Media** | | | |
| GET | `/api/media/ws/{workspace}/{slug}/{path}` | Serve workspace files | Filesystem |
| GET | `/api/media/{slug}/{path}` | Serve active workspace files | Filesystem |
| **Other** | | | |
| GET | `/api/languages` | Supported languages list | Hardcoded |
| GET | `/api/loras` | List LoRA adapters | Filesystem (LORA_LIBRARY_PATH) |
| GET/POST/PUT/DELETE | `/api/voices/*` | Voice registry CRUD | Filesystem |
| GET/POST/DELETE | `/api/presets/*` | Settings presets CRUD | Filesystem |
| GET/PUT | `/api/settings/defaults` | Batch default settings | Filesystem |
| GET | `/api/engines/health` | All engine health checks | HTTP calls to engines |
| GET | `/api/engines/{engine}/health` | Single engine health | HTTP call |

**KEY FINDING: No `/api/admin/*` routes exist.** The backend has no admin-specific endpoints. All admin functionality goes through direct Supabase client calls from the frontend.

**KEY FINDING: No `/api/content/*` or `/api/decks/*` routes exist.** The backend operates on local workspaces/manifests, not on Supabase decks/words.

**Delete endpoints DO exist:** for words, workspaces, images, versions, voices, and presets — all filesystem-based.

---

## Part 3: Job Runner (`orchestrator/job_runner.py`)

### 3.1 Polling Loop

```python
# Checks system_settings for queue_paused and auto_approve
settings_resp = sb.table("system_settings").select("queue_paused, auto_approve") \
    .eq("id", 1).single().execute()

# Auto-approve if enabled
if settings_resp.data and settings_resp.data.get("auto_approve"):
    sb.table("generation_jobs").update({"status": "approved"}) \
        .eq("status", "pending").execute()

# Poll for next approved job (priority ASC, created_at ASC)
job_resp = sb.table("generation_jobs").select("*") \
    .eq("status", "approved") \
    .order("priority").order("created_at") \
    .limit(1).execute()
```

**Poll interval:** 30 seconds (configurable via `JOB_RUNNER_POLL_INTERVAL`).
**Status transitions:** `pending` → `approved` (manual or auto) → `processing` → `complete`/`partial`/`failed`.

### 3.2 Per-Word Processing Flow

For each job, the runner:

1. **Marks job as `processing`**, sets `started_at`
2. **Checks engine health** (warns but continues if unhealthy)
3. **Loads active language profile** from `language_profiles` table (matched by `target_language + is_active`)
4. **Merges settings:** `DEFAULT_SETTINGS` ← profile settings ← user art_style/movie_override
5. **Gets user's `base_language`** from `profiles` table
6. **Fetches pending words** for this deck: `words.status = 'pending'` AND `words.deck_id = deck_id`
7. **Runs LLM enrichment** (OpenRouter API) — batch call for all words, returns `word_target`, `translation`, `mnemonic`, `etymology`, `pos`, `article`
8. **Writes enrichment back to Supabase** `words` table
9. **Creates local workspace** at `WORKSPACE_ROOT / f"cloud_{user_id}_{deck_id}"`
10. **Writes merged settings** as `settings-defaults.json` in workspace
11. **For each word:**
    - Updates `words.status = 'processing'` and `words.word_slug`
    - Creates word folder + manifest on filesystem
    - Runs all stages in order with retry (MAX_RETRIES=2):
      - `concept → song → images → video → assembly → bookend`
    - On stage failure with retries: applies fallback overrides (images→literal, video→ken_burns, song→batch_size=1)
    - On final failure: updates `words.status = 'failed'`, `words.error_message`, `words.retry_count`, refunds 1 credit, increments `generation_jobs.words_failed`
    - On success: uploads final video + thumbnail to Supabase Storage, updates `words.status = 'complete'`, `words.video_url`, `words.thumbnail_url`, increments `generation_jobs.words_completed`

### 3.3 Job Completion

```python
if words_succeeded == total:
    final_status = "complete"
elif words_succeeded > 0:
    final_status = "partial"
else:
    final_status = "failed"

# Update job record
sb.table("generation_jobs").update({
    "status": final_status,
    "words_completed": words_succeeded,
    "words_failed": words_failed_count,
    "completed_at": datetime.now(timezone.utc).isoformat(),
}).eq("id", job_id).execute()

# Update deck status based on ALL words in deck
all_words_resp = sb.table("words").select("status").eq("deck_id", deck_id).execute()
# → complete (all words complete), partial (some complete), failed (none complete)
sb.table("decks").update({"status": deck_status}).eq("id", deck_id).execute()
```

### 3.4 Error Handling

- **Stage failure:** Retries up to `MAX_RETRIES` (default 2) with fallback settings
- **After all retries exhausted:** Marks word as `failed`, records which stage failed in `error_message`, refunds 1 credit, continues to next word
- **Upload failure:** Marks word as `failed` with "Upload failed", refunds credit
- **Queue pause check:** Before each word, checks `system_settings.queue_paused` — stops processing if paused

### 3.5 Content Output Paths

**Workspace path pattern:** `WORKSPACE_ROOT / f"cloud_{user_id}_{deck_id}"`
- `WORKSPACE_ROOT` from .env: `D:/CODING/ResonanceTEST/content`
- Example: `D:/CODING/ResonanceTEST/content/cloud_ef7a3c72_f1b8ff77-7fac-4a8a-8d70-b1478f3ee335/`

**Word folder structure:**
```
cloud_{userId}_{deckId}/
├── workspace-meta.json (NO — not created by job runner, only settings-defaults.json)
├── settings-defaults.json
└── {word_slug}/
    ├── manifest.json
    ├── concept/
    │   ├── concept_20260322T192021.json
    │   └── generation-meta.json (written by engine)
    ├── songs/
    │   └── song_20260322T192100/
    │       ├── take_01.flac
    │       └── generation-meta.json
    ├── images/
    │   └── images_editorial_20260322T192200/
    │       ├── 001.png, 002.png, 003.png
    │       ├── storyboard.json
    │       └── generation-meta.json
    ├── videos/
    │   └── ltx_20260322T192300/
    │       ├── scene_01.mp4, scene_02.mp4
    │       └── generation-meta.json
    ├── final/
    │   └── assembly_20260322T192400/
    │       ├── final.mp4
    │       └── generation-meta.json
    └── bookend/
        └── bookend_20260322T192500/
            ├── final.mp4
            └── generation-meta.json
```

**Note:** `generation-meta.json` files are written by each engine, not by the job runner. The job runner creates manifests and calls `run_stage()` which delegates to engines.

**Optional cleanup:** If `JOB_RUNNER_CLEANUP=true`, the workspace is deleted after job completion.

---

## Part 4: Supabase Schema (Verified from Live Database)

### 4.1 `words` Table

| Column | Sample Data | Notes |
|--------|------------|-------|
| `id` | UUID | PK |
| `deck_id` | UUID | FK to decks |
| `user_id` | UUID | FK to auth.users |
| `word` | "lupa" | User-entered word |
| `word_slug` | "lupa" | Slugified, set by job runner |
| `status` | "complete" / "pending" / "failed" | Updated by job runner |
| `translation` | "she-wolf, female wolf" | Set by enrichment |
| `mnemonic` | "Think of the famous..." | Set by enrichment |
| `etymology` | "From Latin 'lupa'..." | Set by enrichment |
| `pos` | "noun" | Part of speech, set by enrichment |
| `article` | "la" | Grammatical article, set by enrichment |
| `video_url` | Supabase Storage URL | Set after upload |
| `thumbnail_url` | Supabase Storage URL | Set after upload |
| `error_message` | null / "Failed at stage X" | Set on failure |
| `retry_count` | 0 | Tracks retry attempts |
| `created_at` | timestamp | Auto |

**`metadata` column:** DOES NOT EXIST
**`needs_review` column:** DOES NOT EXIST

### 4.2 `decks` Table

| Column | Sample Data | Notes |
|--------|------------|-------|
| `id` | UUID | PK |
| `user_id` | UUID | FK to auth.users |
| `name` | "Italian Deck — 3/23/2026" | Display name |
| `target_language` | "Italian" | Language string |
| `art_style` | null | Optional override |
| `movie_override` | null | Optional override |
| `word_count` | 1 | Manually managed, incremented by frontend |
| `status` | "complete" / "generating" / "partial" / "failed" | Updated by job runner |
| `created_at` | timestamp | Auto |
| `updated_at` | timestamp | Auto |

### 4.3 `generation_jobs` Table

| Column | Sample Data | Notes |
|--------|------------|-------|
| `id` | UUID | PK |
| `user_id` | UUID | FK |
| `deck_id` | UUID | FK |
| `status` | "complete" / "pending" / "approved" / "processing" / "partial" / "failed" / "rejected" | |
| `priority` | 0 | Lower = higher priority |
| `target_language` | "Italian" | |
| `art_style` | null | |
| `movie_override` | null | |
| `words_total` | 1 | Set at creation |
| `words_completed` | 1 | Incremented by job runner |
| `words_failed` | 0 | Incremented by job runner |
| `profile_used` | "French_Test" / null | Set by job runner |
| `settings_override` | {} / null | From wizard |
| `started_at` | timestamp / null | Set by job runner |
| `completed_at` | timestamp / null | Set by job runner |
| `error_message` | null | |
| `created_at` | timestamp | Auto |
| `updated_at` | timestamp | Auto |

### 4.4 `profiles` Table

| Column | Sample Data | Notes |
|--------|------------|-------|
| `id` | UUID | PK, = auth.users.id |
| `display_name` | "MisterDeepvision" | |
| `role` | "admin" / "learner" | Used for sidebar gating |
| `credits` | 48 | Decremented on generation |
| `base_language` | "English" | User's native language |
| `theme` | "standard" / "soft" | UI theme preference |
| `created_at` | timestamp | Auto |

### 4.5 `language_profiles` Table

| Column | Sample Data | Notes |
|--------|------------|-------|
| `id` | UUID | PK |
| `language` | "French" | |
| `name` | "French_Test" | |
| `is_active` | true/false | One active per language |
| `settings` | JSONB `{song: {...}, bookend: {...}, assembly: {...}}` | Engine settings per stage |
| `notes` | null | Admin notes |
| `created_at` | timestamp | Auto |
| `updated_at` | timestamp | Auto |

### 4.6 `system_settings` Table

| Column | Sample Data | Notes |
|--------|------------|-------|
| `id` | 1 | Singleton row |
| `auto_approve` | true | |
| `queue_paused` | false | |
| `updated_at` | timestamp | |

### 4.7 Row Counts

| Table | Count |
|-------|-------|
| words | 6 |
| decks | 5 |
| generation_jobs | 4 |
| profiles | 3 |
| language_profiles | 4 |

### 4.8 RLS Policies (from `orchestrator/frontend/supabase/migrations/20260322210000_phase2a_tables.sql`)

**Admin helper function:**
```sql
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;
```

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `decks` | Own OR admin | Own user_id | Own OR admin | Admin only |
| `words` | Own OR admin | Own user_id | Own OR admin | Admin only |
| `generation_jobs` | Own OR admin | Own user_id | Own OR admin | Admin only |
| `language_profiles` | Public (anyone) | Admin only | Admin only | Admin only |
| `random_word_lists` | Public (anyone) | Admin only | Admin only | Admin only |
| `system_settings` | Public (anyone) | — | Admin only | — |
| `storage.objects` (videos) | Public | Authenticated | — | Admin only |

**Key implication:** The frontend uses the **anon key** but the Queue page successfully queries `generation_jobs` for ALL users. This works because the admin user's RLS policy (`is_admin()`) returns true for admin-role users via `auth.uid()`. Non-admin users would only see their own records.

### 4.9 RPC Functions

```sql
-- Refund 1 credit to a user (called by job runner on word failure)
create or replace function public.refund_credit(user_id_param uuid)
returns void as $$
begin
  update public.profiles
  set credits = credits + 1
  where id = user_id_param;
end;
$$ language plpgsql security definer;
```

### 4.10 Triggers

All tables have `updated_at` triggers via `set_updated_at()` function.

### 4.11 Migration Files Location

**`orchestrator/frontend/supabase/migrations/`** (NOT `orchestrator/migrations/`):
1. `20260322210000_phase2a_tables.sql` — Main schema: 7 tables, RLS, indexes, triggers, storage bucket, RPC
2. `20260324000000_schema_fixes.sql` — Adds `generation_jobs.settings_override` (JSONB) and `profiles.theme` (TEXT)

### 4.12 Additional Tables

**`random_word_lists`** — Pre-seeded word lists by language/difficulty/category. Used by the generate wizard's random word suggestion feature.

**`system_settings`** — Singleton row (id=1, enforced by CHECK constraint). Controls `auto_approve` and `queue_paused`.

---

## Part 5: Generation Metadata on Filesystem

### 5.1 Content Directories

**`D:/CODING/ResonanceTEST/content/`** (WORKSPACE_ROOT from .env) — contains only an empty `workspace/` subdirectory.

**`D:/CODING/ResonanceWorkspace/content/`** (separate location) — contains **20 word-pack folders** plus `presets/` and `voices.json`. This includes:
- **4 cloud folders:** Named `cloud_{user_id}_{deck_id}` (correspond to Supabase decks)
- **16 legacy/local folders:** Named descriptively (e.g., `german_emotion`, `Cebuano_emo_1`, `Italian_test1`)

Each word-pack folder contains `settings-defaults.json` and one subfolder per word (by slug).

### 5.2 Sample `generation-meta.json` (from image engine test output)

```json
{
  "engine": "image",
  "engine_version": "1.0.0",
  "timestamp": "2026-03-03T08:19:09Z",
  "status": "success",
  "duration_seconds": 122.08,
  "input": {
    "word": "절망",
    "language": "Korean",
    "language_code": "ko"
  },
  "settings": {
    "creative_direction": "editorial",
    "frame_narrative": "series",
    "image_count": 3,
    "image_count_source": "auto_from_clip_duration_30",
    "clip_duration": 30,
    "art_style": "auto",
    "word_in_image": true,
    "llm_model": "deepseek/deepseek-chat-v3-0324",
    "image_model": "quality"
  },
  "outputs": {
    "images_generated": 3,
    "images_requested": 3,
    "image_files": ["001.png", "002.png", "003.png"],
    "storyboard_file": "storyboard.json"
  },
  "steps": {
    "storyboard_generation": {
      "llm_model": "deepseek/deepseek-chat-v3-0324",
      "llm_provider": "openrouter",
      "prompt_tokens": 1129,
      "completion_tokens": 1299,
      "duration_seconds": 8.48
    },
    "image_rendering": {
      "model": "gemini-3-pro-image-preview",
      "scenes_attempted": 3,
      "scenes_succeeded": 3,
      "scenes_failed": 0,
      "per_scene_seconds": [38.86, 37.53, 37.19],
      "total_duration_seconds": 113.58
    }
  }
}
```

### 5.3 Storyboard Files

Storyboard files exist under `images/{version}/storyboard.json`. They are loaded by the backend's `_compute_stages_detail()` and served to the frontend.

### 5.4 Manifest Files

Each word has a `manifest.json` with: `word_original`, `word_slug`, `translation`, `language`, `language_code`, `selected` (per-stage version selections), `settings` (per-word overrides), `lineage` (history of runs), `muted`, `approved`, `updated_at`, and enrichment data.

---

## Part 6: Frontend Component Patterns

### Data Fetching Pattern
- **Direct Supabase client calls** using `useEffect` + `useCallback` + `useState`
- No React Query, no SWR
- Some pages poll on intervals (Queue: 10s)
- No backend API calls from admin pages (Queue/Profiles go direct to Supabase)

### Supabase Client Import
```typescript
import { supabase } from '@/lib/supabase'
// Uses anon key from VITE_SUPABASE_ANON_KEY
```

### Auth/Role Checking
- `useAuth()` hook provides `session`, `user`, `profile`
- Profile fetched from `profiles` table on auth state change
- Role check: `profile?.role === 'admin'` (sidebar only — no route-level guard)

### Layout
- `AppLayout` wraps all protected pages (via React Router `Outlet`)
- `AppSidebar` (desktop: fixed 60px-wide sidebar, mobile: Sheet)
- `AppHeader` (top bar)

### Styling
- **Tailwind CSS** with CSS variables for theming
- Dark mode as default (`gradient-bg`, `glass` utility classes)
- shadcn/ui components (`Card`, `Button`, `Input`, `Label`, `Separator`, `Sheet`, `Badge`, `Dialog`, etc.)
- `cn()` utility for conditional classes (clsx + tailwind-merge)
- Lucide icons throughout

### State Management
- **Local state only** (`useState`, `useCallback`, `useRef`)
- No global store (no Redux, Zustand, Jotai, etc.)
- Auth state via React Context (`AuthContext`)
- Toast notifications via context (`useToast`)
- Theme via context (`ThemeContext`)

---

## Part 7: The "Add Cards to Deck" Flow

### 7.1 URL Parameter Handling

`GenerateWizard.tsx` reads `?deckId=xxx` from search params:

```typescript
const [searchParams] = useSearchParams()
const deckIdParam = searchParams.get('deckId')
```

When `deckIdParam` exists, it:
1. Fetches the existing deck from Supabase
2. Pre-selects the language
3. Skips the language step (user goes straight to words)

### 7.2 New Generation Job Created

Yes, adding words to an existing deck creates a **new `generation_job`**:

```typescript
const { error: jobError } = await supabase
  .from('generation_jobs')
  .insert({ ...jobPayload, deck_id: targetDeckId })
```

### 7.3 Words Linked to Existing Deck

New word rows are inserted with the existing `deck_id`:

```typescript
const wordRows = wordList.map((w) => ({
  deck_id: targetDeckId,
  user_id: user.id,
  word: w,
  status: 'pending',
}))
const { error: wordsError } = await supabase.from('words').insert(wordRows)
```

### 7.4 Deck word_count Update

**Manually incremented** by the frontend:

```typescript
await supabase.from('decks').update({
  status: 'generating',
  word_count: existingDeck.word_count + wordCount,
}).eq('id', targetDeckId)
```

### 7.5 Deleting a Word from a Deck — What Needs to Happen

**Currently, there is NO word deletion feature in the cloud flow.** The backend has `DELETE /api/words/{slug}` but that operates on the local filesystem workspace, not on Supabase.

To implement word deletion from a deck, you would need to:
1. Delete the word row from `words` table
2. Delete the uploaded video/thumbnail from Supabase Storage (`videos` bucket, path: `{user_id}/{deck_id}/{word_slug}/`)
3. Decrement `decks.word_count`
4. Re-evaluate `decks.status` (if all remaining words are complete, status should be "complete")
5. **No** `generation_jobs` update needed (historical record)

---

## Summary of Gaps and Risks for Content Browser Build

### Critical Gaps

1. **No route-level admin protection** — Admin pages are only hidden in sidebar. Direct URL access works for any authenticated user. Must add an admin route guard.

2. **No word deletion in cloud flow** — Only local filesystem deletion exists. Need Supabase + Storage deletion endpoint.

3. **No `metadata` or `needs_review` columns** on `words` table — These would need to be added via migration if the Content Browser needs them.

4. **Migrations are in `orchestrator/frontend/supabase/migrations/`** — not `orchestrator/migrations/`. Two migration files exist.

5. **No backend admin endpoints** — All admin operations are done via direct Supabase calls from the frontend (using anon key). This works because RLS policies grant admin access via `is_admin()` function checking `profiles.role`.

6. **`word_count` on `decks` is manually managed** — Not a computed column or trigger. Deletions would need to manually decrement it.

7. **RLS is properly configured** — Admin users can read/update all records. Non-admin users only see their own. Word/deck deletion is admin-only. Storage deletion is admin-only.

### Key Patterns to Follow for New Pages

- Direct Supabase queries from frontend (match Queue/Profiles pattern)
- `useEffect` + `useCallback` for data fetching
- shadcn/ui components + Tailwind
- Local state only
- Lucide icons
- `profile?.role === 'admin'` for admin checks
- Two-panel or card-based layouts

### Data Available for Content Browser

From `words` table: `id`, `word`, `word_slug`, `translation`, `status`, `video_url`, `thumbnail_url`, `mnemonic`, `etymology`, `pos`, `article`, `error_message`, `deck_id`, `user_id`, `created_at`

From `decks` table: `id`, `name`, `target_language`, `art_style`, `word_count`, `status`, `user_id`

From `generation_jobs` table: `profile_used`, `settings_override`, `started_at`, `completed_at`, duration computable

Generation metadata (`generation-meta.json`) is only on the **local filesystem** — not in Supabase. To show generation details (engine versions, durations, LLM costs) in the Content Browser, you'd need to either:
- Store metadata in a new Supabase column/table during upload
- Read from the filesystem if the workspace still exists (but `CLEANUP_WORKSPACES` may delete it)

### Storage URL Pattern

Videos: `{user_id}/{deck_id}/{word_slug}/video.mp4`
Thumbnails: `{user_id}/{deck_id}/{word_slug}/thumb.jpg`

**Bug noted:** The upload path uses `word_slug` but the word_slug stored at upload time might be `None` (see sample data: `video_url` contains `/None/video.mp4`). This happens because `upload_results()` uses `word_record.get("word_slug", "")` which gets the slug from the Supabase record, but the word_slug at that point should already be set.
