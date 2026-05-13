import { createServer } from 'vite'

type ImageUrlModule = {
  getStorageImageUrl?: (
    rawUrl: string | null | undefined,
    opts: {
      width: number
      height: number
      resize?: 'cover' | 'contain' | 'fill'
      quality?: number
      format?: 'webp'
    },
  ) => string | null
  getCardThumbUrl?: (rawUrl: string | null | undefined, size?: number) => string | null
  getCardFullUrl?: (rawUrl: string | null | undefined, width?: number, height?: number) => string | null
  getThumbnailUrl?: (
    rawUrl: string | null | undefined,
    opts: {
      size: number | { width: number; height: number }
      resize?: 'cover' | 'contain' | 'fill'
      quality?: number
      format?: 'webp'
    },
  ) => string | null
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function assertParam(url: string, key: string, value: string) {
  const parsed = new URL(url)
  assert(parsed.searchParams.get(key) === value, `Expected ${key}=${value}, got ${parsed.searchParams.get(key)}`)
}

const server = await createServer({
  logLevel: 'error',
  server: { middlewareMode: true },
})

try {
  const mod = await server.ssrLoadModule('/src/lib/imageUrls.ts') as ImageUrlModule

  assert(typeof mod.getStorageImageUrl === 'function', 'Expected getStorageImageUrl export')
  assert(typeof mod.getCardThumbUrl === 'function', 'Expected getCardThumbUrl export')
  assert(typeof mod.getCardFullUrl === 'function', 'Expected getCardFullUrl export')
  assert(typeof mod.getThumbnailUrl === 'function', 'Expected getThumbnailUrl export')

  const raw = 'https://rkiucrrusrwgcviodysp.supabase.co/storage/v1/object/public/videos/user/deck/cards/metadaten_word.png'
  const transformed = mod.getStorageImageUrl(raw, {
    width: 640,
    height: 360,
    resize: 'contain',
    quality: 88,
    format: 'webp',
  })

  assert(transformed !== null, 'Expected transformed URL')
  assert(
    transformed.startsWith('https://rkiucrrusrwgcviodysp.supabase.co/storage/v1/render/image/public/videos/'),
    `Expected render image path, got ${transformed}`,
  )
  assertParam(transformed, 'width', '640')
  assertParam(transformed, 'height', '360')
  assertParam(transformed, 'resize', 'contain')
  assertParam(transformed, 'quality', '88')
  assertParam(transformed, 'format', 'webp')

  const thumb = mod.getCardThumbUrl(raw)
  assert(thumb !== null, 'Expected card thumb URL')
  assertParam(thumb, 'width', '256')
  assertParam(thumb, 'height', '256')
  assertParam(thumb, 'resize', 'cover')
  assertParam(thumb, 'quality', '75')
  assertParam(thumb, 'format', 'webp')

  const gameThumb = mod.getCardThumbUrl(raw, 512)
  assert(gameThumb !== null, 'Expected game card thumb URL')
  assertParam(gameThumb, 'width', '512')
  assertParam(gameThumb, 'height', '512')

  const full = mod.getCardFullUrl(raw)
  assert(full !== null, 'Expected card full URL')
  assertParam(full, 'width', '1280')
  assertParam(full, 'height', '720')
  assertParam(full, 'resize', 'contain')
  assertParam(full, 'quality', '90')
  assertParam(full, 'format', 'webp')

  assert(mod.getStorageImageUrl(null, { width: 1, height: 1 }) === null, 'Expected null input to return null')
  assert(
    mod.getCardThumbUrl('https://cdn.example.test/card.png') === 'https://cdn.example.test/card.png',
    'Expected non-Supabase URL to remain unchanged',
  )

  const legacy = mod.getThumbnailUrl(raw, { size: 128, format: 'webp' })
  assert(legacy !== null, 'Expected legacy thumbnail URL')
  assertParam(legacy, 'width', '128')
  assertParam(legacy, 'height', '128')
  assertParam(legacy, 'resize', 'cover')
  assertParam(legacy, 'format', 'webp')
} finally {
  await server.close()
}
