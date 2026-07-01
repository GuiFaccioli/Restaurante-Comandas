import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'

const root = process.cwd()

function source(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

describe('waiter entry routing', () => {
  test('home redirects through permission-based area routing', () => {
    const home = source('app/page.tsx')
    expect(home).toContain('redirectForAccesses')
    expect(home).toContain('getCurrentAccesses')
    expect(home).not.toContain("redirect('/garcom/pedidos')")
  })

  test('garcom pedidos route renders pending deliveries before mesa selection', () => {
    const pedidos = source('app/garcom/pedidos/page.tsx')
    expect(pedidos).toContain('Entregas pendentes')
    expect(pedidos).toContain('PendingDeliveriesClient')
    expect(pedidos).toContain('href="/garcom/mesas"')
  })

  test('mesa selection page links into mesa operation', () => {
    const mesas = source('app/garcom/mesas/page.tsx')
    expect(mesas).toContain("href={`/garcom/mesa/${m.id}`}")
    expect(mesas).toContain('Selecionar mesa')
  })

  test('mesa number alias redirects into waiter mesa operation', () => {
    const alias = source('app/mesa/[id]/page.tsx')
    expect(alias).toContain("redirect(`/garcom/mesa/${m.id}`)")
    expect(alias).toContain('MesaIdAliasPage')
  })
})
