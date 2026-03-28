import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Coins, Check, Gift } from 'lucide-react'

export function RedeemCodeDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { user, profile, refreshProfile } = useAuth()

  const [inviteCode, setInviteCode] = useState('')
  const [redeeming, setRedeeming] = useState(false)
  const [redeemError, setRedeemError] = useState<string | null>(null)
  const [redeemSuccess, setRedeemSuccess] = useState<{ credits: number } | null>(null)

  async function handleRedeem() {
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

    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', user.id)
      .single()

    await supabase
      .from('profiles')
      .update({ credits: (currentProfile?.credits || 0) + invite.credits })
      .eq('id', user.id)

    setRedeemSuccess({ credits: invite.credits })
    setInviteCode('')
    await refreshProfile()
    setRedeeming(false)
  }

  function handleClose(open: boolean) {
    if (!open) {
      // Reset state when closing
      setInviteCode('')
      setRedeemError(null)
      setRedeemSuccess(null)
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            Credits
          </DialogTitle>
          <DialogDescription>
            Your credit balance and code redemption
          </DialogDescription>
        </DialogHeader>

        {/* Balance */}
        <div className="flex items-center justify-center py-4">
          <div className="text-center">
            <div className="text-4xl font-bold">{profile?.credits ?? 0}</div>
            <div className="text-sm text-muted-foreground mt-1">credits available</div>
          </div>
        </div>

        {/* Redeem section */}
        <div className="space-y-3 border-t border-border pt-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Gift className="h-4 w-4" />
            Redeem an invite code
          </div>

          {!redeemSuccess ? (
            <div className="space-y-2">
              <Input
                placeholder="e.g. RESONANZ-TEST-001"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRedeem()}
                className="text-center tracking-wider uppercase"
              />
              {redeemError && (
                <p className="text-sm text-destructive text-center">{redeemError}</p>
              )}
              <Button
                className="w-full"
                onClick={handleRedeem}
                disabled={redeeming || !inviteCode.trim()}
              >
                {redeeming ? 'Redeeming...' : 'Redeem Code'}
              </Button>
            </div>
          ) : (
            <div className="text-center space-y-2 py-2">
              <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                <Check className="h-5 w-5 text-green-400" />
              </div>
              <p className="text-sm font-medium">
                +{redeemSuccess.credits} credits added!
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
