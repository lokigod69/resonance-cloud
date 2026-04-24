# INVESTIGATION REPORT — GROK UX REDESIGN / BUG CASCADE

## Summary

The pinned Grok session code at `b2c5153` renders live transcript text by design: user transcript is appended on `conversation.item.input_audio_transcription.completed`, assistant text is appended on `response.text.delta`, and `Speak.tsx` maps `grok.messages` directly into chat bubbles during State-3. The current transport is not manual push-to-talk in protocol terms; `buildGrokSessionConfig()` enables `turn_detection: { type: 'server_vad' }`, `startListening()` only streams `input_audio_buffer.append`, and `stopListening()` never sends `input_audio_buffer.commit` or a new `response.create`. There is no dedicated post-send / thinking state after a Grok user turn; the red mic state is keyed off `grok.isListening`, while playback is keyed off `grok.status === 'speaking'`, so the button state machine is split across two fields. The language inputs reaching the Grok session builder are not swapped in the pinned frontend: picker target language flows into `languageDisplay`, and `profile.base_language` flows into `nativeLanguageDisplay`. However, the pedagogy text itself instructs mixed native/target-language output at lower levels, so native-language bleed can come from the prompt content even without a variable swap. There is no hardcoded German default and no literal `"hello"` string in the Grok prompt files at this commit; the only greeting instruction is the generic tail string `Start by greeting the user naturally in ${p.languageDisplay}`. The repo already has a conversation-history stack (`speak_conversations`, `speak_messages`, `SpeakHistoryPanel`), but Grok only inserts the conversation row and `ended_at`; it does not persist individual `speak_messages`, so “End Conversation reveals full transcript from history” is not fully implemented for Grok. The corrections UI is still rendered inside the Grok State-3 branch, and its fetch path reads `grok.messages` through shared `activeMessages`. `Speak.tsx` still mounts both `useVoiceTutor()` and `useGrokRealtime()` unconditionally, so the prior iOS shared-audio-session hypothesis remains architecturally plausible on current main.

## Group A findings

### A1. `useGrokRealtime.ts` server-event coverage and mutated state

No payload-type logging exists in `ws.onmessage`; the pinned commit only proves switch/case coverage, not the full runtime event set.

`frontend/src/hooks/useGrokRealtime.ts`
```ts
 244:   const appendAssistantDelta = useCallback((delta: string) => {
 245:     if (!delta) return
 246:     if (!conversationInsertedRef.current) {
 247:       void persistConversationStart()
 248:     }
 249: 
 250:     setMessages((prev) => {
 251:       const existingIndex = currentAssistantIndexRef.current
 252:       if (existingIndex === null) {
 253:         const nextIndex = prev.length
 254:         currentAssistantIndexRef.current = nextIndex
 255:         return [...prev, { role: 'assistant', content: delta, timestamp: Date.now() }]
 256:       }
 257: 
 258:       return prev.map((message, index) => (
 259:         index === existingIndex
 260:           ? { ...message, content: message.content + delta }
 261:           : message
 262:       ))
 263:     })
 264:   }, [persistConversationStart])
 265: 
 266:   const appendUserTranscript = useCallback((transcript: string) => {
 267:     if (!transcript) return
 268:     setMessages((prev) => [...prev, {
 269:       role: 'user',
 270:       content: transcript,
 271:       timestamp: Date.now(),
 272:     }])
 273:   }, [])
 274: 
 275:   const handleSocketMessage = useCallback(async (event: MessageEvent<string>) => {
 276:     let payload: Record<string, unknown>
 277:     try {
 278:       payload = JSON.parse(event.data) as Record<string, unknown>
 279:     } catch (err) {
 280:       console.warn('[grok-realtime] Failed to parse socket message:', err)
 281:       return
 282:     }
 283: 
 284:     const type = typeof payload.type === 'string' ? payload.type : ''
 285:     switch (type) {
 286:       case 'response.text.delta': {
 287:         appendAssistantDelta(typeof payload.delta === 'string' ? payload.delta : '')
 288:         break
 289:       }
 290:       case 'response.output_audio.delta': {
 291:         const delta = typeof payload.delta === 'string' ? payload.delta : ''
 292:         if (!delta) break
 293:         const bytes = decodeBase64ToBytes(delta)
 294:         const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
 295:         const pcm = new Int16Array(bytes.byteLength / 2)
 296:         for (let i = 0; i < pcm.length; i++) {
 297:           pcm[i] = view.getInt16(i * 2, true)
 298:         }
 299:         pendingPcmChunksRef.current.push(pcm)
 300:         pendingPcmSampleCountRef.current += pcm.length
 301:         if (pendingPcmSampleCountRef.current >= PCM_FLUSH_SAMPLES) {
 302:           await flushPendingAudio()
 303:         }
 304:         break
 305:       }
 306:       case 'response.done': {
 307:         await flushPendingAudio()
 308:         currentAssistantIndexRef.current = null
 309:         if (mountedRef.current && audioQueueRef.current.length === 0) {
 310:           setStatus(isListening ? 'listening' : 'idle')
 311:         }
 312:         break
 313:       }
 314:       case 'conversation.item.input_audio_transcription.completed': {
 315:         appendUserTranscript(typeof payload.transcript === 'string' ? payload.transcript : '')
 316:         break
 317:       }
 318:       case 'input_audio_buffer.speech_started': {
 319:         resetAudioQueue()
 320:         if (mountedRef.current) setStatus('listening')
 321:         break
 322:       }
 323:       case 'error': {
 324:         console.error('[grok-realtime] Realtime error:', payload)
 325:         const message = typeof payload.message === 'string'
 326:           ? payload.message
 327:           : typeof payload.error === 'string'
 328:             ? payload.error
 329:             : 'Grok realtime error'
 330:         if (mountedRef.current) {
 331:           setError(message)
 332:           setStatus('error')
 333:         }
 334:         break
 335:       }
 336:       default:
 337:         break
 338:     }
 339:   }, [appendAssistantDelta, appendUserTranscript, decodeBase64ToBytes, flushPendingAudio, isListening, resetAudioQueue])
```

Mutated state / refs by handled event:

- `response.text.delta` → `appendAssistantDelta()` → `setMessages(...)`, `currentAssistantIndexRef`, `persistConversationStart()`.
- `response.output_audio.delta` → `pendingPcmChunksRef`, `pendingPcmSampleCountRef`, then `flushPendingAudio()` / `queueAudioBuffer()` / `setStatus('speaking')`.
- `response.done` → `flushPendingAudio()`, `currentAssistantIndexRef.current = null`, `setStatus(...)`.
- `conversation.item.input_audio_transcription.completed` → `appendUserTranscript()` → `setMessages(...)`.
- `input_audio_buffer.speech_started` → `resetAudioQueue()`, `setStatus('listening')`.
- `error` → `setError(...)`, `setStatus('error')`.

### A2. Which events carry user-speech transcript

Pinned-commit grep coverage:

```text
b2c5153:frontend/src/hooks/useGrokRealtime.ts:314:      case 'conversation.item.input_audio_transcription.completed': {
```

Pinned-commit grep shows no handlers for:

```text
response.audio_transcript.delta
response.audio_transcript.done
conversation.item.input_audio_transcription.delta
input_audio_buffer.transcript
```

Code that actually consumes user transcript:

`frontend/src/hooks/useGrokRealtime.ts`
```ts
 314:       case 'conversation.item.input_audio_transcription.completed': {
 315:         appendUserTranscript(typeof payload.transcript === 'string' ? payload.transcript : '')
 316:         break
 317:       }
```

Finding: in `b2c5153`, the only user-transcript event the hook handles is `conversation.item.input_audio_transcription.completed`. A live protocol trace would still be required to prove whether xAI emits additional unhandled transcript events during the turn.

### A3. Which events carry Eve / assistant transcript

Pinned-commit grep coverage:

```text
b2c5153:frontend/src/hooks/useGrokRealtime.ts:286:      case 'response.text.delta': {
b2c5153:frontend/src/hooks/useGrokRealtime.ts:290:      case 'response.output_audio.delta': {
b2c5153:frontend/src/hooks/useGrokRealtime.ts:306:      case 'response.done': {
```

Assistant text handling:

`frontend/src/hooks/useGrokRealtime.ts`
```ts
 286:       case 'response.text.delta': {
 287:         appendAssistantDelta(typeof payload.delta === 'string' ? payload.delta : '')
 288:         break
 289:       }
```

Finding: the pinned client treats `response.text.delta` as Eve’s transcript text. It does not handle `response.audio_transcript.delta` / `.done`.

### A4. `messages` state definition, shape, append behavior, reset behavior

`frontend/src/hooks/useGrokRealtime.ts`
```ts
   8: export type GrokStatus = 'idle' | 'connecting' | 'listening' | 'speaking' | 'error'
   9: 
  10: export interface GrokMessage {
  11:   role: 'user' | 'assistant'
  12:   content: string
  13:   timestamp: number
  14: }
  41: export function useGrokRealtime(): UseGrokRealtimeReturn {
  42:   const [status, setStatus] = useState<GrokStatus>('idle')
  43:   const [messages, setMessages] = useState<GrokMessage[]>([])
  44:   const [error, setError] = useState<string | null>(null)
  45:   const [isConnected, setIsConnected] = useState(false)
  46:   const [isListening, setIsListening] = useState(false)
```

`frontend/src/hooks/useGrokRealtime.ts`
```ts
 244:   const appendAssistantDelta = useCallback((delta: string) => {
 245:     if (!delta) return
 246:     if (!conversationInsertedRef.current) {
 247:       void persistConversationStart()
 248:     }
 249: 
 250:     setMessages((prev) => {
 251:       const existingIndex = currentAssistantIndexRef.current
 252:       if (existingIndex === null) {
 253:         const nextIndex = prev.length
 254:         currentAssistantIndexRef.current = nextIndex
 255:         return [...prev, { role: 'assistant', content: delta, timestamp: Date.now() }]
 256:       }
 257: 
 258:       return prev.map((message, index) => (
 259:         index === existingIndex
 260:           ? { ...message, content: message.content + delta }
 261:           : message
 262:       ))
 263:     })
 264:   }, [persistConversationStart])
 265: 
 266:   const appendUserTranscript = useCallback((transcript: string) => {
 267:     if (!transcript) return
 268:     setMessages((prev) => [...prev, {
 269:       role: 'user',
 270:       content: transcript,
 271:       timestamp: Date.now(),
 272:     }])
 273:   }, [])
```

`frontend/src/hooks/useGrokRealtime.ts`
```ts
 539:   const startSession = useCallback(async (params: StartGrokSessionParams) => {
 540:     // iOS audio unlock must run inside the user gesture before any await.
 541:     primeAudioForIOS()
 542:     await teardownSession()
 543: 
 544:     conversationIdRef.current = crypto.randomUUID()
 545:     sessionParamsRef.current = params
 546:     conversationInsertedRef.current = false
 547:     endedConversationIdsRef.current.delete(conversationIdRef.current)
 548:     currentAssistantIndexRef.current = null
 549:     pendingPcmChunksRef.current = []
 550:     pendingPcmSampleCountRef.current = 0
 551:     playheadRef.current = 0
 552:     setMessages([])
 553:     setError(null)
 554: 
 555:     await connectAndConfigure(params)
 556:   }, [connectAndConfigure, primeAudioForIOS, teardownSession])
```

Finding: `messages` is an in-memory array of `{ role, content, timestamp }`. User turns are appended as whole new rows. Assistant turns are appended as deltas into the current assistant row until `response.done` clears `currentAssistantIndexRef`. `messages` is reset on `startSession()`, not on `endSession()`.

### A5. Grok State-3 transcript render path in `Speak.tsx`

State-3 locator and bubble render:

`frontend/src/pages/Speak.tsx`
```tsx
 650:   if (activeProvider === 'grok' && grokSessionActive) {
 651:     const grokCategoryLabel = getGrokCategoryLabel(selectedGrokCategory)
 652:     const grokHeaderName = selectedGrokVoice ? `${grokCategoryLabel} · ${selectedGrokVoice}` : grokCategoryLabel
 653: 
 654:     return (
 655:       <div className="fixed inset-x-0 bottom-0 top-16 sm:top-20 z-30 flex flex-col bg-gray-950">
```

`frontend/src/pages/Speak.tsx`
```tsx
 695:         <div
 696:           ref={chatRef}
 697:           className="flex-1 overflow-y-auto px-4 py-4 space-y-3 max-w-5xl mx-auto w-full"
 698:           style={{ scrollbarWidth: 'thin' }}
 699:         >
 700:           {grok.messages.map((msg, i) => (
 701:             <div
 702:               key={`${msg.role}-${msg.timestamp}-${i}`}
 703:               className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
 704:             >
 705:               <div
 706:                 className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
 707:                   msg.role === 'user'
 708:                     ? 'bg-violet-900/50 text-white rounded-br-sm'
 709:                     : 'bg-gray-800/60 text-gray-100 rounded-bl-sm'
 710:                 }`}
 711:               >
 712:                 <p>{msg.content}</p>
 713:               </div>
 714:             </div>
 715:           ))}
```

Placeholder / typing state in the same branch:

`frontend/src/pages/Speak.tsx`
```tsx
 756:           {grok.status === 'connecting' && (
 757:             <div className="flex justify-start">
 758:               <TypingIndicator />
 759:             </div>
 760:           )}
 761: 
 762:           {grok.messages.length === 0 && grok.status !== 'connecting' && (
 763:             <div className="flex items-center justify-center h-full text-gray-600 text-sm">
 764:               {t('speak.waitingGreeting')}
 765:             </div>
 766:           )}
```

Finding: the render is driven directly by `grok.messages`. It includes in-flight assistant transcript, because assistant deltas are appended before `response.done`. It does not include user transcript deltas, because only `.completed` user-transcript events are appended.

### A6. Whether transcript state is sent back to xAI / Realtime server

Pinned outbound WebSocket sends:

```text
b2c5153:frontend/src/hooks/useGrokRealtime.ts:445:          ws.send(JSON.stringify(buildGrokSessionConfig(params)))
b2c5153:frontend/src/hooks/useGrokRealtime.ts:446:          ws.send(JSON.stringify({ type: 'response.create' }))
b2c5153:frontend/src/hooks/useGrokRealtime.ts:518:        ws.send(JSON.stringify({
```

Actual code:

`frontend/src/hooks/useGrokRealtime.ts`
```ts
 443:       ws.onopen = () => {
 444:         try {
 445:           ws.send(JSON.stringify(buildGrokSessionConfig(params)))
 446:           ws.send(JSON.stringify({ type: 'response.create' }))
 447:           setIsConnected(true)
 448:           setStatus('idle')
 449:           settled = true
 450:           resolve()
 451:         } catch (err) {
 452:           settled = true
 453:           reject(err)
 454:         }
 455:       }
```

`frontend/src/hooks/useGrokRealtime.ts`
```ts
 514:       worklet.port.onmessage = (event: MessageEvent<{ type?: string; data?: string }>) => {
 515:         if (event.data?.type !== 'pcm' || !event.data.data) return
 516:         const ws = wsRef.current
 517:         if (!ws || ws.readyState !== WebSocket.OPEN) return
 518:         ws.send(JSON.stringify({
 519:           type: 'input_audio_buffer.append',
 520:           audio: btoa(event.data.data),
 521:         }))
 522:       }
```

`frontend/src/hooks/useGrokRealtime.ts`
```ts
 369:   const stopListening = useCallback(() => {
 370:     if (workletRef.current) {
 371:       workletRef.current.port.onmessage = null
 372:       try { workletRef.current.disconnect() } catch { /* ignore */ }
 373:       workletRef.current = null
 374:     }
 375:     if (micSourceRef.current) {
 376:       try { micSourceRef.current.disconnect() } catch { /* ignore */ }
 377:       micSourceRef.current = null
 378:     }
 379:     if (streamRef.current) {
 380:       streamRef.current.getTracks().forEach((track) => track.stop())
 381:       streamRef.current = null
 382:     }
 383:     if (mountedRef.current) {
 384:       setIsListening(false)
 385:       if (statusRef.current === 'listening') setStatus(isConnectedRef.current ? 'idle' : 'idle')
 386:     }
 387:   }, [])
```

Finding: no client transcript is sent back to xAI. The client sends session config, one `response.create` on session open, and streaming PCM audio chunks. It does **not** send `conversation.item.create`, synthesized transcript text, or `input_audio_buffer.commit` on tap-to-send.

### A7. Other code paths that surface mid-session text to the user

Corrections fetch / shared transcript payload:

`frontend/src/pages/Speak.tsx`
```tsx
  98:   const selectedLang = LANGUAGES.find((l) => l.code === tutor.language)
  99:   const activeMessages = activeProvider === 'grok' && grokSessionActive ? grok.messages : tutor.messages
 135:   const fetchCorrections = async () => {
 136:     if (correctionsLoading || activeMessages.length < 4 || !tutor.language) return
 137:     setCorrectionsLoading(true)
 138:     try {
 139:       const res = await fetch('/api/voice-chat', {
 140:         method: 'POST',
 141:         headers: { 'Content-Type': 'application/json' },
 142:         body: JSON.stringify({
 143:           mode: 'corrections',
 144:           transcript: activeMessages.map((m) => ({ role: m.role, content: m.content })),
 145:           language: tutor.language,
 146:           native_language: baseLangCode || 'en',
 147:         }),
 148:       })
```

Grok corrections render:

`frontend/src/pages/Speak.tsx`
```tsx
 717:           {grok.messages.length >= 4 && (
 718:             <div className="mt-6 flex flex-col items-center gap-4">
 719:               {corrections === null ? (
 720:                 <button
 721:                   onClick={fetchCorrections}
 722:                   disabled={correctionsLoading}
 723:                   className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-colors border border-white/10 disabled:opacity-50"
 724:                 >
 725:                   {correctionsLoading ? (
 726:                     <>
 727:                       <Loader2 className="h-3.5 w-3.5 animate-spin" />
 728:                       <span>{t('speak.reviewLoading')}</span>
 729:                     </>
 730:                   ) : (
 731:                     <>
 732:                       <span>📝</span>
 733:                       <span>{t('speak.reviewButton')}</span>
 734:                     </>
 735:                   )}
 736:                 </button>
 737:               ) : corrections.length === 0 ? (
 738:                 <div className="text-center text-sm text-green-400/80 px-4 py-3 bg-green-900/20 rounded-lg">
 739:                   ✅ {t('speak.reviewPerfect')}
 740:                 </div>
 741:               ) : (
 742:                 <div className="w-full max-w-lg space-y-3">
 743:                   <p className="text-xs text-gray-500 text-center mb-2">{t('speak.reviewTitle')}</p>
 744:                   {corrections.map((c, i) => (
 745:                     <div key={i} className="bg-white/5 rounded-lg p-3 space-y-1">
 746:                       <p className="text-sm text-red-400/80 line-through">{c.original}</p>
 747:                       <p className="text-sm text-green-400/80">{c.corrected}</p>
 748:                       <p className="text-xs text-gray-500">{c.explanation}</p>
 749:                     </div>
 750:                   ))}
 751:                 </div>
 752:               )}
 753:             </div>
 754:           )}
```

Visible Grok error text:

`frontend/src/pages/Speak.tsx`
```tsx
 783:             {grok.error && (
 784:               <p className="text-red-400 text-xs text-center mb-3">{grok.error}</p>
 785:             )}
```

Finding:

- Mid-session transcript is user-visible through Grok chat bubbles.
- Mid-session transcript is also sent to `/api/voice-chat` for the corrections flow and then re-surfaced in the corrections panel.
- No user-facing toast / `useToast` / notification / debug-overlay matches were found in the searched Grok paths.
- `SpeakHistoryPanel` is accessible mid-session, but Grok does not persist `speak_messages`, so it does not currently surface the live Grok transcript from the DB.

## Group B findings

### B1. `isListening` / `status` definitions, set sites, read sites

Pinned grep for `isListening`:

```text
b2c5153:frontend/src/hooks/useGrokRealtime.ts:30:  isListening: boolean
b2c5153:frontend/src/hooks/useGrokRealtime.ts:46:  const [isListening, setIsListening] = useState(false)
b2c5153:frontend/src/hooks/useGrokRealtime.ts:187:          setStatus(isListening ? 'listening' : (isConnected ? 'idle' : 'idle'))
b2c5153:frontend/src/hooks/useGrokRealtime.ts:310:          setStatus(isListening ? 'listening' : 'idle')
b2c5153:frontend/src/hooks/useGrokRealtime.ts:497:    if (isListening) return
b2c5153:frontend/src/hooks/useGrokRealtime.ts:574:    isListening,
b2c5153:frontend/src/pages/Speak.tsx:802:                  if (grok.isListening) {
b2c5153:frontend/src/pages/Speak.tsx:812:                  grok.isListening
b2c5153:frontend/src/pages/Speak.tsx:822:                aria-label={grok.isListening ? 'Tap to stop listening' : 'Tap to speak'}
b2c5153:frontend/src/pages/Speak.tsx:828:                ) : grok.isListening ? (
```

Pinned grep for `setIsListening(...)`:

```text
b2c5153:frontend/src/hooks/useGrokRealtime.ts:384:      setIsListening(false)
b2c5153:frontend/src/hooks/useGrokRealtime.ts:420:      setIsListening(false)
b2c5153:frontend/src/hooks/useGrokRealtime.ts:478:          setIsListening(false)
b2c5153:frontend/src/hooks/useGrokRealtime.ts:526:      setIsListening(true)
```

Definitions:

`frontend/src/hooks/useGrokRealtime.ts`
```ts
  25: export interface UseGrokRealtimeReturn {
  26:   status: GrokStatus
  27:   messages: GrokMessage[]
  28:   error: string | null
  29:   isConnected: boolean
  30:   isListening: boolean
  31:   startSession: (params: StartGrokSessionParams) => Promise<void>
  32:   endSession: () => Promise<void>
  33:   startListening: () => void
  34:   stopListening: () => void
  35: }
  41: export function useGrokRealtime(): UseGrokRealtimeReturn {
  42:   const [status, setStatus] = useState<GrokStatus>('idle')
  43:   const [messages, setMessages] = useState<GrokMessage[]>([])
  44:   const [error, setError] = useState<string | null>(null)
  45:   const [isConnected, setIsConnected] = useState(false)
  46:   const [isListening, setIsListening] = useState(false)
```

Status set sites:

```text
b2c5153:frontend/src/hooks/useGrokRealtime.ts:187:          setStatus(isListening ? 'listening' : (isConnected ? 'idle' : 'idle'))
b2c5153:frontend/src/hooks/useGrokRealtime.ts:193:    if (mountedRef.current) setStatus('speaking')
b2c5153:frontend/src/hooks/useGrokRealtime.ts:310:          setStatus(isListening ? 'listening' : 'idle')
b2c5153:frontend/src/hooks/useGrokRealtime.ts:320:        if (mountedRef.current) setStatus('listening')
b2c5153:frontend/src/hooks/useGrokRealtime.ts:332:          setStatus('error')
b2c5153:frontend/src/hooks/useGrokRealtime.ts:385:      if (statusRef.current === 'listening') setStatus(isConnectedRef.current ? 'idle' : 'idle')
b2c5153:frontend/src/hooks/useGrokRealtime.ts:421:      setStatus('idle')
b2c5153:frontend/src/hooks/useGrokRealtime.ts:432:    setStatus('connecting')
b2c5153:frontend/src/hooks/useGrokRealtime.ts:448:          setStatus('idle')
b2c5153:frontend/src/hooks/useGrokRealtime.ts:469:          setStatus('error')
b2c5153:frontend/src/hooks/useGrokRealtime.ts:484:          setStatus('idle')
b2c5153:frontend/src/hooks/useGrokRealtime.ts:494:      setStatus('error')
b2c5153:frontend/src/hooks/useGrokRealtime.ts:527:      setStatus('listening')
b2c5153:frontend/src/hooks/useGrokRealtime.ts:531:      setStatus('error')
```

### B2. Mic button JSX and visual-state logic

`frontend/src/pages/Speak.tsx`
```tsx
 787:             <p className="text-xs text-gray-500 text-center mb-3 h-4">
 788:               {grok.status === 'idle' && t('speak.tapToSpeak')}
 789:               {grok.status === 'listening' && (
 790:                 <span className="text-red-400">{t('speak.recording')}</span>
 791:               )}
 792:               {grok.status === 'connecting' && t('speak.thinking')}
 793:               {grok.status === 'speaking' && (
 794:                 <span className="text-violet-300">{t('speak.speaking')}</span>
 795:               )}
 796:               {grok.status === 'error' && t('speak.tapRetry')}
 797:             </p>
 798: 
 799:             <div className="flex justify-center">
 800:               <button
 801:                 onClick={() => {
 802:                   if (grok.isListening) {
 803:                     grok.stopListening()
 804:                   } else if (grok.status !== 'connecting') {
 805:                     grok.startListening()
 806:                   }
 807:                 }}
 808:                 onContextMenu={(e) => e.preventDefault()}
 809:                 disabled={grok.status === 'connecting'}
 810:                 style={{ WebkitTouchCallout: 'none' }}
 811:                 className={`w-16 h-16 rounded-full flex items-center justify-center transition-all select-none touch-none ${
 812:                   grok.isListening
 813:                     ? 'bg-red-600 animate-pulse scale-110'
 814:                     : grok.status === 'connecting'
 815:                       ? 'bg-gray-700 cursor-not-allowed'
 816:                       : grok.status === 'speaking'
 817:                         ? 'bg-violet-700'
 818:                         : grok.status === 'error'
 819:                           ? 'bg-gray-800 hover:bg-gray-700'
 820:                           : 'bg-gray-800 hover:bg-gray-700 active:scale-95'
 821:                 }`}
 822:                 aria-label={grok.isListening ? 'Tap to stop listening' : 'Tap to speak'}
 823:               >
 824:                 {grok.status === 'connecting' ? (
 825:                   <Loader2 className="h-7 w-7 text-gray-400 animate-spin" />
 826:                 ) : grok.status === 'speaking' ? (
 827:                   <Volume2 className="h-7 w-7 text-violet-200" />
 828:                 ) : grok.isListening ? (
 829:                   <Square className="h-6 w-6 text-white fill-white" />
 830:                 ) : (
 831:                   <Mic className="h-7 w-7 text-gray-300" />
 832:                 )}
 833:               </button>
```

Current visual states:

- Red pulse / enlarged button: `grok.isListening`.
- Gray spinner / disabled: `grok.status === 'connecting'`.
- Violet speaker icon: `grok.status === 'speaking'`.
- Error and idle both use gray button variants.
- There is no dedicated “sending / processing after stop” state.

### B3. Exact `stopListening()` sequence

Tap path from State-3 button:

`frontend/src/pages/Speak.tsx`
```tsx
 800:               <button
 801:                 onClick={() => {
 802:                   if (grok.isListening) {
 803:                     grok.stopListening()
 804:                   } else if (grok.status !== 'connecting') {
 805:                     grok.startListening()
 806:                   }
 807:                 }}
```

`stopListening()` body:

`frontend/src/hooks/useGrokRealtime.ts`
```ts
 369:   const stopListening = useCallback(() => {
 370:     if (workletRef.current) {
 371:       workletRef.current.port.onmessage = null
 372:       try { workletRef.current.disconnect() } catch { /* ignore */ }
 373:       workletRef.current = null
 374:     }
 375:     if (micSourceRef.current) {
 376:       try { micSourceRef.current.disconnect() } catch { /* ignore */ }
 377:       micSourceRef.current = null
 378:     }
 379:     if (streamRef.current) {
 380:       streamRef.current.getTracks().forEach((track) => track.stop())
 381:       streamRef.current = null
 382:     }
 383:     if (mountedRef.current) {
 384:       setIsListening(false)
 385:       if (statusRef.current === 'listening') setStatus(isConnectedRef.current ? 'idle' : 'idle')
 386:     }
 387:   }, [])
```

Finding: `stopListening()` only tears down local microphone graph and flips local state. It does **not** send any WebSocket message, commit buffered audio, or request a response turn.

### B4. “Thinking / generating” state after send

There is no dedicated generating state after a user turn. The only “thinking” label in the Grok UI is keyed off `status === 'connecting'`, which is session-start state.

`frontend/src/pages/Speak.tsx`
```tsx
 787:             <p className="text-xs text-gray-500 text-center mb-3 h-4">
 788:               {grok.status === 'idle' && t('speak.tapToSpeak')}
 789:               {grok.status === 'listening' && (
 790:                 <span className="text-red-400">{t('speak.recording')}</span>
 791:               )}
 792:               {grok.status === 'connecting' && t('speak.thinking')}
 793:               {grok.status === 'speaking' && (
 794:                 <span className="text-violet-300">{t('speak.speaking')}</span>
 795:               )}
```

`frontend/src/hooks/useGrokRealtime.ts`
```ts
 432:     setStatus('connecting')
 448:           setStatus('idle')
```

Finding: after `stopListening()`, the hook falls back to `idle`; it does not enter a post-send waiting state while the server is composing a response.

### B5. “Playing” state for streamed Grok audio

`frontend/src/hooks/useGrokRealtime.ts`
```ts
 164:   const queueAudioBuffer = useCallback(async (pcm: Int16Array) => {
 165:     if (pcm.length === 0) return
 166:     const ctx = await ensureAudioContext()
 167:     const audioBuffer = ctx.createBuffer(1, pcm.length, PCM_SAMPLE_RATE)
 168:     const channel = audioBuffer.getChannelData(0)
 169:     for (let i = 0; i < pcm.length; i++) {
 170:       channel[i] = pcm[i] / 0x8000
 171:     }
 172: 
 173:     const source = ctx.createBufferSource()
 174:     source.buffer = audioBuffer
 175:     source.connect(ctx.destination)
 176: 
 177:     const startAt = Math.max(ctx.currentTime, playheadRef.current)
 178:     playheadRef.current = startAt + audioBuffer.duration
 179:     audioQueueRef.current.push(source)
 180: 
 181:     source.onended = () => {
 182:       try { source.disconnect() } catch { /* ignore */ }
 183:       audioQueueRef.current = audioQueueRef.current.filter((node) => node !== source)
 184:       if (audioQueueRef.current.length === 0) {
 185:         playheadRef.current = 0
 186:         if (mountedRef.current) {
 187:           setStatus(isListening ? 'listening' : (isConnected ? 'idle' : 'idle'))
 188:         }
 189:       }
 190:     }
 191: 
 192:     source.start(startAt)
 193:     if (mountedRef.current) setStatus('speaking')
 194:   }, [ensureAudioContext, isConnected, isListening])
```

Finding: there is a playback state, but it is named `speaking`, entered when the first queued PCM buffer is scheduled, and exited when the queue drains. The State-3 button is **not** disabled during this state; only `connecting` disables it.

### B6. B5 handoff root cause (“mic button stays red after send”)

Evidence:

- Red state is keyed off `grok.isListening`, not `grok.status`.
- `stopListening()` is the **only** code path that clears `isListening`.
- Server response events (`response.output_audio.delta`, `response.done`) do not clear `isListening`.
- The render prioritizes `grok.isListening` before `grok.status === 'speaking'`.

Relevant code:

`frontend/src/pages/Speak.tsx`
```tsx
 811:                 className={`w-16 h-16 rounded-full flex items-center justify-center transition-all select-none touch-none ${
 812:                   grok.isListening
 813:                     ? 'bg-red-600 animate-pulse scale-110'
 814:                     : grok.status === 'connecting'
 815:                       ? 'bg-gray-700 cursor-not-allowed'
 816:                       : grok.status === 'speaking'
 817:                         ? 'bg-violet-700'
 818:                         : grok.status === 'error'
 819:                           ? 'bg-gray-800 hover:bg-gray-700'
 820:                           : 'bg-gray-800 hover:bg-gray-700 active:scale-95'
 821:                 }`}
```

`frontend/src/hooks/useGrokRealtime.ts`
```ts
 290:       case 'response.output_audio.delta': {
 291:         const delta = typeof payload.delta === 'string' ? payload.delta : ''
 292:         if (!delta) break
 ...
 301:         if (pendingPcmSampleCountRef.current >= PCM_FLUSH_SAMPLES) {
 302:           await flushPendingAudio()
 303:         }
 304:         break
 305:       }
 306:       case 'response.done': {
 307:         await flushPendingAudio()
 308:         currentAssistantIndexRef.current = null
 309:         if (mountedRef.current && audioQueueRef.current.length === 0) {
 310:           setStatus(isListening ? 'listening' : 'idle')
 311:         }
 312:         break
 313:       }
```

`frontend/src/hooks/useGrokRealtime.ts`
```ts
 383:     if (mountedRef.current) {
 384:       setIsListening(false)
 385:       if (statusRef.current === 'listening') setStatus(isConnectedRef.current ? 'idle' : 'idle')
 386:     }
```

Finding: the static code does **not** point to stale className logic. The brittle part is split state: red is controlled by `isListening`, playback by `status`, and only the tap-stop path clears `isListening`. If the runtime reaches server response without `stopListening()` clearing `isListening`, the button stays red because the render gives `grok.isListening` priority over `grok.status === 'speaking'`. The code also lacks any distinct post-send state.

## Group C findings

### C1. `grokSessionConfig.ts` in full

`frontend/src/lib/grokSessionConfig.ts`
```ts
   1: import type { GrokCategory } from '../data/grokCategories'
   2: import type { GrokVoice } from '../data/grokVoices'
   3: import { GROK_CATEGORIES, GROK_FREE_CHAT_PROMPT } from '../data/grokCategories'
   4: import { getGrokLevelInstructions, type GrokLevel } from './grokPedagogy'
   5: 
   6: export interface BuildGrokSessionParams {
   7:   language: string
   8:   languageDisplay: string
   9:   level: GrokLevel
  10:   nativeLanguageDisplay: string
  11:   voice: GrokVoice
  12:   category: GrokCategory | null
  13: }
  14: 
  15: export interface GrokSessionConfig {
  16:   type: 'session.update'
  17:   session: {
  18:     voice: GrokVoice
  19:     instructions: string
  20:     turn_detection: { type: 'server_vad' }
  21:     tools: Array<{ type: 'web_search' }>
  22:     audio: {
  23:       input: { format: { type: 'audio/pcm'; rate: 24000 } }
  24:       output: { format: { type: 'audio/pcm'; rate: 24000 } }
  25:     }
  26:   }
  27: }
  28: 
  29: export function buildGrokSessionConfig(p: BuildGrokSessionParams): GrokSessionConfig {
  30:   const levelText = getGrokLevelInstructions(p.languageDisplay, p.nativeLanguageDisplay, p.level)
  31:   const categoryPrompt = p.category
  32:     ? GROK_CATEGORIES.find(c => c.id === p.category)!.systemPrompt
  33:     : GROK_FREE_CHAT_PROMPT
  34:   const tail =
  35:     `Start by greeting the user naturally in ${p.languageDisplay} and entering the situation immediately. ` +
  36:     `Do not announce what scenario you have chosen. ` +
  37:     `Keep responses conversational and short — typically 1 to 3 sentences per turn.`
  38: 
  39:   const instructions = `${levelText}\n\n${categoryPrompt}\n\n${tail}`
  40: 
  41:   return {
  42:     type: 'session.update',
  43:     session: {
  44:       voice: p.voice,
  45:       instructions,
  46:       turn_detection: { type: 'server_vad' },
  47:       tools: [{ type: 'web_search' }],
  48:       audio: {
  49:         input: { format: { type: 'audio/pcm', rate: 24000 } },
  50:         output: { format: { type: 'audio/pcm', rate: 24000 } },
  51:       },
  52:     },
  53:   }
  54: }
```

### C2. `grokPedagogy.ts` in full

`frontend/src/lib/grokPedagogy.ts`
```ts
   1: // Pedagogy text for Grok Voice Agent.
   2: // DUPLICATED from frontend/api/prompts/_shared/pedagogy.ts:getLevelInstructions per the
   3: // Grok V2 design doc standalone invariant (zero changes to the existing prompts/ tree).
   4: // If pedagogy text is updated in _shared/pedagogy.ts, consider replicating here.
   5: 
   6: export type GrokLevel = 'zero' | 'beginner' | 'intermediate' | 'advanced'
   7: 
   8: export function getGrokLevelInstructions(targetLang: string, nativeLang: string, level: GrokLevel): string {
   9:   // Same-language mode: drop bilingual framing, focus on depth and enrichment
  10:   if (targetLang === nativeLang) {
  11:     switch (level) {
  12:       case 'zero':
  13:         return `LEVEL: VOCABULARY BUILDER — The student wants to expand their ${targetLang} vocabulary.
  14: 
  15: - Speak entirely in ${targetLang}.
  16: - You receive text transcriptions of speech, not audio. If the student's reply shows they understood, that is success. Move forward. Never ask them to say the same word again.
  17: - Introduce 1-2 interesting or uncommon words per turn. Give a brief meaning, use it in a sentence, and connect it to what you're talking about.
  18: - Let the conversation guide what you teach. If they mention food, share a vivid food-related word. If they mention feelings, teach a more precise emotion word.
  19: - Make every turn interesting — share word origins, surprising meanings, or cultural context behind expressions.`
  20: 
  21:       case 'beginner':
  22:         return `LEVEL: EXPRESSION BUILDER — The student wants to speak ${targetLang} more naturally.
  23: 
  24: - Speak entirely in ${targetLang}.
  25: - You receive text transcriptions, not audio. If the student's response shows they understood or tried, that is success. Never ask them to repeat a phrase.
  26: - Focus on natural phrasing — when the student says something that's correct but stiff, show them a more natural way to express it by weaving it into your reply.
  27: - Introduce common expressions, phrasal constructions, and everyday idioms that make speech sound fluent rather than textbook.
  28: - Keep conversations real — ask about their life, react to what they say, share interesting observations. Build confidence through genuine engagement.`
  29: 
  30:       case 'advanced':
  31:         return `LEVEL: MASTERY — The student wants to refine and deepen their ${targetLang}.
  32: 
  33: - Speak entirely in ${targetLang} at full native complexity.
  34: - When you notice awkward phrasing, model a more polished version in your next sentence. If a pattern recurs, mention it briefly — but never let correction dominate the conversation.
  35: - Push for depth: challenge their opinions, introduce hypothetical scenarios, ask questions that require nuance. Make them think precisely.
  36: - Introduce register — show the difference between casual, professional, and formal ways to express the same idea. Explore tone, connotation, and word choice.
  37: - Discuss whatever interests them at full intellectual depth: philosophy, culture, humor, storytelling, debate.`
  38: 
  39:       default: // intermediate
  40:         return `LEVEL: FLUENCY PRACTICE — The student wants more natural, expressive ${targetLang}.
  41: 
  42: - Speak entirely in ${targetLang}.
  43: - Match their level — if they speak simply, keep it accessible. If they stretch for complex ideas, meet them there.
  44: - Introduce useful connectors, collocations, and transitions (words like "however," "actually," "on the other hand") that make speech flow naturally.
  45: - Have real conversations — discuss opinions, share observations, explore topics they care about. The conversation itself is the practice.
  46: - When they express an idea awkwardly, show a smoother version naturally in your reply without stopping to explain.`
  47:     }
  48:   }
  49: 
  50:   switch (level) {
  51:     case 'zero':
  52:       return `LEVEL: COMPLETE ZERO — The student is just starting with ${targetLang}.
  53: 
  54: LANGUAGE MIX: About 70% ${nativeLang}, 30% ${targetLang}.
  55: - You receive text transcriptions of speech, not audio. If the student's reply contains the target word or a recognizable attempt, that is success. Move forward. Never ask them to say the same word again.
  56: - Weave 1-2 new words into natural conversation each turn. Say the word, give a brief meaning, and use it in a sentence or question — like a friend sharing their language, not a teacher running a drill.
  57: - Let the conversation guide what you teach. If the student mentions they're tired, teach them the word for "tired." If they talk about food, teach a food word. Read their mood and match it.
  58: - Occasionally ask what ${targetLang} words they already know — it gives them a chance to show off and feel confident. Build on whatever they share by teaching related words.
  59: - Every turn should feel like progress. Share a fun cultural detail, a surprising word origin, or an interesting fact about ${targetLang} to keep things alive.`
  60: 
  61:     case 'beginner':
  62:       return `LEVEL: BEGINNER — The student knows basic words and simple phrases in ${targetLang}.
  63: 
  64: LANGUAGE MIX: About 50% ${nativeLang}, 50% ${targetLang}.
  65: - Speak in short, natural ${targetLang} sentences and let context do the teaching. If a sentence has a new word, briefly clarify in ${nativeLang} and keep going.
  66: - You receive text transcriptions, not audio. If the student's response shows they understood or tried, that is success. Never ask them to repeat a word.
  67: - When the student uses ${nativeLang}, respond with the ${targetLang} version woven into your reply — show them how to say it, don't assign it.
  68: - Build on what they know. If they use a word correctly, introduce a related one. If they talk about their day, teach words that fit their story.
  69: - Keep conversations real — ask about their life, share a cultural insight, react to what they say. A beginner can have an interesting conversation with the right support.`
  70: 
  71:     case 'advanced':
  72:       return `LEVEL: ADVANCED — The student wants fluent, challenging practice in ${targetLang}.
  73: 
  74: LANGUAGE MIX: 95-100% ${targetLang}. Use ${nativeLang} only if explicitly asked.
  75: - Speak as you would to a fellow native speaker — natural speed, idioms, slang, cultural references. Don't simplify.
  76: - When you notice a grammar pattern they struggle with, model the correct form once in your next sentence. If the same error recurs, mention it briefly — but never let correction dominate the conversation.
  77: - Push for depth: ask follow-up questions, challenge their opinions, introduce hypothetical scenarios. Make them think in ${targetLang}, not just speak it.
  78: - Introduce register — show them the difference between casual, polite, and formal ways to express the same idea. This is what separates fluent from advanced.
  79: - Discuss whatever interests them at full intellectual depth: philosophy, culture, current events, personal dilemmas, humor, storytelling.`
  80: 
  81:     default: // intermediate
  82:       return `LEVEL: INTERMEDIATE — The student can hold a conversation in ${targetLang} with support.
  83: 
  84: LANGUAGE MIX: About 80% ${targetLang}, 20% ${nativeLang}.
  85: - Speak primarily in ${targetLang}. Switch to ${nativeLang} only when the student is visibly stuck or asks for help.
  86: - Match their level — if they speak simply, keep it accessible. If they stretch for complex ideas, meet them there.
  87: - If the student falls back to ${nativeLang} for multiple turns, gently invite them back to ${targetLang} by offering a simple way to express what they're trying to say.
  88: - Have real conversations — discuss opinions, share cultural context, explore topics they care about. At this level, the conversation itself is the lesson.
  89: - Introduce useful expressions, collocations, and connectors (words like "however," "actually," "by the way" in ${targetLang}) that make speech sound more natural.`
  90:   }
  91: }
```

### C3. `_shared` pedagogy / prompt source duplicated by `grokPedagogy.ts`

The pinned Grok file imports from no `_shared` file at runtime. The file comment says it duplicates `frontend/api/prompts/_shared/pedagogy.ts:getLevelInstructions`.

`frontend/api/prompts/_shared/pedagogy.ts`
```ts
   1: // Shared pedagogy primitives used by every provider module.
   2: // Language names, level-scaled teaching instructions, study-word addendum.
   3: 
   4: export interface CharacterPayload {
   5:   name: string
   6:   tier: 'style' | 'persona' | 'public'
   7:   identity?: string
   8:   directive: string
   9: }
  10: 
  11: export interface StudyWord {
  12:   word: string
  13:   translation: string
  14: }
  15: 
  16: export const LANGUAGE_CONFIG: Record<string, { name: string; nativeName: string; encouragement: string }> = {
  17:   en: { name: 'English', nativeName: 'English', encouragement: 'Great job! / Well done! / That\'s right!' },
  18:   de: { name: 'German', nativeName: 'Deutsch', encouragement: 'Sehr gut! / Prima! / Genau!' },
  19:   fr: { name: 'French', nativeName: 'Français', encouragement: 'Très bien! / Bravo! / C\'est parfait!' },
  20:   it: { name: 'Italian', nativeName: 'Italiano', encouragement: 'Molto bene! / Bravissimo! / Perfetto!' },
  21:   es: { name: 'Spanish', nativeName: 'Español', encouragement: '¡Muy bien! / ¡Excelente! / ¡Perfecto!' },
  22:   pt: { name: 'Portuguese', nativeName: 'Português', encouragement: 'Muito bem! / Ótimo! / Perfeito!' },
  23:   nl: { name: 'Dutch', nativeName: 'Nederlands', encouragement: 'Heel goed! / Prima! / Uitstekend!' },
  24:   hi: { name: 'Hindi', nativeName: 'हिन्दी', encouragement: 'बहुत अच्छा! / शाबाश! / बिल्कुल सही!' },
  25:   ar:  { name: 'Arabic',    nativeName: 'العربية',          encouragement: '!أحسنت / !ممتاز / !رائع' },
  26:   fil: { name: 'Filipino',  nativeName: 'Filipino',         encouragement: 'Magaling! / Napakahusay! / Tama!' },
  27:   id:  { name: 'Indonesian', nativeName: 'Bahasa Indonesia', encouragement: 'Bagus sekali! / Hebat! / Benar!' },
  28:   ko:  { name: 'Korean',    nativeName: '한국어',            encouragement: '잘했어요! / 훌륭해요! / 맞아요!' },
  29: }
  30: 
  31: // Native language names for browser language codes not in LANGUAGE_CONFIG
  32: export const NATIVE_LANGUAGE_NAMES: Record<string, string> = {
  33:   en: 'English', de: 'German', fr: 'French', it: 'Italian',
  34:   es: 'Spanish', pt: 'Portuguese', nl: 'Dutch', hi: 'Hindi',
  35:   ar: 'Arabic', fil: 'Filipino', id: 'Indonesian', ko: 'Korean',
  36:   zh: 'Chinese', ja: 'Japanese', ru: 'Russian', tr: 'Turkish',
  37:   pl: 'Polish', th: 'Thai', vi: 'Vietnamese', sv: 'Swedish',
  38:   da: 'Danish', no: 'Norwegian', fi: 'Finnish', cs: 'Czech',
  39:   uk: 'Ukrainian', ro: 'Romanian', hu: 'Hungarian', el: 'Greek',
  40:   he: 'Hebrew', ms: 'Malay', tl: 'Tagalog',
  41: }
  42: 
  43: export function resolveNativeLangName(nativeLang: string): string {
  44:   return LANGUAGE_CONFIG[nativeLang]?.name || NATIVE_LANGUAGE_NAMES[nativeLang] || 'English'
  45: }
  46: 
  47: export function getLevelInstructions(targetLang: string, nativeLang: string, level: string): string {
  48:   // Same-language mode: drop bilingual framing, focus on depth and enrichment
  49:   if (targetLang === nativeLang) {
  50:     switch (level) {
  51:       case 'zero':
  52:         return `LEVEL: VOCABULARY BUILDER — The student wants to expand their ${targetLang} vocabulary.
  53: 
  54: - Speak entirely in ${targetLang}.
  55: - You receive text transcriptions of speech, not audio. If the student's reply shows they understood, that is success. Move forward. Never ask them to say the same word again.
  56: - Introduce 1-2 interesting or uncommon words per turn. Give a brief meaning, use it in a sentence, and connect it to what you're talking about.
  57: - Let the conversation guide what you teach. If they mention food, share a vivid food-related word. If they mention feelings, teach a more precise emotion word.
  58: - Make every turn interesting — share word origins, surprising meanings, or cultural context behind expressions.`
  59: 
  60:       case 'beginner':
  61:         return `LEVEL: EXPRESSION BUILDER — The student wants to speak ${targetLang} more naturally.
  62: 
  63: - Speak entirely in ${targetLang}.
  64: - You receive text transcriptions, not audio. If the student's response shows they understood or tried, that is success. Never ask them to repeat a phrase.
  65: - Focus on natural phrasing — when the student says something that's correct but stiff, show them a more natural way to express it by weaving it into your reply.
  66: - Introduce common expressions, phrasal constructions, and everyday idioms that make speech sound fluent rather than textbook.
  67: - Keep conversations real — ask about their life, react to what they say, share interesting observations. Build confidence through genuine engagement.`
  68: 
  69:       case 'advanced':
  70:         return `LEVEL: MASTERY — The student wants to refine and deepen their ${targetLang}.
  71: 
  72: - Speak entirely in ${targetLang} at full native complexity.
  73: - When you notice awkward phrasing, model a more polished version in your next sentence. If a pattern recurs, mention it briefly — but never let correction dominate the conversation.
  74: - Push for depth: challenge their opinions, introduce hypothetical scenarios, ask questions that require nuance. Make them think precisely.
  75: - Introduce register — show the difference between casual, professional, and formal ways to express the same idea. Explore tone, connotation, and word choice.
  76: - Discuss whatever interests them at full intellectual depth: philosophy, culture, humor, storytelling, debate.`
  77: 
  78:       default: // intermediate
  79:         return `LEVEL: FLUENCY PRACTICE — The student wants more natural, expressive ${targetLang}.
  80: 
  81: - Speak entirely in ${targetLang}.
  82: - Match their level — if they speak simply, keep it accessible. If they stretch for complex ideas, meet them there.
  83: - Introduce useful connectors, collocations, and transitions (words like "however," "actually," "on the other hand") that make speech flow naturally.
  84: - Have real conversations — discuss opinions, share observations, explore topics they care about. The conversation itself is the practice.
  85: - When they express an idea awkwardly, show a smoother version naturally in your reply without stopping to explain.`
  86:     }
  87:   }
  88: 
  89:   switch (level) {
  90:     case 'zero':
  91:       return `LEVEL: COMPLETE ZERO — The student is just starting with ${targetLang}.
  92: 
  93: LANGUAGE MIX: About 70% ${nativeLang}, 30% ${targetLang}.
  94: - You receive text transcriptions of speech, not audio. If the student's reply contains the target word or a recognizable attempt, that is success. Move forward. Never ask them to say the same word again.
  95: - Weave 1-2 new words into natural conversation each turn. Say the word, give a brief meaning, and use it in a sentence or question — like a friend sharing their language, not a teacher running a drill.
  96: - Let the conversation guide what you teach. If the student mentions they're tired, teach them the word for "tired." If they talk about food, teach a food word. Read their mood and match it.
  97: - Occasionally ask what ${targetLang} words they already know — it gives them a chance to show off and feel confident. Build on whatever they share by teaching related words.
  98: - Every turn should feel like progress. Share a fun cultural detail, a surprising word origin, or an interesting fact about ${targetLang} to keep things alive.`
  99: 
 100:     case 'beginner':
 101:       return `LEVEL: BEGINNER — The student knows basic words and simple phrases in ${targetLang}.
 102: 
 103: LANGUAGE MIX: About 50% ${nativeLang}, 50% ${targetLang}.
 104: - Speak in short, natural ${targetLang} sentences and let context do the teaching. If a sentence has a new word, briefly clarify in ${nativeLang} and keep going.
 105: - You receive text transcriptions, not audio. If the student's response shows they understood or tried, that is success. Never ask them to repeat a word.
 106: - When the student uses ${nativeLang}, respond with the ${targetLang} version woven into your reply — show them how to say it, don't assign it.
 107: - Build on what they know. If they use a word correctly, introduce a related one. If they talk about their day, teach words that fit their story.
 108: - Keep conversations real — ask about their life, share a cultural insight, react to what they say. A beginner can have an interesting conversation with the right support.`
 109: 
 110:     case 'advanced':
 111:       return `LEVEL: ADVANCED — The student wants fluent, challenging practice in ${targetLang}.
 112: 
 113: LANGUAGE MIX: 95-100% ${targetLang}. Use ${nativeLang} only if explicitly asked.
 114: - Speak as you would to a fellow native speaker — natural speed, idioms, slang, cultural references. Don't simplify.
 115: - When you notice a grammar pattern they struggle with, model the correct form once in your next sentence. If the same error recurs, mention it briefly — but never let correction dominate the conversation.
 116: - Push for depth: ask follow-up questions, challenge their opinions, introduce hypothetical scenarios. Make them think in ${targetLang}, not just speak it.
 117: - Introduce register — show them the difference between casual, polite, and formal ways to express the same idea. This is what separates fluent from advanced.
 118: - Discuss whatever interests them at full intellectual depth: philosophy, culture, current events, personal dilemmas, humor, storytelling.`
 119: 
 120:     default: // intermediate
 121:       return `LEVEL: INTERMEDIATE — The student can hold a conversation in ${targetLang} with support.
 122: 
 123: LANGUAGE MIX: About 80% ${targetLang}, 20% ${nativeLang}.
 124: - Speak primarily in ${targetLang}. Switch to ${nativeLang} only when the student is visibly stuck or asks for help.
 125: - Match their level — if they speak simply, keep it accessible. If they stretch for complex ideas, meet them there.
 126: - If the student falls back to ${nativeLang} for multiple turns, gently invite them back to ${targetLang} by offering a simple way to express what they're trying to say.
 127: - Have real conversations — discuss opinions, share cultural context, explore topics they care about. At this level, the conversation itself is the lesson.
 128: - Introduce useful expressions, collocations, and connectors (words like "however," "actually," "by the way" in ${targetLang}) that make speech sound more natural.`
 129:   }
 130: }
 131: 
 132: export function buildStudyAddendum(studyWords?: StudyWord[]): string {
 133:   if (!studyWords || studyWords.length === 0) return ''
 134:   const list = studyWords.map((w) => `${w.word} (${w.translation})`).join(', ')
 135:   return `
 136: 
 137: STUDY FOCUS: The student is currently working on these words:
 138: ${list}
 139: Find natural moments to use these words in conversation. Don't list them or quiz the student directly — weave them into what you're already talking about. Use 2-3 per exchange, not all at once.`
 140: }
```

Finding: the duplicated portion is the `getLevelInstructions()` function body. `grokPedagogy.ts` does **not** duplicate or import `LANGUAGE_CONFIG`, `NATIVE_LANGUAGE_NAMES`, `resolveNativeLangName`, or `buildStudyAddendum`.

### C4. Worked-example payload for `(targetLanguage='English', nativeLanguage='German', voice='Eve', category='free_chat', level='A1')`

First, the pinned code does **not** define `A1` as a valid Grok level:

```text
b2c5153:frontend/src/lib/grokPedagogy.ts:6:export type GrokLevel = 'zero' | 'beginner' | 'intermediate' | 'advanced'
b2c5153:frontend/src/pages/Speak.tsx:25:const GROK_LEVEL_VALUES: GrokLevel[] = ['zero', 'beginner', 'intermediate', 'advanced']
```

Executed harness result with a literal runtime `level: 'A1' as any` (actual code execution, not hand-built). The switch falls through to the default / intermediate branch:

```json
"LEVEL: INTERMEDIATE — The student can hold a conversation in English with support.\n\nLANGUAGE MIX: About 80% English, 20% German.\n- Speak primarily in English. Switch to German only when the student is visibly stuck or asks for help.\n- Match their level — if they speak simply, keep it accessible. If they stretch for complex ideas, meet them there.\n- If the student falls back to German for multiple turns, gently invite them back to English by offering a simple way to express what they're trying to say.\n- Have real conversations — discuss opinions, share cultural context, explore topics they care about. At this level, the conversation itself is the lesson.\n- Introduce useful expressions, collocations, and connectors (words like \"however,\" \"actually,\" \"by the way\" in English) that make speech sound more natural.\n\nYou are a conversation partner for language practice. The user wants free-form conversation. Talk about anything they bring up. If they ask about current events, prices, or anything that requires up-to-date information, use the web_search tool.\n\nStart by greeting the user naturally in English and entering the situation immediately. Do not announce what scenario you have chosen. Keep responses conversational and short — typically 1 to 3 sentences per turn."
```

Executed harness result for the nearest valid UI level, `beginner`:

```json
{
  "type": "session.update",
  "session": {
    "voice": "eve",
    "instructions": "LEVEL: BEGINNER — The student knows basic words and simple phrases in English.\n\nLANGUAGE MIX: About 50% German, 50% English.\n- Speak in short, natural English sentences and let context do the teaching. If a sentence has a new word, briefly clarify in German and keep going.\n- You receive text transcriptions, not audio. If the student's response shows they understood or tried, that is success. Never ask them to repeat a word.\n- When the student uses German, respond with the English version woven into your reply — show them how to say it, don't assign it.\n- Build on what they know. If they use a word correctly, introduce a related one. If they talk about their day, teach words that fit their story.\n- Keep conversations real — ask about their life, share a cultural insight, react to what they say. A beginner can have an interesting conversation with the right support.\n\nYou are a conversation partner for language practice. The user wants free-form conversation. Talk about anything they bring up. If they ask about current events, prices, or anything that requires up-to-date information, use the web_search tool.\n\nStart by greeting the user naturally in English and entering the situation immediately. Do not announce what scenario you have chosen. Keep responses conversational and short — typically 1 to 3 sentences per turn.",
    "turn_detection": {
      "type": "server_vad"
    },
    "tools": [
      {
        "type": "web_search"
      }
    ],
    "audio": {
      "input": {
        "format": {
          "type": "audio/pcm",
          "rate": 24000
        }
      },
      "output": {
        "format": {
          "type": "audio/pcm",
          "rate": 24000
        }
      }
    }
  }
}
```

### C5. Worked-example payload for `(targetLanguage='German', nativeLanguage='English', voice='Eve', category='free_chat', level='A1')`

Executed harness result with literal runtime `level: 'A1' as any`:

```json
"LEVEL: INTERMEDIATE — The student can hold a conversation in German with support.\n\nLANGUAGE MIX: About 80% German, 20% English.\n- Speak primarily in German. Switch to English only when the student is visibly stuck or asks for help.\n- Match their level — if they speak simply, keep it accessible. If they stretch for complex ideas, meet them there.\n- If the student falls back to English for multiple turns, gently invite them back to German by offering a simple way to express what they're trying to say.\n- Have real conversations — discuss opinions, share cultural context, explore topics they care about. At this level, the conversation itself is the lesson.\n- Introduce useful expressions, collocations, and connectors (words like \"however,\" \"actually,\" \"by the way\" in German) that make speech sound more natural.\n\nYou are a conversation partner for language practice. The user wants free-form conversation. Talk about anything they bring up. If they ask about current events, prices, or anything that requires up-to-date information, use the web_search tool.\n\nStart by greeting the user naturally in German and entering the situation immediately. Do not announce what scenario you have chosen. Keep responses conversational and short — typically 1 to 3 sentences per turn."
```

Executed harness result for the nearest valid UI level, `beginner`:

```json
{
  "type": "session.update",
  "session": {
    "voice": "eve",
    "instructions": "LEVEL: BEGINNER — The student knows basic words and simple phrases in German.\n\nLANGUAGE MIX: About 50% English, 50% German.\n- Speak in short, natural German sentences and let context do the teaching. If a sentence has a new word, briefly clarify in English and keep going.\n- You receive text transcriptions, not audio. If the student's response shows they understood or tried, that is success. Never ask them to repeat a word.\n- When the student uses English, respond with the German version woven into your reply — show them how to say it, don't assign it.\n- Build on what they know. If they use a word correctly, introduce a related one. If they talk about their day, teach words that fit their story.\n- Keep conversations real — ask about their life, share a cultural insight, react to what they say. A beginner can have an interesting conversation with the right support.\n\nYou are a conversation partner for language practice. The user wants free-form conversation. Talk about anything they bring up. If they ask about current events, prices, or anything that requires up-to-date information, use the web_search tool.\n\nStart by greeting the user naturally in German and entering the situation immediately. Do not announce what scenario you have chosen. Keep responses conversational and short — typically 1 to 3 sentences per turn.",
    "turn_detection": {
      "type": "server_vad"
    },
    "tools": [
      {
        "type": "web_search"
      }
    ],
    "audio": {
      "input": {
        "format": {
          "type": "audio/pcm",
          "rate": 24000
        }
      },
      "output": {
        "format": {
          "type": "audio/pcm",
          "rate": 24000
        }
      }
    }
  }
}
```

### C6. Target/native-language injection, hardcoded German, and `"hello"` leak

Call-site plumbing:

`frontend/src/pages/Speak.tsx`
```tsx
 163:   const startGrokConversationWithLevel = async (level: GrokLevel) => {
 164:     if (!tutor.language || !selectedLang || !selectedGrokVoice || !selectedGrokCategory) return
 165: 
 166:     setCorrections(null)
 167:     setGrokSessionActive(true)
 168:     try {
 169:       await grok.startSession({
 170:         language: tutor.language,
 171:         languageDisplay: selectedLang.value,
 172:         level,
 173:         nativeLanguageDisplay: profile?.base_language ?? 'English',
 174:         voice: selectedGrokVoice,
 175:         category: selectedGrokCategory === 'free_chat' ? null : selectedGrokCategory,
 176:       })
```

Builder injection:

`frontend/src/lib/grokSessionConfig.ts`
```ts
  29: export function buildGrokSessionConfig(p: BuildGrokSessionParams): GrokSessionConfig {
  30:   const levelText = getGrokLevelInstructions(p.languageDisplay, p.nativeLanguageDisplay, p.level)
  31:   const categoryPrompt = p.category
  32:     ? GROK_CATEGORIES.find(c => c.id === p.category)!.systemPrompt
  33:     : GROK_FREE_CHAT_PROMPT
  34:   const tail =
  35:     `Start by greeting the user naturally in ${p.languageDisplay} and entering the situation immediately. ` +
  36:     `Do not announce what scenario you have chosen. ` +
  37:     `Keep responses conversational and short — typically 1 to 3 sentences per turn.`
```

Findings:

- Target language is injected correctly into `languageDisplay` and into the greeting tail.
- Native language is injected correctly into `nativeLanguageDisplay` and into the pedagogy prompt.
- No hardcoded German default was found in `grokSessionConfig.ts`, `grokPedagogy.ts`, or `frontend/api/prompts/_shared/pedagogy.ts`.
- No literal `"hello"` string exists in the Grok prompt files at `b2c5153`.
- Literal runtime `A1` falls through to the default / intermediate branch because `A1` is not a valid `GrokLevel`.
- The valid lower-level prompts (`zero`, `beginner`) explicitly instruct substantial native-language use, so a German-native / English-target session can still produce German-heavy output without any field swap.

### C7. Trace from language picker to `session.update`

Language picker → `tutor.language`:

`frontend/src/pages/Speak.tsx`
```tsx
  24: const SPEAK_ORDER = ['en', 'de', 'fr', 'it', 'es', 'pt', 'nl', 'hi', 'ar', 'fil', 'id', 'ko']
  27: const LANGUAGES = SPEAK_ORDER
  28:   .map((code) => SPEAK_LANGUAGES.find((l) => l.code === code))
  29:   .filter((l): l is NonNullable<typeof l> => l !== undefined)
  30:   .map((l) => ({
  31:     code: l.code,
  32:     nativeName: l.nativeName,
  33:     value: l.value,
  34:   }))
...
 307:               {LANGUAGES.map((lang) => (
 308:                 <button
 309:                   key={lang.code}
 310:                   onClick={() => tutor.selectLanguage(lang.code)}
```

`frontend/src/hooks/useVoiceTutor.ts`
```ts
 744:   const selectLanguage = useCallback(
 745:     (lang: string) => {
 746:       stopAllAudio()
 747:       endConversation()
 748:       setLanguage(lang)
 749:       setVoice(null)
 750:       voiceRef.current = null
 751:       setCharacter(null)
 752:       characterRef.current = null
 753:       setLevel(null)
 754:       levelRef.current = null
 755:       setMessages([])
 756:       messagesRef.current = []
 757:       setError(null)
 758:       setStatus('idle')
```

Selected target language display name + native language profile:

`frontend/src/pages/Speak.tsx`
```tsx
  66: export default function Speak() {
  67:   const { t } = useTranslation()
  68:   const { profile } = useAuth()
  69:   const baseLangCode = ALL_LANGUAGES.find((l) => l.value === profile?.base_language)?.code
  70:   const tutor = useVoiceTutor(baseLangCode)
...
  98:   const selectedLang = LANGUAGES.find((l) => l.code === tutor.language)
```

Language source-of-truth:

`frontend/src/lib/languages.ts`
```ts
  11: export interface Language {
  12:   /** English name. Matches Supabase profile.base_language values. */
  13:   value: string
  14:   /** Native script name, e.g. '한국어', 'Deutsch'. Used by Speak page and as a label root. */
  15:   nativeName: string
  16:   /** ISO 639-1 (or BCP-47) code as used by ElevenLabs / FlagIcon / locale lookups. */
  17:   code: string
...
  34:   { value: 'English',    nativeName: 'English',           code: 'en',  landingColor: '#E53935', wizardColor: '#6366f1', isBase: true,  isWizard: true,  isLanding: true,  isSpeak: true },
  35:   { value: 'German',     nativeName: 'Deutsch',           code: 'de',  landingColor: '#FFD700', wizardColor: '#f59e0b', isBase: true,  isWizard: true,  isLanding: true,  isSpeak: true },
```

Finding: the pinned frontend trace does not show a target/native swap. The picker supplies the target language code, `selectedLang.value` supplies the English display name for that target, and `profile.base_language` supplies the user’s native-language display name.

### C8. `turn_detection` in the session payload

`frontend/src/lib/grokSessionConfig.ts`
```ts
  19:     instructions: string
  20:     turn_detection: { type: 'server_vad' }
...
  45:       instructions,
  46:       turn_detection: { type: 'server_vad' },
```

Finding: `turn_detection` is explicitly set to `{ type: 'server_vad' }`.

### C9. Whether the current client supports mid-session `instructions` updates

`frontend/src/hooks/useGrokRealtime.ts`
```ts
 430:   const connectAndConfigure = useCallback(async (params: StartGrokSessionParams): Promise<void> => {
 431:     primeAudioForIOS()
 432:     setStatus('connecting')
...
 443:       ws.onopen = () => {
 444:         try {
 445:           ws.send(JSON.stringify(buildGrokSessionConfig(params)))
 446:           ws.send(JSON.stringify({ type: 'response.create' }))
 447:           setIsConnected(true)
 448:           setStatus('idle')
```

Finding: the protocol payload type exists (`session.update`), but the pinned client only sends it on socket open. There is no exposed method or later code path that re-sends updated instructions mid-session.

## Group D findings

### D1. Corrections-panel renders in `Speak.tsx`

Grok State-3 corrections render:

`frontend/src/pages/Speak.tsx`
```tsx
 717:           {grok.messages.length >= 4 && (
 718:             <div className="mt-6 flex flex-col items-center gap-4">
 719:               {corrections === null ? (
 720:                 <button
 721:                   onClick={fetchCorrections}
 722:                   disabled={correctionsLoading}
 723:                   className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-colors border border-white/10 disabled:opacity-50"
 724:                 >
...
 742:                 <div className="w-full max-w-lg space-y-3">
 743:                   <p className="text-xs text-gray-500 text-center mb-2">{t('speak.reviewTitle')}</p>
 744:                   {corrections.map((c, i) => (
 745:                     <div key={i} className="bg-white/5 rounded-lg p-3 space-y-1">
 746:                       <p className="text-sm text-red-400/80 line-through">{c.original}</p>
 747:                       <p className="text-sm text-green-400/80">{c.corrected}</p>
 748:                       <p className="text-xs text-gray-500">{c.explanation}</p>
 749:                     </div>
 750:                   ))}
 751:                 </div>
 752:               )}
 753:             </div>
 754:           )}
```

Voxtral / Gemini corrections render:

`frontend/src/pages/Speak.tsx`
```tsx
1000:         {tutor.messages.length >= 4 && (
1001:           <div className="mt-6 flex flex-col items-center gap-4">
1002:             {corrections === null ? (
1003:               <button
1004:                 onClick={fetchCorrections}
1005:                 disabled={correctionsLoading}
1006:                 className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-colors border border-white/10 disabled:opacity-50"
1007:               >
...
1025:               <div className="w-full max-w-lg space-y-3">
1026:                 <p className="text-xs text-gray-500 text-center mb-2">{t('speak.reviewTitle')}</p>
1027:                 {corrections.map((c, i) => (
1028:                   <div key={i} className="bg-white/5 rounded-lg p-3 space-y-1">
1029:                     <p className="text-sm text-red-400/80 line-through">{c.original}</p>
1030:                     <p className="text-sm text-green-400/80">{c.corrected}</p>
1031:                     <p className="text-xs text-gray-500">{c.explanation}</p>
1032:                   </div>
1033:                 ))}
1034:               </div>
1035:             )}
1036:           </div>
1037:         )}
```

### D2. Whether the panel is gated on `activeProvider`

Current fetch path and shared message source:

`frontend/src/pages/Speak.tsx`
```tsx
  99:   const activeMessages = activeProvider === 'grok' && grokSessionActive ? grok.messages : tutor.messages
 135:   const fetchCorrections = async () => {
 136:     if (correctionsLoading || activeMessages.length < 4 || !tutor.language) return
...
 152:       if (activeProvider !== 'grok') {
 153:         tutor.saveCorrections(list)
 154:       }
```

Finding: the corrections panel is **not** gated off for Grok. The minimal user-visible gate is a single render conditional around the Grok corrections block, because the state machinery is shared and otherwise dormant until the button is shown / clicked.

### D3. Whether corrections reads Grok-specific state

Finding:

- The corrections feature reads shared `corrections` / `correctionsLoading` state.
- The transcript source is `activeMessages`, which explicitly reads `grok.messages` when `activeProvider === 'grok' && grokSessionActive`.
- The Grok branch has its own inline render, but the state machinery is shared with Voxtral / Gemini.

## Group E findings

### E1. Existing history-persistence layer

Yes. The repo already has:

- `public.speak_conversations`
- `public.speak_messages`
- `public.increment_speak_message_count(...)`
- `SpeakHistoryPanel` UI that reads conversations and messages
- Voxtral / Gemini write paths in `useVoiceTutor.ts`
- Partial Grok write path in `useGrokRealtime.ts`

### E2. Schema and relevant read/write call sites

Base history schema:

`frontend/supabase/migrations/20260406200000_speak_history.sql`
```sql
   1: -- Speak conversation sessions
   2: create table if not exists public.speak_conversations (
   3:   id            uuid primary key default gen_random_uuid(),
   4:   user_id       uuid not null references public.profiles(id) on delete cascade,
   5:   language      text not null,
   6:   voice_name    text,
   7:   level         text,
   8:   message_count int not null default 0,
   9:   title         text,
  10:   started_at    timestamptz not null default now(),
  11:   ended_at      timestamptz
  12: );
...
  35: -- Individual messages within conversations
  36: create table if not exists public.speak_messages (
  37:   id              uuid primary key default gen_random_uuid(),
  38:   conversation_id uuid not null references public.speak_conversations(id) on delete cascade,
  39:   role            text not null check (role in ('user', 'assistant')),
  40:   content         text not null,
  41:   created_at      timestamptz not null default now()
  42: );
...
  69: -- Atomic message count increment (avoids read-then-write race condition)
  70: create or replace function public.increment_speak_message_count(conv_id uuid, inc int)
  71: returns void as $$
  72:   update public.speak_conversations
  73:   set message_count = message_count + inc
  74:   where id = conv_id and user_id = auth.uid();
  75: $$ language sql security definer;
```

History-schema extensions used by the current UI:

`frontend/supabase/migrations/20260407000000_speak_character.sql`
```sql
   1: -- Add character_id to speak_conversations for the character tutor system
   2: ALTER TABLE public.speak_conversations
   3:   ADD COLUMN IF NOT EXISTS character_id TEXT;
```

`frontend/supabase/migrations/20260409000000_speak_corrections.sql`
```sql
   1: -- Add corrections cache column to speak_conversations.
   2: -- Stores an array of { original, corrected, explanation } objects from the
   3: -- on-demand LLM review so it only needs to be computed once per conversation.
   4: alter table public.speak_conversations
   5:   add column if not exists corrections jsonb;
```

`frontend/supabase/migrations/20260409100000_speak_roleplay.sql`
```sql
   1: alter table public.speak_conversations
   2:   add column if not exists mode text not null default 'freeform';
   3: 
   4: alter table public.speak_conversations
   5:   add column if not exists scenario_id text;
   6: 
   7: alter table public.speak_conversations
   8:   add column if not exists npc_name text;
   9: 
  10: alter table public.speak_conversations
  11:   add column if not exists context_variant text;
```

`frontend/supabase/migrations/20260418000100_gemini_speak_columns.sql`
```sql
   1: -- Gemini TTS provider + mode/voice tracking on speak_conversations
   2: -- All columns are nullable or have defaults so existing rows need no backfill.
   3: 
   4: alter table public.speak_conversations
   5:   add column if not exists provider text default 'voxtral';
   6: 
   7: alter table public.speak_conversations
   8:   add column if not exists gemini_character_mode_id text;
   9: 
  10: alter table public.speak_conversations
  11:   add column if not exists gemini_voice_name text;
```

`frontend/supabase/migrations/20260423000000_grok_speak_columns.sql`
```sql
   1: -- Grok provider columns on speak_conversations.
   2: -- Both columns nullable for backwards compatibility with Voxtral and Gemini rows.
   3: 
   4: alter table public.speak_conversations
   5:   add column if not exists grok_voice text;
   6: 
   7: alter table public.speak_conversations
   8:   add column if not exists grok_category text;
   9: 
  10: alter table public.speak_conversations
  11:   add constraint speak_conversations_grok_voice_check
  12:   check (grok_voice is null or grok_voice in ('eve', 'ara', 'rex', 'sal', 'leo'));
  13: 
  14: alter table public.speak_conversations
  15:   add constraint speak_conversations_grok_category_check
  16:   check (grok_category is null or grok_category in (
  17:     'travel', 'business', 'romance', 'philosophy', 'daily_life',
  18:     'food', 'arts', 'news'
  19:   ));
```

Frontend read path:

`frontend/src/components/speak/SpeakHistoryPanel.tsx`
```ts
 146:   // Load conversations when panel opens
 147:   useEffect(() => {
 148:     if (!open || !user) return
...
 154:     supabase
 155:       .from('speak_conversations')
 156:       .select('*')
 157:       .eq('user_id', user.id)
 158:       .order('started_at', { ascending: false })
 159:       .limit(50)
...
 166:   // Load messages when a conversation is selected
 167:   useEffect(() => {
 168:     if (!selectedId) {
 169:       setCorrections(null)
 170:       return
 171:     }
...
 174:     supabase
 175:       .from('speak_messages')
 176:       .select('*')
 177:       .eq('conversation_id', selectedId)
 178:       .order('created_at', { ascending: true })
```

Voxtral / Gemini write path:

`frontend/src/hooks/useVoiceTutor.ts`
```ts
 296:   const createConversation = useCallback(async (lang: string, greeting: string) => {
...
 308:       await supabase.from('speak_conversations').insert({
 309:         id,
 310:         user_id: userId,
 311:         language: lang,
...
 322:         provider: providerRef.current,
...
 336:       await supabase.from('speak_messages').insert({
 337:         conversation_id: id,
 338:         role: 'assistant',
 339:         content: greeting,
 340:       })
```

`frontend/src/hooks/useVoiceTutor.ts`
```ts
 346:   const persistMessages = useCallback(async (userText: string | null, aiText: string) => {
 347:     const convId = conversationIdRef.current
 348:     if (!convId) return
...
 355:       await supabase.from('speak_messages').insert(rows)
...
 358:       await supabase.rpc('increment_speak_message_count', {
 359:         conv_id: convId,
 360:         inc: rows.length,
 361:       })
```

Grok write path:

`frontend/src/hooks/useGrokRealtime.ts`
```ts
 144:   const updateEndedAt = useCallback(async (conversationId?: string | null) => {
 145:     if (!conversationId || endedConversationIdsRef.current.has(conversationId)) return
 146:     endedConversationIdsRef.current.add(conversationId)
 147:     try {
 148:       await supabase.from('speak_conversations')
 149:         .update({ ended_at: new Date().toISOString() })
 150:         .eq('id', conversationId)
```

`frontend/src/hooks/useGrokRealtime.ts`
```ts
 211:   const persistConversationStart = useCallback(async () => {
 212:     if (conversationInsertedRef.current) return
...
 220:       await supabase.from('speak_conversations').insert({
 221:         id: conversationId,
 222:         user_id: userId,
 223:         language: params.language,
 224:         voice_name: params.voice,
...
 227:         message_count: 1,
...
 230:         provider: 'grok',
...
 235:         grok_voice: params.voice,
 236:         grok_category: params.category,
 237:       })
```

### E3. Net-new scope status

The full history stack is **not** net-new. What is missing is Grok transcript persistence inside that existing stack:

- `useGrokRealtime.ts` inserts `speak_conversations`.
- `useGrokRealtime.ts` updates `ended_at`.
- `useGrokRealtime.ts` does **not** insert `speak_messages`.
- `useGrokRealtime.ts` does **not** increment `message_count` after turns.

That means “End Conversation saves to history” is **partially existing / partially new**: the repo already has history infrastructure, but Grok still lacks message-level persistence required for the final transcript view.

## Group F findings

### F1. Voxtral / Gemini in-session level change reference

Header-level affordance in non-Grok State-3:

`frontend/src/pages/Speak.tsx`
```tsx
 874:           {!tutor.isRoleplayMode && (
 875:             <button
 876:               onClick={tutor.changeLevel}
 877:               className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-colors shrink-0"
 878:               title={t('speak.levelTooltip')}
 879:             >
 880:               <span className="text-sm">
 881:                 {tutor.level === 'zero' ? '🌱' : tutor.level === 'beginner' ? '📗' : tutor.level === 'intermediate' ? '📘' : tutor.level === 'advanced' ? '📕' : <Signal className="w-4 h-4" />}
 882:               </span>
 883:               <span className="hidden sm:inline">{t('speak.level')}</span>
 884:             </button>
 885:           )}
```

Shared level-picker branch handler in `Speak.tsx`:

`frontend/src/pages/Speak.tsx`
```tsx
 584:   if ((activeProvider === 'grok' && showGrokLevelPicker) || (activeProvider !== 'grok' && (!tutor.level || tutor.showLevelPicker))) {
...
 610:                 <button
 611:                   key={opt.level}
 612:                   onClick={() => {
 613:                     if (activeProvider === 'grok') {
 614:                       void handleGrokLevelSelect(opt.level)
 615:                     } else {
 616:                       void tutor.selectLevel(opt.level)
 617:                     }
 618:                   }}
```

Hook handlers:

`frontend/src/hooks/useVoiceTutor.ts`
```ts
1097:   const selectLevel = useCallback(
1098:     async (selectedLevel: string) => {
1099:       primeAudioForIOS()
1100:       const isInitial = !levelRef.current
1101:       setLevel(selectedLevel)
1102:       levelRef.current = selectedLevel
1103:       if (language) {
1104:         localStorage.setItem(`voice-tutor-level-${language}`, selectedLevel)
1105:       }
1106:       setShowLevelPicker(false)
1107: 
1108:       if (isInitial) {
1109:         const lang = language
1110:         const v = voiceRef.current
1111:         if (!lang || !v) return
1112:         try {
1113:           await fetchAndPlayGreeting(lang, v)
1114:         } catch (err) {
1115:           setError(err instanceof Error ? err.message : 'Failed to start conversation')
1116:           setStatus('error')
1117:         }
1118:       }
1119:     },
1120:     [language, fetchAndPlayGreeting, primeAudioForIOS],
1121:   )
```

`frontend/src/hooks/useVoiceTutor.ts`
```ts
1207:   const changeLevel = useCallback(() => {
1208:     stopAllAudio()
1209:     setShowLevelPicker(true)
1210:   }, [stopAllAudio])
1211: 
1212:   const cancelLevelChange = useCallback(() => {
1213:     setShowLevelPicker(false)
1214:     // If no level was ever set, user is still in initial flow — fall back to character grid
1215:     if (!levelRef.current) {
1216:       changeVoice()
1217:     }
1218:   }, [changeVoice])
```

## Group G findings

### G1. Frontend audio-instantiation inventory

Pinned-commit grep for `new Audio(`:

```text
b2c5153:frontend/src/components/music/PlaylistRow.tsx:62:    const audio = new Audio()
b2c5153:frontend/src/components/speak/VoiceSampleButton.tsx:69:      const audio = new Audio(url)
b2c5153:frontend/src/hooks/useGrokRealtime.ts:92:        const el = new Audio(SILENT_MP3_URL)
b2c5153:frontend/src/hooks/useVoiceTutor.ts:530:        const el = new Audio(SILENT_MP3_URL)
b2c5153:frontend/src/lib/audioUtils.ts:56:    const audio = new Audio(url)
```

Pinned-commit grep for `new AudioContext()` / `webkitAudioContext` constructors:

```text
b2c5153:frontend/src/components/music/OrbVisualizer.tsx:72:      const ctx = new AudioContext()
b2c5153:frontend/src/hooks/useGrokRealtime.ts:73:        audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
b2c5153:frontend/src/hooks/useGrokRealtime.ts:123:      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
b2c5153:frontend/src/hooks/useVoiceTutor.ts:511:        audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
b2c5153:frontend/src/hooks/useVoiceTutor.ts:566:      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
```

Relevant source lines:

`frontend/src/components/music/PlaylistRow.tsx`
```ts
  58:   // Probe duration via lightweight audio element (preload=metadata, no actual playback)
  59:   useEffect(() => {
  60:     const url = track.suno_storage_url ?? track.suno_audio_url
  61:     if (!url || duration !== null) return
  62:     const audio = new Audio()
```

`frontend/src/components/speak/VoiceSampleButton.tsx`
```ts
  67:   const playFromUrl = useCallback(async (url: string) => {
  68:     await new Promise<void>((resolve, reject) => {
  69:       const audio = new Audio(url)
```

`frontend/src/components/music/OrbVisualizer.tsx`
```ts
  71:     try {
  72:       const ctx = new AudioContext()
  73:       const source = ctx.createMediaElementSource(audio)
```

Finding: the prior iOS shared-session hypothesis remains architecturally plausible on current main because `Speak.tsx` still mounts both hooks unconditionally:

`frontend/src/pages/Speak.tsx`
```tsx
  66: export default function Speak() {
  67:   const { t } = useTranslation()
  68:   const { profile } = useAuth()
  69:   const baseLangCode = ALL_LANGUAGES.find((l) => l.value === profile?.base_language)?.code
  70:   const tutor = useVoiceTutor(baseLangCode)
  71:   const grok = useGrokRealtime()
```

### G2. `useGrokRealtime.ts` AudioContext / HTMLAudioElement lifecycle

Creation:

`frontend/src/hooks/useGrokRealtime.ts`
```ts
  70:   const primeAudioForIOS = useCallback(() => {
  71:     try {
  72:       if (!audioContextRef.current) {
  73:         audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  74:       }
...
  90:     try {
  91:       if (!silentPrimerRef.current) {
  92:         const el = new Audio(SILENT_MP3_URL)
...
 101:         silentPrimerRef.current = el
```

Lazy re-creation:

`frontend/src/hooks/useGrokRealtime.ts`
```ts
 121:   const ensureAudioContext = useCallback(async () => {
 122:     if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
 123:       audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
 124:       workletModuleLoadedRef.current = false
 125:     }
```

Session-end teardown:

`frontend/src/hooks/useGrokRealtime.ts`
```ts
 389:   const teardownSession = useCallback(async () => {
 390:     endingSessionRef.current = true
 391:     const closingConversationId = conversationIdRef.current
 392:     stopListening()
 393:     resetAudioQueue()
...
 401:     if (silentPrimerRef.current) {
 402:       try {
 403:         silentPrimerRef.current.pause()
 404:         silentPrimerRef.current.currentTime = 0
 405:         silentPrimerRef.current.removeAttribute('src')
 406:         silentPrimerRef.current.load()
 407:       } catch { /* ignore */ }
 408:       silentPrimerRef.current = null
 409:     }
 410: 
 411:     if (audioContextRef.current) {
 412:       try { await audioContextRef.current.close() } catch { /* ignore */ }
 413:       audioContextRef.current = null
 414:     }
```

Unmount cleanup:

`frontend/src/hooks/useGrokRealtime.ts`
```ts
 427:   const teardownSessionRef = useRef(teardownSession)
 428:   useEffect(() => { teardownSessionRef.current = teardownSession }, [teardownSession])
...
 561:   useEffect(() => {
 562:     mountedRef.current = true
 563:     return () => {
 564:       mountedRef.current = false
 565:       void teardownSessionRef.current()
 566:     }
 567:   }, [])
```

Language-change / page-unmount call sites in `Speak.tsx`:

`frontend/src/pages/Speak.tsx`
```tsx
 224:   useEffect(() => {
 225:     if (!tutor.language) {
...
 232:       void endGrokSessionRef.current()
 233:       return
 234:     }
...
 239:     void endGrokSessionRef.current()
 240:   }, [tutor.language])
...
 249:   useEffect(() => {
 250:     return () => {
 251:       stopAllAudioRef.current()
 252:       void endGrokSessionRef.current()
 253:     }
 254:   }, [])
```

Finding: after the callback-stability fix landed at `b2c5153`, the Grok teardown path does close and null both the `AudioContext` and the silent-primer `HTMLAudioElement` on explicit session end, on language change, and on unmount. The architectural risk that remains is not missing teardown inside the Grok hook; it is that both voice hooks are mounted in the same page at once.

## Root-cause map

- `B1 — Transcript pollution`
  Root cause is multi-file and code-proven: `frontend/src/lib/grokSessionConfig.ts:19-20,45-46` enables `server_vad`; `frontend/src/hooks/useGrokRealtime.ts:314-316` appends completed user transcript into `messages`; `frontend/src/pages/Speak.tsx:700-715` renders `grok.messages` live. The redesign’s “no transcript during live session” rule makes this bug moot if enforced in the render layer, but server-VAD would still continue segmenting turns unless the session config / send flow changes.

- `B2 — Level lock-in`
  Root cause is `frontend/src/pages/Speak.tsx:650-691`: the Grok State-3 header has history + new-chat controls but no level-change affordance. The reference feature exists only in the non-Grok branch at `frontend/src/pages/Speak.tsx:874-885` backed by `frontend/src/hooks/useVoiceTutor.ts:1207-1218`.

- `B3 — Language mismatch (Eve speaks German when English was selected)`
  No field-swap bug was found in the pinned frontend trace. The strongest code-based cause is prompt semantics, not plumbing: lower-level Grok pedagogy in `frontend/src/lib/grokPedagogy.ts:50-90` explicitly instructs mixed native-language output, and `frontend/src/lib/grokSessionConfig.ts:34-39` adds only a generic “greet naturally in target language” tail. That can yield German-heavy output in an English-target / German-native session even though `frontend/src/pages/Speak.tsx:169-175` passes the correct fields. A live xAI trace would be needed to rule out server-side behavior beyond the client prompt.

- `B4 — "hello" greeting regression`
  No literal `"hello"` string or hardcoded English-only greeting template was found in `frontend/src/lib/grokSessionConfig.ts`, `frontend/src/lib/grokPedagogy.ts`, or `frontend/api/prompts/_shared/pedagogy.ts`. The only code-level source is the generic greeting directive at `frontend/src/lib/grokSessionConfig.ts:34-39`. The stronger conclusion from source is negative: the pinned client does not contain a hardcoded `"hello"` leak.

- `B5 — Mic button state confusion after send`
  Root cause is the split state machine across `frontend/src/hooks/useGrokRealtime.ts` and `frontend/src/pages/Speak.tsx`: red state is controlled by `isListening`, playback by `status`, and there is no post-send status at all. The render priority in `frontend/src/pages/Speak.tsx:811-821` gives `grok.isListening` precedence over `grok.status === 'speaking'`, while only `frontend/src/hooks/useGrokRealtime.ts:369-387` clears `isListening`. Static source does not prove a stale render bug, but it does prove a brittle dual-source-of-truth design.

- `B6 — Eve sometimes doesn’t respond after send`
  Root cause is code-proven and multi-file: `frontend/src/lib/grokSessionConfig.ts:20,46` uses `server_vad`; `frontend/src/hooks/useGrokRealtime.ts:445-446` sends `response.create` only once at session start; `frontend/src/hooks/useGrokRealtime.ts:369-387` stops the mic without sending `input_audio_buffer.commit` or another `response.create`. The current UX looks like manual push-to-talk, but the wire protocol still depends on server VAD to detect turn completion and trigger the assistant turn.

- `B7 — Unnecessary corrections panel in Grok`
  Root cause is in `frontend/src/pages/Speak.tsx`: `activeMessages` includes `grok.messages` at `:99`, `fetchCorrections()` posts that transcript at `:135-160`, and the Grok State-3 branch renders corrections UI at `:717-753`. There is no provider gate suppressing it for Grok.

## Open questions

- What exact realtime event sequence does xAI emit on the device during a buggy Grok turn? The pinned client has no payload-type logging inside `ws.onmessage`, so repeated `.completed` events vs unhandled delta events cannot be proven from source alone.
- Which Grok level was selected in the failing English/German test? `A1` is not a valid `GrokLevel` in the pinned frontend; the runtime behavior differs materially between `zero`, `beginner`, `intermediate`, and `advanced`.
- Does the observed “mic stays red after send” reproduce when the tap path definitely calls `stopListening()`? Source proves the render contract, but a device trace is still needed to distinguish tap-delivery failure from VAD-driven response before local state clears.
- Should `End Conversation` land on the current Grok pre-session picker state (`frontend/src/pages/Speak.tsx:460-577`, preserves selected voice/category/level) or the full reset path (`resetGrokConversation()` at `:207-212`, resets provider and selections)?
- Should the current live Grok session appear in history before it ends? The pinned Grok code inserts the conversation row on first assistant delta, but because it never writes `speak_messages`, the transcript view remains empty.
- Is the iOS shared-session regression still reproducible on current main? The architecture still mounts both voice hooks, but this investigation did not include live device retesting.
