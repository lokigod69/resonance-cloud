// readCurriculumMetadata — the `metadata.curriculum` reader, split out of
// `curriculumDeckBridge` so light callers (the Home audio lookup) do not pull
// the bridge's static imports of the category data and the German curriculum
// JSON into their chunk. The bridge re-exports it.

export function readCurriculumMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const metadata = value as Record<string, unknown>
  const curriculum = metadata.curriculum
  if (!curriculum || typeof curriculum !== 'object' || Array.isArray(curriculum)) return {}
  return curriculum as Record<string, unknown>
}
