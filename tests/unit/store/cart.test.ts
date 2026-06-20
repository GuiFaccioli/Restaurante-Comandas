import { describe, it, expect, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import { useCart } from '@/lib/store/cart'

beforeEach(() => {
  useCart.setState({ items: [], total: 0 })
})

describe('useCart', () => {
  it('starts empty', () => {
    expect(useCart.getState().items).toHaveLength(0)
    expect(useCart.getState().total).toBe(0)
  })

  it('addItem increments quantity if item exists', () => {
    act(() => {
      useCart.getState().addItem({ produtoId: 'p1', nome: 'Margherita', preco: 32 })
      useCart.getState().addItem({ produtoId: 'p1', nome: 'Margherita', preco: 32 })
    })
    const { items, total } = useCart.getState()
    expect(items).toHaveLength(1)
    expect(items[0].quantidade).toBe(2)
    expect(total).toBe(64)
  })

  it('addItem adds new entry for different product', () => {
    act(() => {
      useCart.getState().addItem({ produtoId: 'p1', nome: 'Margherita', preco: 32 })
      useCart.getState().addItem({ produtoId: 'p2', nome: 'Pepperoni', preco: 38 })
    })
    expect(useCart.getState().items).toHaveLength(2)
    expect(useCart.getState().total).toBe(70)
  })

  it('removeItem removes the item entirely', () => {
    act(() => {
      useCart.getState().addItem({ produtoId: 'p1', nome: 'Margherita', preco: 32 })
      useCart.getState().removeItem('p1')
    })
    expect(useCart.getState().items).toHaveLength(0)
    expect(useCart.getState().total).toBe(0)
  })

  it('decrementItem removes item when quantity reaches 0', () => {
    act(() => {
      useCart.getState().addItem({ produtoId: 'p1', nome: 'Margherita', preco: 32 })
      useCart.getState().decrementItem('p1')
    })
    expect(useCart.getState().items).toHaveLength(0)
  })

  it('clearCart empties everything', () => {
    act(() => {
      useCart.getState().addItem({ produtoId: 'p1', nome: 'Margherita', preco: 32 })
      useCart.getState().clearCart()
    })
    expect(useCart.getState().items).toHaveLength(0)
    expect(useCart.getState().total).toBe(0)
  })

  it('setObservacao sets observation for item', () => {
    act(() => {
      useCart.getState().addItem({ produtoId: 'p1', nome: 'Margherita', preco: 32 })
      useCart.getState().setObservacao('p1', 'sem cebola')
    })
    expect(useCart.getState().items[0].observacao).toBe('sem cebola')
  })
})
