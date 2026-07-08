import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

function readProjectFile(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

describe('waiter table entry', () => {
  it('loads current table orders and exposes a path back to all tables', () => {
    const page = readProjectFile('app/garcom/mesa/[id]/page.tsx')
    const client = readProjectFile('app/garcom/mesa/[id]/client.tsx')

    expect(page).toContain('getTenantMesaOrders')
    expect(page).toContain('initialPedidos')
    expect(client).toContain('href="/garcom/mesas"')
    expect(client).toContain('Voltar')
    expect(client).not.toContain('Voltar para mesas')
    expect(client).toContain('TableOrdersPanel')
  })
})
