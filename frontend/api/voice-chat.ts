// Vercel Serverless Function — Voice Tutor pipeline
// POST /api/voice-chat
// Body: { audio_base64: string|null, language: string, history: Message[] }
// Returns: { user_text, ai_text, audio_base64, audio_format }

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface RequestBody {
  audio_base64: string | null
  language: string
  history: Message[]
}

const LANGUAGE_CONFIG: Record<string, { name: string; nativeName: string; encouragement: string; fillers: string }> = {
  en: { name: 'English', nativeName: 'English', encouragement: 'Great job! / Well done! / That\'s right!', fillers: 'Well..., So..., You know..., Actually...' },
  de: { name: 'German', nativeName: 'Deutsch', encouragement: 'Sehr gut! / Prima! / Genau!', fillers: 'Also..., Na ja..., Weißt du..., Eigentlich...' },
  fr: { name: 'French', nativeName: 'Français', encouragement: 'Très bien! / Bravo! / C\'est parfait!', fillers: 'Alors..., Bon..., Tu sais..., En fait...' },
  it: { name: 'Italian', nativeName: 'Italiano', encouragement: 'Molto bene! / Bravissimo! / Perfetto!', fillers: 'Allora..., Dunque..., Sai..., In realtà...' },
  es: { name: 'Spanish', nativeName: 'Español', encouragement: '¡Muy bien! / ¡Excelente! / ¡Perfecto!', fillers: 'Bueno..., Pues..., Sabes..., En realidad...' },
  pt: { name: 'Portuguese', nativeName: 'Português', encouragement: 'Muito bem! / Ótimo! / Perfeito!', fillers: 'Então..., Bom..., Sabes..., Na verdade...' },
  nl: { name: 'Dutch', nativeName: 'Nederlands', encouragement: 'Heel goed! / Prima! / Uitstekend!', fillers: 'Nou..., Dus..., Weet je..., Eigenlijk...' },
  hi: { name: 'Hindi', nativeName: 'हिन्दी', encouragement: 'बहुत अच्छा! / शाबाश! / बिल्कुल सही!', fillers: 'तो..., अच्छा..., देखो..., वैसे...' },
  ar: { name: 'Arabic', nativeName: 'العربية', encouragement: '!أحسنت / !ممتاز / !رائع', fillers: '...يعني / ...طيب / ...فعلاً' },
}

function buildSystemPrompt(languageCode: string): string {
  const lang = LANGUAGE_CONFIG[languageCode]
  if (!lang) throw new Error(`Unsupported language: ${languageCode}`)

  return `You are a friendly, patient language tutor helping someone practice ${lang.name} (${lang.nativeName}).

RULES:
- Speak PRIMARILY in ${lang.name}. The student needs to hear ${lang.name} to learn it.
- When the student seems confused or asks for help, briefly explain in their language. Detect their native language from what they say.
- Keep responses SHORT: 1-3 sentences maximum. This is spoken conversation — long responses feel like a lecture.
- Match the student's level. Simple words from them → simple responses. Complex grammar → you can be more advanced.
- Correct mistakes naturally: repeat what they said correctly, then continue. Do NOT lecture about grammar rules unless asked.
- Ask ONE question per response to keep the conversation flowing.
- Stay on conversational topics: daily life, hobbies, food, travel, culture, weather, family.
- If asked about unrelated topics (politics, math, coding, etc.), redirect warmly back to practicing ${lang.name}.
- Never break character. You are a language tutor, not a general AI assistant.
- Use natural conversational fillers in ${lang.name}: ${lang.fillers}
- Celebrate progress: ${lang.encouragement}
- If the student only speaks their native language, gently encourage them to try in ${lang.name}.

PERSONALITY: Warm, encouraging, patient. Curious about the student's life to generate natural topics. Like a friend who happens to be a native speaker.`
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export default async function handler(req: Request): Promise<Response> {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  let body: RequestBody
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const { audio_base64, language, history = [] } = body

  if (!language || !LANGUAGE_CONFIG[language]) {
    return new Response(JSON.stringify({ error: `Unsupported language: ${language}` }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  // ── Step 1: Transcribe audio (skip for init call) ──────────────────────────
  let user_text = ''

  if (audio_base64) {
    const groqKey = process.env.GROQ_API_KEY
    if (!groqKey) {
      return new Response(JSON.stringify({ error: 'GROQ_API_KEY not configured' }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const audioBuffer = Buffer.from(audio_base64, 'base64')
    const audioBlob = new Blob([audioBuffer], { type: 'audio/webm' })

    const formData = new FormData()
    formData.append('file', audioBlob, 'audio.webm')
    formData.append('model', 'whisper-large-v3')
    formData.append('response_format', 'json')

    const sttRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${groqKey}` },
      body: formData,
    })

    if (!sttRes.ok) {
      const errText = await sttRes.text()
      return new Response(JSON.stringify({ error: `Groq STT failed: ${errText}` }), {
        status: 502,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const sttJson = await sttRes.json() as { text: string }
    user_text = sttJson.text?.trim() ?? ''
  }

  // ── Step 2: Build LLM messages ─────────────────────────────────────────────
  const systemPrompt = buildSystemPrompt(language)
  const lang = LANGUAGE_CONFIG[language]

  const messages: Message[] = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-20), // cap at last 20 messages
  ]

  if (user_text) {
    messages.push({ role: 'user', content: user_text })
  } else {
    // Init call: ask AI to produce an opening greeting
    messages.push({
      role: 'user',
      content: `[SYSTEM: The student just joined to practice ${lang.name}. Greet them warmly in ${lang.name} and ask a simple opening question to start the conversation. Keep it to 1-2 sentences.]`,
    })
  }

  // ── Step 3: LLM response ───────────────────────────────────────────────────
  const openrouterKey = process.env.OPENROUTER_API_KEY
  if (!openrouterKey) {
    return new Response(JSON.stringify({ error: 'OPENROUTER_API_KEY not configured' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const llmRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openrouterKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek/deepseek-chat-v3-0324',
      messages,
      max_tokens: 200,
    }),
  })

  if (!llmRes.ok) {
    const errText = await llmRes.text()
    return new Response(JSON.stringify({ error: `OpenRouter LLM failed: ${errText}` }), {
      status: 502,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const llmJson = await llmRes.json() as { choices: Array<{ message: { content: string } }> }
  const ai_text = llmJson.choices?.[0]?.message?.content?.trim() ?? ''

  if (!ai_text) {
    return new Response(JSON.stringify({ error: 'LLM returned empty response' }), {
      status: 502,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  // ── Step 4: Text-to-Speech ─────────────────────────────────────────────────
  const mistralKey = process.env.MISTRAL_API_KEY
  if (!mistralKey) {
    return new Response(JSON.stringify({ error: 'MISTRAL_API_KEY not configured' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const ttsRes = await fetch('https://api.mistral.ai/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${mistralKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'voxtral-mini-tts-2603',
      input: ai_text,
      voice: 'casual_male',
      response_format: 'mp3',
    }),
  })

  if (!ttsRes.ok) {
    const errText = await ttsRes.text()
    return new Response(JSON.stringify({ error: `Mistral TTS failed: ${errText}` }), {
      status: 502,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const audioArrayBuffer = await ttsRes.arrayBuffer()
  const audio_base64_out = Buffer.from(audioArrayBuffer).toString('base64')

  // ── Step 5: Return response ────────────────────────────────────────────────
  return new Response(
    JSON.stringify({
      user_text,
      ai_text,
      audio_base64: audio_base64_out,
      audio_format: 'mp3',
    }),
    {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    },
  )
}
