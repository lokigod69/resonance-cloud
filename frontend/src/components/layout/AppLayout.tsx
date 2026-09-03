import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { LingwaveLoader } from '@/components/ui/LingwaveLoader'
import { OutletErrorBoundary } from '@/components/RouteErrorBoundary'
import { AppHeader } from './AppHeader'

export function AppLayout() {
  return (
    <div className="app-shell min-h-screen flex flex-col">
      <AppHeader />
      <main className="flex-1 px-6 pt-[var(--classic-content-top-offset)] pb-[var(--classic-main-bottom-padding)]">
        <Suspense fallback={<LingwaveLoader className="min-h-[calc(100dvh-8rem)]" />}>
          <OutletErrorBoundary>
            <Outlet />
          </OutletErrorBoundary>
        </Suspense>
      </main>
    </div>
  )
}
