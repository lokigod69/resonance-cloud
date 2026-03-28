import { Music } from 'lucide-react'

interface VersionBadgeProps {
  version: 'a' | 'b'
  hasAlt: boolean
  onToggle: () => void
  className?: string
}

export default function VersionBadge({ version, hasAlt, onToggle, className = '' }: VersionBadgeProps) {
  if (!hasAlt) return null

  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      className={`flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 border border-white/20 text-white text-xs font-medium backdrop-blur-sm hover:bg-black/80 transition-colors z-20 ${className}`}
      title={`Version ${version.toUpperCase()} — click to switch`}
    >
      <Music className="h-3 w-3" />
      <span>{version.toUpperCase()}</span>
    </button>
  )
}
