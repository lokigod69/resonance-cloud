import { CHARACTER_REGISTRY, type TutorCharacter } from '@/characterRegistry'

interface CharacterGridProps {
  onSelect: (char: TutorCharacter) => void
  disabled?: boolean
}

function CharacterAvatar({ name, gender, avatarUrl }: { name: string; gender: string; avatarUrl?: string }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className="w-14 h-14 rounded-full object-cover shrink-0"
      />
    )
  }
  const hue = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360
  const sat = gender === 'female' ? '65%' : '55%'
  return (
    <div
      className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0"
      style={{ backgroundColor: `hsl(${hue}, ${sat}, 40%)` }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

const styleTutors = CHARACTER_REGISTRY.filter(c => c.tier === 'style')
const personaCharacters = CHARACTER_REGISTRY.filter(c => c.tier === 'persona' || c.tier === 'public')

export function CharacterGrid({ onSelect, disabled }: CharacterGridProps) {
  return (
    <div className="space-y-5">
      {/* Style Tutors */}
      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">STYLE TUTORS</h3>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {styleTutors.map((char) => (
            <button
              key={char.id}
              onClick={() => onSelect(char)}
              disabled={disabled}
              className="flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl bg-gray-800/50 border border-white/5 hover:bg-gray-700/60 hover:border-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CharacterAvatar name={char.name} gender={char.gender} avatarUrl={char.avatarUrl} />
              <span className="text-xs font-medium text-white truncate w-full text-center">{char.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Separator */}
      <div className="border-t border-white/5" />

      {/* Persona + Public Characters */}
      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">CHARACTERS</h3>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {personaCharacters.map((char) => (
            <button
              key={char.id}
              onClick={() => onSelect(char)}
              disabled={disabled}
              className="flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl bg-gray-800/50 border border-white/5 hover:bg-gray-700/60 hover:border-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CharacterAvatar name={char.name} gender={char.gender} avatarUrl={char.avatarUrl} />
              <span className="text-xs font-medium text-white truncate w-full text-center">{char.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
