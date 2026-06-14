import { useCallback, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { publicApiUrl } from '@/lib/publicOrigins'

type DeleteAccountErrorResponse = {
  error?: string
  detail?: string
}

export function useDeleteAccount() {
  const { signOut } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deleteAccount = useCallback(async (): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) throw new Error('Your session expired. Please sign in again.')

      const res = await fetch(publicApiUrl('/api/delete-account'), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const body = await res.json().catch(() => ({})) as DeleteAccountErrorResponse
      if (!res.ok) throw new Error(body.error || body.detail || 'Account deletion failed')

      await signOut()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Account deletion failed'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [signOut])

  return { deleteAccount, loading, error }
}
