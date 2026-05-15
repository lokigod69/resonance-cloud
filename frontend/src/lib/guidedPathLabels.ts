import type { GuidedPathMetadata } from '@/data/guidedLessons'

const GUIDED_PATH_LABELS: Record<string, string> = {
  'english-a1-practical-1': 'English A1 P1',
  'english-a1-practical-2': 'English A1 P2',
  'english-a1-practical-3': 'English A1 P3',
  'english-a1-practical-4': 'English A1 P4',
  'english-a1-practical-5': 'English A1 P5',
  'english-a1-practical-6': 'English A1 P6',
  'english-a1-practical-7': 'English A1 P7',
  'english-a1-practical-8': 'English A1 P8',
  'english-a1-practical-9': 'English A1 P9',
  'english-a1-practical-10': 'English A1 P10',
}

export function formatGuidedPathLabel(path: GuidedPathMetadata | undefined) {
  if (!path) return 'English A1'
  return GUIDED_PATH_LABELS[path.id] ?? path.shortTitle
}
