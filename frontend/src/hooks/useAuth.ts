import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { Browser } from '@capacitor/browser'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, type AuthProfile } from '@/lib/supabase'
import { getOAuthRedirectTo } from '@/lib/publicOrigins'
import { isNativeApp } from '@/lib/platform'
import { analytics, deterministicUuid } from '@/lib/analytics'

const profileCacheKey = (userId: string) => `resonance_auth_profile_${userId}`

// Portfolio 'signup' — once per page load; the deterministic uuid dedupes
// same-day repeats server-side. Password signups emit at the signUp() success
// seam (works even when email confirmation delays the first session); OAuth
// signups emit on the first session, detected by last_sign_in_at landing
// within minutes of created_at (an OAuth first round-trip is immediate).
let signupEmittedThisLoad = false

function maybeTrackOAuthSignup(user: User) {
  if (signupEmittedThisLoad || !analytics.enabled) return
  if (user.app_metadata?.provider !== 'google') return
  const createdAt = Date.parse(user.created_at ?? '')
  const lastSignIn = Date.parse(user.last_sign_in_at ?? '')
  if (!Number.isFinite(createdAt) || !Number.isFinite(lastSignIn)) return
  if (Math.abs(lastSignIn - createdAt) > 5 * 60_000) return
  signupEmittedThisLoad = true
  analytics.track('signup', { method: 'google' }, { uuid: deterministicUuid(`signup:${user.id}`) })
}

function readCachedProfile(userId: string): AuthProfile | null {
  try {
    const raw = localStorage.getItem(profileCacheKey(userId))
    if (!raw) return null
    return JSON.parse(raw) as AuthProfile
  } catch {
    return null
  }
}

function writeCachedProfile(userId: string, profile: AuthProfile | null) {
  try {
    if (!profile) {
      localStorage.removeItem(profileCacheKey(userId))
      return
    }
    localStorage.setItem(profileCacheKey(userId), JSON.stringify(profile))
  } catch {
    return
  }
}

export type AuthState = {
  session: Session | null
  user: User | null
  profile: AuthProfile | null
  loading: boolean
  profileLoading: boolean
  profileReady: boolean
  profileLoadError: boolean
  authError: string | null
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>
  signUpWithEmail: (email: string, password: string) => Promise<{ error: string | null }>
  signInWithGoogle: () => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function useAuthState(): AuthState {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<AuthProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileReady, setProfileReady] = useState(false)
  const [profileLoadError, setProfileLoadError] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const profileFetchedRef = useRef(false)
  const profileAbortControllerRef = useRef<AbortController | null>(null)
  const profileRequestUserIdRef = useRef<string | null>(null)
  const profileFetchedUserIdRef = useRef<string | null>(null)
  const profileRetryTimeoutRef = useRef<number | null>(null)
  const profileRetryAttemptRef = useRef(0)
  const fetchProfileRef = useRef<((userId: string, force?: boolean) => Promise<void>) | null>(null)

  const clearProfileRetry = useCallback(() => {
    if (profileRetryTimeoutRef.current !== null) {
      window.clearTimeout(profileRetryTimeoutRef.current)
      profileRetryTimeoutRef.current = null
    }
    profileRetryAttemptRef.current = 0
  }, [])

  const scheduleProfileRetry = useCallback((userId: string) => {
    if (profileRetryTimeoutRef.current !== null) {
      return
    }

    const nextDelay = profileRetryAttemptRef.current === 0
      ? 15000
      : profileRetryAttemptRef.current === 1
        ? 20000
        : 30000

    const attemptNumber = profileRetryAttemptRef.current + 1
    profileRetryTimeoutRef.current = window.setTimeout(() => {
      profileRetryTimeoutRef.current = null
      profileRetryAttemptRef.current = attemptNumber
      void fetchProfileRef.current?.(userId, true)
    }, nextDelay)

    console.warn('[useAuth] scheduling profile retry', { userId, attemptNumber, nextDelay })
  }, [])

  const abortProfileFetch = useCallback(() => {
    profileAbortControllerRef.current?.abort()
    profileAbortControllerRef.current = null
    profileRequestUserIdRef.current = null
  }, [])

  const resetProfileState = useCallback(() => {
    abortProfileFetch()
    clearProfileRetry()
    profileFetchedRef.current = false
    profileFetchedUserIdRef.current = null
    setProfile(null)
    setProfileLoading(false)
    setProfileReady(false)
    setProfileLoadError(false)
  }, [abortProfileFetch, clearProfileRetry])

  const fetchProfile = useCallback(async (userId: string, force = false) => {
    if (!force && profileFetchedRef.current && profileFetchedUserIdRef.current === userId) {
      setProfileReady(true)
      setProfileLoadError(false)
      return
    }

    if (!force && profileRequestUserIdRef.current === userId) {
      return
    }

    abortProfileFetch()

    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 10000)

    profileAbortControllerRef.current = controller
    profileRequestUserIdRef.current = userId
    setProfileLoading(true)
    const startedAt = performance.now()

    try {
      console.log('[useAuth] fetchProfile called for:', userId)
      // select('*') on purpose: the row is RLS-scoped to the user anyway, and an
      // explicit column list 400s the whole login whenever the client ships a
      // column the database doesn't have yet (or vice versa). target_language
      // in particular must be readable-if-present, absent-if-not.
      const { data, error, status, statusText } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .abortSignal(controller.signal)
        .single()

      if (error) {
        console.error('[useAuth] fetchProfile error:', {
          userId,
          durationMs: Math.round(performance.now() - startedAt),
          status,
          statusText,
          error,
        })
        setProfileReady(true)
        setProfileLoadError(true)
        scheduleProfileRetry(userId)
        return
      }

      console.log('[useAuth] fetchProfile result:', {
        userId,
        durationMs: Math.round(performance.now() - startedAt),
        status,
        statusText,
        credits: data?.credits,
        base_language: data?.base_language,
      })
      setProfile(data as AuthProfile | null)
      analytics.setOptOut(Boolean((data as AuthProfile | null)?.analytics_opt_out))
      writeCachedProfile(userId, data as AuthProfile | null)
      profileFetchedRef.current = true
      profileFetchedUserIdRef.current = userId
      setProfileReady(true)
      setProfileLoadError(false)
      clearProfileRetry()
    } catch (err) {
      if (controller.signal.aborted) {
        console.warn('[useAuth] fetchProfile aborted for:', {
          userId,
          durationMs: Math.round(performance.now() - startedAt),
          reason: controller.signal.reason,
          error: err,
        })
        if (profileAbortControllerRef.current === controller) {
          setProfileReady(true)
          setProfileLoadError(true)
          scheduleProfileRetry(userId)
        }
        return
      }

      console.error('[useAuth] fetchProfile exception:', {
        userId,
        durationMs: Math.round(performance.now() - startedAt),
        error: err,
      })
      setProfileReady(true)
      setProfileLoadError(true)
      scheduleProfileRetry(userId)
    } finally {
      const isCurrentRequest = profileAbortControllerRef.current === controller
      clearTimeout(timeout)
      if (isCurrentRequest) {
        profileAbortControllerRef.current = null
      }
      if (profileRequestUserIdRef.current === userId) {
        profileRequestUserIdRef.current = null
      }
      if (isCurrentRequest) {
        setProfileLoading(false)
      }
    }
  }, [abortProfileFetch, clearProfileRetry, scheduleProfileRetry])

  fetchProfileRef.current = fetchProfile

  const refreshProfile = useCallback(async () => {
    const { data: { session: currentSession } } = await supabase.auth.getSession()
    console.log('[useAuth] refreshProfile - session user:', currentSession?.user?.id ?? 'none')
    if (currentSession?.user) {
      profileFetchedRef.current = false
      profileFetchedUserIdRef.current = null
      await fetchProfile(currentSession.user.id, true)
    } else {
      resetProfileState()
    }
  }, [fetchProfile, resetProfileState])

  useEffect(() => {
    let active = true

    const applySession = (nextSession: Session | null) => {
      if (!active) {
        return
      }

      console.log('[useAuth] session state:', nextSession?.user?.id ?? 'no-session')
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      setLoading(false)
      setAuthError(null)

      if (nextSession?.user) {
        analytics.identify(nextSession.user.id)
        maybeTrackOAuthSignup(nextSession.user)
        const cachedProfile = readCachedProfile(nextSession.user.id)
        if (cachedProfile) {
          analytics.setOptOut(Boolean(cachedProfile.analytics_opt_out))
        }
        if (profileFetchedUserIdRef.current !== nextSession.user.id) {
          profileFetchedRef.current = false
          profileFetchedUserIdRef.current = null
          setProfileReady(false)
          setProfileLoadError(false)
          setProfile(cachedProfile)
        }
        void fetchProfile(nextSession.user.id)
      } else {
        analytics.reset()
        analytics.setOptOut(false)
        resetProfileState()
      }
    }

    void supabase.auth.getSession()
      .then(({ data: { session: initialSession } }) => {
        applySession(initialSession)
      })
      .catch((err) => {
        if (!active) {
          return
        }
        console.error('[useAuth] getSession failed:', err)
        setAuthError('Session timed out. Please try logging in again.')
        setLoading(false)
      })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        applySession(nextSession)
      }
    )

    return () => {
      active = false
      abortProfileFetch()
      clearProfileRetry()
      subscription.unsubscribe()
    }
  }, [abortProfileFetch, clearProfileRetry, fetchProfile, resetProfileState])

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  const signUpWithEmail = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (!error && data.user && !signupEmittedThisLoad) {
      // Emit under the new account's id even though the session may only
      // arrive after email confirmation; retries dedupe via the uuid.
      signupEmittedThisLoad = true
      analytics.identify(data.user.id)
      analytics.track('signup', { method: 'password' }, { uuid: deterministicUuid(`signup:${data.user.id}`) })
    }
    return { error: error?.message ?? null }
  }

  const signInWithGoogle = async () => {
    if (isNativeApp()) {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getOAuthRedirectTo(),
          skipBrowserRedirect: true,
        },
      })
      if (error) return { error: error.message }
      if (!data.url) return { error: 'Google sign-in did not return an authorization URL.' }
      try {
        await Browser.open({ url: data.url })
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Could not open Google sign-in.' }
      }
      return { error: null }
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: getOAuthRedirectTo() },
    })
    return { error: error?.message ?? null }
  }

  const signOut = async () => {
    resetProfileState()
    await supabase.auth.signOut()
    setSession(null)
    setUser(null)
    setAuthError(null)
    setLoading(false)
  }

  return {
    session,
    user,
    profile,
    loading,
    profileLoading,
    profileReady,
    profileLoadError,
    authError,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
    refreshProfile,
  }
}
