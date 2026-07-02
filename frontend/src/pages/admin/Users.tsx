import { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LingwaveLoader } from '@/components/ui/LingwaveLoader'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Users as UsersIcon,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Search,
  Shield,
  Coins,
  Gift,
  ToggleLeft,
  ToggleRight,
  Plus,
} from 'lucide-react'
import { useToast } from '@/components/Toast'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Profile = {
  id: string
  email?: string | null
  display_name: string | null
  base_language: string | null
  role: 'learner' | 'admin'
  credits: number
  created_at: string
  updated_at: string
}

type InviteCode = {
  id: string
  code: string
  credits: number
  max_uses: number | null
  is_active: boolean
  created_at: string
}

type UserDeck = {
  id: string
  name: string
  target_language: string
  status: string
  word_count: number
}

type WordRow = {
  id: string
  user_id: string
  status: string
}

type AggregatedUser = Profile & {
  deckCount: number
  wordCountComplete: number
  wordCountTotal: number
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-purple-500/20 text-purple-400',
  learner: 'bg-blue-500/20 text-blue-400',
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-zinc-500/20 text-zinc-400',
  generating: 'bg-blue-500/20 text-blue-400',
  complete: 'bg-green-500/20 text-green-400',
  partial: 'bg-orange-500/20 text-orange-400',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  const days = Math.floor(seconds / 86400)
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

function displayName(profile: Profile): string {
  return profile.display_name || profile.email || profile.id.slice(0, 8)
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function Users() {
  const { toast } = useToast()

  // Data
  const [users, setUsers] = useState<AggregatedUser[]>([])
  const [loading, setLoading] = useState(true)

  // Expanded row
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null)
  const [userDecks, setUserDecks] = useState<Record<string, UserDeck[]>>({})

  // Credit inputs (keyed by user id)
  const [addCreditAmounts, setAddCreditAmounts] = useState<Record<string, string>>({})
  const [setCreditAmounts, setSetCreditAmounts] = useState<Record<string, string>>({})

  // Filters
  const [roleFilter, setRoleFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Invite codes
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([])
  const [inviteCodesAvailable, setInviteCodesAvailable] = useState(true)
  const [newCode, setNewCode] = useState('')
  const [newCredits, setNewCredits] = useState('10')
  const [newMaxUses, setNewMaxUses] = useState('')
  const [creatingCode, setCreatingCode] = useState(false)

  // Role change dialog
  const [roleChangeTarget, setRoleChangeTarget] = useState<{
    user: AggregatedUser
    newRole: 'admin' | 'learner'
  } | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // -------------------------------------------------------------------------
  // Data fetching
  // -------------------------------------------------------------------------

  const load = useCallback(async () => {
    setLoading(true)
    const [profilesRes, decksRes, wordsRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('decks').select('id, user_id'),
      supabase.from('words').select('id, user_id, status'),
    ])

    // Fetch invite codes (may fail if table doesn't exist yet)
    const codesRes = await supabase
      .from('invite_codes')
      .select('*')
      .order('created_at', { ascending: false })
    if (codesRes.error) {
      setInviteCodesAvailable(false)
      setInviteCodes([])
    } else {
      setInviteCodesAvailable(true)
      setInviteCodes((codesRes.data || []) as InviteCode[])
    }

    const profiles = (profilesRes.data || []) as Profile[]
    const decks = (decksRes.data || []) as { id: string; user_id: string }[]
    const words = (wordsRes.data || []) as WordRow[]

    // Build lookup maps
    const deckCountMap: Record<string, number> = {}
    for (const d of decks) {
      deckCountMap[d.user_id] = (deckCountMap[d.user_id] || 0) + 1
    }

    const wordTotalMap: Record<string, number> = {}
    const wordCompleteMap: Record<string, number> = {}
    for (const w of words) {
      wordTotalMap[w.user_id] = (wordTotalMap[w.user_id] || 0) + 1
      if (w.status === 'complete') {
        wordCompleteMap[w.user_id] = (wordCompleteMap[w.user_id] || 0) + 1
      }
    }

    const aggregated: AggregatedUser[] = profiles.map(p => ({
      ...p,
      deckCount: deckCountMap[p.id] || 0,
      wordCountTotal: wordTotalMap[p.id] || 0,
      wordCountComplete: wordCompleteMap[p.id] || 0,
    }))

    setUsers(aggregated)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // -------------------------------------------------------------------------
  // Lazy-load user decks on expand
  // -------------------------------------------------------------------------

  const fetchUserDecks = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('decks')
      .select('id, name, target_language, status, word_count')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (data) setUserDecks(prev => ({ ...prev, [userId]: data }))
  }, [])

  const toggleUser = async (userId: string) => {
    if (expandedUserId === userId) {
      setExpandedUserId(null)
      return
    }
    setExpandedUserId(userId)
    if (!userDecks[userId]) {
      await fetchUserDecks(userId)
    }
  }

  // -------------------------------------------------------------------------
  // Filtering
  // -------------------------------------------------------------------------

  const filteredUsers = useMemo(() => {
    let result = users
    if (roleFilter !== 'all') {
      result = result.filter(u => u.role === roleFilter)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(u => {
        const name = (u.display_name || '').toLowerCase()
        const email = (u.email || '').toLowerCase()
        const idPrefix = u.id.slice(0, 8).toLowerCase()
        return name.includes(q) || email.includes(q) || idPrefix.includes(q)
      })
    }
    return result
  }, [users, roleFilter, searchQuery])

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  const handleAddCredits = async (user: AggregatedUser) => {
    const raw = addCreditAmounts[user.id] || ''
    const amount = parseInt(raw, 10)
    if (!amount || amount < 1) {
      toast('Enter a positive number', 'error')
      return
    }
    setActionLoading(true)
    try {
      const { error } = await supabase.rpc('admin_adjust_user_credits', {
        p_user_id: user.id,
        p_delta: amount,
        p_reason: `Added credits from admin users page`,
      })
      if (error) {
        toast(error.message, 'error')
      } else {
        toast(`Added ${amount} credits to ${displayName(user)}`, 'success')
        setAddCreditAmounts(prev => ({ ...prev, [user.id]: '' }))
        await load()
      }
    } catch {
      toast('Failed to add credits', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleSetCredits = async (user: AggregatedUser) => {
    const raw = setCreditAmounts[user.id] || ''
    const amount = parseInt(raw, 10)
    if (isNaN(amount) || amount < 0) {
      toast('Enter a non-negative number', 'error')
      return
    }
    setActionLoading(true)
    try {
      const delta = amount - user.credits
      if (delta === 0) {
        toast(`Credits already set to ${amount}`, 'success')
        setSetCreditAmounts(prev => ({ ...prev, [user.id]: '' }))
      } else {
        const { error } = await supabase.rpc('admin_adjust_user_credits', {
          p_user_id: user.id,
          p_delta: delta,
          p_reason: `Set credits from admin users page`,
        })
        if (error) {
          toast(error.message, 'error')
        } else {
          toast(`Set ${displayName(user)}'s credits to ${amount}`, 'success')
          setSetCreditAmounts(prev => ({ ...prev, [user.id]: '' }))
          await load()
        }
      }
    } catch {
      toast('Failed to set credits', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const confirmRoleChange = async () => {
    if (!roleChangeTarget) return
    setActionLoading(true)
    try {
      const { error } = await supabase.rpc('admin_set_user_role', {
        p_user_id: roleChangeTarget.user.id,
        p_role: roleChangeTarget.newRole,
        p_reason: `Changed role from admin users page`,
      })
      if (error) {
        toast(error.message, 'error')
      } else {
        toast(
          `Changed ${displayName(roleChangeTarget.user)}'s role to ${roleChangeTarget.newRole}`,
          'success',
        )
        await load()
      }
    } catch {
      toast('Failed to change role', 'error')
    } finally {
      setActionLoading(false)
      setRoleChangeTarget(null)
    }
  }

  // -------------------------------------------------------------------------
  // Invite code actions
  // -------------------------------------------------------------------------

  const handleCreateCode = async () => {
    const code = newCode.trim().toUpperCase()
    const credits = parseInt(newCredits, 10)
    const maxUses = newMaxUses.trim() ? parseInt(newMaxUses, 10) : null
    if (!code) { toast('Enter a code', 'error'); return }
    if (!credits || credits < 1) { toast('Credits must be at least 1', 'error'); return }
    setCreatingCode(true)
    try {
      const { error } = await supabase.rpc('admin_create_invite_code', {
        p_code: code,
        p_credits: credits,
        p_max_uses: maxUses,
        p_reason: 'Created invite code from admin users page',
      })
      if (error) {
        toast(error.message, 'error')
      } else {
        toast(`Created code ${code}`, 'success')
        setNewCode('')
        setNewCredits('10')
        setNewMaxUses('')
        await load()
      }
    } catch {
      toast('Failed to create code', 'error')
    } finally {
      setCreatingCode(false)
    }
  }

  const handleToggleCode = async (codeId: string, currentlyActive: boolean) => {
    const { error } = await supabase.rpc('admin_toggle_invite_code', {
      p_code_id: codeId,
      p_active: !currentlyActive,
      p_reason: currentlyActive
        ? 'Deactivated invite code from admin users page'
        : 'Activated invite code from admin users page',
    })
    if (error) {
      toast('Failed to update code', 'error')
    } else {
      await load()
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LingwaveLoader size={80} className="py-0" />
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UsersIcon className="h-6 w-6" />
          <h1 className="text-2xl font-bold">User Management</h1>
        </div>
        <Button variant="ghost" size="icon" onClick={load}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="learner">Learner</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or ID..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* User List */}
      <div className="space-y-1.5">
        {filteredUsers.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            {users.length === 0
              ? 'No users registered yet'
              : 'No users match the current filters'}
          </Card>
        ) : (
          filteredUsers.map(user => (
            <Card key={user.id} className="overflow-hidden">
              {/* User row */}
              <div
                className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => toggleUser(user.id)}
              >
                {expandedUserId === user.id ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}

                {/* Name + Email */}
                <div className="min-w-[100px]">
                  <span className="font-medium truncate block">{displayName(user)}</span>
                  {user.email && (
                    <span className="text-xs text-muted-foreground truncate block">{user.email}</span>
                  )}
                </div>

                {/* Role badge */}
                <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${ROLE_COLORS[user.role] || ''}`}>
                  {user.role}
                </span>

                {/* Credits */}
                <span className="flex items-center gap-1 text-sm">
                  <Coins className="h-3.5 w-3.5 text-yellow-400" />
                  <span className="font-medium">{user.credits}</span>
                </span>

                {/* Deck count */}
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {user.deckCount} {user.deckCount === 1 ? 'deck' : 'decks'}
                </span>

                {/* Word count */}
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {user.wordCountComplete}/{user.wordCountTotal} words
                </span>

                {/* Last active */}
                <span className="text-xs text-muted-foreground hidden lg:block ml-auto">
                  {timeAgo(user.updated_at || user.created_at)}
                </span>
              </div>

              {/* Expanded detail */}
              {expandedUserId === user.id && (
                <div className="border-t border-border bg-accent/20 px-4 py-3 space-y-4">
                  {/* Credit Management */}
                  <div>
                    <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <Coins className="h-4 w-4 text-yellow-400" />
                      Credit Management
                      <span className="text-muted-foreground font-normal">
                        (current: {user.credits})
                      </span>
                    </h3>
                    <div className="flex flex-wrap gap-4">
                      {/* Add Credits */}
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          placeholder="10"
                          value={addCreditAmounts[user.id] || ''}
                          onChange={e =>
                            setAddCreditAmounts(prev => ({
                              ...prev,
                              [user.id]: e.target.value,
                            }))
                          }
                          className="w-24"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleAddCredits(user)}
                          disabled={actionLoading}
                        >
                          Add Credits
                        </Button>
                      </div>
                      {/* Set Credits */}
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={0}
                          placeholder="50"
                          value={setCreditAmounts[user.id] || ''}
                          onChange={e =>
                            setSetCreditAmounts(prev => ({
                              ...prev,
                              [user.id]: e.target.value,
                            }))
                          }
                          className="w-24"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSetCredits(user)}
                          disabled={actionLoading}
                        >
                          Set Credits
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* User's Decks */}
                  <div>
                    <h3 className="text-sm font-medium mb-2">Decks</h3>
                    {!userDecks[user.id] ? (
                      <div className="flex items-center py-3">
                        <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : userDecks[user.id].length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">No decks</p>
                    ) : (
                      <div className="space-y-1">
                        {userDecks[user.id].map(deck => (
                          <div
                            key={deck.id}
                            className="flex items-center gap-3 px-3 py-2 rounded-md bg-accent/30"
                          >
                            <span className="text-sm font-medium truncate">
                              {deck.name}
                            </span>
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-accent text-accent-foreground">
                              {deck.target_language}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${STATUS_COLORS[deck.status] || ''}`}
                            >
                              {deck.status}
                            </span>
                            <span className="text-xs text-muted-foreground ml-auto">
                              {deck.word_count} {deck.word_count === 1 ? 'word' : 'words'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Account Actions */}
                  <div>
                    <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Account Actions
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      {/* Role change */}
                      <Select
                        value={user.role}
                        onValueChange={(newRole: string) => {
                          if (newRole !== user.role) {
                            setRoleChangeTarget({
                              user,
                              newRole: newRole as 'admin' | 'learner',
                            })
                          }
                        }}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="learner">Learner</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Deactivate placeholder */}
                      <Button
                        variant="outline"
                        size="sm"
                        disabled
                        title="Not implemented yet"
                      >
                        Deactivate
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Invite Codes */}
      <Card className="p-4 space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Gift className="h-5 w-5" />
          Invite Codes
        </h2>

        {!inviteCodesAvailable ? (
          <p className="text-sm text-muted-foreground">
            Invite code management will be available once the invite_codes table is created in the database.
          </p>
        ) : (
          <>
            {/* Create new code */}
            <div className="flex flex-wrap gap-2 items-end">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Code</label>
                <Input
                  placeholder="e.g. LINGWAVE-TEST-001"
                  value={newCode}
                  onChange={e => setNewCode(e.target.value)}
                  className="w-[220px] uppercase tracking-wider"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Credits</label>
                <Input
                  type="number"
                  min={1}
                  value={newCredits}
                  onChange={e => setNewCredits(e.target.value)}
                  className="w-[80px]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Max Uses</label>
                <Input
                  type="number"
                  min={1}
                  placeholder="∞"
                  value={newMaxUses}
                  onChange={e => setNewMaxUses(e.target.value)}
                  className="w-[80px]"
                />
              </div>
              <Button
                size="sm"
                onClick={handleCreateCode}
                disabled={creatingCode || !newCode.trim()}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                {creatingCode ? 'Creating...' : 'Create'}
              </Button>
            </div>

            {/* Codes list */}
            {inviteCodes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No invite codes yet.</p>
            ) : (
              <div className="space-y-1">
                {inviteCodes.map(ic => (
                  <div
                    key={ic.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-md bg-accent/30"
                  >
                    <span className="font-mono text-sm font-medium tracking-wider">
                      {ic.code}
                    </span>
                    <span className="flex items-center gap-1 text-sm">
                      <Coins className="h-3.5 w-3.5 text-yellow-400" />
                      {ic.credits}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {ic.max_uses != null ? `max ${ic.max_uses} uses` : 'Unlimited'}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        ic.is_active
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-zinc-500/20 text-zinc-400'
                      }`}
                    >
                      {ic.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <button
                      className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => handleToggleCode(ic.id, ic.is_active)}
                      title={ic.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {ic.is_active ? (
                        <ToggleRight className="h-5 w-5 text-green-400" />
                      ) : (
                        <ToggleLeft className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Card>

      {/* Role Change Confirmation */}
      <Dialog
        open={!!roleChangeTarget}
        onOpenChange={v => !v && setRoleChangeTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Role</DialogTitle>
            <DialogDescription>
              Change{' '}
              <strong>{roleChangeTarget ? displayName(roleChangeTarget.user) : ''}</strong>
              's role to <strong>{roleChangeTarget?.newRole}</strong>?
              {roleChangeTarget?.newRole === 'admin' && (
                <span className="block mt-2 text-yellow-400">
                  Warning: Admin role grants full access to all admin features.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setRoleChangeTarget(null)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button onClick={confirmRoleChange} disabled={actionLoading}>
              {actionLoading ? 'Changing...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
