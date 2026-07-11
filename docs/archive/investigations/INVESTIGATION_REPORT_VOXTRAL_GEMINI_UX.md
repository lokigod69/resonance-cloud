# Investigation Report — Voxtral/Gemini UX Improvements + Provider Ordering

**Pinned commit:** `8ec0fbd`  
**Branch:** `main`  
**Scope:** Voxtral/Gemini paths in `Speak.tsx` and `useVoiceTutor` hook. Grok out of scope.

---

## 1. Summary

1. **Provider ordering** is controlled by a single `OPTIONS` array in `ProviderToggle.tsx` (line 11-15). The order is `['voxtral', 'gemini', 'grok']`. The default provider on page entry is hardcoded to `'voxtral'` via both `useState` in `Speak.tsx` (line 84) and `readStoredProvider()` in `useVoiceTutor.ts` (line 117-120), which falls back to `'voxtral'` for any non-`'gemini'` value. Grok is not a persisted provider option.

2. **"New chat"** (`tutor.newChat`) fires immediately with no confirmation — it calls `endConversation()` (which writes `ended_at` to Supabase) then `fetchAndPlayGreeting()`. The existing conversation IS persisted before the new one starts.

3. **Header truncation** in the Voxtral/Gemini State-3 branch (lines 910-926) places speaker name + language in a `min-w-0` flex container with `truncate` class, causing clipping on narrow screens. The Gemini synthetic voice name format `"ModeName · VoiceName"` (set at line 863) is particularly long.

4. **Study mode toggle** (lines 942-954) changes internal state only — no toast, no modal, no visual feedback beyond CSS class changes. An existing `useToast` system and a Radix `Dialog` component are both available in the codebase.

5. **Back button** in State-3 calls `tutor.resetConversation()` which resets ALL state including `language` back to `null`, landing the user on the language picker — the most aggressive possible reset.

6. **Gemini "Hello my friend" leak**: No hardcoded "hello," "my friend," or "finally talk" strings exist anywhere in the codebase. The Gemini L0 greeting prompt correctly instructs mixing native + target language. The leak is model completion behavior (Groq/Llama-3.3-70b), not a prompt bug.

---

## 2. Group A — Provider Ordering

### A1. Provider picker render

The provider picker is `<ProviderToggle>`, rendered in `Speak.tsx` at lines 535-548:

```tsx
// Speak.tsx lines 535-548
{showProviderToggle && (
  <div className="mb-4">
    <ProviderToggle
      value={activeProvider}
      onChange={handleProviderChange}
      disabled={providerToggleDisabled}
      disabledReason={
        isBusy && activeProvider !== 'grok' && !tutor.isChangingVoice
          ? 'Wait for the response to finish…'
          : 'End the current conversation to switch providers.'
      }
      language={tutor.language ?? undefined}
    />
  </div>
)}
```

### A2. Source-of-truth for provider order

`ProviderToggle.tsx` lines 11-15 — a const array literal:

```tsx
// ProviderToggle.tsx lines 11-15
const OPTIONS: Array<{ id: SpeakProvider; short: string; full: string }> = [
  { id: 'voxtral', short: 'VOX', full: 'Voxtral' },
  { id: 'gemini',  short: 'GEM', full: 'Gemini'  },
  { id: 'grok',    short: 'GROK', full: 'Grok'   },
]
```

### A3. Default provider mechanism

Two mechanisms work together:

**In `Speak.tsx` line 84** — `activeProvider` state initializes to `'voxtral'`:
```tsx
// Speak.tsx line 84
const [activeProvider, setActiveProvider] = useState<SpeakProvider>('voxtral')
```

**In `useVoiceTutor.ts` lines 116-120** — the hook reads localStorage but falls back to `'voxtral'`:
```tsx
// useVoiceTutor.ts lines 116-120
function readStoredProvider(): SpeakProvider {
  if (typeof window === 'undefined') return 'voxtral'
  const raw = window.localStorage.getItem(LS_PROVIDER)
  return raw === 'gemini' ? 'gemini' : 'voxtral'
}
```

Note: `readStoredProvider()` only recognizes `'gemini'` as a valid stored value — `'grok'` is not persisted. The localStorage key is `resonance_speak_provider` (line 110).

**In `Speak.tsx` lines 237-253** — when language is cleared, `activeProvider` is reset to `'voxtral'`:
```tsx
// Speak.tsx lines 243-244
clearGrokUiState()
setActiveProvider('voxtral')
```

### A4. Side effects tied to current ordering

Yes — multiple `useEffect` hooks and reset handlers hardcode `'voxtral'` as the fallback:

- `Speak.tsx` line 244: `setActiveProvider('voxtral')` when language is null
- `Speak.tsx` line 217: `resetGrokConversation()` sets `setActiveProvider('voxtral')`
- `Speak.tsx` line 480: `goBack()` in the picker stage sets `setActiveProvider('voxtral')`
- `useVoiceTutor.ts` line 117/119: `readStoredProvider()` returns `'voxtral'` as default

### A5. User preference persistence

The `LS_PROVIDER` key (`resonance_speak_provider`) in localStorage stores the last-used non-Grok provider. Written in `useVoiceTutor.ts` line 271:
```tsx
// useVoiceTutor.ts lines 269-272
useEffect(() => {
  providerRef.current = provider
  writeStored(LS_PROVIDER, provider)
}, [provider])
```

`readStoredProvider()` only returns `'gemini'` or `'voxtral'` — never `'grok'`. To make Grok the default, `readStoredProvider()` would need updating, plus the `activeProvider` initialization in `Speak.tsx` and all the fallback `setActiveProvider('voxtral')` calls.

---

## 3. Group B — "New Chat" Confirmation Flow

### B1. New chat button JSX and handler

`Speak.tsx` lines 993-1001:
```tsx
// Speak.tsx lines 993-1001
<button
  onClick={tutor.newChat}
  disabled={isBusy}
  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-40 shrink-0"
  title={t('speak.newChatTooltip')}
>
  <MessageSquarePlus className="h-3.5 w-3.5" />
  <span className="hidden sm:inline">{t('speak.newChat')}</span>
</button>
```

### B2. Full teardown path

The handler is `tutor.newChat` defined in `useVoiceTutor.ts` lines 1220-1236:

```tsx
// useVoiceTutor.ts lines 1220-1236
const newChat = useCallback(async () => {
  const lang = language
  const v = voiceRef.current
  if (!lang || !v) return
  stopAllAudio()          // 1. Stop any playing audio
  endConversation()       // 2. Mark current conversation ended in Supabase
  setMessages([])         // 3. Clear message history
  messagesRef.current = []
  setPendingAudio(null)   // 4. Clear pending audio
  setError(null)          // 5. Clear errors
  try {
    await fetchAndPlayGreeting(lang, v)  // 6. Start new conversation with same voice
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Something went wrong')
    setStatus('error')
  }
}, [language, fetchAndPlayGreeting, endConversation, stopAllAudio])
```

Step-by-step: (1) stops audio playback, (2) calls `endConversation()` which writes `ended_at` to Supabase, (3-5) clears local state, (6) fetches a new greeting with the same voice/character/level.

### B3. Existing modal/dialog infrastructure

**Yes — two systems exist:**

1. **Toast system** — `@/components/Toast` (bespoke, context-based). Used in `GeneratePG.tsx`, `DeckViewPG.tsx`, `admin/Voices.tsx`, etc. Usage pattern:
```tsx
// Example from GeneratePG.tsx lines 7, 32, 137
import { useToast } from '@/components/Toast'
const { toast } = useToast()
toast(msg, 'error')
```

2. **Radix Dialog** — `@/components/ui/dialog` (full Dialog/DialogContent/DialogHeader/DialogTitle/DialogDescription/DialogFooter). Used in `RedeemCodeDialog.tsx`, `ProfileModal.tsx`, `admin/Users.tsx`, `admin/Content.tsx`, etc. Example usage:
```tsx
// RedeemCodeDialog.tsx lines 122-132
<Dialog open={open} onOpenChange={handleClose}>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>...</DialogTitle>
      <DialogDescription>...</DialogDescription>
    </DialogHeader>
    ...
  </DialogContent>
</Dialog>
```

**No new component needed** — the existing Dialog system is a drop-in fit for a confirmation modal.

### B4. Supabase persistence before new chat

**Yes** — `endConversation()` is called BEFORE the new greeting is fetched. `endConversation()` (lines 367-382) writes `ended_at` timestamp to the `speak_conversations` row. All messages were already persisted incrementally via `persistMessages()` during the conversation. The old conversation is fully persisted before the new one starts.

```tsx
// useVoiceTutor.ts lines 367-382
const endConversation = useCallback(async () => {
  const convId = conversationIdRef.current
  if (!convId) return
  conversationIdRef.current = null
  setConversationId(null)
  convMessageCountRef.current = 0
  try {
    await supabase.from('speak_conversations')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', convId)
  } catch (err) {
    console.warn('[speak-history] Failed to end conversation:', err)
  }
}, [])
```

### B5. Shared code path — Voxtral and Gemini

**Confirmed** — the `newChat` callback is provider-agnostic. It uses `voiceRef.current` (which is a synthetic `TutorVoice` for both Voxtral and Gemini) and `language`. Both providers share the same `newChat` → `endConversation` → `fetchAndPlayGreeting` flow. The same button (lines 993-1001) is rendered regardless of which non-Grok provider is active.

---

## 4. Group C — Header Truncation

### C1. State-3 header for Voxtral/Gemini

`Speak.tsx` lines 898-1003 (the final `return` block — the active conversation view):

```tsx
// Speak.tsx lines 898-927
return (
  <div className="fixed inset-x-0 bottom-0 top-16 sm:top-20 z-30 flex flex-col bg-gray-950">
    <div className="shrink-0 border-b border-white/5 bg-gray-950/80 backdrop-blur-md">
      <div className="flex items-center gap-2 px-4 py-3 max-w-5xl mx-auto w-full">
        <button onClick={tutor.resetConversation} ...>
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <FlagIcon code={tutor.language!} className="w-6 h-auto shrink-0" />
          <div className="min-w-0">
            {tutor.isRoleplayMode ? (
              <>
                <p className="text-sm font-medium text-white truncate">🎭 {tutor.activeScenario?.title}</p>
                <p className="text-xs text-gray-500 truncate">
                  {tutor.activeNpcName} · {selectedLang?.nativeName}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-white truncate">{tutor.character?.name ?? tutor.voice.name}</p>
                <p className="text-xs text-gray-500 truncate">{selectedLang?.nativeName}</p>
              </>
            )}
          </div>
        </div>
        {/* ... emoji buttons follow */}
```

### C2. CSS/width constraints and overflow handling

The name container `<div className="min-w-0">` lives inside a flex child with `flex-1 min-w-0`. Both `<p>` tags have the `truncate` class (Tailwind: `overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`).

The problem: For Gemini, `tutor.voice.name` is the synthetic name set at `useVoiceTutor.ts` line 863:
```tsx
name: `${params.characterModeName} · ${params.voiceName}`,
```
Example: `"Storyteller · Enceladus"` — this is the string that gets truncated to "S..." on narrow screens.

For Voxtral, `tutor.character?.name` is shorter (e.g., "Aerynom") but the mode isn't shown at all. The mode name is only embedded in the synthetic voice name for Gemini.

### C3. Other elements in the header row

After the name container, lines 929-1001 contain these shrink-0 buttons:

| Element | Lines | Width behavior |
|---------|-------|----------------|
| Level emoji (🌱/📗/📘/📕) | 929-940 | `shrink-0`, icon + optional text |
| Study mode (📖) | 942-954 | `shrink-0`, icon + optional text |
| Listen mode (🎧) | 957-969 | `shrink-0`, icon + optional text |
| Change tutor (UserRoundCog) | 972-981 | `shrink-0`, icon + optional text |
| History (History icon) | 984-991 | `shrink-0`, icon + optional text |
| New chat (MessageSquarePlus) | 993-1001 | `shrink-0`, icon + optional text |

All buttons use `shrink-0` and hide their text labels on mobile (`hidden sm:inline`). The name container with `flex-1 min-w-0` gets whatever space remains, which on mobile with 6 icon buttons is very little.

### C4. Layout options

**Option 1: Two-line split — name on top, mode underneath.**
- For Gemini: Line 1 = voice name (e.g., "Enceladus"), Line 2 = mode name (e.g., "Storyteller") + language.
- For Voxtral: Line 1 = character name, Line 2 = language (already the current layout).
- Files: `Speak.tsx` (lines 920-925 — split the display logic), `useVoiceTutor.ts` (expose `geminiModeName` separately instead of concatenating into `voice.name`).
- Smallest change footprint. The two-line layout already exists in the roleplay branch (lines 913-919).

**Option 2: Integrate name into the emoji row.**
- Move speaker name out of the flex-1 container and into the button row as a styled text chip.
- Files: `Speak.tsx` (restructure header layout).
- Risk: further compresses the already-tight button row on mobile. Would likely require moving some buttons to an overflow menu.

**Option 3: Collapse emoji buttons into a "more" overflow menu on mobile.**
- Keep the current name layout but reclaim horizontal space by grouping the 4-6 buttons into a single `⋯` dropdown on narrow screens.
- Files: `Speak.tsx` (introduce a dropdown/popover for mobile), potentially a new `SpeakHeaderMenu` component.
- Most work, but solves the root cause (too many elements competing for space).

### C5. Grok State-3 header for reference

`Speak.tsx` lines 787-823 (Grok active session):

```tsx
// Speak.tsx lines 798-803
<div className="flex items-center gap-2 flex-1 min-w-0">
  <FlagIcon code={tutor.language!} className="w-6 h-auto shrink-0" />
  <div className="min-w-0">
    <p className="text-sm font-medium text-white truncate">{grokHeaderName}</p>
    <p className="text-xs text-gray-500 truncate">{selectedLang?.nativeName}</p>
  </div>
</div>
```

Where `grokHeaderName` is defined at line 130:
```tsx
const grokHeaderName = selectedGrokVoice ? `${grokCategoryLabel} · ${selectedGrokVoice}` : grokCategoryLabel
```

The Grok header has the same truncation structure but far fewer competing buttons (only History + End Conversation), so the `flex-1` container gets much more space.

---

## 5. Group D — Study Mode Toggle Feedback

### D1. Study mode toggle button and handler

`Speak.tsx` lines 942-954:
```tsx
// Speak.tsx lines 942-954
{!tutor.isRoleplayMode && studyWords.hasWords && (
  <button
    onClick={() => tutor.toggleStudyMode(studyWords.studyWords)}
    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-colors shrink-0 ${
      tutor.studyMode
        ? 'bg-cyan-900/40 text-cyan-200 hover:bg-cyan-900/60'
        : 'text-gray-400 hover:text-white bg-white/5 hover:bg-white/10'
    }`}
    title={tutor.studyMode ? t('speak.studyOnTooltip') : t('speak.studyTooltip')}
  >
    <span className="text-sm">📖</span>
    <span className="hidden sm:inline">{tutor.studyMode ? t('speak.studyOn') : t('speak.study')}</span>
  </button>
)}
```

The handler `toggleStudyMode` in `useVoiceTutor.ts` lines 1171-1176:
```tsx
// useVoiceTutor.ts lines 1171-1176
const toggleStudyMode = useCallback((words: Array<{ word: string; translation: string }>) => {
  const newMode = !studyModeRef.current
  studyModeRef.current = newMode
  setStudyMode(newMode)
  studyWordsRef.current = newMode ? words : []
}, [])
```

### D2. State field controlling study mode

`studyMode` is a local React state (`useState(false)` at line 196) synced to `studyModeRef` (line 197). It is NOT persisted to localStorage, Supabase, or URL. It resets on every `resetConversation()`, `selectLanguage()`, and `newChat()` (implicitly via `startRoleplay`).

### D3. Existing toast system

**Yes — `@/components/Toast` exists.** It is a bespoke context-based toast system. Full component at `frontend/src/components/Toast.tsx` (55 lines):

```tsx
// Toast.tsx lines 1-11 (key exports)
import { useState, useCallback, createContext, useContext, useRef } from 'react'
import { X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'
interface ToastItem { id: number; message: string; type: ToastType }

const ToastContext = createContext<{ toast: (message: string, type?: ToastType) => void }>({
  toast: () => {},
})

export const useToast = () => useContext(ToastContext)
```

Usage pattern (from `GeneratePG.tsx`):
```tsx
import { useToast } from '@/components/Toast'
const { toast } = useToast()
toast('Study mode on', 'info')  // <-- this is all that would be needed
```

Toasts auto-dismiss after 3500ms (line 20). Positioned fixed bottom-right.

### D4. Implementation path for study mode feedback

Since the toast system already exists, adding feedback requires:
1. Import `useToast` in `Speak.tsx`
2. Call `toast(...)` immediately after `tutor.toggleStudyMode(...)` on line 944
3. Two calls: `toast(t('speak.studyModeOn'), 'info')` / `toast(t('speak.studyModeOff'), 'info')`

No new component or library needed. ~5 lines of code.

### D5. Existing modal infrastructure (overlap with B3)

**Yes** — the Radix `Dialog` component at `@/components/ui/dialog` is available as documented in B3. Either toast or dialog could provide the feedback. Toast is more appropriate for brief state-change confirmations; dialog is better for the "new chat" confirmation (Group B).

---

## 6. Group E — Back Button Destination

### E1. Back button render in State-3

`Speak.tsx` lines 902-908:
```tsx
// Speak.tsx lines 902-908
<button
  onClick={tutor.resetConversation}
  className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
  title={t('speak.backTooltip')}
>
  <ArrowLeft className="h-5 w-5" />
</button>
```

### E2. Handler trace

The handler is `tutor.resetConversation`, defined at `useVoiceTutor.ts` lines 1433-1466:

```tsx
// useVoiceTutor.ts lines 1433-1466
const resetConversation = useCallback(() => {
  stopAllAudio()
  endConversation()
  releaseResources()

  setLanguage(null)           // <-- THIS is why it goes all the way back
  setVoice(null)
  voiceRef.current = null
  setCharacter(null)
  characterRef.current = null
  previousStateRef.current = null
  setShowLevelPicker(false)
  setLevel(null)
  levelRef.current = null
  setMessages([])
  messagesRef.current = []
  setPendingAudio(null)
  setError(null)
  setStatus('idle')
  setIsChangingVoice(false)
  studyModeRef.current = false
  studyWordsRef.current = []
  setStudyMode(false)
  listenModeRef.current = false
  setListenMode(false)
  // Roleplay cleanup
  isRoleplayRef.current = false
  setIsRoleplayMode(false)
  setActiveScenario(null)
  setActiveNpcName(null)
  scenarioPromptRef.current = null
  roleplayMetaRef.current = null
  setGeminiPickerStageState('voice')
}, [releaseResources, endConversation, stopAllAudio])
```

### E3. Full state transition on back-tap today

Every state flag is reset:
- `language` → `null` (triggers language picker render at line 273: `if (!tutor.language)`)
- `voice` → `null`
- `character` → `null`
- `level` → `null`
- `messages` → `[]`
- `conversationId` → `null` (via `endConversation()`)
- `studyMode` → `false`
- `listenMode` → `false`
- `isRoleplayMode` → `false`
- `isChangingVoice` → `false`
- `geminiPickerStage` → `'voice'`
- AudioContext and MediaStream are released

Final render state: the language picker grid (lines 273-351), which is `State 0` — the very first screen.

### E4. Desired state transition (per Sir Robert)

To land on the character/voice picker instead of the language picker, the back button should:

**Preserve:**
- `language` — keep the selected language
- `geminiPickerStage` — keep at `'voice'` (the initial Gemini picker stage)
- `grokLevel` (in Speak.tsx) — already persisted in localStorage

**Reset:**
- `voice` → `null` (this triggers the picker render at line 473: `activeProvider !== 'grok' && !tutor.voice`)
- `character` → `null`
- `messages` → `[]`
- `conversationId` → `null`
- `studyMode`, `listenMode`, `level` — reset
- `isRoleplayMode` — reset

This would land on `State 2` (the voice/character picker with provider toggle), preserving the user's language selection.

A new function like `endAndReturnToPicker()` could be introduced that does the reset of `resetConversation()` minus the `setLanguage(null)` call. The `changeVoice()` callback (lines 1123-1169) already does a similar partial reset (keeps language, clears voice/character) and could serve as a model.

### E5. Shared handler with "new chat"?

**No** — the back button calls `tutor.resetConversation()` while new chat calls `tutor.newChat()`. They are separate code paths:

- `resetConversation()` → clears everything including language, ends conversation, releases audio resources
- `newChat()` → ends conversation, clears messages, fetches new greeting with SAME voice/language/level

However, both call `endConversation()` internally, so the Supabase persistence path is shared. The redesigns are independent — back button needs a new partial-reset function; new chat just needs a confirmation gate.

---

## 7. Group F — Gemini "Hello My Friend" Greeting Leak

### F1. Grep results

**`hello` (case-insensitive) in `frontend/api/prompts/`:** No matches.

**`hello` in `frontend/src/`:**
```
frontend/src/lib/translations.ts:252 — 'speak.levelBeginnerDesc': 'I know basics — hello, thank you, numbers'
frontend/src/data/geminiVoiceSampleSentences.ts:9 — en: "Hello there, I'm your language tutor..."
```
Neither is a prompt string — one is a UI label, the other is a TTS sample sentence.

**`my friend` in entire `frontend/`:** No matches.

**`finally talk` in entire `frontend/`:** No matches.

**`Hello` in `frontend/api/`:** No matches.

### F2. Gemini greeting / initial-message builder

The greeting is assembled in `api/voice-chat.ts` lines 710-741:

```tsx
// voice-chat.ts lines 710-741
} else {
  // No audio, no text — initial greeting request
  const nativeLangName = resolveNativeLangName(native_language)
  const studyWord = study_words && study_words.length > 0
    ? study_words[Math.floor(Math.random() * study_words.length)]
    : null
  let greetingInstruction: string
  if (character) {
    greetingInstruction = buildVoxtralGreeting({...})
  } else if (gemini_vibe_directive) {
    greetingInstruction = buildGeminiGreeting({
      level,
      targetLangName: lang.name,
      nativeLangName,
      studyWord,
    })
  } else {
    greetingInstruction = buildGenericGreeting({...})
  }
  messages.push({ role: 'user', content: greetingInstruction })
}
```

The Gemini-specific greeting builder is in `api/prompts/gemini.ts` lines 73-93:

```tsx
// gemini.ts lines 73-93
export function buildGeminiGreeting(input: GeminiGreetingInput): string {
  const { level, targetLangName, nativeLangName, studyWord } = input

  const studyAddendum = studyWord
    ? ` If it fits your opening, you can weave in the word "${studyWord.word}" (${studyWord.translation}).`
    : ''

  if (level === 'zero') {
    return `Open the conversation with the student. Use ${nativeLangName} and ${targetLangName} together naturally — mix them however feels right. Let your mood come through.${studyAddendum}`
  }

  if (level === 'beginner') {
    return `Open the conversation with the student in ${targetLangName}, with some ${nativeLangName} for scaffolding. Let your mood come through.${studyAddendum}`
  }

  // advanced / intermediate / fallback
  return `Open the conversation with the student in ${targetLangName}. Let your mood come through.`
}
```

### F3. Walked example: German, native=English, level=zero, Gemini

**System prompt** (walked from `buildGeminiSystemPrompt`, line 31):
```
You are a language tutor with a distinct personality, helping someone practice German (Deutsch).
The student's native language is English.

PERSONALITY: [geminiVibeFlavor for selected mode, e.g. "Your tone is unhurried and grounded."]

LEVEL: COMPLETE ZERO — The student is just starting with German.

LANGUAGE MIX: About 70% English, 30% German.
[... full level instructions from pedagogy.ts lines 91-98 ...]

GENERAL RULES:
- Your voice is performed with mood and prosodic coloring...
[... geminiRules from gemini.ts lines 15-20 ...]
```

**Greeting user message** (walked from `buildGeminiGreeting`, level='zero'):
```
Open the conversation with the student. Use English and German together naturally — mix them however feels right. Let your mood come through.
```

**Label: Walked from source, not executed.**

Note: The greeting instruction says "Use English and German together naturally." It does NOT say "Hello" or "my friend." The 70% English / 30% German ratio in the system prompt is correctly set. The LLM (Groq/Llama-3.3-70b) generates the actual greeting text.

### F4. Walked example: French, native=English, level=zero, Gemini

**System prompt** (identical structure):
```
You are a language tutor with a distinct personality, helping someone practice French (Français).
The student's native language is English.

PERSONALITY: [selected mode's vibe flavor]

LEVEL: COMPLETE ZERO — The student is just starting with French.

LANGUAGE MIX: About 70% English, 30% French.
[... level instructions ...]

[... geminiRules ...]
```

**Greeting user message:**
```
Open the conversation with the student. Use English and French together naturally — mix them however feels right. Let your mood come through.
```

**Label: Walked from source, not executed.**

### F5. Hardcoded English fallback

There is no hardcoded English fallback or `Hello, ${user}` template anywhere in the greeting assembly. The greeting builders (`buildGeminiGreeting`, `buildVoxtralGreeting`, `buildGenericGreeting`) all produce *instructions to the LLM about what to say*, not the actual greeting text.

The closest fallback is in `resolveNativeLangName()` in `pedagogy.ts` line 44:
```tsx
// pedagogy.ts line 44
export function resolveNativeLangName(nativeLang: string): string {
  return LANGUAGE_CONFIG[nativeLang]?.name || NATIVE_LANGUAGE_NAMES[nativeLang] || 'English'
}
```
This falls back to `'English'` for the *native language name* (not the greeting text) if the browser language code is unrecognized. This would cause the system prompt to say "The student's native language is English" even if that's wrong — but it would not inject "Hello my friend."

### F6. Model completion behavior hypothesis

**This is flagged as an open question.**

The prompt text at level `zero` correctly instructs: `"Use English and German together naturally — mix them however feels right."` There is no instruction to say "Hello my friend" or any English-only greeting. The `temperature: 1.0` setting for greetings (line 759) adds variety but doesn't explain a consistent English-only pattern.

The "Hello my friend, I am so happy that we can finally talk" phrasing is a known default-behavior pattern from Groq/Llama-3.3-70b when given open-ended greeting instructions. The fix would be **prompt hardening** — adding explicit negative instructions like "Do NOT use generic English greetings like 'Hello my friend'" or providing an example opening structure. This is a prompt-tuning task, not a code bug.

---

## 8. Cross-Cutting Dependencies

| Issue pair | Shared code | Coordination needed |
|------------|-------------|-------------------|
| B (new chat) ↔ E (back button) | Both call `endConversation()` for Supabase persistence. Different top-level handlers (`newChat` vs `resetConversation`). | Independent implementations. No coordination needed. |
| B (new chat confirmation) ↔ D (study mode toast) | Both need UI feedback components. Toast exists; Dialog exists. | Toast for D, Dialog for B. No conflict. |
| C (header truncation) ↔ D (study mode feedback) | Study mode button is IN the header row (lines 942-954). | If Option 3 (overflow menu) is chosen for C, the study mode button would move into the menu, changing D's toast trigger location. |
| A (provider ordering) ↔ E (back button) | `resetConversation()` resets `activeProvider` to `'voxtral'` implicitly (via `setLanguage(null)` → `useEffect` at line 237-244 setting `setActiveProvider('voxtral')`). | If A changes the default to Grok, the fallback in E's reset path must also change. |

---

## 9. Net-New-Scope Flags

| Item | Status | Notes |
|------|--------|-------|
| New modal system | **NOT NEEDED** | Radix `Dialog` already in `@/components/ui/dialog`, used in 6+ places. |
| New toast system | **NOT NEEDED** | Bespoke `useToast` already in `@/components/Toast`, used in 5+ pages. |
| New partial-reset function | **NEEDED** | For Issue E: a `resetConversation`-like function that preserves `language`. Could be a new callback on the `useVoiceTutor` hook or a parameterized version of `resetConversation`. |
| New translation keys | **NEEDED** | For Issues B and D: confirmation dialog copy ("Leave this conversation?") and toast messages ("Study mode on/off"). |
| Prompt hardening | **NEEDED** | For Issue F: additional negative instructions in the Gemini L0 greeting to prevent English-only openers. No library or migration — just prompt text changes. |

---

## 10. Open Questions

1. **Issue A — Grok as default for ALL users?** Should Grok be default universally, or should the `LS_PROVIDER` localStorage preference still override for returning users who explicitly chose a different provider? If Grok becomes the hardcoded first-entry default but preferences are respected, only `readStoredProvider()` and `OPTIONS` array order need updating. If Grok should always be first regardless of preference, the localStorage persistence should be removed or ignored.

2. **Issue A — Grok unavailable for Tagalog.** `ProviderToggle.tsx` line 26 disables Grok for `language === 'fil'`. If Grok becomes the default, what should happen when a Tagalog user enters Speak? Fall back to Voxtral? Show Grok as default but disabled?

3. **Issue E — Exact landing state.** Sir Robert says "character or voice picker" — should the back button land on the voice picker with the provider toggle visible (allowing the user to switch providers), or should it land on the character/voice grid for their current provider only?

4. **Issue F — Is the "Hello my friend" pattern reproducible?** The investigation establishes that the prompt is clean, but the actual frequency and consistency of the leak from Groq/Llama-3.3-70b has not been measured. If the model produces English-only greetings >50% of the time at L0, prompt hardening alone may not suffice — the greeting builder may need to provide a structural template (e.g., "Start with: [target language greeting]. Then switch to English...").

5. **Issue B — Should the confirmation gate also apply to the Grok "Start new conversation" button?** The Grok post-session screen (lines 721-726) has a "Start new conversation" button (`startNewGrokConversation`, lines 227-231) that does not end a session (it's already ended). Different UX context — may not need confirmation. But the Grok active-session back button (line 791, `resetGrokConversation`) does teardown without confirmation, mirroring Issue E.
