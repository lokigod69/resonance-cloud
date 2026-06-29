/*
 * MIT License
 *
 * Copyright (c) 2026 Liquid Glass OSS contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * Vendored from @ogtirth/liquid-glass-oss 0.1.0 and modified to support a live
 * HTMLCanvasElement texture source for the dashboard wave canvas.
 */

const vertexShader = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`

const fragmentShader = `
precision highp float;
uniform sampler2D u_bg;
uniform vec2 u_res;
uniform vec2 u_center;
uniform vec2 u_size;
uniform vec2 u_bgScale;
uniform vec2 u_bgOffset;
uniform float u_blurAmount;
uniform float u_radius;
uniform float u_zRadius;
uniform float u_refract;
uniform float u_chroma;
uniform float u_edgeHL;
uniform float u_specular;
uniform float u_fresnel;
uniform float u_brightness;
uniform float u_saturation;
uniform float u_shadowAlpha;
uniform float u_shadowSpread;
uniform float u_darkTint;
uniform float u_bevelMode;
uniform float u_button;
uniform float u_pressed;
uniform float u_distortion;
uniform float u_tintStrength;
uniform float u_tint;
uniform float u_opacity;
uniform float u_sampleBackground;
uniform float u_materialMorph;
uniform vec3 u_tintColor;
uniform vec3 u_trackBaseColor;
uniform vec3 u_trackFillColor;
uniform float u_trackStart;
uniform float u_trackEnd;
uniform float u_trackY;
uniform float u_valueX;
uniform float u_trackRadius;
varying vec2 v_uv;

float rrSDF(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + vec2(r);
  return min(max(q.x, q.y), 0.0) + length(max(q, vec2(0.0))) - r;
}
float lensHeight(float inside, float zR) {
  if (inside <= 0.0) return 0.0;
  if (inside >= zR) return zR;
  return sqrt(inside * (2.0 * zR - inside));
}
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
vec2 toBackgroundUV(vec2 screenUV) {
  return screenUV * u_bgScale + u_bgOffset;
}
vec3 sampleBlur(vec2 uv, float amount) {
  vec2 px = vec2(1.0) / u_res * u_bgScale;
  float b = amount * 18.0;
  vec3 color = texture2D(u_bg, uv).rgb * 0.36;
  color += texture2D(u_bg, uv + px * vec2( b, 0.0)).rgb * 0.10;
  color += texture2D(u_bg, uv + px * vec2(-b, 0.0)).rgb * 0.10;
  color += texture2D(u_bg, uv + px * vec2(0.0,  b)).rgb * 0.10;
  color += texture2D(u_bg, uv + px * vec2(0.0, -b)).rgb * 0.10;
  color += texture2D(u_bg, uv + px * vec2( b,  b) * .72).rgb * .06;
  color += texture2D(u_bg, uv + px * vec2(-b,  b) * .72).rgb * .06;
  color += texture2D(u_bg, uv + px * vec2( b, -b) * .72).rgb * .06;
  color += texture2D(u_bg, uv + px * vec2(-b, -b) * .72).rgb * .06;
  return color;
}
vec3 spectralSample(vec2 base, vec2 axis, float blurAmount, float mixAmount) {
  vec3 neutral = sampleBlur(base, blurAmount);
  vec3 red = sampleBlur(base + axis * 3.0, blurAmount) * vec3(1.0, 0.0, 0.0);
  vec3 orange = sampleBlur(base + axis * 2.0, blurAmount) * vec3(1.0, 0.45, 0.0);
  vec3 yellow = sampleBlur(base + axis, blurAmount) * vec3(1.0, 1.0, 0.0);
  vec3 green = sampleBlur(base, blurAmount) * vec3(0.0, 1.0, 0.0);
  vec3 cyan = sampleBlur(base - axis, blurAmount) * vec3(0.0, 1.0, 1.0);
  vec3 blue = sampleBlur(base - axis * 2.0, blurAmount) * vec3(0.0, 0.0, 1.0);
  vec3 violet = sampleBlur(base - axis * 3.0, blurAmount) * vec3(0.5, 0.0, 1.0);
  vec3 spectrum = (red + orange + yellow + green + cyan + blue + violet)
    / vec3(3.5, 3.45, 3.0);
  return mix(neutral, spectrum, mixAmount);
}
vec3 adjustColor(vec3 color) {
  color += u_brightness;
  float gray = dot(color, vec3(.299,.587,.114));
  return clamp(mix(vec3(gray), color, 1.0 + u_saturation), 0.0, 1.0);
}
float roundedTrackMask(vec2 point, float startX, float endX, float centerY, float radius) {
  float safeEnd = max(endX, startX);
  vec2 segment = vec2(clamp(point.x, startX, safeEnd), centerY);
  return 1.0 - smoothstep(radius - 1.0, radius + 1.0, length(point - segment));
}
void main() {
  vec2 screenPx = vec2(gl_FragCoord.x, u_res.y - gl_FragCoord.y);
  vec2 localPx = screenPx - u_center;
  vec2 halfSize = u_size * .5;
  float radius = min(u_radius, min(halfSize.x, halfSize.y));
  float sdf = rrSDF(localPx, halfSize, radius);
  if (sdf > 0.0) {
    float d = max(sdf - 1.0, 0.0);
    float shadow = exp(-d*d / max(u_shadowSpread*u_shadowSpread, 1.0)) * u_shadowAlpha;
    if (shadow < .002) discard;
    gl_FragColor = vec4(0.,0.,0.,shadow);
    return;
  }
  float mask = 1.0 - smoothstep(-1.8, .45, sdf);
  float inside = -sdf;
  float edge = 1.0 - smoothstep(0.0, u_zRadius * 1.12, inside);
  float core = smoothstep(u_zRadius * .55, u_zRadius * 1.9, inside);
  float e = 2.0;
  float dR = -rrSDF(localPx + vec2(e,0.), halfSize, radius);
  float dL = -rrSDF(localPx - vec2(e,0.), halfSize, radius);
  float dU = -rrSDF(localPx + vec2(0.,e), halfSize, radius);
  float dD = -rrSDF(localPx - vec2(0.,e), halfSize, radius);
  float hC = lensHeight(inside, u_zRadius);
  float hR = lensHeight(dR, u_zRadius);
  float hL = lensHeight(dL, u_zRadius);
  float hU = lensHeight(dU, u_zRadius);
  float hD = lensHeight(dD, u_zRadius);
  float dome = mix(
    1.0,
    .22 + .78 * smoothstep(-.9, .9, -localPx.y / max(halfSize.y, 1.0)),
    u_bevelMode
  );
  hC *= dome;
  hR *= dome;
  hL *= dome;
  hU *= dome;
  hD *= dome;
  vec2 hGrad = vec2(hR-hL, hU-hD)/(2.0*e);
  vec3 normal = normalize(vec3(-hGrad,1.));
  float depth = smoothstep(0.0, u_zRadius, inside);
  float ior = mix(1.36, 1.58, clamp(u_refract, 0.0, 1.2));
  float refrPow = 1.0 - 1.0 / ior;
  float press = u_button * u_pressed;
  float thickness = hC * mix(2.0, 1.1, press);
  float thickNorm = thickness / max(u_zRadius * 2.0, 1.0);
  vec2 centerDir = -localPx / max(halfSize, vec2(1.0));
  vec2 refrPx = (hGrad * refrPow * 2.15 + centerDir * edge * .28)
    * u_refract * (26.0 + u_zRadius * .22);
  refrPx += hGrad * refrPow * thickNorm * u_refract * 22.0;
  refrPx *= mix(edge, max(edge, .16 * (1.0 - core)), u_blurAmount);
  refrPx *= mix(1.0, .74, press);

  vec2 noisePoint = localPx * .08;
  vec2 micro = (vec2(hash(noisePoint), hash(noisePoint + vec2(37.0))) - .5)
    * u_distortion * 4.0;
  vec2 refractedScreenPx = screenPx + refrPx + micro;
  vec2 trackSamplePx = mix(refractedScreenPx, screenPx + refrPx * 1.8 + micro, u_button);
  float trackRadius = u_trackRadius;
  float fullTrack = roundedTrackMask(trackSamplePx, u_trackStart, u_trackEnd, u_trackY, trackRadius);
  float fillTrack = roundedTrackMask(
    trackSamplePx,
    u_trackStart,
    u_valueX,
    u_trackY,
    trackRadius
  );
  float caShift = u_chroma * 18.0 * (edge * .7 + .3) * 2.0;
  float redTrack = roundedTrackMask(trackSamplePx + normal.xy * caShift, u_trackStart, u_trackEnd, u_trackY, trackRadius);
  float blueTrack = roundedTrackMask(trackSamplePx - normal.xy * caShift, u_trackStart, u_trackEnd, u_trackY, trackRadius);
  vec3 neutralTrack = mix(u_trackBaseColor, u_trackFillColor, fillTrack);
  vec3 trackColor = neutralTrack;
  trackColor.r *= mix(1.0, redTrack, min(1.0, u_chroma * 4.0));
  trackColor.b *= mix(1.0, blueTrack, min(1.0, u_chroma * 4.0));

  float vertical = clamp(.5 - localPx.y / max(u_size.y, 1.0), 0.0, 1.0);
  float topSheen = smoothstep(.42, .98, vertical);
  float lowerBody = smoothstep(.0, .58, vertical);
  vec2 pxToUV = vec2(1.0, -1.0) / u_res;
  vec2 backgroundUV = toBackgroundUV(v_uv + refrPx * pxToUV);
  float chromaSpread = u_chroma * 34.0 * (.35 + edge * .95);
  vec2 chromaAxis = normalize(normal.xy + vec2(.0001))
    * chromaSpread * pxToUV * u_bgScale;
  float prismMix = min(.32, u_chroma * 3.6 * (.25 + edge));
  vec3 sampledBackground = spectralSample(
    backgroundUV,
    chromaAxis,
    u_blurAmount,
    prismMix
  );
  sampledBackground = adjustColor(sampledBackground);

  float glassLight = .032 + depth * .018 + lowerBody * .018 + topSheen * .055;
  vec3 neutralGlass = vec3(glassLight, glassLight + .004, glassLight + .01);
  vec3 color = mix(neutralGlass, sampledBackground, u_sampleBackground);
  color = mix(color, color * u_tintColor, u_tintStrength);
  color *= 1.0 - u_darkTint * (.62 + edge * .38);
  if (u_tint >= 0.0) {
    color = mix(color, vec3(1.0), clamp(u_tint, 0.0, 1.0) * .5);
  } else {
    color = mix(color, vec3(0.0), clamp(-u_tint, 0.0, 1.0) * .72);
  }
  float trackTransmission = clamp(
    .74 + core * .25 + topSheen * .07 - edge * .12,
    .58,
    1.04
  );
  vec3 transmittedTrack = trackColor * trackTransmission;
  float surfaceVeil = (.07 + edge * .2) * (.55 + u_darkTint);
  transmittedTrack = mix(transmittedTrack, neutralGlass, surfaceVeil);
  color = mix(color, transmittedTrack, fullTrack * .94);

  vec3 lightDir = normalize(vec3(-.35, -.58, .74));
  vec3 viewDir = vec3(0.0, 0.0, 1.0);
  vec3 halfDir = normalize(lightDir + viewDir);
  float spec = pow(max(dot(normal, halfDir), 0.0), 72.0) * u_specular;
  float fres = pow(1.0 - clamp(normal.z, 0.0, 1.0), 3.2) * u_fresnel;
  float rim = edge * u_edgeHL * .78;
  float stroke = smoothstep(-4.0, -1.4, sdf)
    * (1.0 - smoothstep(-1.2, 0.0, sdf));
  float topBias = .5 + .5 * (-localPx.y / max(halfSize.y, 1.0));
  vec3 rimColor = vec3(1.0, .98, .92)
    * (rim * (.09 + topBias * .08) + stroke * u_edgeHL * .18);
  vec3 fresColor = vec3(.90, .96, 1.0) * fres * .16;
  color += rimColor + fresColor + vec3(spec * .28);
  color = mix(color, vec3(1.0), stroke * .05);
  vec3 staticPill = mix(
    vec3(.93, .93, .945),
    vec3(1.0),
    smoothstep(-.9, .4, -localPx.y / max(halfSize.y, 1.0))
  );
  float materialEase = smoothstep(0.0, 1.0, u_materialMorph);
  color = mix(staticPill, color, materialEase);
  float materialOpacity = mix(1.0, u_opacity, materialEase);
  gl_FragColor = vec4(color, mask * materialOpacity);
}`

export type LiquidGlassVariant = 'clear' | 'frosted' | 'dark' | 'prism' | 'dome'

export type LiquidGlassSettings = {
  blur: number
  refraction: number
  chromaticAberration: number
  distortion: number
  edgeHighlight: number
  specular: number
  fresnel: number
  radius: number
  depth: number
  brightness: number
  saturation: number
  shadow: number
  darkTint: number
  tintStrength: number
  tintColor: [number, number, number]
  tint: number
  opacity: number
  bevel: number
  lensWidth: number
  lensHeight: number
  liquidMotion: number
  liquidSpring: number
  liquidDamping: number
}

export const liquidGlassPresets: Record<LiquidGlassVariant, LiquidGlassSettings> = {
  clear: {
    blur: 1,
    refraction: 1.2,
    chromaticAberration: 0.012,
    distortion: 0,
    edgeHighlight: 0,
    specular: 0.04,
    fresnel: 0.56,
    radius: 18,
    depth: 14,
    brightness: 0.02,
    saturation: 0,
    shadow: 0,
    darkTint: 0,
    tintStrength: 0.38,
    tintColor: [0.92, 0.95, 1.05],
    tint: 0,
    opacity: 0.88,
    bevel: 1,
    lensWidth: 56,
    lensHeight: 32,
    liquidMotion: 0.24,
    liquidSpring: 0.055,
    liquidDamping: 0.84,
  },
  frosted: {
    blur: 0.52,
    refraction: 0.58,
    chromaticAberration: 0.035,
    distortion: 0.025,
    edgeHighlight: 0.11,
    specular: 0.08,
    fresnel: 0.95,
    radius: 22,
    depth: 36,
    brightness: 0.04,
    saturation: -0.08,
    shadow: 0,
    darkTint: 0.09,
    tintStrength: 0.12,
    tintColor: [0.92, 0.95, 1.05],
    tint: 0,
    opacity: 1,
    bevel: 0,
    lensWidth: 54,
    lensHeight: 34,
    liquidMotion: 0.13,
    liquidSpring: 0.052,
    liquidDamping: 0.85,
  },
  dark: {
    blur: 0.18,
    refraction: 0.72,
    chromaticAberration: 0.045,
    distortion: 0.015,
    edgeHighlight: 0.08,
    specular: 0.14,
    fresnel: 1.08,
    radius: 22,
    depth: 42,
    brightness: -0.03,
    saturation: 0.03,
    shadow: 0,
    darkTint: 0.28,
    tintStrength: 0.06,
    tintColor: [0.92, 0.95, 1.05],
    tint: 0,
    opacity: 1,
    bevel: 0,
    lensWidth: 54,
    lensHeight: 34,
    liquidMotion: 0.14,
    liquidSpring: 0.055,
    liquidDamping: 0.84,
  },
  prism: {
    blur: 0.06,
    refraction: 0.82,
    chromaticAberration: 0.18,
    distortion: 0.035,
    edgeHighlight: 0.13,
    specular: 0.08,
    fresnel: 1.18,
    radius: 22,
    depth: 48,
    brightness: 0.02,
    saturation: 0.1,
    shadow: 0,
    darkTint: 0.12,
    tintStrength: 0.14,
    tintColor: [0.92, 0.95, 1.05],
    tint: 0,
    opacity: 1,
    bevel: 0,
    lensWidth: 58,
    lensHeight: 36,
    liquidMotion: 0.16,
    liquidSpring: 0.06,
    liquidDamping: 0.83,
  },
  dome: {
    blur: 0.08,
    refraction: 0.74,
    chromaticAberration: 0.06,
    distortion: 0.01,
    edgeHighlight: 0.12,
    specular: 0.16,
    fresnel: 1.05,
    radius: 22,
    depth: 56,
    brightness: 0.02,
    saturation: 0.02,
    shadow: 0,
    darkTint: 0.11,
    tintStrength: 0.1,
    tintColor: [0.92, 0.95, 1.05],
    tint: 0,
    opacity: 1,
    bevel: 1,
    lensWidth: 56,
    lensHeight: 38,
    liquidMotion: 0.13,
    liquidSpring: 0.05,
    liquidDamping: 0.86,
  },
}

export function resolveLiquidGlassSettings(
  variant: LiquidGlassVariant = 'frosted',
  overrides?: Partial<LiquidGlassSettings>,
): LiquidGlassSettings {
  return { ...liquidGlassPresets[variant], ...overrides }
}

const imageCache = new Map<string, HTMLImageElement>()
const isVideoUrl = (url: string) => /\.(mp4|webm|mov)(?:$|[?#])/i.test(url)
const cssEscape = (value: string) => {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(value)
  return value.replace(/["\\]/g, '\\$&')
}

const uniformNames = [
  'u_bg',
  'u_res',
  'u_center',
  'u_size',
  'u_bgScale',
  'u_bgOffset',
  'u_blurAmount',
  'u_radius',
  'u_zRadius',
  'u_refract',
  'u_chroma',
  'u_edgeHL',
  'u_specular',
  'u_fresnel',
  'u_brightness',
  'u_saturation',
  'u_shadowAlpha',
  'u_shadowSpread',
  'u_darkTint',
  'u_bevelMode',
  'u_button',
  'u_pressed',
  'u_trackStart',
  'u_trackEnd',
  'u_trackY',
  'u_valueX',
  'u_distortion',
  'u_tintStrength',
  'u_opacity',
  'u_sampleBackground',
  'u_materialMorph',
  'u_tint',
  'u_tintColor',
  'u_trackBaseColor',
  'u_trackFillColor',
  'u_trackRadius',
] as const

type UniformName = (typeof uniformNames)[number]

type Track = {
  start: number
  end: number
  y: number
  value: number
  radius: number
}

type Rgb = [number, number, number]

export class LiquidGlassRenderer {
  private readonly canvas: HTMLCanvasElement
  private readonly gl: WebGLRenderingContext
  private readonly texture: WebGLTexture
  private readonly uniforms: Partial<Record<UniformName, WebGLUniformLocation | null>> = {}
  private settings: LiquidGlassSettings
  private image: HTMLImageElement
  private video: HTMLVideoElement | null = null
  private canvasSource: HTMLCanvasElement | null = null
  private ready = false
  private center = { x: 0, y: 0 }
  private size = { width: 54, height: 34 }
  private stretch = 0
  private morph = 1
  private materialMorph = 1
  private pressed = false
  private button = 0
  private sampleBackground = false
  private track: Track = { start: 0, end: 0, y: 0, value: 0, radius: 2.5 }
  private trackColors: { base: Rgb; fill: Rgb } = {
    base: [0.31, 0.32, 0.34],
    fill: [0.035, 0.5, 1],
  }
  private disposed = false
  private positionFrame = 0
  private lastViewport = { width: 0, height: 0 }
  private lastScroll = { x: Number.NaN, y: Number.NaN }
  private lastRect = { left: Number.NaN, top: Number.NaN, width: Number.NaN, height: Number.NaN }

  constructor(canvas: HTMLCanvasElement, imageUrl: string, settings: LiquidGlassSettings) {
    this.canvas = canvas
    this.settings = settings
    const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: false })
    if (!gl) throw new Error('Liquid Glass requires WebGL.')
    this.gl = gl
    this.size = { width: settings.lensWidth, height: settings.lensHeight }

    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type)
      if (!shader) throw new Error('Unable to create WebGL shader.')
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const stage = type === gl.VERTEX_SHADER ? 'vertex' : 'fragment'
        const details = gl.getShaderInfoLog(shader)?.trim()
        throw new Error(
          details || `Liquid Glass ${stage} shader compilation failed (context lost: ${gl.isContextLost()}).`,
        )
      }
      return shader
    }

    const program = gl.createProgram()
    if (!program) throw new Error('Unable to create WebGL program.')
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexShader))
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentShader))
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) ?? 'Shader link failed.')
    }
    gl.useProgram(program)

    const quad = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, quad)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const position = gl.getAttribLocation(program, 'a_pos')
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)

    uniformNames.forEach((name) => {
      this.uniforms[name] = gl.getUniformLocation(program, name)
    })

    const texture = gl.createTexture()
    if (!texture) throw new Error('Unable to create WebGL texture.')
    this.texture = texture
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.uniform1i(this.uniforms.u_bg ?? null, 0)

    this.image = new Image()
    this.loadSource(imageUrl)
    this.watchPosition()
  }

  private readonly handleImageLoad = () => {
    if (this.disposed) return
    const { gl } = this
    gl.bindTexture(gl.TEXTURE_2D, this.texture)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.image)
    this.ready = true
    this.draw()
  }

  private readonly handleVideoReady = () => {
    if (this.disposed || !this.video) return
    this.ready = true
    void this.video.play().catch(() => {})
    this.draw()
  }

  private readonly watchPosition = () => {
    if (this.disposed) return
    const rect = this.canvas.getBoundingClientRect()
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    }
    const scroll = { x: window.scrollX, y: window.scrollY }
    const visible = rect.right > 0 && rect.bottom > 0 && rect.left < viewport.width && rect.top < viewport.height
    const moved =
      Math.abs(rect.left - this.lastRect.left) > 0.05 ||
      Math.abs(rect.top - this.lastRect.top) > 0.05 ||
      Math.abs(rect.width - this.lastRect.width) > 0.05 ||
      Math.abs(rect.height - this.lastRect.height) > 0.05 ||
      Math.abs(scroll.x - this.lastScroll.x) > 0.05 ||
      Math.abs(scroll.y - this.lastScroll.y) > 0.05 ||
      viewport.width !== this.lastViewport.width ||
      viewport.height !== this.lastViewport.height
    if (moved || (this.sampleBackground || this.video || this.canvasSource) && visible) {
      this.lastRect = {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      }
      this.lastViewport = viewport
      this.lastScroll = scroll
      this.draw()
    }
    this.positionFrame = window.requestAnimationFrame(this.watchPosition)
  }

  loadSource(url: string): void {
    this.image.removeEventListener('load', this.handleImageLoad)
    this.video?.removeEventListener('loadeddata', this.handleVideoReady)
    this.video = null
    this.ready = Boolean(this.canvasSource)

    if (isVideoUrl(url)) {
      const pageVideo = this.canvas.ownerDocument.querySelector<HTMLVideoElement>(
        `[data-liquid-glass-video][src="${cssEscape(url)}"]`,
      )
      const video = pageVideo ?? this.canvas.ownerDocument.createElement('video')
      if (!pageVideo) {
        video.src = url
        video.muted = true
        video.loop = true
        video.autoplay = true
        video.playsInline = true
        video.preload = 'auto'
      }
      this.video = video
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0) {
        this.handleVideoReady()
      } else {
        video.addEventListener('loadeddata', this.handleVideoReady, { once: true })
        video.load()
      }
      return
    }

    const cachedImage = imageCache.get(url)
    this.image = cachedImage ?? new Image()
    if (!cachedImage) {
      this.image.crossOrigin = 'anonymous'
      imageCache.set(url, this.image)
      this.image.src = url
    }
    if (this.image.complete && this.image.naturalWidth > 0) this.handleImageLoad()
    else this.image.addEventListener('load', this.handleImageLoad, { once: true })
  }

  setImage(url: string): void {
    if (this.video?.currentSrc === url || this.video?.src === url || this.image.currentSrc === url || this.image.src === url) {
      return
    }
    this.loadSource(url)
  }

  setCanvasSource(canvas: HTMLCanvasElement | null): void {
    this.canvasSource = canvas
    if (canvas && canvas.width > 0 && canvas.height > 0) {
      this.ready = true
      this.draw()
      return
    }
    if (!this.video && !(this.image.complete && this.image.naturalWidth > 0)) {
      this.ready = false
    }
    this.draw()
  }

  setSettings(settings: LiquidGlassSettings): void {
    this.settings = settings
    this.size = { width: settings.lensWidth, height: settings.lensHeight }
    this.draw()
  }

  setGeometry(
    x: number,
    y: number,
    stretch: number,
    pressed: boolean,
    morph = 1,
    materialMorph = 1,
    button = 0,
  ): void {
    this.center = { x, y }
    this.stretch = stretch
    this.pressed = pressed
    this.button = button
    this.morph = Math.max(0, Math.min(1, morph))
    this.materialMorph = Math.max(0, Math.min(1, materialMorph))
    this.draw()
  }

  setTrack(start: number, end: number, y: number, value: number, radius = 2.5): void {
    this.track = { start, end, y, value, radius }
    this.draw()
  }

  setTrackColors(base: Rgb, fill: Rgb): void {
    this.trackColors = { base, fill }
    this.draw()
  }

  setBackgroundSampling(enabled: boolean): void {
    this.sampleBackground = enabled
    this.draw()
  }

  dispose(): void {
    this.disposed = true
    window.cancelAnimationFrame(this.positionFrame)
    this.ready = false
    this.canvasSource = null
    this.image.removeEventListener('load', this.handleImageLoad)
    this.video?.removeEventListener('loadeddata', this.handleVideoReady)
    this.gl.deleteTexture(this.texture)
    this.gl.clearColor(0, 0, 0, 0)
    this.gl.clear(this.gl.COLOR_BUFFER_BIT)
  }

  resize(width: number, height: number): void {
    const deviceScale = window.devicePixelRatio || 1
    const compactSupersampling = height <= 80 ? 3 : height <= 140 ? 2.5 : 2
    const renderScale = Math.min(4, Math.max(deviceScale, compactSupersampling))
    this.canvas.width = Math.max(1, Math.round(width * renderScale))
    this.canvas.height = Math.max(1, Math.round(height * renderScale))
    this.canvas.style.width = `${width}px`
    this.canvas.style.height = `${height}px`
    this.draw()
  }

  draw(): void {
    if (!this.ready) return
    const { gl, canvas, settings: s } = this
    const source = this.canvasSource ?? this.video ?? this.image

    if (this.canvasSource) {
      if (this.canvasSource.width <= 0 || this.canvasSource.height <= 0) return
      gl.bindTexture(gl.TEXTURE_2D, this.texture)
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.canvasSource)
    } else if (this.video) {
      if (this.video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return
      gl.bindTexture(gl.TEXTURE_2D, this.texture)
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.video)
    }

    const dpr = canvas.width / Math.max(1, canvas.clientWidth)
    const rect = canvas.getBoundingClientRect()
    const backgroundElement = canvas.ownerDocument.querySelector('[data-liquid-glass-background]')
    const measuredBackgroundRect = backgroundElement?.getBoundingClientRect()
    const backgroundRect =
      measuredBackgroundRect && measuredBackgroundRect.width > 0 && measuredBackgroundRect.height > 0
        ? measuredBackgroundRect
        : {
            left: 0,
            top: 0,
            right: window.innerWidth,
            bottom: window.innerHeight,
            width: window.innerWidth,
            height: window.innerHeight,
          }
    const viewportWidth = Math.max(1, backgroundRect.width)
    const viewportHeight = Math.max(1, backgroundRect.height)
    let sourceWidth: number
    let sourceHeight: number
    if (this.canvasSource) {
      sourceWidth = this.canvasSource.width
      sourceHeight = this.canvasSource.height
    } else if (source instanceof HTMLVideoElement) {
      sourceWidth = source.videoWidth
      sourceHeight = source.videoHeight
    } else {
      const imageSource = source as HTMLImageElement
      sourceWidth = imageSource.naturalWidth
      sourceHeight = imageSource.naturalHeight
    }
    if (sourceWidth <= 0 || sourceHeight <= 0) return
    const imageRatio = sourceWidth / sourceHeight
    const viewRatio = viewportWidth / viewportHeight
    const bg =
      imageRatio > viewRatio
        ? { sx: viewRatio / imageRatio, sy: 1, ox: (1 - viewRatio / imageRatio) / 2, oy: 0 }
        : { sx: 1, sy: imageRatio / viewRatio, ox: 0, oy: (1 - imageRatio / viewRatio) / 2 }
    const localScaleX = rect.width / viewportWidth
    const localScaleY = rect.height / viewportHeight
    const localOffsetX = (rect.left - backgroundRect.left) / viewportWidth
    const localOffsetY = (backgroundRect.bottom - rect.bottom) / viewportHeight
    const restingWidth = this.button > 0.5 ? 36 : 34
    const restingHeight = this.button > 0.5 ? 24 : 22
    const baseWidth = restingWidth + (this.size.width - restingWidth) * this.morph
    const baseHeight = restingHeight + (this.size.height - restingHeight) * this.morph
    const width = baseWidth * (1 + this.stretch)
    const height = baseHeight * (1 - this.stretch * 0.48)

    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.uniform2f(this.uniforms.u_res ?? null, canvas.width, canvas.height)
    gl.uniform2f(this.uniforms.u_center ?? null, this.center.x * dpr, this.center.y * dpr)
    gl.uniform2f(this.uniforms.u_size ?? null, width * dpr, height * dpr)
    gl.uniform2f(this.uniforms.u_bgScale ?? null, localScaleX * bg.sx, localScaleY * bg.sy)
    gl.uniform2f(this.uniforms.u_bgOffset ?? null, localOffsetX * bg.sx + bg.ox, localOffsetY * bg.sy + bg.oy)
    gl.uniform1f(this.uniforms.u_blurAmount ?? null, s.blur)
    gl.uniform1f(this.uniforms.u_radius ?? null, Math.min(s.radius, height * 0.5) * dpr)
    gl.uniform1f(this.uniforms.u_zRadius ?? null, s.depth * dpr)
    gl.uniform1f(this.uniforms.u_refract ?? null, s.refraction)
    gl.uniform1f(this.uniforms.u_chroma ?? null, s.chromaticAberration)
    gl.uniform1f(this.uniforms.u_edgeHL ?? null, s.edgeHighlight)
    gl.uniform1f(this.uniforms.u_specular ?? null, s.specular)
    gl.uniform1f(this.uniforms.u_fresnel ?? null, s.fresnel)
    gl.uniform1f(this.uniforms.u_brightness ?? null, s.brightness)
    gl.uniform1f(this.uniforms.u_saturation ?? null, s.saturation)
    gl.uniform1f(this.uniforms.u_shadowAlpha ?? null, s.shadow)
    gl.uniform1f(this.uniforms.u_shadowSpread ?? null, (12 + s.shadow * 18) * dpr)
    gl.uniform1f(this.uniforms.u_darkTint ?? null, s.darkTint)
    gl.uniform1f(this.uniforms.u_distortion ?? null, s.distortion)
    gl.uniform1f(this.uniforms.u_tintStrength ?? null, s.tintStrength)
    gl.uniform1f(this.uniforms.u_tint ?? null, s.tint)
    gl.uniform3fv(this.uniforms.u_tintColor ?? null, s.tintColor)
    gl.uniform1f(this.uniforms.u_opacity ?? null, s.opacity)
    gl.uniform1f(this.uniforms.u_sampleBackground ?? null, this.sampleBackground ? 1 : 0)
    gl.uniform1f(this.uniforms.u_materialMorph ?? null, this.materialMorph)
    gl.uniform3f(this.uniforms.u_trackBaseColor ?? null, this.trackColors.base[0], this.trackColors.base[1], this.trackColors.base[2])
    gl.uniform3f(this.uniforms.u_trackFillColor ?? null, this.trackColors.fill[0], this.trackColors.fill[1], this.trackColors.fill[2])
    gl.uniform1f(this.uniforms.u_bevelMode ?? null, s.bevel)
    gl.uniform1f(this.uniforms.u_button ?? null, this.button)
    gl.uniform1f(this.uniforms.u_pressed ?? null, this.pressed ? 1 : 0)
    gl.uniform1f(this.uniforms.u_trackStart ?? null, this.track.start * dpr)
    gl.uniform1f(this.uniforms.u_trackEnd ?? null, this.track.end * dpr)
    gl.uniform1f(this.uniforms.u_trackY ?? null, this.track.y * dpr)
    gl.uniform1f(this.uniforms.u_valueX ?? null, this.track.value * dpr)
    gl.uniform1f(this.uniforms.u_trackRadius ?? null, this.track.radius * dpr)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }
}
