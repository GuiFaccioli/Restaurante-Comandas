import { createElement } from 'react'
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/components/cozinha/pedido-card', () => ({
  PedidoCard: ({ pedido }: { pedido: { id: string } }) => createElement('div', null, pedido.id),
}))

import { KanbanBoard } from '@/components/cozinha/kanban-board'

const initialPedidos = [{
  id: 'order-a', mesaNumero: 1, status: 'novo' as const, criadoEm: '2026-07-26T12:00:00.000Z', itens: [],
}]

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ pedidos: [] }) }))
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('KanbanBoard polling', () => {
  it('refreshes kitchen orders every five seconds while the tab is visible', async () => {
    render(createElement(KanbanBoard, { initialPedidos }))

    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })

    expect(fetch).toHaveBeenCalledWith('/api/cozinha/pedidos', { cache: 'no-store' })
  })

  it('pauses while hidden and refreshes as soon as the tab becomes visible', async () => {
    let visibility = 'hidden'
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility })
    render(createElement(KanbanBoard, { initialPedidos }))

    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
    expect(fetch).not.toHaveBeenCalled()

    visibility = 'visible'
    await act(async () => { document.dispatchEvent(new Event('visibilitychange')) })
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('does not start a second refresh while the previous request is pending', async () => {
    let resolveFetch!: (value: { ok: boolean; json: () => Promise<{ pedidos: never[] }> }) => void
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise((resolve) => { resolveFetch = resolve }))
    )
    render(createElement(KanbanBoard, { initialPedidos }))

    await act(async () => { await vi.advanceTimersByTimeAsync(10000) })
    expect(fetch).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolveFetch({ ok: true, json: async () => ({ pedidos: [] }) })
    })
  })

  it('retains the current orders when polling fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    render(createElement(KanbanBoard, { initialPedidos }))

    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })

    expect(screen.getByText('order-a')).toBeInTheDocument()
  })
})
