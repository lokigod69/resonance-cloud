import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChevronRight, Gift, Check } from 'lucide-react'
import { BASE_LANGUAGES, type Language } from '@/lib/languages'
import { useTranslation } from '@/hooks/useTranslation'
import { LingwaveBrand } from '@/components/branding/LingwaveBrand'
import { LingwaveWaves } from '@/components/branding/LingwaveWaves'

export default function Onboarding() {
  const { t } = useTranslation()
  const { user, refreshProfile } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState<1 | 2>(1)
  const [selectedLanguage, setSelectedLanguage] = useState('')
  const [saving, setSaving] = useState(false)
  const [languageError, setLanguageError] = useState<string | null>(null)

  const [inviteCode, setInviteCode] = useState('')
  const [redeemError, setRedeemError] = useState<string | null>(null)
  const [redeemSuccess, setRedeemSuccess] = useState<{ credits: number } | null>(null)
  const [redeeming, setRedeeming] = useState(false)

  function getLocalizedLanguageLabel(lang: Language) {
    const translatedName = t(`langName.${lang.value}`)
    return lang.nativeName === translatedName ? translatedName : `${lang.nativeName} (${translatedName})`
  }

  function getRedeemErrorMessage(error?: string) {
    const normalizedError = error?.toLowerCase() ?? ''

    if (normalizedError.includes('already redeemed')) return t('credits.errorRedeemed')
    if (normalizedError.includes('invalid') || normalizedError.includes('inactive')) return t('credits.errorInvalid')

    return t('credits.errorFailed')
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

  async function handleRedeemCode() {
    if (!inviteCode.trim() || !user) return
    setRedeeming(true)
    setRedeemError(null)

    const code = inviteCode.trim().toUpperCase()

    try {
      const { data, error: rpcError } = await supabase.rpc('redeem_invite_code', { code_text: code })
      if (rpcError || !data) {
        console.error('Invite code redemption failed:', rpcError)
        setRedeemError(t('credits.errorFailed'))
        return
      }

      const result = data as { success: boolean; credits_awarded?: number; error?: string }
      if (!result.success) {
        setRedeemError(getRedeemErrorMessage(result.error))
      } else {
        setRedeemSuccess({ credits: result.credits_awarded || 0 })
        setInviteCode('')
        await refreshProfile()
      }
    } catch (error) {
      console.error('Invite code redemption failed:', error)
      setRedeemError(t('credits.errorFailed'))
    } finally {
      setRedeeming(false)
    }
  }

  function handleFinish() {
    localStorage.setItem('resonance_onboarding_done', 'true')
    navigate('/dashboard')
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

        {/* Step 2: Invite Code */}
        {step === 2 && (
          <div className="glass rounded-xl p-8 space-y-6">
            <div className="text-center space-y-2">
              <Gift className="h-8 w-8 text-primary mx-auto" />
              <h2 className="text-xl font-semibold">{t('onboarding.inviteTitle')}</h2>
              <p className="text-sm text-muted-foreground">
                {t('onboarding.inviteDescription')}
              </p>
            </div>

            {!redeemSuccess ? (
              <div className="space-y-3">
                <Input
                  placeholder={t('credits.placeholder')}
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRedeemCode()}
                  className="h-12 bg-card border-border text-center text-lg tracking-wider uppercase"
                />
                {redeemError && (
                  <p className="text-sm text-destructive-foreground text-center">{redeemError}</p>
                )}
                <Button
                  className="w-full h-12"
                  onClick={handleRedeemCode}
                  disabled={redeeming || !inviteCode.trim()}
                >
                  {redeeming ? t('credits.redeeming') : t('credits.redeemButton')}
                </Button>
              </div>
            ) : (
              <div className="text-center space-y-3">
                <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                  <Check className="h-6 w-6 text-green-400" />
                </div>
                <p className="text-lg font-medium">
                  {t('credits.added', { count: redeemSuccess.credits })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('onboarding.successDescription')}
                </p>
              </div>
            )}

            <Button
              variant={redeemSuccess ? 'default' : 'ghost'}
              className="w-full h-12"
              onClick={handleFinish}
            >
              {redeemSuccess ? t('onboarding.goToDecks') : t('onboarding.skipForNow')}
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
