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
    expect(panel).toContain('Ver itens')
    expect(panel).toContain('Confirmar entrega')
    expect(panel).toContain('5000')
    expect(panel).toContain('/api/garcom/mesa/')
  })
})
