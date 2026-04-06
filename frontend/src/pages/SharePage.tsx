import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

interface SharedWordData {
  share_id: string
  word_id: string
  word: string
  translation: string | null
  mnemonic: string | null
  etymology: string | null
  pos: string | null
  article: string | null
  video_url: string | null
  video_url_b: string | null
  thumbnail_url: string | null
  target_language: string
  art_style: string | null
  view_count: number
}

export default function SharePage() {
  const { shareId } = useParams<{ shareId: string }>()
  const [data, setData] = useState<SharedWordData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (!shareId) return
    supabase
      .rpc('get_shared_word', { share_id: shareId })
      .then(({ data: result, error }) => {
        if (error || !result) {
          setNotFound(true)
        } else {
          setData(result as SharedWordData)
        }
        setLoading(false)
      })
  }, [shareId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-teal-400 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (notFound || !data) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-center px-4">
        <p className="text-white text-xl font-bold mb-2">Video not found</p>
        <p className="text-gray-500 mb-6">This share link may have expired or been removed.</p>
        <Link to="/" className="text-teal-400 hover:text-teal-300 underline text-sm">
          Go to Resonance
        </Link>
      </div>
    )
  }

  const wordDisplay = data.article ? `${data.article} ${data.word}` : data.word
  const posDisplay = data.pos
    ? data.article
      ? `${data.pos} · ${data.article}`
      : data.pos
    : null

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-2xl mx-auto">
        {/* Video */}
        <div className="w-full bg-black" style={{ aspectRatio: '16/9' }}>
          {data.video_url ? (
            <video
              ref={videoRef}
              src={data.video_url}
              poster={data.thumbnail_url || undefined}
              autoPlay
              muted
              playsInline
              loop
              controls
              className="w-full h-full object-cover"
            />
          ) : data.thumbnail_url ? (
            <img
              src={data.thumbnail_url}
              alt={data.word}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-gray-600 text-sm">No video available</div>
            </div>
          )}
        </div>

        {/* Word info */}
        <div className="px-6 pt-6 pb-4 text-center">
          <h1 className="text-3xl font-bold text-white">{wordDisplay}</h1>
          {data.translation && (
            <p className="text-xl text-gray-400 mt-2">{data.translation}</p>
          )}
          {posDisplay && (
            <p className="text-sm text-gray-600 mt-1">{posDisplay}</p>
          )}
          {data.mnemonic && (
            <p className="text-base text-gray-500 italic mt-3 max-w-xl mx-auto">
              &ldquo;{data.mnemonic}&rdquo;
            </p>
          )}
        </div>

        {/* CTA */}
        <div className="px-6 pb-10 flex flex-col items-center gap-4">
          <Link
            to="/login"
            className="w-full sm:w-auto px-8 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-white font-semibold text-center transition-colors"
          >
            ✨ Create Your Own
          </Link>
          <div className="text-center">
            <p className="text-gray-600 text-sm font-medium">resonanz.pro</p>
            <p className="text-gray-700 text-xs mt-0.5">
              AI-powered language learning through music and video
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
