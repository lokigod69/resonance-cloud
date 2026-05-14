import { useState } from 'react'
import { curriculumEntryImagePath } from '@/lib/curriculumImagePath'

type CurriculumEntryImageProps = {
  languageIso: string
  categorySlug: string
  term: string
  fallbackEmoji?: string
  alt: string
  className?: string
  aspect?: '16:9' | '4:5'
}

export default function CurriculumEntryImage({
  languageIso,
  categorySlug,
  term,
  fallbackEmoji,
  alt,
  className,
  aspect = '16:9',
}: CurriculumEntryImageProps) {
  const [failed, setFailed] = useState(false)
  const aspectRatio = aspect === '4:5' ? '4 / 5' : '16 / 9'

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
      src={curriculumEntryImagePath(languageIso, categorySlug, term)}
      alt={alt}
      loading="lazy"
      className={className}
      style={{ aspectRatio }}
      onError={() => setFailed(true)}
    />
  )
}
