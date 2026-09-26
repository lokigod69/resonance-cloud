import assert from 'node:assert/strict'
import { sanitizeForTTS, trimToLastSentence } from '../api/_shared/ttsText'

// [input, expected spoken text]
const cases: Array<[string, string]> = [
  ['(slowly) Hola amigo', 'Hola amigo'],
  ['Bien [long pause] y tú?', 'Bien y tú?'],
  ['Hola (laughing softly)', 'Hola'],
  ['Hola (laughing)', 'Hola (laughing)'],
  ['*laughs* Ciao!', 'Ciao!'],
  ['Hochzeit (wedding) ist schön.', 'Hochzeit (wedding) ist schön.'],
  ['Morgen (morning), familia (family).', 'Morgen (morning), familia (family).'],
  ['Ein Haus (woning) in Utrecht.', 'Ein Haus (woning) in Utrecht.'],
  ['pane fresco (pain frais)', 'pane fresco (pain frais)'],
  ['cansado (müde)', 'cansado (müde)'],
  ['Yo **estoy** cansado.', 'Yo estoy cansado.'],
  ['Say **laugh** again.', 'Say laugh again.'],
  ['Tu as *comprato* du pain.', 'Tu as comprato du pain.'],
  ['Ich... bin... hier.', 'Ich bin hier.'],
  ['Das ist ein (Ding).', 'Das ist ein (Ding).'],
  // One-word glosses that happen to be direction words stay when attached to their word.
  ['Sprich langsam (slowly), bitte.', 'Sprich langsam (slowly), bitte.'],
  ['Der Weg ist lang (long).', 'Der Weg ist lang (long).'],
  ['sonreír (smile) y susurrar (whisper)', 'sonreír (smile) y susurrar (whisper)'],
  ['Gut. (smiles) Weiter!', 'Gut. Weiter!'],
  ['(long) Hallo', '(long) Hallo'],
]
for (const [input, expected] of cases) assert.equal(sanitizeForTTS(input), expected, input)

assert.equal(trimToLastSentence('Muy bien. Ahora dime qué hiciste ayer y cómo te'), 'Muy bien.')
assert.equal(trimToLastSentence('とても いいです。 きのうは なにを し'), 'とても いいです。')
assert.equal(trimToLastSentence('no sentence end at all'), 'no sentence end at all')
assert.equal(trimToLastSentence('Es cuesta 3.5 euros. Y el otro cuesta 4.2 y'), 'Es cuesta 3.5 euros.')
console.log(`TTS text: ${cases.length} cleaner cases and 4 trim cases passed`)
