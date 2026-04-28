# Summary

The End Conversation regression is source-isolated in `frontend/src/pages/Speak.tsx`. `handleEndGrokConversation()` does set `grokShowTranscript` after `await grok.endSession()`, and `useGrokRealtime.endSession()` does not clear `grok.messages`. The reveal fails because the earlier Grok picker branch at `Speak.tsx:473` returns whenever `activeProvider === 'grok' && !grokSessionActive && !showGrokLevelPicker`, and that branch does not check `grokShowTranscript`. The transcript branch exists later at `Speak.tsx:663`, so once `grokSessionActive` flips false, the component returns the picker before the reveal branch can run. The active-session Grok back button is a separate handler, but it routes through the same full reset path as Voxtral/Gemini by calling `tutor.resetConversation()` and forcing `activeProvider` back to `'voxtral'`, which explains the jump to the main language picker. The `speaking`-state mic path is guarded in source: the UI disables the button during `speaking`, the click handler only calls `startListening()` for `idle` and `error`, and the hook tears down the microphone stream, media source, and worklet before `thinking`/`speaking`. Mid-session level change looks protocol-feasible because `instructions` are already sent via `session.update`, while mid-session voice change looks blocked after first audio by the OpenAI Realtime protocol docs that xAI says it is compatible with. Grok still inserts `speak_conversations` rows but not `speak_messages`, so the history panel can list Grok conversations but will load an empty transcript for them today.

# Group A findings

## A1. Every `setGrokShowTranscript` call site in `Speak.tsx`

`frontend/src/pages/Speak.tsx`

```tsx
132:  const clearGrokUiState = () => {
133:    setSelectedGrokVoice(null)
134:    setSelectedGrokCategory(null)
135:    setShowGrokLevelPicker(false)
136:    setGrokSessionActive(false)
137:    setGrokShowTranscript(false)
138:  }
```

```tsx
168:  const startGrokConversationWithLevel = async (level: GrokLevel) => {
169:    if (!tutor.language || !selectedLang || !selectedGrokVoice || !selectedGrokCategory) return
170:
171:    setCorrections(null)
172:    setGrokShowTranscript(false)
173:    setGrokSessionActive(true)
174:    try {
175:      await grok.startSession({
176:        language: tutor.language,
177:        languageDisplay: selectedLang.value,
178:        level,
179:        nativeLanguageDisplay: profile?.base_language ?? 'English',
180:        voice: selectedGrokVoice,
181:        category: selectedGrokCategory === 'free_chat' ? null : selectedGrokCategory,
182:      })
183:    } catch (err) {
184:      console.error('Grok session start failed:', err)
185:      setGrokSessionActive(false)
186:    }
187:  }
```

```tsx
220:  const handleEndGrokConversation = async () => {
221:    await grok.endSession()
222:    setCorrections(null)
223:    setGrokSessionActive(false)
224:    setGrokShowTranscript(grok.messages.length > 0)
225:  }
226:
227:  const startNewGrokConversation = () => {
228:    setGrokShowTranscript(false)
229:    setGrokSessionActive(false)
230:    setCorrections(null)
231:  }
```

## A2. Transcript-reveal flag state declaration

`frontend/src/pages/Speak.tsx`

```tsx
88:  const [selectedGrokVoice, setSelectedGrokVoice] = useState<GrokVoice | null>(null)
89:  const [selectedGrokCategory, setSelectedGrokCategory] = useState<GrokCategory | 'free_chat' | null>(null)
90:  const [grokLevel, setGrokLevel] = useState<GrokLevel | null>(null)
91:  const [showGrokLevelPicker, setShowGrokLevelPicker] = useState(false)
92:  const [grokSessionActive, setGrokSessionActive] = useState(false)
93:  const [grokShowTranscript, setGrokShowTranscript] = useState(false)
```

It is a plain `useState` flag, not a derived value.

## A3. End Conversation button click handler and state mutations

The button in Grok State-3:

`frontend/src/pages/Speak.tsx`

```tsx
815:            <button
816:              onClick={() => { void handleEndGrokConversation() }}
817:              className="hidden sm:inline-flex px-3 py-1.5 rounded-lg text-xs text-red-200 bg-red-950/40 border border-red-500/20 hover:bg-red-950/60 transition-colors shrink-0"
818:              title={t('speak.endConversation')}
819:            >
820:              {t('speak.endConversation')}
821:            </button>
```

```tsx
878:            <button
879:              onClick={() => { void handleEndGrokConversation() }}
880:              className="text-sm text-gray-400 hover:text-white transition-colors sm:hidden"
881:            >
882:              {t('speak.endConversation')}
883:            </button>
```

The handler:

`frontend/src/pages/Speak.tsx`

```tsx
220:  const handleEndGrokConversation = async () => {
221:    await grok.endSession()
222:    setCorrections(null)
223:    setGrokSessionActive(false)
224:    setGrokShowTranscript(grok.messages.length > 0)
225:  }
```

State mutation order in source:

1. `await grok.endSession()`
2. `setCorrections(null)`
3. `setGrokSessionActive(false)`
4. `setGrokShowTranscript(grok.messages.length > 0)`

## A4. Transcript reveal render branch and full condition

`frontend/src/pages/Speak.tsx`

```tsx
663:  if (grokShowTranscript && grok.messages.length > 0) {
664:    return (
665:      <div className="fixed inset-x-0 bottom-0 top-16 sm:top-20 z-30 flex flex-col bg-gray-950">
666:        <div className="shrink-0 border-b border-white/5 bg-gray-950/80 backdrop-blur-md">
667:          <div className="flex items-center gap-2 px-4 py-3 max-w-5xl mx-auto w-full">
668:            <div className="flex items-center gap-2 flex-1 min-w-0">
669:              <FlagIcon code={tutor.language!} className="w-6 h-auto shrink-0" />
670:              <div className="min-w-0">
671:                <p className="text-sm font-medium text-white truncate">{grokHeaderName}</p>
672:                <p className="text-xs text-gray-500 truncate">{t('speak.conversationEnded')}</p>
673:              </div>
674:            </div>
675:
676:            <button
677:              onClick={() => setHistoryOpen(true)}
678:              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-colors shrink-0"
679:              title={t('speak.historyTooltip')}
680:            >
681:              <History className="h-3.5 w-3.5" />
682:              <span className="hidden sm:inline">{t('speak.history')}</span>
683:            </button>
684:          </div>
685:        </div>
686:
687:        <div
688:          ref={chatRef}
689:          className="flex-1 overflow-y-auto px-4 py-4 space-y-3 max-w-5xl mx-auto w-full"
690:          style={{ scrollbarWidth: 'thin' }}
691:        >
692:          {grok.messages.map((msg, i) => (
693:            <div
694:              key={`${msg.role}-${msg.timestamp}-${i}`}
695:              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
696:            >
697:              <div
698:                className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
699:                  msg.role === 'user'
700:                    ? 'bg-violet-900/50 text-white rounded-br-sm'
701:                    : 'bg-gray-800/60 text-gray-100 rounded-bl-sm'
702:                }`}
703:              >
704:                <p>{msg.content}</p>
705:              </div>
706:            </div>
707:          ))}
708:
709:          <div ref={bottomRef} />
710:        </div>
711:
712:        <SpeakHistoryPanel
713:          open={historyOpen}
714:          onClose={() => setHistoryOpen(false)}
715:          baseLangCode={baseLangCode}
716:        />
717:
718:        <div className="shrink-0 border-t border-white/5 bg-gray-950/80 backdrop-blur-md">
719:          <div className="px-4 py-5 max-w-5xl mx-auto w-full">
720:            <div className="flex justify-center">
721:              <button
722:                onClick={startNewGrokConversation}
723:                className="px-5 py-3 rounded-full bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition-colors"
724:              >
725:                {t('speak.startNewConversation')}
726:              </button>
727:            </div>
728:          </div>
729:        </div>
730:      </div>
731:    )
732:  }
```

Full condition: `grokShowTranscript && grok.messages.length > 0`

## A5. Source-based state flow from End Conversation tap to next render

Session teardown path in the hook:

`frontend/src/hooks/useGrokRealtime.ts`

```ts
423:  const teardownSession = useCallback(async () => {
424:    endingSessionRef.current = true
425:    const closingConversationId = conversationIdRef.current
426:    stopListening()
427:    resetAudioQueue()
428:
429:    const ws = wsRef.current
430:    wsRef.current = null
431:    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
432:      try { ws.close(1000, 'session ended') } catch { /* ignore */ }
433:    }
434:
435:    if (silentPrimerRef.current) {
436:      try {
437:        silentPrimerRef.current.pause()
438:        silentPrimerRef.current.currentTime = 0
439:        silentPrimerRef.current.removeAttribute('src')
440:        silentPrimerRef.current.load()
441:      } catch { /* ignore */ }
442:      silentPrimerRef.current = null
443:    }
444:
445:    if (audioContextRef.current) {
446:      try { await audioContextRef.current.close() } catch { /* ignore */ }
447:      audioContextRef.current = null
448:    }
449:
450:    workletModuleLoadedRef.current = false
451:    currentAssistantIndexRef.current = null
452:    if (mountedRef.current) {
453:      setIsConnected(false)
454:      setIsListening(false)
455:      setStatus('idle')
456:    }
457:    await updateEndedAt(closingConversationId)
458:    endingSessionRef.current = false
459:  }, [resetAudioQueue, stopListening, updateEndedAt])
```

```ts
602:  const endSession = useCallback(async () => {
603:    await teardownSession()
604:  }, [teardownSession])
```

Render ordering around the picker, transcript, and active-session branches:

`frontend/src/pages/Speak.tsx`

```tsx
473:  if ((activeProvider === 'grok' && !grokSessionActive && !showGrokLevelPicker) || (activeProvider !== 'grok' && !tutor.voice)) {
474:    const isStarting = activeProvider === 'grok' ? grok.status === 'connecting' : tutor.status === 'processing'
475:    const isGeminiVoiceStage = activeProvider !== 'grok' && tutor.provider === 'gemini' && tutor.geminiPickerStage === 'voice'
476:    const goBack = () => {
477:      if (activeProvider === 'grok') {
478:        clearGrokUiState()
479:        tutor.resetConversation()
480:        setActiveProvider('voxtral')
481:        return
482:      }
```

```tsx
663:  if (grokShowTranscript && grok.messages.length > 0) {
664:    return (
```

```tsx
734:  if (activeProvider === 'grok' && grokSessionActive) {
735:    const grokButtonDisabled =
736:      grok.status === 'connecting' ||
737:      grok.status === 'thinking' ||
738:      grok.status === 'speaking'
```

Actual state flow from source:

1. Tap calls `handleEndGrokConversation()` from `Speak.tsx:816` or `Speak.tsx:879`.
2. `await grok.endSession()` runs `teardownSession()` and sets hook state to `status='idle'`, `isConnected=false`, `isListening=false` without clearing `messages`.
3. Control returns to `handleEndGrokConversation()`.
4. `setCorrections(null)` runs.
5. `setGrokSessionActive(false)` runs before `setGrokShowTranscript(...)` in source order.
6. `setGrokShowTranscript(grok.messages.length > 0)` runs.
7. On the next render, the earlier picker branch at `Speak.tsx:473` matches because `activeProvider === 'grok'`, `grokSessionActive === false`, and `showGrokLevelPicker === false`.
8. That branch returns before `Speak.tsx:663` is reached.

So yes: `grokSessionActive` does flip false before `grokShowTranscript` in source order, but the decisive regression is the earlier picker return at `Speak.tsx:473`, not state batching semantics by themselves.

## A6. Is `grok.messages` cleared between End Conversation and reveal render?

The only `setMessages([])` in `useGrokRealtime.ts` is in `startSession()`, not in teardown:

`frontend/src/hooks/useGrokRealtime.ts`

```ts
244:  const appendAssistantDelta = useCallback((delta: string) => {
245:    if (!delta) return
246:    if (!conversationInsertedRef.current) {
247:      void persistConversationStart()
248:    }
249:
250:    setMessages((prev) => {
251:      const existingIndex = currentAssistantIndexRef.current
252:      if (existingIndex === null) {
253:        const nextIndex = prev.length
254:        currentAssistantIndexRef.current = nextIndex
255:        return [...prev, { role: 'assistant', content: delta, timestamp: Date.now() }]
256:      }
257:
258:      return prev.map((message, index) => (
259:        index === existingIndex
260:          ? { ...message, content: message.content + delta }
261:          : message
262:      ))
263:    })
264:  }, [persistConversationStart])
265:
266:  const appendUserTranscript = useCallback((transcript: string) => {
267:    if (!transcript) return
268:    setMessages((prev) => [...prev, {
269:      role: 'user',
270:      content: transcript,
271:      timestamp: Date.now(),
272:    }])
273:  }, [])
```

```ts
606:  const startSession = useCallback(async (params: StartGrokSessionParams) => {
607:    // iOS audio unlock must run inside the user gesture before any await.
608:    primeAudioForIOS()
609:    await teardownSession()
610:
611:    conversationIdRef.current = crypto.randomUUID()
612:    sessionParamsRef.current = params
613:    conversationInsertedRef.current = false
614:    endedConversationIdsRef.current.delete(conversationIdRef.current)
615:    currentAssistantIndexRef.current = null
616:    pendingPcmChunksRef.current = []
617:    pendingPcmSampleCountRef.current = 0
618:    playheadRef.current = 0
619:    setMessages([])
620:    setError(null)
621:
622:    await connectAndConfigure(params)
623:  }, [connectAndConfigure, primeAudioForIOS, teardownSession])
```

No `setMessages([])` appears in `teardownSession()`, `endSession()`, any `grokSessionActive` watcher, or any `grok.status` watcher in `Speak.tsx`.

## A7. Render branch ordering check

The current ordering is:

1. Grok/non-Grok picker branch at `Speak.tsx:473`
2. Level picker branch at `Speak.tsx:597`
3. Transcript reveal branch at `Speak.tsx:663`
4. Grok live State-3 branch at `Speak.tsx:734`

So the current code deviates from the Phase 1 requirement. The transcript reveal branch is not evaluated before the pre-session picker branch.

## A8. Open question or source-isolated?

This one is source-isolated. Runtime instrumentation is optional confirmation, not a prerequisite. If confirmation is still wanted, log these values inside `handleEndGrokConversation()` and at the top of the render function on the render immediately after the tap:

- `activeProvider`
- `grokSessionActive`
- `grokShowTranscript`
- `showGrokLevelPicker`
- `grok.messages.length`

# Group B findings

## B1. Grok State-3 back button JSX and click handler

`frontend/src/pages/Speak.tsx`

```tsx
213:  const resetGrokConversation = async () => {
214:    await grok.endSession()
215:    clearGrokUiState()
216:    tutor.resetConversation()
217:    setActiveProvider('voxtral')
218:  }
```

```tsx
790:            <button
791:              onClick={() => { void resetGrokConversation() }}
792:              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
793:              title={t('speak.backTooltip')}
794:            >
795:              <ArrowLeft className="h-5 w-5" />
796:            </button>
```

## B2. Full state transition triggered by the active-session Grok back button

The handler path is:

1. `await grok.endSession()`
2. `clearGrokUiState()`
3. `tutor.resetConversation()`
4. `setActiveProvider('voxtral')`

`tutor.resetConversation()` is the full app reset:

`frontend/src/hooks/useVoiceTutor.ts`

```ts
1433:  const resetConversation = useCallback(() => {
1434:    stopAllAudio()
1435:    endConversation()
1436:    releaseResources()
1437:
1438:    setLanguage(null)
1439:    setVoice(null)
1440:    voiceRef.current = null
1441:    setCharacter(null)
1442:    characterRef.current = null
1443:    previousStateRef.current = null
1444:    setShowLevelPicker(false)
1445:    setLevel(null)
1446:    levelRef.current = null
1447:    setMessages([])
1448:    messagesRef.current = []
1449:    setPendingAudio(null)
1450:    setError(null)
1451:    setStatus('idle')
1452:    setIsChangingVoice(false)
1453:    studyModeRef.current = false
1454:    studyWordsRef.current = []
1455:    setStudyMode(false)
1456:    listenModeRef.current = false
1457:    setListenMode(false)
1458:    // Roleplay cleanup
1459:    isRoleplayRef.current = false
1460:    setIsRoleplayMode(false)
1461:    setActiveScenario(null)
1462:    setActiveNpcName(null)
1463:    scenarioPromptRef.current = null
1464:    roleplayMetaRef.current = null
1465:    setGeminiPickerStageState('voice')
1466:  }, [releaseResources, endConversation, stopAllAudio])
```

Landing state: main language picker, with `activeProvider` forced to `'voxtral'`.

## B3. State that would need to be preserved to land on the pre-session Grok picker

To land on the Grok pre-session picker without wiping selections, the source says these must survive:

- `tutor.language` (otherwise `Speak.tsx` returns the language picker)
- `activeProvider === 'grok'`
- `selectedGrokVoice`
- `selectedGrokCategory`
- `grokLevel` if the user’s prior level choice should remain visible or reusable
- `showGrokLevelPicker === false`

The active-session back path currently destroys `tutor.language` through `tutor.resetConversation()` and destroys `selectedGrokVoice` / `selectedGrokCategory` through `clearGrokUiState()`.

## B4. Shared handler with Voxtral/Gemini?

The live non-Grok back button calls `tutor.resetConversation` directly:

`frontend/src/pages/Speak.tsx`

```tsx
902:          <button
903:            onClick={tutor.resetConversation}
904:            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
905:            title={t('speak.backTooltip')}
906:          >
```

The Grok live back button does not literally share the same handler, but it converges on the same reset path:

`frontend/src/pages/Speak.tsx`

```tsx
213:  const resetGrokConversation = async () => {
214:    await grok.endSession()
215:    clearGrokUiState()
216:    tutor.resetConversation()
217:    setActiveProvider('voxtral')
218:  }
```

So: separate wrapper, same underlying full-reset behavior, plus an extra provider reset.

## B5. Does Grok back behave differently by state?

Yes.

Pre-session Grok picker back path:

`frontend/src/pages/Speak.tsx`

```tsx
473:  if ((activeProvider === 'grok' && !grokSessionActive && !showGrokLevelPicker) || (activeProvider !== 'grok' && !tutor.voice)) {
474:    const isStarting = activeProvider === 'grok' ? grok.status === 'connecting' : tutor.status === 'processing'
475:    const isGeminiVoiceStage = activeProvider !== 'grok' && tutor.provider === 'gemini' && tutor.geminiPickerStage === 'voice'
476:    const goBack = () => {
477:      if (activeProvider === 'grok') {
478:        clearGrokUiState()
479:        tutor.resetConversation()
480:        setActiveProvider('voxtral')
481:        return
482:      }
```

Level-picker back path:

`frontend/src/pages/Speak.tsx`

```tsx
597:  if ((activeProvider === 'grok' && showGrokLevelPicker) || (activeProvider !== 'grok' && (!tutor.level || tutor.showLevelPicker))) {
598:    return (
599:      <div className="flex flex-col min-h-full pb-20">
600:        <div className="sticky top-0 z-40 bg-gray-950 pt-4 pb-3 border-b border-white/5">
601:          <div className="max-w-2xl mx-auto w-full px-4 flex items-center gap-3">
602:            <button
603:              onClick={activeProvider === 'grok' ? () => setShowGrokLevelPicker(false) : tutor.cancelLevelChange}
604:              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
605:              title="Back to voice selection"
606:            >
```

Variation summary:

- Active Grok session: full reset to language picker.
- Grok voice/category picker: full reset to language picker.
- Grok level picker: local step back to Grok voice/category picker.

# Group C findings

## C1. Grok State-3 mic button JSX, disabled logic, and click logic

`frontend/src/pages/Speak.tsx`

```tsx
734:  if (activeProvider === 'grok' && grokSessionActive) {
735:    const grokButtonDisabled =
736:      grok.status === 'connecting' ||
737:      grok.status === 'thinking' ||
738:      grok.status === 'speaking'
```

```tsx
840:            <button
841:              onClick={() => {
842:                if (grok.status === 'idle' || grok.status === 'error') {
843:                  grok.startListening()
844:                } else if (grok.status === 'recording') {
845:                  grok.sendTurn()
846:                }
847:              }}
848:              onContextMenu={(e) => e.preventDefault()}
849:              disabled={grokButtonDisabled}
850:              style={{ WebkitTouchCallout: 'none' }}
851:              className={`relative flex h-28 w-28 items-center justify-center rounded-full p-4 transition-all duration-300 select-none touch-none ${
852:                grokButtonDisabled
853:                  ? 'cursor-not-allowed opacity-90'
854:                  : 'cursor-pointer hover:scale-[1.03] active:scale-95'
855:              }`}
856:              aria-label={
857:                grok.status === 'recording'
858:                  ? t('speak.recording')
859:                  : grok.status === 'error'
860:                    ? t('speak.tapRetry')
861:                    : t('speak.tapToSpeak')
862:              }
863:            >
```

## C2. Exact `disabled` condition

Exact condition:

```tsx
735:    const grokButtonDisabled =
736:      grok.status === 'connecting' ||
737:      grok.status === 'thinking' ||
738:      grok.status === 'speaking'
```

When `grok.status === 'speaking'`, this evaluates to `true`.

## C3. Is there an additional guard in the click handler?

Yes, in practice. There is not a standalone `return` guard, but the handler only calls `startListening()` when status is `idle` or `error`, and only calls `sendTurn()` when status is `recording`.

```tsx
841:              onClick={() => {
842:                if (grok.status === 'idle' || grok.status === 'error') {
843:                  grok.startListening()
844:                } else if (grok.status === 'recording') {
845:                  grok.sendTurn()
846:                }
847:              }}
```

So even if a click somehow fired during `speaking`, this handler body would do nothing.

Repo search also shows this is the only caller of `grok.startListening()`:

```text
frontend/src/pages/Speak.tsx:843:                  grok.startListening()
```

## C4. `startListening()` in full and whether it guards `speaking`

`frontend/src/hooks/useGrokRealtime.ts`

```ts
525:  const startListening = useCallback(async () => {
526:    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
527:      setError('Grok session is not connected')
528:      setStatus('error')
529:      return
530:    }
531:    if (isListening) return
532:
533:    try {
534:      setError(null)
535:      primeAudioForIOS()
536:      const ctx = await ensureAudioContext()
537:      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
538:      streamRef.current = stream
539:
540:      if (!workletModuleLoadedRef.current) {
541:        await ctx.audioWorklet.addModule('/audioWorklets/grokPcmDownsampler.js')
542:        workletModuleLoadedRef.current = true
543:      }
544:
545:      const source = ctx.createMediaStreamSource(stream)
546:      const worklet = new AudioWorkletNode(ctx, 'grok-pcm-downsampler')
547:      source.connect(worklet)
548:
549:      worklet.port.onmessage = (event: MessageEvent<{ type?: string; data?: string }>) => {
550:        if (event.data?.type === 'flush_complete') {
551:          pendingInputFlushResolveRef.current?.()
552:          return
553:        }
554:        if (event.data?.type !== 'pcm' || !event.data.data) return
555:        const ws = wsRef.current
556:        if (!ws || ws.readyState !== WebSocket.OPEN) return
557:        ws.send(JSON.stringify({
558:          type: 'input_audio_buffer.append',
559:          audio: btoa(event.data.data),
560:        }))
561:      }
562:
563:      micSourceRef.current = source
564:      workletRef.current = worklet
565:      setIsListening(true)
566:      setStatus('recording')
567:    } catch (err) {
568:      console.error('[grok-realtime] Failed to start listening:', err)
569:      setError(err instanceof Error ? err.message : 'Failed to start microphone')
570:      setStatus('error')
571:    }
572:  }, [ensureAudioContext, isListening, primeAudioForIOS])
```

`startListening()` has no explicit `status === 'speaking'` guard. It assumes the caller is gating correctly.

## C5. During `speaking`, what is the state of the mic stream, source node, worklet, and WebSocket?

Mic/source/worklet teardown:

`frontend/src/hooks/useGrokRealtime.ts`

```ts
396:  const pauseListeningCapture = useCallback(() => {
397:    if (micSourceRef.current) {
398:      try { micSourceRef.current.disconnect() } catch { /* ignore */ }
399:      micSourceRef.current = null
400:    }
401:    if (streamRef.current) {
402:      streamRef.current.getTracks().forEach((track) => track.stop())
403:      streamRef.current = null
404:    }
405:  }, [])
406:
407:  const stopListening = useCallback(() => {
408:    pendingInputFlushResolveRef.current?.()
409:    pendingInputFlushResolveRef.current = null
410:    if (workletRef.current) {
411:      try { workletRef.current.port.postMessage({ type: 'reset' }) } catch { /* ignore */ }
412:      workletRef.current.port.onmessage = null
413:      try { workletRef.current.disconnect() } catch { /* ignore */ }
414:      workletRef.current = null
415:    }
416:    pauseListeningCapture()
417:    if (mountedRef.current) {
418:      setIsListening(false)
419:      if (statusRef.current === 'recording') setStatus('idle')
420:    }
421:  }, [pauseListeningCapture])
```

The transition from recording into thinking:

```ts
574:  const sendTurn = useCallback(async () => {
575:    if (statusRef.current !== 'recording') return
576:
577:    const ws = wsRef.current
578:    if (!ws || ws.readyState !== WebSocket.OPEN) {
579:      stopListening()
580:      setError('Grok session is not connected')
581:      setStatus('error')
582:      return
583:    }
584:
585:    try {
586:      pauseListeningCapture()
587:      await flushPendingInputAudio()
588:      stopListening()
589:      if (endingSessionRef.current || wsRef.current !== ws || ws.readyState !== WebSocket.OPEN) return
590:      ws.send(JSON.stringify({ type: 'input_audio_buffer.commit' }))
591:      ws.send(JSON.stringify({ type: 'response.create' }))
592:      setError(null)
593:      setStatus('thinking')
594:    } catch (err) {
595:      console.error('[grok-realtime] Failed to send turn:', err)
596:      stopListening()
597:      setError(err instanceof Error ? err.message : 'Failed to send audio turn')
598:      setStatus('error')
599:    }
600:  }, [flushPendingInputAudio, pauseListeningCapture, stopListening])
```

Audio playback state:

```ts
164:  const queueAudioBuffer = useCallback(async (pcm: Int16Array) => {
165:    if (pcm.length === 0) return
166:    const ctx = await ensureAudioContext()
167:    const audioBuffer = ctx.createBuffer(1, pcm.length, PCM_SAMPLE_RATE)
168:    const channel = audioBuffer.getChannelData(0)
169:    for (let i = 0; i < pcm.length; i++) {
170:      channel[i] = pcm[i] / 0x8000
171:    }
172:
173:    const source = ctx.createBufferSource()
174:    source.buffer = audioBuffer
175:    source.connect(ctx.destination)
176:
177:    const startAt = Math.max(ctx.currentTime, playheadRef.current)
178:    playheadRef.current = startAt + audioBuffer.duration
179:    audioQueueRef.current.push(source)
180:
181:    source.onended = () => {
182:      try { source.disconnect() } catch { /* ignore */ }
183:      audioQueueRef.current = audioQueueRef.current.filter((node) => node !== source)
184:      if (audioQueueRef.current.length === 0) {
185:        playheadRef.current = 0
186:        if (mountedRef.current) {
187:          setStatus('idle')
188:        }
189:      }
190:    }
191:
192:    source.start(startAt)
193:    if (mountedRef.current) setStatus('speaking')
194:  }, [ensureAudioContext])
```

WebSocket remains open during the live session until `endSession()` / `teardownSession()`:

```ts
474:    await new Promise<void>((resolve, reject) => {
475:      let settled = false
476:
477:      ws.onopen = () => {
478:        try {
479:          ws.send(JSON.stringify(buildGrokSessionConfig(params)))
480:          ws.send(JSON.stringify({ type: 'response.create' }))
481:          setIsConnected(true)
482:          setStatus('idle')
483:          settled = true
484:          resolve()
485:        } catch (err) {
486:          settled = true
487:          reject(err)
488:        }
489:      }
```

Source conclusion for `speaking` state:

- `MediaStream`: released (`streamRef.current = null`) after `sendTurn()`
- `MediaStreamSource`: disconnected and nulled
- PCM worklet: reset, disconnected, nulled
- WebSocket: still open

## C6. What happens if a user taps the mic button during `speaking`?

From source:

1. `disabled={grokButtonDisabled}` should block the tap, and `grokButtonDisabled` is `true` in `speaking`.
2. Even if a click event still reached the handler, the handler only reacts to `idle`, `error`, or `recording`.
3. Therefore the UI path does not call `startListening()` during `speaking`.
4. `startListening()` itself would proceed if called directly from somewhere else, because it only guards on WebSocket-open and `isListening`.

So the current UI source says a `speaking`-state tap should not start recording.

## C7. Is there any event handler that would stop Eve’s playback if recording started?

Yes, but not from `startListening()` directly.

`frontend/src/hooks/useGrokRealtime.ts`

```ts
314:      case 'conversation.item.input_audio_transcription.completed': {
315:        appendUserTranscript(typeof payload.transcript === 'string' ? payload.transcript : '')
316:        break
317:      }
318:      case 'input_audio_buffer.speech_started': {
319:        resetAudioQueue()
320:        if (mountedRef.current) setStatus('recording')
321:        break
322:      }
```

There is no `resetAudioQueue()` call inside `startListening()`. The stop-Eve mechanism is the `input_audio_buffer.speech_started` event handler. That is important because xAI’s Realtime reference says `input_audio_buffer.speech_started` is only available with `server_vad`, not with `turn_detection: null`:

- xAI Realtime reference: [Voice / Realtime](https://docs.x.ai/developers/rest-api-reference/inference/voice)

And the current Grok session config sets `turn_detection: null`:

`frontend/src/lib/grokSessionConfig.ts`

```ts
41:  return {
42:    type: 'session.update',
43:    session: {
44:      voice: p.voice,
45:      instructions,
46:      turn_detection: null,
47:      tools: [{ type: 'web_search' }],
48:      audio: {
49:        input: { format: { type: 'audio/pcm', rate: 24000 } },
50:        output: { format: { type: 'audio/pcm', rate: 24000 } },
51:      },
52:    },
53:  }
```

## C8. Mechanism, or open runtime question?

Source says automatic barge-in should not be possible in the current implementation:

- the button is disabled in `speaking`
- the button handler does nothing in `speaking`
- the mic stream/source/worklet are torn down before `thinking` / `speaking`
- the documented `speech_started` interruption event should only exist when VAD is enabled, but `turn_detection` is `null`

If Sir Robert is seeing real barge-in on device, the next step is runtime instrumentation, not more source reading. Instrument:

- `Speak.tsx` mic button `onClick`
- `useGrokRealtime.startListening()`
- `useGrokRealtime.handleSocketMessage()` for `input_audio_buffer.speech_started`
- `resetAudioQueue()`
- Safari/iOS remote inspector state for the button’s `disabled` attribute during `speaking`

# Group D findings

## D1. `buildGrokSessionConfig()` and `voice`

`frontend/src/lib/grokSessionConfig.ts`

```ts
6:export interface BuildGrokSessionParams {
7:  language: string
8:  languageDisplay: string
9:  level: GrokLevel
10:  nativeLanguageDisplay: string
11:  voice: GrokVoice
12:  category: GrokCategory | null
13:}
14:
15:export interface GrokSessionConfig {
16:  type: 'session.update'
17:  session: {
18:    voice: GrokVoice
19:    instructions: string
20:    turn_detection: null
21:    tools: Array<{ type: 'web_search' }>
22:    audio: {
23:      input: { format: { type: 'audio/pcm'; rate: 24000 } }
24:      output: { format: { type: 'audio/pcm'; rate: 24000 } }
25:    }
26:  }
27:}
28:
29:export function buildGrokSessionConfig(p: BuildGrokSessionParams): GrokSessionConfig {
30:  const levelText = getGrokLevelInstructions(p.languageDisplay, p.nativeLanguageDisplay, p.level)
31:  const categoryPrompt = p.category
32:    ? GROK_CATEGORIES.find(c => c.id === p.category)!.systemPrompt
33:    : GROK_FREE_CHAT_PROMPT
34:  const tail =
35:    `Start by greeting the user naturally in ${p.languageDisplay} and entering the situation immediately. ` +
36:    `Do not announce what scenario you have chosen. ` +
37:    `Keep responses conversational and short â€” typically 1 to 3 sentences per turn.`
38:
39:  const instructions = `${levelText}\n\n${categoryPrompt}\n\n${tail}`
40:
41:  return {
42:    type: 'session.update',
43:    session: {
44:      voice: p.voice,
45:      instructions,
46:      turn_detection: null,
47:      tools: [{ type: 'web_search' }],
48:      audio: {
49:        input: { format: { type: 'audio/pcm', rate: 24000 } },
50:        output: { format: { type: 'audio/pcm', rate: 24000 } },
51:      },
52:    },
53:  }
54:}
```

Yes. `voice` is a builder parameter and is included in the `session.update` payload.

## D2. Where `session.update` is sent

`frontend/src/hooks/useGrokRealtime.ts`

```ts
464:  const connectAndConfigure = useCallback(async (params: StartGrokSessionParams): Promise<void> => {
465:    primeAudioForIOS()
466:    setStatus('connecting')
467:    setError(null)
468:
469:    const token = await fetchEphemeralToken()
470:    const ws = new WebSocket('wss://api.x.ai/v1/realtime', [`xai-client-secret.${token}`])
471:    const sessionConversationId = conversationIdRef.current
472:    wsRef.current = ws
473:
474:    await new Promise<void>((resolve, reject) => {
475:      let settled = false
476:
477:      ws.onopen = () => {
478:        try {
479:          ws.send(JSON.stringify(buildGrokSessionConfig(params)))
480:          ws.send(JSON.stringify({ type: 'response.create' }))
481:          setIsConnected(true)
482:          setStatus('idle')
483:          settled = true
484:          resolve()
485:        } catch (err) {
486:          settled = true
487:          reject(err)
488:        }
489:      }
```

Repo search finds no other `session.update` send in `useGrokRealtime.ts`.

## D3. Mid-session voice change protocol support

Repo-local answer: no local documentation, comment, or precedent exists for a mid-session Grok voice swap.

External protocol evidence:

- xAI docs say `session.update` updates session configuration including system prompt, voice, audio format, turn detection, and tools: [xAI Realtime reference](https://docs.x.ai/developers/rest-api-reference/inference/voice)
- xAI docs say the Grok Voice Agent API is compatible with the OpenAI Realtime API: [xAI Voice Agent API](https://docs.x.ai/developers/model-capabilities/audio/voice-agent)
- OpenAI Realtime docs say most session properties can be updated at any time, except `voice` after the model has emitted audio once during the session: [OpenAI Realtime conversations](https://developers.openai.com/api/docs/guides/realtime-conversations)

Source + docs conclusion: current Grok sessions emit audio immediately on session start because `connectAndConfigure()` sends `response.create` right after `session.update`. That means a live mid-session voice change looks not protocol-safe after the greeting has played. The source does not support a clean in-session voice swap today, and the external docs point toward teardown/reconnect being required unless xAI explicitly documents different behavior.

## D4. Minimal hook shape if voice hot-swap were protocol-supported

If xAI runtime behavior proved that post-audio voice swaps are allowed, the minimal hook surface would look like this shape:

- add a `changeVoice(nextVoice: GrokVoice)` function to `useGrokRealtime`
- update `sessionParamsRef.current.voice`
- send a new `session.update` over `wsRef.current`
- update the current `speak_conversations` row (`voice_name`, `grok_voice`) if persistence should reflect the swap
- keep `messages` untouched so local transcript state survives

There is no current source path that does this.

## D5. What conversation state is server-side vs client-side?

Client-side state in the hook:

`frontend/src/hooks/useGrokRealtime.ts`

```ts
40:export function useGrokRealtime(): UseGrokRealtimeReturn {
41:  const [status, setStatus] = useState<GrokStatus>('idle')
42:  const [messages, setMessages] = useState<GrokMessage[]>([])
43:  const [error, setError] = useState<string | null>(null)
44:  const [isConnected, setIsConnected] = useState(false)
45:  const [isListening, setIsListening] = useState(false)
46:
47:  const audioContextRef = useRef<AudioContext | null>(null)
48:  const silentPrimerRef = useRef<HTMLAudioElement | null>(null)
49:  const wsRef = useRef<WebSocket | null>(null)
50:  const workletRef = useRef<AudioWorkletNode | null>(null)
51:  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
52:  const streamRef = useRef<MediaStream | null>(null)
53:  const audioQueueRef = useRef<AudioBufferSourceNode[]>([])
54:  const playheadRef = useRef(0)
55:  const pendingInputFlushResolveRef = useRef<(() => void) | null>(null)
56:  const conversationIdRef = useRef<string | null>(null)
57:  const sessionParamsRef = useRef<StartGrokSessionParams | null>(null)
58:  const currentAssistantIndexRef = useRef<number | null>(null)
59:  const workletModuleLoadedRef = useRef(false)
60:  const pendingPcmChunksRef = useRef<Int16Array[]>([])
61:  const pendingPcmSampleCountRef = useRef(0)
62:  const conversationInsertedRef = useRef(false)
63:  const endedConversationIdsRef = useRef<Set<string>>(new Set())
64:  const currentUserIdRef = useRef<string | null>(null)
65:  const endingSessionRef = useRef(false)
66:  const mountedRef = useRef(true)
67:  const isConnectedRef = useRef(false)
68:  const statusRef = useRef<GrokStatus>('idle')
69:
```

Server-side/session-side behavior implied by source:

- `input_audio_buffer.commit` creates the user turn on the server
- `response.create` asks the server to create the assistant turn
- the hook never sends `conversation.item.create` to reseed prior turns

Risk: if a voice change requires reconnect, the current implementation has no history reseed path. The local `messages` array would survive only if the UI chooses to preserve it, but the server-side Grok conversation would restart from scratch.

# Group E findings

## E1. Can `session.update` include updated `instructions` for level change?

From source, yes: `instructions` is already part of the current `session.update` payload.

`frontend/src/lib/grokSessionConfig.ts`

```ts
29:export function buildGrokSessionConfig(p: BuildGrokSessionParams): GrokSessionConfig {
30:  const levelText = getGrokLevelInstructions(p.languageDisplay, p.nativeLanguageDisplay, p.level)
31:  const categoryPrompt = p.category
32:    ? GROK_CATEGORIES.find(c => c.id === p.category)!.systemPrompt
33:    : GROK_FREE_CHAT_PROMPT
34:  const tail =
35:    `Start by greeting the user naturally in ${p.languageDisplay} and entering the situation immediately. ` +
36:    `Do not announce what scenario you have chosen. ` +
37:    `Keep responses conversational and short â€” typically 1 to 3 sentences per turn.`
38:
39:  const instructions = `${levelText}\n\n${categoryPrompt}\n\n${tail}`
40:
41:  return {
42:    type: 'session.update',
43:    session: {
44:      voice: p.voice,
45:      instructions,
46:      turn_detection: null,
47:      tools: [{ type: 'web_search' }],
48:      audio: {
49:        input: { format: { type: 'audio/pcm', rate: 24000 } },
50:        output: { format: { type: 'audio/pcm', rate: 24000 } },
51:      },
52:    },
53:  }
54:}
```

Protocol reading:

- xAI docs say `session.update` updates the system prompt: [xAI Realtime reference](https://docs.x.ai/developers/rest-api-reference/inference/voice)
- OpenAI docs say most session properties can be updated at any time: [OpenAI Realtime conversations](https://developers.openai.com/api/docs/guides/realtime-conversations)

So the protocol shape supports it. The repo has no current runtime proof that xAI honors a mid-session instructions swap exactly as desired, but the source does not block it.

## E2. Minimal hook shape for mid-session level change

The current level instructions are derived inside `buildGrokSessionConfig()` via `getGrokLevelInstructions()`:

`frontend/src/lib/grokPedagogy.ts`

```ts
8:export function getGrokLevelInstructions(targetLang: string, nativeLang: string, level: GrokLevel): string {
9:  // Same-language mode: drop bilingual framing, focus on depth and enrichment
10:  if (targetLang === nativeLang) {
11:    switch (level) {
12:      case 'zero':
```

The current session params are stored once on session start:

`frontend/src/hooks/useGrokRealtime.ts`

```ts
606:  const startSession = useCallback(async (params: StartGrokSessionParams) => {
607:    // iOS audio unlock must run inside the user gesture before any await.
608:    primeAudioForIOS()
609:    await teardownSession()
610:
611:    conversationIdRef.current = crypto.randomUUID()
612:    sessionParamsRef.current = params
613:    conversationInsertedRef.current = false
614:    endedConversationIdsRef.current.delete(conversationIdRef.current)
615:    currentAssistantIndexRef.current = null
616:    pendingPcmChunksRef.current = []
617:    pendingPcmSampleCountRef.current = 0
618:    playheadRef.current = 0
619:    setMessages([])
620:    setError(null)
621:
622:    await connectAndConfigure(params)
623:  }, [connectAndConfigure, primeAudioForIOS, teardownSession])
```

Minimal shape:

- add `changeLevel(nextLevel: GrokLevel)` to `useGrokRealtime`
- derive a new config from `sessionParamsRef.current` with `level: nextLevel`
- send a new `session.update`
- update `sessionParamsRef.current.level`
- update the active `speak_conversations.level` row if DB history should match

No current source path does this.

## E3. Voxtral/Gemini mid-session level change reference

`frontend/src/hooks/useVoiceTutor.ts`

```ts
1097:  const selectLevel = useCallback(
1098:    async (selectedLevel: string) => {
1099:      primeAudioForIOS()
1100:      const isInitial = !levelRef.current
1101:      setLevel(selectedLevel)
1102:      levelRef.current = selectedLevel
1103:      if (language) {
1104:        localStorage.setItem(`voice-tutor-level-${language}`, selectedLevel)
1105:      }
1106:      setShowLevelPicker(false)
1107:
1108:      if (isInitial) {
1109:        const lang = language
1110:        const v = voiceRef.current
1111:        if (!lang || !v) return
1112:        try {
1113:          await fetchAndPlayGreeting(lang, v)
1114:        } catch (err) {
1115:          setError(err instanceof Error ? err.message : 'Failed to start conversation')
1116:          setStatus('error')
1117:        }
1118:      }
1119:    },
1120:    [language, fetchAndPlayGreeting, primeAudioForIOS],
1121:  )
```

```ts
398:  const callVoiceChat = useCallback(
399:    async (audio_base64: string | null, lang: string, v?: TutorVoice): Promise<VoiceChatResponse> => {
400:      const body: Record<string, unknown> = {
401:        audio_base64,
402:        language: lang,
403:        history: messagesRef.current.slice(-20).map(({ role, content }) => ({ role, content })),
404:        mime_type: mimeTypeRef.current,
405:        level: levelRef.current || 'intermediate',
406:        native_language: resolveNativeLanguage(),
407:      }
```

```ts
421:        const vibeMode = getGeminiCharacterMode(geminiModeIdRef.current)
422:        if (vibeMode) {
423:          const currentLevel = levelRef.current || 'intermediate'
424:          const tier =
425:            currentLevel === 'zero'     ? vibeMode.geminiVibeFlavor :
426:            currentLevel === 'beginner' ? vibeMode.geminiVibeHint :
427:                                          vibeMode.geminiVibeDirective
428:          body.gemini_vibe_directive = tier
429:        }
```

Reference conclusion:

- Voxtral/Gemini do not rebuild history for level change.
- They do not hot-update a persistent session object.
- They update local level state and send the new level on the next HTTP request, together with preserved client-side history.

## E4. Should Grok mirror Voxtral’s approach, or use lighter `session.update`?

Source-supported options:

1. Lighter-weight Grok path: use `session.update` mid-session to replace `instructions` while keeping the same WebSocket and existing server conversation.
2. Heavier fallback path: tear down and reconnect, then reseed history.

Grok does not need to mirror Voxtral/Gemini exactly because those providers are stateless per-turn HTTP calls with client-held history, while Grok is a live Realtime session. The lighter `session.update` path is the natural design if xAI honors it cleanly. The reconnect path would need new history seeding logic, because the current hook never reseeds prior conversation items.

# Group F findings

## F1. Current persistence status: `speak_conversations` yes, `speak_messages` no

Grok conversation-row insert:

`frontend/src/hooks/useGrokRealtime.ts`

```ts
211:  const persistConversationStart = useCallback(async () => {
212:    if (conversationInsertedRef.current) return
213:    const params = sessionParamsRef.current
214:    const conversationId = conversationIdRef.current
215:    const userId = currentUserIdRef.current
216:    if (!params || !conversationId || !userId) return
217:
218:    conversationInsertedRef.current = true
219:    try {
220:      await supabase.from('speak_conversations').insert({
221:        id: conversationId,
222:        user_id: userId,
223:        language: params.language,
224:        voice_name: params.voice,
225:        character_id: null,
226:        level: params.level,
227:        message_count: 1,
228:        title: null,
229:        started_at: new Date().toISOString(),
230:        provider: 'grok',
231:        gemini_character_mode_id: null,
232:        gemini_voice_name: null,
233:        gemini_accent_id: null,
234:        mode: 'freeform',
235:        grok_voice: params.voice,
236:        grok_category: params.category,
237:      })
238:    } catch (err) {
239:      conversationInsertedRef.current = false
240:      console.warn('[grok-realtime] Failed to create conversation:', err)
241:    }
242:  }, [])
```

There is no `speak_messages` insert in `useGrokRealtime.ts`. Repo search for `speak_messages` and `increment_speak_message_count` only returns `useVoiceTutor.ts`:

```text
frontend/src/hooks/useVoiceTutor.ts:336:      await supabase.from('speak_messages').insert({
frontend/src/hooks/useVoiceTutor.ts:355:      await supabase.from('speak_messages').insert(rows)
frontend/src/hooks/useVoiceTutor.ts:358:      await supabase.rpc('increment_speak_message_count', {
```

## F2. Natural event-handler locations for Grok `speak_messages` inserts

Current event handlers:

`frontend/src/hooks/useGrokRealtime.ts`

```ts
286:      case 'response.text.delta': {
287:        appendAssistantDelta(typeof payload.delta === 'string' ? payload.delta : '')
288:        break
289:      }
```

```ts
306:      case 'response.done': {
307:        await flushPendingAudio()
308:        currentAssistantIndexRef.current = null
309:        if (mountedRef.current && audioQueueRef.current.length === 0) {
310:          setStatus('idle')
311:        }
312:        break
313:      }
314:      case 'conversation.item.input_audio_transcription.completed': {
315:        appendUserTranscript(typeof payload.transcript === 'string' ? payload.transcript : '')
316:        break
317:      }
```

What state is available:

- User turn: `payload.transcript` is directly available at `conversation.item.input_audio_transcription.completed`.
- Assistant turn: the final text is accumulated incrementally through `appendAssistantDelta()`, but `response.done` does not read assistant text from the payload in current code.

So the natural persistence points in the existing hook shape are:

- user row at `conversation.item.input_audio_transcription.completed`
- assistant row at `response.done`, but only if the hook first exposes the completed assistant text through a ref or equivalent

Open technical note: xAI docs document `response.output_audio_transcript.done`, but the hook does not currently handle it.

## F3. Voxtral/Gemini persistence pattern

Conversation creation inserts the greeting as one assistant row:

`frontend/src/hooks/useVoiceTutor.ts`

```ts
308:      await supabase.from('speak_conversations').insert({
309:        id,
310:        user_id: userId,
311:        language: lang,
312:        voice_name: rp
313:          ? rp.npcName
314:          : (isGemini
315:              ? geminiVoiceNameRef.current
316:              : (characterRef.current?.name ?? voiceRef.current?.name ?? null)),
317:        character_id: rp || isGemini ? null : (characterRef.current?.id ?? null),
318:        level: levelRef.current ?? null,
319:        message_count: 1,
320:        title: rp ? rp.title : greeting.slice(0, 80),
321:        started_at: new Date().toISOString(),
322:        provider: providerRef.current,
323:        gemini_character_mode_id: isGemini ? geminiModeIdRef.current : null,
324:        gemini_voice_name: isGemini ? geminiVoiceNameRef.current : null,
325:        gemini_accent_id: isGemini ? geminiAccentIdRef.current : null,
326:        ...(rp
327:          ? {
328:              mode: 'roleplay',
329:              scenario_id: rp.scenarioId,
330:              npc_name: rp.npcName,
331:              context_variant: rp.variantId,
332:            }
333:          : { mode: 'freeform' }),
334:      })
335:
336:      await supabase.from('speak_messages').insert({
337:        conversation_id: id,
338:        role: 'assistant',
339:        content: greeting,
340:      })
```

Each later turn is written in a batch:

```ts
346:  const persistMessages = useCallback(async (userText: string | null, aiText: string) => {
347:    const convId = conversationIdRef.current
348:    if (!convId) return
349:
350:    try {
351:      const rows: Array<{ conversation_id: string; role: string; content: string }> = []
352:      if (userText) rows.push({ conversation_id: convId, role: 'user', content: userText })
353:      rows.push({ conversation_id: convId, role: 'assistant', content: aiText })
354:
355:      await supabase.from('speak_messages').insert(rows)
356:
357:      convMessageCountRef.current += rows.length
358:      await supabase.rpc('increment_speak_message_count', {
359:        conv_id: convId,
360:        inc: rows.length,
361:      })
362:    } catch (err) {
363:      console.warn('[speak-history] Failed to persist messages:', err)
364:    }
365:  }, [])
```

Answer: greeting is written one-at-a-time; subsequent turns are written in batches.

## F4. `increment_speak_message_count` in Grok

`useGrokRealtime.ts` does not call `increment_speak_message_count`.

The only current call site in the repo is:

```text
frontend/src/hooks/useVoiceTutor.ts:358:      await supabase.rpc('increment_speak_message_count', {
```

For Grok, the natural place would be right after the hook successfully inserts the user/assistant `speak_messages` rows for a completed turn. If the design writes the greeting row too, it would also need an increment there or a corrected initial `message_count`.

## F5. `SpeakHistoryPanel` behavior for Grok conversations with zero messages

Conversation list loads from `speak_conversations`:

`frontend/src/components/speak/SpeakHistoryPanel.tsx`

```tsx
154:    supabase
155:      .from('speak_conversations')
156:      .select('*')
157:      .eq('user_id', user.id)
158:      .order('started_at', { ascending: false })
159:      .limit(50)
160:      .then(({ data, error }) => {
161:        if (!error && data) setConversations(data as Conversation[])
162:        setLoading(false)
163:      })
```

Message load for a selected conversation:

```tsx
173:    setMessagesLoading(true)
174:    supabase
175:      .from('speak_messages')
176:      .select('*')
177:      .eq('conversation_id', selectedId)
178:      .order('created_at', { ascending: true })
179:      .then(({ data, error }) => {
180:        if (!error && data) setMessages(data as Message[])
181:        setMessagesLoading(false)
182:      })
```

Empty transcript behavior:

```tsx
424:              {!messagesLoading && messages.length === 0 && (
425:                <div className="flex items-center justify-center py-16 text-gray-600 text-sm">
426:                  No messages in this conversation.
427:                </div>
428:              )}
```

So yes: `SpeakHistoryPanel` renders an empty-state transcript when it encounters a Grok `speak_conversations` row with zero `speak_messages`.

## F6. Schema changes required?

Base schema already supports generic stored messages:

`frontend/supabase/migrations/20260406200000_speak_history.sql`

```sql
35:-- Individual messages within conversations
36:create table if not exists public.speak_messages (
37:  id              uuid primary key default gen_random_uuid(),
38:  conversation_id uuid not null references public.speak_conversations(id) on delete cascade,
39:  role            text not null check (role in ('user', 'assistant')),
40:  content         text not null,
41:  created_at      timestamptz not null default now()
42:);
```

Grok-specific migration only adds conversation-level metadata:

`frontend/supabase/migrations/20260423000000_grok_speak_columns.sql`

```sql
4:alter table public.speak_conversations
5:  add column if not exists grok_voice text;
6:
7:alter table public.speak_conversations
8:  add column if not exists grok_category text;
9:
10:alter table public.speak_conversations
11:  add constraint speak_conversations_grok_voice_check
12:  check (grok_voice is null or grok_voice in ('eve', 'ara', 'rex', 'sal', 'leo'));
13:
14:alter table public.speak_conversations
15:  add constraint speak_conversations_grok_category_check
16:  check (grok_category is null or grok_category in (
17:    'travel', 'business', 'romance', 'philosophy', 'daily_life',
18:    'food', 'arts', 'news'
19:  ));
```

Answer: existing schema is sufficient. No `speak_messages` schema change is required to persist Grok transcripts.

# Regression isolation

Issue 1 is best explained by `frontend/src/pages/Speak.tsx`, not by runtime uncertainty.

The failure is the render branch ordering at:

- `Speak.tsx:223-224` where `handleEndGrokConversation()` ends the session and sets `grokShowTranscript`
- `Speak.tsx:473` where the Grok picker branch returns whenever `!grokSessionActive`
- `Speak.tsx:663` where the transcript branch exists, but too late

Likely cause:

1. End tap runs `handleEndGrokConversation()`.
2. `grok.endSession()` does not clear `grok.messages`.
3. `setGrokSessionActive(false)` makes the earlier picker condition true.
4. The picker branch does not guard on `!grokShowTranscript`.
5. Because that picker branch is evaluated before the transcript branch, the transcript reveal never becomes visible.

So the highest-confidence diagnosis is implementation drift in `Speak.tsx` render ordering and gating, not teardown-time message loss.

Optional confirmation instrumentation:

- log `activeProvider`, `grokSessionActive`, `showGrokLevelPicker`, `grokShowTranscript`, and `grok.messages.length` inside `handleEndGrokConversation()`
- log the same values immediately before the picker branch and immediately before the transcript branch

# Phase 2 scope recommendations

## Bucket A: bug fixes

- End Conversation transcript reveal regression in `Speak.tsx`
- Grok back-button destination regression so active-session back lands on a Grok-local pre-session state instead of the main language picker
- `speaking`-state mic investigation hardening if device instrumentation proves a real barge-in path; otherwise add instrumentation and guard verification only

## Bucket B: history persistence

- Grok writes `speak_messages`
- Grok increments `message_count` consistently with persisted rows
- Grok history row semantics are reconciled with the current initial `message_count: 1` insert

## Bucket C: mid-session controls

- Mid-session level change via `session.update` if xAI honors updated `instructions` on future turns
- Mid-session voice change only if live protocol validation disproves the OpenAI-compatible voice-lock restriction after first audio; otherwise keep it out of scope and treat reconnect as the only supported path

# Open questions

1. xAI’s docs do not explicitly restate OpenAI’s “voice cannot be changed after audio has been emitted” rule, even though xAI says the API is OpenAI-compatible. This should be confirmed against xAI runtime behavior before any Phase 2 voice-hot-swap design is approved.
   - xAI docs: [Voice / Realtime](https://docs.x.ai/developers/rest-api-reference/inference/voice)
   - xAI compatibility note: [Voice Agent API](https://docs.x.ai/developers/model-capabilities/audio/voice-agent)
   - OpenAI Realtime rule: [Realtime conversations](https://developers.openai.com/api/docs/guides/realtime-conversations)
2. xAI docs say `input_audio_buffer.speech_started` is only emitted with `server_vad`. If Sir Robert is still seeing barge-in with `turn_detection: null`, capture live event logs on iOS Safari to verify whether the server is emitting undocumented events or whether the UI observation is cosmetic.
3. Mid-session instructions update is protocol-shaped, but this repo has no proof that xAI applies the new instructions immediately and only to future turns without side effects. A live test should check both behavior and whether the conversation memory remains intact.
4. If Grok transcript persistence is added, decide whether the initial assistant greeting should be backfilled into `speak_messages` so the stored transcript matches the current `message_count: 1` conversation insert semantics.
