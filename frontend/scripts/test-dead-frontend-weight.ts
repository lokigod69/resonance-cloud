import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()

function projectPath(relativePath: string): string {
  return path.join(root, relativePath)
}

function readProjectFile(relativePath: string): string {
  return readFileSync(projectPath(relativePath), 'utf8')
}

const failures: string[] = []

function expect(condition: boolean, message: string): void {
  if (!condition) failures.push(message)
}

const deletedDawLeaves = [
  'src/components/WorkspaceManager.tsx',
  'src/components/WorkspaceChooser.tsx',
  'src/components/AutopilotPanel.tsx',
  'src/components/WordList.tsx',
  'src/components/EngineStatus.tsx',
  'src/components/BatchSettings.tsx',
  'src/components/VoiceManager.tsx',
  'src/components/AddWordModal.tsx',
  'src/components/PipelineView.tsx',
  'src/components/StagePanel.tsx',
]

for (const relativePath of deletedDawLeaves) {
  expect(!existsSync(projectPath(relativePath)), `${relativePath} must be removed when it has no live importers`)
}

const app = readProjectFile('src/App.tsx')
expect(
  app.includes('const RUNNER_GAME_ROUTE_ENABLED = false'),
  'RUNNER_GAME_ROUTE_ENABLED must remain false',
)
expect(
  !app.includes("import('@/games/runner/RunnerGame')"),
  'App.tsx must not create a runner dynamic import while the route is disabled',
)
expect(
  !app.includes('<RunnerGame />'),
  'App.tsx must not reference the runner component while the route is disabled',
)

const registry = readProjectFile('src/games/shared/registry.ts')
expect(
  !registry.includes('../runner/RunnerGame.tsx'),
  'Game registry must not glob or load RunnerGame while the route is disabled',
)

const packageJson = readProjectFile('package.json')
expect(
  packageJson.includes('"webfontloader"'),
  'webfontloader must stay installed while runner source still imports it for typecheck',
)

if (failures.length > 0) {
  console.error('Dead frontend weight contract failed:')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log('Dead frontend weight contract passed')
