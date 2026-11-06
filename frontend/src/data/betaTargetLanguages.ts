/** Selectable learning targets, using profile names (Bisaya is Cebuano). */
export const BETA_TARGET_LANGUAGES = [
  'English', 'German', 'Spanish', 'French', 'Italian', 'Portuguese', 'Bisaya', 'Indonesian', 'Korean',
  'Polish', 'Japanese', 'Russian',
] as const

const visible = new Set<string>(BETA_TARGET_LANGUAGES)
export const isVisibleTargetValue = (value: string): boolean => visible.has(value)
