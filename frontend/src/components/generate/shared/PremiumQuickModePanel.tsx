import { Settings, Zap } from 'lucide-react'
import {
  PREMIUM_QUICK_MODE_OPTIONS,
  type PremiumQuickMode,
} from '../useWizardState'

interface PremiumQuickModePanelProps {
  onQuickGenerate: () => void
  onModeGenerate: (mode: PremiumQuickMode) => void
  onCustomize: () => void
}

export default function PremiumQuickModePanel({
  onQuickGenerate,
  onModeGenerate,
  onCustomize,
}: PremiumQuickModePanelProps) {
  return (
    <div className="premium-quick-panel">
      <button
        type="button"
        onClick={onQuickGenerate}
        className="premium-quick-primary"
      >
        <Zap className="h-4 w-4" />
        Quick Generate
      </button>

      <div className="premium-quick-grid">
        {PREMIUM_QUICK_MODE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onModeGenerate(option.value)}
            className="premium-quick-button"
            title={option.helper}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="premium-customize-row">
        <button
          type="button"
          onClick={onCustomize}
          className="premium-customize-button"
        >
          <Settings className="h-4 w-4" />
          Customize
        </button>
      </div>
    </div>
  )
}
