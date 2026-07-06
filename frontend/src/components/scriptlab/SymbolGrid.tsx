import type { ScriptSection, ScriptSymbol } from '@/lib/scriptlab/types'
import { localizeScriptText } from '@/lib/scriptlab/types'
import { cn } from '@/lib/utils'

type SymbolGridProps = {
  section: ScriptSection
  symbols: ScriptSymbol[]
  locale: string
  seenSymbolIds: ReadonlySet<string>
  onSelect: (symbol: ScriptSymbol) => void
}

export function SymbolGrid({ section, symbols, locale, seenSymbolIds, onSelect }: SymbolGridProps) {
  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h3 className="font-display text-lg font-semibold text-[var(--text-primary)]">
          {localizeScriptText(section.title, locale)}
        </h3>
        <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
          {localizeScriptText(section.description, locale)}
        </p>
      </div>

      <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-5 md:grid-cols-7">
        {symbols.map((symbol) => {
          const seen = seenSymbolIds.has(symbol.id)
          return (
            <button
              key={symbol.id}
              type="button"
              onClick={() => onSelect(symbol)}
              aria-label={symbol.name ? `${symbol.character} ${symbol.name}` : symbol.character}
              className={cn(
                'group relative flex min-h-[56px] flex-col items-center justify-center gap-0.5 rounded-2xl border bg-[var(--surface-glass)] px-1 py-3 transition-transform duration-150 hover:scale-[1.03] hover:border-[var(--accent)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30',
                seen
                  ? 'border-[color-mix(in_srgb,var(--accent)_40%,var(--border-subtle))]'
                  : 'border-[var(--border-subtle)]',
              )}
            >
              {seen && (
                <span
                  className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[var(--accent)]"
                  aria-hidden="true"
                />
              )}
              <span className="font-display text-3xl leading-none text-[var(--text-primary)] sm:text-4xl">
                {symbol.character}
              </span>
              <span className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                {symbol.romanization}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
