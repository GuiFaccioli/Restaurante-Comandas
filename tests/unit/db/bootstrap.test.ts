import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

function source(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

describe('database bootstrap', () => {
  it('does not run mutable SQLite pragmas during Next production build', () => {
    const dbIndex = source('lib/db/index.ts')

    expect(dbIndex).toContain("process.env.NEXT_PHASE === 'phase-production-build'")
    expect(dbIndex).toContain('if (!isNextProductionBuild)')
    expect(dbIndex).toContain("sqlite.pragma('journal_mode = WAL')")
  })

  it('contains no implicit dev.db fallback in runtime, config, seed, or test setup', () => {
    for (const path of [
      'lib/db/index.ts',
      'drizzle.config.ts',
      'scripts/seed.ts',
      'tests/setup.ts',
    ]) {
      expect(source(path)).not.toContain('dev.db')
    }
  })
})
