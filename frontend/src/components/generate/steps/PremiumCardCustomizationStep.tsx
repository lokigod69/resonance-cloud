import {
  PremiumStyleSelector,
  PremiumVisualSelector,
} from '../shared/PremiumVisualSelectors'
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

  return (
    <div className={`premium-customize-step premium-customize-step-${skin}`}>
      {skin === 'glassy' ? <h3>Premium Card Customize</h3> : <h2>Premium Card Customize</h2>}
      <div className="premium-customize-panel">
        <PremiumVisualSelector
          title="Meaning Strategy"
          options={CARD_LAYER2_MEANING_OPTIONS}
          selected={selectedLayer2.meaning_strategy}
          onSelect={(value) => onLayer2Change({ meaning_strategy: value })}
          kind="meaning"
        />
        <PremiumVisualSelector
          title="Presentation Form"
          options={CARD_LAYER2_PRESENTATION_OPTIONS}
          selected={selectedLayer2.presentation_form}
          onSelect={(value) => onLayer2Change({ presentation_form: value })}
          kind="presentation"
        />
        {selectedLayer2.presentation_form === 'word_object_design' && (
          <p className="premium-selector-note">
            Word as Design makes the word itself part of the image.
          </p>
        )}
        <PremiumStyleSelector
          title="Art Style"
          options={CARD_LAYER2_ART_STYLE_OPTIONS}
          selected={selectedStyle}
          onSelect={onArtStyleChange}
        />
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
