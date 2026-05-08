import {
  PremiumInfographicStyleSelector,
  PremiumStyleSelector,
  PremiumVisualSelector,
} from '../shared/PremiumVisualSelectors'
import {
  CARD_LAYER2_ART_STYLE_OPTIONS,
  CARD_LAYER2_MEANING_OPTIONS,
  CARD_LAYER2_PRESENTATION_OPTIONS,
  DEFAULT_CARD_LAYER2,
  DEFAULT_CARD_LAYER2_ART_STYLE,
  DEFAULT_PREMIUM_INFOGRAPHIC_STYLE,
  type CardLayer2ArtStyle,
  type CardLayer2Customization,
  type PremiumInfographicStyle,
} from '../useWizardState'

interface PremiumCardCustomizationStepProps {
  layer2Value: CardLayer2Customization | null
  artStyleValue: CardLayer2ArtStyle | null
  infographicStyleValue: PremiumInfographicStyle
  onLayer2Change: (value: Partial<CardLayer2Customization>) => void
  onArtStyleChange: (value: CardLayer2ArtStyle) => void
  onInfographicStyleChange: (value: PremiumInfographicStyle) => void
  onContinue: () => void
  skin?: 'classic' | 'glassy'
}

function InactivePremiumSelector({
  title,
  helper,
}: {
  title: string
  helper: string
}) {
  return (
    <section
      className="premium-selector-section premium-selector-section-disabled premium-selector-section-collapsed"
      aria-disabled="true"
    >
      <h4 className="premium-selector-heading">{title}</h4>
      <p className="premium-selector-disabled-note">{helper}</p>
    </section>
  )
}

export default function PremiumCardCustomizationStep({
  layer2Value,
  artStyleValue,
  infographicStyleValue,
  onLayer2Change,
  onArtStyleChange,
  onInfographicStyleChange,
  onContinue,
  skin = 'classic',
}: PremiumCardCustomizationStepProps) {
  const selectedLayer2 = layer2Value ?? DEFAULT_CARD_LAYER2
  const selectedStyle = artStyleValue ?? DEFAULT_CARD_LAYER2_ART_STYLE
  const selectedInfographicStyle = infographicStyleValue ?? DEFAULT_PREMIUM_INFOGRAPHIC_STYLE
  const isInfographic = selectedLayer2.presentation_form === 'infographic_card'

  return (
    <div className={`premium-customize-step premium-customize-step-${skin}`}>
      {skin === 'glassy' ? <h3>Premium Card Customize</h3> : <h2>Premium Card Customize</h2>}
      <div className="premium-customize-panel">
        {isInfographic ? (
          <InactivePremiumSelector
            title="Meaning Strategy"
            helper="Not used for Infographic."
          />
        ) : (
          <PremiumVisualSelector
            title="Meaning Strategy"
            options={CARD_LAYER2_MEANING_OPTIONS}
            selected={selectedLayer2.meaning_strategy}
            onSelect={(value) => onLayer2Change({ meaning_strategy: value })}
            kind="meaning"
          />
        )}
        <PremiumVisualSelector
          title="Presentation Form"
          options={CARD_LAYER2_PRESENTATION_OPTIONS}
          selected={selectedLayer2.presentation_form}
          onSelect={(value) => onLayer2Change({ presentation_form: value })}
          kind="presentation"
        />
        {isInfographic && (
          <PremiumInfographicStyleSelector
            title="Infographic Style"
            helper="Infographics use dedicated educational-poster prompting. Meaning Strategy and Art Style do not apply."
            selected={selectedInfographicStyle}
            onSelect={onInfographicStyleChange}
          />
        )}
        {isInfographic ? (
          <InactivePremiumSelector
            title="Art Style"
            helper="Not used for Infographic."
          />
        ) : (
          <PremiumStyleSelector
            title="Art Style"
            options={CARD_LAYER2_ART_STYLE_OPTIONS}
            selected={selectedStyle}
            onSelect={onArtStyleChange}
          />
        )}
      </div>

      <button
        type="button"
        onClick={onContinue}
        className="premium-continue-button"
      >
        Continue
      </button>
    </div>
  )
}
