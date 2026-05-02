import { motion } from 'framer-motion'
import GlassCard from '../shared/GlassCard'
import { useTranslation } from '@/hooks/useTranslation'

type DeckType = 'video' | 'card'

interface DeckTypeStepProps {
  value: DeckType | null
  onChange: (value: DeckType) => void
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

export default function DeckTypeStep({ value, onChange, skin = 'classic' }: DeckTypeStepProps) {
  const { t } = useTranslation()

  const tiles = [
    {
      value: 'video' as const,
      label: skin === 'classic' ? t('generate.deckType.video.label') : 'Video and Music',
      cost: skin === 'classic' ? t('generate.deckType.video.cost') : '10 credits per word',
    },
    {
      value: 'card' as const,
      label: skin === 'classic' ? t('generate.deckType.card.label') : 'Image',
      cost: skin === 'classic' ? t('generate.deckType.card.cost') : '1 credit per word',
    },
  ]

  if (skin === 'glassy') {
    return (
      <div className="text-center">
        <h3>How would you like to learn?</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto">
          {tiles.map((tile) => (
            <div
              key={tile.value}
              className={value === tile.value ? 'gen-orb selected' : 'gen-orb'}
              onClick={() => onChange(tile.value)}
            >
              <span className="gen-orb-label">{tile.label}</span>
              <span style={{ display: 'block', fontSize: '0.7rem', opacity: 0.6, marginTop: 2 }}>
                {tile.cost}
              </span>
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
        {t('generate.deckType.title')}
      </motion.h2>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-lg w-full"
      >
        {tiles.map((tile) => (
          <motion.div key={tile.value} variants={item}>
            <GlassCard
              selected={value === tile.value}
              onClick={() => onChange(tile.value)}
              className="flex flex-col gap-1.5 py-5"
            >
              <span className="text-sm font-medium text-white/90">{tile.label}</span>
              <span className="text-xs text-white/40">{tile.cost}</span>
            </GlassCard>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
