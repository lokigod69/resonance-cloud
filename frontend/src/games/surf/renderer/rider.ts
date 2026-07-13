import * as THREE from 'three'
import type { LaneIndex } from '../engine/types'
import { fadeStripTexture, softDotTexture } from './textures'
import { waterHeightAt } from './water'

const LANES: readonly number[] = [-5.2, 0, 5.2]
/** Dead/unspawned wake particles park far underwater instead of lingering on screen. */
const HIDDEN_Y = -60

export class SurfRider {
  readonly group = new THREE.Group()
  private readonly ski = new THREE.Group()
  private readonly materials: THREE.Material[] = []
  private readonly geometries: THREE.BufferGeometry[] = []
  private readonly wakeGeometry = new THREE.BufferGeometry()
  private readonly wakePositions = new Float32Array(80 * 3)
  private readonly wakeLife = new Float32Array(80)
  private readonly wakeVelocity = new Float32Array(80 * 3)
  private readonly wakeTexture = softDotTexture()
  private readonly foamAlphaTexture = fadeStripTexture()
  private readonly wakeMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.34, map: this.wakeTexture, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false })
  private readonly wake: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>
  private readonly speedGeometry = new THREE.BufferGeometry()
  private readonly speedPositions = new Float32Array(24 * 3)
  private readonly speedMaterial = new THREE.PointsMaterial({ color: 0xf7c843, size: 0.13, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
  private readonly speedLines: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>
  private readonly foamMaterial: THREE.MeshBasicMaterial
  private readonly foamLeft: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>
  private readonly foamRight: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>
  private selectedLane: LaneIndex = 1
  private fromX = 0
  private targetX = 0
  private laneElapsed = 240
  private wakeCarry = 0
  private wakeCursor = 0
  private reducedMotion = false

  constructor() {
    this.group.add(this.ski)
    const vermillion = new THREE.MeshLambertMaterial({ color: 0xf24f13, flatShading: true })
    const gold = new THREE.MeshLambertMaterial({ color: 0xf7c843, flatShading: true })
    const navy = new THREE.MeshLambertMaterial({ color: 0x18264d, flatShading: true })
    const suit = new THREE.MeshLambertMaterial({ color: 0x2c3a63, flatShading: true })
    const skin = new THREE.MeshLambertMaterial({ color: 0xe8b98a, flatShading: true })
    this.materials.push(vermillion, gold, navy, suit, skin)
    this.box(0, 0.25, 0, 1.5, 0.5, 2.25, vermillion, this.ski)
    const nose = this.box(0, 0.18, -1.35, 1.12, 0.38, 1.18, vermillion, this.ski)
    nose.scale.x = 0.72
    this.box(-0.7, 0.32, 0, 0.1, 0.11, 2.0, gold, this.ski)
    this.box(0.7, 0.32, 0, 0.1, 0.11, 2.0, gold, this.ski)
    this.box(0, 0.57, 0.2, 0.72, 0.22, 1.05, navy, this.ski)
    const windshield = this.box(0, 0.72, -0.58, 0.9, 0.34, 0.12, navy, this.ski)
    windshield.rotation.x = -0.35
    this.box(0, 1.05, -0.74, 0.06, 0.06, 0.78, navy, this.ski)
    this.cylinder(-0.35, 1.18, -1.08, 0.045, 0.72, gold, Math.PI / 2, this.ski)
    this.cylinder(0.35, 1.18, -1.08, 0.045, 0.72, gold, Math.PI / 2, this.ski)
    const torso = this.box(0, 1.65, 0.2, 0.72, 1.05, 0.48, suit, this.ski)
    torso.rotation.x = -0.42
    const vest = this.box(0, 1.68, -0.06, 0.77, 0.62, 0.12, gold, this.ski)
    vest.rotation.x = -0.42
    this.sphere(0, 2.35, -0.2, 0.38, skin, this.ski)
    const cap = this.sphere(0, 2.53, -0.2, 0.39, vermillion, this.ski)
    cap.scale.y = 0.42
    const capBand = this.box(0, 2.44, -0.2, 0.82, 0.09, 0.82, gold, this.ski)
    capBand.scale.z = 0.98
    this.cylinder(-0.42, 1.58, -0.63, 0.1, 0.92, skin, -0.72, this.ski)
    this.cylinder(0.42, 1.58, -0.63, 0.1, 0.92, skin, 0.72, this.ski)
    const leftLeg = this.box(-0.28, 1.02, 0.72, 0.26, 0.35, 0.82, suit, this.ski)
    const rightLeg = this.box(0.28, 1.02, 0.72, 0.26, 0.35, 0.82, suit, this.ski)
    leftLeg.rotation.x = rightLeg.rotation.x = -0.36
    for (let index = 0; index < this.wakeLife.length; index += 1) this.wakePositions[index * 3 + 1] = HIDDEN_Y
    this.wakeGeometry.setAttribute('position', new THREE.BufferAttribute(this.wakePositions, 3))
    this.wake = new THREE.Points(this.wakeGeometry, this.wakeMaterial)
    this.group.add(this.wake)
    this.speedGeometry.setAttribute('position', new THREE.BufferAttribute(this.speedPositions, 3))
    this.speedLines = new THREE.Points(this.speedGeometry, this.speedMaterial)
    for (let index = 0; index < 24; index += 1) {
      this.speedPositions[index * 3] = index % 2 ? 8.8 : -8.8
      this.speedPositions[index * 3 + 1] = 1 + (index % 6) * 0.72
      this.speedPositions[index * 3 + 2] = -2 - (index % 8) * 1.7
    }
    this.group.add(this.speedLines)
    const foamGeometry = new THREE.PlaneGeometry(0.34, 3.2)
    this.geometries.push(foamGeometry)
    this.foamMaterial = new THREE.MeshBasicMaterial({ color: 0xdfeeff, alphaMap: this.foamAlphaTexture, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide })
    this.foamLeft = new THREE.Mesh(foamGeometry, this.foamMaterial)
    this.foamRight = new THREE.Mesh(foamGeometry, this.foamMaterial)
    this.foamLeft.position.set(-0.75, -0.04, 1.8)
    this.foamRight.position.set(0.75, -0.04, 1.8)
    this.foamLeft.rotation.x = this.foamRight.rotation.x = -Math.PI / 2
    this.foamLeft.rotation.z = -0.28
    this.foamRight.rotation.z = 0.28
    this.group.add(this.foamLeft, this.foamRight)
  }

  setReducedMotion(on: boolean): void { this.reducedMotion = on }
  moveTo(lane: LaneIndex): void { this.selectedLane = lane; this.fromX = this.group.position.x; this.targetX = LANES[lane]; this.laneElapsed = 0 }
  get lane(): LaneIndex { return this.selectedLane }

  update(deltaSec: number, timeSec: number, speedFactor: number, turbo: boolean): void {
    this.laneElapsed = Math.min(240, this.laneElapsed + deltaSec * 1000)
    const progress = this.laneElapsed / 240
    const eased = 1 - (1 - progress) ** 3
    this.group.position.x = this.fromX + (this.targetX - this.fromX) * eased
    const waterTime = timeSec * speedFactor
    const y = waterHeightAt(this.group.position.x, 0, waterTime)
    const front = waterHeightAt(this.group.position.x, -0.8, waterTime)
    const back = waterHeightAt(this.group.position.x, 0.8, waterTime)
    this.group.position.y = y + 0.35
    this.ski.rotation.x = Math.atan2(front - back, 1.6) + 0.08
    const banking = (this.targetX - this.fromX) / 5.2 * Math.sin(progress * Math.PI) * 0.3
    this.ski.rotation.z = banking + Math.sin(timeSec * 1.9) * 0.035
    this.ski.rotation.y = banking * -0.42
    this.wakeMaterial.color.setHex(turbo ? 0xf7c843 : 0xffffff)
    this.foamMaterial.color.setHex(turbo ? 0xf7c843 : 0xffffff)
    this.foamMaterial.opacity = 0.13 + Math.min(0.2, speedFactor * 0.045) + Math.sin(timeSec * 5) * 0.025
    this.emitWake(deltaSec, turbo)
    this.updateWake(deltaSec)
    this.speedMaterial.opacity = turbo && !this.reducedMotion ? 0.35 : 0
    if (turbo && !this.reducedMotion) {
      for (let index = 0; index < 24; index += 1) {
        const offset = index * 3
        this.speedPositions[offset + 2] += deltaSec * 13
        if (this.speedPositions[offset + 2] > 4) this.speedPositions[offset + 2] = -15
      }
      this.speedGeometry.attributes.position.needsUpdate = true
    }
  }

  dispose(): void {
    this.geometries.forEach((geometry) => geometry.dispose())
    this.materials.forEach((material) => material.dispose())
    this.wakeGeometry.dispose()
    this.wakeMaterial.dispose()
    this.wakeTexture.dispose()
    this.foamAlphaTexture.dispose()
    this.speedGeometry.dispose()
    this.speedMaterial.dispose()
    this.foamMaterial.dispose()
  }

  private emitWake(deltaSec: number, turbo: boolean): void {
    this.wakeCarry += deltaSec * (turbo ? 52 : 26)
    while (this.wakeCarry >= 1) {
      this.wakeCarry -= 1
      const index = this.wakeCursor++ % this.wakeLife.length
      const offset = index * 3
      const side = (index % 7 - 3) * 0.09
      this.wakePositions[offset] = side
      this.wakePositions[offset + 1] = 0.08
      this.wakePositions[offset + 2] = 1.15
      this.wakeVelocity[offset] = side * 1.6
      this.wakeVelocity[offset + 1] = 0.32 + (index % 3) * 0.08
      this.wakeVelocity[offset + 2] = 2.0 + (index % 4) * 0.3
      this.wakeLife[index] = 0.8
    }
  }

  private updateWake(deltaSec: number): void {
    for (let index = 0; index < this.wakeLife.length; index += 1) {
      if (this.wakeLife[index] <= 0) continue
      const offset = index * 3
      this.wakeLife[index] -= deltaSec
      if (this.wakeLife[index] <= 0) {
        this.wakePositions[offset + 1] = HIDDEN_Y
        continue
      }
      this.wakePositions[offset] += this.wakeVelocity[offset] * deltaSec
      this.wakePositions[offset + 1] += this.wakeVelocity[offset + 1] * deltaSec
      this.wakePositions[offset + 2] += this.wakeVelocity[offset + 2] * deltaSec
    }
    this.wakeGeometry.attributes.position.needsUpdate = true
  }

  private box(x: number, y: number, z: number, width: number, height: number, depth: number, material: THREE.MeshLambertMaterial, parent: THREE.Group): THREE.Mesh<THREE.BoxGeometry, THREE.MeshLambertMaterial> {
    const geometry = new THREE.BoxGeometry(width, height, depth)
    this.geometries.push(geometry)
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(x, y, z)
    parent.add(mesh)
    return mesh
  }
  private sphere(x: number, y: number, z: number, radius: number, material: THREE.MeshLambertMaterial, parent: THREE.Group): THREE.Mesh<THREE.SphereGeometry, THREE.MeshLambertMaterial> {
    const geometry = new THREE.SphereGeometry(radius, 10, 7)
    this.geometries.push(geometry)
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(x, y, z)
    parent.add(mesh)
    return mesh
  }
  private cylinder(x: number, y: number, z: number, radius: number, length: number, material: THREE.MeshLambertMaterial, angle: number, parent: THREE.Group): void {
    const geometry = new THREE.CylinderGeometry(radius, radius, length, 6)
    this.geometries.push(geometry)
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(x, y, z)
    mesh.rotation.z = angle
    parent.add(mesh)
  }
}
