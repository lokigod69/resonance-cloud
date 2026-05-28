import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useTranslation } from '@/hooks/useTranslation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Plus, Loader2 } from 'lucide-react'

interface TargetDeck {
  id: string
  name: string | null
  word_count: number
  target_language: string
  deck_type: 'video' | 'card' | 'card_text' | null
}

interface DeckPickerSheetProps {
  open: boolean
  onClose: () => void
  onSelectDeck: (deckId: string) => void
  sourceDeckId: string
  sourceDeckType?: 'video' | 'card' | 'card_text' | null
  targetLanguage: string
  selectedCount: number
}

export default function DeckPickerSheet({
  open,
  onClose,
  onSelectDeck,
  sourceDeckId,
  sourceDeckType,
  targetLanguage,
  selectedCount,
}: DeckPickerSheetProps) {
  const { user } = useAuth()
  const { t, tp } = useTranslation()
  const [decks, setDecks] = useState<TargetDeck[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [selecting, setSelecting] = useState(false)
  const [newDeckName, setNewDeckName] = useState('')
  const [showCreateInput, setShowCreateInput] = useState(false)

  useEffect(() => {
    if (!open || !user) return
    setLoading(true)
    setShowCreateInput(false)
    setNewDeckName('')
    setSelecting(false)
    supabase
      .from('decks')
      .select('id, name, word_count, target_language, deck_type')
      .eq('target_language', targetLanguage)
      .neq('id', sourceDeckId)
      .order('updated_at', { ascending: false })
      .then(({ data }) => {
        // Keep moves within the same card class: image-less (card_text) cards
        // carry no thumbnail and would render as orphans inside an image deck,
        // and image cards would leak their thumbnail into an image-less deck.
        const isTextSource = sourceDeckType === 'card_text'
        const eligible = (data ?? []).filter((d) =>
          isTextSource ? d.deck_type === 'card_text' : d.deck_type !== 'card_text',
        )
        setDecks(eligible)
        setLoading(false)
      })
  }, [open, user, targetLanguage, sourceDeckId, sourceDeckType])

  async function handleCreateDeck() {
    if (!user || !newDeckName.trim()) return
    setCreating(true)
    try {
      const { data, error } = await supabase
        .from('decks')
        .insert({
          user_id: user.id,
          name: newDeckName.trim(),
          target_language: targetLanguage,
          word_count: 0,
          status: 'draft',
        })
        .select('id')
        .single()

      if (error) throw error
      if (data) {
        onSelectDeck(data.id)
      }
    } catch (err) {
      console.error('Failed to create deck:', err)
    } finally {
      setCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="sm:max-w-md bg-[#0d0d12] border-white/10 text-white"
        showCloseButton
      >
        <DialogHeader>
          <DialogTitle className="text-lg font-display">
            {t('deckview.moveToTitle', { count: selectedCount })}
          </DialogTitle>
          <DialogDescription className="text-sm text-white/50">
            {targetLanguage}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[50vh] overflow-y-auto -mx-1 px-1">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-white/40" />
            </div>
          ) : decks.length === 0 && !showCreateInput ? (
            <p className="text-center py-6 text-white/40 text-sm">
              {t('deckview.noOtherDecks')}
            </p>
          ) : (
            <div className="space-y-1.5">
              {decks.map((d) => (
                <button
                  key={d.id}
                  onClick={() => {
                    if (selecting) return
                    setSelecting(true)
                    onSelectDeck(d.id)
                  }}
                  disabled={selecting}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-left
                    hover:bg-white/5 transition-colors border border-transparent hover:border-white/10
                    disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-sm font-medium truncate mr-3">
                    {d.name || `${d.target_language} Deck`}
                  </span>
                  <span className="text-xs text-white/40 shrink-0">
                    {d.word_count} {tp('deckview.cards', d.word_count)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Create new deck section */}
        <div className="border-t border-white/10 pt-3 mt-1">
          {showCreateInput ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={newDeckName}
                onChange={(e) => setNewDeckName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newDeckName.trim()) handleCreateDeck()
                  if (e.key === 'Escape') setShowCreateInput(false)
                }}
                placeholder={t('deckview.newDeckName')}
                maxLength={50}
                autoFocus
                className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white
                  placeholder:text-white/30 outline-none focus:border-white/20 transition-colors"
              />
              <button
                onClick={handleCreateDeck}
                disabled={!newDeckName.trim() || creating}
                className="px-4 py-2 rounded-lg bg-white/10 text-sm font-medium text-white
                  hover:bg-white/15 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t('deckview.create')
                )}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowCreateInput(true)}
              className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm text-white/60
                hover:text-white hover:bg-white/5 transition-colors"
            >
              <Plus className="h-4 w-4" />
              {t('deckview.createNewDeck')}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
