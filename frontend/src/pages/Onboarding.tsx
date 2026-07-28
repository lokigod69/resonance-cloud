import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChevronRight } from 'lucide-react'
import { BASE_LANGUAGES, BETA_WIZARD_LANGUAGES, type Language } from '@/lib/languages'
import { markTargetLanguageChosen } from '@/lib/targetLanguage'
import { useLanguage } from '@/contexts/LanguageContext'
import { useTranslation } from '@/hooks/useTranslation'
import { LingwaveBrand } from '@/components/branding/LingwaveBrand'
import { LingwaveWaves } from '@/components/branding/LingwaveWaves'

/**
 * The two questions that define a language-learning account: what you speak,
 * and what you want to learn. Nothing else belongs here — invite-code
 * redemption lives in the global RedeemCodeDialog (header/coin/account strip),
 * and new accounts start with signup credits.
 *
 * The gate that routes here fires on a missing TARGET language (see
 * shouldRedirectToOnboarding in App.tsx) — never on base_language, whose DB
 * default made the old gate dead code in production.
 */
export default function Onboarding() {
  const { t } = useTranslation()
  const { user, refreshProfile } = useAuth()
  const { setActiveLanguage } = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()

  const [step, setStep] = useState<1 | 2>(1)
  const [selectedLanguage, setSelectedLanguage] = useState('')
  const [saving, setSaving] = useState(false)
  const [languageError, setLanguageError] = useState<string | null>(null)

  const [selectedTarget, setSelectedTarget] = useState('')
  const [savingTarget, setSavingTarget] = useState(false)
  const [targetError, setTargetError] = useState<string | null>(null)

  function getLocalizedLanguageLabel(lang: Language) {
    const translatedName = t(`langName.${lang.value}`)
    return lang.nativeName === translatedName ? translatedName : `${lang.nativeName} (${translatedName})`
  }

  async function handleLanguageContinue() {
    if (!selectedLanguage || !user) return
    setSaving(true)
    setLanguageError(null)

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ base_language: selectedLanguage })
        .eq('id', user.id)
        .select('base_language')
        .single()

      if (error || data?.base_language !== selectedLanguage) {
        console.error('[Onboarding] base_language update failed', {
          userId: user.id,
          requestedBaseLanguage: selectedLanguage,
          returnedBaseLanguage: data?.base_language,
          error,
        })
        setLanguageError(t('profile.saveFailed'))
        return
      }

      await refreshProfile()
      setStep(2)
    } catch (error) {
      console.error('[Onboarding] base_language update exception', {
        userId: user.id,
        requestedBaseLanguage: selectedLanguage,
        error,
      })
      setLanguageError(t('profile.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  async function handleTargetContinue() {
    if (!selectedTarget || !user) return
    setSavingTarget(true)
    setTargetError(null)

    try {
      // Server-side first: the profile column survives reinstalls and devices.
      // Best-effort by design — until migration 20260727090000 lands, the column
      // does not exist and this update fails; the local flag + language stores
      // below still complete onboarding, and the app degrades to device-scoped.
      const { error } = await supabase
        .from('profiles')
        .update({ target_language: selectedTarget })
        .eq('id', user.id)
      if (error) {
        console.warn('[Onboarding] target_language profile write failed (pre-migration is expected)', {
          userId: user.id,
          requestedTargetLanguage: selectedTarget,
          error,
        })
      }

      // Local truth: the sticky flag closes the gate; setActiveLanguage fans the
      // choice out to the guided (Today) and Library stores plus availableLanguages.
      markTargetLanguageChosen(user.id)
      setActiveLanguage(selectedTarget)
      await refreshProfile()

      const from = (location.state as { from?: { pathname?: string; search?: string; hash?: string } } | null)?.from
      const destination = from?.pathname && from.pathname !== '/onboarding'
        ? `${from.pathname}${from.search ?? ''}${from.hash ?? ''}`
        : '/dashboard'
      navigate(destination, { replace: true })
    } catch (error) {
      console.error('[Onboarding] target language selection failed', {
        userId: user.id,
        requestedTargetLanguage: selectedTarget,
        error,
      })
      setTargetError(t('profile.saveFailed'))
    } finally {
      setSavingTarget(false)
    }
  }

  return (
    <div className="theme-cosmos relative min-h-screen flex items-center justify-center overflow-hidden bg-[var(--app-bg)] p-6">
      <LingwaveWaves />
      <div className="relative z-10 w-full max-w-md space-y-8">
        {/* Brand */}
        <div className="flex flex-col items-center gap-3 text-center">
          <LingwaveBrand markClassName="h-9" wordmarkClassName="h-7" />
          <p className="text-muted-foreground text-sm">{t('onboarding.welcomeSubtitle')}</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2">
          <div className={`h-2 w-12 rounded-full transition-colors ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
          <div className={`h-2 w-12 rounded-full transition-colors ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
        </div>

        {/* Step 1: Base Language */}
        {step === 1 && (
          <div className="glass rounded-xl p-8 space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold">{t('onboarding.languageTitle')}</h2>
              <p className="text-sm text-muted-foreground">
                {t('onboarding.languageDescription')}
              </p>
            </div>

            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger className="h-12 bg-card border-border">
                <SelectValue placeholder={t('onboarding.languagePlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {BASE_LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {getLocalizedLanguageLabel(lang)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {languageError && (
              <p className="text-center text-sm text-destructive">{languageError}</p>
            )}

            <Button
              className="w-full h-12"
              onClick={handleLanguageContinue}
              disabled={!selectedLanguage || saving}
            >
              {saving ? t('onboarding.saving') : t('onboarding.continue')}
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}

        {/* Step 2: Target Language */}
        {step === 2 && (
          <div className="glass rounded-xl p-8 space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold">{t('onboarding.targetTitle')}</h2>
              <p className="text-sm text-muted-foreground">
                {t('onboarding.targetDescription')}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t('onboarding.targetTitle')}>
              {BETA_WIZARD_LANGUAGES.map((lang) => {
                const isSelected = selectedTarget === lang.value
                return (
                  <button
                    key={lang.value}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setSelectedTarget(lang.value)}
                    className={`flex min-h-[56px] flex-col items-start justify-center rounded-lg border-2 px-4 py-2 text-left transition-all ${
                      isSelected ? 'theme-chip-active' : 'theme-chip'
                    }`}
                  >
                    <span className="text-sm font-medium">{lang.nativeName}</span>
                    {lang.nativeName !== t(`langName.${lang.value}`) && (
                      <span className="text-xs text-muted-foreground">{t(`langName.${lang.value}`)}</span>
                    )}
                  </button>
                )
              })}
            </div>

            {targetError && (
              <p className="text-center text-sm text-destructive">{targetError}</p>
            )}

            <Button
              className="w-full h-12"
              onClick={handleTargetContinue}
              disabled={!selectedTarget || savingTarget}
            >
              {savingTarget ? t('onboarding.saving') : t('onboarding.startLearning')}
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
