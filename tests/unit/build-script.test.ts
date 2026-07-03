import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

describe('build script', () => {
  it('uses webpack explicitly because next-pwa is webpack-based', () => {
    const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))

    expect(packageJson.scripts.build).toBe('next build --webpack')
  })
})
