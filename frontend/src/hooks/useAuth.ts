import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, type AuthProfile } from '@/lib/supabase'

const profileCacheKey = (userId: string) => `resonance_auth_profile_${userId}`

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
  }, [abortProfileFetch, clearProfileRetry])

  const fetchProfile = useCallback(async (userId: string, force = false) => {
    if (!force && profileFetchedRef.current && profileFetchedUserIdRef.current === userId) {
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
      const { data, error, status, statusText } = await supabase
        .from('profiles')
        .select('display_name, credits, base_language, role, seen_tutorials, avatar_path, avatar_updated_at')
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
      writeCachedProfile(userId, data as AuthProfile | null)
      profileFetchedRef.current = true
      profileFetchedUserIdRef.current = userId
      clearProfileRetry()
    } catch (err) {
      if (controller.signal.aborted) {
        console.warn('[useAuth] fetchProfile aborted for:', {
          userId,
          durationMs: Math.round(performance.now() - startedAt),
          reason: controller.signal.reason,
          error: err,
        })
        scheduleProfileRetry(userId)
        return
      }

      console.error('[useAuth] fetchProfile exception:', {
        userId,
        durationMs: Math.round(performance.now() - startedAt),
        error: err,
      })
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
        const cachedProfile = readCachedProfile(nextSession.user.id)
        if (profileFetchedUserIdRef.current !== nextSession.user.id) {
          profileFetchedRef.current = false
          profileFetchedUserIdRef.current = null
          setProfile(cachedProfile)
        }
        void fetchProfile(nextSession.user.id)
      } else {
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
    const { error } = await supabase.auth.signUp({ email, password })
    return { error: error?.message ?? null }
  }

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/dashboard' },
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
    authError,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
    refreshProfile,
  }
}
