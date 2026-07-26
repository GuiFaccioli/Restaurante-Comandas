import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CashierOrder } from '@/lib/orders/queries'

const mocks = vi.hoisted(() => ({
  registrarPagamentoPedido: vi.fn(),
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@/components/cozinha/sse-listener', () => ({ SseListener: () => null }))
vi.mock('@/lib/actions/pedidos', () => ({
  registrarPagamentoPedido: mocks.registrarPagamentoPedido,
}))
vi.mock('sonner', () => ({ toast: mocks.toast }))

import { AdminPedidosLive } from '@/app/admin/pedidos/client'

const order: CashierOrder = {
  id: 'pedido-1', status: 'entregue', criadoEm: '2026-07-13T12:00:00.000Z', entregueEm: '2026-07-13T12:15:00.000Z', total: 48,
  itens: [{ nome: 'Mussarela', quantidade: 1, precoUnitario: '48.00' }], mesaNumero: 4, pagamentoStatus: 'pendente', criadoPor: null, pagamento: null,
}

const secondOrder: CashierOrder = {
  ...order,
  id: 'pedido-2',
  total: 70,
  mesaNumero: 8,
  itens: [{ nome: 'Calabresa', quantidade: 1, precoUnitario: '70.00' }],
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.registrarPagamentoPedido.mockResolvedValue({ status: 'registrado' })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

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

  it('resets the amount when refresh advances the payment form to another order', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ pedidos: [secondOrder] }),
    })))
    render(createElement(AdminPedidosLive, {
      initialPedidos: [order, secondOrder],
    }))
    const amount = screen.getByLabelText('Valor recebido')
    fireEvent.change(amount, { target: { value: '1,00' } })

    fireEvent.submit(amount.closest('form') as HTMLFormElement)

    await waitFor(() => {
      expect(screen.getByLabelText('Valor recebido')).toHaveValue('70,00')
    })
    expect(mocks.registrarPagamentoPedido).toHaveBeenCalledWith({
      pedidoId: 'pedido-1',
      formaPagamento: 'pix',
      valor: '1,00',
    })
  })
})
