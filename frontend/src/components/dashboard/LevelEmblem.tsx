const LEVEL_COLORS: Record<number, string> = {
  1: '#8B8B8B',
  2: '#B87333',
  3: '#C67D4A',
  4: '#A8B4C0',
  5: '#6B8DAE',
  6: '#D4A843',
  7: '#C5962B',
  8: '#3EA87B',
  9: '#4A6FA5',
  10: '#8B5CF6',
}

// Levels whose fill is light enough to need dark text
const DARK_TEXT_LEVELS = new Set([4, 6, 7, 8])

function getLevelColor(level: number): string {
  return LEVEL_COLORS[Math.min(level, 10)] ?? LEVEL_COLORS[10]!
}

// Base shield path (28x28 viewBox) — classic pointed-bottom shape
const SHIELD = 'M14 2.5 C9.5 2.5 4 5 4 10.5 C4 17.5 14 25.5 14 25.5 C14 25.5 24 17.5 24 10.5 C24 5 18.5 2.5 14 2.5 Z'

export function getLevelEmblem(level: number): React.ReactElement {
  const vis = Math.min(level, 10)
  const color = getLevelColor(level)
  const filled = vis >= 2
  const textColor = DARK_TEXT_LEVELS.has(vis) ? '#1a1a1a' : '#ffffff'
  const displayNum = level.toString()

  return (
    <svg
      width={28}
      height={28}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="flex-shrink-0"
      aria-label={`Level ${level}`}
    >
      {/* L6+ outer glow ring */}
      {vis >= 6 && (
        <path
          d={SHIELD}
          fill="none"
          stroke={color}
          strokeWidth={0.6}
          strokeOpacity={0.35}
          transform="scale(1.08) translate(-1.12, -0.7)"
        />
      )}

      {/* L10 crown/star at top */}
      {vis >= 10 && (
        <polygon
          points="14,0.5 15.2,2.2 14,1.6 12.8,2.2"
          fill={color}
          stroke={color}
          strokeWidth={0.4}
        />
      )}

      {/* L9+ small star above shield */}
      {vis >= 9 && vis < 10 && (
        <polygon
          points="14,1 14.6,2.3 13.4,2.3"
          fill={color}
        />
      )}

      {/* L7+ wing stubs — left */}
      {vis >= 7 && (
        <>
          <path
            d={vis >= 10
              ? 'M4 10.5 C2.5 9 1 8.5 0.5 9.5 C0.8 10.5 2 11.5 4 12'
              : 'M4.5 10.5 C3 9.5 2 9.5 1.8 10.3 C2.2 11 3.2 11.5 4.5 11.8'
            }
            fill={color}
            fillOpacity={vis >= 10 ? 0.9 : 0.7}
          />
          {/* right wing */}
          <path
            d={vis >= 10
              ? 'M24 10.5 C25.5 9 27 8.5 27.5 9.5 C27.2 10.5 26 11.5 24 12'
              : 'M23.5 10.5 C25 9.5 26 9.5 26.2 10.3 C25.8 11 24.8 11.5 23.5 11.8'
            }
            fill={color}
            fillOpacity={vis >= 10 ? 0.9 : 0.7}
          />
        </>
      )}

      {/* Main shield body */}
      <path
        d={SHIELD}
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth={filled ? 0.7 : 1.5}
        strokeLinejoin="round"
      />

      {/* L3+ horizontal divider across shield */}
      {vis >= 3 && (
        <line
          x1={7}
          y1={10}
          x2={21}
          y2={10}
          stroke={filled ? (DARK_TEXT_LEVELS.has(vis) ? '#1a1a1a' : '#ffffff') : color}
          strokeWidth={0.6}
          strokeOpacity={0.45}
        />
      )}

      {/* L4+ chevron at bottom */}
      {vis >= 4 && (
        <polyline
          points="11,18 14,20.5 17,18"
          fill="none"
          stroke={DARK_TEXT_LEVELS.has(vis) ? '#1a1a1a' : '#ffffff'}
          strokeWidth={0.7}
          strokeOpacity={0.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* L5+ two accent dots near top */}
      {vis >= 5 && (
        <>
          <circle cx={9.5} cy={7} r={0.8} fill={DARK_TEXT_LEVELS.has(vis) ? '#1a1a1a' : '#ffffff'} fillOpacity={0.5} />
          <circle cx={18.5} cy={7} r={0.8} fill={DARK_TEXT_LEVELS.has(vis) ? '#1a1a1a' : '#ffffff'} fillOpacity={0.5} />
        </>
      )}

      {/* L8+ top notch detail */}
      {vis >= 8 && (
        <path
          d="M12 4.5 L14 3.5 L16 4.5"
          fill="none"
          stroke={DARK_TEXT_LEVELS.has(vis) ? '#1a1a1a' : '#ffffff'}
          strokeWidth={0.6}
          strokeOpacity={0.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* Level number centered in shield */}
      <text
        x={14}
        y={vis >= 3 ? 16 : 15.5}
        textAnchor="middle"
        dominantBaseline="central"
        fill={filled ? textColor : color}
        fontSize={displayNum.length > 1 ? 8 : 9.5}
        fontWeight={700}
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        {displayNum}
      </text>
    </svg>
  )
}
