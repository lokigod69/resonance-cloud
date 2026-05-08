import { Settings, Zap } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
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
  const { t } = useTranslation()

  return (
    <div className="premium-quick-panel">
      <button
        type="button"
        onClick={onQuickGenerate}
        className="premium-quick-primary"
      >
        <Zap className="h-4 w-4" />
        <span>{t('generate.quickGenerate')}</span>
      </button>

      <div className="premium-quick-grid">
        {PREMIUM_QUICK_MODE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onModeGenerate(option.value)}
            className="premium-quick-button"
            title={t(option.helperKey)}
          >
            {t(option.labelKey)}
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
          <span>{t('generate.customize')}</span>
        </button>
      </div>
    </div>
  )
}
