// Resonance Voice Pipeline
// Run with: npx tsx scripts/generate-voices.ts
// Requires env vars: ELEVENLABS_API_KEY, MISTRAL_API_KEY
//
// Step 1: Generates reference MP3 clips for every voice via ElevenLabs TTS
// Step 2: Uploads Voxtral-compatible clips to Mistral Voices API for cloning
// Step 3: Outputs voice-map-results.json + a grouped summary to paste into VOICE_MAP

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY
const VOICES_DIR = path.join(__dirname, '../voices')
const RESULTS_FILE = path.join(__dirname, '../voices/voice-map-results.json')

const ELEVENLABS_MODEL = 'eleven_multilingual_v2'
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/text-to-speech'

// ============================================================
// VOICE REGISTRY — All voices to generate
// ============================================================

interface VoiceEntry {
  elevenLabsId: string
  name: string
  language: string
  languageName: string
  gender: 'male' | 'female'
  voxtralSupported: boolean
}

const VOICES: VoiceEntry[] = [
  // ── English ─────────────────────────────────────────────
  { elevenLabsId: 'sB7vwSCyX0tQmU24cW2C', name: 'Jon',         language: 'en', languageName: 'English',    gender: 'male',   voxtralSupported: true },
  { elevenLabsId: 'q0IMILNRPxOgtBTS4taI', name: 'Drew',        language: 'en', languageName: 'English',    gender: 'male',   voxtralSupported: true },
  { elevenLabsId: 'J2FGlQG8Gd7x8uEDt2H8', name: 'Pharao',      language: 'en', languageName: 'English',    gender: 'male',   voxtralSupported: true },
  { elevenLabsId: 'P4DhdyNCB4Nl6MA0sL45', name: 'Andy',        language: 'en', languageName: 'English',    gender: 'male',   voxtralSupported: true },
  { elevenLabsId: 'Bj9UqZbhQsanLzgalpEG', name: 'Austin',      language: 'en', languageName: 'English',    gender: 'male',   voxtralSupported: true },
  { elevenLabsId: 'UmQN7jS1Ee8B1czsUtQh', name: 'Theo',        language: 'en', languageName: 'English',    gender: 'male',   voxtralSupported: true },
  { elevenLabsId: '6OzrBCQf8cjERkYgzSg8', name: 'Jamal',       language: 'en', languageName: 'English',    gender: 'male',   voxtralSupported: true },
  { elevenLabsId: '1sl7XMHkUEezwYy9NbJU', name: 'Marcus',      language: 'en', languageName: 'English',    gender: 'male',   voxtralSupported: true },
  { elevenLabsId: 'kqVT88a5QfII1HNAEPTJ', name: 'DeclanSage',  language: 'en', languageName: 'English',    gender: 'male',   voxtralSupported: true },
  { elevenLabsId: 'Dgd9MUMSyPeTgbbDIZ0t', name: 'Jacob',       language: 'en', languageName: 'English',    gender: 'male',   voxtralSupported: true },
  { elevenLabsId: 'zGjIP4SZlMnY9m93k97r', name: 'Hope',        language: 'en', languageName: 'English',    gender: 'female', voxtralSupported: true },
  { elevenLabsId: 'RGb96Dcl0k5eVje8EBch', name: 'Serena',      language: 'en', languageName: 'English',    gender: 'female', voxtralSupported: true },
  { elevenLabsId: 'vr5WKaGvRWsoaX5LCVax', name: 'Cherie',      language: 'en', languageName: 'English',    gender: 'female', voxtralSupported: true },
  { elevenLabsId: 'NtS6nEHDYMQC9QczMQuq', name: 'Katherine',   language: 'en', languageName: 'English',    gender: 'female', voxtralSupported: true },
  { elevenLabsId: 'ZUrEGyu8GFMwnHbvLhv2', name: 'Monika',      language: 'en', languageName: 'English',    gender: 'female', voxtralSupported: true },
  { elevenLabsId: 'JaTIvIdCTgQ8y41GSR7d', name: 'Haley',       language: 'en', languageName: 'English',    gender: 'female', voxtralSupported: true },
  { elevenLabsId: 'mgpcWiEXIWuENJCy8ADX', name: 'Renee',       language: 'en', languageName: 'English',    gender: 'female', voxtralSupported: true },
  { elevenLabsId: 'FVQMzxJGPUBtfz1Azdoy', name: 'Danielle',    language: 'en', languageName: 'English',    gender: 'female', voxtralSupported: true },
  { elevenLabsId: 'eXpIbVcVbLo8ZJQDlDnl', name: 'Siren',       language: 'en', languageName: 'English',    gender: 'female', voxtralSupported: true },
  { elevenLabsId: 'VhxAIIZM8IRmnl5fyeyk', name: 'Valory',      language: 'en', languageName: 'English',    gender: 'female', voxtralSupported: true },

  // ── Italian ─────────────────────────────────────────────
  { elevenLabsId: 'W71zT1VwIFFx3mMGH2uZ', name: 'MarcoTrox',   language: 'it', languageName: 'Italian',    gender: 'male',   voxtralSupported: true },
  { elevenLabsId: 'irAl0cku0Hx4TEUJ8d1Q', name: 'Mario',       language: 'it', languageName: 'Italian',    gender: 'male',   voxtralSupported: true },
  { elevenLabsId: 'o4b57JYAECRMJyCEXyIE', name: 'Brando',      language: 'it', languageName: 'Italian',    gender: 'male',   voxtralSupported: true },
  { elevenLabsId: '13Cuh3NuYvWOVQtLbRN8', name: 'Marco',       language: 'it', languageName: 'Italian',    gender: 'male',   voxtralSupported: true },
  { elevenLabsId: 'wNIMZNAVa95a3UpgwWJr', name: 'Gulio',       language: 'it', languageName: 'Italian',    gender: 'male',   voxtralSupported: true },
  { elevenLabsId: 'g1X9mrbeBlMAWtcs2Dfp', name: 'Chris',       language: 'it', languageName: 'Italian',    gender: 'male',   voxtralSupported: true },
  { elevenLabsId: 'kAzI34nYjizE0zON6rXv', name: 'Sami',        language: 'it', languageName: 'Italian',    gender: 'female', voxtralSupported: true },
  { elevenLabsId: 'fNmw8sukfGuvWVOp33Ge', name: 'Toca',        language: 'it', languageName: 'Italian',    gender: 'female', voxtralSupported: true },
  { elevenLabsId: 'G0q9AYE8QsarSbMtaIEu', name: 'Elettra',     language: 'it', languageName: 'Italian',    gender: 'female', voxtralSupported: true },
  { elevenLabsId: 'RXoaSpLaWTEckJgPUBG3', name: 'Tiziana',     language: 'it', languageName: 'Italian',    gender: 'female', voxtralSupported: true },
  { elevenLabsId: 'QITiGyM4owEZrBEf0QV8', name: 'Ginevra',     language: 'it', languageName: 'Italian',    gender: 'female', voxtralSupported: true },
  { elevenLabsId: 'jlhiuC3oLEP3JDAx1ECk', name: 'Rita',        language: 'it', languageName: 'Italian',    gender: 'female', voxtralSupported: true },

  // ── French ──────────────────────────────────────────────
  { elevenLabsId: 'nr2EGJNe96rzn9FRlTId', name: 'Yann',        language: 'fr', languageName: 'French',     gender: 'male',   voxtralSupported: true },
  { elevenLabsId: 'ecxPjiGTvAfpGEams6ec', name: 'Paul',        language: 'fr', languageName: 'French',     gender: 'male',   voxtralSupported: true },
  { elevenLabsId: 'ohItIVrXTBI80RrUECOD', name: 'Guillame',    language: 'fr', languageName: 'French',     gender: 'male',   voxtralSupported: true },
  { elevenLabsId: 'a5n9pJUnAhX4fn7lx3uo', name: 'Martin',      language: 'fr', languageName: 'French',     gender: 'male',   voxtralSupported: true },
  { elevenLabsId: 'oziFLKtaxVDHQAh7o45V', name: 'Frederic',    language: 'fr', languageName: 'French',     gender: 'male',   voxtralSupported: true },
  { elevenLabsId: '7c65Pcpdzr0GkR748U7h', name: 'Jonathan',    language: 'fr', languageName: 'French',     gender: 'male',   voxtralSupported: true },
  { elevenLabsId: 'PSVUmed8NvS8aUA3d5oO', name: 'Anna',        language: 'fr', languageName: 'French',     gender: 'female', voxtralSupported: true },
  { elevenLabsId: 'HuLbOdhRlvQQN8oPP0AJ', name: 'Claire',      language: 'fr', languageName: 'French',     gender: 'female', voxtralSupported: true },
  { elevenLabsId: 'GYzIdoKkRyANjBvkKYfO', name: 'Koraly',      language: 'fr', languageName: 'French',     gender: 'female', voxtralSupported: true },
  { elevenLabsId: 'd3AXX0BlgJHYFCuH9X88', name: 'Emelie',      language: 'fr', languageName: 'French',     gender: 'female', voxtralSupported: true },
  { elevenLabsId: 'kwhMCf63M8O3rCfnQ3oQ', name: 'Caroline',    language: 'fr', languageName: 'French',     gender: 'female', voxtralSupported: true },
  { elevenLabsId: 'WvErJnWn6OcGO9sG2kqK', name: 'Delphine',    language: 'fr', languageName: 'French',     gender: 'female', voxtralSupported: true },

  // ── German ──────────────────────────────────────────────
  { elevenLabsId: '87AwpS6yC86wa2WglbsK', name: 'Michael',     language: 'de', languageName: 'German',     gender: 'male',   voxtralSupported: true },
  { elevenLabsId: 'dFA3XRddYScy6ylAYTIO', name: 'Helmut',      language: 'de', languageName: 'German',     gender: 'male',   voxtralSupported: true },
  { elevenLabsId: 'ruSJRhA64v8HAqiqKXVw', name: 'Thomas',      language: 'de', languageName: 'German',     gender: 'male',   voxtralSupported: true },
  { elevenLabsId: '2OcnG4mH3jIMtWz3vKus', name: 'Wolf',        language: 'de', languageName: 'German',     gender: 'male',   voxtralSupported: true },
  { elevenLabsId: 're2r5d74PqDzicySNW0I', name: 'Leon',        language: 'de', languageName: 'German',     gender: 'male',   voxtralSupported: true },
  { elevenLabsId: 'ygoBNrnmTEdu5NtDTmAY', name: 'Hopsi',       language: 'de', languageName: 'German',     gender: 'male',   voxtralSupported: true },
  { elevenLabsId: 'JgWQ8DAY3rJt6oPhbvxv', name: 'WhisperSoul', language: 'de', languageName: 'German',     gender: 'male',   voxtralSupported: true },
  { elevenLabsId: 'r0fLdYmTH96Lr4s10B6K', name: 'Ramona',      language: 'de', languageName: 'German',     gender: 'female', voxtralSupported: true },
  { elevenLabsId: 'nGISSznGHAgSTKaMXEPO', name: 'Irene',       language: 'de', languageName: 'German',     gender: 'female', voxtralSupported: true },
  { elevenLabsId: 'dCnu06FiOZma2KVNUoPZ', name: 'Mila',        language: 'de', languageName: 'German',     gender: 'female', voxtralSupported: true },
  { elevenLabsId: 'jcAyfPfetMVssD2GY44N', name: 'Kerstin',     language: 'de', languageName: 'German',     gender: 'female', voxtralSupported: true },
  { elevenLabsId: 'WHaUUVTDq47Yqc9aDbkH', name: 'Enia',        language: 'de', languageName: 'German',     gender: 'female', voxtralSupported: true },
  { elevenLabsId: 'DEZHhPbmb8LVZmWufkCh', name: 'AnnaDE',      language: 'de', languageName: 'German',     gender: 'female', voxtralSupported: true },
  { elevenLabsId: 'E0OS48T5F0KU7O2NInWS', name: 'Lucy',        language: 'de', languageName: 'German',     gender: 'female', voxtralSupported: true },

  // ── Spanish ─────────────────────────────────────────────
  { elevenLabsId: 'qRUgOhnxGASxirG4fKjv', name: 'David',       language: 'es', languageName: 'Spanish',    gender: 'male',   voxtralSupported: true },
  { elevenLabsId: '452WrNT9o8dphaYW5YGU', name: 'Abel',        language: 'es', languageName: 'Spanish',    gender: 'male',   voxtralSupported: true },
  { elevenLabsId: 'HNSF1CTQmub252yhXROX', name: 'God',         language: 'es', languageName: 'Spanish',    gender: 'male',   voxtralSupported: true },
  { elevenLabsId: 'Yb8JGzcZyW5YYzenhRCm', name: 'Abuelo',      language: 'es', languageName: 'Spanish',    gender: 'male',   voxtralSupported: true },
  { elevenLabsId: 't3eeeqhBjrUqcrPvDqUn', name: 'Salvatore',   language: 'es', languageName: 'Spanish',    gender: 'male',   voxtralSupported: true },
  { elevenLabsId: 'GTY55jD77hLBRrnQOhNk', name: 'Ludovico',    language: 'es', languageName: 'Spanish',    gender: 'male',   voxtralSupported: true },
  { elevenLabsId: 'rEVYTKPqwSMhytFPayIb', name: 'Sandra',      language: 'es', languageName: 'Spanish',    gender: 'female', voxtralSupported: true },
  { elevenLabsId: 'cIBxLwfshLYhRB9lCXEg', name: 'Carolina',    language: 'es', languageName: 'Spanish',    gender: 'female', voxtralSupported: true },
  { elevenLabsId: 'h3l1RP4XfcWsPwoRp9G6', name: 'Sheila',      language: 'es', languageName: 'Spanish',    gender: 'female', voxtralSupported: true },
  { elevenLabsId: 'gxSxrhNNXvdHpOH0EHjV', name: 'Gabriela',    language: 'es', languageName: 'Spanish',    gender: 'female', voxtralSupported: true },
  { elevenLabsId: 'FXGrCtY3PEyfqczBAlqm', name: 'Jehnny',      language: 'es', languageName: 'Spanish',    gender: 'female', voxtralSupported: true },
  { elevenLabsId: 'a0MaQpDjx7p7bZmqzFp1', name: 'Gabi',        language: 'es', languageName: 'Spanish',    gender: 'female', voxtralSupported: true },

  // ── Portuguese ──────────────────────────────────────────
  { elevenLabsId: 'ZYCQDYoXnl78dNdU6JeG', name: 'Arnold',      language: 'pt', languageName: 'Portuguese', gender: 'male',   voxtralSupported: true },
  { elevenLabsId: '36rVQA1AOIPwpA3Hg1tC', name: 'Matheus',     language: 'pt', languageName: 'Portuguese', gender: 'male',   voxtralSupported: true },
  { elevenLabsId: 'tS45q0QcrDHqHoaWdCDR', name: 'Lax',         language: 'pt', languageName: 'Portuguese', gender: 'male',   voxtralSupported: true },
  { elevenLabsId: 'h96v1HCJtcisNNeagp0R', name: 'Will',        language: 'pt', languageName: 'Portuguese', gender: 'male',   voxtralSupported: true },
  { elevenLabsId: 'Qrdut83w0Cr152Yb4Xn3', name: 'Paulo',       language: 'pt', languageName: 'Portuguese', gender: 'male',   voxtralSupported: true },
  { elevenLabsId: 'rdBSfr2PAUTCe39SX2fo', name: 'Leni',        language: 'pt', languageName: 'Portuguese', gender: 'female', voxtralSupported: true },
  { elevenLabsId: 'cyD08lEy76q03ER1jZ7y', name: 'Scheila',     language: 'pt', languageName: 'Portuguese', gender: 'female', voxtralSupported: true },
  { elevenLabsId: 'lWq4KDY8znfkV0DrK8Vb', name: 'Yasmin',      language: 'pt', languageName: 'Portuguese', gender: 'female', voxtralSupported: true },
  { elevenLabsId: 'GDzHdQOi6jjf8zaXhCYD', name: 'Raquel',      language: 'pt', languageName: 'Portuguese', gender: 'female', voxtralSupported: true },
  { elevenLabsId: '33B4UnXyTNbgLmdEDh5P', name: 'Keren',       language: 'pt', languageName: 'Portuguese', gender: 'female', voxtralSupported: true },

  // ── Filipino ────────────────────────────────────────────
  { elevenLabsId: 'iWyfYyRejPZ24HwI8ySp', name: 'JonFil',      language: 'fil', languageName: 'Filipino',  gender: 'male',   voxtralSupported: false },
  { elevenLabsId: 'DZQvDEIgmvVzevevvVmm', name: 'Halima',      language: 'fil', languageName: 'Filipino',  gender: 'male',   voxtralSupported: false },
  { elevenLabsId: 'LcgJyGR0z3KbEI801THV', name: 'Pocho',       language: 'fil', languageName: 'Filipino',  gender: 'male',   voxtralSupported: false },
  { elevenLabsId: 'uaUCJwO6D7PkgkB8ZcAr', name: 'Jeffrey',     language: 'fil', languageName: 'Filipino',  gender: 'male',   voxtralSupported: false },
  { elevenLabsId: 'jN7Z0yN1A1cDJRBH2ZZF', name: 'Pedro',       language: 'fil', languageName: 'Filipino',  gender: 'male',   voxtralSupported: false },
  { elevenLabsId: 'RnW8EXHv9GqGMgyP0sXG', name: 'Lyn',         language: 'fil', languageName: 'Filipino',  gender: 'female', voxtralSupported: false },
  { elevenLabsId: 'mOYuoC0AAGM3erLKflvc', name: 'Nanay',       language: 'fil', languageName: 'Filipino',  gender: 'female', voxtralSupported: false },
  { elevenLabsId: '210zNy7juwIO3DylDyJk', name: 'Leonin',      language: 'fil', languageName: 'Filipino',  gender: 'female', voxtralSupported: false },
  { elevenLabsId: 'G1AxVA91PtrWu96MHgTC', name: 'Shania',      language: 'fil', languageName: 'Filipino',  gender: 'female', voxtralSupported: false },
  { elevenLabsId: '4RLeKvASM0Zt73Htf5GF', name: 'Maria',       language: 'fil', languageName: 'Filipino',  gender: 'female', voxtralSupported: false },

  // ── Indonesian ──────────────────────────────────────────
  { elevenLabsId: '3rL9ZxRgBgIkh4tcbrEH', name: 'Deden',       language: 'id', languageName: 'Indonesian', gender: 'male',   voxtralSupported: false },
  { elevenLabsId: 'eESTQeTcGUli0jYysKtx', name: 'Senandika',   language: 'id', languageName: 'Indonesian', gender: 'male',   voxtralSupported: false },
  { elevenLabsId: '1ijzBXcD3AIVH8RGMcQd', name: 'Jefri',       language: 'id', languageName: 'Indonesian', gender: 'male',   voxtralSupported: false },
  { elevenLabsId: 'dDU5VfWXOm9eAwl9oqA1', name: 'Tobi',        language: 'id', languageName: 'Indonesian', gender: 'male',   voxtralSupported: false },
  { elevenLabsId: '2vWyCz46C1DzMIf4aE0n', name: 'Febrial',     language: 'id', languageName: 'Indonesian', gender: 'male',   voxtralSupported: false },
  { elevenLabsId: '3AwU3nHsI4YWeBJbz6yn', name: 'Honeypie',    language: 'id', languageName: 'Indonesian', gender: 'female', voxtralSupported: false },
  { elevenLabsId: 'EtBqZqSAj0Xp6HKzpaa5', name: 'Rehan',       language: 'id', languageName: 'Indonesian', gender: 'female', voxtralSupported: false },
  { elevenLabsId: 'wWRuqXP4yAwzRerUveS8', name: 'MilaID',      language: 'id', languageName: 'Indonesian', gender: 'female', voxtralSupported: false },
  { elevenLabsId: 'gjhfBUoH6DHh0DG1X4u0', name: 'Gavrila',     language: 'id', languageName: 'Indonesian', gender: 'female', voxtralSupported: false },
  { elevenLabsId: '52LXmmR0nGnIcDs1TL3f', name: 'Anjani',      language: 'id', languageName: 'Indonesian', gender: 'female', voxtralSupported: false },

  // ── Dutch ───────────────────────────────────────────────
  { elevenLabsId: 'cblS8WYNsiBLGnlV6jjx', name: 'Robert',      language: 'nl', languageName: 'Dutch',      gender: 'male',   voxtralSupported: true },
  { elevenLabsId: '62klqbsYqbynbr66ypRt', name: 'Arjen',       language: 'nl', languageName: 'Dutch',      gender: 'male',   voxtralSupported: true },
  { elevenLabsId: 'SXBL9NbvTrjsJQYay2kT', name: 'Melanie',     language: 'nl', languageName: 'Dutch',      gender: 'female', voxtralSupported: true },
  { elevenLabsId: 'YUdpWWny7k5yb4QCeweX', name: 'Ruth',        language: 'nl', languageName: 'Dutch',      gender: 'female', voxtralSupported: true },

  // ── Hindi ───────────────────────────────────────────────
  { elevenLabsId: 'K24eC7JpUgk8zMtQYrpV', name: 'Viraj',       language: 'hi', languageName: 'Hindi',      gender: 'male',   voxtralSupported: true },
  { elevenLabsId: 'DQuoFsZ3oda1diTerwpq', name: 'Aaditya',     language: 'hi', languageName: 'Hindi',      gender: 'male',   voxtralSupported: true },
  { elevenLabsId: 'ibbx9zDYGvLgtYzRbqqG', name: 'Bunty',       language: 'hi', languageName: 'Hindi',      gender: 'male',   voxtralSupported: true },
  { elevenLabsId: 'K2Byg54sHB1oHegvENtI', name: 'Kanika',      language: 'hi', languageName: 'Hindi',      gender: 'female', voxtralSupported: true },
  { elevenLabsId: '1Z7Y8o9cvUeWq8oLKgMY', name: 'Tripti',      language: 'hi', languageName: 'Hindi',      gender: 'female', voxtralSupported: true },
  { elevenLabsId: 'vghiSqG5ezdhd8F3tKAD', name: 'Sara',        language: 'hi', languageName: 'Hindi',      gender: 'female', voxtralSupported: true },

  // ── Arabic ──────────────────────────────────────────────
  { elevenLabsId: '9SPZl4Mlgwj7QT4gVprb', name: 'Adam',        language: 'ar', languageName: 'Arabic',     gender: 'male',   voxtralSupported: true },
  { elevenLabsId: 'ZCXYdzd5Evtsll2EdoCi', name: 'Yousef',      language: 'ar', languageName: 'Arabic',     gender: 'male',   voxtralSupported: true },
  { elevenLabsId: 'xvhpbk8otnNHtT3fjCpr', name: 'Omar',        language: 'ar', languageName: 'Arabic',     gender: 'male',   voxtralSupported: true },
  { elevenLabsId: 'B5xxC4eQoOFJnY4R5XkI', name: 'Salma',       language: 'ar', languageName: 'Arabic',     gender: 'female', voxtralSupported: true },
  { elevenLabsId: 'XTa3iQyMA6f1qrI4F6kZ', name: 'SaraAR',      language: 'ar', languageName: 'Arabic',     gender: 'female', voxtralSupported: true },
  { elevenLabsId: 'L10lEremDiJfPicq5CPh', name: 'Yasmine',     language: 'ar', languageName: 'Arabic',     gender: 'female', voxtralSupported: true },

  // ── Korean ──────────────────────────────────────────────
  { elevenLabsId: 'pb3lVZVjdFWbkhPKlelB', name: 'Harry',       language: 'ko', languageName: 'Korean',     gender: 'male',   voxtralSupported: false },
  { elevenLabsId: 'jB1Cifc2UQbq1gR3wnb0', name: 'Bin',         language: 'ko', languageName: 'Korean',     gender: 'male',   voxtralSupported: false },
  { elevenLabsId: 'v1jVu1Ky28piIPEJqRrm', name: 'DavidKO',     language: 'ko', languageName: 'Korean',     gender: 'male',   voxtralSupported: false },
  { elevenLabsId: 'BbsagRO6ohd8MKPS2Ob0', name: 'Jin',         language: 'ko', languageName: 'Korean',     gender: 'male',   voxtralSupported: false },
  { elevenLabsId: 'zgDzx5jLLCqEp6Fl7Kl7', name: 'Hanna',       language: 'ko', languageName: 'Korean',     gender: 'female', voxtralSupported: false },
  { elevenLabsId: '0oqpliV6dVSr9XomngOW', name: 'Jini',        language: 'ko', languageName: 'Korean',     gender: 'female', voxtralSupported: false },
  { elevenLabsId: 'KlstlYt9VVf3zgie2Oht', name: 'Sola',        language: 'ko', languageName: 'Korean',     gender: 'female', voxtralSupported: false },
  { elevenLabsId: 'Lb7qkOn5hF8p7qfCDH8q', name: 'Annie',       language: 'ko', languageName: 'Korean',     gender: 'female', voxtralSupported: false },
]

// ============================================================
// PHRASES — ~10 seconds of warm, conversational speech per language
// ============================================================

const PHRASES: Record<string, string> = {
  en:  "Hey there! Welcome to our conversation. I'm really excited to help you practice today. So tell me, what's something fun you did this week?",
  it:  "Ciao! Benvenuto nella nostra conversazione. Sono davvero contenta di aiutarti a fare pratica oggi. Allora, raccontami, cosa hai fatto di bello questa settimana?",
  fr:  "Salut ! Bienvenue dans notre conversation. Je suis vraiment contente de t'aider à pratiquer aujourd'hui. Alors, dis-moi, qu'est-ce que tu as fait de sympa cette semaine ?",
  de:  "Hallo! Schön, dass du da bist. Ich freue mich sehr, heute mit dir zu üben. Also, erzähl mal, was hast du diese Woche Schönes erlebt?",
  es:  "¡Hola! Bienvenido a nuestra conversación. Estoy muy contenta de ayudarte a practicar hoy. Entonces, cuéntame, ¿qué hiciste de divertido esta semana?",
  pt:  "Olá! Bem-vindo à nossa conversa. Estou muito feliz em te ajudar a praticar hoje. Então, me conta, o que você fez de legal essa semana?",
  nl:  "Hoi! Welkom bij ons gesprek. Ik ben echt blij om je vandaag te helpen oefenen. Vertel eens, wat heb je deze week leuks gedaan?",
  hi:  "नमस्ते! हमारी बातचीत में आपका स्वागत है। आज आपकी मदद करके मुझे बहुत खुशी हो रही है। तो बताइए, इस हफ्ते आपने क्या मज़ेदार किया?",
  ar:  "مرحبا! أهلا وسهلا في محادثتنا. أنا سعيد جدا بمساعدتك على التدرب اليوم. قل لي، ماذا فعلت ممتعا هذا الأسبوع؟",
  fil: "Kumusta! Maligayang pagdating sa ating usapan. Tuwang-tuwa ako na matulungan kang mag-practice ngayon. Kaya naman, kwentuhan mo ako, anong masaya mong ginawa ngayong linggo?",
  id:  "Halo! Selamat datang di percakapan kita. Saya sangat senang bisa membantu kamu berlatih hari ini. Jadi, ceritakan, apa hal seru yang kamu lakukan minggu ini?",
  ko:  "안녕하세요! 우리 대화에 오신 것을 환영합니다. 오늘 연습을 도와드리게 되어 정말 기쁩니다. 그럼 이번 주에 재미있었던 일이 뭐예요?",
}

// ============================================================
// STEP 1: Generate ElevenLabs clip for a single voice
// ============================================================

async function generateElevenLabsClip(voice: VoiceEntry): Promise<string | null> {
  const phrase = PHRASES[voice.language]
  if (!phrase) {
    console.log(`⏭️  No phrase for language ${voice.language}, skipping ${voice.name}`)
    return null
  }

  const filename = `${voice.language}_${voice.name}_${voice.gender}.mp3`
  const filepath = path.join(VOICES_DIR, filename)

  if (fs.existsSync(filepath)) {
    console.log(`⏭️  Already exists: ${filename}`)
    return filepath
  }

  console.log(`🎤 Generating: ${filename} (${voice.languageName} - ${voice.name})...`)

  const response = await fetch(`${ELEVENLABS_API_URL}/${voice.elevenLabsId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: phrase,
      model_id: ELEVENLABS_MODEL,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.4,
        use_speaker_boost: true,
      },
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error(`❌ ElevenLabs error for ${voice.name}: ${response.status} ${error}`)
    return null
  }

  const audioBuffer = Buffer.from(await response.arrayBuffer())
  fs.writeFileSync(filepath, audioBuffer)
  console.log(`✅ Saved: ${filename} (${(audioBuffer.length / 1024).toFixed(1)} KB)`)
  return filepath
}

// ============================================================
// STEP 2: Upload a clip to Mistral Voices API
// ============================================================

async function uploadToMistral(voice: VoiceEntry, filepath: string): Promise<string | null> {
  if (!voice.voxtralSupported) {
    console.log(`⏭️  Skipping Mistral upload for ${voice.name} (${voice.languageName} not supported by Voxtral)`)
    return null
  }

  console.log(`📤 Uploading to Mistral: ${voice.name} (${voice.languageName})...`)

  const audioBase64 = fs.readFileSync(filepath).toString('base64')
  const voiceName = `resonance-${voice.language}-${voice.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`

  const response = await fetch('https://api.mistral.ai/v1/audio/voices', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${MISTRAL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: voiceName,
      sample_audio: audioBase64,
      sample_filename: path.basename(filepath),
      languages: [voice.language],
      gender: voice.gender,
      tags: ['resonance', 'tutor', voice.languageName.toLowerCase()],
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error(`❌ Mistral error for ${voice.name}: ${response.status} ${error}`)
    return null
  }

  const result = await response.json() as { id: string }
  console.log(`✅ Mistral voice created: ${voiceName} → voice_id: ${result.id}`)
  return result.id
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  if (!ELEVENLABS_API_KEY) {
    console.error('❌ ELEVENLABS_API_KEY is not set')
    process.exit(1)
  }
  if (!MISTRAL_API_KEY) {
    console.error('❌ MISTRAL_API_KEY is not set')
    process.exit(1)
  }

  if (!fs.existsSync(VOICES_DIR)) fs.mkdirSync(VOICES_DIR, { recursive: true })

  const uniqueLangs = new Set(VOICES.map(v => v.language))

  console.log(`\n${'='.repeat(60)}`)
  console.log(`  RESONANCE VOICE PIPELINE`)
  console.log(`  ${VOICES.length} voices across ${uniqueLangs.size} languages`)
  console.log(`${'='.repeat(60)}\n`)

  // ── Step 1: Generate all ElevenLabs clips ──────────────────
  console.log('── STEP 1: Generating ElevenLabs clips ──\n')
  const clipResults: Array<{ voice: VoiceEntry; filepath: string | null }> = []

  for (const voice of VOICES) {
    const filepath = await generateElevenLabsClip(voice)
    clipResults.push({ voice, filepath })
    await new Promise(r => setTimeout(r, 500))
  }

  const generated = clipResults.filter(r => r.filepath)
  console.log(`\n✅ Generated/found ${generated.length}/${VOICES.length} clips\n`)

  // ── Step 2: Upload Voxtral-compatible voices to Mistral ────
  console.log('── STEP 2: Uploading to Mistral ──\n')
  const mistralResults: Array<{ voice: VoiceEntry; voiceId: string | null }> = []

  for (const { voice, filepath } of clipResults) {
    if (!filepath || !voice.voxtralSupported) {
      mistralResults.push({ voice, voiceId: null })
      continue
    }
    const voiceId = await uploadToMistral(voice, filepath)
    mistralResults.push({ voice, voiceId })
    await new Promise(r => setTimeout(r, 1000))
  }

  const uploaded = mistralResults.filter(r => r.voiceId)
  console.log(`\n✅ Uploaded ${uploaded.length} voices to Mistral\n`)

  // ── Step 3: Save results ───────────────────────────────────
  const results = mistralResults
    .filter(r => r.voiceId)
    .map(r => ({
      name: r.voice.name,
      language: r.voice.language,
      languageName: r.voice.languageName,
      gender: r.voice.gender,
      mistralVoiceId: r.voiceId,
      elevenLabsId: r.voice.elevenLabsId,
    }))

  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2))
  console.log(`📁 Full results saved to: ${RESULTS_FILE}`)

  // Print grouped summary
  console.log(`\n${'='.repeat(60)}`)
  console.log('  VOICE MAP — All cloned voices by language')
  console.log(`${'='.repeat(60)}\n`)

  const byLanguage = results.reduce((acc, r) => {
    if (!acc[r.language]) acc[r.language] = []
    acc[r.language].push(r)
    return acc
  }, {} as Record<string, typeof results>)

  for (const [, voices] of Object.entries(byLanguage)) {
    console.log(`\n${voices[0].languageName} (${voices[0].language}):`)
    for (const v of voices) {
      const glyph = v.gender === 'female' ? '♀' : '♂'
      console.log(`  ${glyph} ${v.name.padEnd(15)} → ${v.mistralVoiceId}`)
    }
  }

  // Print unsupported languages
  const unsupported = [...new Set(
    mistralResults.filter(r => !r.voice.voxtralSupported).map(r => r.voice.languageName)
  )]
  if (unsupported.length > 0) {
    console.log(`\n⚠️  Languages NOT on Voxtral (use ElevenLabs fallback): ${unsupported.join(', ')}`)
    console.log('   MP3 clips saved to voices/ — ready for playback or future use.\n')
  }
}

main().catch(console.error)
