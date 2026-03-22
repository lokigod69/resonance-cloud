export interface StageProps {
  slug: string
  detail: import('../../api').WordDetail
  onSelect: (v: string) => void
  onRefresh: () => void
}

export function EmptyStage({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-32 text-[var(--text-muted)] text-sm text-center px-4">
      {message}
    </div>
  )
}
