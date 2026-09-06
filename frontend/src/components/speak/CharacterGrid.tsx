import { CHARACTER_REGISTRY, type TutorCharacter } from '@/characterRegistry'
import { useState } from 'react'
import { CURATED_GEMINI_VOICES, getGeminiVoiceAvatarUrl } from '@/data/geminiVoices'
import { useTranslation } from '@/hooks/useTranslation'
import { VoiceSampleButton } from './VoiceSampleButton'
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
  /** Target language — needed for classic-voice sample previews. */
  language?: string
  /** When set, a "Classic voices" section (curated Gemini voices) is appended. */
  onClassicVoiceSelect?: (voiceName: string) => void
  /** Hide character sections whenever the selected language has no Voxtral voice. */
  voxtralAvailable?: boolean
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

const SECTION_LABEL_CLASS = 'text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3'

export function CharacterGrid({
  onSelect,
  disabled,
  language,
  onClassicVoiceSelect,
  voxtralAvailable = true,
}: CharacterGridProps) {
  const { t } = useTranslation()
  const [nowPlaying, setNowPlaying] = useState<string | null>(null)
  const showClassicVoices = !!onClassicVoiceSelect && !!language

  return (
    <div className="space-y-5">
      {voxtralAvailable && (
        <>
          {/* Style Tutors */}
          <div>
            <h3 className={SECTION_LABEL_CLASS}>{t('speak.grid.styleTutors')}</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {styleTutors.map((char, index) => (
                <button
                  key={char.id}
                  onClick={() => onSelect(char)}
                  disabled={disabled}
                  className="speak-glass-card flex min-h-[144px] flex-col items-center justify-center gap-2 px-3 py-4 transition-all hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:bg-[var(--surface-glass-strong)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CharacterAvatar
                    name={char.name}
                    gender={char.gender}
                    avatarUrl={getStyleTutorAvatarUrl(char.name)}
                    loading={getStyleTutorAvatarLoading(index)}
                    framed
                  />
                  <span className="text-xs font-medium text-[var(--text-primary)] truncate w-full text-center">{char.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Separator */}
          <div className="border-t border-[var(--border-subtle)]" />

          {/* Persona + Public Characters */}
          <div>
            <h3 className={SECTION_LABEL_CLASS}>{t('speak.grid.characters')}</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {personaCharacters.map((char) => (
                <button
                  key={char.id}
                  onClick={() => onSelect(char)}
                  disabled={disabled}
                  className="speak-glass-card flex min-h-[144px] flex-col items-center justify-center gap-2 px-3 py-4 transition-all hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:bg-[var(--surface-glass-strong)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CharacterAvatar name={char.name} gender={char.gender} avatarUrl={char.avatarUrl} />
                  <span className="text-xs font-medium text-[var(--text-primary)] truncate w-full text-center">{char.name}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {showClassicVoices && (
        <>
          {voxtralAvailable && <div className="border-t border-[var(--border-subtle)]" />}

          {/* Curated Gemini voices, cast as comic-mascot "classic voices". */}
          <div>
            <h3 className={SECTION_LABEL_CLASS}>{t('speak.grid.classicVoices')}</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {CURATED_GEMINI_VOICES.map((voice) => (
                <div key={voice.name} className="speak-glass-card relative transition-all hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:bg-[var(--surface-glass-strong)]">
                  <button
                    onClick={() => onClassicVoiceSelect?.(voice.name)}
                    disabled={disabled}
                    className="flex w-full min-h-[144px] flex-col items-center justify-center gap-2 rounded-2xl px-3 py-4 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <CharacterAvatar
                      name={voice.name}
                      gender="female"
                      avatarUrl={getGeminiVoiceAvatarUrl(voice.name)}
                      loading="lazy"
                      framed
                    />
                    <span className="text-xs font-medium text-[var(--text-primary)] truncate w-full text-center">{voice.name}</span>
                    <span className="text-[10px] text-[var(--text-muted)] truncate w-full text-center">{voice.tone}</span>
                  </button>
                  <div className="absolute top-1.5 right-1.5">
                    <VoiceSampleButton
                      voiceName={voice.name}
                      language={language!}
                      nowPlaying={nowPlaying}
                      onPlayStart={setNowPlaying}
                      onPlayEnd={() => setNowPlaying(null)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
