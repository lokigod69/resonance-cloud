import * as THREE from 'three'
import type { SurfPalette } from './palettes'

const BEND = 0.0011

export class SurfWorld {
  readonly group = new THREE.Group()
  readonly fog = new THREE.Fog(0x3d1d4f, 55, 165)
  private readonly skyUniforms: Record<string, THREE.IUniform>
  private readonly skyMaterial: THREE.ShaderMaterial
  private readonly directional: THREE.DirectionalLight
  private readonly ambient: THREE.AmbientLight
  private readonly sunMaterial: THREE.SpriteMaterial
  private readonly glowMaterial: THREE.SpriteMaterial
  private readonly starsMaterial: THREE.PointsMaterial
  private readonly cloudMaterials: THREE.SpriteMaterial[] = []
  private readonly geometries: THREE.BufferGeometry[] = []
  private readonly textures: THREE.Texture[] = []
  private readonly clouds: THREE.Sprite[] = []
  private reducedMotion = false

  constructor(palette: SurfPalette) {
    this.skyUniforms = {
      skyTop: { value: new THREE.Color(palette.skyTop) }, skyBottom: { value: new THREE.Color(palette.skyBottom) }, horizonGlow: { value: new THREE.Color(palette.horizonGlow) },
    }
    this.skyMaterial = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: this.skyUniforms,
      vertexShader: 'varying vec3 vWorldPosition; void main(){ vec4 worldPosition=modelMatrix*vec4(position,1.0); vWorldPosition=worldPosition.xyz; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 skyTop; uniform vec3 skyBottom; uniform vec3 horizonGlow; varying vec3 vWorldPosition; void main(){ float h=normalize(vWorldPosition).y; vec3 c=mix(skyBottom,skyTop,smoothstep(-0.14,0.5,h)); c=mix(c,horizonGlow,0.26*(1.0-smoothstep(0.0,0.14,abs(h+0.14)))); gl_FragColor=vec4(c,1.0); }',
    })
    const skyGeometry = new THREE.SphereGeometry(300, 24, 16)
    this.geometries.push(skyGeometry)
    this.group.add(new THREE.Mesh(skyGeometry, this.skyMaterial))
    const glowTexture = this.radialTexture('rgba(255,232,152,0.35)', 'rgba(255,193,64,0)')
    const sunTexture = this.radialTexture('rgba(255,251,216,1)', 'rgba(247,200,67,0.94)')
    // Sky sprites are beyond the fog far plane — fogged they collapse into flat purple discs.
    this.glowMaterial = new THREE.SpriteMaterial({ map: glowTexture, color: palette.horizonGlow, transparent: true, opacity: 0.9, depthWrite: false, fog: false })
    this.sunMaterial = new THREE.SpriteMaterial({ map: sunTexture, color: palette.horizonGlow, transparent: true, depthWrite: false, fog: false })
    const glow = new THREE.Sprite(this.glowMaterial)
    const sun = new THREE.Sprite(this.sunMaterial)
    glow.position.set(0, 7 - BEND * 180 * 180, -180)
    sun.position.copy(glow.position)
    glow.scale.set(34, 34, 1)
    sun.scale.set(22, 22, 1)
    this.group.add(glow, sun)
    const starGeometry = new THREE.BufferGeometry()
    const starPositions = new Float32Array(160 * 3)
    for (let index = 0; index < 160; index += 1) {
      const theta = (index * 2.399963) % (Math.PI * 2)
      const radius = 105 + ((index * 47) % 130)
      starPositions[index * 3] = Math.cos(theta) * radius
      starPositions[index * 3 + 1] = 38 + ((index * 31) % 130)
      starPositions[index * 3 + 2] = Math.sin(theta) * radius - 80
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
    this.geometries.push(starGeometry)
    this.starsMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 1.15, transparent: true, opacity: isNight(palette) ? 0.75 : 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })
    this.group.add(new THREE.Points(starGeometry, this.starsMaterial))
    const cloudTexture = this.cloudTexture()
    for (let index = 0; index < 5; index += 1) {
      const material = new THREE.SpriteMaterial({ map: cloudTexture, color: palette.skyBottom, transparent: true, opacity: 0.54 + index * 0.035, depthWrite: false, fog: false })
      const cloud = new THREE.Sprite(material)
      // No world-bend for clouds: they are sky, and the bend sinks the far ones below the horizon.
      cloud.position.set(-70 + index * 36, 18 + (index % 3) * 9, -120 - index * 10)
      cloud.scale.set(25 + (index % 2) * 8, 10 + (index % 3) * 2, 1)
      this.cloudMaterials.push(material)
      this.clouds.push(cloud)
      this.group.add(cloud)
    }
    // Bright stylized lighting: the palettes are dusk-dark by design, so the
    // lights lift toward white or the whole sea reads as a black void.
    this.directional = new THREE.DirectionalLight(palette.horizonGlow, 1.6)
    this.directional.position.set(-40, 60, -80)
    this.ambient = new THREE.AmbientLight(palette.skyBottom, 1.35)
    this.group.add(this.directional, this.ambient)
    this.applyPalette(palette)
  }

  setReducedMotion(on: boolean): void { this.reducedMotion = on }

  applyPalette(palette: SurfPalette): void {
    this.skyUniforms.skyTop.value.setHex(palette.skyTop)
    this.skyUniforms.skyBottom.value.setHex(palette.skyBottom)
    this.skyUniforms.horizonGlow.value.setHex(palette.horizonGlow)
    this.fog.color.setHex(palette.skyBottom)
    this.sunMaterial.color.setHex(palette.horizonGlow)
    this.glowMaterial.color.setHex(palette.horizonGlow)
    this.directional.color.setHex(palette.horizonGlow).lerp(WHITE, 0.3)
    this.ambient.color.setHex(palette.skyBottom).lerp(WHITE, 0.6)
    this.starsMaterial.opacity = isNight(palette) ? 0.75 : 0
    this.cloudMaterials.forEach((material) => material.color.setHex(palette.skyBottom).lerp(WHITE, 0.18))
  }

  update(timeSec: number): void {
    const movement = this.reducedMotion ? 0.08 : 0.22
    this.clouds.forEach((cloud, index) => {
      cloud.position.x = -70 + index * 36 + Math.sin(timeSec * movement + index) * 9
    })
  }

  dispose(): void {
    this.geometries.forEach((geometry) => geometry.dispose())
    this.skyMaterial.dispose()
    this.sunMaterial.dispose()
    this.glowMaterial.dispose()
    this.starsMaterial.dispose()
    this.cloudMaterials.forEach((material) => material.dispose())
    this.textures.forEach((texture) => texture.dispose())
  }

  private radialTexture(inner: string, outer: string): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 128
    const context = canvas.getContext('2d')
    if (!context) throw new Error('surf: canvas texture unavailable')
    const gradient = context.createRadialGradient(64, 64, 2, 64, 64, 64)
    gradient.addColorStop(0, inner)
    gradient.addColorStop(1, outer)
    context.fillStyle = gradient
    context.fillRect(0, 0, 128, 128)
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    this.textures.push(texture)
    return texture
  }

  private cloudTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 128
    const context = canvas.getContext('2d')
    if (!context) throw new Error('surf: canvas texture unavailable')
    for (let index = 0; index < 5; index += 1) {
      const x = 36 + index * 43
      const y = 68 - (index % 2) * 15
      const gradient = context.createRadialGradient(x, y, 3, x, y, 42)
      gradient.addColorStop(0, 'rgba(255,255,255,0.78)')
      gradient.addColorStop(1, 'rgba(255,255,255,0)')
      context.fillStyle = gradient
      context.beginPath()
      context.arc(x, y, 42, 0, Math.PI * 2)
      context.fill()
    }
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    this.textures.push(texture)
    return texture
  }
}

const WHITE = new THREE.Color(0xffffff)
function isNight(palette: SurfPalette): boolean { return palette.skyTop === 0x1a0f2e || palette.skyTop === 0x140b22 || palette.skyTop === 0x0e0810 }
