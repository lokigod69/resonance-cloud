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
import { Music, ChevronRight, Gift, Check } from 'lucide-react'
import { BASE_LANGUAGES, getDisplayLabel } from '@/lib/languages'

export default function Onboarding() {
  const { user, refreshProfile } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState<1 | 2>(1)
  const [selectedLanguage, setSelectedLanguage] = useState('')
  const [saving, setSaving] = useState(false)

  const [inviteCode, setInviteCode] = useState('')
  const [redeemError, setRedeemError] = useState<string | null>(null)
  const [redeemSuccess, setRedeemSuccess] = useState<{ credits: number } | null>(null)
  const [redeeming, setRedeeming] = useState(false)

  async function handleLanguageContinue() {
    if (!selectedLanguage || !user) return
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ base_language: selectedLanguage })
      .eq('id', user.id)
    if (error) {
      console.error('Failed to set base language:', error)
    }
    await refreshProfile()
    setSaving(false)
    setStep(2)
  }

  async function handleRedeemCode() {
    if (!inviteCode.trim() || !user) return
    setRedeeming(true)
    setRedeemError(null)

    const code = inviteCode.trim().toUpperCase()

    try {
      // Try the atomic RPC function first (available after migration)
      const { data, error: rpcError } = await supabase.rpc('redeem_invite_code', { code_text: code })
      if (!rpcError && data) {
        const result = data as { success: boolean; credits_awarded?: number; error?: string }
        if (!result.success) {
          setRedeemError(result.error || 'Failed to redeem code.')
        } else {
          setRedeemSuccess({ credits: result.credits_awarded || 0 })
          setInviteCode('')
          await refreshProfile()
        }
        setRedeeming(false)
        return
      }
    } catch {
      // RPC not available — fall through to legacy flow
    }

    // Legacy fallback (pre-migration: old invite_codes schema with redeemed_by)
    const { data: invite, error: lookupError } = await supabase
      .from('invite_codes')
      .select('id, code, credits, redeemed_by')
      .eq('code', code)
      .maybeSingle()

    if (lookupError) {
      setRedeemError('Error looking up code. Please try again.')
      setRedeeming(false)
      return
    }

    if (!invite) {
      setRedeemError('Invalid invite code.')
      setRedeeming(false)
      return
    }

    if (invite.redeemed_by) {
      setRedeemError('This code has already been redeemed.')
      setRedeeming(false)
      return
    }

    const { error: updateError } = await supabase
      .from('invite_codes')
      .update({ redeemed_by: user.id, redeemed_at: new Date().toISOString() })
      .eq('id', invite.id)
      .is('redeemed_by', null)

    if (updateError) {
      setRedeemError('Failed to redeem code. Please try again.')
      setRedeeming(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', user.id)
      .single()

    await supabase
      .from('profiles')
      .update({ credits: (profile?.credits || 0) + invite.credits })
      .eq('id', user.id)

    setRedeemSuccess({ credits: invite.credits })
    setInviteCode('')
    await refreshProfile()
    setRedeeming(false)
  }

  function handleFinish() {
    localStorage.setItem('resonance_onboarding_done', 'true')
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center space-y-2">
          <Music className="h-10 w-10 text-primary mx-auto" />
          <h1 className="text-2xl font-bold">Welcome to Resonance</h1>
          <p className="text-muted-foreground text-sm">Let's get you set up</p>
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
              <h2 className="text-xl font-semibold">What language do you speak?</h2>
              <p className="text-sm text-muted-foreground">
                This helps us create better translations for you
              </p>
            </div>

            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger className="h-12 bg-white/5 border-white/10">
                <SelectValue placeholder="Select your language" />
              </SelectTrigger>
              <SelectContent>
                {BASE_LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {getDisplayLabel(lang)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              className="w-full h-12"
              onClick={handleLanguageContinue}
              disabled={!selectedLanguage || saving}
            >
              {saving ? 'Saving...' : 'Continue'}
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}

        {/* Step 2: Invite Code */}
        {step === 2 && (
          <div className="glass rounded-xl p-8 space-y-6">
            <div className="text-center space-y-2">
              <Gift className="h-8 w-8 text-primary mx-auto" />
              <h2 className="text-xl font-semibold">Enter your invite code</h2>
              <p className="text-sm text-muted-foreground">
                Redeem a code to get credits for generating videos
              </p>
            </div>

            {!redeemSuccess ? (
              <div className="space-y-3">
                <Input
                  placeholder="e.g. RESONANZ-TEST-001"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRedeemCode()}
                  className="h-12 bg-white/5 border-white/10 text-center text-lg tracking-wider uppercase"
                />
                {redeemError && (
                  <p className="text-sm text-destructive-foreground text-center">{redeemError}</p>
                )}
                <Button
                  className="w-full h-12"
                  onClick={handleRedeemCode}
                  disabled={redeeming || !inviteCode.trim()}
                >
                  {redeeming ? 'Redeeming...' : 'Redeem Code'}
                </Button>
              </div>
            ) : (
              <div className="text-center space-y-3">
                <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                  <Check className="h-6 w-6 text-green-400" />
                </div>
                <p className="text-lg font-medium">
                  +{redeemSuccess.credits} credits added!
                </p>
                <p className="text-sm text-muted-foreground">
                  You're all set to start creating
                </p>
              </div>
            )}

            <Button
              variant={redeemSuccess ? 'default' : 'ghost'}
              className="w-full h-12"
              onClick={handleFinish}
            >
              {redeemSuccess ? 'Go to Decks' : 'Skip for now'}
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
