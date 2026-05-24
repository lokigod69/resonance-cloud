import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useTranslation } from '@/hooks/useTranslation'

type LanguageClusterProps = {
  languages: string[]
  activeLanguage: string | null
  onSelect: (lang: string) => void
}

// Inactive pills fan symmetrically around the centered active pill.
// Order on hover: first to the right, then alternating left/right outward.
// fanOffset maps zero-based fan-index → (x px, side) so positions stay stable
// regardless of which language is currently active.
const PILL_GAP = 96

function fanOffset(fanIndex: number): number {
  const step = Math.floor(fanIndex / 2) + 1
  const side = fanIndex % 2 === 0 ? 1 : -1
  return side * step * PILL_GAP
}

export function LanguageCluster({ languages, activeLanguage, onSelect }: LanguageClusterProps) {
  const { t } = useTranslation()
  const reducedMotion = useReducedMotion()
  const [hovered, setHovered] = useState(false)

  if (languages.length < 2 || !activeLanguage) {
    if (languages.length === 1 && activeLanguage) {
      return (
        <div className="lang-cluster">
          <span className="lang-pill lang-pill-active rounded-full px-4 py-2 text-sm font-semibold">
            {t(`langName.${activeLanguage}`)}
          </span>
        </div>
      )
    }
    return null
  }

  const inactives = languages.filter((lang) => lang !== activeLanguage)
  const expanded = hovered

  return (
    <div
      className="lang-cluster"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setHovered(false)
        }
      }}
    >
      <motion.button
        type="button"
        layout
        layoutId={`lang-pill-${activeLanguage}`}
        transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 32 }}
        className="lang-pill lang-pill-active relative z-10 rounded-full px-4 py-2 text-sm font-semibold"
        aria-current="true"
      >
        {t(`langName.${activeLanguage}`)}
      </motion.button>

      <AnimatePresence>
        {expanded &&
          inactives.map((lang, index) => {
            const offset = fanOffset(index)
            return (
              <motion.button
                key={lang}
                type="button"
                layoutId={`lang-pill-${lang}`}
                onClick={() => {
                  onSelect(lang)
                  setHovered(false)
                }}
                initial={reducedMotion ? { opacity: 0 } : { opacity: 0, x: 0, scale: 0.6 }}
                animate={reducedMotion ? { opacity: 1 } : { opacity: 1, x: offset, scale: 1 }}
                exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: 0, scale: 0.6 }}
                transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 320, damping: 28 }}
                className="lang-pill lang-pill-inactive absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium"
                aria-label={t(`langName.${lang}`)}
              >
                {t(`langName.${lang}`)}
              </motion.button>
            )
          })}
      </AnimatePresence>
    </div>
  )
}
