import { useMemo } from 'react'
import { scenario } from './scenario'

export function useAuth() {
  const current = scenario()
  const user = useMemo(() => ({ id: 'today-fixture-user', email: 'fixture@example.test' }), [])
  const profile = useMemo(() => ({
    id: 'today-fixture-user',
    base_language: current.baseLanguage ?? 'German',
    credits: 24,
    avatar_path: null,
    avatar_updated_at: null,
  }), [current.baseLanguage])
  return { user, session: { access_token: 'fixture-token' }, profile, loading: false, profileLoading: false, profileReady: true }
}
