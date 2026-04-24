import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { ParticleSpinner } from '@/components/ui/ParticleSpinner'

export default function AdminRoute() {
  const { session, loading: authLoading } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingAdmin, setCheckingAdmin] = useState(true)

  useEffect(() => {
    let active = true

    if (authLoading) {
      return () => {
        active = false
      }
    }

    if (!session) {
      setIsAdmin(false)
      setCheckingAdmin(false)
      return () => {
        active = false
      }
    }

    setCheckingAdmin(true)

    const checkAdmin = async () => {
      try {
        const { data, error } = await supabase.rpc('is_admin')

        if (!active) return

        if (error) {
          console.error('Admin check failed:', error)
          setIsAdmin(false)
          return
        }

        setIsAdmin(data === true)
      } catch (error) {
        if (active) {
          console.error('Admin check failed:', error)
          setIsAdmin(false)
        }
      } finally {
        if (active) {
          setCheckingAdmin(false)
        }
      }
    }

    void checkAdmin()

    return () => {
      active = false
    }
  }, [authLoading, session])

  if (authLoading || checkingAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <ParticleSpinner preset="rose" size={120} />
      </div>
    )
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
