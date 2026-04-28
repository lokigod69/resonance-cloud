# Investigation Report — Gemini TTS Dual-Provider Integration

**Mode:** Read-only investigation. No files modified.
**Date:** 2026-04-17
**Repo root:** `d:/CODING/ResonanceTEST/` (git-connected frontend at `orchestrator/frontend/`)
**Investigator:** Claude Opus 4.7 (1M), with codebase + live-doc sub-agents

---

## Up-front corrections to the prompt

Flagged because the prompt said "the codebase is the arbiter of truth" and several facts differ:

1. **TTS is TypeScript, not Python.** The Voice Tutor / Speak runtime path is a Vercel serverless function at [orchestrator/frontend/api/voice-chat.ts](orchestrator/frontend/api/voice-chat.ts), not a Python orchestrator service. A Python `tts.py` exists under [orchestrator/cloud_engines/bookend_engine/tts.py](orchestrator/cloud_engines/bookend_engine/tts.py) but it is ElevenLabs for the word-card / bookend video pipeline — a completely separate product surface from the Speak page. The implementation will live in TypeScript.
2. **Persona count is 18, confirmed.** The prompt said 18; one sub-agent miscounted to 19. Authoritative count from `grep "tier: 'persona'"` in [characterRegistry.ts](orchestrator/frontend/src/characterRegistry.ts) = **18 personas**. 10 style + 18 persona = 28, matching the prompt.
3. **Public figures (Trump, Putin, Elon, DiCaprio, Depp) are documented in `VOICE_TUTOR_CHARACTER_SYSTEM.md` but NOT implemented in the registry.** Registry stops at 28 characters. This was not part of the prompt's scope but is worth noting: if Sir Robert ever adds public figures, they would need voice-mapping work — and, under the current constraint, would presumably also be disabled in Gemini mode.
4. **Gemini model IDs the prompt guessed are subtly wrong.** Correct IDs per Google docs are `gemini-2.5-flash-preview-tts`, `gemini-2.5-pro-preview-tts`, and `gemini-3.1-flash-tts-preview`. See Section 4.1.
5. **Gemini output format: the prompt's "AI Studio returns MP3" is wrong.** Both AI Studio and the Gemini-native API surface return **raw PCM 16-bit mono 24 kHz** — no MP3 option, no WAV header. See Section 4.2, 4.9. This is a non-trivial correction because it changes the browser-playback story.
6. **Gemini TTS does NOT support streaming.** Google's docs state this explicitly. The separate Gemini Live API does stream PCM, but it's a different product. See Section 4.6.

---

## Section 1 — Current TTS call sites (backend)

### 1.1 — Voxtral call sites

**One runtime TTS call site for the Speak / Voice Tutor flow:**

- [orchestrator/frontend/api/voice-chat.ts:278-338](orchestrator/frontend/api/voice-chat.ts#L278-L338) — function `generateSpeech`, Mistral Voxtral branch at lines 285-319, ElevenLabs fallback branch at lines 320-337.
- Invoked from the `POST /api/voice-chat` handler at [orchestrator/frontend/api/voice-chat.ts](orchestrator/frontend/api/voice-chat.ts) (the single call: `generateSpeech(ttsText, language, mistralKey, voice_id, elevenlabs_voice_id)` at approximately line 674; exact line per sub-agent was not independently reverified but the function is called exactly once downstream of the POST handler).

**Related but not Voice-Tutor TTS (out of scope for this feature):**

- [orchestrator/cloud_engines/bookend_engine/tts.py](orchestrator/cloud_engines/bookend_engine/tts.py) — Python, calls `https://api.elevenlabs.io/v1/text-to-speech/{voice_id}` for word-card pronunciation audio in the video pipeline. Uses `ELEVENLABS_API_KEY`. **Do not touch this file for the Gemini feature** — it is a different product surface and will confuse the diff if included.
- [orchestrator/frontend/scripts/generate-voices.ts](orchestrator/frontend/scripts/generate-voices.ts) — an offline batch script that downloads ElevenLabs source voices and uploads clips to Mistral's Voices API for cloning. Ran once to produce the 87 cloned voices. Not part of the runtime TTS path.

### 1.2 — Call-site details (voice-chat.ts)

**Signature** ([voice-chat.ts:278-284](orchestrator/frontend/api/voice-chat.ts#L278-L284)):

```typescript
async function generateSpeech(
  text: string,
  language: string,
  mistralKey: string,
  voiceId?: string,
  elevenLabsVoiceId?: string,
): Promise<Buffer>
```

- **Inputs:** `text` (sanitized TTS string), `language` (BCP-47-ish 2-letter code), `mistralKey` (from `process.env.MISTRAL_API_KEY`, passed in by caller), optional Voxtral `voiceId` resolved per-character per-language, optional ElevenLabs fallback voice id.
- **Voxtral endpoint:** `POST https://api.mistral.ai/v1/audio/speech` with body `{ model: 'voxtral-mini-tts-2603', input: text, response_format: 'mp3', voice_id?: string, voice?: 'en_paul_cheerful' | 'en_paul_confident' }`.
- **Voxtral supported languages** ([voice-chat.ts:79](orchestrator/frontend/api/voice-chat.ts#L79)): `en, de, fr, it, es, pt, nl, hi, ar` (9 languages). Everything else routes to ElevenLabs.
- **Return type:** `Buffer` containing MP3 bytes. Upstream POST handler base64-encodes this for the JSON response to the client.
- **Sync/async/streaming:** Async, non-streaming — full-utterance response.
- **Retry:** 2 attempts with 500ms gap ([voice-chat.ts:299-312](orchestrator/frontend/api/voice-chat.ts#L299-L312)).
- **Timeout:** 20 seconds per attempt ([voice-chat.ts:307](orchestrator/frontend/api/voice-chat.ts#L307)).
- **Error handling:** Throws `Error('Mistral TTS failed: …')` on both-attempts-failed. Upstream POST handler catches and returns a text-only response with no audio so the client stays functional.

### 1.3 — Abstraction layer

**None.** Voxtral is called inline from `generateSpeech`, which is itself an ad-hoc wrapper with an if/else split between Voxtral (Voxtral-supported languages) and ElevenLabs (fallback). There is no `TTSProvider` interface, no `providers/` directory, no strategy pattern. Adding Gemini therefore involves either:

- Option A — inline a third branch inside `generateSpeech` (`if (provider === 'gemini') { … }`), or
- Option B — refactor `generateSpeech` into a thin dispatcher over a `TTSProvider` interface with `VoxtralProvider`, `GeminiProvider`, `ElevenLabsProvider` implementations.

Option A is smaller and fits the current style of this file. Option B is cleaner long-term, especially because ElevenLabs is already a quasi-provider living in the same function. See Section 5.1 for the recommendation.

### 1.4 — Credentials

- **Voxtral:** `MISTRAL_API_KEY`. Present in [orchestrator/.env:18](orchestrator/.env#L18). Read by the `/api/voice-chat` POST handler from `process.env.MISTRAL_API_KEY` and passed to `generateSpeech`.
- **ElevenLabs fallback:** `ELEVENLABS_API_KEY`, read inside `generateSpeech` at [voice-chat.ts:321](orchestrator/frontend/api/voice-chat.ts#L321).
- **Google AI:** `GOOGLE_AI_API_KEY` **already exists** at [orchestrator/.env.cloud.example:15](orchestrator/.env.cloud.example#L15). It is currently used by the image engine (Imagen / Nano-Banana), not TTS. The file comment says *"NOTE: This is GOOGLE_AI_API_KEY, NOT GOOGLE_API_KEY."*
  - **Decision needed (Sir Robert):** reuse `GOOGLE_AI_API_KEY` for Gemini TTS (single Google key across products) or introduce a dedicated `GEMINI_TTS_API_KEY` (cleaner separation, easier rate-limit isolation). Recommendation: reuse the existing one unless rate-limit contention with image generation becomes visible.

Deployment env-var home: whichever Vercel/Railway environment hosts `orchestrator/frontend/api/*`. Since the runtime is a Vercel serverless function, the key must be set in the Vercel project env (or the Railway deployment if the frontend is hosted via Railway).

---

## Section 2 — Character and voice-mapping storage

### 2.1 — Where the character list lives

**Client-side TypeScript constant, NOT a database table:** [orchestrator/frontend/src/characterRegistry.ts](orchestrator/frontend/src/characterRegistry.ts). ~584 lines. Exported as `CHARACTER_REGISTRY: TutorCharacter[]`. Embedded in the frontend bundle; no fetch, no REST endpoint.

A Supabase `voices` table exists ([orchestrator/frontend/supabase/migrations/20260329200000_voices_table.sql](orchestrator/frontend/supabase/migrations/20260329200000_voices_table.sql)) but it is a catalog of **individual cloned voices**, not of characters. The character → voice mapping is entirely client-side.

### 2.2 — Character schema

```typescript
interface TutorCharacter {
  id: string;                       // slug, e.g. 'cleo', 'marcus_aurelius'
  name: string;                     // display name
  subtitle: string;                 // two-word descriptor, e.g. 'Stoic Emperor'
  tier: 'style' | 'persona' | 'public';
  gender: 'male' | 'female';
  identity: string;                 // full persona text; empty string for style tutors
  directive: string;                // behavioral / speaking-style anchor
  avatarUrl: string;                // image path; empty for style tutors
  voices: Record<string, string>;   // { [langCode]: voxtralVoiceId }
}
```

**Field notes:**
- No `provider` field exists. Migration required for the Gemini feature — see 2.5.
- `voices` is a per-language map of Voxtral voice UUIDs. Style tutors have complete EN/DE/FR/IT/ES coverage; personas do too.
- No style/personality metadata specific to TTS beyond `directive` (which is a system-prompt behavior shaper, not a TTS knob).

### 2.3 — The 10 Style Tutors (authoritative list)

From [characterRegistry.ts](orchestrator/frontend/src/characterRegistry.ts) (lines approximate per sub-agent read):

| # | id | name | gender | Voxtral EN voice id |
|---|---|---|---|---|
| 1 | `cleo` | Cleo | F | `80b94be2-89d6-402c-986d-bf5c49796a42` |
| 2 | `jaxon` | Jaxon | M | `44fbbf55-16b9-4fee-9b3f-5f062f3d2047` |
| 3 | `nova` | Nova | F | `8aa47c25-0dca-46cc-8713-ca5178f261ed` |
| 4 | `orion` | Orion | M | `daec1b31-288a-45ba-a2c0-df0619f562a0` |
| 5 | `arthur` | Arthur | M | `8127e716-0c58-4065-abcf-7b0b912fd400` |
| 6 | `dante` | Dante | M | `9f63c271-6025-40a8-9e14-e2b8809625fb` |
| 7 | `elias` | Elias | M | `3f44e679-8b82-47f6-b95a-2ad352e4718e` |
| 8 | `kael` | Kael | M | `26596326-2a67-4ba0-991a-c5f56197bea7` |
| 9 | `briggs` | Briggs | M | `3f44e679-8b82-47f6-b95a-2ad352e4718e` |
| 10 | `zoe` | Zoe | F | `8aa47c25-0dca-46cc-8713-ca5178f261ed` |

**Oddity flagged:** Briggs and Elias share the same Voxtral EN voice id; Zoe and Nova share another. That may be intentional (similar tutor personalities, pooled voices) or a copy-paste artefact. Worth Sir Robert's attention when assigning Gemini voices — it suggests he may want to un-duplicate by assigning distinct Gemini voices per tutor.

DE/FR/IT/ES voice ids also exist per tutor but were not enumerated here — can be extracted when writing the implementation prompt.

### 2.4 — The 18 Personas (authoritative list)

Verified count = 18. Registry ids (in definition order, approximate line numbers):

1. `marcus_aurelius` — Marcus Aurelius, Stoic Emperor (M)
2. `nietzsche` — Nietzsche, The Hammer (M)
3. `jesus` — Jesus, The Teacher (M)
4. `buddha` — Buddha, The Awakened (M)
5. `socrates` — Socrates, The Gadfly (M)
6. `aristotle` — Aristotle, The Systematizer (M)
7. `oscar_wilde` — Oscar Wilde, The Aesthete (M)
8. `kafka` — Franz Kafka, The Dreamer (M)
9. `leonardo_da_vinci` — Da Vinci, Universal Genius (M)
10. `tesla` — Tesla, The Wizard (M)
11. `napoleon` — Napoleon, The Emperor (M)
12. `cleopatra` — Cleopatra, Last Pharaoh (F)
13. `dostoyevsky` — Dostoyevsky, The Russian Soul (M)
14. `loki` — Loki, The Trickster (M)
15. `zeus` — Zeus, King of Gods (M)
16. `aphrodite` — Aphrodite, Goddess of Love (F)
17. `shiva` — Shiva, The Destroyer (M)
18. `kierkegaard` — Kierkegaard, The Existentialist (M)

These are the ids the UI must disable when `provider === 'gemini'`.

### 2.5 — Provider field — migration path

**No `provider` field exists anywhere today.** The cleanest path:

- Add `provider: 'voxtral' | 'gemini'` **to the `TutorCharacter` TypeScript type** in [characterRegistry.ts](orchestrator/frontend/src/characterRegistry.ts). Default is implicit via the UI toggle (see 3.3) — characters themselves don't need a `provider` field if the toggle is global. They do need a `geminiVoice` field if each style tutor gets a pre-assigned Gemini voice.
- Add `geminiVoice?: Record<string, string>` (per-language) or simpler `geminiVoice?: string` (single voice regardless of language — Gemini auto-detects language per 4.4).
- Personas do **not** get a `geminiVoice` field — that's how the UI knows to disable them in Gemini mode (`character.geminiVoice === undefined`).

If the toggle is per-character instead of global, `provider` becomes per-character state in the user's profile or localStorage, not a registry field. That is a decision for Sir Robert (see Section 6).

No Supabase migration required for the character schema specifically, since characters are client-side. A very small optional addition: `speak_conversations.provider TEXT DEFAULT 'voxtral'` in a new migration under [orchestrator/frontend/supabase/migrations/](orchestrator/frontend/supabase/migrations/), so conversation history can be filtered by provider later. Not strictly necessary for MVP.

### 2.6 — Frontend fetch path

**Static import — no fetch.** `CHARACTER_REGISTRY` is imported directly in:

- [orchestrator/frontend/src/components/speak/CharacterGrid.tsx](orchestrator/frontend/src/components/speak/CharacterGrid.tsx) (picker UI)
- [orchestrator/frontend/src/hooks/useVoiceTutor.ts](orchestrator/frontend/src/hooks/useVoiceTutor.ts) (voice resolution)
- Plus indirect use via `Speak.tsx`.

This is good for this feature: the disable-personas-under-Gemini filter becomes a pure client-side `.filter()` call with no backend coupling.

---

## Section 3 — Speak page UI surface

### 3.1 — Character picker

Rendered in [orchestrator/frontend/src/components/speak/CharacterGrid.tsx](orchestrator/frontend/src/components/speak/CharacterGrid.tsx) (approx lines 33-78 per sub-agent). Two-section grid: "Style Tutors" row then "Characters" row (personas + public figures lumped together). 5 cols desktop, 3 cols mobile.

### 3.2 — Selection state

Stored via React hook state in [orchestrator/frontend/src/hooks/useVoiceTutor.ts:174](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L174) approximately:

```typescript
const [character, setCharacter] = useState<TutorCharacter | null>(null)
const characterRef = useRef<TutorCharacter | null>(null)
```

**Persisted** to Supabase `speak_conversations.character_id` on conversation start ([useVoiceTutor.ts:306-307](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L306-L307) approximately). No localStorage persistence for the selection.

### 3.3 — Provider toggle

**Does not exist.** Voxtral is hardcoded through the Voxtral/ElevenLabs split in [voice-chat.ts:285](orchestrator/frontend/api/voice-chat.ts#L285).

**Natural homes** (in decreasing order of fit):

1. **Speak page header** (next to the language selector and conversation-level indicators). Small segmented control: [Voxtral | Gemini]. Keeps provider choice visible during a session.
2. **Above the CharacterGrid** on the character-selection screen. Toggling would immediately re-filter the grid.
3. **Global settings page** (if Sir Robert wants the provider to be a per-account preference, not a per-session one).

Recommendation: option 2 (above the grid) is the most discoverable because it visibly changes the grid when toggled — users understand the constraint by seeing personas disappear or grey out.

### 3.4 — Existing filtering

[CharacterGrid.tsx](orchestrator/frontend/src/components/speak/CharacterGrid.tsx) splits the registry by `tier`:

```typescript
const styleTutors = CHARACTER_REGISTRY.filter(c => c.tier === 'style')
const personaCharacters = CHARACTER_REGISTRY.filter(c => c.tier === 'persona' || c.tier === 'public')
```

No language-based filtering (the registry assumes all characters speak all 5 target languages). **The Gemini filter is a straightforward add here** — something like:

```typescript
const available = provider === 'gemini' ? styleTutors : [...styleTutors, ...personaCharacters];
```

Or, keep both sections rendered and disable (`opacity-40 pointer-events-none`) the persona cards when Gemini is active — that's more informative UX because users see what they'd get by switching.

---

## Section 4 — Gemini TTS API verification (live docs)

All findings below are from live fetches of Google's public documentation. Sources cited inline; full URL list at end of section.

### 4.1 — Available model strings

Three Gemini TTS models, **all Preview, no GA**:

| Model ID | Status | Docs description |
|---|---|---|
| `gemini-3.1-flash-tts-preview` | Preview | *"Powerful, low-latency speech generation"* with *"natural outputs, steerable prompts, and new expressive audio tags."* Flagged as new. |
| `gemini-2.5-flash-preview-tts` | Preview | *"Fast and controllable text-to-speech for low-latency, cost-efficient applications."* |
| `gemini-2.5-pro-preview-tts` | Preview | *"High-fidelity speech synthesis optimized for quality in structured workflows like podcasts."* |

**Prompt drift correction:** the prompt guessed `gemini-2.5-flash-tts` and `gemini-2.5-pro-tts` — the actual IDs insert `-preview-` before `-tts`. Use the authoritative IDs above.

No deprecation notices observed. Docs page header: *"Gemini text-to-speech (TTS) is in Preview."*

Source: https://ai.google.dev/gemini-api/docs/speech-generation ; https://ai.google.dev/gemini-api/docs/models

### 4.2 — API surface comparison (AI Studio vs Vertex)

**Google AI Studio / Gemini API** — `generativelanguage.googleapis.com`, `x-goog-api-key` header. **Fully documented** for all three TTS models. Single-key auth. This is where all public TTS code samples live.

**Vertex AI** — real surface, but **the Gemini-native TTS story on Vertex is thin**:
- https://docs.cloud.google.com/vertex-ai/generative-ai/docs/speech/text-to-speech describes Vertex AI Studio as a UI wrapper over the classic Cloud Text-to-Speech product, not a `generateContent` path for `gemini-2.5-flash-preview-tts`.
- Per-model Vertex pages for these TTS IDs returned 404.
- Vertex public pricing page does not list these TTS models as line items.
- **UNCERTAIN — needs follow-up:** whether Vertex exposes Gemini-native TTS via a documented API surface today, or only via the Studio UI.

**Tradeoffs as documented:**

| | AI Studio (Gemini API) | Vertex AI |
|---|---|---|
| Auth | Single `x-goog-api-key` header | GCP project + IAM service account + OAuth2 bearer |
| TTS rate limits | *"Rate limits depend on a variety of factors … can be viewed in Google AI Studio"* — TTS-specific RPM/TPM numbers **not published publicly**; visible only via the authenticated AI Studio dashboard | Not separately published for Gemini-native TTS |
| Output format | **Raw PCM 16-bit mono 24 kHz**, no MP3 option | Same underlying models; Studio UI produces downloadable `.wav`; API path unverified |
| Streaming | *"TTS does not support streaming."* | Presumed same; unverified |
| Context window | *"A TTS session has a context window limit of 32k tokens."* | Not separately documented |
| Best for | Small teams, fast integration | Enterprise GCP tenants, IAM-governed workloads, VPC-SC |

**Recommendation for Resonance: use the AI Studio / Gemini API surface.** Reasoning:
- It's the only surface with a full public spec for Gemini-native TTS.
- Single-key auth aligns with the existing Voxtral and ElevenLabs patterns in [voice-chat.ts](orchestrator/frontend/api/voice-chat.ts).
- `GOOGLE_AI_API_KEY` already exists and already targets `generativelanguage.googleapis.com`.
- Vertex adds operational complexity (project, region, IAM, quota requests) with no documented capability advantage for this use case.
- If Sir Robert later needs VPC-SC or enterprise governance, migration to Vertex is a single-file refactor.

### 4.3 — Prebuilt voices

**30 voices**, each tagged with a one-word tonal descriptor. Full list verbatim from https://ai.google.dev/gemini-api/docs/speech-generation:

| Voice | Tone | Voice | Tone | Voice | Tone |
|---|---|---|---|---|---|
| Zephyr | Bright | Puck | Upbeat | Charon | Informative |
| Kore | Firm | Fenrir | Excitable | Leda | Youthful |
| Orus | Firm | Aoede | Breezy | Callirrhoe | Easy-going |
| Autonoe | Bright | Enceladus | Breathy | Iapetus | Clear |
| Umbriel | Easy-going | Algieba | Smooth | Despina | Smooth |
| Erinome | Clear | Algenib | Gravelly | Rasalgethi | Informative |
| Laomedeia | Upbeat | Achernar | Soft | Alnilam | Firm |
| Schedar | Even | Gacrux | Mature | Pulcherrima | Forward |
| Achird | Friendly | Zubenelgenubi | Casual | Vindemiatrix | Gentle |
| Sadachbia | Lively | Sadaltager | Knowledgeable | Sulafat | Warm |

**Metadata gap flagged:** Google does **not** publish per-voice gender labels or per-voice language availability. Language is auto-detected from the input text; the same voice is documented to work across all 68 supported languages. **UNCERTAIN — needs follow-up:** whether specific voices sound better/worse in specific target languages. Only way to answer: sample each on the 10 style tutors in EN/DE/FR/IT/ES.

### 4.4 — Language coverage

**68 languages supported total.** All 5 Resonance targets confirmed:

- **English (en)** ✓
- **German (de)** ✓
- **French (fr)** ✓
- **Italian (it)** ✓
- **Spanish (es)** ✓

**Additional languages useful to Resonance (not all covered by Voxtral):**

- Korean (ko) ✓
- Indonesian (id) ✓
- Cebuano / Bisaya (ceb) ✓
- Filipino / Tagalog (fil) ✓

Voxtral covers 9 languages (`en, de, fr, it, es, pt, nl, hi, ar` per [voice-chat.ts:79](orchestrator/frontend/api/voice-chat.ts#L79)); the remainder route to ElevenLabs. **Gemini's 68-language coverage is strictly larger than Voxtral's 9** — a potential long-term simplification (replace the ElevenLabs fallback path with Gemini), but out of scope for this feature.

Note: Gemini auto-detects language from the input text. You do not pass a language code in the TTS request. This has a minor implication for the implementation — the `language` parameter in `generateSpeech` becomes unused in the Gemini branch, though keeping it for logging is fine.

### 4.5 — Pricing (from https://ai.google.dev/pricing)

- **`gemini-2.5-flash-preview-tts`** — Input $0.50 / 1M text tokens; Output **$10.00 / 1M audio tokens**. 50% batch discount available.
- **`gemini-2.5-pro-preview-tts`** — Input $1.00 / 1M text tokens; Output **$20.00 / 1M audio tokens**. 50% batch discount.
- **`gemini-3.1-flash-tts-preview`** — Input $1.00 / 1M text tokens; Output **$20.00 / 1M audio tokens**. Also available on free tier at these same rates.

**All three models are billable during Preview — not free.**

Google states audio tokens are billed at **25 tokens per second of audio** (documented explicitly for 3.1 Flash; **UNCERTAIN** whether the 25-tok/sec rate applies identically to 2.5 models — docs don't re-state it).

Effective per-audio-hour cost (output only):
- 2.5 Flash Preview TTS: 25 tok/s × 3600 s = 90,000 output tokens/hour × $10/M ≈ **$0.90/hour**
- 3.1 Flash TTS Preview: same 90,000 × $20/M ≈ **$1.80/hour**

**Voxtral pricing for comparison: UNCERTAIN** — not verified during this investigation; Sir Robert can cross-check from the Mistral dashboard if cost parity matters.

### 4.6 — Latency

**No official numeric latency benchmarks published.** Only marketing adjectives: *"low-latency"*, *"fast"*. Flagged per the prompt's request: these are not numbers.

**Streaming is explicitly NOT supported for TTS models:** *"TTS does not support streaming."* — https://ai.google.dev/gemini-api/docs/speech-generation. You receive the entire PCM buffer in one response.

**Alternative streaming path that exists (but is a different product):** the **Gemini Live API** (https://ai.google.dev/gemini-api/docs/live) streams *"Audio (raw 16-bit PCM audio, 24kHz, little-endian)"* bidirectionally. It's designed for real-time conversational assistants, not one-shot TTS. Could theoretically be bent to Style-Tutor use, but that's a product-level decision, not a small feature. **UNCERTAIN — needs follow-up** whether Live API voice quality matches the TTS models for this use case.

**Implication:** plan for full-utterance request/response latency. For 1-3 sentence tutor responses (~5-15 seconds of audio), this is probably acceptable but untested.

### 4.7 — Style prompts and inline tags

Two documented approaches (combinable):

**(a) Natural-language directives in the prompt.** Prepend or embed instructions like `"Say cheerfully:"` or longer director's-notes-style passages. Doc example quoted verbatim:

> *"### DIRECTOR'S NOTES
> Style:
> \* The 'Vocal Smile': You must hear the grin in the audio. The soft palate is always raised to keep the tone bright, sunny, and explicitly inviting.
> \* Dynamics: High projection without shouting. Punchy consonants and elongated vowels on excitement words (e.g., 'Beauuutiful morning').
> Pace: Speaks at an energetic pace, keeping up with the fast music. Speaks with a 'bouncing' cadence. High-speed delivery with fluid transitions — no dead air, no gaps."*

**(b) Inline bracketed audio tags** mixed into the spoken text. Doc example:

> *"[excitedly] Yes, massive vibes in the studio! You are locked in and it is absolutely popping off in London right now. If you're stuck on the tube, or just sat there pretending to work... stop it. Seriously, I see you. [shouting] Turn this up!"*

**Published inline-tag set (50+):** `[admiration]`, `[agitation]`, `[anger]`, `[annoyance]`, `[anticipation]`, `[anxiety]`, `[appreciation]`, `[approval]`, `[astonishment]`, `[awe]`, `[boredom]`, `[caution]`, `[compassion]`, `[confidence]`, `[confusion]`, `[contempt]`, `[curiosity]`, `[determination]`, `[disappointment]`, `[disapproval]`, `[disgust]`, `[doubt]`, `[eagerness]`, `[embarrassment]`, `[empathy]`, `[encouraging]`, `[enjoyment]`, `[enthusiasm]`, `[excitement]`, `[fear]`, `[frustration]`, `[gratitude]`, `[happy]`, `[hope]`, `[horror]`, `[interest]`, `[joy]`, `[laughs]`, `[love]`, `[negative]`, `[nervousness]`, `[neutral]`, `[optimism]`, `[pain]`, `[positive]`, `[sadness]`, `[sarcasm]`, `[satisfaction]`, `[surprise]`, `[sympathy]`. Plus stage-direction tags like `[whispers]`, `[shouting]`, `[sighs]`.

**Model-parity caveat:** expressive audio tags are highlighted as a new feature of `gemini-3.1-flash-tts-preview`. **UNCERTAIN** whether 2.5 Flash/Pro TTS honors the same tag set equivalently. If style fidelity matters for the 10 Style Tutors, 3.1 Flash TTS Preview is the safer default.

### 4.8 — Multi-speaker

Supported, **max 2 speakers per session**. Configure via `MultiSpeakerVoiceConfig` with one `SpeakerVoiceConfig` per speaker. Each speaker binds a name (matched against the prompt text) to one prebuilt voice. Not needed for Style Tutors but available.

### 4.9 — Output post-processing

Gemini TTS returns **raw PCM 16-bit mono 24 kHz** — no headers, no container. Browsers cannot play raw PCM via `<audio>`. The server must wrap it.

**Minimal wrap — Python stdlib (quoted from docs):**

```python
import wave

def wave_file(filename, pcm, channels=1, rate=24000, sample_width=2):
    with wave.open(filename, "wb") as wf:
        wf.setnchannels(channels)
        wf.setsampwidth(sample_width)
        wf.setframerate(rate)
        wf.writeframes(pcm)
```

**For Resonance (TypeScript/Node on Vercel):** no stdlib `wave` equivalent; two options:

1. **Hand-roll the 44-byte RIFF/WAVE header** in Node — trivial, zero dependencies, ~20 lines. This is the recommended path.
2. Use a small npm package like `wavefile` — extra dependency for functionality you can inline.
3. `ffmpeg` via `@ffmpeg/ffmpeg` (WASM) or system ffmpeg — heavyweight, only needed if you want MP3/Opus compression. Not worth it for short utterances.

**Size budget:** 16-bit mono 24 kHz PCM is 48 KB/sec → ~2.9 MB/minute of audio. For a Style Tutor's 1-3 sentence responses (~5-15 seconds), each clip is ~240-720 KB as WAV. Transport as base64 (like the Voxtral path does) yields ~320-960 KB JSON — acceptable.

**Client-side playback:** the existing audio-handling code in [useVoiceTutor.ts](orchestrator/frontend/src/hooks/useVoiceTutor.ts) (around line 126-147 per sub-agent) is already generic enough to play both MP3 and WAV via a `<audio>` element — confirmed by sub-agent read. The response already carries an `audio_format` field (line 671 per sub-agent). Implementation just sets `audio_format: 'wav'` in the Gemini branch.

### Section 4 summary of uncertainties

1. **Vertex AI parity** — Whether Vertex exposes Gemini-native TTS via a documented `generateContent` path, or only via the Studio UI. Recommendation bypasses this by using AI Studio.
2. **TTS rate limits** — No public RPM/TPM numbers. Only visible in the authenticated AI Studio dashboard. Risk on a test-user rollout is real; mitigate by planning server-side retry/backoff.
3. **Latency benchmarks** — No milliseconds published. Must measure on the first integration day.
4. **Per-voice gender/language mapping** — Not documented. Must sample.
5. **2.5-series token-to-second ratio** — Only documented for 3.1. 2.5 may differ.
6. **Tag support across models** — Expressive tags highlighted on 3.1; 2.5 parity unclear.
7. **Vertex TTS pricing** — Not listed on the public pricing page.
8. **Live API as streaming alternative** — Exists but unvetted for this use case.

**Sources cited:**
- https://ai.google.dev/gemini-api/docs/speech-generation
- https://ai.google.dev/gemini-api/docs/models
- https://ai.google.dev/gemini-api/docs/rate-limits
- https://ai.google.dev/gemini-api/docs/live
- https://ai.google.dev/pricing
- https://docs.cloud.google.com/vertex-ai/generative-ai/docs/speech/text-to-speech
- https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models
- https://cloud.google.com/vertex-ai/generative-ai/pricing

---

## Section 5 — Integration feasibility

### 5.1 — Refactor shape

**Recommendation: shallow Option A (if-branch inside `generateSpeech`) for MVP, with room to grow into Option B.**

Rationale:
- `generateSpeech` already has an if/else between Voxtral and ElevenLabs. Adding a third branch `if (provider === 'gemini') { … }` follows the established style of the file and lands in one small diff.
- A full `TTSProvider` interface is cleaner but introduces a class hierarchy into a file that doesn't have one, which expands the diff footprint. Do it in a follow-up PR once the feature ships and usage data exists.

Concrete MVP structure:

```typescript
async function generateSpeech(
  text: string,
  language: string,
  keys: { mistral: string; gemini?: string; elevenlabs?: string },
  voiceId?: string,
  elevenLabsVoiceId?: string,
  geminiVoiceName?: string,
  provider: 'voxtral' | 'gemini' = 'voxtral',
): Promise<{ audio: Buffer; format: 'mp3' | 'wav' }> {
  if (provider === 'gemini') { /* … return wav … */ }
  if (VOXTRAL_SUPPORTED.has(language)) { /* existing Voxtral path → mp3 */ }
  /* existing ElevenLabs path → mp3 */
}
```

Returning `{ audio, format }` instead of `Buffer` is a small but worthwhile change — it lets the POST handler stamp `audio_format` correctly without duplicating routing logic.

### 5.2 — Provider selection source

Three candidates; pick one:

- **Request payload** — client sends `provider` in the POST body. Simplest. Server has no state. Recommended.
- **Character metadata** — `provider` attached to the character object. Works if the constraint is "each character is intrinsically Voxtral or Gemini" — which for Style Tutors is not quite true (they exist in Voxtral today and will exist in both once Gemini is added).
- **User setting** — stored in Supabase user profile or localStorage. Fine for a global preference, but requires a migration.

**Recommendation:** request payload as the source of truth, with an optional localStorage preference on the client for "remember my choice" UX. Keeps the server stateless.

### 5.3 — Audio cache-keys

**Current caching:** no evidence of server-side audio caching in [voice-chat.ts](orchestrator/frontend/api/voice-chat.ts) — every POST generates fresh audio. Confirmed by sub-agent; no Redis/KV lookup, no S3/blob lookup. If Sir Robert adds caching later, the cache key **must include provider** to avoid serving a Voxtral MP3 when Gemini WAV is requested.

Client-side caching in [useVoiceTutor.ts](orchestrator/frontend/src/hooks/useVoiceTutor.ts): sub-agent didn't find evidence of caching beyond normal React state. Safe for now. Revisit if a "replay last response" feature gets added.

### 5.4 — Risks

**High-likelihood / high-impact:**
- **Audio format mismatch.** Voxtral returns MP3; Gemini returns PCM/WAV. The client audio-playback path must accept both. Sub-agent reports the current client code is already generic (`<audio src={base64DataUrl}>`), which works for both MP3 and WAV. **Verify this with a live playback test in PR review, not by reading the code — browser audio quirks are real.**
- **Response size increase.** WAV is ~3-4× larger than MP3 for the same audio. Base64'd in a JSON response, this means bigger responses. Acceptable for short utterances; measure before optimizing.
- **Rate-limit opacity.** Google doesn't publish TTS rate limits. A test-user cohort hitting Gemini simultaneously could 429. Add retry/backoff on the Gemini branch mirroring the Voxtral retry loop.
- **Preview model instability.** All three TTS models are Preview. Google can change behavior, pricing, or deprecate IDs with short notice. Budget for one mid-feature-life API churn event.

**Low-likelihood but flag:**
- **Voxtral speed/SSML features with no Gemini equivalent.** Current Voxtral call doesn't use speed control or SSML ([voice-chat.ts:287-291](orchestrator/frontend/api/voice-chat.ts#L287-L291)). No regression risk.
- **Sub-agent noted two style tutors share voice IDs** (Briggs/Elias, Zoe/Nova). This is latent in Voxtral today but becomes more visible if Gemini voices are distinct per-tutor — suddenly those pairs will sound more different under Gemini than under Voxtral. Worth Sir Robert's awareness.

### 5.5 — Explicitly out of scope (confirmed)

- **Voice cloning for Gemini** — not a Gemini capability. Skip.
- **Persona support under Gemini** — UI-enforced disable. Skip.
- **Migrating existing Voxtral characters to Gemini** — additive only. Skip.
- **Public figures** — not implemented in the registry anyway. Skip.
- **Swapping out the ElevenLabs fallback for Gemini** — tempting (Gemini covers ElevenLabs' language set and more), but a separate decision. Out of scope for this feature.

---

## Section 6 — Questions for Sir Robert

Decisions needed before the implementation prompt is written:

1. **Which Gemini model — `gemini-3.1-flash-tts-preview` or `gemini-2.5-flash-preview-tts`?** 3.1 has the richer expressive-tag set and is flagged "new"; 2.5 is half the per-hour cost. For 10 Style Tutors where personality is expressed through style prompts and tags, **3.1 Flash TTS Preview is the recommended default**, but it's Sir Robert's call.
2. **AI Studio vs Vertex?** Recommendation: AI Studio — simpler auth, fully documented, single key, matches existing Voxtral/ElevenLabs patterns. Confirm.
3. **Reuse `GOOGLE_AI_API_KEY` or introduce a separate key?** Recommendation: reuse unless the image-gen workload is expected to contend for rate limits. If you want rate-limit isolation, introduce `GEMINI_TTS_API_KEY`.
4. **Which Gemini voice maps to each of the 10 Style Tutors?** Candidate defaults (subjective, based on tone descriptors in 4.3):
   | Style Tutor | Gender | Suggested default Gemini voice | Tone rationale |
   |---|---|---|---|
   | Cleo | F | Aoede | Breezy, fits "The Bestie" |
   | Jaxon | M | Puck | Upbeat |
   | Nova | F | Leda | Youthful |
   | Orion | M | Charon | Informative |
   | Arthur | M | Orus | Firm |
   | Dante | M | Algenib | Gravelly |
   | Elias | M | Rasalgethi | Informative |
   | Kael | M | Enceladus | Breathy |
   | Briggs | M | Alnilam | Firm |
   | Zoe | F | Autonoe | Bright |
   Sample all 30 voices before committing; Google doesn't publish gender metadata, so every pick must be verified by ear.
5. **Provider toggle — global or per-character?** Recommendation: **global toggle** (one TTS provider per session, shown on the Speak page header). Simpler UX, enforces the "personas disabled under Gemini" constraint cleanly. Per-character provider is more flexible but adds schema churn and UI ambiguity.
6. **Editable style prompt, or pre-configured per-character?** Recommendation: **pre-configured per-character** for v1 — the 10 Style Tutors already have a `directive` field that serves this purpose; extend it with a `geminiStylePrompt` override if you want Gemini-specific direction. User-editable prompts are v2 territory.
7. **Which languages does Gemini support for Style Tutors?** Gemini supports all 68 languages; Voxtral supports 9. Are Style Tutors locked to the same 5 target languages (EN/DE/FR/IT/ES) as today, or does Gemini-mode unlock Korean / Cebuano / Tagalog / Indonesian as a pilot? Confirm scope.
8. **Return format — WAV or MP3?** Recommendation: **WAV** for MVP (20 lines of header-writing code, zero dependencies). MP3 requires ffmpeg and buys ~3× size reduction that isn't needed for short utterances.
9. **Should conversation history log the provider used?** Adding `provider TEXT` to `speak_conversations` is cheap now. Not logging it is fine for MVP but means you can't filter history by provider later. Recommend doing it.
10. **Rollout gating** — feature-flagged per user, or on for everyone from day one? Preview-model risk (Section 5.4) argues for a small-cohort rollout first.

---

## Summary

**Top 3 risks / unknowns that could derail the implementation prompt:**

1. **Gemini TTS is all-Preview, no GA.** Pricing, tag behavior, and model availability can shift mid-feature. Mitigate with a feature flag and a planned re-validation window.
2. **Gemini rate limits are undocumented publicly.** A test-user cohort could hit 429s with no forewarning. Must add retry/backoff + in-app degradation (fall back to Voxtral on Gemini failure if the character supports both? — Sir Robert's call).
3. **Audio format change from MP3 to WAV.** The existing client is *probably* format-agnostic, but this must be verified in a live browser, not just by reading React code. One real playback test in PR review.

**Recommended API surface:** Google AI Studio / Gemini API (`generativelanguage.googleapis.com`, `x-goog-api-key`). Reasoning in Section 4.2.

**Sir Robert decisions required before implementation starts** (summarized):
1. Model: 3.1 Flash TTS Preview vs 2.5 Flash Preview TTS
2. API surface: AI Studio vs Vertex (recommend AI Studio)
3. Env key: reuse `GOOGLE_AI_API_KEY` vs new `GEMINI_TTS_API_KEY`
4. Gemini voice assignment for each of 10 Style Tutors (sample required)
5. Toggle: global vs per-character
6. Style prompts: pre-configured vs editable
7. Language scope for Gemini: 5 EN/DE/FR/IT/ES or also open up CEB/FIL/ID/KO
8. Audio format: WAV (recommended) vs MP3
9. Log provider in `speak_conversations`?
10. Rollout: feature-flag cohort vs all-users

**Prompt-to-code corrections noted (for the implementer):**
- Model IDs: `gemini-2.5-flash-preview-tts` / `gemini-2.5-pro-preview-tts` / `gemini-3.1-flash-tts-preview` (not `gemini-2.5-flash-tts` etc.)
- Gemini output is PCM 16-bit 24 kHz mono → wrap to WAV, not MP3
- TTS does NOT support streaming (Live API is a different product)
- Voice Tutor TTS lives in TypeScript at [orchestrator/frontend/api/voice-chat.ts](orchestrator/frontend/api/voice-chat.ts), not in a Python orchestrator service
- Persona count is 18 (not 19); 0 public figures currently implemented
