import { useState } from 'react'
import { scenario } from './scenario'

export function canUseGuidedSpeechRecognition() {
  return scenario().speech !== 'unsupported'
}

export function useGuidedSpeechRecognition() {
  const current = scenario()
  const [status, setStatus] = useState(current.speech === 'error' ? 'error' : 'idle')
  return {
    status,
    transcript: '',
    error: current.speech === 'error' ? 'Fixture microphone permission denied.' : null,
    isSupported: current.speech !== 'unsupported',
    startRecording: async () => setStatus('error'),
    stopRecording: () => {},
    reset: () => setStatus('idle'),
  }
}
