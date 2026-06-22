import { NEW_WORDS_PER_DAY_OPTIONS } from '@/lib/dailyHabits'
import { cn } from '@/lib/utils'

type NewWordsPerDaySelectorProps = {
  value: number
  disabled?: boolean
  onChange: (value: number) => void
}

export function NewWordsPerDaySelector({
  value,
  disabled = false,
  onChange,
}: NewWordsPerDaySelectorProps) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {NEW_WORDS_PER_DAY_OPTIONS.map((option) => {
        const isSelected = value === option

        return (
          <button
            key={option}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option)}
            className={cn(
              'min-h-11 rounded-lg border px-3 py-2 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60',
              isSelected
                ? 'border-[var(--accent)] bg-accent text-[var(--on-accent)] shadow-[0_0_18px_var(--accent-glow)] hover:bg-accent'
                : 'theme-chip',
            )}
          >
            {option}
          </button>
        )
      })}
    </div>
  )
}
