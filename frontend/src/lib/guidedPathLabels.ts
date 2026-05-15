import type { GuidedPathMetadata } from '@/data/guidedLessons'

const GUIDED_PATH_LABELS: Record<string, string> = {
  'english-a1-practical-1': 'English A1 P1',
  'english-a1-practical-2': 'English A1 P2',
  'english-a1-practical-3': 'English A1 P3',
  'english-a1-practical-4': 'English A1 P4',
  'english-a1-practical-5': 'English A1 P5',
  'english-a1-practical-6': 'English A1 P6',
}

export function formatGuidedPathLabel(path: GuidedPathMetadata | undefined) {
  if (!path) return 'English A1'
  return GUIDED_PATH_LABELS[path.id] ?? path.shortTitle
}
