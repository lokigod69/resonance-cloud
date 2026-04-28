# DESIGN DOC V2 — Grok Voice Agent Integration (Realtime API)

**Target:** third Speak provider alongside Voxtral and Gemini, fully standalone
**Repo:** `lokigod69/resonance-cloud`
**Module slot:** `orchestrator/frontend/api/prompts/grok.ts` (currently a throwing stub)
**Status:** design-locked. Implementation prompt is the next artifact.
**Supersedes:** `DESIGN_DOC_GROK_VOICE_AGENT.md` (V1)

---

## 0. Document conventions

This document is the result of two read-only investigations against the live codebase plus the xAI Voice Agent + ephemeral-tokens documentation. Every claim about the existing codebase has been verified by Codex with paste-from-source citations. All locked decisions are marked **LOCKED**. All deferred decisions are marked **V2 OPEN** (none remain at this writing).

---

## 1. The standalone invariant

**LOCKED:** Grok is built as a fully standalone subsystem. **Zero lines of `useVoiceTutor.ts` change. Zero lines of `voxtral.ts` change. Zero lines of `gemini.ts` change.** The Voxtral and Gemini paths are bit-for-bit identical after Grok ships.

This is non-negotiable. The Speak page has a documented history of regression pain when the audio path is touched. Building Grok parallel — not woven in — is the safest approach. Mild code duplication of iOS audio primitives is accepted as the cost of guaranteed isolation.

The standalone invariant means:

- Grok gets its own hook (`useGrokRealtime.ts`), its own picker components, its own iOS audio unlock copy, its own AudioContext lifecycle, its own conversation persistence helpers.
- The existing `useVoiceTutor` hook remains the source of truth for Voxtral and Gemini and is not modified.
- Routing in `Speak.tsx` becomes a top-level branch: when `provider === 'grok'`, render the Grok subsystem; otherwise render the existing Voxtral/Gemini subsystem.
- The backend `/api/voice-chat` is **not modified** for Grok. Grok does not flow through it. The browser connects directly to `wss://api.x.ai/v1/realtime` using an ephemeral token minted by a new `/api/grok-token` endpoint.
- The existing `prompts/grok.ts` throwing stub stays as-is (or is removed entirely) — the Grok path no longer touches `voice-chat.ts` so the stub is never invoked.

---

## 2. Product decisions (V2-locked)

| Decision | Value |
|---|---|
| API path | Voice Agent (Realtime WebSocket), not unary TTS |
| Selection model | **Model picks the situation within a category each session** (V2 Option B). Categories are broad; the model receives a category-level system prompt and chooses a specific situation at start. |
| Categories | Travel, Business, Romance, Philosophy, Daily Life, Food/Drink/Restaurants, Arts/Music/Culture, News & Current Events, plus Free Chat |
| Voice picker | Flat 5-voice selector: `eve`, `ara`, `rex`, `sal`, `leo` |
| Web search tool | Enabled for **all** Grok modes including Free Chat |
| Other tools (`x_search`, `file_search`, `mcp`, custom functions) | Deferred. Not in V1. |
| Language gating | Grok grayed out for `fil` (Tagalog). Dutch (`nl`) is best-effort per xAI; **shown but flagged with subtle "best-effort" tooltip**. |
| Hot-swap | Match Voxtral roleplay UX — Change Tutor button hidden during Grok sessions. End + restart to switch voice or category. |
| Free Chat persistence | Reuse existing `mode='freeform'` with `provider='grok'`. No new mode value. |
| Conversation history persistence | Match existing pattern — single insert at session start, single update with `ended_at` at end. No per-turn writes. |
| Rate limiting | None for test users in V1. Cost surface acknowledged below. |
| Correction behavior | Inherit L0–L3 pedagogy rules — same as Voxtral/Gemini — composed into the Grok session `instructions` |
| Greeting | Emitted by the model from `instructions` when client sends `response.create` after `session.update`. No separate round-trip. |

---

## 3. Cost surface and risk acknowledgments

xAI Voice Agent: **$0.05 per minute of generated speech**. A user talking for an hour produces ~1–2 minutes of agent speech; ~$0.05–$0.10/hour/user. Worst case (an agent-dominant hour-a-day power user) ≈ $90/month. Acceptable for V1 test users.

**Live test risk acknowledged:** Voice features in Speak have historically required several debug cycles before audio reliably plays on iOS Safari first-tap. Grok uses a different audio pipeline (PCM streaming via AudioWorklet) than Voxtral or Gemini (decoded blob playback). **Expect at least one iOS-Safari-specific debug round after first ship.** The standalone hook structure makes this debugging contained — fixes apply only to Grok, no regression risk to Voxtral or Gemini.

---

## 4. Scenario-selection architecture (V2 Option B in detail)

### 4.1 What "model picks the situation" means

For each category, we define a category-level system prompt. The prompt instructs the model to:
1. Pick a specific concrete situation within the category at session start.
2. Choose its own role and an NPC name appropriate to the situation and target language.
3. Open the conversation by entering that situation immediately, in target language, per L0–L3 pedagogy rules.
4. Stay in the situation for the duration of the conversation.
5. Use web search when the situation calls for current information.

Example for "Travel":

```
You are a roleplay partner for language practice. Your job is to invent and play a
specific Travel situation each time you start a conversation. Pick something fresh —
do not default to airport check-in every time. Possibilities include but are not
limited to: hostel reception, taxi from a foreign airport, lost luggage office,
asking a stranger for directions in a new city, train conductor checking tickets,
border officer at passport control, hotel concierge with a complaint, tour guide
at a ruin, ferry ticket office, bike rental shop. Pick ONE specific situation.
Pick a name and role for yourself appropriate to the situation and to the target
language's culture. Open immediately by entering the situation — do not announce
what scenario you've chosen.
```

The 9 categories will each get a similar prompt. Free Chat gets a different shape — no scenario constraint, web search highlighted as available.

### 4.2 Why this differs from existing roleplay infrastructure

The existing `roleplayScenarios.ts` catalog has 25 scenarios with explicit `npcRole`, `namePool`, `moodPool`, `userRole`, `location`, `openingInstruction`, weighted `contextVariants`, and `vocabularyFocus` arrays. Code (`compileScenarioPrompt`, `pickContextVariant`, `pickNpcName`) does the picking, then injects everything into the prompt as fixed values.

Grok categories invert this: the model does the picking, the code provides only category-level guidance. The existing `compileScenarioPrompt` is **not called** for Grok. The existing scenario catalog is **not consumed** by Grok. They share zero code.

This is intentional. The existing system optimizes for predictability (same situation gives same opening). Grok optimizes for variety (different situation each session). Different tools for different jobs. Both can live side-by-side.

### 4.3 Persistence semantics for Grok categories

Even though the model picks the situation, we still record what category the user chose for history-panel display. Mapping:

| Field | Grok scenario session | Grok free chat session |
|---|---|---|
| `mode` | `'freeform'` (existing value) | `'freeform'` (existing value) |
| `provider` | `'grok'` | `'grok'` |
| `grok_category` | e.g. `'travel'` | `null` |
| `grok_voice` | e.g. `'eve'` | e.g. `'eve'` |
| `voice_name` | e.g. `'eve'` (for display fallback) | e.g. `'eve'` |
| `scenario_id` | `null` (Grok doesn't use the catalog) | `null` |
| `npc_name` | `null` (model picks its own at runtime; not captured) | `null` |
| `context_variant` | `null` | `null` |

We do not capture the model's chosen NPC name or specific situation in V1. If we want that later, we can stream the first `response.text.delta` into a "session label" field — out of scope for V1.

---

## 5. Picker flow

```
State 1: Language grid (UNCHANGED — uses existing Speak.tsx code)
   │
   ▼
State 2: Provider toggle — [Voxtral | Gemini | Grok]
         └ Grok disabled with tooltip when language is fil; flagged
            with "best-effort" caveat for nl
   │
   ├── voxtral → existing CharacterGrid (UNCHANGED code path)
   ├── gemini  → existing GeminiModeVoicePicker (UNCHANGED code path)
   └── grok    → new GrokPicker (NEW, parallel to existing pickers)
                 ├ Voice: 5-voice flat list with sample playback
                 ├ Mode: [Free Chat] or category tile grid
                 └ Start
   │
   ▼
State 3: Conversation
   Same chat-bubble layout. For Voxtral/Gemini → existing render path.
   For Grok → new render path driven by useGrokRealtime state.
```

The provider toggle is the only place the existing Speak.tsx is modified beyond a top-level "if Grok, render Grok subsystem" branch.

---

## 6. Module architecture

### 6.1 New backend file: `frontend/api/grok-token.ts`

The first authenticated serverless endpoint in the codebase. Pattern is invented here and documented for future reuse.

```ts
// POST /api/grok-token
// Headers: Authorization: Bearer <supabase_jwt>
// Body: {} (no parameters needed for V1)
// Returns: { client_secret: string, expires_at: number }
```

Implementation:

1. Read `Authorization: Bearer <jwt>` header. 401 if missing.
2. Validate JWT against Supabase: `createClient(SUPABASE_URL, SUPABASE_ANON_KEY).auth.getUser(jwt)`. 401 if invalid.
3. Call `POST https://api.x.ai/v1/realtime/client_secrets` with `Authorization: Bearer ${XAI_API_KEY}` and body `{"expires_after": {"seconds": 600}}`. 502 if xAI returns error.
4. Return the xAI response body verbatim to the browser.

10-minute token TTL gives plenty of headroom for connection setup and reconnection during a 5-minute conversation.

`fetchWithTimeout` is duplicated locally (matches the duplication-not-lifting principle for the iOS primer — same reason).

### 6.2 New frontend file: `frontend/src/hooks/useGrokRealtime.ts`

A standalone hook providing a Speak-compatible API surface so `Speak.tsx` can branch at the top level and the rest of the conversation render code (chat bubbles, mic button) reuses the same component shapes.

```ts
export interface UseGrokRealtimeReturn {
  // Mirror useVoiceTutor's surface where possible
  status: 'idle' | 'connecting' | 'listening' | 'speaking' | 'error'
  messages: GrokMessage[]
  error: string | null

  // Picker state
  language: string | null
  voice: GrokVoice | null
  category: GrokCategory | null  // null = free chat or not selected
  level: Level

  // Lifecycle
  startSession: (params: StartSessionParams) => Promise<void>
  endSession: () => Promise<void>

  // Mic control — toggle-to-talk model matching existing Voxtral/Gemini UX
  startListening: () => void
  stopListening: () => void

  // Connection state
  isConnected: boolean
}

export type GrokVoice = 'eve' | 'ara' | 'rex' | 'sal' | 'leo'
export type GrokCategory =
  | 'travel' | 'business' | 'romance' | 'philosophy' | 'daily_life'
  | 'food' | 'arts' | 'news'
// Free chat = category === null
```

Internal responsibilities:

- iOS audio unlock — own `primeAudioForIOS` copy, own `audioContextRef`, own `silentPrimerRef`. Triggered on Start button click.
- Token fetch — call `/api/grok-token` with current Supabase session JWT.
- WebSocket lifecycle — open `wss://api.x.ai/v1/realtime` with `xai-client-secret.${token}` subprotocol. Send `session.update` with config built from `prompts/grok.ts` (see 6.3). Send `response.create` to trigger greeting. Stream `response.text.delta` into the `messages` array. Stream `response.output_audio.delta` into the audio queue.
- Mic capture — `getUserMedia({ audio: true })`. AudioWorklet downsamples to 24 kHz mono PCM16 LE. Streamed as `input_audio_buffer.append` events. (server_vad handles end-of-utterance — no manual commit needed.)
- Inbound audio playback — base64 PCM16 24 kHz LE → AudioBufferSourceNode queue scheduled against `AudioContext.currentTime` per E5 best-practice for iOS.
- Barge-in — on `input_audio_buffer.speech_started`: stop active source nodes, drain the queue.
- Persistence — on first model response: insert row into `speak_conversations` with `provider='grok'`, `grok_voice`, `grok_category`. On disconnect/unmount: update with `ended_at`.
- Reconnection — token-expiry handling: refetch token and reconnect transparently (within session TTL).

The hook does not live alongside `useVoiceTutor` in any abstract base or shared interface. It happens to mirror the exposed surface so the consuming component is simple, but no shared type.

### 6.3 Modified backend file: `frontend/api/prompts/grok.ts`

Replaces the throwing stub. New shape: builds the **session config payload** the browser sends via `session.update`. **Not called by `voice-chat.ts`** — called by `useGrokRealtime` on the frontend (because the system prompt content needs to ship inside the WebSocket session config, which originates from the browser).

This means `grok.ts` lives at `frontend/src/lib/grokSessionConfig.ts` instead of `frontend/api/prompts/grok.ts`. **The `api/prompts/grok.ts` stub is removed entirely.**

```ts
// frontend/src/lib/grokSessionConfig.ts

export type GrokVoice = 'eve' | 'ara' | 'rex' | 'sal' | 'leo'
export type GrokCategory =
  | 'travel' | 'business' | 'romance' | 'philosophy' | 'daily_life'
  | 'food' | 'arts' | 'news'

export interface BuildGrokSessionParams {
  language: string                    // e.g. 'en', 'de', 'fr', 'it', 'es', 'pt', 'nl', 'ko'
  level: 'L0' | 'L1' | 'L2' | 'L3'
  native_language: string             // display name, e.g. "German"
  voice: GrokVoice
  category: GrokCategory | null       // null = free chat
}

export interface GrokSessionConfig {
  type: 'session.update'
  session: {
    voice: GrokVoice
    instructions: string
    turn_detection: { type: 'server_vad' }
    tools: Array<{ type: 'web_search' }>
    audio: {
      input:  { format: { type: 'audio/pcm'; rate: 24000 } }
      output: { format: { type: 'audio/pcm'; rate: 24000 } }
    }
  }
}

export function buildGrokSessionConfig(p: BuildGrokSessionParams): GrokSessionConfig
```

`instructions` composition order:

1. Level instructions — duplicated from `_shared/pedagogy.ts#getLevelInstructions(targetLang, nativeLang, level)`. **Not imported.** The pedagogy text is copied into a frontend-side `grokPedagogy.ts` constant so the standalone invariant holds even at the prompt-building layer. (If the level instructions text changes in `_shared/pedagogy.ts`, Grok's copy can be updated separately. The risk of drift is acceptable for the isolation guarantee.)
2. Category prompt or free-chat prompt — see 6.4.
3. Grok-specific tail:
   - "Start by greeting the user naturally in {target_language} and entering the situation immediately. Do not announce what scenario you have chosen."
   - "Keep responses conversational and short enough to fit in a spoken turn — typically 1 to 3 sentences."
   - For free chat with web search: "If the user asks about current events, prices, or anything that requires up-to-date information, use the web_search tool."

### 6.4 New frontend file: `frontend/src/data/grokCategories.ts`

```ts
export interface GrokCategoryDef {
  id: GrokCategory
  displayKey: string          // i18n key, e.g. 'speak.grok.category.travel'
  emoji: string
  systemPrompt: string        // the category-level meta-prompt
}

export const GROK_CATEGORIES: GrokCategoryDef[]
```

9 entries. Each `systemPrompt` follows the Travel example shown in section 4.1: introduces the category, gives ~10 example situations, instructs the model to pick one fresh per session and pick its own NPC name appropriate to target-language culture.

### 6.5 New frontend file: `frontend/src/data/grokVoices.ts`

```ts
export interface GrokVoiceDef {
  id: GrokVoice
  displayName: string         // 'Eve', 'Ara', 'Rex', 'Sal', 'Leo'
  tone: string                // 'Energetic', 'Warm', 'Confident', 'Smooth', 'Authoritative'
  description: string         // from xAI docs
}

export const GROK_VOICES: GrokVoiceDef[]
```

Voice samples: V1 ships **without** voice samples. Reason: the existing `voice-sample.ts` infrastructure is Gemini-specific (mode × voice × accent cache key). A Grok sample endpoint would be either a new caching layer or piggybacking on the unary TTS endpoint at $4.20/M chars. Defer to V2 of Grok — for V1 the user picks blind, hits Start, hears the greeting. Acceptable for 5 voices.

### 6.6 New frontend file: `frontend/src/components/speak/GrokPicker.tsx`

Renders inside State 2 when `provider === 'grok'`. Layout:

- Voice section: 5 large tiles. Selected state matches existing tile patterns.
- Mode section: "Free Chat" tile + 9 category tiles.
- Start button — disabled until both voice and mode are selected.

Visual style matches existing pickers (cyan accent for Gemini parallel, but Grok gets its own color — proposed: violet). Components use Tailwind classes already in the codebase.

### 6.7 Modified frontend file: `frontend/src/components/speak/ProviderToggle.tsx`

Smallest possible change to extend from binary to ternary:

- Add `'grok'` to the `SpeakProvider` union (in `VoiceTutorPicker.tsx` per V1 investigation A1).
- Add a third entry to the `OPTIONS` array.
- Add a `language` prop (currently absent — investigation D3 confirmed `Speak.tsx` has it in scope but doesn't pass it).
- Add per-language disable logic: if `language === 'fil'` and the option is `'grok'`, render the button as disabled with a tooltip ("Grok does not support Tagalog yet").
- Switch the `grid-cols-2` class to `grid-cols-3`.

### 6.8 Modified frontend file: `frontend/src/components/speak/VoiceTutorPicker.tsx`

Add a third dispatch arm: when `provider === 'grok'`, render `<GrokPicker>`. Voxtral and Gemini arms unchanged.

### 6.9 Modified frontend file: `frontend/src/pages/Speak.tsx`

Top-level branch. State 3 (conversation view) renders either the existing Voxtral/Gemini conversation tree (driven by `useVoiceTutor`) or the new Grok conversation tree (driven by `useGrokRealtime`). State 2 already routes through `VoiceTutorPicker` so that's covered. State 1 is unchanged.

Specifically:

- Add `provider` state at the page level (not inside the hook), so the choice survives the State 2 → State 3 transition independent of which hook is active.
- Conditionally instantiate either `useVoiceTutor` (when `provider !== 'grok'`) or `useGrokRealtime` (when `provider === 'grok'`). React rules don't allow conditional hook calls — both hooks are always called, but the inactive one is in idle state and consumes no resources.
- Pass the relevant hook's return value to a small adapter that exposes a unified shape to the conversation render code. (Or render two parallel conversation trees with `if (provider === 'grok') { ... } else { ... }`. Simpler. Slightly more JSX duplication. Recommended.)

### 6.10 Modified frontend file: `frontend/src/components/speak/SpeakHistoryPanel.tsx`

- Extend the `Conversation` interface union: `provider?: 'voxtral' | 'gemini' | 'grok' | null`.
- Add Grok-specific display branch in the list and detail render paths. Display label format: `${categoryName ?? 'Free Chat'} · ${grok_voice}`.
- Add a third badge color (proposed violet for Grok, parallel to the existing cyan Gemini badge).
- No structural shape change — Grok-specific fields (`grok_voice`, `grok_category`) are added as optional fields to the existing flat interface.

### 6.11 Supabase migration

```sql
-- frontend/supabase/migrations/20260423000000_grok_speak_columns.sql

alter table public.speak_conversations
  add column if not exists grok_voice text;

alter table public.speak_conversations
  add column if not exists grok_category text;

alter table public.speak_conversations
  add constraint speak_conversations_grok_voice_check
  check (grok_voice is null or grok_voice in ('eve', 'ara', 'rex', 'sal', 'leo'));

alter table public.speak_conversations
  add constraint speak_conversations_grok_category_check
  check (grok_category is null or grok_category in (
    'travel', 'business', 'romance', 'philosophy', 'daily_life',
    'food', 'arts', 'news'
  ));
```

Both columns nullable. Backwards-compatible with all existing Voxtral and Gemini rows. Existing reads (which never select `grok_*` columns) are unaffected.

### 6.12 Environment variable

- `XAI_API_KEY` — server-side only. Consumed by `/api/grok-token`. Add to Vercel dashboard. Never exposed to the browser.

---

## 7. Data flow — Grok conversation

1. User completes State 1 (language) + State 2 (Grok provider, voice, category).
2. User clicks **Start**.
3. `useGrokRealtime.startSession` runs:
   1. `primeAudioForIOS()` (synchronously, inside the click handler — required for iOS).
   2. Fetch JWT from Supabase session.
   3. `POST /api/grok-token` with the JWT in `Authorization` header. Receive `client_secret`.
   4. `new WebSocket('wss://api.x.ai/v1/realtime', [`xai-client-secret.${client_secret}`])`.
   5. On `open`: send `session.update` with payload from `buildGrokSessionConfig`.
   6. Send `response.create` (no message content — model emits opening greeting).
   7. Initialize AudioWorklet on the AudioContext, wire mic stream into it.
4. Streaming: `response.text.delta` → AI bubble. `response.output_audio.delta` → playback queue. User mic → `input_audio_buffer.append`.
5. End-of-utterance handled server-side by VAD. Transcription arrives via `conversation.item.input_audio_transcription.completed` → user bubble.
6. Subsequent turns are automatic — no manual `response.create` needed.
7. **Barge-in:** `input_audio_buffer.speech_started` → stop all queued audio sources, drain queue, clear assistant bubble in progress.
8. On first assistant turn complete: insert `speak_conversations` row with grok_voice, grok_category, provider='grok', mode='freeform'.
9. On user clicks Back / unmounts: close WebSocket, update `ended_at`.

---

## 8. Risks acknowledged before implementation

1. **iOS Safari first-tap audio.** Will likely require debug iteration. Standalone hook structure means debugging is contained. Mitigation: build with debug logging in from the start (matches the pattern from `useVoiceTutor.ts:497-557` which logs primer success/failure).

2. **AudioWorklet browser support.** Modern Safari/Chrome/Firefox all support it. iOS 14.5+ supports it. No fallback path for very old browsers — if `AudioWorklet` is unavailable, Grok shows an "unsupported browser" error in State 2.

3. **Web search latency inside a voice turn.** xAI best practice (per docs section "Avoid Audio Overlap During Tool Calls") says to wait for current playback to finish before triggering continuation after a tool call. `useGrokRealtime` implements this — show a thinking indicator, wait for queue drain, then send the next `response.create`.

4. **Token expiry mid-session.** 10-minute TTL covers most sessions. For longer sessions, refetch and reconnect on `error` events with `code: 'token_expired'` (or equivalent — to be confirmed during implementation).

5. **Cost runaway.** No rate limiting in V1. Acceptable for closed test. Before public launch: per-user daily minute cap enforced server-side at the token endpoint (refuse to mint a token if user is over quota).

6. **Persistence-vs-realtime mismatch.** Realtime sessions don't have a clean "turn complete" signal the way request-response does. We write the `speak_conversations` row on first assistant response, then update `ended_at` on disconnect. If the browser tab dies without a clean disconnect, `ended_at` stays null. Acceptable for V1 — matches existing behavior for the other providers when the tab dies mid-conversation.

7. **Drift risk on duplicated pedagogy text.** Mitigation: a comment in `grokPedagogy.ts` referencing `_shared/pedagogy.ts:getLevelInstructions` and noting that any change to the canonical pedagogy should be considered for replication into the Grok copy. Reviewed manually — no automated sync.

---

## 9. What does NOT change

- `useVoiceTutor.ts` — zero lines.
- `voxtral.ts` — zero lines.
- `gemini.ts` — zero lines.
- `_shared/pedagogy.ts` — zero lines.
- `_shared/roleplay.ts` — zero lines.
- `_shared/generic.ts` — zero lines.
- `voice-chat.ts` — zero lines (the existing `provider === 'grok'` branches that throw via the stub become dead code; they can be removed in a separate cleanup ticket or left as no-ops since Grok no longer flows through this endpoint).
- `voice-sample.ts` — zero lines.
- Existing `roleplayScenarios.ts` and `compileScenarioPrompt` — zero lines.
- All existing migrations — zero changes.
- `CharacterGrid.tsx`, `GeminiModeVoicePicker.tsx`, `GeminiAccentPicker.tsx`, `VoiceSampleButton.tsx` — zero lines.

What does change (exhaustive):

| File | Change |
|---|---|
| `frontend/api/grok-token.ts` | NEW |
| `frontend/api/prompts/grok.ts` | DELETED (stub no longer needed) |
| `frontend/src/lib/grokSessionConfig.ts` | NEW |
| `frontend/src/lib/grokPedagogy.ts` | NEW (copy of pedagogy text) |
| `frontend/src/hooks/useGrokRealtime.ts` | NEW |
| `frontend/src/data/grokCategories.ts` | NEW |
| `frontend/src/data/grokVoices.ts` | NEW |
| `frontend/src/components/speak/GrokPicker.tsx` | NEW |
| `frontend/src/components/speak/ProviderToggle.tsx` | MODIFIED — extend to 3 options + language prop + disable logic |
| `frontend/src/components/speak/VoiceTutorPicker.tsx` | MODIFIED — add 'grok' to SpeakProvider union + dispatch arm |
| `frontend/src/components/speak/SpeakHistoryPanel.tsx` | MODIFIED — Grok display branch + badge |
| `frontend/src/pages/Speak.tsx` | MODIFIED — provider-aware top-level dispatch in State 3 |
| `frontend/supabase/migrations/20260423000000_grok_speak_columns.sql` | NEW |
| Vercel dashboard | NEW env var: `XAI_API_KEY` |
| `public/audioWorklets/grokPcmDownsampler.js` | NEW (AudioWorklet processor for mic downsampling to 24 kHz PCM16) |

---

## 10. Implementation phasing

The implementation prompt should sequence as follows. This is the order Codex will be instructed to build in.

**Phase 1: Backend foundations**
- `frontend/api/grok-token.ts`
- Vercel env var `XAI_API_KEY` (manual step Sir Robert performs after dispatch)
- Supabase migration `20260423000000_grok_speak_columns.sql` (manual apply after dispatch)

**Phase 2: Frontend data and config**
- `frontend/src/data/grokCategories.ts`
- `frontend/src/data/grokVoices.ts`
- `frontend/src/lib/grokSessionConfig.ts`
- `frontend/src/lib/grokPedagogy.ts`

**Phase 3: AudioWorklet**
- `public/audioWorklets/grokPcmDownsampler.js`

**Phase 4: Hook**
- `frontend/src/hooks/useGrokRealtime.ts`

**Phase 5: UI**
- `frontend/src/components/speak/GrokPicker.tsx`
- Modifications to `ProviderToggle.tsx`, `VoiceTutorPicker.tsx`
- Modifications to `Speak.tsx` (State 3 dispatch)
- Modifications to `SpeakHistoryPanel.tsx`

**Phase 6: Cleanup**
- Delete `frontend/api/prompts/grok.ts` stub.
- Comment-clean any dead `provider === 'grok'` branches in `voice-chat.ts` (or leave; both acceptable).

Each phase is committable independently. Sir Robert can preview after each phase if desired. Default: dispatch ships everything in one branch with one PR.

---

## 11. Sequencing after this doc

1. **Implementation prompt** — written next, separate file. Strict discipline pattern: pre-flight `git fetch`, explicit file enumeration matching the table in section 9, per-phase verification, completion report with hashes proving Voxtral and Gemini code paths unchanged.
2. **Adversarial review of the implementation prompt against live code by a different agent.** Before the implementation prompt is dispatched. The reviewing agent checks: does the prompt match what the codebase actually looks like? Are there any assumptions in the prompt the live code violates? This step is required, not optional.
3. **Implementation dispatch.**
4. **Adversarial review of the implementation against the prompt and the codebase.** Different agent again.
5. **Live Vercel test** — one Free Chat session and one scenario session per supported language (excluding `fil`). Confirm Voxtral and Gemini still function bit-for-bit identically.

---

*Companion files:*
- *`DESIGN_DOC_GROK_VOICE_AGENT.md` (V1 — superseded)*
- *`INVESTIGATION_PROMPT_GROK_REALTIME.md` (V1 investigation, complete)*
- *`INVESTIGATION_PROMPT_GROK_REALTIME_V2.md` (V2 investigation, complete)*
