import { motion } from 'framer-motion'
import GlassCard from '../shared/GlassCard'
import { useTranslation } from '@/hooks/useTranslation'

type CardImageStyle = 'Photorealistic' | 'Editorial' | 'Random'
type CardImageModel = 'zturbo' | 'gpt_image_2'

interface CardImageStyleStepProps {
  value: CardImageStyle | null
  onChange: (value: CardImageStyle) => void
  modelValue: CardImageModel
  onModelChange: (value: CardImageModel) => void
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
  modelValue,
  onModelChange,
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
  const tierTiles = [
    {
      value: 'zturbo' as const,
      label: 'Standard Card',
      cost: '1 credit',
      helper: 'Fast image card, 1 credit',
      model: 'Z-Image Turbo',
    },
    {
      value: 'gpt_image_2' as const,
      label: 'GPT Image-2 Card',
      cost: '5 credits',
      helper: 'Premium GPT image card, 5 credits',
      model: 'Premium',
    },
  ]

  if (skin === 'glassy') {
    return (
      <div className="text-center">
        <h3>Choose card tier</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto mb-8">
          {tierTiles.map((tile) => (
            <div
              key={tile.value}
              className={modelValue === tile.value ? 'gen-orb selected' : 'gen-orb'}
              onClick={() => onModelChange(tile.value)}
            >
              <span className="gen-orb-label">{tile.label}</span>
              <span style={{ display: 'block', fontSize: '0.7rem', opacity: 0.65, marginTop: 2 }}>
                {tile.cost} - {tile.model}
              </span>
            </div>
          ))}
        </div>
        <h3>Visual style</h3>
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
        Choose card tier
      </motion.h2>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl w-full mb-8"
      >
        {tierTiles.map((tile) => (
          <motion.div key={tile.value} variants={item}>
            <GlassCard
              selected={modelValue === tile.value}
              onClick={() => onModelChange(tile.value)}
              className="flex flex-col gap-1.5 py-5"
            >
              <span className="text-sm font-medium text-white/90">{tile.label}</span>
              <span className="text-xs text-white/50">{tile.cost} - {tile.model}</span>
              <span className="text-xs text-white/35">{tile.helper}</span>
            </GlassCard>
          </motion.div>
        ))}
      </motion.div>

      <motion.h3
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-base font-medium tracking-tight text-white/70 mb-4"
      >
        Visual style
      </motion.h3>

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
