import { useNavigate, useSearchParams } from 'react-router-dom'

export default function StudyCanvas() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const deckParam = searchParams.get('deck')

  return (
    <div className="fixed inset-0 z-40 bg-black text-white flex flex-col items-center justify-center select-none">
      <h1 className="text-4xl font-light tracking-widest mb-6">Canvas</h1>
      <p className="text-white/60 mb-12">Mode implementation coming in Phase B</p>
      {deckParam && (
        <p className="text-white/40 text-sm mb-8">deck: {deckParam}</p>
      )}
      <button
        onClick={() => navigate('/study')}
        className="px-6 py-3 border border-white/30 rounded text-white/80 hover:text-white hover:border-white/60 transition-colors"
      >
        Back to study modes
      </button>
    </div>
  )
}
