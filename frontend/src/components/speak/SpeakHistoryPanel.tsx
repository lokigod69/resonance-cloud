import { useEffect, useState } from 'react'
import { X, ArrowLeft, Mic, ChevronRight, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useTranslation } from '@/hooks/useTranslation'
import { FlagIcon } from '@/components/ui/FlagIcon'
import { getCharacterById } from '@/characterRegistry'
import { GEMINI_CHARACTER_MODES } from '@/data/geminiCharacterModes'
import { GEMINI_ACCENTS } from '@/data/geminiAccents'

interface Conversation {
  id: string
  language: string
  voice_name: string | null
  character_id: string | null
  level: string | null
  message_count: number
  title: string | null
  started_at: string
  ended_at: string | null
  corrections: Correction[] | null
  mode?: string | null
  scenario_id?: string | null
  npc_name?: string | null
  context_variant?: string | null
  provider?: 'voxtral' | 'gemini' | 'grok' | null
  gemini_character_mode_id?: string | null
  gemini_voice_name?: string | null
  gemini_accent_id?: string | null
  grok_voice?: string | null
  grok_category?: string | null
}

function getGeminiModeName(id: string | null | undefined): string {
  if (!id) return ''
  const mode = GEMINI_CHARACTER_MODES.find((m) => m.id === id)
  return mode?.name ?? id
}

function getGeminiAccentName(id: string | null | undefined): string {
  if (!id || id === 'none') return ''
  const accent = GEMINI_ACCENTS.find((a) => a.id === id)
  return accent?.name ?? id
}

function buildGeminiDisplayName(conv: Conversation): string {
  const modeName = getGeminiModeName(conv.gemini_character_mode_id)
  const voice = conv.gemini_voice_name ?? conv.voice_name ?? ''
  const accentName = getGeminiAccentName(conv.gemini_accent_id)
  const parts: string[] = []
  if (modeName) parts.push(modeName)
  if (voice) parts.push(voice)
  if (accentName) parts.push(accentName)
  return parts.join(' · ')
}

const GROK_CATEGORY_LABEL_KEYS: Record<string, string> = {
  travel: 'speak.grok.category.travel',
  business: 'speak.grok.category.business',
  romance: 'speak.grok.category.romance',
  philosophy: 'speak.grok.category.philosophy',
  daily_life: 'speak.grok.category.daily_life',
  food: 'speak.grok.category.food',
  arts: 'speak.grok.category.arts',
  news: 'speak.grok.category.news',
}

function buildGrokDisplayName(conv: Conversation, t: (key: string, vars?: Record<string, string | number>) => string): string {
  const categoryKey = conv.grok_category ? GROK_CATEGORY_LABEL_KEYS[conv.grok_category] : null
  const categoryName = categoryKey ? t(categoryKey) : (conv.grok_category ?? t('speak.grok.freeChat'))
  const voice = conv.grok_voice ?? conv.voice_name ?? ''
  return voice ? `${categoryName} · ${voice}` : categoryName
}

interface Correction {
  original: string
  corrected: string
  explanation: string
}

interface Message {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

interface SpeakHistoryPanelProps {
  open: boolean
  onClose: () => void
  baseLangCode?: string
  onExtractConversation?: (conversation: {
    conversationId: string
    targetLanguage: string
    baseLanguage: string
    defaultDeckName: string
  }) => void
}

const LANGUAGE_NAMES: Record<string, string> = {
  en:  'English',
  de:  'Deutsch',
  fr:  'Français',
  it:  'Italiano',
  es:  'Español',
  pt:  'Português',
  nl:  'Nederlands',
  hi:  'हिन्दी',
  ar:  'العربية',
  fil: 'Filipino',
  id:  'Bahasa Indonesia',
  ko:  '한국어',
}

const LEVEL_EMOJI: Record<string, string> = {
  zero:         '🌱',
  beginner:     '📗',
  intermediate: '📘',
  advanced:     '📕',
}

function formatDate(iso: string, t: (key: string, vars?: Record<string, string | number>) => string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return t('speak.history.justNow')
  if (diffMins < 60) return t('speak.history.minutesAgo', { count: diffMins })
  if (diffHours < 24) return t('speak.history.hoursAgo', { count: diffHours })
  if (diffDays === 1) return t('speak.history.yesterday')
  if (diffDays < 7) return t('speak.history.daysAgo', { count: diffDays })

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function SpeakHistoryPanel({ open, onClose, baseLangCode, onExtractConversation }: SpeakHistoryPanelProps) {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [corrections, setCorrections] = useState<Correction[] | null>(null)
  const [correctionsLoading, setCorrectionsLoading] = useState(false)
  const [correctionsError, setCorrectionsError] = useState<string | null>(null)
  const defaultDeckName = `${t('speak.extractWords.defaultDeckName')} - ${new Date().toLocaleDateString()}`

  // Load conversations when panel opens
  useEffect(() => {
    if (!open || !user) return

    setLoading(true)
    setSelectedId(null)
    setMessages([])

    supabase
      .from('speak_conversations')
      .select('*')
      .eq('user_id', user.id)
      .order('started_at', { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (!error && data) setConversations(data as Conversation[])
        setLoading(false)
      })
  }, [open, user])

  // Load messages when a conversation is selected
  useEffect(() => {
    if (!selectedId) {
      setCorrections(null)
      return
    }

    setMessagesLoading(true)
    supabase
      .from('speak_messages')
      .select('*')
      .eq('conversation_id', selectedId)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) setMessages(data as Message[])
        setMessagesLoading(false)
      })

    // Hydrate cached corrections if present
    const conv = conversations.find((c) => c.id === selectedId)
    setCorrections(conv?.corrections ?? null)
    setCorrectionsError(null)
  }, [selectedId, conversations])

  const selectedConversation = conversations.find((c) => c.id === selectedId)

  const fetchHistoryCorrections = async () => {
    if (!selectedConversation || correctionsLoading || messages.length < 4) return
    setCorrectionsLoading(true)
    setCorrectionsError(null)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) {
        setCorrectionsError(t('speak.history.sessionExpired'))
        return
      }

      const res = await fetch('/api/voice-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mode: 'corrections',
          transcript: messages.map((m) => ({ role: m.role, content: m.content })),
          language: selectedConversation.language,
          native_language: baseLangCode || 'en',
        }),
      })
      if (!res.ok) {
        setCorrectionsError(res.status === 401
          ? t('speak.history.sessionExpired')
          : t('speak.history.correctionsUnavailable'))
        return
      }
      const data = await res.json()
      const list: Correction[] = Array.isArray(data.corrections) ? data.corrections : []
      setCorrections(list)
      await supabase.from('speak_conversations')
        .update({ corrections: list })
        .eq('id', selectedConversation.id)
      setConversations((prev) => prev.map((c) => c.id === selectedConversation.id ? { ...c, corrections: list } : c))
    } catch (err) {
      console.error('Corrections fetch failed:', err)
      setCorrectionsError(t('speak.history.correctionsUnavailable'))
      setCorrections([])
    } finally {
      setCorrectionsLoading(false)
    }
  }

  const deleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!user) return
    const { error } = await supabase
      .from('speak_conversations')
      .delete()
      .eq('id', convId)
      .eq('user_id', user.id)
    if (!error) {
      setConversations((prev) => prev.filter((c) => c.id !== convId))
      if (selectedId === convId) {
        setSelectedId(null)
        setMessages([])
      }
    }
  }

  return (
    <div
      className="fixed inset-x-0 bottom-[var(--fixed-bottom-ui-offset)] top-[var(--glassy-header-offset)] z-40 flex flex-col bg-gray-950/95 backdrop-blur-xl transition-transform duration-300"
      style={{ transform: open ? 'translateX(0)' : 'translateX(100%)' }}
    >
      {/* ── Header ── */}
      <div className="shrink-0 border-b border-white/5 bg-gray-950/80 backdrop-blur-md">
        <div className="flex items-center gap-2 px-4 py-3 max-w-5xl mx-auto w-full">
          {selectedId ? (
            <button
              onClick={() => { setSelectedId(null); setMessages([]) }}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              title={t('speak.history.back')}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          ) : (
            <div className="w-9" /> // spacer to balance close button
          )}

          <div className="flex-1 min-w-0">
            {selectedConversation ? (() => {
              const isRoleplay = selectedConversation.mode === 'roleplay'
              const isGemini = selectedConversation.provider === 'gemini'
              const isGrok = selectedConversation.provider === 'grok'
              const cName = selectedConversation.character_id ? getCharacterById(selectedConversation.character_id)?.name : null
              const transcriptTitle = isRoleplay
                ? (selectedConversation.title ?? 'Roleplay')
                : (LANGUAGE_NAMES[selectedConversation.language] ?? selectedConversation.language)
              const transcriptSub = isRoleplay
                ? selectedConversation.npc_name
                : isGrok
                  ? buildGrokDisplayName(selectedConversation, t)
                  : isGemini
                  ? buildGeminiDisplayName(selectedConversation)
                  : (cName || selectedConversation.voice_name)
              return (
                <div className="flex items-center gap-2">
                  <FlagIcon code={selectedConversation.language} className="w-6 h-auto" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {transcriptTitle}
                      {transcriptSub ? <span className="text-gray-400 font-normal"> · {transcriptSub}</span> : null}
                      {isGemini && (
                        <span className="ml-2 align-middle inline-block text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-cyan-900/50 text-cyan-300 border border-cyan-500/30">
                          Gemini
                        </span>
                      )}
                      {isGrok && (
                        <span className="ml-2 align-middle inline-block text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-violet-900/50 text-violet-300 border border-violet-500/30">
                          Grok
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">{formatDate(selectedConversation.started_at, t)}</p>
                  </div>
                </div>
              )
            })() : (
              <p className="text-sm font-semibold text-white">{t('speak.history.title')}</p>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            title={t('speak.history.close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
        <div className="max-w-5xl mx-auto w-full px-4 pt-4 pb-[calc(var(--app-safe-bottom)+1rem)]">

          {/* ── Conversation List ── */}
          {!selectedId && (
            <>
              {loading && (
                <div className="flex items-center justify-center py-16 text-gray-500 text-sm">
                  {t('speak.history.loading')}
                </div>
              )}

              {!loading && conversations.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                  <Mic className="h-10 w-10 text-gray-700" />
                  <p className="text-gray-400 text-sm font-medium">{t('speak.history.emptyTitle')}</p>
                  <p className="text-gray-600 text-xs max-w-xs">{t('speak.history.emptyDescription')}</p>
                </div>
              )}

              {!loading && conversations.length > 0 && (
                <div className="space-y-2">
                  {conversations.map((conv) => {
                    const isRoleplay = conv.mode === 'roleplay'
                    const isGemini = conv.provider === 'gemini'
                    const isGrok = conv.provider === 'grok'
                    const levelEmoji = conv.level ? LEVEL_EMOJI[conv.level] : null
                    const charName = conv.character_id ? getCharacterById(conv.character_id)?.name : null
                    const displayName = isRoleplay
                      ? conv.npc_name
                      : isGrok
                        ? buildGrokDisplayName(conv, t)
                        : isGemini
                        ? buildGeminiDisplayName(conv)
                        : (charName || conv.voice_name)
                    const displayTitle = isRoleplay
                      ? (conv.title || 'Roleplay')
                      : (LANGUAGE_NAMES[conv.language] ?? conv.language)
                    return (
                      <div
                        key={conv.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedId(conv.id)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedId(conv.id) }}
                        className="group w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-800/50 border border-white/5 hover:bg-gray-700/60 hover:border-white/10 transition-all text-left cursor-pointer"
                      >
                        <FlagIcon code={conv.language} className="w-7 h-auto shrink-0" />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                            {isRoleplay && <span className="text-sm">🎭</span>}
                            <span className="text-sm font-medium text-white truncate">
                              {displayTitle}
                            </span>
                            {displayName && (
                              <span className="text-xs text-gray-400 truncate">· {displayName}</span>
                            )}
                            {isGemini && (
                              <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-cyan-900/50 text-cyan-300 border border-cyan-500/30 shrink-0">
                                Gemini
                              </span>
                            )}
                            {isGrok && (
                              <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-violet-900/50 text-violet-300 border border-violet-500/30 shrink-0">
                                Grok
                              </span>
                            )}
                            {levelEmoji && <span className="text-sm">{levelEmoji}</span>}
                          </div>
                          {!isRoleplay && conv.title && (
                            <p className="text-xs text-gray-400 truncate">{conv.title}</p>
                          )}
                          {isRoleplay && (
                            <p className="text-xs text-gray-500 truncate">{LANGUAGE_NAMES[conv.language] ?? conv.language}</p>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="text-xs text-gray-500">{formatDate(conv.started_at, t)}</span>
                          {conv.message_count > 0 && (
                            <span className="text-xs bg-gray-700/60 text-gray-400 px-1.5 py-0.5 rounded-full">
                              {conv.message_count}
                            </span>
                          )}
                        </div>

                        <button
                          onClick={(e) => deleteConversation(conv.id, e)}
                          className="p-1 rounded text-gray-500 hover:text-red-400 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0"
                          title={t('speak.history.delete')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>

                        <ChevronRight className="h-4 w-4 text-gray-600 shrink-0" />
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {/* ── Transcript View ── */}
          {selectedId && (
            <>
              {messagesLoading && (
                <div className="flex items-center justify-center py-16 text-gray-500 text-sm">
                  {t('speak.history.loading')}
                </div>
              )}

              {!messagesLoading && messages.length === 0 && (
                <div className="flex items-center justify-center py-16 text-gray-600 text-sm">
                  {t('speak.history.emptyMessages')}
                </div>
              )}

              {!messagesLoading && messages.length > 0 && (
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed long-copy ${
                          msg.role === 'user'
                            ? 'bg-cyan-900/50 text-white rounded-br-sm'
                            : 'bg-gray-800/60 text-gray-100 rounded-bl-sm'
                        }`}
                      >
                        <p className="long-copy">{msg.content}</p>
                      </div>
                    </div>
                  ))}

                  {messages.length >= 4 && (
                    <div className="mt-6 flex flex-col items-center gap-4">
                      {correctionsError && (
                        <div className="text-center text-sm text-red-300 px-4 py-3 bg-red-950/40 border border-red-500/20 rounded-lg">
                          {correctionsError}
                        </div>
                      )}
                      {corrections === null ? (
                        <button
                          onClick={fetchHistoryCorrections}
                          disabled={correctionsLoading}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-colors border border-white/10 disabled:opacity-50"
                        >
                          <span>📝</span>
                          <span>{correctionsLoading ? t('speak.reviewLoading') : t('speak.reviewButton')}</span>
                        </button>
                      ) : corrections.length === 0 ? (
                        <div className="text-center text-sm text-green-400/80 px-4 py-3 bg-green-900/20 rounded-lg">
                          ✅ {t('speak.reviewPerfect')}
                        </div>
                      ) : (
                        <div className="w-full max-w-lg space-y-3">
                          <p className="text-xs text-gray-500 text-center mb-2">{t('speak.reviewTitle')}</p>
                          {corrections.map((c, i) => (
                            <div key={i} className="bg-white/5 rounded-lg p-3 space-y-1 long-copy">
                              <p className="text-sm text-red-400/80 line-through long-copy">{c.original}</p>
                              <p className="text-sm text-green-400/80 long-copy">{c.corrected}</p>
                              <p className="text-xs text-gray-500 long-copy">{c.explanation}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      {selectedConversation && onExtractConversation && (
                        <button
                          type="button"
                          onClick={() => onExtractConversation({
                            conversationId: selectedConversation.id,
                            targetLanguage: selectedConversation.language,
                            baseLanguage: baseLangCode || 'en',
                            defaultDeckName,
                          })}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-colors border border-white/10"
                        >
                          <span>{t('speak.extractWords.button')}</span>
                        </button>
                      )}
                    </div>
                  )}

                  {messages.length > 0 && messages.length < 4 && selectedConversation && onExtractConversation && (
                    <div className="mt-6 flex justify-center">
                      <button
                        type="button"
                        onClick={() => onExtractConversation({
                          conversationId: selectedConversation.id,
                          targetLanguage: selectedConversation.language,
                          baseLanguage: baseLangCode || 'en',
                          defaultDeckName,
                        })}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-colors border border-white/10"
                      >
                        <span>{t('speak.extractWords.button')}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  )
}
