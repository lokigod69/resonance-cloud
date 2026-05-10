import { ProductLaneVisualSelector } from '../shared/PremiumVisualSelectors'
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

interface TileDef {
  value: ProductLane
  label: string
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
      cost: t('generate.productLane.video.cost'),
    },
    {
      value: 'card_standard',
      label: t('generate.productLane.standard.label'),
      cost: t('generate.productLane.standard.cost'),
    },
    {
      value: 'card_premium',
      label: t('generate.productLane.premium.label'),
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

  return (
    <div className={`premium-product-step premium-product-step-${skin}`}>
      {skin === 'glassy' ? <h3>{title}</h3> : <h2>{title}</h2>}
      <ProductLaneVisualSelector
        options={tiles}
        selected={value}
        onSelect={onChange}
      />
    </div>
  )
}
