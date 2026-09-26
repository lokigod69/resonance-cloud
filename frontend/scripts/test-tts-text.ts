import assert from 'node:assert/strict'
import { sanitizeForTTS, trimToLastSentence } from '../api/_shared/ttsText'

// [input, expected spoken text]
const cases: Array<[string, string]> = [
  ['(slowly) Hola amigo', 'Hola amigo'],
  ['Bien [long pause] y tú?', 'Bien y tú?'],
  ['Hola (laughing softly)', 'Hola'],
  ['*laughs* Ciao!', 'Ciao!'],
  ['Hochzeit (wedding) ist schön.', 'Hochzeit (wedding) ist schön.'],
  ['Morgen (morning), familia (family).', 'Morgen (morning), familia (family).'],
  ['Ein Haus (woning) in Utrecht.', 'Ein Haus (woning) in Utrecht.'],
  ['pane fresco (pain frais)', 'pane fresco (pain frais)'],
  ['cansado (müde)', 'cansado (müde)'],
  ['Yo **estoy** cansado.', 'Yo estoy cansado.'],
  ['Tu as *comprato* du pain.', 'Tu as comprato du pain.'],
  ['Ich... bin... hier.', 'Ich bin hier.'],
  ['Das ist ein (Ding).', 'Das ist ein (Ding).'],
]
for (const [input, expected] of cases) assert.equal(sanitizeForTTS(input), expected, input)

assert.equal(trimToLastSentence('Muy bien. Ahora dime qué hiciste ayer y cómo te'), 'Muy bien.')
assert.equal(trimToLastSentence('とても いいです。 きのうは なにを し'), 'とても いいです。')
assert.equal(trimToLastSentence('no sentence end at all'), 'no sentence end at all')
console.log(`TTS text: ${cases.length} cleaner cases and 3 trim cases passed`)
