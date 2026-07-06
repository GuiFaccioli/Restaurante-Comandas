import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

function readProjectFile(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

describe('cashier order control', () => {
  it('uses a tenant-scoped cashier query with item details, totals, and payment status', () => {
    const queries = readProjectFile('lib/orders/queries.ts')
    const page = readProjectFile('app/admin/pedidos/page.tsx')

    expect(queries).toContain('getCashierOrders')
    expect(queries).toContain('pagamentoPedido')
    expect(queries).toContain('pagamentoStatus')
    expect(queries).toContain('precoUnitario')
    expect(queries).toContain('calculateOrderTotal')
    expect(page).toContain('getCashierOrders')
    expect(page).toContain('initialPedidos')
  })

  it('renders expandable cashier details and safe polling without losing UI state', () => {
    const client = readProjectFile('app/admin/pedidos/client.tsx')

    expect(client).toContain('Itens do pedido')
    expect(client).toContain('Total')
    expect(client).toContain('Registrar pagamento')
    expect(client).toContain('variant="success"')
    expect(client).toContain('/api/caixa/pedidos')
    expect(client).toContain('5000')
    expect(client).toContain('expandedId')
    expect(client).toContain('paymentFormPedidoId')
  })
})
