import { motion } from 'framer-motion'
import GlassCard from '../shared/GlassCard'
import { useTranslation } from '@/hooks/useTranslation'
import type { ProductLane } from '../useWizardState'

interface ProductLaneStepProps {
  value: ProductLane | null
  onChange: (value: ProductLane) => void
  /** "all" shows Video + Standard + Premium. "card-only" shows just the two
   *  card tiles — used when appending to an existing card deck (the deck's
   *  language and card vs. video commitment is locked, but the user may still
   *  pick Standard or Premium). */
  variant?: 'all' | 'card-only'
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

interface TileDef {
  value: ProductLane
  label: string
  helper: string
  cost: string
}

export default function ProductLaneStep({
  value,
  onChange,
  variant = 'all',
  skin = 'classic',
}: ProductLaneStepProps) {
  const { t } = useTranslation()

  const allTiles: TileDef[] = [
    {
      value: 'video',
      label: t('generate.productLane.video.label'),
      helper: t('generate.productLane.video.helper'),
      cost: t('generate.productLane.video.cost'),
    },
    {
      value: 'card_standard',
      label: t('generate.productLane.standard.label'),
      helper: t('generate.productLane.standard.helper'),
      cost: t('generate.productLane.standard.cost'),
    },
    {
      value: 'card_premium',
      label: t('generate.productLane.premium.label'),
      helper: t('generate.productLane.premium.helper'),
      cost: t('generate.productLane.premium.cost'),
    },
  ]

  const tiles = variant === 'card-only'
    ? allTiles.filter((tile) => tile.value !== 'video')
    : allTiles

  const title =
    variant === 'card-only'
      ? t('generate.productLane.titleCardOnly')
      : t('generate.productLane.title')

  if (skin === 'glassy') {
    return (
      <div className="text-center">
        <h3>{title}</h3>
        <div
          className={`grid grid-cols-1 ${tiles.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-4 max-w-2xl mx-auto`}
        >
          {tiles.map((tile) => (
            <div
              key={tile.value}
              className={value === tile.value ? 'gen-orb selected' : 'gen-orb'}
              onClick={() => onChange(tile.value)}
            >
              <span className="gen-orb-label">{tile.label}</span>
              <span style={{ display: 'block', fontSize: '0.7rem', opacity: 0.7, marginTop: 2 }}>
                {tile.helper}
              </span>
              <span style={{ display: 'block', fontSize: '0.7rem', opacity: 0.55, marginTop: 2 }}>
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
        {title}
      </motion.h2>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className={`grid grid-cols-1 ${tiles.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-4 max-w-2xl w-full`}
      >
        {tiles.map((tile) => (
          <motion.div key={tile.value} variants={item}>
            <GlassCard
              selected={value === tile.value}
              onClick={() => onChange(tile.value)}
              className="flex flex-col gap-1.5 py-5"
            >
              <span className="text-sm font-medium text-white/90">{tile.label}</span>
              <span className="text-xs text-white/50">{tile.helper}</span>
              <span className="text-xs text-white/40">{tile.cost}</span>
            </GlassCard>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
