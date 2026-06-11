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
  void opts
  // Assets are generated at the needed formats/sizes; avoid Supabase Storage Image Transformations.
  return rawUrl || null
}

export function getThumbnailUrl(
  rawUrl: string | null | undefined,
  opts: ThumbOptions,
): string | null {
  void opts
  return rawUrl || null
}

export function getCardThumbUrl(rawUrl: string | null | undefined, size = 256): string | null {
  void size
  return rawUrl || null
}

export function getCardFullUrl(
  rawUrl: string | null | undefined,
  width = 1280,
  height = 720,
): string | null {
  void width
  void height
  return rawUrl || null
}
