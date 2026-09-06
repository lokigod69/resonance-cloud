import { useState } from 'react'

export function useGrokRealtime() {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'recording' | 'thinking' | 'speaking' | 'error'>('idle')
  const [isConnected, setConnected] = useState(false)
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; timestamp: number }>>([])
  return {
    status, isConnected, messages, error: null, planLimited: false, voice: 'eve', category: 'travel', freeChat: false,
    startSession: async () => { setConnected(true); setStatus('idle'); setMessages([{ role: 'assistant', content: 'Hallo! Lass uns sprechen.', timestamp: Date.now() }]) },
    reconnect: async () => setConnected(true), endSession: async () => setConnected(false),
    startListening: () => setStatus('recording'), sendTurn: () => setStatus('thinking'),
  }
}
