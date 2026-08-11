import { createElement } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const toast = vi.hoisted(() => ({ error: vi.fn() }))

vi.mock('sonner', () => ({ toast }))
vi.mock('lucide-react', () => ({
  Minus: () => null,
  Plus: () => null,
}))

import { ItemCard } from '@/components/garcom/item-card'
import { useCart } from '@/lib/store/cart'

beforeEach(() => {
  toast.error.mockReset()
  useCart.setState({ mesaId: null, cartsByMesa: {}, items: [], total: 0 })
  act(() => {
    useCart.getState().selectMesa('mesa-1')
    useCart.getState().addItem({ produtoId: 'produto-1', nome: 'Pizza', preco: 42 })
  })
})

afterEach(cleanup)

describe('inventory stock-cap feedback', () => {
  it('keeps the capped add interaction available so it can show a one-second toast', () => {
    render(createElement(ItemCard, {
      produto: {
        id: 'produto-1', nome: 'Pizza', descricao: null, preco: '42.00',
        disponivel: true, estoqueInsuficiente: false, controleEstoque: true,
      },
      recipes: [{ produtoId: 'produto-1', insumoId: 'farinha', quantidade: '1.000' }],
      balances: [{ id: 'farinha', nome: 'Farinha', estoqueAtual: '1.000' }],
      productStockControls: [{ id: 'produto-1', controleEstoque: true }],
    }))

    const addButton = screen.getByRole('button', { name: 'Adicionar mais Pizza' })
    expect(addButton).not.toHaveAttribute('aria-disabled')
    expect(addButton).not.toBeDisabled()
    expect(addButton).toHaveAttribute('aria-describedby', 'stock-cap-produto-1')
    expect(screen.getByRole('status')).toHaveTextContent('Limite de estoque atingido para Pizza.')

    fireEvent.click(addButton)

    expect(toast.error).toHaveBeenCalledWith('Sem estoque: Farinha', {
      duration: 1000,
    })
  })
})
