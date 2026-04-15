import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, type Profile } from '@/lib/supabase'

export type AuthState = {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
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
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)
  const profileFetchedRef = useRef(false)

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      console.log('[useAuth] fetchProfile called for:', userId)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      if (error) {
        console.error('[useAuth] fetchProfile error:', error)
        setAuthError('Failed to load profile')
      } else {
        setAuthError(null)
      }
      console.log('[useAuth] fetchProfile result:', { credits: data?.credits, base_language: data?.base_language, error })
      setProfile(data as Profile | null)
      profileFetchedRef.current = true
    } catch (err) {
      console.error('[useAuth] fetchProfile exception:', err)
      setAuthError('Failed to load profile')
      profileFetchedRef.current = true
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    const { data: { session: currentSession } } = await supabase.auth.getSession()
    console.log('[useAuth] refreshProfile - session user:', currentSession?.user?.id ?? 'none')
    if (currentSession?.user) {
      await fetchProfile(currentSession.user.id)
    }
  }, [fetchProfile])

  useEffect(() => {
    // Safety net: if onAuthStateChange never fires (e.g. network down), stop loading
    const timeout = setTimeout(() => {
      console.warn('[useAuth] Auth loading timeout — forcing loading=false')
      setAuthError('Session timed out. Please try logging in again.')
      setLoading(false)
    }, 5000)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        clearTimeout(timeout) // cancel safety net on first fire
        console.log('[useAuth] session state:', session?.user?.id ?? 'no-session')
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          const userId = session.user.id
          const fetchWithTimeout = () => Promise.race([
            fetchProfile(userId),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Profile fetch timed out')), 20000)
            ),
          ])
          try {
            await fetchWithTimeout()
          } catch {
            console.warn('[useAuth] Profile fetch failed, retrying once')
            try {
              await fetchWithTimeout()
            } catch {
              console.error('[useAuth] Profile fetch timed out or failed after retry')
              setAuthError('Profile took too long to load. Please refresh.')
            }
          }
        } else {
          setProfile(null)
        }
        setLoading(false)
      }
    )

    return () => {
      clearTimeout(timeout) // also clean up on unmount
      subscription.unsubscribe()
    }
  }, [fetchProfile])

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
    await supabase.auth.signOut()
    setProfile(null)
    profileFetchedRef.current = false
  }

  return {
    session,
    user,
    profile,
    loading,
    authError,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
    refreshProfile,
  }
}
