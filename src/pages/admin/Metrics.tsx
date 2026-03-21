import { BarChart3 } from 'lucide-react'

export default function Metrics() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <BarChart3 className="h-12 w-12 text-muted-foreground/50 mb-4" />
      <h1 className="text-2xl font-bold">Metrics</h1>
      <p className="text-muted-foreground mt-2">
        Coming soon — this page will be built in Phase 2
      </p>
    </div>
  )
}
