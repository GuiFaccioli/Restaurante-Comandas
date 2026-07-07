import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

function readProjectFile(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

describe('table order monitoring', () => {
  it('calculates order totals from quantities and unit prices', async () => {
    const { calculateOrderTotal } = await import('@/lib/orders/totals')

    expect(
      calculateOrderTotal([
        { quantidade: 2, precoUnitario: '35.50' },
        { quantidade: 3, precoUnitario: '8.00' },
      ])
    ).toBe(95)
  })

  it('renders current table orders and preserves a polling interval', () => {
    const panel = readProjectFile('components/garcom/table-orders-panel.tsx')

    expect(panel).toContain('Pedidos desta mesa')
    expect(panel).toContain('cancelarPedido')
    expect(panel).toContain('Cancelar')
    expect(panel).toContain('Itens')
    expect(panel).toContain('Confirmar')
    expect(panel).toContain('5000')
    expect(panel).toContain('/api/garcom/mesa/')
  })

  it('puts cancel, items, and confirm actions in the same order action row', () => {
    const panel = readProjectFile('components/garcom/table-orders-panel.tsx')

    expect(panel).toMatch(/variant="destructive"[\s\S]*Cancelar/)
    expect(panel).toMatch(/variant="outline"[\s\S]*Itens/)
    expect(panel).toMatch(/variant="success"[\s\S]*Confirmar/)
  })

  it('preserves the user choice to keep table order items collapsed during polling', () => {
    const panel = readProjectFile('components/garcom/table-orders-panel.tsx')

    expect(panel).toContain('if (current === null) return null')
  })

  it('keeps delivered orders out of the waiter table monitoring history', () => {
    const queries = readProjectFile('lib/orders/queries.ts')

    expect(queries).toContain('getTenantMesaOrders')
    expect(queries).toContain("ne(pedido.status, 'entregue')")
    expect(queries).toContain("ne(pedido.status, 'cancelado')")
  })
})
