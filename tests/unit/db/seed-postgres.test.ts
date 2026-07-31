import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('PostgreSQL development seed', () => {
  it('requires an explicit development seed URL and acknowledgement', () => {
    const source = readFileSync(join(process.cwd(), 'scripts', 'seed.ts'), 'utf8')

    expect(source).toContain('SEED_DATABASE_URL')
    expect(source).toContain('ALLOW_DEV_SEED')
    expect(source).not.toContain('better-sqlite3')
    expect(source).not.toContain('schema-sqlite')
  })
})
