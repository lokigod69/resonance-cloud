const RAW_BASE = (import.meta.env?.VITE_SUPABASE_URL ?? '') as string
const SUPABASE_BASE = RAW_BASE.replace(/\/+$/, '')
const SOURCE_PREFIX = SUPABASE_BASE ? `${SUPABASE_BASE}/storage/v1/object/public/` : ''
const TRANSFORM_PREFIX = SUPABASE_BASE ? `${SUPABASE_BASE}/storage/v1/render/image/public/` : ''

export type ThumbSize = 128 | 192 | 256 | 512 | 768

export interface ThumbOptions {
  size: ThumbSize | { width: number; height: number }
  resize?: 'cover' | 'contain' | 'fill'
  quality?: number
  format?: 'webp'
}

export interface StorageImageOptions {
  width: number
  height: number
  resize?: 'cover' | 'contain' | 'fill'
  quality?: number
  format?: 'webp'
}

export function getStorageImageUrl(
  rawUrl: string | null | undefined,
  opts: StorageImageOptions,
): string | null {
  if (!rawUrl) return null
  if (!SOURCE_PREFIX || !rawUrl.startsWith(SOURCE_PREFIX)) return rawUrl

  const remainder = rawUrl.slice(SOURCE_PREFIX.length)
  const url = new URL(`${TRANSFORM_PREFIX}${remainder}`)

  url.searchParams.set('width', String(opts.width))
  url.searchParams.set('height', String(opts.height))
  url.searchParams.set('resize', opts.resize ?? 'cover')
  if (opts.quality !== undefined) {
    url.searchParams.set('quality', String(opts.quality))
  }
  if (opts.format) {
    url.searchParams.set('format', opts.format)
  }

  return url.toString()
}

export function getThumbnailUrl(
  rawUrl: string | null | undefined,
  opts: ThumbOptions,
): string | null {
  const width = typeof opts.size === 'number' ? opts.size : opts.size.width
  const height = typeof opts.size === 'number' ? opts.size : opts.size.height

  return getStorageImageUrl(rawUrl, {
    width,
    height,
    resize: opts.resize,
    quality: opts.quality,
    format: opts.format,
  })
}

export function getCardThumbUrl(rawUrl: string | null | undefined, size = 256): string | null {
  return getStorageImageUrl(rawUrl, {
    width: size,
    height: size,
    resize: 'cover',
    quality: 75,
    format: 'webp',
  })
}

export function getCardFullUrl(
  rawUrl: string | null | undefined,
  width = 1280,
  height = 720,
): string | null {
  return getStorageImageUrl(rawUrl, {
    width,
    height,
    resize: 'contain',
    quality: 90,
    format: 'webp',
  })
}
