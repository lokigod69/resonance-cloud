import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import type { PointerEvent } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/contexts/LanguageContext'
import { supabase } from '@/lib/supabase'
import { Loader, Music, Sparkles, Type } from 'lucide-react'
import { ParticleSpinner } from '@/components/ui/ParticleSpinner'
import { useTranslation } from '@/hooks/useTranslation'
import GeneratedMediaFrame from '@/components/media/GeneratedMediaFrame'
import { getDeckLanguageLabel, getDeckStatusLabel } from '@/lib/i18nDisplay'
import { getCardThumbUrl } from '@/lib/imageUrls'
import {
  calculateClassicDeckProximity,
  CLASSIC_DECK_PROXIMITY_CSS_PROPERTIES,
  formatClassicDeckProximityStyle,
} from '@/lib/classicDeckProximity'

type Deck = {
  id: string
  name: string | null
  target_language: string
  word_count: number
  status: string
  created_at: string
  deck_type?: 'video' | 'card' | 'card_text'
}

type WordStatus = {
  deck_id: string
  status: string
}

export default function Decks() {
  const { user, authError } = useAuth()
  const { activeLanguage, setActiveLanguage } = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()
  const deckGridRef = useRef<HTMLDivElement | null>(null)
  const deckProximityFrameRef = useRef<number | null>(null)
  const pendingDeckPointerRef = useRef<{ clientX: number; clientY: number } | null>(null)

  const { t, tp } = useTranslation()
  const userId = user?.id

  const [decks, setDecks] = useState<Deck[]>([])
  const [wordCounts, setWordCounts] = useState<Record<string, { completed: number; total: number }>>({})
  const [deckThumbnails, setDeckThumbnails] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [dashboardError, setDashboardError] = useState<string | null>(null)

  const loadDecks = useCallback(async (userId: string) => {
    try {
      setDashboardError(null)
      setLoading(true)
      const { data: decksData, error: decksError } = await supabase
        .from('decks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (decksError) {
        setDashboardError(t('deckview.failedToLoad'))
        return
      }

      if (decksData) {
        setDecks(decksData)

        const deckIds = decksData.map((d) => d.id)
        if (deckIds.length > 0) {
          const { data: words } = await supabase
            .from('words')
            .select('deck_id, status')
            .in('deck_id', deckIds)

          if (words) {
            const counts: Record<string, { completed: number; total: number }> = {}
            for (const w of words as WordStatus[]) {
              if (!counts[w.deck_id]) counts[w.deck_id] = { completed: 0, total: 0 }
              counts[w.deck_id].total++
              if (w.status === 'complete') counts[w.deck_id].completed++
            }
            setWordCounts(counts)
          }

          const { data: thumbWords } = await supabase
            .from('words')
            .select('deck_id, thumbnail_url')
            .in('deck_id', deckIds)
            .eq('status', 'complete')
            .not('thumbnail_url', 'is', null)
            .order('created_at', { ascending: true })

          if (thumbWords) {
            const thumbs: Record<string, string> = {}
            for (const w of thumbWords as { deck_id: string; thumbnail_url: string }[]) {
              if (!thumbs[w.deck_id]) {
                thumbs[w.deck_id] = w.thumbnail_url
              }
            }
            setDeckThumbnails(thumbs)
          }
        }
      }
    } catch {
      setDashboardError(t('common.somethingWentWrong'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }
    loadDecks(userId)
  }, [userId, location.key, loadDecks])

  const availableLanguages = useMemo(() => {
    return Array.from(new Set(decks.map((d) => d.target_language))).filter(Boolean)
  }, [decks])

  useEffect(() => {
    if (availableLanguages.length === 0) {
      if (activeLanguage) setActiveLanguage(null)
      return
    }
    if (!activeLanguage || !availableLanguages.includes(activeLanguage)) {
      setActiveLanguage(availableLanguages[0])
    }
  }, [availableLanguages, activeLanguage, setActiveLanguage])

  const filteredDecks = useMemo(
    () => decks.filter((d) => d.target_language === activeLanguage),
    [decks, activeLanguage]
  )

  const resetDeckProximity = useCallback(() => {
    if (deckProximityFrameRef.current !== null) {
      cancelAnimationFrame(deckProximityFrameRef.current)
      deckProximityFrameRef.current = null
    }
    pendingDeckPointerRef.current = null

    const grid = deckGridRef.current
    if (!grid) return

    grid.querySelectorAll<HTMLElement>('[data-classic-deck-card]').forEach((card) => {
      CLASSIC_DECK_PROXIMITY_CSS_PROPERTIES.forEach((property) => {
        card.style.removeProperty(property)
      })
    })
  }, [])

  const handleDeckGridPointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return

    pendingDeckPointerRef.current = {
      clientX: event.clientX,
      clientY: event.clientY,
    }

    if (deckProximityFrameRef.current !== null) return

    deckProximityFrameRef.current = requestAnimationFrame(() => {
      deckProximityFrameRef.current = null
      const pointer = pendingDeckPointerRef.current
      pendingDeckPointerRef.current = null

      if (!pointer) return

      const grid = deckGridRef.current
      if (!grid) return

      const proximityStyles = Array.from(grid.querySelectorAll<HTMLElement>('[data-classic-deck-card]'))
        .map((card) => ({
          card,
          proximity: calculateClassicDeckProximity(pointer, card.getBoundingClientRect()),
        }))

      proximityStyles.forEach(({ card, proximity }) => {
        if (proximity.intensity === 0) {
          CLASSIC_DECK_PROXIMITY_CSS_PROPERTIES.forEach((property) => {
            card.style.removeProperty(property)
          })
          return
        }

        const style = formatClassicDeckProximityStyle(proximity)

        Object.entries(style).forEach(([property, value]) => {
          card.style.setProperty(property, value)
        })
      })
    })
  }, [])

  useEffect(() => resetDeckProximity, [resetDeckProximity])

  if (authError && !user) {
    return (
      <div className="classic-dashboard-header">
        <h1>{t('error.sessionExpired')}</h1>
        <p>{authError}</p>
        <Link to="/login" className="classic-accent-link">{t('dashboard.loginAgain')}</Link>
      </div>
    )
  }

  if (authError && user) {
    return (
      <div className="classic-dashboard-header">
        <h1>{t('error.profileFailed')}</h1>
        <p>{authError}</p>
        <button
          onClick={() => window.location.reload()}
          className="classic-accent-link"
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
          {t('common.retry')}
        </button>
      </div>
    )
  }

  if (dashboardError) {
    return (
      <div className="classic-dashboard-header">
        <h1>{t('error.somethingWrong')}</h1>
        <p>{dashboardError}</p>
        <button onClick={() => window.location.reload()} className="classic-accent-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          {t('common.refresh')}
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <ParticleSpinner preset="rose" size={140} />
        <p className="text-sm text-muted-foreground opacity-60">{t('dashboard.loadingDecks')}</p>
      </div>
    )
  }

  if (decks.length === 0) {
    return (
      <div className="classic-dashboard-wrapper">
        <div className="classic-aurora" aria-hidden="true" />
        <div className="classic-dashboard-header">
          <h1>{t('dashboard.createFirst')}</h1>
          <p>{t('dashboard.createFirstBody')}</p>
          <button
            onClick={() => navigate('/generate')}
            className="classic-accent-btn"
          >
            {t('dashboard.generate')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="classic-dashboard-wrapper">
      <div className="classic-aurora" aria-hidden="true" />

      <div className="classic-dashboard-header">
        <h1>{t('decks.title')}</h1>
      </div>

      {availableLanguages.length > 1 && (
        <div className="flex gap-2 mb-6 overflow-x-auto px-4 sm:justify-center sm:flex-wrap sm:overflow-visible scrollbar-none -mx-1">
          {availableLanguages.map((lang) => {
            const isActive = lang === activeLanguage
            return (
              <button
                key={lang}
                onClick={() => setActiveLanguage(lang)}
                className={`flex-shrink-0 min-h-[44px] px-4 py-2 rounded-full text-sm border transition-all ${
                  isActive
                    ? 'bg-card border-border text-foreground shadow-[0_0_20px_var(--accent-glow)]'
                    : 'border-border text-muted-foreground hover:text-foreground/90 hover:border-accent'
                }`}
              >
                {getDeckLanguageLabel(lang, t)}
              </button>
            )
          })}
        </div>
      )}

      <div className="flex justify-center mb-8 px-4">
        <button
          onClick={() => navigate('/generate')}
          className="w-full sm:w-auto flex items-center justify-center gap-2 min-h-[48px] px-5 py-3 rounded-full bg-card hover:bg-accent border border-border hover:border-accent text-sm font-medium text-foreground transition-colors"
        >
          <Sparkles size={14} />
          {t('dashboard.generate')}
        </button>
      </div>

      {filteredDecks.length > 0 && (
        <div
          ref={deckGridRef}
          className="classic-decks-grid"
          onPointerMove={handleDeckGridPointerMove}
          onPointerLeave={resetDeckProximity}
          onPointerCancel={resetDeckProximity}
        >
          {filteredDecks.map((deck) => {
            const counts = wordCounts[deck.id] || { completed: 0, total: deck.word_count }
            const rawThumb = deckThumbnails[deck.id]
            const thumb = deck.deck_type === 'card' ? getCardThumbUrl(rawThumb) ?? undefined : rawThumb
            const isImagelessDeck = deck.deck_type === 'card_text'
            const deckLanguageLabel = getDeckLanguageLabel(deck.target_language, t)
            const displayName = deck.name || t('generateGo.languageDeckName', { language: deckLanguageLabel })

            return (
              <div
                key={deck.id}
                data-classic-deck-card
                className="classic-deck-card"
                onClick={() => navigate(`/deck/${deck.id}`)}
              >
                <div className="classic-deck-media">
                  <GeneratedMediaFrame
                    src={thumb}
                    alt={displayName}
                    variant={deck.deck_type === 'card' ? 'deckPreview' : 'decorative'}
                    className="classic-deck-media-frame"
                  >
                    <div className="classic-deck-placeholder">
                      {deck.status === 'generating' ? (
                        <Loader className="w-8 h-8 text-gray-600 animate-spin" />
                      ) : isImagelessDeck ? (
                        <Type className="w-8 h-8 text-gray-600/30" />
                      ) : (
                        <Music className="w-8 h-8 text-gray-600/30" />
                      )}
                    </div>
                  </GeneratedMediaFrame>
                </div>
                <div className="classic-deck-body">
                  <h3>{displayName}</h3>
                  <p>{deckLanguageLabel} &bull; {tp('dashboard.wordCount', counts.total)}</p>
                  {deck.status !== 'complete' && (
                    <p className="classic-deck-status">
                      {deck.status === 'generating'
                        ? t('dashboard.generating', { completed: counts.completed, total: counts.total })
                        : getDeckStatusLabel(deck.status, t)}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
