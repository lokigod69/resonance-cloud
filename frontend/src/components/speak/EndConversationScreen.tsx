import { FlagIcon } from '@/components/ui/FlagIcon'
import { useTranslation } from '@/hooks/useTranslation'

interface EndConversationScreenProps {
  tutor: 'voxtral' | 'gemini'
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  conversationId: string | null
  targetLanguage: string
  baseLanguage: string
  onStartNew: () => void
  onExtract: () => void
}

export function EndConversationScreen({
  tutor,
  messages,
  targetLanguage,
  onStartNew,
  onExtract,
}: EndConversationScreenProps) {
  const { t } = useTranslation()

  return (
    <div className="speak-chat-shell fixed inset-x-0 bottom-0 top-[var(--glassy-header-offset)] z-30 flex flex-col">
      <div className="speak-chatbar shrink-0 border-b">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-2 px-4 py-3">
          <FlagIcon code={targetLanguage} className="w-6 h-auto shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium capitalize text-[var(--text-primary)] truncate">{tutor}</p>
            <p className="text-xs text-[var(--text-muted)] truncate">{t('speak.conversationEnded')}</p>
          </div>
        </div>
      </div>

      <div
        className="speak-scroll-region mx-auto w-full max-w-5xl flex-1 space-y-3 overflow-y-auto px-4 py-4"
        style={{ scrollbarWidth: 'thin' }}
      >
        {messages.map((msg, i) => (
          <div
            key={`${msg.role}-${i}`}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed long-copy ${
                msg.role === 'user'
                  ? 'speak-message-user rounded-br-sm'
                  : 'speak-message-assistant rounded-bl-sm'
              }`}
            >
              <p className="long-copy">{msg.content}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="speak-chatbar shrink-0 border-t">
        <div className="mx-auto w-full max-w-5xl px-4 pt-5 pb-[calc(var(--app-safe-bottom)+1.25rem)]">
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onStartNew}
              className="speak-accent-action px-5 py-3 rounded-full text-sm font-medium transition-colors"
            >
              {t('speak.startNewConversation')}
            </button>
            <button
              type="button"
              onClick={onExtract}
              className="px-5 py-3 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-glass)] text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-glass-strong)]"
            >
              {t('speak.extractWords.button')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
