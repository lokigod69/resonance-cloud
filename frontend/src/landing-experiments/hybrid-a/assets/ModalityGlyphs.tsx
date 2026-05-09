const glyphs = [
  {
    label: 'Premium Cards',
    path: 'M18 16h28a6 6 0 0 1 6 6v24a6 6 0 0 1-6 6H18a6 6 0 0 1-6-6V22a6 6 0 0 1 6-6Zm6 10h16M24 34h24M24 42h10',
  },
  {
    label: 'Video & Music',
    path: 'M15 20h34a5 5 0 0 1 5 5v22a5 5 0 0 1-5 5H15a5 5 0 0 1-5-5V25a5 5 0 0 1 5-5Zm15 10 12 7-12 7V30Zm-14 25c8-6 14-6 22 0 7 5 13 5 20 0',
  },
  {
    label: 'Speak Practice',
    path: 'M32 10a9 9 0 0 0-9 9v12a9 9 0 0 0 18 0V19a9 9 0 0 0-9-9Zm-18 20c0 11 7 19 18 19s18-8 18-19M32 49v9M24 58h16',
  },
  {
    label: 'Study Modes',
    path: 'M18 14h28a4 4 0 0 1 4 4v28a4 4 0 0 1-4 4H18a4 4 0 0 1-4-4V18a4 4 0 0 1 4-4Zm7 9h14M25 32h22M25 41h12M48 18l-8 8',
  },
] as const

export function ModalityGlyphs() {
  return (
    <div className="hybrid-a-surfaces-grid" aria-label="Product surfaces">
      {glyphs.map((glyph) => (
        <div className="hybrid-a-surface" key={glyph.label}>
          <svg viewBox="0 0 64 64" aria-hidden="true" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d={glyph.path} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>{glyph.label}</span>
        </div>
      ))}
    </div>
  )
}
