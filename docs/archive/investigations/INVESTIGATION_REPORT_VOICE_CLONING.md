# Investigation Report: Voice Cloning Pipeline

**Date:** 2026-04-06
**Script:** `orchestrator/frontend/scripts/generate-voices.ts`
**Run command:** `npx tsx scripts/generate-voices.ts`
**Required env vars:** `ELEVENLABS_API_KEY`, `MISTRAL_API_KEY`

---

## 1. Pipeline Overview

The script is a 2-step pipeline that:

1. **Step 1 — ElevenLabs TTS:** For each voice entry, generates an MP3 clip by calling ElevenLabs Text-to-Speech with a greeting sentence in the voice's language.
2. **Step 2 — Mistral Voice Clone:** For voices where `voxtralSupported: true`, uploads the MP3 clip to Mistral's Voice API to create a cloned voice, receiving a Mistral `voice_id` (UUID) back.
3. **Step 3 — Save results:** Writes `voice-map-results.json` with the mapping of `{name, language, gender, mistralVoiceId, elevenLabsId}` for every successfully cloned voice.

### Flow Diagram

```
VOICES[] array (124 entries)
    │
    ▼
For each voice:
    ├─ ElevenLabs TTS → MP3 file saved to voices/{lang}_{Name}_{gender}.mp3
    │   (500ms delay between calls)
    │   (skips if file already exists)
    │
    ├─ If voxtralSupported == true:
    │   └─ Mistral Voice API → returns UUID
    │       (1000ms delay between calls)
    │
    └─ If voxtralSupported == false:
        └─ Skip Mistral upload (ElevenLabs-only languages)
            
Final: voice-map-results.json (only Voxtral-supported voices)
```

---

## 2. Inputs

### Voice Registry (124 entries)

The script has a hardcoded `VOICES[]` array with these fields per entry:

```typescript
interface VoiceEntry {
  elevenLabsId: string       // ElevenLabs voice ID (for TTS)
  name: string               // Voice name
  language: string           // ISO language code
  languageName: string       // Human-readable language name
  gender: 'male' | 'female'
  voxtralSupported: boolean  // Whether to upload to Mistral
}
```

**Voice counts by language:**

| Language    | Code  | Count | Voxtral Supported |
|-------------|-------|-------|--------------------|
| English     | en    | 20    | Yes                |
| Italian     | it    | 12    | Yes                |
| French      | fr    | 12    | Yes                |
| German      | de    | 14    | Yes                |
| Spanish     | es    | 12    | Yes                |
| Portuguese  | pt    | 10    | Yes                |
| Dutch       | nl    | 4     | Yes                |
| Hindi       | hi    | 6     | Yes                |
| Arabic      | ar    | 6     | Yes                |
| Filipino    | fil   | 10    | **No**             |
| Indonesian  | id    | 10    | **No**             |
| Korean      | ko    | 8     | **No**             |
| **Total**   |       | **124** | **96 yes, 28 no** |

### Greeting Sentences (PHRASES)

These are the exact sentences used to generate the reference MP3 clips. Each is designed to be ~10 seconds of warm, conversational speech:

**English (en):**
> Hey there! Welcome to our conversation. I'm really excited to help you practice today. So tell me, what's something fun you did this week?

**Italian (it):**
> Ciao! Benvenuto nella nostra conversazione. Sono davvero contenta di aiutarti a fare pratica oggi. Allora, raccontami, cosa hai fatto di bello questa settimana?

**French (fr):**
> Salut ! Bienvenue dans notre conversation. Je suis vraiment contente de t'aider a pratiquer aujourd'hui. Alors, dis-moi, qu'est-ce que tu as fait de sympa cette semaine ?

**German (de):**
> Hallo! Schon, dass du da bist. Ich freue mich sehr, heute mit dir zu uben. Also, erzahl mal, was hast du diese Woche Schones erlebt?

**Spanish (es):**
> Hola! Bienvenido a nuestra conversacion. Estoy muy contenta de ayudarte a practicar hoy. Entonces, cuentame, que hiciste de divertido esta semana?

**Portuguese (pt):**
> Ola! Bem-vindo a nossa conversa. Estou muito feliz em te ajudar a praticar hoje. Entao, me conta, o que voce fez de legal essa semana?

**Dutch (nl):**
> Hoi! Welkom bij ons gesprek. Ik ben echt blij om je vandaag te helpen oefenen. Vertel eens, wat heb je deze week leuks gedaan?

**Hindi (hi):**
> namaste! hamari batchit mein aapka swagat hai. aaj aapki madad karke mujhe bahut khushi ho rahi hai. to bataiye, is hafte aapne kya mazedar kiya?

**Arabic (ar):**
> marhaba! ahla wa sahla fi muhadathatna. ana said jiddan bimusaadatik ala al-tadarub al-yawm. qul li, matha faalt mumtian hadha al-usbua?

**Filipino (fil):**
> Kumusta! Maligayang pagdating sa ating usapan. Tuwang-tuwa ako na matulungan kang mag-practice ngayon. Kaya naman, kwentuhan mo ako, anong masaya mong ginawa ngayong linggo?

**Indonesian (id):**
> Halo! Selamat datang di percakapan kita. Saya sangat senang bisa membantu kamu berlatih hari ini. Jadi, ceritakan, apa hal seru yang kamu lakukan minggu ini?

**Korean (ko):**
> annyeonghaseyo! uri daehwae osin geoseul hwanyeonghamnida. oneul yeonseub-eul dowadeurige doeeo jeongmal gippeumnida. geureom ibeon jue jaemiissseotdeon iri mwoyeyo?

**Word counts (approximate):** 25-35 words per sentence. Estimated audio duration: ~8-12 seconds per clip.

---

## 3. API Calls

### Step 1: ElevenLabs Text-to-Speech

**Endpoint:**
```
POST https://api.elevenlabs.io/v1/text-to-speech/{elevenLabsId}
```

**Headers:**
```
xi-api-key: {ELEVENLABS_API_KEY}
Content-Type: application/json
```

**Body:**
```json
{
  "text": "{greeting phrase for language}",
  "model_id": "eleven_multilingual_v2",
  "voice_settings": {
    "stability": 0.5,
    "similarity_boost": 0.75,
    "style": 0.4,
    "use_speaker_boost": true
  }
}
```

**Response:** Raw MP3 audio buffer (saved directly as `.mp3` file)

**Output filename:** `{lang}_{Name}_{gender}.mp3` (e.g., `en_Jon_male.mp3`)

**Rate limiting:** 500ms delay between calls

**Idempotent:** Skips generation if file already exists on disk.

### Step 2: Mistral Voice Clone API

**Endpoint:**
```
POST https://api.mistral.ai/v1/audio/voices
```

**Headers:**
```
Authorization: Bearer {MISTRAL_API_KEY}
Content-Type: application/json
```

**Body:**
```json
{
  "name": "resonance-{lang}-{name_lowercase_alphanumeric}",
  "sample_audio": "{base64-encoded MP3}",
  "sample_filename": "{lang}_{Name}_{gender}.mp3",
  "languages": ["{lang}"],
  "gender": "{male|female}",
  "tags": ["resonance", "tutor", "{language_name_lowercase}"]
}
```

**Response:**
```json
{
  "id": "daec1b31-288a-45ba-a2c0-df0619f562a0"  // Mistral voice UUID
}
```

**Rate limiting:** 1000ms delay between calls

**Voxtral-only:** Skips upload entirely for `voxtralSupported: false` voices (Filipino, Indonesian, Korean)

**Voice name format example:** `resonance-en-jon`, `resonance-de-whispersoul`

---

## 4. Results

### voice-map-results.json Structure

Array of objects, one per successfully cloned Mistral voice:

```json
[
  {
    "name": "Jon",
    "language": "en",
    "languageName": "English",
    "gender": "male",
    "mistralVoiceId": "daec1b31-288a-45ba-a2c0-df0619f562a0",
    "elevenLabsId": "sB7vwSCyX0tQmU24cW2C"
  },
  ...
]
```

**Total entries in results file:** 96 (only Voxtral-supported voices; Filipino/Indonesian/Korean excluded)

### How Results Map to voiceRegistry.ts

The `voiceRegistry.ts` file contains the final `TUTOR_VOICES[]` array used at runtime. Each entry uses the `mistralVoiceId` from the results file. The mapping is by `name` + `language`:

```
voice-map-results.json → voiceRegistry.ts
  .mistralVoiceId      → .mistralVoiceId
  .elevenLabsId        → .elevenLabsId (optional, only for ElevenLabs-only languages)
  .name                → .name
  .language            → .language
  .gender              → .gender
```

### MP3 Files Generated

124 MP3 files exist in `orchestrator/frontend/voices/`:
- All 124 voices from the VOICES[] array have corresponding MP3 files
- Naming: `{lang}_{Name}_{gender}.mp3`
- These files serve double duty: (1) source material for Mistral cloning, (2) preview samples served at `/voices/` for the frontend UI

---

## 5. Adapting for Character Voices

### Current State of Character Voices

The `characterRegistry.ts` has 34 characters:
- **10 Style Tutors** — voices already mapped to existing Mistral voice UUIDs from `voiceRegistry.ts` (reuse tutor voices)
- **19 Persona Characters** — have `// TODO: Clone ElevenLabs voices to Mistral` comments with ElevenLabs IDs
- **5 Public Figures** — have empty `voices: {}` (no voices assigned yet; some rows in CSV have `__PLACEHOLDER__`)

### Characters Needing Voice Cloning (from Voice_assignment.csv)

The CSV maps characters to voice IDs per language. Some cells reference tutor voice names (already cloned), some contain raw ElevenLabs IDs that need cloning:

**Persona characters with ElevenLabs IDs to clone (16 characters x 5 languages = 80 voice slots):**

| Character        | EN | DE | FR | IT | ES |
|------------------|----|----|----|----|-----|
| Marcus Aurelius  | xkDz... | iMHt... | ViSN... | Jfzn... | LnGO... |
| Nietzsche        | ktrG... | t7N6... | f5Ch... | EOVA... | WEXRe... |
| Jesus            | Xju4... | QtXs... | aJ8R... | MTgv... | 8mBR... |
| Buddha           | tTZ0... | 2UgX... | Jrq4... | YpCv... | 9Tcb... |
| Socrates         | 7fbQ... | EQIV... | 5l4t... | Jfjz... | orF2... |
| Aristotle        | zQzv... | fNQu... | hqfr... | ts9s... | U9jm... |
| Oscar Wilde      | Nmpx... | NV8D... | EIe4... | mJSd... | 9F4C... |
| Kafka            | pw8b... | JNpQ... | I0ZN... | j3UN... | rpql... |
| Da Vinci         | G17S... | Gng1... | GFj5... | nNt0... | Gwqt... |
| Tesla            | uju3... | VW65... | hqfr... | 3rL9... | aPuj... |
| Napoleon         | I1T6... | MLFh... | f37T... | aTTi... | HJZs... |
| Dostoyevsky      | Bj9U... | 0oTM... | R89Z... | mENv... | ZCh4... |
| Loki             | 5bh6... | VvmL... | XRxO... | GOAZ... | PHKl... |
| Zeus             | goT3... | NBqe... | UBXZ... | w3aQ... | k8cF... |
| Shiva            | gReW... | czb8... | a5n9... | xsSg... | Vpv1... |
| Kierkegaard      | sPzO... | gGja... | 7c65... | mgIr... | dlGx... |

**Aphrodite** uses existing tutor voices for EN/FR/IT but needs cloning for DE (`r0fLdYmTH96Lr4s10B6K`) and ES (`nbcvT3C2tyOd2OsRAtUf`) = 2 more voices.

**Total new voice clones needed: ~82** (16 chars x 5 langs + 2 for Aphrodite)

### How to Adapt the Script

**Option A: Add to VOICES[] array (straightforward)**

Add new entries to the `VOICES[]` array in `generate-voices.ts` for each character voice:

```typescript
// Character voices — Persona Characters
{ elevenLabsId: 'xkDz8dF9GIt1kG06c9Of', name: 'MarcusAurelius_EN', language: 'en', languageName: 'English', gender: 'male', voxtralSupported: true },
{ elevenLabsId: 'iMHt6G42evkXunaDU065', name: 'MarcusAurelius_DE', language: 'de', languageName: 'German', gender: 'male', voxtralSupported: true },
// ... etc
```

Since the script is idempotent (skips existing MP3 files), re-running will only generate new clips and clone new voices.

**Option B: Create a filtered/selective run mode**

Add CLI args to filter which voices to process:

```bash
npx tsx scripts/generate-voices.ts --only-names "MarcusAurelius_EN,MarcusAurelius_DE"
# or
npx tsx scripts/generate-voices.ts --only-new  # only process entries without existing MP3
```

The script currently does NOT support selective runs — it iterates over the full VOICES[] array. However, it skips ElevenLabs generation for existing files, so adding new entries and re-running is safe. The Mistral clone step does NOT have an idempotency check — it will re-clone if run again.

---

## 6. Rate Limits & Costs

### Rate Limiting in the Script

| Step | Delay | Per-call wait |
|------|-------|---------------|
| ElevenLabs TTS | 500ms between calls | Sequential |
| Mistral Clone | 1000ms between calls | Sequential |

### Estimated Time for Original Run (124 voices)

- ElevenLabs: 124 calls x ~3s (500ms delay + ~2.5s generation) = ~6 minutes
- Mistral: 96 calls x ~2s (1000ms delay + ~1s upload) = ~3 minutes
- **Total: ~9-10 minutes** (plus any retries)

### Estimated Time for Character Run (~82 voices)

- ElevenLabs: 82 calls x ~3s = ~4 minutes
- Mistral: 82 calls x ~2s = ~3 minutes
- **Total: ~7 minutes**

### Cost Estimates

**ElevenLabs TTS (82 new clips):**
- Model: `eleven_multilingual_v2`
- ~30 words per clip x 82 clips = ~2,460 words total
- At ~130 characters/word avg = ~320K characters
- ElevenLabs pricing: ~$0.30 per 1K characters (Creator tier)
- **Estimated cost: ~$0.10-0.50** (negligible — very short clips)

**Mistral Voice Clone (82 new clones):**
- Mistral Voice API pricing varies; voice cloning may be included in the API plan
- Each call uploads ~50-150KB of base64 audio
- **Estimated cost: minimal** (voice creation is typically free or near-free; the cost is in subsequent inference)

### Important Notes

- The Mistral clone endpoint does NOT check for duplicates — running the script twice will create duplicate voices with different UUIDs
- ElevenLabs has per-minute rate limits that may kick in around 10-20 requests/minute depending on plan tier
- The 500ms/1000ms delays in the script are conservative and should avoid rate limits

---

## 7. Key Files Reference

| File | Purpose |
|------|---------|
| `scripts/generate-voices.ts` | The voice cloning pipeline script |
| `voices/voice-map-results.json` | Output: Mistral voice UUIDs mapped to ElevenLabs IDs |
| `voices/*.mp3` | Output: 124 reference audio clips |
| `src/voiceRegistry.ts` | Runtime registry of 96 Voxtral-supported tutor voices |
| `src/characterRegistry.ts` | Character definitions with voice mappings (many TODO) |
| `voices/Voice_assignment.csv` | Master CSV mapping characters to voice IDs per language |
| `VOICE_TUTOR_CHARACTER_SYSTEM.md` | Architecture doc for the character + voice system |

---

## 8. Summary of Findings

1. **The script works.** It successfully generated 124 MP3 clips and cloned 96 voices to Mistral on April 4, 2026.

2. **The script is idempotent for Step 1** (ElevenLabs) — it skips existing MP3 files. It is **NOT idempotent for Step 2** (Mistral) — it will create duplicate voice clones if run twice.

3. **82 new character voices need cloning.** 16 persona characters x 5 languages + 2 missing Aphrodite voices. The ElevenLabs IDs are already documented in `characterRegistry.ts` TODO comments and `Voice_assignment.csv`.

4. **Adapting the script is simple.** Add new entries to the `VOICES[]` array with the character ElevenLabs IDs, run the script, then update `characterRegistry.ts` with the returned Mistral UUIDs.

5. **Cost is negligible.** ~$0.50 max for ElevenLabs, minimal for Mistral. Runtime ~7 minutes.

6. **Public figures (5) and Hitler have `__PLACEHOLDER__` voice IDs** and cannot be cloned until real ElevenLabs voice IDs are assigned.

7. **The greeting sentences are ~10 seconds each** — designed to give Mistral enough audio to clone the voice character. All languages use the same semantic content (warm welcome + question about the week).
