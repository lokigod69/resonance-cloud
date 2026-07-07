# Speak Redesign — Decision Document

Date: 2026-07-07 · Author: Fable (design) + Codex (code audit)
Status: **DECIDED + BUILT 2026-07-07** (uncommitted, awaiting owner visual pass).
Owner rulings: D1 ✅, D2 ✅ (option a), D3 ✅, D4 ✅ **six** voices (five named + Sulafat) with
Codex-generated comic mascots in `public/characters/voices/`, D5 ✅ (+ level switcher in the
ready room), D6 ✅, D8 ✅. **D7 declined for now** — no enforcement flip, no countdown, no usage
display; an admin quota UI was considered and skipped because it needs Supabase policy/SQL
(quotas stay changeable in the DB / by an agent on request). Pedagogy zero/beginner sync
applied to `api/prompts/_shared/pedagogy.ts`.
Related: `FABLE_SPEAK_PRODUCTIONIZATION_PLAN.md` (provider consolidation remains ON HOLD — this
document does NOT touch backend provider consolidation; the Grok cost-class distinction stays).

## The one-sentence thesis

Speak today is a test-user showroom (pick language → pick mode → pick provider → pick voice →
pick level → finally talk); the redesign turns it into a practice room: **tapping Speak should
put you one tap away from talking, with everything you chose last time already in place**, and
all the showroom machinery moved behind a single "change" affordance.

## What the audit established (why the flow feels heavy)

- **Language is the only thing NOT remembered.** `useVoiceTutor` starts `language: null` every
  mount and never writes it to storage — that's why you re-pick German every visit. Everything
  else (provider, Gemini voice/mode/accent, level-per-language) already persists in
  localStorage. Fixing the worst pain is literally one missing persistence + inheriting the
  dashboard's `activeLanguage`.
- **Level already persists per language** (`voice-tutor-level-${lang}`), but the picker screen
  is still shown on every new tutor selection. The asking is UI habit, not missing data.
- **The three tabs (Live / Charaktere / Stimmen) are a tech taxonomy, not a user one.**
  Live = Grok realtime (expensive, instant), Charaktere = Voxtral characters, Stimmen = Gemini
  voices. To a learner, Charaktere and Stimmen are the same product ("talk to a tutor, wait a
  beat for replies") with different casting menus.
- **Grok quota exists but is monitor-only by default.** `/api/grok-token` calls
  `consumeApiQuota(user.id, 'grok_token')` (3/min, 40/day in the migration), but
  `api_quota_settings.enforcement_enabled` defaults to `false`, there's no quota preflight or
  "remaining today" display in the UI, and an open WebSocket session has no duration cap.
  (Live Supabase value of `enforcement_enabled` unverified — check before beta.)
- **Gemini voices are a static frontend catalog** (`src/data/geminiVoices.ts`) mirrored by an
  API allowlist (`api/voice-chat.ts`). Trimming the UI list is a filter; the allowlist can stay
  untouched so nothing breaks.
- **Roleplay is a bounded vertical slice** (`Speak.tsx` state + wizard, `useVoiceTutor`
  startRoleplay, `roleplayScenarios.ts`, roleplay branches in the API prompt builders).
  Deleting the UI doesn't destabilize Grok — switching to roleplay already force-ends Grok.
- **The conversation header is at its space limit** (cut off on mobile, icon-only affordances
  that need tooltips to be understood).

## The proposed experience (design on paper)

**Entry.** Tapping Speak never shows a language grid. It opens on your app-wide active
language (the one the Home page shows), with a header chip `🇩🇪 Deutsch ▾` that switches
languages in two taps — same mental model as the Home language cluster. If you've spoken
before, the screen is a "ready room": your last tutor's avatar, name, level, and one big
vermillion **Start talking** button (plus a quiet "change tutor" link under it). First-time
users see the casting choice below instead.

**Casting: two doors, not three tabs.**
- **⚡ Live** — "Talks back instantly." Presented as the premium card: gold edge, a small
  "Premium — X sessions left today" quota line. This keeps the cost-class distinction visible
  (the reason consolidation was put on hold) and turns it into perceived value instead of a
  tech label.
- **🎭 Tutors** — one grid merging Voxtral characters (style tutors + personas) and, at the
  end of the grid, the curated Gemini voices as "Classic voices" entries. One casting menu;
  the provider difference collapses to *which card you tapped* — purely a UI merge, zero
  backend change, ProviderToggle disappears.

**Level.** Asked once per language (it already persists); after that you go straight into
conversation. Changing it lives in the session sheet (below). The level picker screen keeps its
current design for the first-run case.

**The session sheet replaces the icon-strip header.** The conversation header shrinks to:
back, tutor avatar + name + flag, and one ⚙ button. Tapping ⚙ (or the tutor chip) opens a
bottom sheet (mobile) / popover (desktop) with everything written out: Level, Study mode
toggle, Show/hide transcript, Change tutor, History, New conversation, End & extract words.
This fixes the mobile cut-off, kills the tooltip guessing game, and gives future settings
(voice choice, speed) a home. Extract-words stays exactly as is — it works.

**Roleplay.** The top-level Freies Gespräch/Rollenspiel toggle disappears.

## Decisions I need from you

**D1 — Language entry.** Inherit the dashboard's active language + header switcher chip; the
language grid only appears for users with no language at all.
→ *Recommended: yes.* (Alternative: keep the grid but remember the last choice — weaker, still
one dead screen per visit.)

**D2 — Roleplay.** (a) Delete the frontend slice entirely (toggle, wizard, scenarios data,
startRoleplay), leaving the API's roleplay branches inert for now — cheapest, reversible via
git; (b) delete API-deep too; (c) keep but demote to a scenario chip inside the conversation.
→ *Recommended: (a).* You said delete; keeping the API branches inert avoids touching
`voice-chat.ts` in the same pass that reworks the UI.

**D3 — Two doors instead of three tabs** (Live premium card + merged Tutors grid with Gemini
voices as "Classic voices" cards at the end). UI-only merge; providers stay separate underneath;
Filipino/Bisaya simply won't show the Live door (Grok unsupported there today).
→ *Recommended: yes.* This is NOT the on-hold provider consolidation — no tutor catalog
rebuild, no toggle-kill on the backend, no pricing model needed.

**D4 — Voice curation.** Trim the Stimmen catalog UI to your picks — you named **Laomedeia,
Algieba, Sadachbia, Zephyr, Fenrir** (confirm this is the final five). Everything else stays
valid API-side but hidden; the full list remains visible to admins via the existing
`canUseExperimentalSpeakOptions` gate, and a later "Advanced options → Speak voices" in the
profile can expose user-level configuration (localStorage first; profile-backed only if it
ever needs to sync across devices).
→ *Recommended: yes, five voices, admin-gated rest, defer the profile setting.*

**D5 — Level asked once per language,** changed via the session sheet thereafter.
→ *Recommended: yes.* (Risk: users who never discover the sheet stay beginners forever —
mitigated by the sheet being the only header button, hard to miss.)

**D6 — Session sheet header** as described above.
→ *Recommended: yes.* This is the biggest single UX win after D1.

**D7 — Live productionization.** (a) Flip `api_quota_settings.enforcement_enabled` to true in
Supabase (verify current limits 3/min, 40/day are what you want for testers); (b) show
remaining Live sessions on the Live door; (c) add a client-side session length cap with a
countdown (e.g. 10 min) so one open socket can't run unbounded.
→ *Recommended: all three; (a) is a Supabase setting you flip, (b)+(c) are frontend.*

**D8 — One-tap resume** ("ready room" with last tutor + Start talking).
→ *Recommended: yes — this is the "press Speak and immediately speak" feeling you described.*

## Sequencing (if everything is approved)

- **Phase A — state & entry** (D1, D5, D8): language inheritance + persistence, skip-level,
  ready room. Small diff, biggest felt improvement.
- **Phase B — casting & curation** (D2, D3, D4): remove roleplay UI, two doors, merged grid,
  five voices.
- **Phase C — chrome & cost** (D6, D7): session sheet, quota surfacing, enforcement flip,
  session cap.

Each phase ships independently and leaves the app coherent if you stop after it. i18n
(en/de/fr) rides along with every phase. Nothing starts until you say go.

## Appendix — file map (from the Codex audit, for implementation)

- Flow owner: `src/pages/Speak.tsx` (language grid ~:519, mode toggle :167/:488, Grok picker
  :759, non-Grok level gate :821, header actions :1221–:1288, extract-words :373/:898/:959/:977).
- State/persistence: `src/hooks/useVoiceTutor.ts` (language null :192, never persisted :789;
  provider/Gemini keys :122/:196–199, persist effects :292–:307; level read :862/:928, write
  :1147; roleplay :225–230/:478–487/:1077).
- Pickers: `components/speak/ProviderToggle.tsx` (tab→provider map :13, Filipino gate :31),
  `GrokPicker.tsx`, `GeminiModeVoicePicker.tsx` (voices map :91, modes :136, admin accents :58),
  `CharacterGrid.tsx` (registry split :55), `VoiceTutorPicker.tsx` (dispatch :63).
- Voices: `src/data/geminiVoices.ts` (catalog; header says keep in sync with API twin) ↔
  `api/voice-chat.ts` allowlist (:236, reject :426). Admin gate: `src/lib/speakCuration.ts`.
- Pedagogy drift (fix during Phase A or B): `src/lib/grokPedagogy.ts` is a hand-copy of
  `api/prompts/_shared/pedagogy.ts` and has drifted (Grok zero/beginner has newer glossing +
  first-greeting rules). Sync the text — this is the already-approved "pedagogy unification",
  not a provider change.
- Quota: `api/grok-token.ts` (:35 auth+quota, :44/:54 600s client secret),
  `api/_shared/quota.ts` (:44 RPC), migration
  `20260502010000_phase1c_api_quota_limits.sql` (:60 enforcement default false, :73 grok_token
  3/40, :162 enforced-mode switch).
- Roleplay slice: `src/data/roleplayScenarios.ts`, Speak.tsx :20/:167–171/:450/:551/:651,
  useVoiceTutor :82/:225/:478/:1077, `api/prompts/_shared/roleplay.ts`, roleplay branches in
  `api/prompts/{voxtral,gemini,_shared/generic}.ts`, `api/voice-chat.ts` :62/:701/:730/:765–791.
