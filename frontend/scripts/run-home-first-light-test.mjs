// Runner for test-home-first-light.ts. The test imports src hook modules whose
// transitive imports read import.meta.env at module scope (lib/supabase), which
// tsx leaves undefined — so bundle through esbuild with the env defined, then
// execute the bundle. Run: node scripts/run-home-first-light-test.mjs

import { build } from 'esbuild'
import { spawnSync } from 'node:child_process'
import { rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(dir, '..')
const outfile = path.join(dir, '.home-first-light-test.bundle.mjs')

await build({
  entryPoints: [path.join(dir, 'test-home-first-light.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile,
  alias: { '@': path.join(root, 'src') },
  banner: {
    js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);",
  },
  define: {
    'import.meta.env.VITE_SUPABASE_URL': '"https://supabase.test"',
    'import.meta.env.VITE_SUPABASE_ANON_KEY': '"anon-test-key"',
    'import.meta.env.DEV': 'false',
    'import.meta.env.PROD': 'true',
    'import.meta.env.MODE': '"test"',
    'import.meta.env': '{}',
  },
  logLevel: 'warning',
})

const result = spawnSync(process.execPath, [outfile], { stdio: 'inherit' })
rmSync(outfile, { force: true })
process.exit(result.status ?? 1)
