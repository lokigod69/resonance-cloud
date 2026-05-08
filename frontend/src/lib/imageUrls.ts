const RAW_BASE = (import.meta.env.VITE_SUPABASE_URL ?? '') as string
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

export function getThumbnailUrl(
  rawUrl: string | null | undefined,
  opts: ThumbOptions,
): string | null {
  if (!rawUrl) return null
  if (!SOURCE_PREFIX || !rawUrl.startsWith(SOURCE_PREFIX)) return rawUrl

  const remainder = rawUrl.slice(SOURCE_PREFIX.length)
  const url = new URL(`${TRANSFORM_PREFIX}${remainder}`)

  const width = typeof opts.size === 'number' ? opts.size : opts.size.width
  const height = typeof opts.size === 'number' ? opts.size : opts.size.height
  url.searchParams.set('width', String(width))
  url.searchParams.set('height', String(height))
  url.searchParams.set('resize', opts.resize ?? 'cover')
  if (opts.quality !== undefined) {
    url.searchParams.set('quality', String(opts.quality))
  }
  if (opts.format) {
    url.searchParams.set('format', opts.format)
  }

  return url.toString()
}
