import { RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

type CheckpointCardProps = {
  href: string
  completedPathCount: number
  className?: string
}

export function CheckpointCard({ href, completedPathCount, className }: CheckpointCardProps) {
  const pathLabel = completedPathCount === 1 ? 'completed path' : 'completed paths'

  return (
    <Link
      to={href}
      className={cn(
        'today-checkpoint-card group relative flex min-h-32 min-w-0 flex-col overflow-hidden rounded-lg border p-3 pt-4 text-left transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8]',
        'border-[color-mix(in_srgb,#38bdf8_58%,var(--border-subtle))] bg-[color-mix(in_srgb,#0ea5e9_12%,var(--surface-1))]',
        className,
      )}
      aria-label="Start Quick Review"
    >
      <span className="absolute inset-x-0 top-0 h-1 bg-[#38bdf8]" aria-hidden="true" />
      <div className="flex h-full items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[color-mix(in_srgb,#38bdf8_56%,transparent)] bg-[color-mix(in_srgb,#38bdf8_14%,transparent)] text-[#38bdf8]">
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-h-5 items-center justify-end">
            <span className="rounded-full bg-[color-mix(in_srgb,#38bdf8_18%,transparent)] px-2 py-0.5 text-[0.7rem] font-semibold uppercase leading-5 tracking-[0.08em] text-[#38bdf8]">
              Start
            </span>
          </div>
          <h3 className="mt-1 break-words text-base font-semibold leading-snug text-[var(--text-primary)]">
            Quick Review
          </h3>
          <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
            8 items from your {pathLabel}
          </p>
        </div>
      </div>
    </Link>
  )
}
