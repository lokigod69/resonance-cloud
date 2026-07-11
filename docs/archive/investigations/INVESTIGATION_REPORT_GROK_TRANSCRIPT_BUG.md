# INVESTIGATION REPORT - GROK TRANSCRIPT PERSISTENCE BUG

Sir Robert, this is a read-only source investigation. No source files were modified, no files were staged, and no commits were made.

## 1. Pull-rebase result

Required command result:

```text
git pull --rebase origin main
From https://github.com/lokigod69/resonance-cloud
 * branch            main       -> FETCH_HEAD
Already up to date.
```

The workspace root `D:\CODING\ResonanceTEST` was not itself a Git repository. The actual repository used for source inspection was `D:\CODING\ResonanceTEST\orchestrator`.

No incoming commits came down during the pull-rebase. No conflicts occurred.

Current repo head is `41e7242 Upgrade Speak selection UI`; this is after `2836ed2 feat(speak/grok): sequential pre-session picker - Voice -> Mode -> Level`.

Pre-existing dirty worktree entries were present and not touched:

```text
 M frontend/src/components/speak/GrokPicker.tsx
 M frontend/src/index.css
 M frontend/src/pages/Speak.tsx
```

## 2. Target 1 - Assistant message write path end-to-end

### What source shows

The assistant persist call is only reached from the `response.done` branch in `frontend/src/hooks/useGrokRealtime.ts:328-339`:

```ts
case 'response.done': {
  await flushPendingAudio()
  const finalAssistantText = pendingAssistantContentRef.current
  pendingAssistantContentRef.current = ''
  currentAssistantIndexRef.current = null
  if (finalAssistantText) {
    void persistSpeakMessage('assistant', finalAssistantText)
  }
  if (mountedRef.current && audioQueueRef.current.length === 0) {
    setStatus('idle')
  }
  break
}
```

The xAI Voice API reference documents `response.done` as a real server event. Its example flow ends with `response.done`, and the server event list says `response.done` is sent after all audio and transcript deltas. It also documents other done-suffixed server events in the voice response lifecycle, including `response.output_audio.done`, `response.output_audio_transcript.done`, `response.content_part.done`, and `response.output_item.done`. Source: [xAI Voice API Reference](https://docs.x.ai/developers/rest-api-reference/inference/voice).

Inside `handleSocketMessage`, the only `.done`-suffixed event handled is `response.done`. The code does not handle:

- `response.output_audio_transcript.done`
- `response.output_audio.done`
- `response.content_part.done`
- `response.output_item.done`

The path that writes the message also has a content guard in `frontend/src/hooks/useGrokRealtime.ts:245-248`:

```ts
const persistSpeakMessage = useCallback(async (role: 'user' | 'assistant', content: string) => {
  const conversationId = conversationIdRef.current
  if (!conversationId || !content) return
  await persistConversationStart()
```

If `pendingAssistantContentRef.current` is empty when `response.done` runs, the assistant write is skipped before it reaches Supabase.

### Verdict

Root cause highly likely for missing assistant messages.

### Reasoning

The terminal event name is not the main mismatch. xAI documents `response.done`, and the handler is present. The failure point is upstream: `response.done` persists only what has accumulated in `pendingAssistantContentRef.current`, and the source only accumulates text from `response.text.delta`. For an audio voice session, xAI documents assistant speech transcript deltas under `response.output_audio_transcript.delta`, not `response.text.delta`.

So `response.done` can fire correctly while the ref remains empty. The code then clears the ref and skips persistence because `finalAssistantText` is falsy.

## 3. Target 2 - `pendingAssistantContentRef` population lifecycle

### What source shows

The ref is declared empty in `frontend/src/hooks/useGrokRealtime.ts:59`:

```ts
const pendingAssistantContentRef = useRef<string>('')
```

The session is configured for audio input and audio output in `frontend/src/lib/grokSessionConfig.ts:48-51`:

```ts
audio: {
  input: { format: { type: 'audio/pcm', rate: 24000 } },
  output: { format: { type: 'audio/pcm', rate: 24000 } },
},
```

Only one event type appends text to the assistant ref, in `frontend/src/hooks/useGrokRealtime.ts:308-310`:

```ts
case 'response.text.delta': {
  appendAssistantDelta(typeof payload.delta === 'string' ? payload.delta : '')
  break
}
```

`appendAssistantDelta` itself appends into the ref at `frontend/src/hooks/useGrokRealtime.ts:264-270`:

```ts
const appendAssistantDelta = useCallback((delta: string) => {
  if (!delta) return
  if (!conversationInsertedRef.current) {
    void persistConversationStart()
  }

  pendingAssistantContentRef.current += delta
```

The hook handles audio bytes separately in `frontend/src/hooks/useGrokRealtime.ts:312-326`:

```ts
case 'response.output_audio.delta': {
  const delta = typeof payload.delta === 'string' ? payload.delta : ''
  if (!delta) break
  const bytes = decodeBase64ToBytes(delta)
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const pcm = new Int16Array(bytes.byteLength / 2)
  for (let i = 0; i < pcm.length; i++) {
    pcm[i] = view.getInt16(i * 2, true)
  }
  pendingPcmChunksRef.current.push(pcm)
  pendingPcmSampleCountRef.current += pcm.length
  if (pendingPcmSampleCountRef.current >= PCM_FLUSH_SAMPLES) {
    await flushPendingAudio()
  }
  break
}
```

There is no branch for `response.output_audio_transcript.delta`.

xAI documents `response.output_audio_transcript.delta` as the streaming text transcript delta of the assistant's audio response, and separately documents `response.text.delta` as text-mode output. Source: [xAI Voice API Reference](https://docs.x.ai/developers/rest-api-reference/inference/voice).

The ref is cleared after copying its value in `response.done`, before the async write is launched:

```ts
const finalAssistantText = pendingAssistantContentRef.current
pendingAssistantContentRef.current = ''
currentAssistantIndexRef.current = null
if (finalAssistantText) {
  void persistSpeakMessage('assistant', finalAssistantText)
}
```

That ordering is not a race that blanks the payload, because strings are copied by value into `finalAssistantText` before the async call. The problem is that the copied value is likely empty.

Debug logging exists for WebSocket close, primer audio, parsing failures, generic realtime errors, and persistence warnings. There is no debug path that logs inbound event types, assistant transcript delta receipt, assistant ref length, or the final assistant text at `response.done`.

### Verdict

Root cause confirmed at the source/protocol level, with runtime evidence useful only to verify the exact live event stream.

### Reasoning

This is the clean explanation for "some user messages, zero assistant messages." User messages are persisted from a dedicated user transcription completion event. Assistant messages rely on an accumulator that never sees the documented voice transcript event.

The current code appears copied from a text-output shape while the configured Grok session is audio-output. For this session type, xAI's documented assistant transcript event is `response.output_audio_transcript.delta`. The hook ignores it, so `pendingAssistantContentRef.current` remains empty, and `response.done` short-circuits persistence.

## 4. Target 3 - Latest user turn missing

### What source shows

User persistence is triggered by `conversation.item.input_audio_transcription.completed` in `frontend/src/hooks/useGrokRealtime.ts:341-345`:

```ts
case 'conversation.item.input_audio_transcription.completed': {
  const transcript = typeof payload.transcript === 'string' ? payload.transcript : ''
  appendUserTranscript(transcript)
  void persistSpeakMessage('user', transcript)
  break
}
```

The xAI docs confirm this event exists for completed user input audio transcription. Source: [xAI Voice API Reference](https://docs.x.ai/developers/rest-api-reference/inference/voice).

End Conversation calls `teardownSession` at `frontend/src/hooks/useGrokRealtime.ts:631-633`:

```ts
const endSession = useCallback(async () => {
  await teardownSession()
}, [teardownSession])
```

`teardownSession` closes the WebSocket before any transcript-drain or response-drain logic exists, in `frontend/src/hooks/useGrokRealtime.ts:452-486`:

```ts
const teardownSession = useCallback(async () => {
  endingSessionRef.current = true
  const closingConversationId = conversationIdRef.current
  stopListening()
  resetAudioQueue()

  const ws = wsRef.current
  wsRef.current = null
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    try { ws.close(1000, 'session ended') } catch { /* ignore */ }
  }
  ...
  await updateEndedAt(closingConversationId)
  endingSessionRef.current = false
}, [resetAudioQueue, stopListening, updateEndedAt])
```

`teardownSession` does not await in-flight `persistSpeakMessage` calls. The call sites use `void persistSpeakMessage(...)`, including the user transcription branch.

`ws.onmessage` also launches the handler without awaiting it in `frontend/src/hooks/useGrokRealtime.ts:520-522`:

```ts
ws.onmessage = (event) => {
  void handleSocketMessage(event as MessageEvent<string>)
}
```

If the completed transcript event is delivered before close and the handler runs, the write can still be attempted because `teardownSession` does not clear `conversationIdRef.current`, `sessionParamsRef.current`, or `currentUserIdRef.current`. If the completed transcript event has not yet been delivered when the WebSocket is closed, the source has no mechanism to recover it.

The drafted FIX 08 file named in the prompt was not present in this workspace. The same race is described in `D:\CODING\ResonanceTEST\SESSION_HANDOFF_2026-04-24.md:50-56` and `D:\CODING\ResonanceTEST\ADVERSARIAL_REVIEW_06_07.md:354-430`: `persistConversationStart` sets `conversationInsertedRef.current = true` before awaiting the insert, so another message persist can proceed against a conversation row that is not committed yet.

Current source still has that behavior in `frontend/src/hooks/useGrokRealtime.ts:212-243`:

```ts
const persistConversationStart = useCallback(async () => {
  if (conversationInsertedRef.current) return
  ...
  conversationInsertedRef.current = true
  try {
    await supabase.from('speak_conversations').insert({
```

### Verdict

Plausible. There are two plausible user-turn loss paths:

- Teardown race: highly plausible for the final user turn specifically.
- FIX 08 conversation-start race: plausible for early or concurrent turns, but less targeted to the final turn.

### Reasoning

The "latest user turn missing" symptom has a different shape from "all assistant messages missing." Source shows a real end-session race: pressing End closes the WebSocket immediately. If xAI has not yet delivered `conversation.item.input_audio_transcription.completed`, the client never receives the final transcript and cannot persist it.

If the event was already received and persistence was already launched, the write is not awaited before the history panel can load. That can make the post-session view miss a row even if the DB write eventually succeeds. Source cannot prove whether that row later appears on refresh.

FIX 08 remains relevant, but it is not the cleanest explanation for the final-turn symptom. FIX 08 is about writes racing the initial conversation insert. The final user turn occurs after earlier user rows already exist, so the conversation row usually exists by then. A final-turn-only miss points more strongly at teardown/event-drain behavior than at the initial FK race.

## 5. Target 4 - Render-side filtering

### What source shows

The conversation list query in `frontend/src/components/speak/SpeakHistoryPanel.tsx:154-159` does not exclude Grok:

```ts
supabase
  .from('speak_conversations')
  .select('*')
  .eq('user_id', user.id)
  .order('started_at', { ascending: false })
  .limit(50)
```

The selected transcript query in `frontend/src/components/speak/SpeakHistoryPanel.tsx:174-178` filters only by conversation id:

```ts
supabase
  .from('speak_messages')
  .select('*')
  .eq('conversation_id', selectedId)
  .order('created_at', { ascending: true })
```

The render path maps every returned message and only changes alignment/style by role in `frontend/src/components/speak/SpeakHistoryPanel.tsx:431-444`:

```tsx
{messages.map((msg) => (
  <div
    key={msg.id}
    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
  >
    <div
      className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
        msg.role === 'user'
          ? 'bg-cyan-900/50 text-white rounded-br-sm'
          : 'bg-gray-800/60 text-gray-100 rounded-bl-sm'
      }`}
    >
      {msg.content}
```

There is no role filter, provider filter, or Grok-specific `.filter()` hiding assistant rows in the history panel.

### Verdict

Render-side filtering refuted.

### Reasoning

If assistant rows exist in `speak_messages` for the selected conversation, this component should render them. The symptom is therefore much more likely to be a write-side or event-side failure than a history UI filter.

## 6. Target 5 - Swallowed errors

### What source shows

`persistSpeakMessage` catches and reduces errors to a console warning in `frontend/src/hooks/useGrokRealtime.ts:249-260`:

```ts
try {
  await supabase.from('speak_messages').insert({
    conversation_id: conversationId,
    role,
    content,
  })
  await supabase.rpc('increment_speak_message_count', {
    conv_id: conversationId,
    inc: 1,
  })
} catch (err) {
  console.warn('[grok-realtime] Failed to persist message:', err)
}
```

`persistConversationStart` does the same in `frontend/src/hooks/useGrokRealtime.ts:219-242`:

```ts
conversationInsertedRef.current = true
try {
  await supabase.from('speak_conversations').insert({
    ...
  })
} catch (err) {
  conversationInsertedRef.current = false
  console.warn('[grok-realtime] Failed to create conversation:', err)
}
```

There is a second issue: the Supabase calls do not destructure or inspect `{ error }`, and they do not chain `.throwOnError()`. Supabase's JavaScript API examples use the `{ data, error }` / `{ error }` response shape for database calls, and the current source ignores that returned error object. Source: [Supabase JavaScript insert docs](https://supabase.com/docs/reference/javascript/insert) and [Supabase TypeScript support docs](https://supabase.com/docs/reference/javascript/typescript-support).

This means many database failures may not even reach the `catch` block. They can resolve as a response object with `error`, which this code discards.

### Verdict

Confirmed observability defect; plausible contributor to silent data loss.

### Reasoning

This does not explain "all assistant messages missing" by itself, because source already shows the assistant text is likely never accumulated. It does explain why FK, RLS, RPC, or network-level persistence failures would be invisible in the UI and may be absent even from the expected warning path.

It also weakens FIX 08's current diagnostics: if a FK violation returns as `{ error }`, the code will not reset `conversationInsertedRef.current` and will not log `[grok-realtime] Failed to persist message`. The message is still lost.

## 7. Root cause summary

### Cause A - all assistant messages missing

Confidence: high.

Cause: event-name mismatch for assistant transcript accumulation in audio sessions.

The Grok session is configured for audio output. xAI documents assistant audio transcript text under `response.output_audio_transcript.delta`. The hook only appends assistant text from `response.text.delta`. As a result, `pendingAssistantContentRef.current` remains empty, `response.done` sees no `finalAssistantText`, and `persistSpeakMessage('assistant', ...)` is skipped.

This is distinct from FIX 08. FIX 08 can drop individual writes under race conditions; it does not explain a systematic zero-assistant transcript when user rows persist.

### Cause B - latest user turn missing

Confidence: medium.

Cause: teardown/event-drain race is the strongest source-level explanation for the final user turn specifically.

End Conversation closes the WebSocket immediately and does not wait for a pending `conversation.item.input_audio_transcription.completed` event or for in-flight `persistSpeakMessage` promises. If the final completed transcript is still pending at xAI when the socket closes, it is lost client-side. If the event already fired but the write is still pending, the history panel can load before the row is visible.

FIX 08 remains a plausible separate contributor for early message loss, especially around the first message persist and the conversation-row insert. It is less aligned with a final-turn-only miss after earlier user rows already exist.

### Same cause or distinct?

Distinct.

Assistant loss is caused by ignored assistant transcript events. Final user-turn loss is most plausibly caused by end-session teardown and lack of persistence draining, with FIX 08 as a secondary race class.

## 8. Fix scope estimate

Surface area: targeted fix, not architectural.

Likely files:

- `frontend/src/hooks/useGrokRealtime.ts`
- Possibly a focused test file if current test harness covers hook event handling
- Optional: a small helper for tracked persistence promises if end-session draining is implemented

Approximate code surface:

- Assistant transcript fix: small branch addition for `response.output_audio_transcript.delta`, plus possibly handling `response.output_audio_transcript.done` if final transcript payload is useful.
- End-session persistence drain: moderate hook-local change to track pending persistence promises and/or drain transcript completion before closing.
- Error surfacing: small change to inspect Supabase `{ error }` responses or chain `.throwOnError()`.
- FIX 08 race guard: small hook-local change to memoize the in-flight conversation insert promise and reset it on new sessions.

This is surface-level hook hardening, not a schema redesign.

## 9. Decision inputs for Sir Robert

This is a targeted-fix situation if Grok history is still intended to ship.

The assistant transcript failure has a narrow, concrete cause: the hook ignores xAI's documented audio transcript delta event. That should be fixed rather than hiding all Grok history.

However, history should be treated as unreliable until three supporting issues are addressed:

- Add the missing assistant transcript event handling.
- Drain or explicitly cancel pending user transcript/persist work on End Conversation.
- Stop discarding Supabase error responses.

If only the assistant event branch is patched, assistant rows should start appearing, but the final-user-turn and silent-failure risks remain.

## 10. Instrumentation proposals

No instrumentation was applied.

### Draft instrumentation prompt A - event stream confirmation

```text
Instrument `frontend/src/hooks/useGrokRealtime.ts` only. Add temporary dev-only console logging inside `handleSocketMessage` that prints:
- `payload.type`
- for assistant text events: `delta.length`
- for `response.done`: `pendingAssistantContentRef.current.length`
- for `conversation.item.input_audio_transcription.completed`: transcript length

Do not log full transcript contents. Do not commit. Run one Grok Free Chat session and capture the event sequence around one assistant turn and one End Conversation.
```

### Draft instrumentation prompt B - persistence result confirmation

```text
Instrument `persistConversationStart` and `persistSpeakMessage` in `frontend/src/hooks/useGrokRealtime.ts` only. Capture Supabase return values:
- log `{ role, contentLength, conversationId, error }` after `speak_messages.insert`
- log `{ conversationId, error }` after `speak_conversations.insert`
- log RPC errors separately

Do not log message content. Do not commit. Run one Grok Free Chat session and confirm whether any insert/RPC returns an error object that is currently ignored.
```

### Draft instrumentation prompt C - End Conversation ordering

```text
Instrument End Conversation ordering in `frontend/src/hooks/useGrokRealtime.ts` only. Add temporary logs for:
- End button/`teardownSession` entry
- `ws.close()` call
- any `conversation.item.input_audio_transcription.completed` event after teardown starts
- each pending persistence promise start/settle

Do not commit. Run a session where the final user utterance is ended immediately after speaking, then compare event order with the persisted history.
```
