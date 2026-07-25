/* eslint-disable */
// Auth stub: a signed-in learner with a stable profile. Kept identity-stable
// so the real useTranslation/useWordStates memoization behaves as in the app.

import { scenario } from './scenario'

let cached: any = null

function state() {
  if (cached) return cached
  const s = scenario()
  cached = {
    session: { user: { id: s.userId ?? 'u1' } },
    user: { id: s.userId ?? 'u1', email: 'fixture@lingwave.test' },
    profile: {
      id: s.userId ?? 'u1',
      display_name: 'Fixture Learner',
      base_language: s.baseLanguage ?? 'English',
      new_words_per_day: 20,
      credits: 12,
      avatar_path: null,
      avatar_updated_at: null,
    },
    loading: false,
    profileLoading: false,
    profileReady: true,
    profileLoadError: false,
    authError: null,
    signInWithEmail: async () => ({ error: null }),
    signUpWithEmail: async () => ({ error: null }),
    signInWithGoogle: async () => ({ error: null }),
    signOut: async () => {},
    refreshProfile: async () => {},
  }
  return cached
}

export const AuthContext: any = { Provider: ({ children }: any) => children }

export function useAuth(): any {
  return state()
}

export function useAuthState(): any {
  return state()
}
