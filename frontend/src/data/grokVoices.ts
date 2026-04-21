export type GrokVoice = 'eve' | 'ara' | 'rex' | 'sal' | 'leo'

export interface GrokVoiceDef {
  id: GrokVoice
  displayName: string
  tone: string
  description: string
}

export const GROK_VOICES: GrokVoiceDef[] = [
  { id: 'eve', displayName: 'Eve', tone: 'Energetic',     description: 'Engaging and enthusiastic.' },
  { id: 'ara', displayName: 'Ara', tone: 'Warm',          description: 'Balanced and conversational.' },
  { id: 'rex', displayName: 'Rex', tone: 'Confident',     description: 'Professional and articulate.' },
  { id: 'sal', displayName: 'Sal', tone: 'Smooth',        description: 'Versatile across contexts.' },
  { id: 'leo', displayName: 'Leo', tone: 'Authoritative', description: 'Decisive and commanding.' },
]
