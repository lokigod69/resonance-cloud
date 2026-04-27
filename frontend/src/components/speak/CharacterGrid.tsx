import { CHARACTER_REGISTRY, type TutorCharacter } from '@/characterRegistry'
import { useState } from 'react'
import {
  type AvatarLoading,
  getAvatarColors,
  getStyleTutorAvatarLoading,
  getStyleTutorAvatarUrl,
  getStyleTutorFallbackInitial,
} from './CharacterGrid.avatar'

interface CharacterGridProps {
  onSelect: (char: TutorCharacter) => void
  disabled?: boolean
}

function CharacterAvatar({
  name,
  gender,
  avatarUrl,
  loading = 'eager',
  framed = false,
}: {
  name: string
  gender: string
  avatarUrl?: string
  loading?: AvatarLoading
  framed?: boolean
}) {
  const [imageFailed, setImageFailed] = useState(false)
  const colors = getAvatarColors(name, gender)

  if (avatarUrl && !imageFailed) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        loading={loading}
        onError={() => setImageFailed(true)}
        className="w-14 h-14 rounded-full object-cover shrink-0"
        style={framed ? { border: `2px solid ${colors.ringColor}` } : undefined}
      />
    )
  }

  return (
    <div
      className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0"
      style={{ backgroundColor: colors.backgroundColor }}
    >
      {getStyleTutorFallbackInitial(name)}
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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {styleTutors.map((char, index) => (
            <button
              key={char.id}
              onClick={() => onSelect(char)}
              disabled={disabled}
              className="speak-glass-card flex min-h-[144px] flex-col items-center justify-center gap-2 px-3 py-4 transition-all hover:-translate-y-0.5 hover:border-indigo-200/30 hover:bg-slate-800/65 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CharacterAvatar
                name={char.name}
                gender={char.gender}
                avatarUrl={getStyleTutorAvatarUrl(char.name)}
                loading={getStyleTutorAvatarLoading(index)}
                framed
              />
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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {personaCharacters.map((char) => (
            <button
              key={char.id}
              onClick={() => onSelect(char)}
              disabled={disabled}
              className="speak-glass-card flex min-h-[144px] flex-col items-center justify-center gap-2 px-3 py-4 transition-all hover:-translate-y-0.5 hover:border-indigo-200/30 hover:bg-slate-800/65 disabled:cursor-not-allowed disabled:opacity-50"
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
