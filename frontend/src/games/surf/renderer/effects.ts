import * as THREE from 'three'

export class SurfEffects {
  readonly group = new THREE.Group()
  private readonly geometry = new THREE.BufferGeometry()
  private readonly positions = new Float32Array(192 * 3)
  private readonly colors = new Float32Array(192 * 3)
  private readonly velocities = new Float32Array(192 * 3)
  private readonly life = new Float32Array(192)
  private readonly material = new THREE.PointsMaterial({ size: 0.25, transparent: true, opacity: 0.92, blending: THREE.AdditiveBlending, depthWrite: false, vertexColors: true })
  private readonly points: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>
  private next = 0
  private shakeMs = 0
  private reducedMotion = false

  constructor() {
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3))
    this.points = new THREE.Points(this.geometry, this.material)
    this.group.add(this.points)
  }

  setReducedMotion(on: boolean): void { this.reducedMotion = on }

  splash(position: THREE.Vector3, color: number): void {
    const count = this.reducedMotion ? 8 : 22
    const tint = new THREE.Color(color)
    for (let index = 0; index < count; index += 1) {
      const particle = (this.next + index) % this.life.length
      const offset = particle * 3
      const angle = particle * 2.399963
      const speed = 2.2 + (particle % 7) * 0.38
      this.positions[offset] = position.x
      this.positions[offset + 1] = position.y
      this.positions[offset + 2] = position.z
      this.velocities[offset] = Math.cos(angle) * speed
      this.velocities[offset + 1] = 2.2 + (particle % 5) * 0.38
      this.velocities[offset + 2] = Math.sin(angle) * speed
      this.colors[offset] = tint.r
      this.colors[offset + 1] = tint.g
      this.colors[offset + 2] = tint.b
      this.life[particle] = 0.35 + (particle % 5) * 0.08
    }
    this.next = (this.next + count) % this.life.length
  }

  shake(): void { if (!this.reducedMotion) this.shakeMs = 150 }

  update(deltaSec: number, camera: THREE.PerspectiveCamera): void {
    for (let index = 0; index < this.life.length; index += 1) {
      if (this.life[index] <= 0) continue
      const offset = index * 3
      this.life[index] -= deltaSec
      this.positions[offset] += this.velocities[offset] * deltaSec
      this.positions[offset + 1] += this.velocities[offset + 1] * deltaSec
      this.positions[offset + 2] += this.velocities[offset + 2] * deltaSec
      this.velocities[offset + 1] -= 9.2 * deltaSec
      const fade = Math.max(0, this.life[index] * 1.7)
      this.colors[offset] *= fade
      this.colors[offset + 1] *= fade
      this.colors[offset + 2] *= fade
    }
    this.geometry.attributes.position.needsUpdate = true
    this.geometry.attributes.color.needsUpdate = true
    if (this.shakeMs > 0) {
      this.shakeMs -= deltaSec * 1000
      const amplitude = Math.max(0, this.shakeMs / 150) * 0.12
      camera.position.x += Math.sin(this.shakeMs * 0.31) * amplitude
      camera.position.y += Math.cos(this.shakeMs * 0.47) * amplitude
    }
  }

  dispose(): void { this.geometry.dispose(); this.material.dispose() }
}
