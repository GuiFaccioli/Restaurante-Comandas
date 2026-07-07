import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

function readProjectFile(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

describe('operational realtime access', () => {
  it('allows kitchen, waiter, and cashier screens to subscribe to order events', () => {
    const route = readProjectFile('app/api/events/route.ts')
    const access = readProjectFile('lib/auth/access.ts')

    expect(access).toContain('requireAnyAccess')
    expect(route).toContain('requireAnyAccess')
    expect(route).toContain("'cozinha'")
    expect(route).toContain("'garcom'")
    expect(route).toContain("'caixa'")
    expect(route).not.toContain("requireAccess('cozinha')")
  })
})
