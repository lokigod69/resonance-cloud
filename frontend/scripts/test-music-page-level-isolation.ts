import { readFileSync } from 'node:fs'
import { join } from 'node:path'

type PageContract = {
  path: string
  label: string
  warningPrefix: string
}

const root = process.cwd()

const pages: PageContract[] = [
  {
    path: 'src/pages/Music.tsx',
    label: 'Music',
    warningPrefix: "[Music] failed to fetch level songs",
  },
  {
    path: 'src/pages/MusicPG.tsx',
    label: 'MusicPG',
    warningPrefix: "[MusicPG] failed to fetch level songs",
  },
]

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function assertLevelFetchIsOptional({ path, label, warningPrefix }: PageContract) {
  const source = readFileSync(join(root, path), 'utf8')
  const tracksWithJobsIndex = source.indexOf('const tracksWithJobs = applyLatestMusicJobs')
  const firstCommitIndex = source.indexOf('setAllTracks(tracksWithJobs)', tracksWithJobsIndex)
  const levelFetchIndex = source.indexOf('fetchCompletedLevelSongJobs(user.id)', tracksWithJobsIndex)
  const mergedCommitIndex = source.indexOf('setAllTracks(mergedTracks)', levelFetchIndex)
  const warningIndex = source.indexOf(warningPrefix, levelFetchIndex)

  assert(tracksWithJobsIndex !== -1, `${label}: missing tracksWithJobs construction`)
  assert(firstCommitIndex !== -1, `${label}: must commit word tracks before fetching level songs`)
  assert(levelFetchIndex !== -1, `${label}: missing level-song fetch`)
  assert(
    firstCommitIndex < levelFetchIndex,
    `${label}: word tracks must be committed before the level-song fetch can throw`,
  )
  assert(mergedCommitIndex !== -1, `${label}: successful level-song fetch must merge and commit tracks`)
  assert(
    warningIndex !== -1,
    `${label}: failed level-song fetch must emit a quiet non-blocking warning`,
  )
}

for (const page of pages) {
  assertLevelFetchIsOptional(page)
}

console.log('music page level-song fetch isolation contract passed')
