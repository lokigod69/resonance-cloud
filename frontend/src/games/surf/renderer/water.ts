import * as THREE from 'three'
import type { SurfPalette } from './palettes'
import { softDotTexture } from './textures'

const BEND = 0.0011
/** World-space z of the water mesh's center — vertex math must convert local→world. */
const WATER_Z = -104

export function waterHeightAt(x: number, z: number, timeSec: number): number {
  return 0.55 * Math.sin(0.085 * x + 0.35 * timeSec)
    + 0.35 * Math.sin(0.14 * z + 0.9 + 0.55 * timeSec)
    + 0.22 * Math.sin(0.06 * (x + z) + 1.7 + 0.28 * timeSec)
    // micro-swell: too small to move gameplay floats, big enough to light up the near facets
    + 0.09 * Math.sin(0.52 * x - 0.31 * z + 1.1 * timeSec)
}

export class SurfWater {
  readonly mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshLambertMaterial>
  private readonly geometry: THREE.BufferGeometry
  private readonly positions: Float32Array
  private readonly colors: Float32Array
  private readonly basePositions: Float32Array
  private readonly material: THREE.MeshLambertMaterial
  private readonly deep = new THREE.Color()
  private readonly crest = new THREE.Color()
  private readonly mixed = new THREE.Color()
  private readonly sparkleGeometry: THREE.BufferGeometry
  private readonly sparkleTexture = softDotTexture()
  private readonly sparklePositions: Float32Array
  readonly sparkles: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>
  private readonly sparkleMaterial: THREE.PointsMaterial
  private reducedMotion = false
  private readonly phase: Float32Array

  constructor(palette: SurfPalette) {
    // 64×72 segments ≈ 27.6k non-indexed verts — the CPU deform + per-frame
    // normal recompute must stay affordable on an iPhone (84×96 was ~48k).
    this.geometry = new THREE.PlaneGeometry(210, 240, 64, 72).toNonIndexed()
    this.geometry.rotateX(-Math.PI / 2)
    this.positions = this.geometry.attributes.position.array as Float32Array
    this.basePositions = new Float32Array(this.positions)
    this.colors = new Float32Array(this.positions.length)
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3))
    this.material = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true })
    this.mesh = new THREE.Mesh(this.geometry, this.material)
    this.mesh.position.z = WATER_Z
    this.setPalette(palette)
    this.sparkleGeometry = new THREE.BufferGeometry()
    this.sparklePositions = new Float32Array(110 * 3)
    this.phase = new Float32Array(110)
    for (let index = 0; index < 110; index += 1) {
      this.sparklePositions[index * 3] = ((index * 37) % 210) - 105
      this.sparklePositions[index * 3 + 1] = 0.2
      this.sparklePositions[index * 3 + 2] = -((index * 53) % 220)
      this.phase[index] = (index * 1.73) % (Math.PI * 2)
    }
    this.sparkleGeometry.setAttribute('position', new THREE.BufferAttribute(this.sparklePositions, 3))
    this.sparkleMaterial = new THREE.PointsMaterial({ color: this.crest, size: 0.24, map: this.sparkleTexture, transparent: true, opacity: 0.72, blending: THREE.AdditiveBlending, depthWrite: false })
    this.sparkles = new THREE.Points(this.sparkleGeometry, this.sparkleMaterial)
  }

  setReducedMotion(on: boolean): void { this.reducedMotion = on }

  setPalette(palette: SurfPalette): void {
    this.deep.setHex(palette.waterDeep)
    this.crest.setHex(palette.waterCrest)
    if (this.sparkleMaterial) this.sparkleMaterial.color.copy(this.crest)
  }

  update(timeSec: number, speedFactor: number): void {
    const t = timeSec * speedFactor
    const amplitude = this.reducedMotion ? 0.6 : 1
    for (let offset = 0; offset < this.positions.length; offset += 3) {
      const x = this.basePositions[offset]
      // Wave sampling and the globe bend both live in WORLD space so the
      // surface matches what rider/buoys float on (they sample world coords).
      const z = this.basePositions[offset + 2] + WATER_Z
      const height = waterHeightAt(x, z, t) * amplitude
      this.positions[offset + 1] = height - BEND * z * z
      const normalized = Math.max(0, Math.min(1, (height + 1.12) / 2.24))
      this.mixed.copy(this.deep).lerp(this.crest, normalized)
      // Foam only whitens nearby crests — at distance the crest bands compress
      // on screen and unbounded foam merges into one giant white patch.
      const foamFalloff = Math.max(0, Math.min(1, (120 - Math.abs(z)) / 60))
      if (normalized > 0.91 && foamFalloff > 0) this.mixed.lerp(WHITE, (normalized - 0.91) / 0.09 * 0.34 * foamFalloff)
      this.mixed.multiplyScalar(Math.max(0.48, 1 - Math.abs(z) / 520))
      this.colors[offset] = this.mixed.r
      this.colors[offset + 1] = this.mixed.g
      this.colors[offset + 2] = this.mixed.b
    }
    this.geometry.attributes.position.needsUpdate = true
    this.geometry.attributes.color.needsUpdate = true
    this.geometry.computeVertexNormals()
    for (let index = 0; index < 110; index += 1) {
      let z = this.sparklePositions[index * 3 + 2] + speedFactor * 0.34
      if (z > 16) z = -224
      const x = this.sparklePositions[index * 3]
      this.sparklePositions[index * 3 + 2] = z
      this.sparklePositions[index * 3 + 1] = waterHeightAt(x, z, t) - BEND * z * z + 0.13 + Math.sin(t + this.phase[index]) * 0.05
    }
    this.sparkleGeometry.attributes.position.needsUpdate = true
  }

  dispose(): void {
    this.geometry.dispose()
    this.material.dispose()
    this.sparkleGeometry.dispose()
    this.sparkleMaterial.dispose()
    this.sparkleTexture.dispose()
  }
}

const WHITE = new THREE.Color(0xf8fbff)
