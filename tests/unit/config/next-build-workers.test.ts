import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

describe('Next build worker limits', () => {
  it('sets deterministic build worker limits', () => {
    const config = readFileSync(join(root, 'next.config.ts'), 'utf8')

    expect(config).toContain('cpus: 1')
    expect(config).toContain('staticGenerationMaxConcurrency: 1')
    expect(config).toContain('staticGenerationMinPagesPerWorker: 1')
  })
})
