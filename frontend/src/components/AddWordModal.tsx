import { useState, useEffect } from 'react'
import { X, Loader, Plus } from 'lucide-react'
import { addWord, getSupportedLanguages } from '../api'

interface AddWordModalProps {
  onClose: () => void
  onAdded: () => void
}

export function AddWordModal({ onClose, onAdded }: AddWordModalProps) {
  const [languages, setLanguages] = useState<string[]>([])
  const [word, setWord] = useState('')
  const [translation, setTranslation] = useState('')
  const [language, setLanguage] = useState('')
  const [mnemonic, setMnemonic] = useState('')
  const [etymology, setEtymology] = useState('')
  const [example, setExample] = useState('')
  const [tags, setTags] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getSupportedLanguages().then(langs => {
      setLanguages(langs)
      if (langs.length > 0) setLanguage(langs[0])
    }).catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!word.trim() || !translation.trim() || !language) return
    setSaving(true)
    setError(null)
    try {
      await addWord({
        word: word.trim(),
        translation: translation.trim(),
        language,
        mnemonic: mnemonic.trim() || undefined,
        etymology: etymology.trim() || undefined,
        example: example.trim() || undefined,
        tags: tags.trim() || undefined,
      })
      onAdded()
      onClose()
    } catch (err: any) {
      setError(err.message)
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-[var(--bg-panel)] border border-[var(--border)] rounded-lg w-[480px] max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Add Word</h2>
          <button onClick={onClose} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[var(--text-muted)] block mb-1">Word or phrase *</label>
              <input
                type="text"
                value={word}
                onChange={e => setWord(e.target.value)}
                className="w-full bg-[var(--bg-base)] border border-[var(--border)] rounded px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                placeholder="e.g. Schadenfreude, guten Morgen"
                maxLength={50}
                autoFocus
                required
              />
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)] block mb-1">Translation *</label>
              <input
                type="text"
                value={translation}
                onChange={e => setTranslation(e.target.value)}
                className="w-full bg-[var(--bg-base)] border border-[var(--border)] rounded px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                placeholder="e.g. pleasure from misfortune"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-[var(--text-muted)] block mb-1">Language *</label>
            <select
              value={language}
              onChange={e => setLanguage(e.target.value)}
              className="w-full bg-[var(--bg-base)] border border-[var(--border)] rounded px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] capitalize"
              required
            >
              {languages.map(lang => (
                <option key={lang} value={lang} className="capitalize">{lang}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-[var(--text-muted)] block mb-1">Mnemonic</label>
            <input
              type="text"
              value={mnemonic}
              onChange={e => setMnemonic(e.target.value)}
              className="w-full bg-[var(--bg-base)] border border-[var(--border)] rounded px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              placeholder="Memory aid..."
            />
          </div>

          <div>
            <label className="text-xs text-[var(--text-muted)] block mb-1">Etymology</label>
            <input
              type="text"
              value={etymology}
              onChange={e => setEtymology(e.target.value)}
              className="w-full bg-[var(--bg-base)] border border-[var(--border)] rounded px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              placeholder="Word origin..."
            />
          </div>

          <div>
            <label className="text-xs text-[var(--text-muted)] block mb-1">Example</label>
            <input
              type="text"
              value={example}
              onChange={e => setExample(e.target.value)}
              className="w-full bg-[var(--bg-base)] border border-[var(--border)] rounded px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              placeholder="Example sentence..."
            />
          </div>

          <div>
            <label className="text-xs text-[var(--text-muted)] block mb-1">Tags (comma-separated)</label>
            <input
              type="text"
              value={tags}
              onChange={e => setTags(e.target.value)}
              className="w-full bg-[var(--bg-base)] border border-[var(--border)] rounded px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              placeholder="humor, colloquial"
            />
          </div>

          {error && (
            <div className="text-xs text-[var(--error)] bg-[var(--error)]/10 border border-[var(--error)]/20 rounded px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-[var(--text-secondary)] border border-[var(--border)] rounded hover:bg-[var(--bg-hover)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !word.trim() || !translation.trim()}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-[var(--accent)] text-white rounded hover:bg-[var(--accent)]/80 disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader size={12} className="animate-spin" /> : <Plus size={12} />}
              Add Word
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


interface LanguagePickerModalProps {
  onSelect: (language: string) => void
  onClose: () => void
}

export function LanguagePickerModal({ onSelect, onClose }: LanguagePickerModalProps) {
  const [languages, setLanguages] = useState<string[]>([])
  const [selected, setSelected] = useState('')

  useEffect(() => {
    getSupportedLanguages().then(langs => {
      setLanguages(langs)
      if (langs.length > 0) setSelected(langs[0])
    }).catch(() => {})
  }, [])

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-[var(--bg-panel)] border border-[var(--border)] rounded-lg w-[380px]"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Select Language</h2>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            This CSV doesn't have a language column. What language are these words?
          </p>
        </div>
        <div className="p-5 space-y-4">
          <select
            value={selected}
            onChange={e => setSelected(e.target.value)}
            className="w-full bg-[var(--bg-base)] border border-[var(--border)] rounded px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] capitalize"
          >
            {languages.map(lang => (
              <option key={lang} value={lang} className="capitalize">{lang}</option>
            ))}
          </select>
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs text-[var(--text-secondary)] border border-[var(--border)] rounded hover:bg-[var(--bg-hover)]"
            >
              Cancel
            </button>
            <button
              onClick={() => selected && onSelect(selected)}
              disabled={!selected}
              className="px-4 py-2 text-xs font-medium bg-[var(--accent)] text-white rounded hover:bg-[var(--accent)]/80 disabled:opacity-50 transition-colors"
            >
              Import with this language
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
