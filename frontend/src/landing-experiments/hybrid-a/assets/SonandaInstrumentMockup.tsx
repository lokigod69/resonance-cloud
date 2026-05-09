import { WaveformSignature } from './WaveformSignature'

const panels = [
  { label: 'image', value: 'visual concept', tone: 'mint' },
  { label: 'audio', value: 'voice + music', tone: 'indigo' },
  { label: 'mnemonic', value: 'memory hook', tone: 'brass' },
  { label: 'example', value: 'context line', tone: 'mint' },
] as const

export function SonandaInstrumentMockup() {
  return (
    <div className="hybrid-a-instrument" aria-label="Abstract Sonanda product mockup">
      <div className="hybrid-a-instrument-topbar">
        <span />
        <span />
        <span />
        <div className="hybrid-a-instrument-status">deck synthesis</div>
      </div>
      <div className="hybrid-a-instrument-stage">
        <div className="hybrid-a-signal-map" aria-hidden="true">
          <span className="signal-point point-a" />
          <span className="signal-point point-b" />
          <span className="signal-point point-c" />
        </div>
        <div className="hybrid-a-word-panel">
          <span>lexeme</span>
          <strong>erinnern</strong>
          <small>to remember</small>
        </div>
        <WaveformSignature className="hybrid-a-instrument-wave" />
      </div>
      <div className="hybrid-a-instrument-panels">
        {panels.map((panel) => (
          <div className="hybrid-a-mini-panel" data-tone={panel.tone} key={panel.label}>
            <span>{panel.label}</span>
            <strong>{panel.value}</strong>
          </div>
        ))}
      </div>
    </div>
  )
}
