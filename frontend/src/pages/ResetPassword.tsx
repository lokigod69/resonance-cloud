import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/Toast'
import { useLandingLocale } from '@/hooks/useLandingLocale'
import { LingwaveBrand } from '@/components/branding/LingwaveBrand'

export default function ResetPassword() {
  const { t } = useLandingLocale()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [checkingRecovery, setCheckingRecovery] = useState(true)
  const [hasRecoverySession, setHasRecoverySession] = useState(false)

  useEffect(() => {
    let active = true

    // An ordinary authenticated session must never authorize a password reset.
    // Only Supabase's explicit recovery event grants this page access.
    void supabase.auth.getSession().then(() => {
      if (!active) return
      setCheckingRecovery(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return
      if (event === 'PASSWORD_RECOVERY') {
        setHasRecoverySession(Boolean(session))
        setCheckingRecovery(false)
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (checkingRecovery || !hasRecoverySession) {
      setError(t('auth.resetPasswordInvalid'))
      return
    }
    if (password.length < 6) {
      setError(t('auth.passwordTooShort'))
      return
    }
    if (password !== confirmPassword) {
      setError(t('auth.passwordsDoNotMatch'))
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        setError(t('auth.resetPasswordFailed'))
        return
      }

      toast(t('auth.resetPasswordSuccess'), 'success')
      navigate('/dashboard', { replace: true })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="theme-cosmos min-h-screen flex flex-col items-center justify-center bg-[var(--app-bg)] p-4"
      style={{
        backgroundImage: "url('/brand/cosmos/cosmos-auth.webp')",
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }}
    >
      <Link to="/" className="flex items-center gap-2 mb-8" aria-label="Lingwave home">
        <LingwaveBrand markClassName="h-8" wordmarkClassName="h-7" />
      </Link>

      <Card className="w-full max-w-md glass border-border">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            {t('auth.resetPasswordTitle')}
          </CardTitle>
          <CardDescription>
            {checkingRecovery ? t('auth.resetPasswordChecking') : t('auth.resetPasswordDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">{t('auth.newPassword')}</Label>
              <Input
                id="new-password"
                type="password"
                placeholder={t('auth.newPasswordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">{t('auth.confirmNewPassword')}</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder={t('auth.confirmNewPasswordPlaceholder')}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            {(error || (!checkingRecovery && !hasRecoverySession)) && (
              <p className="text-sm text-destructive-foreground">
                {error || t('auth.resetPasswordInvalid')}
              </p>
            )}

            <Button type="submit" variant="glass-vermillion" className="w-full" disabled={loading || checkingRecovery || !hasRecoverySession}>
              {loading ? t('auth.pleaseWait') : t('auth.updatePassword')}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            <Link to="/login" className="text-foreground underline underline-offset-4 hover:text-primary">
              {t('auth.backToSignIn')}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
