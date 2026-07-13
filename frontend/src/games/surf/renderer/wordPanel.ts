import * as THREE from 'three'

/** Panels are ~2.4 MB of GPU memory each (1024×576 RGBA) — a large deck must not
 * accumulate one per unique term for the whole session. LRU-capped well above the
 * 3 live buoys so eviction can never touch a texture still on screen. */
const MAX_CACHED_PANELS = 24

export class WordPanelCache {
  private readonly textures = new Map<string, THREE.CanvasTexture>()

  get(term: string): THREE.CanvasTexture {
    const existing = this.textures.get(term)
    if (existing) {
      // Re-insert to mark as most recently used (Map preserves insertion order).
      this.textures.delete(term)
      this.textures.set(term, existing)
      return existing
    }
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 576
    const context = canvas.getContext('2d')
    if (!context) throw new Error('surf: canvas text rendering unavailable')
    roundedRect(context, 22, 22, 980, 532, 58)
    context.fillStyle = 'rgba(10,16,32,0.92)'
    context.fill()
    context.lineWidth = 6
    context.strokeStyle = '#f7c843'
    context.stroke()
    const lines = fitTerm(context, term.trim() || term, 890, 390)
    context.fillStyle = '#ffffff'
    context.font = `700 ${lines.fontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.shadowColor = 'rgba(0,0,0,0.58)'
    context.shadowBlur = 10
    const lineHeight = lines.fontSize * 1.08
    const startY = canvas.height / 2 - (lines.values.length - 1) * lineHeight / 2
    lines.values.forEach((line, index) => context.fillText(line, canvas.width / 2, startY + index * lineHeight))
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.minFilter = THREE.LinearFilter
    texture.generateMipmaps = false
    this.textures.set(term, texture)
    while (this.textures.size > MAX_CACHED_PANELS) {
      const oldest = this.textures.keys().next().value as string
      this.textures.get(oldest)?.dispose()
      this.textures.delete(oldest)
    }
    return texture
  }

  dispose(): void {
    this.textures.forEach((texture) => texture.dispose())
    this.textures.clear()
  }
}

function fitTerm(context: CanvasRenderingContext2D, term: string, maxWidth: number, maxHeight: number): { values: string[]; fontSize: number } {
  const candidates = [[term], splitTerm(term)].filter((lines, index) => index === 0 || lines.length <= 2)
  for (const values of candidates) {
    for (let size = 128; size >= 30; size -= 2) {
      context.font = `700 ${size}px system-ui, sans-serif`
      if (Math.max(...values.map((line) => context.measureText(line).width)) <= maxWidth && values.length * size * 1.08 <= maxHeight) return { values, fontSize: size }
    }
  }
  return { values: [term], fontSize: 30 }
}

function splitTerm(term: string): string[] {
  const words = term.split(/\s+/).filter(Boolean)
  if (words.length > 1) {
    const midpoint = Math.ceil(words.length / 2)
    return [words.slice(0, midpoint).join(' '), words.slice(midpoint).join(' ')]
  }
  const characters = Array.from(term)
  const midpoint = Math.ceil(characters.length / 2)
  return [characters.slice(0, midpoint).join(''), characters.slice(midpoint).join('')]
}

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
  context.beginPath()
  context.moveTo(x + radius, y)
  context.arcTo(x + width, y, x + width, y + height, radius)
  context.arcTo(x + width, y + height, x, y + height, radius)
  context.arcTo(x, y + height, x, y, radius)
  context.arcTo(x, y, x + width, y, radius)
  context.closePath()
}
