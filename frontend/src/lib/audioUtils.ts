// Shared audio playback helpers used by useVoiceTutor (conversation audio)
// and VoiceSampleButton (voice-picker samples). Extracted verbatim from the
// hook so both paths share identical behavior — iOS unlock semantics, mutual
// exclusion via isAborted, MIME mapping.

const MIME_MAP: Record<string, string> = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  pcm: 'audio/pcm',
}

/**
 * Play base64-encoded audio through the Web Audio API.
 * AudioContext must already be unlocked (resumed) before calling.
 */
export async function playAudioViaContext(
  base64: string,
  _format: string,
  ctx: AudioContext,
  onSourceCreated?: (source: AudioBufferSourceNode) => void,
  isAborted?: () => boolean,
): Promise<void> {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
  const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer as ArrayBuffer)
  return new Promise<void>((resolve) => {
    if (isAborted?.()) {
      resolve()
      return
    }
    const source = ctx.createBufferSource()
    source.buffer = audioBuffer
    source.connect(ctx.destination)
    source.onended = () => resolve()
    onSourceCreated?.(source)
    source.start(0)
  })
}

/** Fallback: play via HTMLAudioElement (works on desktop, blocked by iOS in non-gesture contexts) */
export function playAudioViaElement(
  base64: string,
  format: string,
  onElementCreated?: (audio: HTMLAudioElement) => void,
  isAborted?: () => boolean,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
    const blob = new Blob([bytes], { type: MIME_MAP[format] || `audio/${format}` })
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    audio.onended = () => {
      URL.revokeObjectURL(url)
      resolve()
    }
    audio.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Audio playback failed'))
    }
    onElementCreated?.(audio)
    if (isAborted?.()) {
      URL.revokeObjectURL(url)
      resolve()
      return
    }
    audio.play().catch(reject)
  })
}

