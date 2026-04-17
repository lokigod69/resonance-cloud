const GEMINI_TTS_MODEL = 'gemini-3.1-flash-tts-preview'
const GEMINI_TTS_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TTS_MODEL}:generateContent`

export interface GeminiTtsUsage {
  promptTokenCount?: number
  candidatesTokenCount?: number
  totalTokenCount?: number
}

interface GeminiTtsApiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        inlineData?: {
          data?: string
          mimeType?: string
        }
      }>
    }
  }>
  usageMetadata?: GeminiTtsUsage
}

/** Wrap raw 16-bit PCM (mono, 24kHz) in a 44-byte WAV header. Gemini returns
 * raw PCM; clients expect a playable WAV file. */
export function wrapPcmAsWav(pcmBuffer: Buffer, sampleRate = 24000, channels = 1, sampleWidth = 2): Buffer {
  const pcmLength = pcmBuffer.length
  const header = Buffer.alloc(44)
  header.write('RIFF', 0, 'ascii')
  header.writeUInt32LE(36 + pcmLength, 4)
  header.write('WAVE', 8, 'ascii')
  header.write('fmt ', 12, 'ascii')
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(channels, 22)
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(sampleRate * channels * sampleWidth, 28)
  header.writeUInt16LE(channels * sampleWidth, 32)
  header.writeUInt16LE(sampleWidth * 8, 34)
  header.write('data', 36, 'ascii')
  header.writeUInt32LE(pcmLength, 40)
  return Buffer.concat([header, pcmBuffer])
}

export async function generateGeminiTtsFromPrompt(
  prompt: string,
  voiceName: string,
  apiKey = process.env.GOOGLE_AI_API_KEY,
): Promise<{ audio: Buffer; usage: GeminiTtsUsage }> {
  if (!apiKey) throw new Error('GOOGLE_AI_API_KEY not configured')

  let response: Response | null = null
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 20000)

    try {
      response = await fetch(GEMINI_TTS_ENDPOINT, {
        method: 'POST',
        headers: {
          'x-goog-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName } },
            },
          },
        }),
        signal: controller.signal,
      })
    } catch (err) {
      clearTimeout(timer)
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('Gemini TTS timed out after 20s')
      }
      throw err
    }

    clearTimeout(timer)
    if (response.ok) break
    if (attempt === 0) {
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }

  if (!response || !response.ok) {
    const errText = response ? await response.text().catch(() => '') : ''
    throw new Error(`Gemini TTS failed: ${response?.status ?? 'unknown'} ${errText.slice(0, 200)}`)
  }

  const data = await response.json() as GeminiTtsApiResponse
  const inline = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData
  if (!inline?.data) throw new Error('Gemini TTS returned no inlineData')

  const pcm = Buffer.from(inline.data, 'base64')
  return {
    audio: wrapPcmAsWav(pcm),
    usage: data.usageMetadata ?? {},
  }
}
