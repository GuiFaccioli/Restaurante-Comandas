import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

function source(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

describe('auth API route', () => {
  it('does not instantiate legacy Neon Auth during build', () => {
    const route = source('app/api/auth/[...path]/route.ts')

    expect(route).not.toContain('@/lib/auth/server')
    expect(route).not.toContain('auth.handler')
    expect(route).toContain('First-party auth uses Server Actions')
  })
})
