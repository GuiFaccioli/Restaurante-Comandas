import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

function source(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

describe('auth API route', () => {
  it('delegates auth requests to the configured Neon Auth handler', () => {
    const route = source('app/api/auth/[...path]/route.ts')

    expect(route).toContain("@/lib/auth/server")
    expect(route).toContain('.handler()')
    expect(route).toContain('export async function GET')
    expect(route).toContain('export async function POST')
  })
})
