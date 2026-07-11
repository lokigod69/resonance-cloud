# Resonance Cloud — Development Roadmap

**Created:** March 24, 2026  
**Status:** Active — updated each session  
**Goal:** Get the cloud pipeline generating real content, then polish the UI for pilot testers.

---

## Current State (March 24)

### What Works
- Frontend deployed to Vercel (resonanz.pro) from `orchestrator/frontend/`
- Auth flow (Supabase) — login, signup, invite codes
- Generate wizard — 6-step flow (Language → Words → Vibe → Art Style → Music → Confirm)
- Admin settings UI — engine tabs, field configs, save with toast confirmation
- Admin queue page — job list with metadata display
- All local engines operational (Concept :8080, Song :8000, Image :8082, Video :8086, Assembly :8085, ACE-Step :7860)
- Git cleaned up — single repo at `orchestrator/frontend/`, pushes to `lokigod69/resonance-cloud`

### What's Broken / Untested
- **Dashboard loading** — fix was pushed (useAuth timeout, error states, dependency fix) but NOT verified yet
- **Job runner** — never successfully picked up a job. Root cause unknown. Could be: no row inserted, RLS blocking, status mismatch, wrong Supabase key, auto_approve not set
- **End-to-end pipeline** — never tested cloud → local engines flow
- **Skinning system** — not built yet (new feature request)

---

## Priority Stack

### Tier 1 — Pipeline Must Work (Days 1–2)

These block everything. No UI polish matters if generation doesn't produce output.

#### 1.1 Verify Dashboard Fix
- Load resonanz.pro, log in, navigate to /dashboard
- Check: do skeleton cards resolve? Do credits show correct value?
- Navigate away and back — does it survive?
- If still broken: the fix didn't land correctly. Re-investigate useAuth hook.

#### 1.2 Fix Job Runner (CRITICAL)
Investigation checklist:
1. Go to Supabase dashboard → `generation_jobs` table → are there any rows?
2. If no rows: the frontend never inserted. Check the Generate wizard's submit handler — does it call `supabase.from('generation_jobs').insert()`?
3. If rows exist: check `status` field. Job runner expects `pending` (or `approved` if auto_approve is off). What value is actually stored?
4. Check `system_settings` table → is `auto_approve` set to `true`?
5. Check job_runner.py → what Supabase key does it use? Must be `SUPABASE_SERVICE_KEY` (service_role), not anon key.
6. Check RLS policies on `generation_jobs` — does service_role bypass RLS? (It should by default.)
7. Run job_runner.py manually, watch logs. Does it poll? Does it find jobs? What error appears?

#### 1.3 End-to-End Pipeline Test
Once job runner picks up a job:
- Submit 1 word (e.g., "Bonjour" in French) via the Generate wizard
- Watch job_runner.py logs — does it advance through stages?
- Check each engine call: does Image engine respond? Concept? Song? Video? Assembly?
- Verify the final video appears in Supabase storage
- Verify it shows up on the dashboard
- Compare metadata: did it use the correct settings (art_style, genre, creative_direction)?

---

### Tier 2 — Skinning System (Days 2–3)

Three selectable skins, switchable from Settings for both admin and user roles.

#### 2.1 Architecture
- CSS variables-based theming (already using `index.css` variables)
- Skin preference stored in Supabase `profiles` table (add `skin` column: `standard` | `retro` | `soft`)
- Theme provider component wraps the app, reads preference, applies CSS class to root
- Settings page gets a "Theme" section with visual preview cards for each skin

#### 2.2 Standard (Current)
- The existing dark theme — keep as-is
- Dark backgrounds (#0a0a0f base), muted accents, glassmorphism on generate wizard
- Clean, modern, minimal

#### 2.3 Retro (From Reference Document)
Source: RETRO MP3 EXTRACTOR styling document (provided by Sir Robert)

Color tokens:
- `--bg-main: #2F353B` (dark slate/charcoal)
- `--bg-panel: #6A808C` (lighter slate)
- `--accent: #BCA396` (muted peach/tan)
- `--shadow: #1A1D20` (near black)
- `--light: #C1CCD1` (cool pale grey)
- LED status: green `#4caf50`, orange `#ff9800`, red `#f44336`

Typography:
- Primary: `'VT323', monospace` (pixelated 8-bit feel)
- Secondary: `'Share Tech Mono', monospace` (clean terminal look, uppercase with letter-spacing)

Key effects:
- CRT scanlines overlay (repeating-linear-gradient)
- Hardware panel styling (hard drop shadows, inner light lip)
- Mechanical buttons (translate on click, shadow disappears)
- LED status lights with glow and pulse animation
- Floating/bobbing icon animations
- Thick left-border on list items

#### 2.4 Soft (Agent Designs)
Direction: Muted but colorful. Warmer, more inviting. Think: pastel gradients, rounded corners, subtle shadows instead of hard edges. More accessible and friendly than the stark dark theme.

Suggested palette (agent to refine):
- Background: warm off-white or very light gray (#F5F3F0 or #FAFAF8)
- Panels: white with subtle warm shadows
- Primary accent: dusty rose (#C4918A) or sage green (#8BA888)
- Secondary accent: muted lavender (#9B8EC4) or warm amber (#D4A76A)
- Text: warm charcoal (#3A3632), not pure black
- Borders: very subtle, warm-toned

Typography:
- Clean sans-serif: Inter, Nunito, or similar with softer letter spacing
- Rounded, friendly feel — no monospace

Key effects:
- Soft shadows (no hard drops)
- Gentle border-radius (12-16px)
- Light mode with subtle gradients
- Smooth transitions (no mechanical clicks)
- Cards with very slight elevation

#### 2.5 Implementation Plan
1. Create `src/themes/` folder with `standard.css`, `retro.css`, `soft.css`
2. Each file defines the same CSS variable names with different values
3. Create `ThemeProvider.tsx` — reads profile.skin, applies `.theme-standard` / `.theme-retro` / `.theme-soft` to `<html>`
4. Add skin selector to Settings page (visual cards showing preview of each theme)
5. On change: update Supabase profile, apply immediately
6. Google Fonts: conditionally load VT323 + Share Tech Mono only when retro is active

---

### Tier 3 — Backend Endpoints (Days 3–4)

#### 3.1 LoRA Library Endpoint
- `GET /api/loras` → reads `D:\CODING\RESONANCE\loras\`, returns list
- Each entry: `{ id, display_name, language, gender, type, epochs: [50, 100, 150...], recommended: { epoch, strength, guidance, shift } }`
- Source: `metadata.json` in each LoRA subfolder
- Wire into admin settings: dropdown for `lora_id`, dependent dropdown for `lora_checkpoint`

#### 3.2 Voice Registry Endpoint
- `GET /api/voices` → reads `voices.json` or a Supabase `voices` table
- Each entry: `{ id, name, gender, language, provider, provider_voice_id }`
- **Note:** The old `voices.json` from the local orchestrator may not be available. If missing, create a fresh `voices` table in Supabase and seed it with the ElevenLabs voices currently in use.
- Wire into admin bookend settings: dropdown with voice name + preview

#### 3.3 System Settings Endpoint
- Verify `system_settings` table has `auto_approve` toggle
- Add endpoint to read/write system settings from admin UI
- This is where global defaults live (default art_style, default genre, etc.)

---

### Tier 4 — UI Polish (Days 4–5)

#### 4.1 Generate Wizard
- Background: dark hue `#0a0a0f`, not pure black
- Hover states on all clickable elements (glow, scale, or opacity shift)
- Post-generation: clear "Your words are being created" message with progress indicator
- Movie examples: "Lord of the Rings, Harry Potter" (done in push)

#### 4.2 Admin Queue
- Real-time status updates (poll or SSE)
- Job detail expansion with full settings_override display
- Retry button for failed jobs
- Cancel button for pending jobs

#### 4.3 Dashboard
- Deck cards with thumbnails (pull from Supabase storage)
- Stacked card aesthetic (wabi.ai reference)
- Word count per deck
- Last generated timestamp

---

### Tier 5 — Future Sessions

#### 5.1 Study Mode
- Layer 1: Guided Watch (video plays with all info visible — word, translation, mnemonic)
- Layer 2: Recognition (translation hidden, self-graded "knew it" / "didn't know")
- Heat system: hot → warm → cool based on recall_attempts

#### 5.2 Word Orbs
- Physics-enabled bubbles at bottom of dashboard (GSAP or Matter.js)
- Each orb = a word, colored by heat status
- Click to play video

#### 5.3 Sharing & Watermark
- Share individual videos or decks
- Watermark overlay on shared content
- Public share links (no auth required to view)

#### 5.4 Mobile Optimization
- Responsive layouts for all pages
- Touch-friendly study mode
- PWA considerations

---

## Agent Prompt Templates

### Prompt Naming Convention
`AGENT_PROMPT_{scope}_{date}.md`  
Example: `AGENT_PROMPT_job_runner_fix_march24.md`

### Prompt Structure
Every prompt must include:
1. **Exact file paths** — never say "the frontend folder", say `D:\CODING\ResonanceTEST\orchestrator\frontend\`
2. **Investigation first** — read and report before changing anything
3. **One codebase only** — never mix frontend and backend in one prompt
4. **Verification steps** — how to confirm the fix works
5. **What NOT to touch** — explicit guardrails

---

## Session Checklist (Start of Each Session)

1. Read this roadmap — what's the current priority?
2. Check if any agent prompts from last session produced results
3. Verify deployed state: visit resonanz.pro, check basic functionality
4. Identify the single most impactful task for this session
5. Write scoped agent prompt OR investigate directly
6. Test after each change — don't batch untested work
7. Update this roadmap at end of session

---

## Key Reference Paths

| What | Path |
|------|------|
| Frontend repo (THE one) | `D:\CODING\ResonanceTEST\orchestrator\frontend\` |
| Job runner | `D:\CODING\ResonanceTEST\orchestrator\job_runner.py` |
| Backend (if exists) | `D:\CODING\ResonanceTEST\orchestrator\src\` |
| LoRA library | `D:\CODING\RESONANCE\loras\` |
| Local engines | Various ports (8080, 8000, 8082, 8086, 8085, 8087) |
| ACE-Step | `D:\CODING\RESONANCE\ACE-Step-1.5\` (port 7860) |
| Supabase | Dashboard at supabase.com (project-specific URL) |
| Vercel | Auto-deploys from `lokigod69/resonance-cloud` main branch |
| Design docs | `RESONANCE_CLOUD_UI_VISION_v1.md` + addendum |
