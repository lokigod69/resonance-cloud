import type { ComponentType } from 'react'
import { BookOpen, Columns2, FileText, KeyRound, Lightbulb, Music2, PanelsTopLeft, Sparkles, Type, WandSparkles, Zap } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { cn } from '@/lib/utils'
import {
  MEANING_STRATEGY_VISUAL_TONES,
  PREMIUM_STYLE_SAMPLE_PATHS,
  INFOGRAPHIC_STYLE_VISUAL_TONES,
  PRESENTATION_FORM_VISUAL_TONES,
  PRODUCT_LANE_VISUAL_TONES,
} from '../premiumVisualAssets'
import { PREMIUM_INFOGRAPHIC_STYLE_OPTIONS } from '../useWizardState'
import type {
  CardLayer2ArtStyle,
  CardLayer2MeaningStrategy,
  CardLayer2PresentationForm,
  PremiumInfographicStyle,
  ProductLane,
} from '../useWizardState'

type PremiumVisualIcon = ComponentType<{ className?: string; strokeWidth?: number }>

interface PremiumOptionTileProps<T extends string> {
  value: T
  label: string
  helper?: string
  meta?: string
  selected: boolean
  onSelect: (value: T) => void
  icon?: PremiumVisualIcon
  imageSrc?: string
  tone?: string
  variant?: 'standard' | 'product' | 'style'
  disabled?: boolean
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
  disabled = false,
}: PremiumOptionTileProps<T>) {
  return (
    <button
      type="button"
      className={cn(
        'premium-option-tile',
        `premium-option-tile-${variant}`,
        selected && 'selected',
        disabled && 'disabled',
      )}
      onClick={() => {
        if (!disabled) onSelect(value)
      }}
      disabled={disabled}
      aria-pressed={selected}
      aria-disabled={disabled}
      data-tone={tone}
      data-option-value={value}
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

export interface PremiumSummaryItem {
  key: string
  label: string
  ariaLabel: string
  onClick?: () => void
  tone?: string
}

interface PremiumSummaryRowProps {
  items: PremiumSummaryItem[]
  className?: string
}

export function PremiumSummaryRow({ items, className }: PremiumSummaryRowProps) {
  const { t } = useTranslation()

  if (items.length === 0) return null

  return (
    <div className={cn('premium-summary-row', className)} aria-label={t('premium.summary.ariaLabel')}>
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          className="premium-summary-orb"
          onClick={item.onClick}
          disabled={!item.onClick}
          aria-label={item.ariaLabel}
          data-tone={item.tone}
        >
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  )
}

interface ProductLaneVisualSelectorProps {
  options: Array<{ value: ProductLane; label: string; helper: string; cost: string }>
  selected: ProductLane | null
  onSelect: (value: ProductLane) => void
}

function PremiumCardVisualIcon({ className, strokeWidth = 1.8 }: { className?: string; strokeWidth?: number }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
    >
      <g
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      >
        <rect x="17" y="19" width="31" height="20" rx="4" transform="rotate(-7 17 19)" />
        <rect x="13" y="25" width="34" height="22" rx="4" />
        <path d="M20 33h20" opacity="0.72" />
        <path d="M20 40h12" opacity="0.52" />
        <path d="M49 15l2 4 4 2-4 2-2 4-2-4-4-2 4-2 2-4z" />
      </g>
    </svg>
  )
}

const PRODUCT_ICONS: Record<ProductLane, PremiumVisualIcon> = {
  video: Music2,
  card_standard: BookOpen,
  card_premium: PremiumCardVisualIcon,
  card_text: Type,
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
  options: Array<{ value: T; label: string; helper?: string; labelKey?: string; helperKey?: string }>
  selected: T
  onSelect: (value: T) => void
  kind: 'meaning' | 'presentation'
  disabled?: boolean
  disabledHelper?: string
}

const MEANING_ICONS: Record<CardLayer2MeaningStrategy, PremiumVisualIcon> = {
  clear_meaning: Lightbulb,
  exaggerated_meaning: Zap,
  absurd_hook: WandSparkles,
  sound_mnemonic: KeyRound,
}

const PRESENTATION_ICONS: Record<CardLayer2PresentationForm, PremiumVisualIcon> = {
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
  disabled = false,
  disabledHelper,
}: PremiumVisualSelectorProps<T>) {
  const { t } = useTranslation()

  return (
    <section className={cn('premium-selector-section', disabled && 'premium-selector-section-disabled')}>
      <h4 className="premium-selector-heading">{title}</h4>
      {disabled && disabledHelper ? (
        <p className="premium-selector-disabled-note">{disabledHelper}</p>
      ) : null}
      <div className={cn('premium-selector-grid', kind === 'presentation' && 'premium-selector-grid-presentation')}>
        {options.map((option) => {
          const isMeaning = kind === 'meaning'
          const value = option.value
          const label = option.labelKey ? t(option.labelKey) : option.label
          const helper = option.helperKey ? t(option.helperKey) : option.helper
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
              helper={helper}
              selected={selected === value}
              onSelect={onSelect}
              icon={Icon}
              tone={tone}
              disabled={disabled}
            />
          )
        })}
      </div>
    </section>
  )
}

interface PremiumStyleSelectorProps {
  title: string
  options: Array<{ value: CardLayer2ArtStyle; label: string; labelKey?: string }>
  selected: CardLayer2ArtStyle
  onSelect: (value: CardLayer2ArtStyle) => void
  disabled?: boolean
  disabledHelper?: string
}

export function PremiumStyleSelector({
  title,
  options,
  selected,
  onSelect,
  disabled = false,
  disabledHelper,
}: PremiumStyleSelectorProps) {
  const { t } = useTranslation()

  return (
    <section className={cn('premium-selector-section', disabled && 'premium-selector-section-disabled')}>
      <h4 className="premium-selector-heading">{title}</h4>
      {disabled && disabledHelper ? (
        <p className="premium-selector-disabled-note">{disabledHelper}</p>
      ) : null}
      <div className="premium-style-grid">
        {options.map((option) => (
          <PremiumOptionTile
            key={option.value}
            value={option.value}
            label={option.labelKey ? t(option.labelKey) : option.label}
            selected={selected === option.value}
            onSelect={onSelect}
            imageSrc={PREMIUM_STYLE_SAMPLE_PATHS[option.value]}
            tone="style"
            variant="style"
            disabled={disabled}
          />
        ))}
      </div>
    </section>
  )
}

const INFOGRAPHIC_ICONS: Record<PremiumInfographicStyle, PremiumVisualIcon> = {
  auto: Sparkles,
  study_poster: BookOpen,
  visual_dictionary: FileText,
  language_atlas: Columns2,
  museum_exhibit: PanelsTopLeft,
  dense_encyclopedia: BookOpen,
}

interface PremiumInfographicStyleSelectorProps {
  title: string
  helper?: string
  selected: PremiumInfographicStyle
  onSelect: (value: PremiumInfographicStyle) => void
}

export function PremiumInfographicStyleSelector({
  title,
  helper,
  selected,
  onSelect,
}: PremiumInfographicStyleSelectorProps) {
  const { t } = useTranslation()

  return (
    <section className="premium-selector-section premium-infographic-style-section">
      <h4 className="premium-selector-heading">{title}</h4>
      {helper ? (
        <p className="premium-selector-disabled-note premium-infographic-mode-note">{helper}</p>
      ) : null}
      <div className="premium-selector-grid premium-infographic-style-grid">
        {PREMIUM_INFOGRAPHIC_STYLE_OPTIONS.map((option) => (
          <PremiumOptionTile
            key={option.value}
            value={option.value}
            label={t(option.labelKey)}
            helper={t(option.helperKey)}
            selected={selected === option.value}
            onSelect={onSelect}
            icon={INFOGRAPHIC_ICONS[option.value]}
            tone={INFOGRAPHIC_STYLE_VISUAL_TONES[option.value]}
          />
        ))}
      </div>
    </section>
  )
}
