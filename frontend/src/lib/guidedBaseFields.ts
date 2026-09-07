/** Shared by offline generation and runtime verification. IDs are structural, never translated text. */
export type GuidedBaseField = { key: string; value: Record<string, string>; source: string; sourceLocale: 'en' | 'de'; targetText?: string }

export function collectGuidedBaseFields(lessons: readonly { id: string }[], paths: readonly { id: string }[]): GuidedBaseField[] {
  const fields: GuidedBaseField[] = []
  function visit(value: unknown, key: string, targetText?: string) {
    if (!value || typeof value !== 'object') return
    if (Array.isArray(value)) { value.forEach((item, i) => visit(item, `${key}/${i}`, targetText)); return }
    const record = value as Record<string, unknown>
    const keys = Object.keys(record)
    if (keys.length && keys.every(k => ['en','de','fr','es','it','pt','id','pl','ru','ko','ja','ceb'].includes(k) && typeof record[k] === 'string') && (typeof record.en === 'string' || typeof record.de === 'string')) {
      const sourceLocale = typeof record.en === 'string' && record.en.trim() ? 'en' : 'de'
      const source = String(record[sourceLocale] ?? '').trim()
      if (source) fields.push({ key, value: record as Record<string,string>, source, sourceLocale, targetText })
      return
    }
    const context = typeof record.targetText === 'string' ? record.targetText : typeof record.targetPhrase === 'string' ? record.targetPhrase : targetText
    for (const [childKey, child] of Object.entries(record)) visit(child, `${key}/${childKey}`, context)
  }
  lessons.forEach(lesson => visit(lesson, `lessons/${lesson.id}`))
  paths.forEach(path => visit(path, `paths/${path.id}`))
  return fields
}

// Non-cryptographic change fingerprint; no security decisions rely on it.
export function guidedEditionFingerprint(fields: GuidedBaseField[]): string {
  let hash = 2166136261
  for (const f of fields) {
    const text = JSON.stringify([f.key, f.value.en ?? '', f.value.de ?? '', f.targetText ?? ''])
    for (let i = 0; i < text.length; i++) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 16777619) }
  }
  return (hash >>> 0).toString(16).padStart(8,'0')
}
