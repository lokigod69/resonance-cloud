import { useEffect, useRef, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { OrbSpinner } from '@/components/ui/OrbSpinner'

export default function AdminRoute() {
  const { session, loading: authLoading } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const checkedUserIdRef = useRef<string | null>(null)
  const sessionUserId = session?.user.id ?? null

  useEffect(() => {
    let active = true

    if (authLoading) {
      return () => {
        active = false
      }
    }

    if (!sessionUserId) {
      checkedUserIdRef.current = null
      setIsAdmin(false)
      setCheckingAdmin(false)
      return () => {
        active = false
      }
    }

    if (checkedUserIdRef.current === sessionUserId) {
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

        checkedUserIdRef.current = sessionUserId
        setIsAdmin(data === true)
      } catch (error) {
        if (active) {
          console.error('Admin check failed:', error)
          checkedUserIdRef.current = null
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
  }, [authLoading, sessionUserId])

  if (authLoading || checkingAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <OrbSpinner size={120} ariaLabel="Loading admin" />
      </div>
    )
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
