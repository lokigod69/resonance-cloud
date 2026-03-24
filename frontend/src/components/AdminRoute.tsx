import { useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Lock } from 'lucide-react'

export default function AdminRoute() {
  const { profile, loading } = useAuth()
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem('admin_unlocked') === 'true')
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="glass rounded-xl px-8 py-4 flex items-center gap-3">
          <svg className="h-4 w-4 animate-spin text-muted-foreground" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!profile || profile.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  if (unlocked) {
    return <Outlet />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setChecking(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('system_settings')
      .select('admin_pin')
      .eq('id', 1)
      .single()

    if (fetchError || !data) {
      setError('Could not verify PIN')
      setChecking(false)
      return
    }

    if (pin === data.admin_pin) {
      sessionStorage.setItem('admin_unlocked', 'true')
      setUnlocked(true)
    } else {
      setError('Incorrect PIN')
      setPin('')
    }
    setChecking(false)
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-sm p-6 space-y-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <Lock className="h-8 w-8 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Admin Access</h2>
          <p className="text-sm text-muted-foreground">Enter admin PIN to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            type="password"
            inputMode="numeric"
            maxLength={8}
            placeholder="PIN"
            value={pin}
            onChange={e => setPin(e.target.value)}
            className="text-center text-lg tracking-widest"
            autoFocus
          />
          {error && (
            <p className="text-sm text-red-400 text-center">{error}</p>
          )}
          <Button type="submit" className="w-full" disabled={!pin || checking}>
            {checking ? 'Verifying...' : 'Unlock'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
