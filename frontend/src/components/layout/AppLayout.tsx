import { Outlet } from 'react-router-dom'
import { AppHeader } from './AppHeader'

export function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader />
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  )
}
