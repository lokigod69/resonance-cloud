import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useTranslation } from '@/hooks/useTranslation'

type LanguageClusterProps = {
  languages: string[]
  activeLanguage: string | null
  onSelect: (lang: string) => void
}

// Inactive pills fan symmetrically around the centered active pill.
// fanOffset maps zero-based position in the *inactive* list → x pixel offset.
// Order: first to the right (+1), then left (-1), then right again (+2), etc.
const PILL_GAP = 96

function fanOffset(indexAmongInactives: number): number {
  const step = Math.floor(indexAmongInactives / 2) + 1
  const side = indexAmongInactives % 2 === 0 ? 1 : -1
  return side * step * PILL_GAP
}

export function LanguageCluster({ languages, activeLanguage, onSelect }: LanguageClusterProps) {
  const { t } = useTranslation()
  const reducedMotion = useReducedMotion()
  const [hovered, setHovered] = useState(false)

  if (languages.length === 0 || !activeLanguage) return null

  if (languages.length === 1) {
    return (
      <div className="lang-cluster">
        <span className="lang-pill lang-pill-active rounded-full px-4 py-1.5 text-sm font-semibold">
          {t(`langName.${activeLanguage}`)}
        </span>
      </div>
    )
  }

  const inactives = languages.filter((lang) => lang !== activeLanguage)
  const expanded = hovered

  return (
    <div
      className="lang-cluster"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Active pill — anchored centre, never moves. */}
      <span className="lang-pill lang-pill-active relative z-10 rounded-full px-4 py-1.5 text-sm font-semibold">
        {t(`langName.${activeLanguage}`)}
      </span>

      {/* Inactives — always mounted, animate position/opacity based on hover.
          Always-mounted (no AnimatePresence + no layoutId) avoids the stale-
          position bug when the active language changes mid-fade. */}
      {inactives.map((lang, index) => {
        const offset = fanOffset(index)
        return (
          <motion.button
            key={lang}
            type="button"
            onClick={() => {
              onSelect(lang)
              setHovered(false)
            }}
            initial={false}
            animate={
              reducedMotion
                ? { opacity: expanded ? 1 : 0 }
                : {
                    opacity: expanded ? 1 : 0,
                    x: expanded ? offset : 0,
                    scale: expanded ? 1 : 0.55,
                  }
            }
            style={{ pointerEvents: expanded ? 'auto' : 'none' }}
            transition={
              reducedMotion
                ? { duration: 0 }
                : { type: 'spring', stiffness: 340, damping: 30 }
            }
            className="lang-pill lang-pill-inactive absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium"
            aria-label={t(`langName.${lang}`)}
            tabIndex={expanded ? 0 : -1}
          >
            {t(`langName.${lang}`)}
          </motion.button>
        )
      })}
    </div>
  )
}
