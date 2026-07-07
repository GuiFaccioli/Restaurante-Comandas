import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

function source(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

describe('permission boundaries', () => {
  it('admin setup pages require admin access', () => {
    expect(source('app/admin/menu/page.tsx')).toContain("requireAccess('admin')")
    expect(source('app/admin/mesas/page.tsx')).toContain("requireAccess('admin')")
  })

  it('cashier order page requires caixa access', () => {
    expect(source('app/admin/pedidos/page.tsx')).toContain("requireAccess('caixa')")
  })

  it('kitchen UI requires cozinha access', () => {
    expect(source('app/cozinha/layout.tsx')).toContain("requireAccess('cozinha')")
  })

  it('operational SSE endpoint allows kitchen, waiter, and cashier subscribers', () => {
    const eventsRoute = source('app/api/events/route.ts')

    expect(eventsRoute).toContain('requireAnyAccess')
    expect(eventsRoute).toContain("'cozinha'")
    expect(eventsRoute).toContain("'garcom'")
    expect(eventsRoute).toContain("'caixa'")
  })

  it('waiter UI and order confirmation require garcom access', () => {
    expect(source('app/garcom/layout.tsx')).toContain("requireAccess('garcom')")
    expect(source('lib/actions/pedidos.ts')).toContain("requireAccess('garcom')")
  })

  it('kitchen status update requires cozinha access', () => {
    const pedidos = source('lib/actions/pedidos.ts')

    expect(pedidos).toContain('atualizarStatus')
    expect(pedidos).toContain("requireAccess('cozinha')")
  })

  it('menu and table mutations require admin access', () => {
    expect(source('lib/actions/produtos.ts')).toContain("requireAccess('admin')")
    expect(source('lib/actions/mesas.ts')).toContain("requireAccess('admin')")
  })
})
