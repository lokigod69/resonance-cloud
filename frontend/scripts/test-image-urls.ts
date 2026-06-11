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

function assertDirectStorageUrl(url: string | null, expected: string, label: string) {
  assert(url === expected, `Expected ${label} to return direct storage URL, got ${url}`)
  const parsed = new URL(url)
  assert(!parsed.pathname.includes('/storage/v1/render/image/'), `Expected ${label} to avoid Supabase render path`)
  for (const key of ['width', 'height', 'resize', 'quality', 'format']) {
    assert(!parsed.searchParams.has(key), `Expected ${label} to avoid ${key} transform param`)
  }
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
  const storageUrl = mod.getStorageImageUrl(raw, {
    width: 640,
    height: 360,
    resize: 'contain',
    quality: 88,
    format: 'webp',
  })

  assertDirectStorageUrl(storageUrl, raw, 'getStorageImageUrl')

  const thumb = mod.getCardThumbUrl(raw)
  assertDirectStorageUrl(thumb, raw, 'getCardThumbUrl')

  const gameThumb = mod.getCardThumbUrl(raw, 512)
  assertDirectStorageUrl(gameThumb, raw, 'getCardThumbUrl(size)')

  const full = mod.getCardFullUrl(raw)
  assertDirectStorageUrl(full, raw, 'getCardFullUrl')

  assert(mod.getStorageImageUrl(null, { width: 1, height: 1 }) === null, 'Expected null input to return null')
  assert(
    mod.getCardThumbUrl('https://cdn.example.test/card.png') === 'https://cdn.example.test/card.png',
    'Expected non-Supabase URL to remain unchanged',
  )

  const legacy = mod.getThumbnailUrl(raw, { size: 128, format: 'webp' })
  assertDirectStorageUrl(legacy, raw, 'getThumbnailUrl')
} finally {
  await server.close()
}
