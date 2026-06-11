import { readFileSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()

function readProjectFile(relativePath: string): string {
  return readFileSync(path.join(root, relativePath), 'utf8')
}

const failures: string[] = []

function expect(condition: boolean, message: string): void {
  if (!condition) failures.push(message)
}

const cors = readProjectFile('api/_shared/cors.ts')
for (const origin of [
  'https://lingwave.ai',
  'https://www.lingwave.ai',
  'https://resonanz.pro',
  'https://www.resonanz.pro',
]) {
  expect(cors.includes(origin), `CORS allowed origins must include ${origin}`)
}

const sharePage = readProjectFile('src/pages/SharePage.tsx')
expect(!sharePage.includes('resonanz.pro'), 'SharePage must not hardcode visible resonanz.pro copy')
expect(
  sharePage.includes('getPublicWebOrigin'),
  'SharePage visible host copy must derive from getPublicWebOrigin()',
)

const ctaFooter = readProjectFile('src/components/landing/CtaFooterSection.tsx')
expect(!ctaFooter.includes('resonanz.pro'), 'Landing footer must not hardcode visible resonanz.pro copy')
expect(
  ctaFooter.includes('getPublicWebOrigin'),
  'Landing footer visible host copy must derive from getPublicWebOrigin()',
)

const deepLinks = readProjectFile('src/hooks/useCapacitorDeepLinks.ts')
for (const host of ['resonanz.pro', 'www.resonanz.pro', 'lingwave.ai', 'www.lingwave.ai']) {
  expect(deepLinks.includes(`'${host}'`), `Native deep-link allowlist must include ${host}`)
}
expect(deepLinks.includes("url.protocol === 'resonance:'"), 'resonance:// scheme handling must remain in place')

const indexHtml = readProjectFile('index.html')
expect(
  indexHtml.includes('<meta property="og:image" content="https://lingwave.ai/android-chrome-512x512.png" />'),
  'og:image must use the absolute Lingwave preview image URL',
)
expect(
  indexHtml.includes('<meta property="og:url" content="https://lingwave.ai" />'),
  'index.html must define og:url as https://lingwave.ai',
)

const adminUsers = readProjectFile('src/pages/admin/Users.tsx')
expect(adminUsers.includes('LINGWAVE-TEST-001'), 'Admin invite placeholder must use LINGWAVE-TEST-001')
expect(!adminUsers.includes('RESONANZ-TEST-001'), 'Admin invite placeholder must not use RESONANZ-TEST-001')

if (failures.length > 0) {
  console.error('Lingwave rebrand sweep contract failed:')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log('Lingwave rebrand sweep contract passed')
