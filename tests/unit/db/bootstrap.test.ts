import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

function source(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

describe('database bootstrap', () => {
  it('contains no SQLite client, migration, or production-build fallback', () => {
    const dbIndex = source('lib/db/index.ts')

    expect(dbIndex).not.toContain('better-sqlite3')
    expect(dbIndex).not.toContain('migrateSqliteDatabase')
    expect(dbIndex).not.toContain('file::memory:')
    expect(dbIndex).not.toContain('phase-production-build')
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

  it('does not ship legacy SQLite schema or migration sources', () => {
    expect(existsSync(join(root, 'lib/db/schema-sqlite.ts'))).toBe(false)
    expect(existsSync(join(root, 'lib/db/sqlite-migrations.ts'))).toBe(false)
  })
})
