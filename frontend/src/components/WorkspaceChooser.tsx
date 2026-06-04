import { useState, useEffect } from 'react'
import { FolderOpen, Clock, ChevronRight, Globe, Loader } from 'lucide-react'
import { getRecentWorkspaces, switchWorkspace, openWorkspaceFolder, type RecentWorkspaceEntry } from '../api'
import { WorkspaceManager } from './WorkspaceManager'
import { LingwaveBrand } from '@/components/branding/LingwaveBrand'

interface WorkspaceChooserProps {
  onWorkspaceSelected: () => void
}

export function WorkspaceChooser({ onWorkspaceSelected }: WorkspaceChooserProps) {
  const [recents, setRecents] = useState<RecentWorkspaceEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [switching, setSwitching] = useState<string | null>(null)
  const [showManager, setShowManager] = useState(false)
  const [folderPath, setFolderPath] = useState('')
  const [folderError, setFolderError] = useState<string | null>(null)
  const [openingFolder, setOpeningFolder] = useState(false)
  const [switchError, setSwitchError] = useState<string | null>(null)

  useEffect(() => {
    getRecentWorkspaces()
      .then(setRecents)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSelectRecent = async (path: string) => {
    setSwitching(path)
    setSwitchError(null)
    try {
      await switchWorkspace(path)
      onWorkspaceSelected()
    } catch (err: unknown) {
      setSwitchError(err instanceof Error ? err.message : 'Failed to switch workspace')
      setSwitching(null)
    }
  }

  const handleOpenFolder = async () => {
    const trimmed = folderPath.trim()
    if (!trimmed) return
    setFolderError(null)
    setOpeningFolder(true)
    try {
      await openWorkspaceFolder(trimmed)
      onWorkspaceSelected()
    } catch (err) {
      setFolderError(err instanceof Error ? err.message : 'Failed to open folder')
      setOpeningFolder(false)
    }
  }

  return (
    <div className="h-screen flex items-center justify-center bg-[var(--bg-base)]">
      <div className="w-full max-w-lg mx-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-2">
            <LingwaveBrand markClassName="h-10" wordmarkClassName="h-8" />
          </div>
          <p className="text-sm text-[var(--text-muted)]">Select a workspace to get started</p>
        </div>

        {/* Main card */}
        <div className="bg-[var(--bg-panel)] border border-[var(--border)] rounded-xl overflow-hidden">

          {/* Recent workspaces */}
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock size={14} className="text-[var(--text-muted)]" />
              <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Recent Workspaces</span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader size={16} className="animate-spin text-[var(--text-muted)]" />
              </div>
            ) : recents.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] py-4 text-center">
                No recent workspaces — browse all or open a folder to get started
              </p>
            ) : (
              <div className="space-y-1">
                {recents.map((ws) => (
                  <button
                    key={ws.path}
                    onClick={() => handleSelectRecent(ws.path)}
                    disabled={switching !== null}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--bg-hover)] transition-colors text-left group disabled:opacity-50"
                  >
                    <FolderOpen size={16} className="text-[var(--accent)] flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                          {ws.name}
                        </span>
                        {ws.language && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border)]">
                            <Globe size={9} />
                            {ws.language}
                          </span>
                        )}
                        <span className="text-[10px] text-[var(--text-muted)]">
                          {ws.word_count} words
                        </span>
                      </div>
                      <span className="text-[11px] text-[var(--text-muted)] truncate block">
                        {ws.path}
                      </span>
                    </div>
                    {switching === ws.path ? (
                      <Loader size={14} className="animate-spin text-[var(--text-muted)] flex-shrink-0" />
                    ) : (
                      <ChevronRight size={14} className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
            {switchError && (
              <p className="text-xs text-red-400 mt-2 px-1">{switchError}</p>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-[var(--border)]" />

          {/* Actions */}
          <div className="p-4 space-y-3">
            <button
              onClick={() => setShowManager(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--accent)] hover:opacity-90 transition-opacity text-white text-sm font-medium"
            >
              <FolderOpen size={14} />
              Browse All Workspaces
            </button>

            {/* Open folder input */}
            <div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={folderPath}
                  onChange={(e) => { setFolderPath(e.target.value); setFolderError(null) }}
                  onKeyDown={(e) => e.key === 'Enter' && handleOpenFolder()}
                  placeholder="Paste workspace folder path..."
                  className="flex-1 px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
                />
                <button
                  onClick={handleOpenFolder}
                  disabled={!folderPath.trim() || openingFolder}
                  className="px-4 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-50"
                >
                  {openingFolder ? <Loader size={14} className="animate-spin" /> : 'Open'}
                </button>
              </div>
              {folderError && (
                <p className="text-xs text-red-400 mt-1.5 px-1">{folderError}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* WorkspaceManager modal */}
      {showManager && (
        <WorkspaceManager
          onClose={() => setShowManager(false)}
          onSwitch={() => {
            setShowManager(false)
            onWorkspaceSelected()
          }}
        />
      )}
    </div>
  )
}
