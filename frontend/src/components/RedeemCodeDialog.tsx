import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Coins, Check, Gift, CreditCard } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { isBillingTester } from '@/lib/billingFlags'
import { publicApiUrl } from '@/lib/publicOrigins'

export function RedeemCodeDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { user, profile, profileLoading, refreshProfile } = useAuth()
  const { t } = useTranslation()

  const [inviteCode, setInviteCode] = useState('')
  const [redeeming, setRedeeming] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [redeemError, setRedeemError] = useState<string | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [redeemSuccess, setRedeemSuccess] = useState<{ credits: number } | null>(null)
  const creditCount = typeof profile?.credits === 'number' ? profile.credits : profileLoading ? '...' : 0
  const billingAvailable = isBillingTester(user, profile)

  async function handleRedeem() {
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
        setRedeemError(result.error || t('credits.errorFailed'))
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

  async function handleSubscribe() {
    if (!user) return
    setCheckoutLoading(true)
    setCheckoutError(null)

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) {
        setCheckoutError('Please sign in again before starting checkout.')
        return
      }

      const response = await fetch(publicApiUrl('/api/create-checkout-session'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })
      const payload = await response.json().catch(() => null) as { url?: string; error?: string } | null

      if (!response.ok || !payload?.url) {
        setCheckoutError(payload?.error || 'Checkout is not available right now.')
        return
      }

      window.location.href = payload.url
    } catch (error) {
      console.error('Stripe checkout failed:', error)
      setCheckoutError('Checkout is not available right now.')
    } finally {
      setCheckoutLoading(false)
    }
  }

  function handleClose(open: boolean) {
    if (!open) {
      // Reset state when closing
      setInviteCode('')
      setRedeemError(null)
      setCheckoutError(null)
      setRedeemSuccess(null)
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="theme-dialog sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center gap-2 text-2xl sm:text-3xl">
            <Coins className="h-6 w-6 text-primary" />
            {t('credits.heading')}
          </DialogTitle>
        </DialogHeader>

        <div className="text-center py-4">
          <div className="text-xl font-semibold text-foreground">
            {creditCount} {t('credits.available')}
          </div>
        </div>

        {/* Subscription sandbox - only shown to billing testers */}
        {billingAvailable && (
          <div className="space-y-3 border-t border-border pt-4">
            <div className="flex items-center justify-center gap-2 text-sm font-medium">
              <CreditCard className="h-4 w-4" />
              Subscription
            </div>
            <div className="space-y-2">
              <Button
                className="w-full"
                onClick={handleSubscribe}
                disabled={checkoutLoading}
              >
                {checkoutLoading ? 'Opening checkout...' : 'Subscribe with Stripe Sandbox'}
              </Button>
              {checkoutError && (
                <p className="text-sm text-destructive text-center">{checkoutError}</p>
              )}
            </div>
          </div>
        )}

        {/* Redeem section */}
        <div className="space-y-3 border-t border-border pt-4">
          <div className="flex items-center justify-center gap-2 text-sm font-medium">
            <Gift className="h-4 w-4" />
            {t('credits.redeemHeading')}
          </div>

          {!redeemSuccess ? (
            <div className="space-y-2">
              <Input
                placeholder={t('credits.placeholder')}
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRedeem()}
                className="theme-input text-center tracking-wider uppercase"
              />
              {redeemError && (
                <p className="text-sm text-destructive text-center">{redeemError}</p>
              )}
              <Button
                className="w-full"
                onClick={handleRedeem}
                disabled={redeeming || !inviteCode.trim()}
              >
                {redeeming ? t('credits.redeeming') : t('credits.redeemButton')}
              </Button>
            </div>
          ) : (
            <div className="text-center space-y-2 py-2">
              <div className="h-10 w-10 rounded-full bg-[var(--accent-soft)] flex items-center justify-center mx-auto">
                <Check className="h-5 w-5 text-[var(--accent-2)]" />
              </div>
              <p className="text-sm font-medium">
                {t('credits.added', { count: redeemSuccess.credits })}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
