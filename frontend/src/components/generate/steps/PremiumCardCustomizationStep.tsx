import { motion } from 'framer-motion'
import GlassCard from '../shared/GlassCard'
import {
  CARD_LAYER2_ART_STYLE_OPTIONS,
  CARD_LAYER2_MEANING_OPTIONS,
  CARD_LAYER2_PRESENTATION_OPTIONS,
  DEFAULT_CARD_LAYER2,
  DEFAULT_CARD_LAYER2_ART_STYLE,
  type CardLayer2ArtStyle,
  type CardLayer2Customization,
} from '../useWizardState'

interface PremiumCardCustomizationStepProps {
  layer2Value: CardLayer2Customization | null
  artStyleValue: CardLayer2ArtStyle | null
  onLayer2Change: (value: Partial<CardLayer2Customization>) => void
  onArtStyleChange: (value: CardLayer2ArtStyle) => void
  onContinue: () => void
  skin?: 'classic' | 'glassy'
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
}

const item = {
  hidden: { opacity: 0, y: 14, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1 },
}

export default function PremiumCardCustomizationStep({
  layer2Value,
  artStyleValue,
  onLayer2Change,
  onArtStyleChange,
  onContinue,
  skin = 'classic',
}: PremiumCardCustomizationStepProps) {
  const selectedLayer2 = layer2Value ?? DEFAULT_CARD_LAYER2
  const selectedStyle = artStyleValue ?? DEFAULT_CARD_LAYER2_ART_STYLE

  if (skin === 'glassy') {
    return (
      <div className="text-center">
        <h3>Premium Card Customize</h3>
        <div className="space-y-8">
          <GlassyOptionGroup
            title="Meaning Strategy"
            options={CARD_LAYER2_MEANING_OPTIONS}
            selected={selectedLayer2.meaning_strategy}
            onSelect={(value) => onLayer2Change({ meaning_strategy: value })}
          />
          <GlassyOptionGroup
            title="Presentation Form"
            options={CARD_LAYER2_PRESENTATION_OPTIONS}
            selected={selectedLayer2.presentation_form}
            onSelect={(value) => onLayer2Change({ presentation_form: value })}
          />
          {selectedLayer2.presentation_form === 'word_object_design' && (
            <p className="text-sm text-go-text-secondary">
              Word as Design makes the word itself part of the image.
            </p>
          )}
          <GlassyOptionGroup
            title="Art Style"
            options={CARD_LAYER2_ART_STYLE_OPTIONS}
            selected={selectedStyle}
            onSelect={onArtStyleChange}
            compact
          />
        </div>
        <button
          type="button"
          className="gen-orb selected"
          style={{ marginTop: 28 }}
          onClick={onContinue}
        >
          Continue
        </button>
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
        Premium Card Customize
      </motion.h2>

      <div className="w-full max-w-4xl space-y-8">
        <ClassicOptionGroup
          title="Meaning Strategy"
          options={CARD_LAYER2_MEANING_OPTIONS}
          selected={selectedLayer2.meaning_strategy}
          onSelect={(value) => onLayer2Change({ meaning_strategy: value })}
        />
        <ClassicOptionGroup
          title="Presentation Form"
          options={CARD_LAYER2_PRESENTATION_OPTIONS}
          selected={selectedLayer2.presentation_form}
          onSelect={(value) => onLayer2Change({ presentation_form: value })}
        />
        {selectedLayer2.presentation_form === 'word_object_design' && (
          <p className="text-center text-sm text-white/50">
            Word as Design makes the word itself part of the image.
          </p>
        )}
        <ClassicOptionGroup
          title="Art Style"
          options={CARD_LAYER2_ART_STYLE_OPTIONS}
          selected={selectedStyle}
          onSelect={onArtStyleChange}
          compact
        />
      </div>

      <button
        type="button"
        onClick={onContinue}
        className="mt-8 px-8 py-3 rounded-xl bg-white/10 border border-white/20 text-white/90 font-semibold hover:bg-white/15 transition-all"
      >
        Continue
      </button>
    </div>
  )
}

function ClassicOptionGroup<T extends string>({
  title,
  options,
  selected,
  onSelect,
  compact = false,
}: {
  title: string
  options: Array<{ value: T; label: string; helper?: string }>
  selected: T
  onSelect: (value: T) => void
  compact?: boolean
}) {
  return (
    <section>
      <h3 className="text-sm font-semibold uppercase tracking-widest text-white/45 mb-4 text-center">
        {title}
      </h3>
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className={compact
          ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3'
          : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'}
      >
        {options.map((option) => (
          <motion.div key={option.value} variants={item}>
            <GlassCard
              selected={selected === option.value}
              onClick={() => onSelect(option.value)}
              className={compact ? 'py-3 px-3 min-h-[64px]' : 'py-5 px-4 min-h-[116px]'}
            >
              <span className="text-sm font-medium text-white/90">{option.label}</span>
              {option.helper && (
                <span className="text-xs text-white/50 leading-snug">{option.helper}</span>
              )}
            </GlassCard>
          </motion.div>
        ))}
      </motion.div>
    </section>
  )
}

function GlassyOptionGroup<T extends string>({
  title,
  options,
  selected,
  onSelect,
  compact = false,
}: {
  title: string
  options: Array<{ value: T; label: string; helper?: string }>
  selected: T
  onSelect: (value: T) => void
  compact?: boolean
}) {
  return (
    <section>
      <p className="art-group-heading">{title}</p>
      <div className="gen-orb-row">
        {options.map((option) => (
          <div
            key={option.value}
            className={selected === option.value ? 'gen-orb selected' : 'gen-orb'}
            onClick={() => onSelect(option.value)}
          >
            <span className="gen-orb-label">{option.label}</span>
            {!compact && option.helper && (
              <span style={{ display: 'block', fontSize: '0.7rem', opacity: 0.65, marginTop: 2 }}>
                {option.helper}
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
