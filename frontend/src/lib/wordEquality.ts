/**
 * Canonical word-equality predicate for the wizard.
 *
 * Two words are "equal" if they are the same after:
 *   - NFC-normalising both
 *   - lowercasing both
 *   - trimming whitespace on both
 *
 * Used by the reducer's ADD_WORD and ADD_WORDS dedup, by WordsStep's
 * flush-race protection, by Glassy's wordsStepDispatch adapter, and
 * anywhere else words are compared for sameness.
 */
export function wordsEqual(a: string, b: string): boolean {
  return (
    a.trim().normalize('NFC').toLowerCase() ===
    b.trim().normalize('NFC').toLowerCase()
  )
}
