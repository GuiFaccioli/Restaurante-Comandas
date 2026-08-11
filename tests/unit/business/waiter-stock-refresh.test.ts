import { createElement } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useCart } from '@/lib/store/cart'

const state = vi.hoisted(() => ({
  refresh: vi.fn(),
  confirmarPedido: vi.fn(),
  cancelarPedido: vi.fn(),
  confirmarEntrega: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: state.refresh }),
}))
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))
vi.mock('@/lib/actions/pedidos', () => ({
  confirmarPedido: state.confirmarPedido,
  cancelarPedido: state.cancelarPedido,
  confirmarEntrega: state.confirmarEntrega,
}))

import { CartDrawer } from '@/components/garcom/cart-drawer'
import { TableOrdersPanel } from '@/components/garcom/table-orders-panel'

const tableOrder = {
  id: 'pedido-1',
  status: 'novo' as const,
  criadoEm: '2026-08-11T12:00:00.000Z',
  entregueEm: null,
  total: 25,
  itens: [{ nome: 'Pizza', quantidade: 1, precoUnitario: '25.00', observacao: null }],
}

beforeEach(() => {
  vi.clearAllMocks()
  state.confirmarPedido.mockResolvedValue({ id: 'pedido-1' })
  state.cancelarPedido.mockResolvedValue(undefined)
  state.confirmarEntrega.mockResolvedValue(undefined)
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ pedidos: [] }),
  }))
  useCart.setState({
    mesaId: 'mesa-1',
    cartsByMesa: {
      'mesa-1': {
        items: [{ produtoId: 'produto-1', nome: 'Pizza', preco: 25, quantidade: 1 }],
        total: 25,
      },
    },
    items: [{ produtoId: 'produto-1', nome: 'Pizza', preco: 25, quantidade: 1 }],
    total: 25,
  })
})

afterEach(() => cleanup())

describe('waiter stock availability refresh', () => {
  it('refreshes server-provided balances after a successful order confirmation', async () => {
    render(createElement(CartDrawer, {
      open: true,
      onClose: vi.fn(),
      mesaId: 'mesa-1',
      mesaNumero: 1,
      atendimentoId: 'atendimento-1',
      recipes: [{ produtoId: 'produto-1', insumoId: 'insumo-1', quantidade: '100.000' }],
      balances: [{ id: 'insumo-1', nome: 'Farinha', estoqueAtual: '500.000' }],
      productStockControls: [{ id: 'produto-1', controleEstoque: true }],
    }))

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar pedido' }))

    await waitFor(() => expect(state.confirmarPedido).toHaveBeenCalledTimes(1))
    expect(state.refresh).toHaveBeenCalledTimes(1)
  })

  it('refreshes server-provided balances after cancellation restores stock', async () => {
    render(createElement(TableOrdersPanel, {
      mesaId: 'mesa-1',
      atendimentoId: 'atendimento-1',
      initialPedidos: [tableOrder],
    }))

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    await waitFor(() => expect(state.cancelarPedido).toHaveBeenCalledWith('pedido-1'))
    await waitFor(() => expect(state.refresh).toHaveBeenCalledTimes(1))
  })
})
