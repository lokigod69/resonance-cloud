/**
 * OrbDock — Circular word thumbnail navigation bar
 * Extracted from Orbs study mode (StudyGO.tsx) for reuse across skins.
 * Shows each word as a small glass orb with thumbnail preview.
 */

import { useEffect, useRef } from 'react'
import { getCardPreviewUrl } from '@/lib/imageUrls'

type OrbDockWord = {
  id: string
  word: string
  thumbnail_url: string | null
  card_thumbnail_url?: string | null
}

interface OrbDockProps {
  words: OrbDockWord[]
  currentIndex: number
  onSelect: (index: number) => void
}

export default function OrbDock({ words, currentIndex, onSelect }: OrbDockProps) {
  const activeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const active = activeRef.current
    const container = active?.closest<HTMLElement>('.orb-dock-container')
    if (!active || !container) return

    const nextTop = active.offsetTop - (container.clientHeight - active.clientHeight) / 2
    container.scrollTo({
      top: Math.max(0, nextTop),
      behavior: 'smooth',
    })
  }, [currentIndex])

  return (
    <div className="orb-dock-container">
      <div className="orb-dock">
        {words.map((word, index) => (
          <div
            key={word.id}
            ref={index === currentIndex ? activeRef : null}
            className={`orb${index === currentIndex ? ' active' : ''}`}
            onClick={() => onSelect(index)}
            title={word.word}
          >
            {word.card_thumbnail_url || word.thumbnail_url ? (
              <img src={getCardPreviewUrl(word.card_thumbnail_url, word.thumbnail_url) ?? undefined} alt={word.word} />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--surface-glass-strong), var(--surface-glass))',
                  border: '1px solid var(--border-subtle)',
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
