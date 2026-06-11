import { ProductLaneVisualSelector } from '../shared/PremiumVisualSelectors'
import { useAuth } from '@/hooks/useAuth'
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
  const { profile, profileLoading } = useAuth()
  const creditCount = typeof profile?.credits === 'number' ? profile.credits : profileLoading ? '...' : 0

  const allTiles: TileDef[] = [
    {
      value: 'card_text',
      label: t('generate.productLane.cardText.label'),
      helper: t('generate.productLane.cardText.helper'),
      cost: t('generate.productLane.cardText.cost'),
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
    {
      value: 'video',
      label: t('generate.productLane.video.label'),
      helper: t('generate.productLane.video.helper'),
      cost: t('generate.productLane.video.cost'),
    },
  ]

  const tiles = variant === 'card-only'
    ? allTiles.filter((tile) => tile.value === 'card_standard' || tile.value === 'card_premium')
    : allTiles

  const title =
    variant === 'card-only'
      ? t('generate.productLane.titleCardOnly')
      : t('generate.productLane.title')

  return (
    <div className={`premium-product-step premium-product-step-${skin}`}>
      {skin === 'glassy' ? <h3>{title}</h3> : <h2>{title}</h2>}
      <p className="mt-2 text-center text-sm text-muted-foreground" aria-live="polite">
        {t('generate.productLane.creditsAvailable', { count: creditCount })}
      </p>
      <ProductLaneVisualSelector
        options={tiles}
        selected={value}
        onSelect={onChange}
      />
    </div>
  )
}
