# Investigation Report — Speak Page State 3 × Gemini Provider Compatibility

**Mode:** Read-only. No files modified.
**Date:** 2026-04-17
**Scope:** `orchestrator/frontend/` only. All `_review*`, `_spotcheck`, and root `frontend/` copies were ignored per the task brief.
**Frames:** [INVESTIGATION_REPORT_GEMINI_MODULAR_v2.md](INVESTIGATION_REPORT_GEMINI_MODULAR_v2.md) §§ 1.6, 3.1, 3.2, 4.4, 6.3 and [INVESTIGATION_REPORT_GEMINI_TTS.md](INVESTIGATION_REPORT_GEMINI_TTS.md).

The Phase 1 Gemini implementation has landed (provider column in schema, `ProviderToggle` mounted in State 2 header, `GeminiModeVoicePicker`, `VoiceSampleButton`, `useVoiceTutor.startConversationWithGemini`, `audioUtils.ts` extraction, Gemini branch of `generateSpeech`). The question this report answers is: **what happens in the State 3 header once a Gemini conversation is live, and which Phase 1 decisions were made silently?**

---

## Section 1 — State 3 header anatomy

State 3 renders at [Speak.tsx:467-574](orchestrator/frontend/src/pages/Speak.tsx#L467-L574), triggered when `tutor.voice`, `tutor.level`, and `tutor.showLevelPicker` are all truthy/non-null. The header occupies [Speak.tsx:470-574](orchestrator/frontend/src/pages/Speak.tsx#L470-L574) — slightly longer than v2's "443-546" estimate because v2 was reading the pre-ProviderToggle codebase.

### Control inventory

| # | Control | File:line | Reads (tutor state) | Mutates (tutor action) | Provider-aware? |
|---|---|---|---|---|---|
| 1 | Back (ArrowLeft) | [Speak.tsx:472-478](orchestrator/frontend/src/pages/Speak.tsx#L472-L478) | — | `tutor.resetConversation` | **No** — identical for both providers; resets all tutor state to language picker |
| 2 | Flag + character subtitle (identity strip) | [Speak.tsx:480-499](orchestrator/frontend/src/pages/Speak.tsx#L480-L499) | `tutor.language`, `tutor.character`, `tutor.voice`, `tutor.isRoleplayMode`, `tutor.activeScenario`, `tutor.activeNpcName` | — | **Partial** — Gemini path relies on the synthetic `voice.name` (`${modeName} · ${voiceName}`) set at [useVoiceTutor.ts:692](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L692) because `tutor.character` is always null for Gemini. The subtitle fallback `tutor.character?.subtitle ? ... : ''` silently drops the `character.subtitle · ` prefix for Gemini. |
| 3 | Level (emoji + "Level") | [Speak.tsx:501-512](orchestrator/frontend/src/pages/Speak.tsx#L501-L512) | `tutor.level`, `tutor.isRoleplayMode` | `tutor.changeLevel` | **No** — visible in Gemini mode, same code path |
| 4 | Study Mode toggle (📖) | [Speak.tsx:514-527](orchestrator/frontend/src/pages/Speak.tsx#L514-L527) | `tutor.studyMode`, `tutor.isRoleplayMode`, `studyWords.hasWords` | `tutor.toggleStudyMode(studyWords.studyWords)` | **No** — visible only when the user has study words, identical branch for Gemini |
| 5 | Listen Mode toggle (🎧) | [Speak.tsx:529-542](orchestrator/frontend/src/pages/Speak.tsx#L529-L542) | `tutor.listenMode`, `tutor.isRoleplayMode` | `tutor.toggleListenMode` | **No** |
| 6 | Tutor ("Change tutor", RefreshCw) | [Speak.tsx:544-553](orchestrator/frontend/src/pages/Speak.tsx#L544-L553) | `tutor.isRoleplayMode` | `tutor.changeVoice` | **No** — but the landing picker IS provider-aware via `tutor.provider` ([Speak.tsx:378](orchestrator/frontend/src/pages/Speak.tsx#L378)) |
| 7 | History (clock) | [Speak.tsx:555-562](orchestrator/frontend/src/pages/Speak.tsx#L555-L562) | — | `setHistoryOpen(true)` (local state) | **No** — panel query is provider-blind (see §6) |
| 8 | New Chat (✉+) | [Speak.tsx:564-572](orchestrator/frontend/src/pages/Speak.tsx#L564-L572) | `isBusy` | `tutor.newChat` | **No** — preserves current provider by design (see §7) |
| 9 | Message bubble click | [Speak.tsx:588-594](orchestrator/frontend/src/pages/Speak.tsx#L588-L594) | `tutor.listenMode`, `msg.revealed`, `msg.audioBase64` | `tutor.revealMessage(i)` / `tutor.replayMessageAudio(msg)` | **Implicit** — `replayMessageAudio` re-uses `msg.audioFormat`, which is `'wav'` for Gemini rows and `'mp3'` for Voxtral. See §9 for the regression check. |
| 10 | Review button (📝) | [Speak.tsx:626-642](orchestrator/frontend/src/pages/Speak.tsx#L626-L642) | `tutor.messages.length`, `correctionsLoading` | `fetchCorrections()` | **No** — `fetchCorrections` POSTs `{ mode: 'corrections', transcript, language, native_language }` at [Speak.tsx:83-92](orchestrator/frontend/src/pages/Speak.tsx#L83-L92). No provider field — corrections are LLM-only (Groq Llama 3.3) and correctly do NOT receive Gemini style prompts. |
| 11 | Microphone record button | [Speak.tsx:706-740](orchestrator/frontend/src/pages/Speak.tsx#L706-L740) | `tutor.status`, `isBusy` | `tutor.startRecording()` / `tutor.stopRecordingIfActive()` | **Indirect** — `startRecording → callVoiceChat` reads `providerRef.current` ([useVoiceTutor.ts:406-426](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L406-L426)) and emits `provider: 'gemini'` + `gemini_character_mode_id` + `gemini_voice_name` to `/api/voice-chat`. |

**No ProviderToggle is rendered in State 3.** The toggle only appears in State 2 at [Speak.tsx:356-361](orchestrator/frontend/src/pages/Speak.tsx#L356-L361). See §10.

---

## Section 2 — Level

### What it does

Clicking the Level button fires `tutor.changeLevel()` at [useVoiceTutor.ts:899-902](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L899-L902):

```typescript
const changeLevel = useCallback(() => {
  stopAudio()
  setShowLevelPicker(true)
}, [stopAudio])
```

This stops any active audio and flips `showLevelPicker` to `true`, which triggers the State 2.5 render branch at [Speak.tsx:400](orchestrator/frontend/src/pages/Speak.tsx#L400) (`if (!tutor.level || tutor.showLevelPicker)`). The picker is an **inline page state change**, not a modal — the conversation view unmounts entirely while the picker is shown.

### Is level tied to character or language?

**Language.** Level is persisted per-language in localStorage at [useVoiceTutor.ts:811](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L811):

```typescript
localStorage.setItem(`voice-tutor-level-${language}`, selectedLevel)
```

Read back at [useVoiceTutor.ts:655](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L655) (Voxtral) and [useVoiceTutor.ts:710](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L710) (Gemini). So a user who picked `intermediate` for German keeps it across Voxtral↔Gemini toggles within the same language.

### Does Gemini receive the level?

**Yes, through the same pipe as Voxtral.** `callVoiceChat` packs `body.level = levelRef.current` unconditionally at [useVoiceTutor.ts:401](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L401), before any provider branching. On the server, `buildSystemPrompt(language, level, native_language, character, study_words, scenarioPrompt)` is called for every request including Gemini ones at [voice-chat.ts:825](orchestrator/frontend/api/voice-chat.ts#L825). The level controls the LLM's language-mix ratio and pedagogy via `getLevelInstructions` at [voice-chat.ts:278-361](orchestrator/frontend/api/voice-chat.ts#L278-L361). The TTS style prompt (Gemini-only) is applied downstream in `generateGeminiSpeech` and never sees `level`.

**Implication:** The level affects WHAT the Gemini-generated text says (via Groq Llama) but not HOW it's voiced (that's the mode prompt). This is the correct separation per v2 §4.4.

### Does level persist to `speak_conversations` for Gemini?

**Yes.** `createConversation` writes `level: levelRef.current` at [useVoiceTutor.ts:316](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L316) regardless of provider. Confirmed by reading the INSERT payload: `character_id` is conditionally nulled for Gemini rows at [useVoiceTutor.ts:314](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L314), but `level` is not.

### Edge case: Voxtral→end→Gemini→new convo — does level reset/persist?

**Level is sticky per language.** Walkthrough:

1. User has German Voxtral convo, level = `intermediate`. localStorage key `voice-tutor-level-de = 'intermediate'`.
2. User clicks Back → `resetConversation` → `setLevel(null)` at [useVoiceTutor.ts:1127](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L1127). Local state is cleared but localStorage is NOT touched.
3. User lands at State 1 (language picker), selects German, toggles Gemini, picks a mode + voice.
4. `startConversationWithGemini` reads `localStorage.getItem('voice-tutor-level-de')` at [useVoiceTutor.ts:710](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L710), gets `'intermediate'`, skips State 2.5, fetches greeting directly.

**Silent Phase 1 decision:** The level chosen in Voxtral is reused in Gemini for the same language without telling the user. This is correct IF the user expects level to be a pedagogical preference that's orthogonal to voice style (probably yes). Flag for Sir Robert: worth confirming the mental model matches.

---

## Section 3 — Study mode toggle

### What it is

**LLM behavior change**, not UI. When toggled on, `studyWordsRef.current` is filled with the user's study word list ([useVoiceTutor.ts:867](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L867)) and `callVoiceChat` attaches `body.study_words = studyWordsRef.current` at [useVoiceTutor.ts:428-430](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L428-L430). The server's `buildSystemPrompt` appends `buildStudyAddendum(studyWords)` at [voice-chat.ts:363-371](orchestrator/frontend/api/voice-chat.ts#L363-L371), instructing the LLM to weave 2-3 of the user's study words per exchange into natural conversation.

### Where the state lives

- React state: `studyMode` ([useVoiceTutor.ts:169](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L169))
- Ref mirror: `studyModeRef` + `studyWordsRef` ([useVoiceTutor.ts:170-171](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L170-L171))
- **No localStorage.** Study mode resets every time the conversation is reset — see `resetConversation` at [useVoiceTutor.ts:1134-1136](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L1134-L1136), `changeVoice` at [useVoiceTutor.ts:856-858](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L856-L858), `selectLanguage` at [useVoiceTutor.ts:603-605](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L603-L605), `startRoleplay` at [useVoiceTutor.ts:789-791](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L789-L791).

### Does it flow into the system prompt for both providers?

**Yes.** `study_words` is passed to `/api/voice-chat` regardless of provider, and `buildSystemPrompt` is called for every Groq LLM turn including Gemini TTS ones. The Gemini branch only diverges at the TTS stage ([voice-chat.ts:487-490](orchestrator/frontend/api/voice-chat.ts#L487-L490)).

### Critical isolation check (v2 §4.4)

Verified at [useVoiceTutor.ts:406-426](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L406-L426):

```typescript
if (providerRef.current === 'gemini' && geminiModeIdRef.current && geminiVoiceNameRef.current) {
  body.provider = 'gemini'
  body.gemini_character_mode_id = geminiModeIdRef.current
  body.gemini_voice_name = geminiVoiceNameRef.current
  // Intentionally no character_* fields — Gemini mode is TTS-only;
  // style prompt must not leak into the LLM (buildSystemPrompt).
} else { ... }
```

On the server, `character` is constructed only from `character_name && character_tier && character_directive` at [voice-chat.ts:760-762](orchestrator/frontend/api/voice-chat.ts#L760-L762). Because Gemini never sends those fields, `character` is always `undefined` for Gemini requests, and `buildSystemPrompt` falls through to the no-character branch at [voice-chat.ts:409-418](orchestrator/frontend/api/voice-chat.ts#L409-L418). The TTS style prompt (e.g., `[gentle]`, `[whispers]`) is applied only inside `generateGeminiSpeech` at [voice-chat.ts:562](orchestrator/frontend/api/voice-chat.ts#L562) after the LLM has already produced `ai_text`. **Isolation is clean.**

Additional defense on the server: `sanitizeForTTS` at [voice-chat.ts:453-466](orchestrator/frontend/api/voice-chat.ts#L453-L466) strips bracketed expressions `/\[[\w\s]+\]/gi` from the LLM output before sending to TTS. If an LLM did emit `[whispers]` in its text, this regex would remove it — but it would remove it from BOTH Voxtral and Gemini paths. **Concern:** Gemini TTS uses bracketed tags as a feature. If a user asks "how do I tell Gemini to whisper?" and the LLM obliges with `[whispers]`, `sanitizeForTTS` will strip it before `generateGeminiSpeech` concatenates it with the style prompt. In practice this is fine because the LLM shouldn't be producing bracketed stage directions anyway (the system prompt at [voice-chat.ts:399](orchestrator/frontend/api/voice-chat.ts#L399) explicitly forbids them), and the mode's own `geminiStylePrompt` embeds the tags at the raw prompt layer.

### Edge: toggle mid-Gemini conversation

**No breakage expected.** Toggle only mutates `studyModeRef` and `studyWordsRef`. Next mic press → `callVoiceChat` reads the refs → server receives updated `study_words` → system prompt reflects change. No conversation re-initialization.

---

## Section 4 — Listen mode

### What it does

Listen mode is a UI affordance: assistant messages render with `opacity-0` until the user taps them, forcing them to listen before reading ([Speak.tsx:594-605](orchestrator/frontend/src/pages/Speak.tsx#L594-L605)). State toggle at [useVoiceTutor.ts:870-890](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L870-L890): flips `listenModeRef` and sets `revealed: false` on all assistant messages (or `true` when disabling).

Flipping Listen Mode **does not** change autoplay behavior — greeting and turn audio still auto-plays via `playAudio` in both modes. What changes is the `revealed` flag on messages and the `scheduleReveal` bypass at [useVoiceTutor.ts:541-547](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L541-L547).

### State / prompt flow / provider awareness

- State: `listenMode` ([useVoiceTutor.ts:172](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L172)) + `listenModeRef` ([useVoiceTutor.ts:173](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L173)).
- Not written to localStorage. Resets on `resetConversation`, `changeVoice`, `startRoleplay`.
- **No server pipe** — Listen mode is purely client-side rendering. The prompt and LLM behavior do not know whether the user is in Listen mode. Identical for Voxtral and Gemini.

### Audio regression check (v2 §3.1)

The MIME map referenced by v2 §3.1 at the old `useVoiceTutor.ts:128` has moved into `audioUtils.ts`. Verified at [audioUtils.ts:6-10](orchestrator/frontend/src/lib/audioUtils.ts#L6-L10):

```typescript
const MIME_MAP: Record<string, string> = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  pcm: 'audio/pcm',
}
```

**Context path (preferred, iOS-compatible).** [audioUtils.ts:16-38](orchestrator/frontend/src/lib/audioUtils.ts#L16-L38) — `playAudioViaContext` calls `ctx.decodeAudioData(arrayBuffer)`. `decodeAudioData` is format-agnostic; it sniffs the container from the bytes themselves. The `_format` param is marked with `_` prefix (unused by design). Therefore MP3 (Voxtral) and WAV (Gemini) both decode via the same path, no MIME routing needed.

**Element fallback.** [audioUtils.ts:41-68](orchestrator/frontend/src/lib/audioUtils.ts#L41-L68) — `playAudioViaElement` uses `MIME_MAP[format]` to build a Blob MIME type for the object URL. Verified: MP3 → `audio/mpeg`, WAV → `audio/wav`. Both are browser-supported. The `audioFormat` string on `TutorMessage` is set from `data.audio_format` at [useVoiceTutor.ts:563](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L563) and [useVoiceTutor.ts:1022](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L1022) — the server returns `'mp3'` for Voxtral and `'wav'` for Gemini at [voice-chat.ts:526, 489](orchestrator/frontend/api/voice-chat.ts#L526) / [voice-chat.ts:489](orchestrator/frontend/api/voice-chat.ts#L489).

**`replayMessageAudio` default.** [useVoiceTutor.ts:1172](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L1172):

```typescript
await playAudio(message.audioBase64, message.audioFormat || 'mp3')
```

The `|| 'mp3'` fallback is Voxtral-biased. **Today this is fine** because `audioFormat` is always set when `audioBase64` is set. But if a historical message row lacked the format tag (e.g., rows persisted before the Gemini migration, or from a future bug) and actually contained WAV bytes, the element fallback would try `audio/mpeg` and fail on Chrome+Firefox. Low risk — flagged for awareness.

**Listen mode specifically** routes through `replayMessageAudio` when the user taps a revealed bubble that has audio ([Speak.tsx:591-593](orchestrator/frontend/src/pages/Speak.tsx#L591-L593)). Because the Gemini rows set `audioFormat: 'wav'` correctly, both the tap-to-reveal and tap-to-hear-again paths play WAV correctly. **Regression check passes.**

---

## Section 5 — Tutor (change tutor) — the most ambiguous control

### Handler trace

`tutor.changeVoice` at [useVoiceTutor.ts:830-861](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L830-L861):

1. **Snapshots live conversation state** into `previousStateRef` ONLY when both `voiceRef.current` and `characterRef.current` are non-null ([useVoiceTutor.ts:832-842](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L832-L842)). **Gemini always has `characterRef.current === null`** (set at [useVoiceTutor.ts:699-700](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L699-L700)). Therefore the snapshot is never taken for a Gemini conversation.
2. `stopAudio()`.
3. Does NOT call `endConversation()` — this is deferred so cancelChangeVoice can restore the live session. But because Gemini never snapshots, Gemini convos see `changeVoice` clear everything WITHOUT snapshotting AND WITHOUT ending the DB conversation.
4. Clears `voice`, `character`, `messages`, `pendingAudio`, `error`, `status`, `showLevelPicker`, `studyMode`, `studyWords`, `listenMode`.
5. **Does NOT clear `geminiModeId`, `geminiVoiceName`, `conversationId`, `level`, `isRoleplayMode`, or `provider`.**

### Where does the user land?

Because `tutor.voice` is now null but `tutor.language` is preserved, the render cascade at [Speak.tsx:115, 196, 325](orchestrator/frontend/src/pages/Speak.tsx#L115) drops into **State 2** (character picker). The `ProviderToggle` at [Speak.tsx:356-361](orchestrator/frontend/src/pages/Speak.tsx#L356-L361) shows the **current `tutor.provider`** — preserved from before.

### Does the picker remember Gemini mode + voice?

**Yes.** `GeminiModeVoicePicker` receives `initialModeId={tutor.geminiModeId}` and `initialVoiceName={tutor.geminiVoiceName}` at [Speak.tsx:390-391](orchestrator/frontend/src/pages/Speak.tsx#L390-L391). Inside the picker at [GeminiModeVoicePicker.tsx:27-33](orchestrator/frontend/src/components/speak/GeminiModeVoicePicker.tsx#L27-L33):

```typescript
const initialMode = initialModeId
  ? GEMINI_CHARACTER_MODES.find((m) => m.id === initialModeId) ?? null
  : null
const [mode, setMode] = useState<GeminiCharacterMode | null>(initialMode)
const [voiceName, setVoiceName] = useState<string | null>(
  initialMode && initialVoiceName ? initialVoiceName : null,
)
```

So the user lands on Stage 2 (voice picker) with their prior voice pre-selected. They can back out to Stage 1 (mode picker) via the ArrowLeft button at [GeminiModeVoicePicker.tsx:67](orchestrator/frontend/src/components/speak/GeminiModeVoicePicker.tsx#L67).

### In-flight conversation + audio

- Audio: `stopAudio()` is called first ([useVoiceTutor.ts:843](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L843)). Web Audio source and HTMLAudioElement are torn down via the generation counter + activeSourceRef/activeAudioElRef pattern — see §9.
- DB row: **NOT ended.** The prior `speak_conversations` row sits with `ended_at = NULL`. This is intentional for Voxtral so `cancelChangeVoice` can restore. But for Gemini, since there's no snapshot path, clicking Tutor from a Gemini conversation **leaves an unclosed DB row** until either `startConversationWithGemini` ([useVoiceTutor.ts:684](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L684)) or `startConversationWithCharacter` ([useVoiceTutor.ts:634](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L634)) eventually runs `endConversation()`. If the user bails instead, the unmount effect at [useVoiceTutor.ts:275-282](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L275-L282) closes it.

**Silent Phase 1 bug / decision:** `changeVoice` should probably call `endConversation()` on the Gemini path OR snapshot the Gemini session the same way it snapshots Voxtral. As written, `cancelChangeVoice` at [useVoiceTutor.ts:1148-1167](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L1148-L1167) has a `previousStateRef` check that returns falsy for Gemini and falls through to `resetConversation()` — which IS destructive for Gemini (clears language, ends DB row, takes user all the way back to State 1). **Asymmetric: Voxtral Cancel = restore; Gemini Cancel = nuke.**

### Edge: Gemini→Tutor→toggle Voxtral→pick Voxtral char — does Gemini mode+voice persist?

Walkthrough:

1. User is in Gemini(Calm·Aoede) conversation.
2. Click Tutor → `changeVoice` → clears voice/character/messages. `geminiModeId='calm'`, `geminiVoiceName='Aoede'`, `provider='gemini'` all preserved in state.
3. State 2 renders with `ProviderToggle` showing Gemini selected.
4. User clicks Voxtral → `setProvider('voxtral')` at [useVoiceTutor.ts:724-742](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L724-L742). Code comment at [useVoiceTutor.ts:733-736](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L733-L736):

   ```typescript
   if (next === 'voxtral') {
     // Keep Gemini selection in localStorage for when they flip back, but
     // don't treat it as active.
   }
   ```

   Confirmed: `geminiModeId` / `geminiVoiceName` state is not cleared; localStorage keys (`resonance_speak_gemini_mode_id`, `resonance_speak_gemini_voice_name`) are not cleared either, because the useEffect writers at [useVoiceTutor.ts:241-249](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L241-L249) only fire when `geminiModeId` / `geminiVoiceName` state changes.
5. User picks Voxtral character → Voxtral conversation starts.
6. Later user clicks Tutor, toggles Gemini — `initialGeminiModeId` / `initialGeminiVoiceName` still hold the prior values and the picker restores them.

**This works correctly.** Notable: if the user clicks a **different** Gemini mode (e.g., "Storyteller") and starts a convo, `startConversationWithGemini` at [useVoiceTutor.ts:701-705](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L701-L705) updates the state + localStorage, but **only writes on confirm**. So mid-selection abandonment (user opens Storyteller sub-picker, doesn't confirm, clicks Back) leaves the prior Calm·Aoede intact.

---

## Section 6 — History — the biggest unaddressed surface

### Source of truth

`SpeakHistoryPanel` at [SpeakHistoryPanel.tsx:104-114](orchestrator/frontend/src/components/speak/SpeakHistoryPanel.tsx#L104-L114):

```typescript
supabase
  .from('speak_conversations')
  .select('*')
  .eq('user_id', user.id)
  .order('started_at', { ascending: false })
  .limit(50)
```

`select('*')` means the new Gemini columns (`provider`, `gemini_character_mode_id`, `gemini_voice_name`) are fetched from the DB and are present on the row objects at runtime.

### Conversation TypeScript interface

[SpeakHistoryPanel.tsx:9-24](orchestrator/frontend/src/components/speak/SpeakHistoryPanel.tsx#L9-L24):

```typescript
interface Conversation {
  id: string
  language: string
  voice_name: string | null
  character_id: string | null
  level: string | null
  message_count: number
  title: string | null
  started_at: string
  ended_at: string | null
  corrections: Correction[] | null
  mode?: string | null
  scenario_id?: string | null
  npc_name?: string | null
  context_variant?: string | null
}
```

**No fields for `provider`, `gemini_character_mode_id`, `gemini_voice_name`.** The interface does not describe them even though `select('*')` retrieves them. The data arrives but nothing in the component reads it.

### What the user sees for a Gemini row

Pay attention to how display fields are computed at [SpeakHistoryPanel.tsx:268-303](orchestrator/frontend/src/components/speak/SpeakHistoryPanel.tsx#L268-L303):

```typescript
const isRoleplay = conv.mode === 'roleplay'
const levelEmoji = conv.level ? LEVEL_EMOJI[conv.level] : null
const charName = conv.character_id ? getCharacterById(conv.character_id)?.name : null
const displayName = isRoleplay ? conv.npc_name : (charName || conv.voice_name)
const displayTitle = isRoleplay
  ? (conv.title || 'Roleplay')
  : (LANGUAGE_NAMES[conv.language] ?? conv.language)
```

For a Gemini row:
- `character_id` is NULL ([useVoiceTutor.ts:314](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L314) — `character_id: rp || isGemini ? null : ...`).
- `charName` is null.
- `voice_name` is set to the prebuilt voice name (e.g., `'Aoede'`) via [useVoiceTutor.ts:311-313](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L311-L313): `voice_name: isGemini ? geminiVoiceNameRef.current : ...`.
- Therefore `displayName = 'Aoede'` (or whatever voice the user picked).
- `displayTitle` = language name, e.g., `'Deutsch'`.

**Result:** A Gemini German conversation appears as `🇩🇪 Deutsch · Aoede` with no indication it's Gemini and no character mode shown. A Voxtral conversation with the style-tutor Cleo would show `🇩🇪 Deutsch · Cleo`. **The two are visually indistinguishable apart from the name string.**

**Mode selection (Calm, Playful, etc.) is lost** in the History display even though `gemini_character_mode_id` IS stored in the DB row. A user who has 50 Gemini convos across multiple modes cannot tell them apart without opening each.

### Transcript header — same problem

[SpeakHistoryPanel.tsx:208-228](orchestrator/frontend/src/components/speak/SpeakHistoryPanel.tsx#L208-L228):

```typescript
const cName = selectedConversation.character_id ? getCharacterById(selectedConversation.character_id)?.name : null
const transcriptSub = isRoleplay ? selectedConversation.npc_name : (cName || selectedConversation.voice_name)
```

Again falls back to `voice_name` → `'Aoede'`. No mode name ("Calm") is shown.

### Resume a past conversation?

**No.** The click handler is `onClick={() => setSelectedId(conv.id)}` at [SpeakHistoryPanel.tsx:280](orchestrator/frontend/src/components/speak/SpeakHistoryPanel.tsx#L280). It only triggers `supabase.from('speak_messages').select('*').eq('conversation_id', selectedId)` at [SpeakHistoryPanel.tsx:124-128](orchestrator/frontend/src/components/speak/SpeakHistoryPanel.tsx#L124-L128) to show the transcript. There is no "resume" button, no `tutor.resume(conversationId)` or equivalent. Transcripts are read-only artifacts. This is **provider-agnostic** — Voxtral and Gemini behave the same.

Consequence: "click past convo → auto-flip provider toggle" is **not implemented** for either Voxtral or Gemini. The History panel is a pure viewer.

### `character_id` NULL handling

**Handled by the `charName || voice_name` fallback.** No crash. But the UI copy degrades as described above.

### Summary of Phase 1 gaps in History

1. No provider badge / chip / icon distinguishing Voxtral vs Gemini rows.
2. No display of `gemini_character_mode_id` or `gemini_voice_name` — Calm and Storyteller Gemini convos look identical apart from voice name.
3. `Conversation` interface does not include the three new columns (pure style debt — TS will still parse `conv.provider` at runtime via `as Conversation`, but the type-safe read path is closed).
4. No resume affordance for Gemini (or any) conversation.

---

## Section 7 — New Chat

### Handler trace

`tutor.newChat` at [useVoiceTutor.ts:912-928](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L912-L928):

```typescript
const newChat = useCallback(async () => {
  const lang = language
  const v = voiceRef.current
  if (!lang || !v) return
  stopAudio()
  endConversation()
  setMessages([])
  messagesRef.current = []
  setPendingAudio(null)
  setError(null)
  try {
    await fetchAndPlayGreeting(lang, v)
  } catch (err) { ... }
}, [language, fetchAndPlayGreeting, endConversation, stopAudio])
```

Steps:
1. `stopAudio()` — halts current playback.
2. `endConversation()` — marks the current `speak_conversations` row with `ended_at = now()` and clears `conversationIdRef`.
3. Clears messages, pendingAudio, error.
4. Calls `fetchAndPlayGreeting(lang, v)` — which routes through `callVoiceChat(null, lang, v)`. Because `providerRef.current`, `geminiModeIdRef.current`, and `geminiVoiceNameRef.current` are all preserved, the Gemini branch at [useVoiceTutor.ts:406](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L406) fires again and a new Gemini greeting is generated.
5. `createConversation` at [useVoiceTutor.ts:293-340](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L293-L340) writes a NEW `speak_conversations` row with `provider='gemini'`, same `gemini_character_mode_id`, same `gemini_voice_name`.

### Does it clear: conversationId, messages, character, voice, provider, geminiModeId, geminiVoiceName?

| Field | Cleared by `newChat`? |
|---|---|
| `conversationId` | Yes (via `endConversation`) then re-populated |
| `messages` | Yes, then re-populated with greeting |
| `character` | **No** — preserved so `callVoiceChat` reuses it |
| `voice` | **No** — preserved (synthetic for Gemini) |
| `provider` | **No** — preserved |
| `geminiModeId` | **No** |
| `geminiVoiceName` | **No** |
| `level` | **No** — preserved |
| `studyMode` | **No** — carries across (this is the one inconsistency vs `resetConversation` which clears it — see below) |
| `listenMode` | **No** — carries across |

### Comparison with Voxtral behavior

Identical: Voxtral `newChat` also preserves character + voice + level + study + listen. This is symmetric and correct.

### Study mode inconsistency

`newChat` does NOT reset `studyMode`, but `changeVoice` DOES ([useVoiceTutor.ts:856-858](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L856-L858)). So:
- Gemini convo with Study Mode on → New Chat → Study still on. ✓
- Gemini convo with Study Mode on → Tutor → (new picker) → Gemini convo restarts → Study is **off**. ✗ (user loses preference)

This is a pre-existing Voxtral quirk unchanged by Phase 1, flagged for context.

### Where does New Chat leave the user in Gemini mode?

**Directly into another Gemini conversation with the same mode + voice.** No bounce through State 2. Conceptually "New conversation, same configuration." Matches Voxtral behavior.

---

## Section 8 — Back button (State 3)

### Handler trace

`tutor.resetConversation` at [useVoiceTutor.ts:1115-1146](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L1115-L1146):

```typescript
const resetConversation = useCallback(() => {
  stopAudio()
  endConversation()
  releaseResources()

  setLanguage(null)
  setVoice(null)
  ...
  setLevel(null)
  levelRef.current = null
  setMessages([])
  ...
  studyModeRef.current = false
  studyWordsRef.current = []
  setStudyMode(false)
  listenModeRef.current = false
  setListenMode(false)
  isRoleplayRef.current = false
  ...
}, [releaseResources, endConversation, stopAudio])
```

### What it clears

- `language` → null → drops to State 1 (language picker).
- `voice`, `character`, `level` → null.
- `messages`, `pendingAudio` → empty.
- `studyMode`, `listenMode` → false.
- Roleplay state → fully reset.
- `releaseResources()` at [useVoiceTutor.ts:1100-1113](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L1100-L1113) → stops MediaRecorder, closes MediaStream tracks, closes AudioContext.
- `endConversation()` → writes `ended_at` to DB.

### What it does NOT clear

- `provider` — preserved. localStorage key `resonance_speak_provider` stays.
- `geminiModeId`, `geminiVoiceName` — preserved in state and localStorage.

**Silent Phase 1 decision:** Back takes the user to State 1 (language). After picking a language again, State 2 shows the picker. The ProviderToggle shows Gemini (if they were in Gemini). The `GeminiModeVoicePicker` remembers mode + voice via localStorage. So "Back → same language → continue" lands them on the voice confirmation step of the same Gemini mode. This is the correct sticky-selection behavior per v2 §5.2's localStorage recommendation.

**Asymmetry flag:** Back is destructive for the *conversation* (DB row closed, messages discarded) but non-destructive for the *selection*. The Tutor button is the opposite: non-destructive for the DB conversation on Voxtral (snapshotted for cancel), destructive on Gemini (no snapshot). See §5 for the detail.

---

## Section 9 — Audio playback during transitions

### The refs

[useVoiceTutor.ts:212-214](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L212-L214):

```typescript
const activeSourceRef = useRef<AudioBufferSourceNode | null>(null)
const activeAudioElRef = useRef<HTMLAudioElement | null>(null)
const playbackGenerationRef = useRef(0)
```

### `stopAudio`

[useVoiceTutor.ts:492-505](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L492-L505):

```typescript
const stopAudio = useCallback(() => {
  playbackGenerationRef.current++
  if (activeSourceRef.current) {
    try { activeSourceRef.current.stop() } catch { /* already stopped */ }
    activeSourceRef.current = null
  }
  if (activeAudioElRef.current) {
    const el = activeAudioElRef.current
    activeAudioElRef.current = null
    el.pause()
    el.currentTime = 0
    el.dispatchEvent(new Event('ended'))
  }
}, [])
```

Increments the generation counter AND tears down both refs. Because `audioUtils` callers check `playbackGenerationRef.current !== generation` via the captured `isAborted` closure at [useVoiceTutor.ts:513](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L513), a bumped generation will prevent late `start(0)` calls. Verified behavior works for both MP3 and WAV because `decodeAudioData` and `new Audio(url)` are format-agnostic inside `audioUtils`.

### Header controls → stopAudio trace

| Control | Calls stopAudio? | Trace |
|---|---|---|
| Back | Yes | `resetConversation` → `stopAudio()` at [useVoiceTutor.ts:1116](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L1116) |
| Level | Yes | `changeLevel` → `stopAudio()` at [useVoiceTutor.ts:900](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L900) |
| Study | **No** | `toggleStudyMode` at [useVoiceTutor.ts:863-868](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L863-L868) only flips refs |
| Listen | **No** | `toggleListenMode` at [useVoiceTutor.ts:870-890](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L870-L890) only flips state and massages revealed flags |
| Tutor | Yes | `changeVoice` → `stopAudio()` at [useVoiceTutor.ts:843](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L843) |
| History | **No** | `setHistoryOpen(true)` is local state in Speak.tsx, does not touch tutor audio |
| New Chat | Yes | `newChat` → `stopAudio()` at [useVoiceTutor.ts:916](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L916) |

**Gap against Sir Robert's baseline ("audio stops on any header click"):** Study and Listen toggles do NOT stop audio. Opening History also does NOT stop audio — the panel slides in over the conversation but any Gemini WAV / Voxtral MP3 keeps playing underneath. Minor UX concern. The Phase 1 audioUtils extraction does not change this behavior — it was the same pre-extraction.

### Web Audio vs HTMLAudioElement coverage

`playAudio` at [useVoiceTutor.ts:510-525](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L510-L525):

```typescript
if (audioContextRef.current && audioContextRef.current.state === 'running') {
  await playAudioViaContext(..., (source) => { activeSourceRef.current = source }, isAborted)
  activeSourceRef.current = null
  return
}
await playAudioViaElement(..., (audio) => { activeAudioElRef.current = audio }, isAborted)
activeAudioElRef.current = null
```

Both branches register their active ref. Both honor `isAborted()`. On a header click mid-playback:
1. `stopAudio()` fires → generation++, tears down active ref.
2. The outstanding `playAudioViaContext` promise calls `source.onended → resolve()` or the `source.stop()` triggers the same. Either way the awaiting `playAudio` returns.
3. The consumer (e.g., `fetchAndPlayGreeting`) sets `status='idle'` in its `.then`.

Verified working for both MP3 and WAV by inspection of `audioUtils.ts` — no format-specific branch exists.

### Cleanup unmount

[useVoiceTutor.ts:252-284](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L252-L284) — the component-unmount effect stops both refs, stops the MediaRecorder, stops the stream, closes the AudioContext, and fires-and-forgets an `ended_at` update to Supabase. Provider-agnostic. No Gemini-specific concerns.

---

## Section 10 — Provider toggle visibility in State 3

### Rendering

Grepped across the codebase: `ProviderToggle` is rendered exactly once, at [Speak.tsx:356-361](orchestrator/frontend/src/pages/Speak.tsx#L356-L361):

```tsx
<ProviderToggle
  value={tutor.provider}
  onChange={tutor.setProvider}
  disabled={!!tutor.conversationId || isBusy}
  disabledReason="End the current conversation to switch providers."
/>
```

This is inside the State 2 branch at [Speak.tsx:325-397](orchestrator/frontend/src/pages/Speak.tsx#L325-L397). **No ProviderToggle in State 3.**

### The `disabled` gate (v2 §6.3)

v2 recommended `!tutor.conversationId && !tutor.isBusy` as the enable condition; Phase 1 implemented `disabled={!!tutor.conversationId || isBusy}` which is the exact De Morgan equivalent. Correctly applied.

But because State 2 only renders when `!tutor.voice` (see the early return at [Speak.tsx:325](orchestrator/frontend/src/pages/Speak.tsx#L325)), the user typically reaches State 2 by clicking Tutor from State 3 — which NULLs voice but **does not clear conversationId** for Voxtral (snapshot preserves it) and typically does not clear it for Gemini either (changeVoice does not call endConversation on the Gemini path — see §5). So the toggle will sometimes appear disabled in State 2 because the DB conversation is still live.

Walkthrough:
1. User in Gemini convo → click Tutor → `changeVoice` runs. `conversationIdRef.current` is NOT cleared (only `endConversation` clears it, and `changeVoice` deliberately avoids calling it).
2. State 2 renders. `tutor.conversationId` is still set (from the State 3 session).
3. `ProviderToggle` receives `disabled={true}` with reason "End the current conversation to switch providers."
4. User must click Back (or New Chat, or select a Voxtral character) to implicitly end the conversation before toggling is allowed.

**Silent Phase 1 UX decision.** Provider switching mid-session is blocked by design, but the UX path to actually flip providers is non-obvious from State 3: go back to State 2 (Tutor), see toggle disabled, go back again (Back, which ends the session), end up at State 1, pick language again, THEN toggle.

### Hidden-from-State-3 rationale

Keeping the toggle out of State 3 matches v2 §1.6's recommendation and avoids header clutter. Discoverability concern: users who don't know Gemini exists and are in a Voxtral conversation have to click Tutor → see toggle disabled → figure out to click Back. Phase 1 did not add any hint or affordance for this.

### Is switching an in-flight conversation's provider explicitly disallowed?

**Yes, by the disabled gate, enforced in the React tree.** There is no other surface where `tutor.setProvider` is exposed. No URL param, no global state setter, no context provider. Enforcement is complete in the UI.

But `setProvider` itself at [useVoiceTutor.ts:724-742](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L724-L742) is **not self-guarded**. If any future callsite invoked it during a live conversation, it would:
- Clear voice, character, messages (destructive for the live session)
- Skip `endConversation()` — leaving a dangling DB row just like `changeVoice` does for Gemini

So the invariant "don't toggle mid-conversation" is purely render-path-enforced, not defended at the hook boundary. Low risk today, worth flagging.

---

## Section 11 — Cross-control edge cases

### 11.1 — Deep state stack

Scenario: German + Intermediate + Cleo + convoA → Tutor → Gemini + Calm + Aoede + convoB → Tutor → back to Voxtral.

Step-by-step trace using the actual hook behavior:

1. **Voxtral(Cleo, convoA, de, intermediate).**
   - `provider='voxtral'`, `character=Cleo`, `geminiModeId/VoiceName` state = whatever was last in localStorage (null or leftover).
2. **Click Tutor.** `changeVoice`:
   - Snapshot taken (both `voice` and `character` non-null) → `previousStateRef` stores convoA.
   - `voice`/`character` nulled. `conversationId` preserved. `level` preserved.
   - State 2 renders. ProviderToggle shows Voxtral, **disabled** because `conversationId` is still live (the snapshot retained it).
3. **User discovers they can't switch here. Click Back.**
   - `cancelChangeVoice` → `previousStateRef` is truthy → restores snapshot. User is back in convoA.

**What the user probably wants to do:** Start over. So they click Back (ArrowLeft) = `resetConversation`. Now language is null, State 1 renders.

4. **Pick German again.** State 2. ProviderToggle shows Voxtral (from localStorage) and is **enabled** (no convoId).
5. **Toggle Gemini.** `setProvider('gemini')`:
   - `voice`, `character` nulled (they were already null).
   - `messages` cleared (already empty).
   - `provider='gemini'`, localStorage written.
6. **Gemini picker. Pick Calm → Aoede → Start.**
   - `startConversationWithGemini` runs.
   - `geminiModeId='calm'`, `geminiVoiceName='Aoede'`, version=1 set.
   - Level is auto-resolved from `localStorage['voice-tutor-level-de'] = 'intermediate'`. Straight to State 3.
7. **Conversation runs as convoB (new DB row).**
8. **Click Tutor.** `changeVoice`:
   - Snapshot check at [useVoiceTutor.ts:832-842](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L832-L842): `characterRef.current` is null → snapshot is NOT taken.
   - `voice` nulled.
   - State 2 renders. ProviderToggle shows Gemini, disabled because `conversationIdRef.current` is still set (never cleared).
9. **User wants Voxtral. Toggle is disabled. Click Back (ArrowLeft).**
   - `cancelChangeVoice` → `previousStateRef` is null → falls through to `resetConversation`.
   - `endConversation()` fires, convoB's `ended_at` is set.
   - Language nulled. Back to State 1.
10. **Pick German. State 2. ProviderToggle enabled, shows Gemini.** Toggle Voxtral → `setProvider('voxtral')`. Voxtral picker renders.

**What's pre-selected at each re-entry?**
- Step 4: Voxtral grid, Cleo is NOT pre-selected (Voxtral side has no persistence). Language flag and name are shown.
- Step 5-6: Gemini picker remembers last localStorage value. If earlier sessions set `calm+Aoede`, that's the initial state.
- Step 10: Voxtral grid, no persistence.

**Silent Phase 1 behavior:** Voxtral doesn't remember last character (consistent with pre-Gemini Resonance). Gemini remembers last mode + voice via localStorage. Asymmetric but intentional per v2 §5.2.

### 11.2 — Stale Gemini prompt

localStorage holds `resonance_speak_gemini_mode_id = 'calm'`. Mode registry version is now 2 (bumped by an admin after prompt edit).

Resolution path:
1. `useVoiceTutor` reads localStorage at mount ([useVoiceTutor.ts:157](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L157)) → `geminiModeId = 'calm'`.
2. User navigates to State 2, toggles Gemini. `GeminiModeVoicePicker` receives `initialModeId='calm'`.
3. Inside the picker at [GeminiModeVoicePicker.tsx:27-29](orchestrator/frontend/src/components/speak/GeminiModeVoicePicker.tsx#L27-L29):

   ```typescript
   const initialMode = initialModeId
     ? GEMINI_CHARACTER_MODES.find((m) => m.id === initialModeId) ?? null
     : null
   ```

   `GEMINI_CHARACTER_MODES` is imported from [src/data/geminiCharacterModes.ts:19](orchestrator/frontend/src/data/geminiCharacterModes.ts#L19). The `find` resolves to the **current version** (whatever's in the array today). If the id matches, the new mode + new `version` are returned.

4. `startConversationWithGemini` is called with `params.version` = the **current** registry value ([Speak.tsx:387](orchestrator/frontend/src/pages/Speak.tsx#L387)).
5. The server's `GEMINI_CHARACTER_MODES` mirror is independently pinned; the mirror must match for prompt integrity. If the mirrors drift, `geminiStylePrompt` diverges (v2 §8.1 warned about this).

**So:** localStorage stores only the `id` (not the full prompt). A version bump in the registry is automatically picked up at next render. `version` is propagated through to `VoiceSampleButton` as the cache key at [GeminiModeVoicePicker.tsx:110](orchestrator/frontend/src/components/speak/GeminiModeVoicePicker.tsx#L110) and to the API for server-side cache invalidation (see [VoiceSampleButton.tsx:81](orchestrator/frontend/src/components/speak/VoiceSampleButton.tsx#L81)).

**Edge subtlety:** if `initialModeId` refers to an id that was **removed** from the registry, `find` returns `undefined`, `?? null` kicks in, and the picker falls through to Stage 1 (mode picker). Safe. But `initialVoiceName` would be discarded in that case because the `initialMode && initialVoiceName ? initialVoiceName : null` guard at [GeminiModeVoicePicker.tsx:31-33](orchestrator/frontend/src/components/speak/GeminiModeVoicePicker.tsx#L31-L33) requires a resolved mode.

**No version-stickiness bug** — the resolution is keyed by id, and version comes from the registry, not from storage. Good.

### 11.3 — Language switch mid-Gemini

Scenario: Gemini + Calm + Aoede + English conversation running → click Back (= `resetConversation`) → State 1 → pick Korean.

1. `resetConversation` clears everything except `provider`, `geminiModeId`, `geminiVoiceName`.
2. State 1 renders. User picks Korean. `selectLanguage('ko')` at [useVoiceTutor.ts:588-615](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L588-L615).
   - Sets `language='ko'`.
   - Clears `voice`, `character`, `level`, `messages`, `studyMode`, roleplay state.
   - **Does NOT clear** `provider`, `geminiModeId`, `geminiVoiceName`.
3. State 2 renders (because `!tutor.voice`). ProviderToggle shows Gemini (still selected).
4. `GeminiModeVoicePicker` receives `initialModeId='calm'`, `initialVoiceName='Aoede'`.
5. Picker renders Stage 2 (voice selection with 'Aoede' pre-selected for Calm mode).

**Yes, the picker remembers Calm + Aoede on re-entry across a language switch.** This is the correct behavior per v2 §2.5 (language is a cache key dimension; mode + voice are user preferences that transcend language).

---

## Section 12 — Phase 2 (accents) implications

### State 3 controls needing Phase 2 awareness

Based on the current code, Phase 2 adds `gemini_accent_id` to the mode/voice triple. Expected touch points:

1. **Level button** — probably no change. Accent is a TTS-layer concern, level is an LLM-layer concern.
2. **Tutor button + picker** — HIGH. If accents are a third picker stage, `GeminiModeVoicePicker` grows from 2 stages to 3 (mode → voice → accent), OR a new inline accent dropdown appears next to the voice list. The localStorage needs a fourth key (`resonance_speak_gemini_accent_id`). `startConversationWithGemini` params grow a field. Request body grows a field. `speak_conversations` grows a fourth Gemini column. Mirror in `api/voice-chat.ts` grows a fourth lookup.
3. **History** — already broken (see §6); Phase 2 makes it worse (four Gemini fields to display, not three).
4. **Study / Listen / New Chat / Back** — unchanged. All are orthogonal to accents.

### Phase 1 behaviors that are broken NOW and should be fixed before Phase 2

| Severity | Issue | Location |
|---|---|---|
| **High** | `changeVoice` on a Gemini conversation does not snapshot (because `characterRef.current` is null), does not call `endConversation`, and cannot be undone via `cancelChangeVoice`. Result: dangling DB row + "cancel from change-voice after picking Gemini" nukes the session. | [useVoiceTutor.ts:832-861](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L832-L861), [useVoiceTutor.ts:1148-1167](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L1148-L1167) |
| **High** | `SpeakHistoryPanel` does not render any provider / mode indicator. Gemini convos are visually indistinguishable from Voxtral and from each other by mode. | [SpeakHistoryPanel.tsx:9-24, 268-303](orchestrator/frontend/src/components/speak/SpeakHistoryPanel.tsx#L9-L24) |
| **Medium** | `ProviderToggle` is disabled once a conversation exists, but there is no affordance in State 3 to switch providers without first ending the conversation (Back is the only path, which is destructive). Users without prior Gemini knowledge may miss the feature. | [Speak.tsx:356-361, 467-574](orchestrator/frontend/src/pages/Speak.tsx#L356-L361) |
| **Low** | `replayMessageAudio` defaults to `'mp3'` format when `message.audioFormat` is undefined. Benign today but brittle if historical data surfaces without format. | [useVoiceTutor.ts:1172](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L1172) |
| **Low** | Study / Listen toggles and History open DO NOT stop audio. If Sir Robert expects "any header click stops audio" as a universal invariant, these paths violate it. | [useVoiceTutor.ts:863-890](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L863-L890), [Speak.tsx:556](orchestrator/frontend/src/pages/Speak.tsx#L556) |
| **Low** | `setProvider` is not self-guarded; any callsite invoking it mid-conversation would silently destroy state. Invariant is render-path-enforced only. | [useVoiceTutor.ts:724-742](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L724-L742) |

### Missing specs in the prospective Phase 2 prompt

`IMPLEMENTATION_PROMPT_GEMINI_ACCENTS.md` does **not** exist in the repo (verified: `ls /d/CODING/ResonanceTEST/` shows no such file).

Things this investigation surfaces that a Phase 2 prompt should address:

1. **History display strategy.** The gap exists whether or not accents land. Phase 2 should either fix it or explicitly defer with a tracking ticket.
2. **Tutor button on Gemini — snapshot OR end.** Pick one. Either Gemini gets the snapshot-restore behavior (complicated because there's no `character` to key off), OR `changeVoice` calls `endConversation()` for the Gemini branch (simpler, but asymmetric with Voxtral). The current silent behavior (neither) is a bug.
3. **Provider toggle discoverability.** Phase 2 could include a subtle hint somewhere in State 3 ("Using Voxtral · Click Tutor to try Gemini" or similar). Or commit to "State 2 is the only switching surface" and document it.
4. **Accent versioning.** Same logic as mode `version` — need a `version` on the accent entries and a localStorage `resonance_speak_gemini_accent_id`. Mirror in `api/voice-chat.ts`. Cache key must grow to 5 dimensions (voice, language, mode, accent, version).
5. **Level persistence across provider toggle.** Should the Gemini mode's style prompt interact with level? Currently no — level affects only the LLM prompt via `getLevelInstructions`. Phase 2 might make the Gemini Calm mode "softer at level zero" through mode-content changes; that's a content-design decision but worth surfacing.

---

## Summary

### Top 3 unaddressed gaps — silent Phase 1 decisions Sir Robert must review

1. **Tutor-button behavior on Gemini is asymmetric and buggy.** Voxtral gets snapshot-and-restore semantics (click Tutor, change your mind, come back to live convo). Gemini gets destructive snap-to-picker with a dangling DB row, and `cancelChangeVoice` falls through to `resetConversation` — meaning clicking Tutor then Back on a Gemini convo wipes the conversation entirely instead of restoring it. The Voxtral UX and Gemini UX of the same button diverge silently. Locations: [useVoiceTutor.ts:830-861, 1148-1167](orchestrator/frontend/src/hooks/useVoiceTutor.ts#L830-L861).

2. **History panel is provider-blind.** The `Conversation` interface at [SpeakHistoryPanel.tsx:9-24](orchestrator/frontend/src/components/speak/SpeakHistoryPanel.tsx#L9-L24) does not declare the three new columns, and the rendering code at [SpeakHistoryPanel.tsx:268-303](orchestrator/frontend/src/components/speak/SpeakHistoryPanel.tsx#L268-L303) falls back to `voice_name` (prebuilt voice like "Aoede") for both Voxtral and Gemini rows. There is no provider badge, no mode name ("Calm"), no resume flow. A user with 20 Gemini conversations in different modes cannot tell them apart.

3. **Provider switching discoverability is subtle and gated behind destruction.** The ProviderToggle only appears in State 2 (per v2 §1.6's explicit recommendation — this is known), but is disabled while `conversationId` exists. Because `changeVoice` preserves `conversationId` (intentional for Voxtral snapshot-restore), clicking Tutor from State 3 lands in a State 2 where the toggle is disabled. The only path to actually switch providers from a live conversation is Back → pick language again → toggle. No hint anywhere surfaces this. A first-time Voxtral user will not know Gemini exists unless they explicitly end a conversation and return to State 2 without immediately picking a character.

### Recommended Phase 1 fixes — broken NOW, don't wait for Phase 2

- Fix `changeVoice` Gemini-side snapshot (or explicitly call `endConversation()` on the Gemini path) so `cancelChangeVoice` doesn't nuke the session and no dangling DB rows are left.
- Extend `SpeakHistoryPanel.Conversation` with `provider`, `gemini_character_mode_id`, `gemini_voice_name`. Render a provider badge and mode name in the list + transcript header.
- Decide on discoverability for switching providers mid-session (hint in header, or explicit "end conversation to switch providers" button, or accept the current "Back → pick language again" path and document).
- Fix `replayMessageAudio` default format fallback to not hardcode `'mp3'` — default to the `audioFormat` on the message or throw.
- Optional: make Study / Listen / History controls call `stopAudio()` for consistency with the rest of the header controls.

### Phase 2 prompt addenda (specific additions needed)

- **Accent cache dimension.** Add `accent_id` to the `voice_samples` PK or make accent an independent sample dimension. Revisit the partial index.
- **Accent versioning.** Each accent entry needs a `version INT`. Bumping it must invalidate sample cache rows.
- **Accent localStorage key.** `resonance_speak_gemini_accent_id`. Add to `useVoiceTutor`'s initial state read and write-on-change effect.
- **Request body field.** `gemini_accent_id` alongside the two existing fields.
- **`speak_conversations` column.** `gemini_accent_id TEXT` nullable.
- **Mirror in `api/voice-chat.ts`.** Accent registry const with the same keep-in-sync banner.
- **Picker shape.** Either a third stage in `GeminiModeVoicePicker` or an inline per-voice accent picker. Prefer the latter if accent is voice-scoped (e.g., "Aoede → US / UK / AUS").
- **History display.** Extending the fix recommended in Phase 1 so Gemini rows show mode + voice + accent.
- **Before starting Phase 2**, either fix or explicitly accept the Section-5 Tutor-button snapshot asymmetry. Adding a fourth field makes the snapshot complexity worse.

### Decisions for Sir Robert — open questions where multiple defensible answers exist

1. **Tutor button on Gemini: snapshot-and-restore (mirror Voxtral) or end-on-click (simpler, asymmetric)?** The Voxtral snapshot path depends on `characterRef`; Gemini has no character. Either add a `geminiSnapshot` branch OR accept that Gemini Tutor is destructive and update `cancelChangeVoice` to reflect that.
2. **History display design for Gemini rows:** inline badge (`🎭 Gemini · Calm · Aoede`), dedicated filter tab ("All / Voxtral / Gemini"), or provider-colored left border?
3. **Resume past conversation — build it as part of History fix, or hold for a future feature?** Touches `useVoiceTutor` invariants significantly (would need a `resumeConversation(conversationId)` method that replays `speak_messages` into state + reopens the DB row). Large surface.
4. **Should Study / Listen / History toggle-clicks stop active audio?** Currently they don't. Consistent with what the user expects? Or should the audio-stop invariant be "any header button click in State 3 stops playback"?
5. **Provider toggle discoverability in State 3.** Leave it subtle (State 2 only), add a small "Switch to Gemini" link in the header, or show a one-time onboarding tooltip? Affects the "first Voxtral user discovers Gemini" funnel.
6. **localStorage key namespace for Gemini sample sentences:** the text sentences live in [src/data/geminiVoiceSampleSentences.ts](orchestrator/frontend/src/data/geminiVoiceSampleSentences.ts) and a mirror in [api/voice-chat.ts:238-248](orchestrator/frontend/api/voice-chat.ts#L238-L248). Should Phase 2 add them to the drift-check unit test v2 §8.1 proposed?
7. **Cleanup of unclosed `speak_conversations` rows.** The unmount effect writes `ended_at` on page navigation, but clicking Tutor without subsequently starting a new convo leaves the DB row open. Is this cosmetic (never queried) or does it affect any downstream metric / analytics? Worth a cleanup cron or an explicit close-on-changeVoice.
