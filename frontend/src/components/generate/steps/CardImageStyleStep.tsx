import { motion } from 'framer-motion'
import GlassCard from '../shared/GlassCard'
import { useTranslation } from '@/hooks/useTranslation'
import type { StandardCardImageStyle } from '../useWizardState'

interface CardImageStyleStepProps {
  value: StandardCardImageStyle | null
  onChange: (value: StandardCardImageStyle) => void
  skin?: 'classic' | 'glassy'
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}

const item = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1 },
}

export default function CardImageStyleStep({
  value,
  onChange,
  skin = 'classic',
}: CardImageStyleStepProps) {
  const { t } = useTranslation()

  const tiles = [
    {
      value: 'Photorealistic' as const,
      label: skin === 'classic' ? t('generate.cardImageStyle.realistic.label') : 'Realistic',
    },
    {
      value: 'Editorial' as const,
      label: skin === 'classic' ? t('generate.cardImageStyle.editorial.label') : 'Editorial',
    },
    {
      value: 'Random' as const,
      label: skin === 'classic' ? t('generate.cardImageStyle.random.label') : 'Random',
    },
  ]

  if (skin === 'glassy') {
    return (
      <div className="text-center">
        <h3>{t('generate.cardImageStyle.titleStyleOnly')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
          {tiles.map((tile) => (
            <div
              key={tile.value}
              className={value === tile.value ? 'gen-orb selected' : 'gen-orb'}
              onClick={() => onChange(tile.value)}
            >
              <span className="gen-orb-label">{tile.label}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center min-h-[60vh] px-4 pt-8">
      <motion.h2
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-semibold tracking-tight text-white/90 mb-8"
      >
        {t('generate.cardImageStyle.titleStyleOnly')}
      </motion.h2>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl w-full"
      >
        {tiles.map((tile) => (
          <motion.div key={tile.value} variants={item}>
            <GlassCard
              selected={value === tile.value}
              onClick={() => onChange(tile.value)}
              className="flex flex-col gap-1.5 py-5"
            >
              <span className="text-sm font-medium text-white/90">{tile.label}</span>
            </GlassCard>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
