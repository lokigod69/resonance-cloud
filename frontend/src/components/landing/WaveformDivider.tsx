const BAR_HEIGHTS = [
  0.20, 0.35, 0.50, 0.65, 0.72, 0.80, 0.88, 0.78, 0.92, 0.70, 0.85, 0.75,
  0.68, 0.80, 0.90, 0.95, 1.00, 0.88, 0.92, 0.85, 0.90, 0.95, 1.00, 0.92,
  0.88, 0.95, 0.90, 0.85, 0.80, 0.88, 0.92, 0.78, 0.85, 0.72, 0.80, 0.68,
  0.75, 0.60, 0.50, 0.40, 0.28, 0.18,
]

const BAR_WIDTH = 8
const BAR_SPACING = 16.6
const CENTER_Y = 40
const MAX_HALF_HEIGHT = 30

export default function WaveformDivider() {
  return (
    <div className="hidden md:flex justify-center py-8 opacity-75">
      <svg
        viewBox="0 0 700 80"
        width="100%"
        style={{ maxWidth: 700 }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--waveform-low, #a855f7)" />
            <stop offset="50%" stopColor="var(--waveform-mid, #ec4899)" />
            <stop offset="100%" stopColor="var(--waveform-low, #3b82f6)" />
          </linearGradient>
          <filter id="waveGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <style>{`
            @keyframes waveformPulse {
              0%, 100% { transform: scaleY(1); }
              50% { transform: scaleY(1.35); }
            }
            @media (prefers-reduced-motion: reduce) {
              .wf-bar { animation: none !important; }
            }
          `}</style>
        </defs>

        <g filter="url(#waveGlow)">
          {BAR_HEIGHTS.map((h, i) => {
            const halfH = h * MAX_HALF_HEIGHT
            const x = 7 + i * BAR_SPACING
            const fill = h >= 0.95 ? 'var(--waveform-peak, #ec4899)' : 'url(#waveGradient)'
            return (
              <g
                key={i}
                className="wf-bar"
                style={{
                  animation: `waveformPulse 2.8s ease-in-out infinite`,
                  animationDelay: `${i * 0.06}s`,
                  transformOrigin: `${x + BAR_WIDTH / 2}px ${CENTER_Y}px`,
                }}
              >
                {/* Bar going up */}
                <rect
                  x={x}
                  y={CENTER_Y - halfH}
                  width={BAR_WIDTH}
                  height={halfH}
                  rx={BAR_WIDTH / 2}
                  fill={fill}
                />
                {/* Bar going down */}
                <rect
                  x={x}
                  y={CENTER_Y}
                  width={BAR_WIDTH}
                  height={halfH}
                  rx={BAR_WIDTH / 2}
                  fill={fill}
                />
              </g>
            )
          })}
        </g>
      </svg>
    </div>
  )
}
