/**
 * OrbDock — Circular word thumbnail navigation bar
 * Extracted from Orbs study mode (StudyGO.tsx) for reuse across skins.
 * Shows each word as a small glass orb with thumbnail preview.
 */

type OrbDockWord = {
  id: string
  word: string
  thumbnail_url: string | null
}

interface OrbDockProps {
  words: OrbDockWord[]
  currentIndex: number
  onSelect: (index: number) => void
}

export default function OrbDock({ words, currentIndex, onSelect }: OrbDockProps) {
  return (
    <div className="orb-dock-container">
      <div className="orb-dock">
        {words.map((word, index) => (
          <div
            key={word.id}
            className={`orb${index === currentIndex ? ' active' : ''}`}
            onClick={() => onSelect(index)}
            title={word.word}
          >
            {word.thumbnail_url ? (
              <img src={word.thumbnail_url} alt={word.word} />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  background: `hsl(${(index * 40) % 360}, 60%, 40%)`,
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
