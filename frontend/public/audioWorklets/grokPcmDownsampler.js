// AudioWorklet processor for Grok Voice Agent.
// Input: Float32 audio at AudioContext native sample rate (typically 48000 Hz).
// Output: 24000 Hz Int16 PCM LE, base64-encoded, posted to main thread.

class GrokPcmDownsampler extends AudioWorkletProcessor {
  constructor(options) {
    super()
    this.sourceRate = sampleRate
    this.targetRate = 24000
    this.ratio = this.sourceRate / this.targetRate
    this.acc = 0
    this.buffer = []
    this.stopped = false
    this.port.onmessage = (event) => {
      if (event.data?.type === 'flush_and_stop') {
        this.stopped = true
        this.flushBuffer(true)
      } else if (event.data?.type === 'flush') {
        this.flushBuffer(true)
      } else if (event.data?.type === 'reset') {
        this.buffer = []
        this.acc = 0
        this.stopped = false
      }
    }
  }

  flushBuffer(notify = false) {
    if (this.buffer.length > 0) {
      const bytes = new Uint8Array(this.buffer.length * 2)
      const dv = new DataView(bytes.buffer)
      for (let i = 0; i < this.buffer.length; i++) {
        dv.setInt16(i * 2, this.buffer[i], true)
      }
      let bin = ''
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
      this.port.postMessage({ type: 'pcm', data: bin })
      this.buffer = []
    }

    if (notify) {
      this.port.postMessage({ type: 'flush_complete' })
    }
  }

  process(inputs) {
    if (this.stopped) return true
    const input = inputs[0]
    if (!input || input.length === 0) return true
    const channel = input[0]
    if (!channel) return true

    // Linear interpolation downsample. For input rate / 24000 ratio — fine for voice.
    for (let i = 0; i < channel.length; i++) {
      this.acc += 1
      while (this.acc >= this.ratio) {
        const idx = i
        const sample = channel[idx]
        const clipped = Math.max(-1, Math.min(1, sample))
        const int16 = clipped < 0 ? clipped * 0x8000 : clipped * 0x7FFF
        this.buffer.push(int16 | 0)
        this.acc -= this.ratio
      }
    }

    // Flush every ~100ms worth of samples (2400 samples at 24 kHz).
    if (this.buffer.length >= 2400) {
      this.flushBuffer()
    }

    return true
  }
}

registerProcessor('grok-pcm-downsampler', GrokPcmDownsampler)
