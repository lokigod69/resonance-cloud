import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

const ENVELOPE_VERSION = 'v1'
const PURPOSE = 'lingwave-live-client-secret-storage-v1'

function encryptionKey(xaiApiKey: string): Buffer {
  if (!xaiApiKey) throw new Error('XAI_API_KEY is required to protect Live client secrets')
  return createHash('sha256').update(PURPOSE).update('\0').update(xaiApiKey).digest()
}

export function sealLiveClientSecret(value: string, xaiApiKey: string): string {
  if (!value) throw new Error('Cannot protect an empty Live client secret')
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(xaiApiKey), iv)
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [ENVELOPE_VERSION, iv.toString('base64url'), tag.toString('base64url'), ciphertext.toString('base64url')].join('.')
}

export function openLiveClientSecret(envelope: string, xaiApiKey: string): string {
  const [version, ivValue, tagValue, ciphertextValue, extra] = envelope.split('.')
  if (version !== ENVELOPE_VERSION || !ivValue || !tagValue || !ciphertextValue || extra !== undefined) {
    throw new Error('Invalid Live client secret envelope')
  }
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(xaiApiKey), Buffer.from(ivValue, 'base64url'))
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'))
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, 'base64url')),
    decipher.final(),
  ]).toString('utf8')
}
