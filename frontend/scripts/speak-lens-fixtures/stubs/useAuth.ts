import { scenario } from './scenario'
import { useMemo } from 'react'

export function useAuth() {
  const current = scenario()
  const user = useMemo(() => ({ id: 'fixture-user', email: 'fixture@example.test' }), [])
  const profile = useMemo(() => ({ id: 'fixture-user', base_language: current.baseLanguage, role: 'user', credits: 24, plan_credits: 0, avatar_path: null, avatar_updated_at: null }), [current.baseLanguage])
  return {
    user,
    session: { access_token: 'fixture-token' },
    profile,
    loading: false,
    profileLoading: false,
    profileReady: true,
  }
}
