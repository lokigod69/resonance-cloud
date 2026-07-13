import Phaser from 'phaser'

const signKeysByScene = new WeakMap<Phaser.Scene, Set<string>>()

export function ensureSignTexture(scene: Phaser.Scene, cacheKey: string, term: string): string {
  if (scene.textures.exists(cacheKey)) return cacheKey
  const canvas = document.createElement('canvas')
  canvas.width = 520
  canvas.height = 260
  const context = canvas.getContext('2d')
  if (!context) return cacheKey

  roundedRect(context, 12, 12, canvas.width - 24, canvas.height - 24, 34)
  context.fillStyle = '#101b38'
  context.fill()
  context.lineWidth = 8
  context.strokeStyle = '#f7c843'
  context.shadowColor = 'rgba(247, 200, 67, 0.55)'
  context.shadowBlur = 18
  context.stroke()
  context.shadowBlur = 0
  context.fillStyle = 'rgba(255,255,255,0.08)'
  roundedRect(context, 24, 24, canvas.width - 48, 54, 22)
  context.fill()

  const lines = fitTerm(context, term, canvas.width - 70, canvas.height - 66)
  const fontSize = lines.fontSize
  context.fillStyle = '#ffffff'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.font = `700 ${fontSize}px Arial, sans-serif`
  context.shadowColor = 'rgba(0,0,0,0.6)'
  context.shadowBlur = 6
  const lineHeight = fontSize * 1.08
  const startY = canvas.height / 2 - ((lines.values.length - 1) * lineHeight) / 2 + 12
  lines.values.forEach((line, index) => context.fillText(line, canvas.width / 2, startY + index * lineHeight))
  context.shadowBlur = 0

  scene.textures.addCanvas(cacheKey, canvas)
  const keys = signKeysByScene.get(scene) ?? new Set<string>()
  keys.add(cacheKey)
  signKeysByScene.set(scene, keys)
  return cacheKey
}

export function releaseSignTextures(scene: Phaser.Scene): void {
  const keys = signKeysByScene.get(scene)
  keys?.forEach((key) => scene.textures.remove(key))
  signKeysByScene.delete(scene)
}

function fitTerm(context: CanvasRenderingContext2D, term: string, maxWidth: number, maxHeight: number): { values: string[]; fontSize: number } {
  const cleaned = term.trim() || term
  const candidates = [
    [cleaned],
    splitTerm(cleaned),
  ].filter((lines, index) => index === 0 || lines.length <= 2)
  let best = { values: [cleaned], fontSize: 28 }
  for (const values of candidates) {
    for (let size = 68; size >= 28; size -= 2) {
      context.font = `700 ${size}px Arial, sans-serif`
      const widest = Math.max(...values.map((line) => context.measureText(line).width))
      if (widest <= maxWidth && values.length * size * 1.08 <= maxHeight) {
        if (size > best.fontSize) best = { values, fontSize: size }
        break
      }
    }
  }
  return best
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
