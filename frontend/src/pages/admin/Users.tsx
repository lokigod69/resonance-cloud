import { Users as UsersIcon } from 'lucide-react'

export default function Users() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <UsersIcon className="h-12 w-12 text-muted-foreground/50 mb-4" />
      <h1 className="text-2xl font-bold">User Management</h1>
      <p className="text-muted-foreground mt-2">
        Coming soon — this page will be built in Phase 2
      </p>
    </div>
  )
}
