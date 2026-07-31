import { createElement, type ReactNode } from 'react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useCart } from '@/lib/store/cart'

const uiState = vi.hoisted(() => ({
  cartSnapshots: [] as Array<{
    routeMesaId: string
    activeMesaId: string | null
    produtoIds: string[]
  }>,
}))

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) =>
    createElement('a', { href }, children),
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}))
vi.mock('lucide-react', () => ({
  ArrowLeft: () => null,
  Bell: () => null,
  MoreVertical: () => null,
}))
vi.mock('@/components/garcom/menu-grid', () => ({
  MenuGrid: () => createElement('div', { 'data-testid': 'menu-grid' }),
}))
vi.mock('@/components/garcom/mesa-atendimento-gate', () => ({
  MesaAtendimentoGate: () => createElement('div', { 'data-testid': 'attendance-gate' }),
}))
vi.mock('@/components/garcom/cart-fab', () => ({
  CartFab: () => createElement('div', { 'data-testid': 'cart-fab' }),
}))
vi.mock('@/components/garcom/cart-drawer', async () => {
  const { useCart: useCartInConsumer } = await import('@/lib/store/cart')

  return {
    CartDrawer: ({ mesaId }: { mesaId: string }) => {
      const activeMesaId = useCartInConsumer((state) => state.mesaId)
      const items = useCartInConsumer((state) => state.items)
      const produtoIds = items.map((item) => item.produtoId)

      uiState.cartSnapshots.push({ routeMesaId: mesaId, activeMesaId, produtoIds })

      return createElement(
        'output',
        { 'data-testid': 'cart-consumer' },
        produtoIds.join(',')
      )
    },
  }
})
vi.mock('@/components/garcom/table-orders-panel', () => ({
  TableOrdersPanel: () => null,
}))
vi.mock('@/components/operational/scroll-to-top', () => ({
  ScrollToTopButton: () => null,
}))

import { MesaPageClient } from '@/app/garcom/mesa/[id]/client'

const source = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

const mesaPage = (mesaId: string, mesaNumero: number) =>
  createElement(MesaPageClient, {
    mesaId,
    mesaNumero,
    atendimentoId: `atendimento-${mesaId}`,
    attendances: [],
    categorias: [],
    initialPedidos: [],
  })

beforeEach(() => {
  uiState.cartSnapshots = []
  useCart.setState({
    mesaId: null,
    cartsByMesa: {},
    items: [],
    total: 0,
  })
})

afterEach(cleanup)

describe('waiter cart action semantics', () => {
  it('names every icon-only quantity/removal action and uses 44px targets', () => {
    const itemCard = source('components/garcom/item-card.tsx')
    const cart = source('components/garcom/cart-drawer.tsx')

    expect(itemCard).toContain('aria-label={`Diminuir ${produto.nome}`}')
    expect(itemCard).toContain('aria-label={`Adicionar mais ${produto.nome}`}')
    expect(cart).toContain('aria-label={`Diminuir ${item.nome}`}')
    expect(cart).toContain('aria-label={`Adicionar mais ${item.nome}`}')
    expect(cart).toContain('aria-label={`Remover ${item.nome} do carrinho`}')
    expect(itemCard).toContain('size-11')
    expect(cart).toContain('size-11')
  })

  it('announces cart confirmation pending and keeps dismiss neutral', () => {
    const cart = source('components/garcom/cart-drawer.tsx')

    expect(cart).toContain('aria-busy={sending}')
    expect(cart).toMatch(/intent="positive"[\s\S]*Confirmar pedido/)
    expect(cart).toMatch(/intent="neutral"[\s\S]*Cancelar/)
  })

  it('never renders a cart consumer with items from the previous table during a switch', () => {
    act(() => {
      useCart.getState().selectMesa('mesa-a')
      useCart.getState().addItem({ produtoId: 'produto-a', nome: 'Margherita', preco: 32 })
      useCart.getState().selectMesa('mesa-b')
      useCart.getState().addItem({ produtoId: 'produto-b', nome: 'Pepperoni', preco: 38 })
      useCart.getState().selectMesa('mesa-a')
    })

    const view = render(mesaPage('mesa-a', 1))
    expect(screen.getByTestId('cart-consumer')).toHaveTextContent('produto-a')

    view.rerender(mesaPage('mesa-b', 2))

    expect(screen.getByTestId('cart-consumer')).toHaveTextContent('produto-b')
    expect(uiState.cartSnapshots).not.toContainEqual(
      expect.objectContaining({
        routeMesaId: 'mesa-b',
        activeMesaId: 'mesa-a',
      })
    )
  })

  it('clears after successful confirmation without persisting cart identity', () => {
    const cart = source('components/garcom/cart-drawer.tsx')
    const store = source('lib/store/cart.ts')

    expect(cart).toMatch(/await confirmarPedido\([\s\S]*\)[\s\S]*clearCart\(\)/)
    expect(store).not.toContain('tenantId')
    expect(store).not.toContain('localStorage')
    expect(store).not.toContain('persist(')
  })
})
