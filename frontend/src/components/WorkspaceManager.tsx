import { useState, useEffect, useMemo } from 'react'
import { X, Plus, FolderOpen, Check, Loader, ChevronDown, Pencil, Trash2 } from 'lucide-react'
import { listWorkspaces, createWorkspace, switchWorkspace, renameWorkspace, deleteWorkspace, type WorkspaceEntry } from '../api'

interface WorkspaceManagerProps {
  onClose: () => void
  onSwitch: () => void
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function WorkspaceManager({ onClose, onSwitch }: WorkspaceManagerProps) {
  const [workspaces, setWorkspaces] = useState<WorkspaceEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newLanguage, setNewLanguage] = useState<string>('')
  const [switching, setSwitching] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  // Rename state
  const [renamingPath, setRenamingPath] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  // Delete state
  const [deletingPath, setDeletingPath] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const ws = await listWorkspaces()
      setWorkspaces(ws)
    } catch { /* noop: failed list leaves panel empty until next reload */ }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // Collect unique languages from existing workspaces for the dropdown
  const knownLanguages = useMemo(() => {
    const langs = new Set<string>()
    for (const ws of workspaces) {
      if (ws.language) langs.add(ws.language)
    }
    // Add common defaults
    for (const l of ['German', 'Italian', 'English', 'Korean', 'Tagalog', 'Japanese', 'Spanish', 'Bisaya']) {
      langs.add(l)
    }
    return [...langs].sort()
  }, [workspaces])

  const handleCreate = async () => {
    if (!newName.trim()) return
    setError(null)
    try {
      await createWorkspace(newName.trim(), newLanguage || null)
      setNewName('')
      setNewLanguage('')
      setCreating(false)
      await load()
      onSwitch()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const handleSwitch = async (path: string) => {
    setSwitching(path)
    setError(null)
    try {
      await switchWorkspace(path)
      onSwitch()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
    setSwitching(null)
  }

  const handleRename = async (path: string) => {
    if (!renameValue.trim()) return
    setError(null)
    try {
      await renameWorkspace(path, renameValue.trim())
      setRenamingPath(null)
      setRenameValue('')
      await load()
      // If the renamed workspace was active, refresh parent state
      const ws = workspaces.find(w => w.path === path)
      if (ws?.active) onSwitch()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const handleDelete = async (ws: WorkspaceEntry) => {
    if (!window.confirm(`Delete workspace '${ws.name}'? This will permanently delete all generated content (songs, images, videos). This cannot be undone.`)) {
      return
    }
    setDeletingPath(ws.path)
    setError(null)
    try {
      await deleteWorkspace(ws.path)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
    setDeletingPath(null)
  }

  const toggleCollapsed = (key: string) =>
    setCollapsed(c => ({ ...c, [key]: !c[key] }))

  const groups = useMemo(() => {
    const map = new Map<string, WorkspaceEntry[]>()
    for (const ws of workspaces) {
      const key = ws.language || 'Untagged'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(ws)
    }
    return [...map.entries()].sort(([a], [b]) => {
      if (a === 'Untagged') return 1
      if (b === 'Untagged') return -1
      return a.localeCompare(b)
    })
  }, [workspaces])

  return (
    <div className="fixed inset-0 bg-black/60 modal-backdrop flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-[var(--bg-panel)] border border-[var(--border)] rounded-lg w-[480px] max-h-[70vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Workspaces</h2>
          <div className="flex items-center gap-2">
            {!creating && (
              <button
                onClick={() => setCreating(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[var(--accent)] text-white rounded hover:bg-[var(--accent)]/80 transition-colors"
              >
                <Plus size={12} />
                New Workspace
              </button>
            )}
            <button onClick={onClose} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {creating && (
            <div className="p-3 bg-[var(--bg-card)] border border-[var(--border)] rounded mb-2 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  placeholder="Workspace name..."
                  className="flex-1 bg-[var(--bg-base)] border border-[var(--border)] rounded px-3 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  autoFocus
                />
                <button
                  onClick={handleCreate}
                  disabled={!newName.trim()}
                  className="px-3 py-1.5 text-xs font-medium bg-[var(--accent)] text-white rounded hover:bg-[var(--accent)]/80 disabled:opacity-50"
                >
                  Create
                </button>
                <button
                  onClick={() => { setCreating(false); setNewName(''); setNewLanguage('') }}
                  className="p-1 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                >
                  <X size={14} />
                </button>
              </div>
              <select
                value={newLanguage}
                onChange={e => setNewLanguage(e.target.value)}
                className="w-full bg-[var(--bg-base)] border border-[var(--border)] rounded px-3 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              >
                <option value="">No language (Untagged)</option>
                {knownLanguages.map(lang => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>
          )}

          {error && (
            <div className="text-xs text-[var(--error)] bg-[var(--error)]/10 border border-[var(--error)]/20 rounded px-3 py-2 mb-2">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-24">
              <Loader size={16} className="animate-spin text-[var(--text-muted)]" />
            </div>
          ) : workspaces.length === 0 ? (
            <div className="text-center text-[var(--text-muted)] text-sm py-8">
              No workspaces found. Create one to get started.
            </div>
          ) : (
            groups.map(([language, entries]) => (
              <div key={language}>
                <button
                  onClick={() => toggleCollapsed(language)}
                  className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider hover:text-[var(--text-secondary)] transition-colors"
                >
                  <ChevronDown
                    size={10}
                    className={`transition-transform duration-150 ${collapsed[language] ? '-rotate-90' : ''}`}
                  />
                  {capitalize(language)}
                  <span className="font-normal">({entries.length})</span>
                </button>
                {!collapsed[language] && (
                  <div className="space-y-1 ml-1 mb-2">
                    {entries.map(ws => (
                      <div
                        key={ws.path}
                        className={`w-full text-left p-3 rounded border transition-colors ${
                          ws.active
                            ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                            : 'border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg-hover)]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div
                            className={`flex items-center gap-2 flex-1 min-w-0 ${!ws.active ? 'cursor-pointer' : ''}`}
                            onClick={() => !ws.active && !renamingPath && handleSwitch(ws.path)}
                          >
                            <FolderOpen size={14} className={`flex-shrink-0 ${ws.active ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`} />
                            {renamingPath === ws.path ? (
                              <input
                                type="text"
                                value={renameValue}
                                onChange={e => setRenameValue(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleRename(ws.path)
                                  if (e.key === 'Escape') { setRenamingPath(null); setRenameValue('') }
                                }}
                                onClick={e => e.stopPropagation()}
                                className="flex-1 min-w-0 bg-[var(--bg-base)] border border-[var(--accent)] rounded px-2 py-0.5 text-sm text-[var(--text-primary)] focus:outline-none"
                                autoFocus
                              />
                            ) : (
                              <span className={`text-sm font-medium truncate ${ws.active ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                                {ws.name}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                            <span className="text-xs text-[var(--text-muted)]">
                              {ws.word_count} word{ws.word_count !== 1 ? 's' : ''}
                              {ws.approved_count > 0 && (
                                <span className="text-[var(--success)] ml-1">
                                  · {ws.approved_count} approved
                                </span>
                              )}
                            </span>
                            {renamingPath === ws.path ? (
                              <>
                                <button
                                  onClick={() => handleRename(ws.path)}
                                  className="p-1 text-[var(--accent)] hover:text-[var(--accent)]/80"
                                  title="Save"
                                >
                                  <Check size={12} />
                                </button>
                                <button
                                  onClick={() => { setRenamingPath(null); setRenameValue('') }}
                                  className="p-1 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                                  title="Cancel"
                                >
                                  <X size={12} />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={e => { e.stopPropagation(); setRenamingPath(ws.path); setRenameValue(ws.name) }}
                                  className="p-1 text-[var(--text-muted)] hover:text-[var(--text-secondary)] opacity-0 group-hover:opacity-100"
                                  style={{ opacity: undefined }}
                                  onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                                  onMouseLeave={e => (e.currentTarget.style.opacity = '')}
                                  title="Rename"
                                >
                                  <Pencil size={12} />
                                </button>
                                {!ws.active && (
                                  <button
                                    onClick={e => { e.stopPropagation(); handleDelete(ws) }}
                                    disabled={deletingPath === ws.path}
                                    className="p-1 text-[var(--text-muted)] hover:text-[var(--error)] disabled:opacity-50"
                                    title="Delete workspace"
                                  >
                                    {deletingPath === ws.path ? (
                                      <Loader size={12} className="animate-spin" />
                                    ) : (
                                      <Trash2 size={12} />
                                    )}
                                  </button>
                                )}
                                {ws.active && <Check size={14} className="text-[var(--accent)]" />}
                                {switching === ws.path && <Loader size={14} className="animate-spin text-[var(--text-muted)]" />}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
