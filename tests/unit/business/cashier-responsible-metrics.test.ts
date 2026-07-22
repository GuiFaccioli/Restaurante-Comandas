import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CashierOrder } from '@/lib/orders/queries'

vi.mock('@/components/cozinha/sse-listener', () => ({ SseListener: () => null }))
vi.mock('@/lib/actions/pedidos', () => ({ registrarPagamentoPedido: vi.fn() }))
vi.mock('sonner', () => ({ toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() } }))

import { AdminPedidosLive } from '@/app/admin/pedidos/client'

const order: CashierOrder = {
  id: 'pedido-1', status: 'entregue', criadoEm: '2026-07-13T12:00:00.000Z', entregueEm: '2026-07-13T12:15:00.000Z', total: 48,
  itens: [{ nome: 'Mussarela', quantidade: 1, precoUnitario: '48.00' }], mesaNumero: 4, pagamentoStatus: 'pendente', criadoPor: null, pagamento: null,
}

afterEach(cleanup)

describe('AdminPedidosLive', () => {
  it('keeps the cashier focused on queue actions without summary metric cards', () => {
    render(createElement(AdminPedidosLive, { initialPedidos: [order] }))
    expect(screen.queryByText('Pedidos na fila')).not.toBeInTheDocument()
    expect(screen.queryByText('Pagamentos pendentes')).not.toBeInTheDocument()
    expect(screen.getByText('Fila do caixa · Para cobrar')).toBeInTheDocument()
  })

  it('filters the queue and searches by table', () => {
    render(createElement(AdminPedidosLive, { initialPedidos: [order] }))
    fireEvent.change(screen.getByLabelText('Buscar mesa ou pedido'), { target: { value: '99' } })
    expect(screen.getByText('Nenhum pedido corresponde aos filtros.')).toBeInTheDocument()
  })
})
