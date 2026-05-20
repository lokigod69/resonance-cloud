import { useState } from 'react'
import { curriculumEntryImagePath } from '@/lib/curriculumImagePath'
import {
  resolveCurriculumImageSetAsset,
  type CurriculumImageSetKey,
} from '@/lib/curriculumImageSets'

type CurriculumEntryImageProps = {
  languageIso: string
  categorySlug: string
  term: string
  fallbackEmoji?: string
  alt: string
  className?: string
  aspect?: '16:9' | '4:5'
  // Admin-resolved active image set for this language/category. When omitted,
  // the component renders the legacy curriculum image path.
  activeImageSet?: CurriculumImageSetKey
}

export default function CurriculumEntryImage({
  languageIso,
  categorySlug,
  term,
  fallbackEmoji,
  alt,
  className,
  aspect = '16:9',
  activeImageSet,
}: CurriculumEntryImageProps) {
  const aspectRatio = aspect === '4:5' ? '4 / 5' : '16 / 9'
  const resolved = activeImageSet
    ? resolveCurriculumImageSetAsset(term, { activeSetKey: activeImageSet, languageIso })
    : null
  const src = resolved?.publicPath ?? curriculumEntryImagePath(languageIso, categorySlug, term)
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const failed = failedSrc === src

  if (failed) {
    return (
      <div
        className={className}
        style={{
          aspectRatio,
          display: 'grid',
          placeItems: 'center',
          gap: '0.35rem',
          border: '1px solid var(--border-subtle)',
          background: 'var(--surface-glass)',
          color: 'var(--text-muted)',
        }}
      >
        {fallbackEmoji && (
          <span aria-hidden="true" style={{ color: 'var(--text-primary)', fontSize: '2rem', lineHeight: 1 }}>
            {fallbackEmoji}
          </span>
        )}
        <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>{term}</span>
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={className}
      style={{ aspectRatio }}
      onError={() => setFailedSrc(src)}
    />
  )
}
