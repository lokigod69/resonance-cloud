import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Coins, Sparkles, Music } from 'lucide-react'

export default function Dashboard() {
  const { profile, refreshProfile } = useAuth()
  const [inviteCode, setInviteCode] = useState('')
  const [redeemError, setRedeemError] = useState<string | null>(null)
  const [redeemSuccess, setRedeemSuccess] = useState<string | null>(null)
  const [redeeming, setRedeeming] = useState(false)

  async function handleRedeem() {
    if (!inviteCode.trim() || !profile) return

    setRedeeming(true)
    setRedeemError(null)
    setRedeemSuccess(null)

    const code = inviteCode.trim().toUpperCase()

    // Look up the code — must exist and not be redeemed
    const { data: invite, error: lookupError } = await supabase
      .from('invite_codes')
      .select('id, code, credits, redeemed_by')
      .eq('code', code)
      .maybeSingle()

    if (lookupError) {
      console.error('Invite lookup error:', lookupError)
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

    // Mark code as redeemed
    const { error: updateError } = await supabase
      .from('invite_codes')
      .update({ redeemed_by: profile.id, redeemed_at: new Date().toISOString() })
      .eq('id', invite.id)
      .eq('redeemed_by', null)

    if (updateError) {
      console.error('Invite update error:', updateError)
      setRedeemError('Failed to redeem code. Please try again.')
      setRedeeming(false)
      return
    }

    // Add credits to profile
    const { error: creditError } = await supabase
      .from('profiles')
      .update({ credits: (profile.credits || 0) + invite.credits })
      .eq('id', profile.id)

    if (creditError) {
      console.error('Credit update error:', creditError)
      setRedeemError('Code redeemed but failed to add credits. Contact admin.')
      setRedeeming(false)
      return
    }

    setRedeemSuccess(`+${invite.credits} credits added!`)
    setInviteCode('')
    await refreshProfile()
    setRedeeming(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {profile?.display_name || 'Learner'}
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s your learning overview.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credit Balance</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{profile?.credits ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Each word generation costs 1 credit
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Redeem Invite Code</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. RESONANZ-TEST-001"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRedeem()}
              />
              <Button onClick={handleRedeem} disabled={redeeming || !inviteCode.trim()}>
                Redeem
              </Button>
            </div>
            {redeemError && (
              <p className="text-sm text-destructive-foreground mt-2">{redeemError}</p>
            )}
            {redeemSuccess && (
              <p className="text-sm text-green-600 dark:text-green-400 mt-2">{redeemSuccess}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Your Decks
          </CardTitle>
          <CardDescription>
            Vocabulary decks with personalized music videos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Sparkles className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">No decks yet</h3>
            <p className="text-muted-foreground mt-1 mb-4">
              Create your first deck to start learning!
            </p>
            <Button asChild>
              <Link to="/generate">Create a Deck</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
