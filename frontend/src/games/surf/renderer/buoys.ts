import * as THREE from 'three'
import type { LaneIndex, WaveSpec } from '../engine/types'
import { waterHeightAt } from './water'
import { WordPanelCache } from './wordPanel'

const LANES: readonly number[] = [-5.2, 0, 5.2]
const BEND = 0.0011

type ActiveBuoy = {
  lane: LaneIndex
  correct: boolean
  group: THREE.Group
  panel: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>
  glow: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>
  phase: number
  shakeMs: number
  pulseMs: number
  dipMs: number
}

export class SurfBuoys {
  readonly group = new THREE.Group()
  private readonly cache = new WordPanelCache()
  private readonly buoys: ActiveBuoy[] = []
  private readonly geometries: THREE.BufferGeometry[] = []
  private readonly materials: THREE.Material[] = []
  private readonly worldScratch = new THREE.Vector3()
  private reducedMotion = false

  setReducedMotion(on: boolean): void { this.reducedMotion = on }

  spawn(wave: WaveSpec, accent: number): void {
    this.clear()
    wave.cards.forEach((card, index) => {
      const group = new THREE.Group()
      const white = this.lambert(0xf7fbff)
      const stripe = this.lambert(accent)
      this.cylinder(-0.78, 0.18, 0.25, 0.23, 1.4, white, Math.PI / 2, group)
      this.cylinder(0.78, 0.18, 0.25, 0.23, 1.4, white, Math.PI / 2, group)
      this.cylinder(-0.78, 0.18, 0.25, 0.25, 0.28, stripe, Math.PI / 2, group)
      this.cylinder(0.78, 0.18, 0.25, 0.25, 0.28, stripe, Math.PI / 2, group)
      this.box(-0.58, 1.0, 0, 0.12, 1.6, 0.12, white, group)
      this.box(0.58, 1.0, 0, 0.12, 1.6, 0.12, white, group)
      const panelGeometry = new THREE.PlaneGeometry(4.0, 2.2)
      this.geometries.push(panelGeometry)
      const panelMaterial = new THREE.MeshBasicMaterial({ map: this.cache.get(card.card.term), transparent: true, depthWrite: false, side: THREE.DoubleSide })
      this.materials.push(panelMaterial)
      const panel = new THREE.Mesh(panelGeometry, panelMaterial)
      panel.position.y = 2.45
      const glowGeometry = new THREE.PlaneGeometry(4.15, 2.5)
      this.geometries.push(glowGeometry)
      const glowMaterial = new THREE.MeshBasicMaterial({ color: 0xf7c843, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })
      this.materials.push(glowMaterial)
      const glow = new THREE.Mesh(glowGeometry, glowMaterial)
      glow.position.set(0, 2.45, -0.02)
      group.add(glow, panel)
      this.group.add(group)
      this.buoys.push({ lane: card.lane, correct: card.isCorrect, group, panel, glow, phase: index * 1.7, shakeMs: 0, pulseMs: 0, dipMs: 0 })
    })
  }

  update(rawProgress: number, cruise: boolean, parked: boolean, timeSec: number, waterTime: number, deltaSec: number, camera: THREE.Camera): void {
    const raw = cruise ? Math.min(0.86, rawProgress) : Math.min(1.1, rawProgress)
    const endpoint = cruise ? -10 : 4
    const mapped = cruise ? 1 - (1 - raw / 0.86) ** 3 : raw
    // Spawn close enough that the words are readable early (fog still covers the pop-in).
    const z = -95 + (endpoint + 95) * mapped
    this.buoys.forEach((buoy) => {
      const x = LANES[buoy.lane]
      const bob = (parked && !this.reducedMotion ? Math.sin(timeSec * 4 + buoy.phase) * 0.13 : Math.sin(timeSec * 1.8 + buoy.phase) * 0.05)
      buoy.group.position.set(x, waterHeightAt(x, z, waterTime) + bob - BEND * z * z, z)
      buoy.group.rotation.z = Math.sin(timeSec * 1.6 + buoy.phase) * 0.045
      if (buoy.shakeMs > 0) {
        buoy.shakeMs -= deltaSec * 1000
        buoy.group.position.x += Math.sin(buoy.shakeMs * 0.21) * 0.16
      }
      if (buoy.dipMs > 0) {
        buoy.dipMs -= deltaSec * 1000
        buoy.group.position.y -= Math.sin(Math.max(0, buoy.dipMs) / 220 * Math.PI) * 0.9
      }
      if (buoy.pulseMs > 0) {
        buoy.pulseMs -= deltaSec * 1000
        const p = Math.max(0, buoy.pulseMs) / 320
        buoy.glow.material.opacity = p * 0.55
        buoy.panel.material.opacity = 0.58 + (1 - p) * 0.42
      } else {
        buoy.glow.material.opacity = 0
        buoy.panel.material.opacity = 1
      }
      const pop = buoy.dipMs > 0 ? 1 + Math.sin(Math.max(0, buoy.dipMs) / 220 * Math.PI) * 0.18 : 1
      buoy.panel.scale.setScalar(pop)
      buoy.glow.scale.setScalar(pop)
      const yaw = Math.atan2(camera.position.x - buoy.group.position.x, camera.position.z - buoy.group.position.z)
      buoy.panel.rotation.y = yaw
      buoy.glow.rotation.y = yaw
    })
  }

  chosenWrong(lane: LaneIndex): void { const buoy = this.byLane(lane); if (buoy) buoy.shakeMs = 220 }
  chosenCorrect(lane: LaneIndex): void { const buoy = this.byLane(lane); if (buoy) buoy.dipMs = 220 }
  flashCorrect(): void { const buoy = this.buoys.find((item) => item.correct); if (buoy) buoy.pulseMs = 320 }
  positionFor(lane: LaneIndex): THREE.Vector3 { const buoy = this.byLane(lane); return buoy ? buoy.group.getWorldPosition(this.worldScratch) : this.worldScratch.set(0, 0, -10) }

  clear(): void {
    this.buoys.forEach((buoy) => this.group.remove(buoy.group))
    this.buoys.length = 0
    this.geometries.splice(0).forEach((geometry) => geometry.dispose())
    this.materials.splice(0).forEach((material) => material.dispose())
  }

  dispose(): void { this.clear(); this.cache.dispose() }

  private byLane(lane: LaneIndex): ActiveBuoy | undefined { return this.buoys.find((buoy) => buoy.lane === lane) }
  private lambert(color: number): THREE.MeshLambertMaterial { const material = new THREE.MeshLambertMaterial({ color, flatShading: true }); this.materials.push(material); return material }
  private box(x: number, y: number, z: number, width: number, height: number, depth: number, material: THREE.MeshLambertMaterial, parent: THREE.Group): void {
    const geometry = new THREE.BoxGeometry(width, height, depth); this.geometries.push(geometry)
    const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x, y, z); parent.add(mesh)
  }
  private cylinder(x: number, y: number, z: number, radius: number, length: number, material: THREE.MeshLambertMaterial, angle: number, parent: THREE.Group): void {
    const geometry = new THREE.CylinderGeometry(radius, radius, length, 8); this.geometries.push(geometry)
    const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x, y, z); mesh.rotation.z = angle; parent.add(mesh)
  }
}
