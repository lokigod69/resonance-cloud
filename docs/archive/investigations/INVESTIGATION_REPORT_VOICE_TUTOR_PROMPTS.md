# INVESTIGATION REPORT: Voice Tutor System Prompt Architecture

> **Purpose:** Document exactly how the Speak feature's system prompts are built, what gets sent to the LLM per turn, and how conversation history is managed — to design character injection points.
> **Status:** Read-only investigation. No code was modified.
> **Date:** 2026-04-06

---

## Files Analyzed

| File | Lines | Purpose |
|------|-------|---------|
| `orchestrator/frontend/api/voice-chat.ts` | 451 | Serverless backend handler |
| `orchestrator/frontend/src/voiceRegistry.ts` | 138 | Voice registry (80+ voices) |
| `orchestrator/frontend/src/hooks/useVoiceTutor.ts` | 768 | React hook managing state and conversation flow |

---

## 1. System Prompt Construction

### Function Signature

**File:** `orchestrator/frontend/api/voice-chat.ts` lines 126–150

```typescript
function buildSystemPrompt(languageCode: string, level: string, nativeLang: string): string
```

**Parameters:**
- `languageCode` — target learning language code (e.g. `"de"`, `"fr"`)
- `level` — proficiency level: `"zero"` | `"beginner"` | `"intermediate"` | `"advanced"`
- `nativeLang` — student's native language code (from browser `navigator.language`)

---

### Full System Prompt Text (All Levels)

The prompt is assembled from three sections: a dynamic intro, a level-specific block, and fixed general rules.

#### Section 1 — Intro (lines 127–131, dynamic)

```
You are a friendly, patient language tutor helping someone practice {TARGET_LANGUAGE} ({NATIVE_NAME}).
The student's native language is {NATIVE_LANGUAGE_NAME}.
```

---

#### Section 2 — Level-Specific Instructions

##### LEVEL: `zero` — Complete Zero (lines 76–87)

```
LEVEL: COMPLETE ZERO — The student knows NO words in {TARGET_LANG}. This is their very first exposure.

LANGUAGE MIX: Speak about 70% in {NATIVE_LANG} and 30% in {TARGET_LANG}.
- Introduce ONE new word or very short phrase per turn.
- Always say the new word in {TARGET_LANG}, then immediately explain it in {NATIVE_LANG}.
- Ask the student to repeat the word back to you.
- Use simple, encouraging {NATIVE_LANG} to keep them comfortable.
- Build vocabulary slowly: greetings first, then thank you, yes, no, please, numbers 1-5.
- Celebrate every attempt, even if pronunciation is rough.
- If the student tries to say something in {TARGET_LANG}, praise them enthusiastically.
- Keep the mood light and fun — this should feel like a game, not a class.
```

---

##### LEVEL: `beginner` (lines 89–98)

```
LEVEL: BEGINNER — The student knows basic words (hello, thank you, numbers, simple phrases).

LANGUAGE MIX: Speak about 50% in {TARGET_LANG} and 50% in {NATIVE_LANG}.
- Use simple, short sentences in {TARGET_LANG} (3-6 words).
- After each {TARGET_LANG} sentence, give a brief {NATIVE_LANG} explanation if it contains new vocabulary.
- When the student speaks in {NATIVE_LANG}, gently suggest how to say it in {TARGET_LANG} and ask them to try.
- Introduce 2-3 new words per conversation, repeating them naturally.
- If the student doesn't understand after one try, switch fully to {NATIVE_LANG} to explain, then try {TARGET_LANG} again.
- Ask simple questions they can answer with words they know.
```

---

##### LEVEL: `intermediate` (lines 113–122, also the default)

```
LEVEL: INTERMEDIATE — The student can hold a simple conversation.

LANGUAGE MIX: Speak about 80% in {TARGET_LANG} and 20% in {NATIVE_LANG}.
- Speak primarily in {TARGET_LANG}. The student needs immersion.
- When the student seems confused or asks for help, briefly explain in {NATIVE_LANG}.
- Match the student's complexity. Simple words from them → simple responses. Complex grammar → you can be more advanced.
- If the student speaks in {NATIVE_LANG}, respond in {TARGET_LANG} but at a simpler level.
- If the student speaks {NATIVE_LANG} for 2+ turns in a row, gently ask if they'd like to try in {TARGET_LANG}, then give them a simple sentence to start with.
- Correct mistakes by naturally repeating what they said correctly, then continue.
```

---

##### LEVEL: `advanced` (lines 100–111)

```
LEVEL: ADVANCED — The student wants fluent practice and detailed corrections.

LANGUAGE MIX: Speak 95-100% in {TARGET_LANG}. Only use {NATIVE_LANG} if explicitly asked.
- Speak naturally as a native speaker would — normal speed, natural expressions, idioms.
- Use varied vocabulary and complex sentence structures.
- Correct grammar mistakes specifically: say what they said, then the correct version, then briefly explain why (all in {TARGET_LANG}).
- Challenge them with questions that require longer, more complex answers.
- Introduce idioms, slang, and cultural expressions naturally.
- If they make the same mistake twice, point it out directly but kindly.
- Discuss deeper topics: opinions, hypotheticals, cultural differences, current events.
- Push them to express nuance.
```

---

#### Section 3 — General Rules (lines 138–149, fixed for all levels)

```
GENERAL RULES:
- Keep responses SHORT: 1-3 sentences maximum. This is spoken conversation, not a lecture.
- Correct mistakes naturally: repeat what they said correctly, then continue. Do NOT lecture about grammar rules unless asked.
- NEVER use parenthetical stage directions like (slowly), (whispering), (laughing). Your text will be read aloud by a speech engine — it cannot act, only speak.
- NEVER use "..." for dramatic pauses or to slow down speech. The speech engine reads dots literally. Use short sentences with natural punctuation.
- Ask ONE question per response to keep the conversation flowing.
- Stay on conversational topics: daily life, hobbies, food, travel, culture, weather, family.
- If asked about unrelated topics (politics, math, coding, etc.), redirect warmly back to practicing {TARGET_LANG}.
- Never break character. You are a language tutor, not a general AI assistant.
- Use natural conversational fillers in {TARGET_LANG}: {LANGUAGE_FILLERS}

PERSONALITY: Warm, encouraging, patient. Curious about the student's life to generate natural topics. Like a friend who happens to be a native speaker.
```

---

### Language Config Table

**File:** `orchestrator/frontend/api/voice-chat.ts` lines 22–35

```typescript
const LANGUAGE_CONFIG = {
  en:  { name: 'English',            nativeName: 'English',          fillers: 'Well, So, You know, Actually' },
  de:  { name: 'German',             nativeName: 'Deutsch',          fillers: 'Also, Na ja, Weißt du, Eigentlich' },
  fr:  { name: 'French',             nativeName: 'Français',         fillers: 'Alors, Bon, Tu sais, En fait' },
  it:  { name: 'Italian',            nativeName: 'Italiano',         fillers: 'Allora, Dunque, Sai, In realtà' },
  es:  { name: 'Spanish',            nativeName: 'Español',          fillers: 'Bueno, Pues, Sabes, En realidad' },
  pt:  { name: 'Portuguese',         nativeName: 'Português',        fillers: 'Então, Bom, Sabes, Na verdade' },
  nl:  { name: 'Dutch',              nativeName: 'Nederlands',       fillers: 'Nou, Dus, Weet je, Eigenlijk' },
  hi:  { name: 'Hindi',              nativeName: 'हिन्दी',             fillers: 'तो, अच्छा, देखो, वैसे' },
  ar:  { name: 'Arabic',             nativeName: 'العربية',           fillers: 'يعني / طيب / فعلاً' },
  fil: { name: 'Filipino',           nativeName: 'Filipino',         fillers: 'Kaya, So, Alam mo, Talaga' },
  id:  { name: 'Indonesian',         nativeName: 'Bahasa Indonesia', fillers: 'Jadi, Nah, Tau nggak, Sebenarnya' },
  ko:  { name: 'Korean',             nativeName: '한국어',              fillers: '음, 그러니까, 있잖아, 사실은' },
}
```

---

## 2. Conversation History Management

### Sliding Window

**File:** `orchestrator/frontend/api/voice-chat.ts` line 332

```typescript
const cleanHistory = history.slice(-20).map(({ role, content }) => ({ role, content }))
```

- **Window size:** Last 20 messages
- **Format:** `{ role: 'user' | 'assistant', content: string }` — extra fields stripped
- **No summarization:** Full message text preserved; no compression of older turns

### Messages Array Sent to LLM Per Turn

```typescript
const messages = [
  { role: 'system', content: systemPrompt },   // Built by buildSystemPrompt()
  ...cleanHistory,                              // Last 20 messages
  { role: 'user', content: user_text },         // Current turn (or greeting instruction)
]
```

### Special Case: Initial Greeting (no audio)

When `audio_base64` is null (first load), a synthetic user message is injected instead:

**File:** `orchestrator/frontend/api/voice-chat.ts` lines 374–381

```
// zero level:
[SYSTEM: The student just joined to learn {TARGET_LANG}. They know ZERO words. Greet them warmly in {NATIVE_LANG}, tell them you're excited to teach them their first words in {TARGET_LANG}, and teach them how to say "hello" in {TARGET_LANG}. Keep it to 2-3 sentences.]

// beginner level:
[SYSTEM: The student just joined to practice {TARGET_LANG}. They know basic words. Greet them with a simple sentence in {TARGET_LANG}, then add a friendly line in {NATIVE_LANG}. Ask a simple question they can answer with basic vocabulary.]

// intermediate/advanced (default):
[SYSTEM: The student just joined to practice {TARGET_LANG}. Greet them warmly in {TARGET_LANG} and ask a simple opening question to start the conversation. Keep it to 1-2 sentences.]
```

---

## 3. LLM Configuration

**File:** `orchestrator/frontend/api/voice-chat.ts` lines 385–396

| Parameter | Value |
|-----------|-------|
| Provider | Groq |
| Endpoint | `https://api.groq.com/openai/v1/chat/completions` |
| Model | `llama-3.3-70b-versatile` |
| `max_tokens` | `200` |
| `temperature` | Not set (Groq default ~1.0) |
| Timeout | 20 seconds |
| Streaming | No — single JSON response |

```typescript
body: JSON.stringify({
  model: 'llama-3.3-70b-versatile',
  messages,
  max_tokens: 200,
})
```

---

## 4. Voice Registry

**File:** `orchestrator/frontend/src/voiceRegistry.ts`

### TypeScript Interface (lines 1–10)

```typescript
export interface TutorVoice {
  id: string               // Unique voice ID, e.g. "en_jon", "fr_claire"
  name: string             // Display name, e.g. "Jon", "Claire"
  language: string         // Language code, e.g. "en", "fr"
  gender: 'male' | 'female'
  mistralVoiceId: string   // Mistral Voxtral TTS voice UUID
  elevenLabsId?: string    // Optional: ElevenLabs voice ID (fallback languages only)
  sampleUrl: string        // Path to audio preview, e.g. "/voices/en_Jon_male.mp3"
}
```

**No personality or character field exists.** The registry is purely audio/identity metadata.

### Voice Count by Language

| Language | Total | Male | Female | TTS Provider |
|----------|-------|------|--------|-------------|
| English | 20 | 10 | 10 | Mistral Voxtral |
| Italian | 12 | 6 | 6 | Mistral Voxtral |
| French | 12 | 6 | 6 | Mistral Voxtral |
| German | 14 | 7 | 7 | Mistral Voxtral |
| Spanish | 12 | 6 | 6 | Mistral Voxtral |
| Portuguese | 10 | 5 | 5 | Mistral Voxtral |
| Dutch | 4 | 2 | 2 | Mistral Voxtral |
| Hindi | 6 | 3 | 3 | Mistral Voxtral |
| Arabic | 6 | 3 | 3 | Mistral Voxtral |
| Filipino | 1 | 0 | 1 | ElevenLabs |
| Indonesian | 1 | 0 | 1 | ElevenLabs |
| Korean | 1 | 0 | 1 | ElevenLabs |
| **Total** | **99** | | | |

### TTS Provider Routing

**File:** `orchestrator/frontend/api/voice-chat.ts` lines 49–72

```typescript
const VOXTRAL_SUPPORTED = new Set(['en', 'de', 'fr', 'it', 'es', 'pt', 'nl', 'hi', 'ar'])

const ELEVENLABS_FALLBACK: Record<string, string> = {
  fil: '4RLeKvASM0Zt73Htf5GF',  // Maria
  id:  '52LXmmR0nGnIcDs1TL3f',  // Anjani
  ko:  'zgDzx5jLLCqEp6Fl7Kl7',  // Hanna
}
```

---

## 5. Response Flow: LLM → TTS → Client

### Full Pipeline

```
Client (useVoiceTutor.ts)
  │
  ├─ [1] POST /api/voice-chat
  │       { audio_base64, language, history (last 20), level, native_language, voice_id }
  │
  └─> Server (voice-chat.ts)
        │
        ├─ [2] STT: POST https://api.groq.com/openai/v1/audio/transcriptions
        │       Model: whisper-large-v3
        │       Input: WebM or MP4 audio blob
        │       Output: { text: string }
        │
        ├─ [3] LLM: POST https://api.groq.com/openai/v1/chat/completions
        │       Model: llama-3.3-70b-versatile
        │       Input: [system prompt] + [last 20 messages] + [user_text]
        │       Output: ai_text (≤200 tokens)
        │
        ├─ [4] sanitizeForTTS(ai_text)
        │       Removes: (stage dirs), [brackets], ...ellipsis, *asterisks*
        │
        ├─ [5] TTS
        │   ├─ Voxtral (supported languages):
        │   │     POST https://api.mistral.ai/v1/audio/speech
        │   │     Model: voxtral-mini-tts-2603
        │   │     Output: { audio_data: base64_mp3 }
        │   │
        │   └─ ElevenLabs (fil, id, ko):
        │         POST https://api.elevenlabs.io/v1/text-to-speech/{voiceId}
        │         Model: eleven_multilingual_v2
        │         Output: ArrayBuffer (MP3)
        │
        └─ [6] Response to client:
                { user_text, ai_text, audio_base64, audio_format: 'mp3' }

Client (useVoiceTutor.ts)
  ├─ Append user_text + ai_text to messages state
  ├─ Persist to Supabase (speak_conversations, speak_messages) — async, non-blocking
  ├─ Reveal text after 1.5s delay
  └─ Play audio via AudioContext (preferred) or HTMLAudioElement (fallback)
```

### TTS Sanitization (lines 157–170)

```typescript
function sanitizeForTTS(text: string): string {
  return text
    .replace(/\([\w\s]+\)/gi, '')    // Remove (stage directions)
    .replace(/\[[\w\s]+\]/gi, '')    // Remove [bracketed text]
    .replace(/\.{2,}/g, ' ')         // Remove ... ellipsis
    .replace(/\*+[\w\s]+\*+/g, '')   // Remove *emphasis*
    .replace(/\s{2,}/g, ' ')         // Collapse spaces
    .trim()
}
```

---

## 6. Character Injection Point Analysis

Based on the above, there are **three natural injection points** for character/persona data:

### Injection Point A — System Prompt Tail (easiest, lowest risk)
Append a `CHARACTER:` block after `PERSONALITY:` in `buildSystemPrompt()`. The function already accepts `languageCode`, `level`, `nativeLang` — add a 4th param `character?: TutorCharacter`.

```
// Current prompt ends with:
PERSONALITY: Warm, encouraging, patient. ...

// Could become:
PERSONALITY: {character.personality}

CHARACTER BACKGROUND: {character.backstory}
SPEAKING STYLE: {character.speakingStyle}
```

### Injection Point B — Voice Registry Extension (adds character metadata to TutorVoice)
Add optional fields to the `TutorVoice` interface: `personality?: string`, `backstory?: string`, `speakingStyle?: string`. Pass selected voice's character data into `buildSystemPrompt()`.

### Injection Point C — Per-Request Character Override (most flexible)
Add a `character_prompt?: string` field to the POST body, appended verbatim to the system prompt. Allows server-side character definitions without changing the function signature.

---

## 7. Supabase Persistence

**Tables:**
- `speak_conversations` — metadata per session (language, voice_name, level, message_count, title, started_at, ended_at)
- `speak_messages` — individual turns (conversation_id, role, content)
- RPC: `increment_speak_message_count(conv_id, inc)` — atomic counter update

**File:** `orchestrator/frontend/src/hooks/useVoiceTutor.ts` lines 204–284

---

## 8. Summary Table

| Component | Value | File:Line |
|-----------|-------|-----------|
| System prompt builder | `buildSystemPrompt(lang, level, nativeLang)` | voice-chat.ts:126 |
| Supported languages | 12 (en, de, fr, it, es, pt, nl, hi, ar, fil, id, ko) | voice-chat.ts:22 |
| Proficiency levels | 4 (zero, beginner, intermediate, advanced) | voice-chat.ts:74 |
| History window | Last 20 messages, sliding | voice-chat.ts:332 |
| Summarization | None | — |
| LLM model | `llama-3.3-70b-versatile` (Groq) | voice-chat.ts:392 |
| `max_tokens` | 200 | voice-chat.ts:394 |
| Temperature | Not set (Groq default ~1.0) | voice-chat.ts:391 |
| STT model | `whisper-large-v3` (Groq) | voice-chat.ts:307 |
| TTS primary | `voxtral-mini-tts-2603` (Mistral) | voice-chat.ts:182 |
| TTS fallback | `eleven_multilingual_v2` (ElevenLabs) | voice-chat.ts:225 |
| Total voices | 99 | voiceRegistry.ts |
| Character field in TutorVoice | **None** | voiceRegistry.ts |
| Audio format | MP3, base64-encoded | voice-chat.ts:427 |
| API timeout | 20 seconds | voice-chat.ts:396 |
| Streaming | No | voice-chat.ts:391 |
