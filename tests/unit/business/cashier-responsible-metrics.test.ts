import { createElement } from 'react'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { KitchenEvent } from '@/lib/sse'
import type { CashierOrder } from '@/lib/orders/queries'

const realtime = vi.hoisted(() => ({
  onEvent: null as ((event: KitchenEvent) => void) | null,
}))

vi.mock('@/components/cozinha/sse-listener', () => ({
  SseListener: ({ onEvent }: { onEvent: (event: KitchenEvent) => void }) => {
    realtime.onEvent = onEvent
    return null
  },
}))

vi.mock('@/lib/actions/pedidos', () => ({
  registrarPagamentoPedido: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() },
}))

import { AdminStatCard } from '@/components/admin/admin-page'
import { AdminPedidosLive } from '@/app/admin/pedidos/client'

function makeOrder(overrides: Partial<CashierOrder> = {}): CashierOrder {
  return {
    id: 'pedido-00000001',
    status: 'entregue',
    criadoEm: '2026-07-13T12:00:00.000Z',
    entregueEm: '2026-07-13T12:15:00.000Z',
    total: 48,
    itens: [{ nome: 'Mussarela', quantidade: 1, precoUnitario: '48.00' }],
    mesaNumero: 4,
    pagamentoStatus: 'pendente',
    criadoPor: { usuarioId: 'waiter-1', nome: 'João Garçom' },
    pagamento: null,
    ...overrides,
  }
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  realtime.onEvent = null
})

describe('AdminStatCard', () => {
  it('keeps existing usages static when no activation callback is provided', () => {
    const { container } = render(
      createElement(AdminStatCard, {
        label: 'Pedidos registrados',
        value: 12,
        detail: 'Resumo estático',
      })
    )

    expect(container.querySelector('button')).toBeNull()
    expect(screen.getByText('Pedidos registrados').closest('div')).toBeInTheDocument()
  })

  it('renders an accessible real button with explicit expanded state', () => {
    const onClick = vi.fn()
    render(
      createElement(AdminStatCard, {
        label: 'Pagos',
        value: 3,
        detail: 'Pedidos baixados',
        onClick,
        expanded: true,
        controls: 'cashier-responsibility-panel',
      })
    )

    const button = screen.getByRole('button', { name: /Pagos/ })
    expect(button).toHaveAttribute('type', 'button')
    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(button).toHaveAttribute('aria-controls', 'cashier-responsibility-panel')
    expect(button).toHaveClass(
      'flex',
      'w-full',
      'flex-col',
      'gap-0',
      'rounded-[var(--radius)]',
      'whitespace-normal',
      'focus-visible:ring-2',
      'focus-visible:ring-ring'
    )
    for (const buttonOnlyClass of [
      'inline-flex',
      'flex-row',
      'gap-1.5',
      'whitespace-nowrap',
      'rounded-full',
    ]) {
      expect(button).not.toHaveClass(buttonOnlyClass)
    }
    expect(screen.getByText('Ocultar responsáveis')).toBeInTheDocument()

    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})

describe('AdminPedidosLive responsible metrics', () => {
  const pending = makeOrder()
  const historical = makeOrder({
    id: 'pedido-00000002',
    mesaNumero: 7,
    criadoPor: null,
  })
  const paid = makeOrder({
    id: 'pedido-00000003',
    mesaNumero: 9,
    total: 52,
    pagamentoStatus: 'pago',
    pagamento: {
      valor: 52,
      registradoEm: '2026-07-13T12:30:00.000Z',
      registradoPor: { usuarioId: 'cashier-1', nome: 'Ana Caixa' },
    },
  })

  it('opens, switches, and closes the responsibility panel', () => {
    render(createElement(AdminPedidosLive, { initialPedidos: [pending, paid] }))

    const queueButton = screen.getByRole('button', { name: /Pedidos na fila/ })
    const pendingButton = screen.getByRole('button', { name: /Pagamentos pendentes/ })
    fireEvent.click(queueButton)
    expect(queueButton).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('heading', { name: 'Responsáveis · Pedidos na fila' })).toBeInTheDocument()

    fireEvent.click(pendingButton)
    expect(queueButton).toHaveAttribute('aria-expanded', 'false')
    expect(pendingButton).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('heading', { name: 'Responsáveis · Pagamentos pendentes' })).toBeInTheDocument()

    fireEvent.click(pendingButton)
    expect(pendingButton).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByTestId('cashier-responsibility-panel')).not.toBeInTheDocument()
  })

  it('shows waiter for pending orders, cashier and paid value for paid orders', () => {
    render(createElement(AdminPedidosLive, { initialPedidos: [pending, paid] }))

    fireEvent.click(screen.getByRole('button', { name: /Pagamentos pendentes/ }))
    expect(screen.getByText('Lançado por')).toBeInTheDocument()
    expect(screen.getByText('João Garçom')).toBeInTheDocument()
    expect(within(screen.getByTestId('cashier-responsibility-panel')).getByText('R$ 48,00')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /^Pagos/ }))
    expect(screen.getByText('Recebido por')).toBeInTheDocument()
    expect(screen.getByText('Ana Caixa')).toBeInTheDocument()
    expect(within(screen.getByTestId('cashier-responsibility-panel')).getByText('R$ 52,00')).toBeInTheDocument()
  })

  it('uses the historical fallback instead of inferring a user', () => {
    render(createElement(AdminPedidosLive, { initialPedidos: [historical] }))

    fireEvent.click(screen.getByRole('button', { name: /Pedidos na fila/ }))
    expect(screen.getByText('Responsável não registrado')).toBeInTheDocument()
  })

  it('renders a category-specific empty state', () => {
    render(createElement(AdminPedidosLive, { initialPedidos: [pending] }))

    fireEvent.click(screen.getByRole('button', { name: /^Pagos/ }))
    expect(screen.getByText('Nenhum pedido pago.')).toBeInTheDocument()
  })

  it('keeps the active metric selected when SSE refreshes to an empty category', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ pedidos: [] }),
    })
    vi.stubGlobal('fetch', fetchMock)
    render(createElement(AdminPedidosLive, { initialPedidos: [pending] }))

    const pendingButton = screen.getByRole('button', { name: /Pagamentos pendentes/ })
    fireEvent.click(pendingButton)
    await act(async () => {
      realtime.onEvent?.({
        type: 'status_atualizado',
        payload: { pedidoId: pending.id, status: 'entregue' },
      })
    })

    expect(await screen.findByText('Nenhum pagamento pendente.')).toBeInTheDocument()
    expect(pendingButton).toHaveAttribute('aria-expanded', 'true')
  })

  it('keeps the active metric selected when polling refreshes its orders', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ pedidos: [] }),
    }))
    render(createElement(AdminPedidosLive, { initialPedidos: [pending] }))

    const queueButton = screen.getByRole('button', { name: /Pedidos na fila/ })
    fireEvent.click(queueButton)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })

    expect(queueButton).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Nenhum pedido na fila.')).toBeInTheDocument()
  })

  it('triages the queue with a payment filter and search field', () => {
    const preparing = makeOrder({
      id: 'pedido-00000004',
      mesaNumero: 12,
      status: 'em_preparo',
    })
    render(createElement(AdminPedidosLive, { initialPedidos: [pending, paid, preparing] }))

    fireEvent.click(screen.getByRole('button', { name: /Para cobrar/ }))
    expect(screen.getByText('Mesa 4')).toBeInTheDocument()
    expect(screen.queryByText('Mesa 9')).not.toBeInTheDocument()
    expect(screen.queryByText('Mesa 12')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Buscar mesa ou pedido'), { target: { value: '12' } })
    expect(screen.getByText('Nenhum pedido corresponde aos filtros.')).toBeInTheDocument()
  })
})
