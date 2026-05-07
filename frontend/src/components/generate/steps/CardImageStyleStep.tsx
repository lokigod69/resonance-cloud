import { Image, Newspaper, Shuffle } from 'lucide-react'
import { PremiumOptionTile } from '../shared/PremiumVisualSelectors'
import { useTranslation } from '@/hooks/useTranslation'
import type { StandardCardImageStyle } from '../useWizardState'

interface CardImageStyleStepProps {
  value: StandardCardImageStyle | null
  onChange: (value: StandardCardImageStyle) => void
  skin?: 'classic' | 'glassy'
}

const STYLE_ICONS = {
  Photorealistic: Image,
  Editorial: Newspaper,
  Random: Shuffle,
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
      tone: 'realistic',
    },
    {
      value: 'Editorial' as const,
      label: skin === 'classic' ? t('generate.cardImageStyle.editorial.label') : 'Editorial',
      tone: 'editorial',
    },
    {
      value: 'Random' as const,
      label: skin === 'classic' ? t('generate.cardImageStyle.random.label') : 'Random',
      tone: 'random',
    },
  ]

  return (
    <div className={`standard-card-style-step standard-card-style-step-${skin}`}>
      {skin === 'glassy'
        ? <h3>{t('generate.cardImageStyle.titleStyleOnly')}</h3>
        : <h2>{t('generate.cardImageStyle.titleStyleOnly')}</h2>}

      <div className="standard-card-style-grid">
        {tiles.map((tile) => (
          <PremiumOptionTile
            key={tile.value}
            value={tile.value}
            label={tile.label}
            selected={value === tile.value}
            onSelect={onChange}
            icon={STYLE_ICONS[tile.value]}
            tone={tile.tone}
          />
        ))}
      </div>
    </div>
  )
}
