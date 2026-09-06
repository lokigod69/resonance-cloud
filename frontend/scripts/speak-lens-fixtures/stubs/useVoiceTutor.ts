import { useState } from 'react'
import { scenario } from './scenario'

export type SpeakProvider = 'voxtral' | 'gemini' | 'grok'
export type GeminiPickerStage = 'voice' | 'mode' | 'accent'

export function useVoiceTutor() {
  const [language, setLanguage] = useState<string | null>('de')
  const [provider, setProvider] = useState<SpeakProvider>('grok')
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; revealed?: boolean; audioBase64?: string }>>([])
  const [status, setStatus] = useState<'idle' | 'recording' | 'processing' | 'playing' | 'error'>('idle')
  const [muted, setMuted] = useState(false)
  const [listenMode, setListenMode] = useState(scenario().speakListenMode ?? false)
  const [studyMode, setStudyMode] = useState(false)
  const [geminiPickerStage, setGeminiPickerStage] = useState<GeminiPickerStage>('voice')
  const [geminiVoiceName, setGeminiVoiceName] = useState<string | null>(null)
  const [geminiModeId, setGeminiModeId] = useState<string | null>(null)
  const [geminiAccentId, setGeminiAccentId] = useState('none')
  const [character, setCharacter] = useState<unknown>(null)
  const [voice, setVoice] = useState<string | null>(null)
  const startConversation = () => setMessages([{
    role: 'assistant',
    content: 'Hallo! Worüber möchtest du heute sprechen?',
    revealed: !(scenario().speakListenMode ?? false),
    audioBase64: 'fixture-retained-audio',
  }])
  return {
    language, provider, messages, status, muted, listenMode, studyMode, geminiPickerStage, geminiVoiceName, geminiModeId,
    geminiModeName: null, geminiAccentId, character, voice, level: 'beginner', conversationId: 'fixture-conversation',
    endedMessages: [], error: null, pendingAudio: null, planLimited: false, speakAllowance: null,
    isChangingVoice: false, isEnded: false, isSupported: true, showLevelPicker: false,
    selectLanguage: setLanguage, setProvider, setGeminiPickerStage, setGeminiVoiceName, setGeminiModeId, setGeminiAccentId,
    selectLevel: () => undefined, startConversationWithCharacter: async (nextCharacter: unknown) => { setCharacter(nextCharacter); setVoice('fixture-voice'); startConversation() },
    startConversationWithGemini: async () => startConversation(), applyVoxtralCharacterChange: async () => undefined,
    applyGeminiVoiceChange: async () => undefined, cancelChangeVoice: () => undefined, cancelLevelChange: () => undefined,
    changeLevel: () => undefined, changeVoice: () => undefined, endConversation: async () => undefined, newChat: () => undefined,
    startRecording: async () => setStatus('recording'), stopRecordingIfActive: () => setStatus('processing'), stopAllAudio: () => undefined,
    toggleMuted: () => setMuted((value) => !value), toggleListenMode: () => setListenMode((value) => !value),
    toggleStudyMode: () => setStudyMode((value) => !value),
    revealMessage: (index: number) => setMessages((current) => current.map((message, messageIndex) => messageIndex === index ? { ...message, revealed: true } : message)),
    replayMessageAudio: () => { (window as typeof window & { __replayCalls?: number }).__replayCalls = ((window as typeof window & { __replayCalls?: number }).__replayCalls ?? 0) + 1 },
    playPendingAudio: () => undefined, saveCorrections: async () => undefined,
  }
}
