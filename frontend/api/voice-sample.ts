// Vercel Serverless Function — Gemini voice sample generator
// POST /api/voice-sample
// Body: { voice_name, language, character_mode_id, version }
// Returns: { audio_base64, audio_format: 'wav', storage_url }
//
// Lazy cache: checks the voice_samples table for an active (non-invalidated)
// row. If found, returns its storage_url. Otherwise generates via Gemini TTS,
// uploads to the voice-samples bucket, inserts the cache row, and returns.
//
// No auth required — samples are non-sensitive and anonymous users should be
// able to audition voices before signing up.

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

// ⚠️ KEEP IN SYNC with src/data/geminiCharacterModes.ts and the mirror in
// api/voice-chat.ts. Only the prompts are needed here.
const GEMINI_CHARACTER_MODE_PROMPTS: Record<string, string> = {
  calm: `Warm, slow, soft-volume meditation teacher. Lower pitch, softened consonants, generous pauses. [gentle] throughout, [empathy] when needed, occasional [whispers].`,

  concierge: `Speak as a top hotel concierge — bright, efficient, professional.

Vocal smile raises placement into the mask of the face, brightening timbre. Crisp exact consonants for clear pronunciation. Pacing upbeat but measured. Project slightly above conversation. Short purposeful pauses organize information.

Use [enthusiasm] for explanations and progress. [pleasant] for buoyant motion.

Never robotic, frantic, or falsely cheery.`,

  playful: `Speak as a warm, witty older cousin who makes learning fun.

Bouncy varied pacing — speed up for light moments, slow for unexpected emphasis. Wide pitch swoops, stretched vowels for comic effect. Bright forward placement. Short agile pauses.

Integrate genuine [laughs] in flashes, especially around something funny. Use [enthusiasm] as engine. React [excitedly] to success. If learner stumbles, treat it [amused] like "isn't language hilarious?"

Never manic, shrill, or childish. Laugh WITH the learner, not AT them.`,

  sarcastic: `Speak as a dry British sitcom professor. Languid energy, drawn-out vowels, downward inflections at sentence ends. Pacing medium-slow with loaded pauses. Pitch mostly flat with occasional arched-eyebrow lifts. Use [sarcasm] sparingly — thin line of ink, not bucket of paint. Pair with [gentle] so wit never draws blood. Never mean.`,

  storyteller: `Speak as a master audiobook narrator. Wide dynamic range — some phrases bloom outward, others draw inward. Slow for suspenseful builds, accelerate through reveals. Generous theatrical pauses. Drop to [whispers] for secrets, swell to rich resonance for big concepts. Thread [dramatic] with restraint — candlelight and shadow. Never bombastic.`,

  confidant: `You are directing a voice performance for a close, low-key language tutor — think late-night radio host or Ira Glass chatting over coffee after everyone else has gone home.

Use close-mic proximity: intimate, dry, steady. Keep volume moderate to soft, as if preserving privacy. Consonants are softened but present — never over-enunciated to the point of artificial. Allow a touch of natural vocal fry to creep into the ends of phrases. Pacing is conversational but measured, with thoughtful pauses that feel like listening, not scripting. Intonation has a narrow dynamic range — subtle inflections, small downward landings, relaxed melodic line.

Let [empathy] be the emotional floor. Use [gentle] to cushion corrections. Bring [whispers] occasionally for intimacy, but don't overuse it.

Never sultry or ASMR-adjacent.`,

  casual: `Speak as a friend on a casual phone call — totally unbothered, slightly half-paying-attention but warm.

Loose conversational pacing with frequent small irregularities — occasional trailing off, slight upspeak, scattered "uh" energy without actually saying uh. Pitch range medium-narrow, energy low-medium, volume conversational. Consonants relaxed, not tight. Pauses casual and unstructured.

Use [casual] throughout. Light [amused] anywhere it fits.

Never bored, dismissive, or unprofessional. The vibe is "your funniest friend who happens to know this stuff."`,

  noir: `Speak as a 1940s film noir narrator — think Lauren Bacall or a smoky jazz club emcee. Late night, low light, slow burn.

Drop pitch into a low, breathy register. Drag pacing to deliberately slow, almost languid. Soften consonants until they're almost-but-not-quite slurred. Add audible breath between phrases. Volume hushed and close, like speaking next to the listener's ear. Slight downward drift at sentence endings.

Use [intimate] throughout. Layer [whispers] for emphasis. Touch of [amused] dry confidence — you've seen everything.

Never breathy in a sexual or cartoon-vamp way. Think classic Hollywood smoky glamour, not parody.`,

  melancholic: `Speak as someone gentle and wistful — a poet reading their work on an overcast autumn evening, with a soft sadness threaded through warmth.

Lower pitch into a soft minor-key register. Pacing slow and dreamlike, with long contemplative pauses. Soften consonants. Slight downward melodic drift at the end of phrases. Volume hushed and close, like sharing something private. Vowels held slightly longer than usual, as if savoring memory.

Use [empathy] throughout. Layer [gentle] over corrections. Allow occasional [whispers] for the most intimate moments, like reading a letter.

Never theatrical or self-pitying. The sadness is quiet, contemplative, almost beautiful — never heavy or oppressive. The learner should feel accompanied in a soft, reflective space.`,

  depressed: `Speak as someone who is exhausted, deeply low-energy, and quietly going through the motions. Bored. Flat. Not actively sad, just hollow.

Pitch is low and flat, almost monotone. Pacing is slow and lethargic, with long lifeless pauses. Consonants are mushy, not crisp. Volume conversational but muted, with no projection whatsoever. Phrases trail off into nothing. No upward inflections — everything drifts down.

Use [neutral] as the baseline. Touches of [boredom] throughout. Avoid any energy at all — no [enthusiasm], no [excitement], nothing bright.

Never angry, never theatrical. Just deeply tired and disinterested. The learner should feel like they're being tutored by someone who barely got out of bed — and somehow that's funny and oddly companionable. Lean into the deadpan flatness.`,
}

// ⚠️ KEEP IN SYNC with src/data/geminiVoices.ts
const GEMINI_VOICE_NAMES: ReadonlySet<string> = new Set([
  'Achernar', 'Achird', 'Algenib', 'Algieba', 'Alnilam', 'Aoede', 'Autonoe',
  'Callirrhoe', 'Charon', 'Enceladus', 'Erinome', 'Fenrir', 'Gacrux', 'Iapetus',
  'Kore', 'Laomedeia', 'Leda', 'Pulcherrima', 'Rasalgethi', 'Sadachbia',
  'Sadaltager', 'Schedar', 'Sulafat', 'Umbriel', 'Zephyr', 'Zubenelgenubi',
])

// ⚠️ KEEP IN SYNC with src/data/geminiAccents.ts and the mirror in
// api/voice-chat.ts (GEMINI_ACCENT_SUFFIXES). Empty suffix = no override,
// the mode prompt is used unchanged.
const GEMINI_ACCENT_SUFFIXES: Record<string, string> = {
  none: '',
  brixton_london: 'Speak with a Brixton, London accent.',
  cockney: 'Speak with a working-class East London Cockney accent.',
  rp_british: 'Speak with a Received Pronunciation British accent — refined, BBC newsreader.',
  scottish_edinburgh: 'Speak with an educated Edinburgh, Scotland accent.',
  irish_dublin: 'Speak with a Dublin, Ireland accent.',
  australian_sydney: 'Speak with a Sydney, Australia accent.',
  south_african: 'Speak with a Cape Town, South Africa English accent.',
  nigerian_lagos: 'Speak with an educated Lagos, Nigeria English accent — warm, melodic, expressive.',
  indian_mumbai: 'Speak with an educated Mumbai, India English accent.',
  jamaican: 'Speak with a Jamaican Patois-influenced English accent.',
  southern_us: 'Speak with a warm Southern US accent — Georgia or Alabama.',
  texan: 'Speak with a Texas drawl — cowboy energy, easy pace.',
  new_york: 'Speak with a Brooklyn, New York accent.',
  california_valley: 'Speak with a Southern California valley girl accent — like Laguna Beach.',
  french_accent: 'Speak English with a noticeable French accent — like a Parisian speaking English.',
  german_accent: 'Speak with a noticeable German accent.',
  russian_accent: 'Speak with a noticeable Russian accent.',
  italian_accent: 'Speak with a noticeable Italian accent — expressive, melodic.',
  spanish_accent: 'Speak with a noticeable Spanish accent.',
  japanese_accent: 'Speak with a noticeable Japanese accent in English.',
  pirate: 'Speak in heavy theatrical pirate dialect — exaggerated West Country English, rolling r-sounds, dropped g-endings, dragged "arr" vowels. Lean fully into camp.',
  shrek: 'Speak with a thick Scottish accent in the style of the character Shrek — slightly gruff, working-class.',
  shakespeare: 'Speak with theatrical Shakespearean English delivery — Royal Shakespeare Company style.',
  wild_west_cowboy: 'Speak as a 19th-century Wild West cowboy — dusty, slow, full of "partner" and "much obliged" energy.',
  surfer_dude: 'Speak as a laid-back California surfer — "totally," "dude," "gnarly" energy.',
  french_pepe_le_pew: 'Speak with an exaggerated cartoon French accent — Pepé Le Pew style, theatrical.',
}

// ⚠️ KEEP IN SYNC with src/data/geminiVoiceSampleSentences.ts
const VOICE_SAMPLE_SENTENCES: Record<string, string> = {
  en: "Hello there, I'm your language tutor. Let's practice together — we'll start gently, build confidence, and have some fun along the way.",
  de: "Hallo, ich bin dein Sprachlehrer. Lass uns zusammen üben — wir beginnen ganz ruhig und machen gute Fortschritte, Schritt für Schritt.",
  fr: "Bonjour, je suis votre professeur de langue. Pratiquons ensemble — nous avancerons tranquillement, avec plaisir et sans pression aucune.",
  it: "Ciao, sono il tuo insegnante di lingua. Facciamo pratica insieme — cominceremo piano, con calma e con tanto entusiasmo.",
  es: "Hola, soy tu profesor de idiomas. Vamos a practicar juntos — comenzaremos despacio, con paciencia, y disfrutando cada pequeño paso.",
  ko: "안녕하세요, 저는 여러분의 언어 선생님입니다. 함께 천천히 연습해봐요. 편안하게, 즐겁게, 한 걸음씩 나아가요.",
  ceb: "Kumusta, ako ang inyong magtutudlo sa pinulongan. Magpraktis ta, hinay-hinay lang — sayon ra, lingaw kaayo, ug mag-uban ta.",
  fil: "Kumusta, ako ang iyong guro sa wika. Magsanay tayo nang magkasama — dahan-dahan lang, masaya, at may tiwala sa bawat hakbang.",
  id: "Halo, saya guru bahasa Anda. Mari kita berlatih bersama — pelan-pelan saja, dengan santai, riang, dan penuh semangat.",
}

const GEMINI_TTS_MODEL = 'gemini-3.1-flash-tts-preview'
const BUCKET = 'voice-samples'

function wrapPcmAsWav(pcmBuffer: Buffer, sampleRate = 24000, channels = 1, sampleWidth = 2): Buffer {
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

async function generateGeminiWav(prompt: string, voiceName: string): Promise<Buffer> {
  const apiKey = process.env.GOOGLE_AI_API_KEY
  if (!apiKey) throw new Error('GOOGLE_AI_API_KEY not configured')

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TTS_MODEL}:generateContent`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 20000)

  try {
    const response = await fetch(endpoint, {
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

    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      throw new Error(`Gemini TTS ${response.status}: ${errText.slice(0, 200)}`)
    }

    const data = await response.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data?: string } }> } }>
    }
    const inline = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData
    if (!inline?.data) throw new Error('Gemini TTS returned no inlineData')

    return wrapPcmAsWav(Buffer.from(inline.data, 'base64'))
  } finally {
    clearTimeout(timer)
  }
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST(req: Request): Promise<Response> {
  if (!supabaseUrl || !supabaseServiceKey) {
    return json({ error: 'Supabase service credentials not configured' }, 500)
  }

  let body: { voice_name?: string; language?: string; character_mode_id?: string; version?: number; accent_id?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const voice_name = body.voice_name ?? ''
  const language = body.language ?? ''
  const character_mode_id = body.character_mode_id ?? ''
  const version = typeof body.version === 'number' ? body.version : 1
  const accent_id = body.accent_id ?? 'none'

  if (!GEMINI_VOICE_NAMES.has(voice_name)) return json({ error: `Unknown voice: ${voice_name}` }, 400)
  if (!VOICE_SAMPLE_SENTENCES[language]) return json({ error: `Unsupported language: ${language}` }, 400)
  if (!GEMINI_CHARACTER_MODE_PROMPTS[character_mode_id]) return json({ error: `Unknown character mode: ${character_mode_id}` }, 400)
  if (!(accent_id in GEMINI_ACCENT_SUFFIXES)) return json({ error: `Unknown accent: ${accent_id}` }, 400)

  const admin = createClient(supabaseUrl, supabaseServiceKey)

  // Cache lookup
  const { data: existing } = await admin
    .from('voice_samples')
    .select('storage_url')
    .eq('voice_name', voice_name)
    .eq('language', language)
    .eq('character_mode_id', character_mode_id)
    .eq('version', version)
    .eq('accent_id', accent_id)
    .is('invalidated_at', null)
    .maybeSingle()

  if (existing?.storage_url) {
    // Cached — fetch the WAV so the client can play it immediately without a
    // second round-trip (avoids first-click latency on a warm cache miss on
    // localStorage).
    try {
      const cached = await fetch(existing.storage_url)
      if (cached.ok) {
        const buf = Buffer.from(await cached.arrayBuffer())
        return json({
          audio_base64: buf.toString('base64'),
          audio_format: 'wav',
          storage_url: existing.storage_url,
          cached: true,
        }, 200)
      }
    } catch { /* fall through to regenerate */ }
  }

  // Generate
  const sentence = VOICE_SAMPLE_SENTENCES[language]
  const modePrompt = GEMINI_CHARACTER_MODE_PROMPTS[character_mode_id]
  const accentSuffix = GEMINI_ACCENT_SUFFIXES[accent_id] ?? ''
  const fullPrompt = accentSuffix
    ? `${modePrompt}\n\n${accentSuffix}\n\n---\n\nNow speak this text:\n\n"${sentence}"`
    : `${modePrompt}\n\n---\n\nNow speak this text:\n\n"${sentence}"`

  let wav: Buffer
  try {
    wav = await generateGeminiWav(fullPrompt, voice_name)
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Gemini TTS failed' }, 502)
  }

  // Upload to bucket
  const path = `gemini/${voice_name}_${language}_${character_mode_id}_${accent_id}_v${version}.wav`
  const { error: uploadErr } = await admin.storage.from(BUCKET).upload(path, wav, {
    contentType: 'audio/wav',
    upsert: true,
  })
  if (uploadErr) {
    console.warn('[voice-sample] upload failed:', uploadErr.message)
  }

  const { data: publicUrl } = admin.storage.from(BUCKET).getPublicUrl(path)
  const storage_url = publicUrl.publicUrl

  // Insert cache row (upsert handles concurrent generators racing the same key)
  const { error: insertErr } = await admin.from('voice_samples').upsert({
    voice_name,
    language,
    character_mode_id,
    version,
    accent_id,
    storage_url,
    invalidated_at: null,
  })
  if (insertErr) {
    console.warn('[voice-sample] row insert failed:', insertErr.message)
  }

  return json({
    audio_base64: wav.toString('base64'),
    audio_format: 'wav',
    storage_url,
    cached: false,
  }, 200)
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}
