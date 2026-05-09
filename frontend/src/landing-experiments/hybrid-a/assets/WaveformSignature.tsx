export function WaveformSignature({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 520 120"
      role="img"
      aria-label="Sonanda waveform signature"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        className="hybrid-a-waveform-glow"
        d="M10 68 C48 68 48 34 78 34 C112 34 110 92 144 92 C178 92 176 24 210 24 C244 24 242 76 276 76 C312 76 310 44 342 44 C374 44 378 84 410 84 C444 84 448 58 510 58"
        stroke="currentColor"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <path
        d="M10 68 C48 68 48 34 78 34 C112 34 110 92 144 92 C178 92 176 24 210 24 C244 24 242 76 276 76 C312 76 310 44 342 44 C374 44 378 84 410 84 C444 84 448 58 510 58"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {[78, 210, 342, 410].map((cx) => (
        <circle key={cx} cx={cx} cy={cx === 210 ? 24 : cx === 410 ? 84 : cx === 342 ? 44 : 34} r="4" fill="currentColor" />
      ))}
    </svg>
  )
}
