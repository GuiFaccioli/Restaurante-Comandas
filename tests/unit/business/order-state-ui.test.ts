import { createElement } from 'react'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { KitchenEvent } from '@/lib/sse'

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

const eventSources: FakeEventSource[] = []

class FakeEventSource {
  onmessage: ((event: { data: string }) => void) | null = null
  onerror: (() => void) | null = null
  close = vi.fn()

  constructor(readonly url: string) {
    eventSources.push(this)
  }

  emit(event: KitchenEvent) {
    this.onmessage?.({ data: JSON.stringify(event) })
  }
}

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
    eventSources.length = 0
    vi.clearAllMocks()
    actions.atualizarStatus.mockResolvedValue(undefined)
    actions.confirmarEntrega.mockResolvedValue(undefined)
    actions.cancelarPedido.mockResolvedValue(undefined)
    vi.stubGlobal('EventSource', FakeEventSource)
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

  it('deduplicates repeated novo_pedido events by pedidoId', () => {
    render(createElement(KanbanBoard, { initialPedidos: [] }))
    const event: KitchenEvent = {
      type: 'novo_pedido',
      payload: {
        pedidoId: 'pedido-sse',
        mesaNumero: 4,
        itens: kitchenItems,
      },
    }

    act(() => eventSources[0].emit(event))
    act(() => eventSources[0].emit(event))

    expect(screen.getByRole('heading', { name: 'Comandas abertas (1)' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Iniciar preparo' })).toHaveLength(1)
  })

  it('keeps the same Kanban order while SSE advances it through preparation', () => {
    render(createElement(KanbanBoard, { initialPedidos: [] }))

    act(() => {
      eventSources[0].emit({
        type: 'novo_pedido',
        payload: {
          pedidoId: 'pedido-ciclo',
          mesaNumero: 5,
          itens: kitchenItems,
        },
      })
    })
    expect(screen.getByRole('button', { name: 'Iniciar preparo' })).toBeEnabled()

    act(() => {
      eventSources[0].emit({
        type: 'status_atualizado',
        payload: { pedidoId: 'pedido-ciclo', status: 'em_preparo' },
      })
    })
    expect(screen.queryByRole('button', { name: 'Iniciar preparo' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Marcar pronto' })).toBeEnabled()

    act(() => {
      eventSources[0].emit({
        type: 'status_atualizado',
        payload: { pedidoId: 'pedido-ciclo', status: 'pronto' },
      })
    })
    expect(screen.queryByRole('button', { name: 'Marcar pronto' })).not.toBeInTheDocument()
    expect(screen.getByText('Pronto')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Comandas abertas (1)' })).toBeInTheDocument()
  })

  it('moves a kitchen order from novo to em_preparo and then to pronto', async () => {
    const onStatusChange = vi.fn()
    const view = render(
      createElement(PedidoCard, {
        pedido: kitchenOrder('novo'),
        onStatusChange,
      })
    )

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar preparo' }))

    await waitFor(() => {
      expect(actions.atualizarStatus).toHaveBeenCalledWith('pedido-novo', 'em_preparo')
      expect(onStatusChange).toHaveBeenCalledWith('pedido-novo', 'em_preparo')
    })
    expect(screen.getByRole('status')).toHaveTextContent('Preparo iniciado.')

    view.rerender(
      createElement(PedidoCard, {
        pedido: kitchenOrder('em_preparo'),
        onStatusChange,
      })
    )

    fireEvent.click(screen.getByRole('button', { name: 'Marcar pronto' }))

    await waitFor(() => {
      expect(actions.atualizarStatus).toHaveBeenLastCalledWith('pedido-em_preparo', 'pronto')
      expect(onStatusChange).toHaveBeenLastCalledWith('pedido-em_preparo', 'pronto')
    })
    expect(screen.getByRole('status')).toHaveTextContent('Pedido pronto.')
  })

  it('keeps kitchen actions disabled while pending and reports an action error', async () => {
    let rejectAction: ((reason?: unknown) => void) | undefined
    actions.atualizarStatus.mockImplementation(
      () =>
        new Promise<void>((_resolve, reject) => {
          rejectAction = reject
        })
    )

    render(
      createElement(PedidoCard, {
        pedido: kitchenOrder('novo'),
        onStatusChange: vi.fn(),
      })
    )

    const action = screen.getByRole('button', { name: 'Iniciar preparo' })
    fireEvent.click(action)

    await waitFor(() => expect(action).toBeDisabled())
    rejectAction?.(new Error('failure'))

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível atualizar.')
    expect(action).toBeEnabled()
  })

  it('offers waiter delivery only for pronto and confirms it successfully', async () => {
    render(
      createElement(PendingDeliveriesClient, {
        initialPedidos: [
          { ...kitchenOrder('novo'), id: 'novo', mesaNumero: 1 },
          { ...kitchenOrder('pronto'), id: 'pronto', mesaNumero: 2 },
        ],
      })
    )

    expect(screen.queryByText('Mesa 1')).not.toBeInTheDocument()
    expect(screen.getByText('Mesa 2')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar entrega' }))

    await waitFor(() => expect(actions.confirmarEntrega).toHaveBeenCalledWith('pronto'))
    expect(screen.getByRole('status')).toHaveTextContent('Entrega confirmada.')
    expect(screen.queryByText('Mesa 2')).not.toBeInTheDocument()
  })

  it('never enables table delivery for novo and enables it for pronto', () => {
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
    expect(within(cards[0]).getByRole('button', { name: 'Entregue' })).toBeDisabled()
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
      'Não foi possível atualizar os pedidos. Tente novamente.'
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
      'Entrega registrada, mas não foi possível atualizar a lista. Tente novamente.'
    )
    expect(actions.confirmarEntrega).toHaveBeenCalledWith('pronto')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
