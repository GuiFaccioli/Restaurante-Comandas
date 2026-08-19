import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createElement } from 'react'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const actions = vi.hoisted(() => ({
  atualizarStatus: vi.fn(),
  confirmarEntrega: vi.fn(),
  cancelarPedido: vi.fn(),
}))

vi.mock('@/lib/actions/pedidos', () => actions)
vi.mock('@/components/live-elapsed-timer', () => ({
  LiveElapsedTimer: () => 'agora',
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

import { PedidoCard } from '@/components/cozinha/pedido-card'
import { KanbanBoard } from '@/components/cozinha/kanban-board'
import { PendingDeliveriesClient } from '@/components/garcom/pending-deliveries-client'
import { TableOrdersPanel } from '@/components/garcom/table-orders-panel'

const root = process.cwd()

const kitchenItems = [
  {
    nome: 'Pizza',
    quantidade: 1,
    categoriaNome: 'Pratos',
    observacao: null,
  },
]

function kitchenOrder(status: 'novo' | 'em_preparo' | 'pronto') {
  return {
    id: `pedido-${status}`,
    canal: 'salao' as const,
    mesaNumero: 7,
    status,
    criadoEm: new Date('2026-07-23T12:00:00.000Z'),
    itens: kitchenItems,
  }
}

function tableOrder(id: string, status: 'novo' | 'pronto') {
  return {
    id,
    status,
    criadoEm: '2026-07-23T12:00:00.000Z',
    entregueEm: null,
    total: 42,
    itens: [
      {
        nome: 'Pizza',
        quantidade: 1,
        precoUnitario: '42.00',
        observacao: null,
      },
    ],
  }
}

describe('official order state machine in the UI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    actions.atualizarStatus.mockResolvedValue(undefined)
    actions.confirmarEntrega.mockResolvedValue(undefined)
    actions.cancelarPedido.mockResolvedValue(undefined)
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ pedidos: [] }),
      })
    )
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('uses tenant-authenticated polling instead of a kitchen SSE subscription', () => {
    const source = readFileSync(join(root, 'components/cozinha/kanban-board.tsx'), 'utf8')

    expect(source).toContain("fetch('/api/cozinha/pedidos'")
    expect(source).not.toContain('SseListener')
  })

  it('keeps the kitchen board strictly view-only', () => {
    const source = readFileSync(join(root, 'components/cozinha/pedido-card.tsx'), 'utf8')

    render(createElement(PedidoCard, { pedido: kitchenOrder('novo') }))

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(source).not.toContain('atualizarStatus')
    expect(source).not.toContain('useTransition')
    expect(source).not.toContain('onStatusChange')
  })

  it('refreshes waiter pending deliveries every five seconds while the tab is visible', async () => {
    const source = readFileSync(join(root, 'components/garcom/pending-deliveries-client.tsx'), 'utf8')

    expect(source).toContain('window.setInterval')
    expect(source).toContain('5000')
    expect(source).toContain("document.visibilityState === 'visible'")
    expect(source).toContain('router.refresh()')
    expect(source).not.toContain('SseListener')
    expect(source).not.toContain('KitchenEvent')
  })
  it('offers waiter delivery for every active order and confirms it successfully', async () => {
    render(
      createElement(PendingDeliveriesClient, {
        initialPedidos: [
          { ...kitchenOrder('novo'), id: 'novo', mesaNumero: 1 },
          { ...kitchenOrder('pronto'), id: 'pronto', mesaNumero: 2 },
        ],
      })
    )

    expect(screen.getByText('Mesa 1')).toBeInTheDocument()
    expect(screen.getByText('Mesa 2')).toBeInTheDocument()

    fireEvent.click(within(screen.getByText('Mesa 1').closest('article')!).getByRole('button', { name: 'Confirmar entrega' }))

    await waitFor(() => expect(actions.confirmarEntrega).toHaveBeenCalledWith('novo'))
    expect(screen.getByRole('status')).toHaveTextContent('Entrega confirmada.')
    expect(screen.queryByText('Mesa 1')).not.toBeInTheDocument()
  })

  it('enables table delivery for every active order', () => {
    render(
      createElement(TableOrdersPanel, {
        mesaId: 'mesa-1',
        initialPedidos: [
          tableOrder('novo', 'novo'),
          tableOrder('pronto', 'pronto'),
        ],
      })
    )

    const cards = screen.getAllByRole('article')
    expect(within(cards[0]).getByRole('button', { name: 'Entregue' })).toBeEnabled()
    expect(within(cards[1]).getByRole('button', { name: 'Entregue' })).toBeEnabled()
  })

  it('shows an actionable polling error when refreshing orders fails', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn().mockResolvedValue({ ok: false })
    vi.stubGlobal('fetch', fetchMock)
    render(
      createElement(TableOrdersPanel, {
        mesaId: 'mesa-1',
        initialPedidos: [tableOrder('novo', 'novo')],
      })
    )

    await act(async () => {
      vi.advanceTimersByTime(5000)
      await Promise.resolve()
    })

    expect(fetchMock).toHaveBeenCalledWith('/api/garcom/mesa/mesa-1/pedidos', {
      cache: 'no-store',
    })
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Não conseguimos atualizar os pedidos agora.'
    )
  })

  it('does not announce delivery success when its refresh fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    render(
      createElement(TableOrdersPanel, {
        mesaId: 'mesa-1',
        initialPedidos: [tableOrder('pronto', 'pronto')],
      })
    )

    fireEvent.click(screen.getByRole('button', { name: 'Entregue' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não conseguimos atualizar os pedidos agora.'
    )
    expect(actions.confirmarEntrega).toHaveBeenCalledWith('pronto')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
