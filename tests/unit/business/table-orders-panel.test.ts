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
    expect(panel).toContain('Entregue')
    expect(panel).toContain('5000')
    expect(panel).toContain('/api/garcom/mesa/')
  })

  it('lays out each table order with header, items in the middle, and actions at the bottom', () => {
    const panel = readProjectFile('components/garcom/table-orders-panel.tsx')

    expect(panel).toContain('formatOrderTime(pedido.criadoEm)')
    expect(panel).toContain('Pedido:')
    expect(panel).toContain('formatCurrency(pedido.total)')
    expect(panel).toContain('order-card')
    expect(panel).toContain('order-header')
    expect(panel).toContain('order-items')
    expect(panel).toContain('order-actions')
    expect(panel).not.toContain('order-status')
    expect(panel).not.toContain('status-circle')
    expect(panel).not.toContain('statusLabel')
    expect(panel).not.toContain('pedido.id.slice')
    expect(panel).toMatch(/order-header[\s\S]*order-items[\s\S]*order-actions/)
    expect(panel).toMatch(/variant="destructive"[\s\S]*Cancelar/)
    expect(panel).toMatch(/variant="outline"[\s\S]*Itens/)
    expect(panel).toMatch(/ml-auto[\s\S]*variant="success"[\s\S]*Entregue/)
  })

  it('preserves the user choice to keep table order items collapsed during polling', () => {
    const panel = readProjectFile('components/garcom/table-orders-panel.tsx')

    expect(panel).toContain('if (current.length === 0) return []')
  })

  it('does not show noisy automatic refresh or empty order messages', () => {
    const panel = readProjectFile('components/garcom/table-orders-panel.tsx')

    expect(panel).not.toContain('Atualiza automaticamente')
    expect(panel).not.toContain('Nenhum pedido aberto para esta mesa')
  })

  it('keeps expanded item rows clean without duplicate prices or 2x prefixes', () => {
    const panel = readProjectFile('components/garcom/table-orders-panel.tsx')

    expect(panel).not.toContain('Number(item.precoUnitario)')
    expect(panel).not.toContain('}x {item.nome}')
    expect(panel).toContain('Qtd. {item.quantidade}')
  })

  it('keeps delivered orders out of the waiter table monitoring history', () => {
    const queries = readProjectFile('lib/orders/queries.ts')

    expect(queries).toContain('getTenantMesaOrders')
    expect(queries).toContain("ne(pedido.status, 'entregue')")
    expect(queries).toContain("ne(pedido.status, 'cancelado')")
  })
})
