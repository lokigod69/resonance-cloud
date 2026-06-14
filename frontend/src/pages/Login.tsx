import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useLandingLocale } from '@/hooks/useLandingLocale'
import { LingwaveBrand } from '@/components/branding/LingwaveBrand'
import { LingwaveWaves } from '@/components/branding/LingwaveWaves'
import { handleLegalLinkClick } from '@/lib/legalLinks'

export default function Login() {
  const { t } = useLandingLocale()
  const [searchParams] = useSearchParams()
  const [isSignUp, setIsSignUp] = useState(searchParams.get('mode') === 'signup')
  const [isResetRequest, setIsResetRequest] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const { signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth()
  const navigate = useNavigate()

  // Sync with URL param when it changes
  useEffect(() => {
    if (searchParams.get('mode') === 'signup') {
      setIsSignUp(true)
      setIsResetRequest(false)
    }
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    try {
      if (isResetRequest) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        })
        if (error) {
          setError(t('auth.resetRequestFailed'))
          return
        }
        setMessage(t('auth.resetRequestSent'))
      } else if (isSignUp) {
        const { error } = await signUpWithEmail(email, password)
        if (error) {
          setError(error)
          return
        }
        setMessage(t('auth.confirmEmail'))
        setIsSignUp(false)
      } else {
        const { error } = await signInWithEmail(email, password)
        if (error) {
          setError(error)
          return
        }
        navigate('/dashboard')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleLogin() {
    setError(null)
    const { error } = await signInWithGoogle()
    if (error) setError(error)
  }

  function showSignInMode() {
    setIsSignUp(false)
    setIsResetRequest(false)
    setError(null)
    setMessage(null)
  }

  function showSignUpMode() {
    setIsSignUp(true)
    setIsResetRequest(false)
    setError(null)
    setMessage(null)
  }

  function showResetRequestMode() {
    setIsResetRequest(true)
    setError(null)
    setMessage(null)
  }

  return (
    <div className="theme-cosmos relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[var(--app-bg)] p-4">
      <LingwaveWaves />

      {/* Logo */}
      <Link to="/" className="relative z-10 flex items-center gap-2 mb-8" aria-label="Lingwave home">
        <LingwaveBrand markClassName="h-8" wordmarkClassName="h-7" />
      </Link>

      <Card className="relative z-10 w-full max-w-md glass border-border">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            {isSignUp ? (
              t('auth.createAccountTitle')
            ) : isResetRequest ? (
              t('auth.resetRequestTitle')
            ) : (
              <>
                {t('auth.welcomeBackLead')} <span className="text-[var(--accent)]">{t('auth.welcomeBackAccent')}</span>
              </>
            )}
          </CardTitle>
          <CardDescription>
            {isSignUp
              ? t('auth.signupDescription')
              : isResetRequest
                ? t('auth.resetRequestDescription')
                : t('auth.signinDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSignUp && !isResetRequest && (
            <p className="mb-4 text-center text-xs leading-relaxed text-muted-foreground">
              {t('auth.signupConsentPrefix')}{' '}
              <a
                href="/terms"
                onClick={(event) => handleLegalLinkClick(event, '/terms')}
                className="text-foreground underline underline-offset-4 hover:text-primary"
              >
                {t('legal.terms')}
              </a>{' '}
              {t('auth.signupConsentJoiner')}{' '}
              <a
                href="/privacy"
                onClick={(event) => handleLegalLinkClick(event, '/privacy')}
                className="text-foreground underline underline-offset-4 hover:text-primary"
              >
                {t('legal.privacyPolicy')}
              </a>
              {t('auth.signupConsentSuffix')}
            </p>
          )}

          {!isResetRequest && (
            <>
              {/* Google OAuth first - primary action */}
              <Button
                variant="glass-vermillion"
                className="w-full mb-4"
                onClick={handleGoogleLogin}
                disabled={loading}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                <span>{t('auth.continueWithGoogle')}</span>
              </Button>

              <div className="relative my-6">
                <Separator />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">
                  {t('auth.or')}
                </span>
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('auth.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            {!isResetRequest && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="password">{t('auth.password')}</Label>
                  {!isSignUp && (
                    <button
                      type="button"
                      onClick={showResetRequestMode}
                      className="text-xs text-foreground underline underline-offset-4 hover:text-primary"
                    >
                      {t('auth.forgotPassword')}
                    </button>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder={t('auth.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive-foreground">{error}</p>
            )}
            {message && (
              <p className="text-sm text-muted-foreground">{message}</p>
            )}

            <Button type="submit" variant="glass-vermillion" className="w-full" disabled={loading}>
              {loading
                ? t('auth.pleaseWait')
                : isResetRequest
                  ? t('auth.sendResetLink')
                  : isSignUp
                    ? t('auth.createAccount')
                    : t('auth.signIn')}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            {isResetRequest ? (
              <button
                type="button"
                onClick={showSignInMode}
                className="text-foreground underline underline-offset-4 hover:text-primary"
              >
                {t('auth.backToSignIn')}
              </button>
            ) : isSignUp ? (
              <>
                {t('auth.alreadyHaveAccount')}{' '}
                <button
                  type="button"
                  onClick={showSignInMode}
                  className="text-foreground underline underline-offset-4 hover:text-primary"
                >
                  {t('auth.signIn')}
                </button>
              </>
            ) : (
              <>
                {t('auth.dontHaveAccount')}{' '}
                <button
                  type="button"
                  onClick={showSignUpMode}
                  className="text-foreground underline underline-offset-4 hover:text-primary"
                >
                  {t('auth.signUp')}
                </button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
