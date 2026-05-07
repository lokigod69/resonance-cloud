import type { LucideIcon } from 'lucide-react'
import { BookOpen, Clapperboard, Columns2, FileText, KeyRound, Lightbulb, Music2, PanelsTopLeft, Sparkles, Type, WandSparkles, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  MEANING_STRATEGY_UI_LABELS,
  MEANING_STRATEGY_VISUAL_TONES,
  PREMIUM_STYLE_SAMPLE_PATHS,
  PRESENTATION_FORM_UI_LABELS,
  PRESENTATION_FORM_VISUAL_TONES,
  PRODUCT_LANE_VISUAL_TONES,
} from '../premiumVisualAssets'
import type {
  CardLayer2ArtStyle,
  CardLayer2MeaningStrategy,
  CardLayer2PresentationForm,
  ProductLane,
} from '../useWizardState'

interface PremiumOptionTileProps<T extends string> {
  value: T
  label: string
  helper?: string
  meta?: string
  selected: boolean
  onSelect: (value: T) => void
  icon?: LucideIcon
  imageSrc?: string
  tone?: string
  variant?: 'standard' | 'product' | 'style'
}

export function PremiumOptionTile<T extends string>({
  value,
  label,
  helper,
  meta,
  selected,
  onSelect,
  icon: Icon = Sparkles,
  imageSrc,
  tone = 'default',
  variant = 'standard',
}: PremiumOptionTileProps<T>) {
  return (
    <button
      type="button"
      className={cn(
        'premium-option-tile',
        `premium-option-tile-${variant}`,
        selected && 'selected',
      )}
      onClick={() => onSelect(value)}
      aria-pressed={selected}
      data-tone={tone}
    >
      <span className="premium-option-orb" aria-hidden="true">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt=""
            loading={variant === 'style' ? 'eager' : 'lazy'}
            decoding="async"
          />
        ) : (
          <Icon className="premium-option-icon" strokeWidth={1.8} />
        )}
      </span>
      <span className="premium-option-copy">
        <span className="premium-option-label">{label}</span>
        {helper ? <span className="premium-option-helper">{helper}</span> : null}
        {meta ? <span className="premium-option-meta">{meta}</span> : null}
      </span>
    </button>
  )
}

interface ProductLaneVisualSelectorProps {
  options: Array<{ value: ProductLane; label: string; helper: string; cost: string }>
  selected: ProductLane | null
  onSelect: (value: ProductLane) => void
}

const PRODUCT_ICONS: Record<ProductLane, LucideIcon> = {
  video: Music2,
  card_standard: BookOpen,
  card_premium: Clapperboard,
}

export function ProductLaneVisualSelector({
  options,
  selected,
  onSelect,
}: ProductLaneVisualSelectorProps) {
  return (
    <div className="premium-product-grid">
      {options.map((option) => (
        <PremiumOptionTile
          key={option.value}
          value={option.value}
          label={option.label}
          helper={option.helper}
          meta={option.cost}
          selected={selected === option.value}
          onSelect={onSelect}
          icon={PRODUCT_ICONS[option.value]}
          tone={PRODUCT_LANE_VISUAL_TONES[option.value]}
          variant="product"
        />
      ))}
    </div>
  )
}

interface PremiumVisualSelectorProps<T extends CardLayer2MeaningStrategy | CardLayer2PresentationForm> {
  title: string
  options: Array<{ value: T; label: string }>
  selected: T
  onSelect: (value: T) => void
  kind: 'meaning' | 'presentation'
}

const MEANING_ICONS: Record<CardLayer2MeaningStrategy, LucideIcon> = {
  clear_meaning: Lightbulb,
  exaggerated_meaning: Zap,
  absurd_hook: WandSparkles,
  sound_mnemonic: KeyRound,
}

const PRESENTATION_ICONS: Record<CardLayer2PresentationForm, LucideIcon> = {
  single_scene: PanelsTopLeft,
  mini_story: BookOpen,
  split_panel: Columns2,
  word_object_design: Type,
  infographic_card: FileText,
}

export function PremiumVisualSelector<T extends CardLayer2MeaningStrategy | CardLayer2PresentationForm>({
  title,
  options,
  selected,
  onSelect,
  kind,
}: PremiumVisualSelectorProps<T>) {
  return (
    <section className="premium-selector-section">
      <h4 className="premium-selector-heading">{title}</h4>
      <div className={cn('premium-selector-grid', kind === 'presentation' && 'premium-selector-grid-presentation')}>
        {options.map((option) => {
          const isMeaning = kind === 'meaning'
          const value = option.value
          const label = isMeaning
            ? MEANING_STRATEGY_UI_LABELS[value as CardLayer2MeaningStrategy]
            : PRESENTATION_FORM_UI_LABELS[value as CardLayer2PresentationForm]
          const tone = isMeaning
            ? MEANING_STRATEGY_VISUAL_TONES[value as CardLayer2MeaningStrategy]
            : PRESENTATION_FORM_VISUAL_TONES[value as CardLayer2PresentationForm]
          const Icon = isMeaning
            ? MEANING_ICONS[value as CardLayer2MeaningStrategy]
            : PRESENTATION_ICONS[value as CardLayer2PresentationForm]

          return (
            <PremiumOptionTile
              key={value}
              value={value}
              label={label}
              selected={selected === value}
              onSelect={onSelect}
              icon={Icon}
              tone={tone}
            />
          )
        })}
      </div>
    </section>
  )
}

interface PremiumStyleSelectorProps {
  title: string
  options: Array<{ value: CardLayer2ArtStyle; label: string }>
  selected: CardLayer2ArtStyle
  onSelect: (value: CardLayer2ArtStyle) => void
}

export function PremiumStyleSelector({
  title,
  options,
  selected,
  onSelect,
}: PremiumStyleSelectorProps) {
  return (
    <section className="premium-selector-section">
      <h4 className="premium-selector-heading">{title}</h4>
      <div className="premium-style-grid">
        {options.map((option) => (
          <PremiumOptionTile
            key={option.value}
            value={option.value}
            label={option.label}
            selected={selected === option.value}
            onSelect={onSelect}
            imageSrc={PREMIUM_STYLE_SAMPLE_PATHS[option.value]}
            tone="style"
            variant="style"
          />
        ))}
      </div>
    </section>
  )
}
