import { describe, it, expect, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import { useCart } from '@/lib/store/cart'

beforeEach(() => {
  useCart.setState({
    mesaId: null,
    deliveryId: null,
    cartsByMesa: {},
    cartsByDelivery: {},
    items: [],
    total: 0,
  })
})

describe('useCart', () => {
  it('starts empty', () => {
    expect(useCart.getState().items).toHaveLength(0)
    expect(useCart.getState().total).toBe(0)
  })

  it('ignores add, remove, and clear before a table is selected', () => {
    const initialState = useCart.getState()

    act(() => {
      useCart.getState().addItem({ produtoId: 'p1', nome: 'Margherita', preco: 32 })
      useCart.getState().removeItem('p1')
      useCart.getState().clearCart()
    })

    expect(useCart.getState()).toBe(initialState)
    expect(useCart.getState().cartsByMesa).toEqual({})
  })

  it('addItem increments quantity if item exists', () => {
    act(() => {
      useCart.getState().selectMesa('mesa-a')
      useCart.getState().addItem({ produtoId: 'p1', nome: 'Margherita', preco: 32 })
      useCart.getState().addItem({ produtoId: 'p1', nome: 'Margherita', preco: 32 })
    })
    const { items, total } = useCart.getState()
    expect(items).toHaveLength(1)
    expect(items[0].quantidade).toBe(2)
    expect(total).toBe(64)
  })

  it('adds products to a selected delivery cart', () => {
    act(() => {
      useCart.getState().selectDelivery('customer-a')
    })

    expect(useCart.getState().addItem({
      produtoId: 'p1',
      nome: 'Margherita',
      preco: 32,
    })).toBe(true)

    expect(useCart.getState().items).toEqual([{
      produtoId: 'p1',
      nome: 'Margherita',
      preco: 32,
      quantidade: 1,
    }])
    expect(useCart.getState().total).toBe(32)
    expect(useCart.getState().cartsByDelivery['customer-a'].total).toBe(32)
  })

  it('addItem adds new entry for different product', () => {
    act(() => {
      useCart.getState().selectMesa('mesa-a')
      useCart.getState().addItem({ produtoId: 'p1', nome: 'Margherita', preco: 32 })
      useCart.getState().addItem({ produtoId: 'p2', nome: 'Pepperoni', preco: 38 })
    })
    expect(useCart.getState().items).toHaveLength(2)
    expect(useCart.getState().total).toBe(70)
  })

  it('removeItem removes the item entirely', () => {
    act(() => {
      useCart.getState().selectMesa('mesa-a')
      useCart.getState().addItem({ produtoId: 'p1', nome: 'Margherita', preco: 32 })
      useCart.getState().removeItem('p1')
    })
    expect(useCart.getState().items).toHaveLength(0)
    expect(useCart.getState().total).toBe(0)
  })

  it('decrementItem removes item when quantity reaches 0', () => {
    act(() => {
      useCart.getState().selectMesa('mesa-a')
      useCart.getState().addItem({ produtoId: 'p1', nome: 'Margherita', preco: 32 })
      useCart.getState().decrementItem('p1')
    })
    expect(useCart.getState().items).toHaveLength(0)
  })

  it('clearCart empties everything', () => {
    act(() => {
      useCart.getState().selectMesa('mesa-a')
      useCart.getState().addItem({ produtoId: 'p1', nome: 'Margherita', preco: 32 })
      useCart.getState().clearCart()
    })
    expect(useCart.getState().items).toHaveLength(0)
    expect(useCart.getState().total).toBe(0)
  })

  it('setObservacao sets observation for item', () => {
    act(() => {
      useCart.getState().selectMesa('mesa-a')
      useCart.getState().addItem({ produtoId: 'p1', nome: 'Margherita', preco: 32 })
      useCart.getState().setObservacao('p1', 'sem cebola')
    })
    expect(useCart.getState().items[0].observacao).toBe('sem cebola')
  })

  it('does not mutate the cart when an item has reached its stock cap', () => {
    act(() => {
      useCart.getState().selectMesa('mesa-a')
      expect(useCart.getState().addItem({ produtoId: 'p1', nome: 'Margherita', preco: 32 }, 1)).toBe(true)
      expect(useCart.getState().addItem({ produtoId: 'p1', nome: 'Margherita', preco: 32 }, 1)).toBe(false)
    })

    expect(useCart.getState().items).toEqual([
      { produtoId: 'p1', nome: 'Margherita', preco: 32, quantidade: 1 },
    ])
    expect(useCart.getState().total).toBe(32)
  })

  it('isolates carts across A to B to A and clears only the confirmed table', () => {
    act(() => {
      useCart.getState().selectMesa('mesa-a')
      useCart.getState().addItem({ produtoId: 'p1', nome: 'Margherita', preco: 32 })
      useCart.getState().selectMesa('mesa-b')
    })

    expect(useCart.getState().items).toEqual([])
    expect(useCart.getState().total).toBe(0)

    act(() => {
      useCart.getState().addItem({ produtoId: 'p2', nome: 'Pepperoni', preco: 38 })
      useCart.getState().selectMesa('mesa-a')
    })

    expect(useCart.getState().items.map((item) => item.produtoId)).toEqual(['p1'])
    expect(useCart.getState().total).toBe(32)

    act(() => {
      useCart.getState().clearCart()
      useCart.getState().selectMesa('mesa-b')
    })

    expect(useCart.getState().items.map((item) => item.produtoId)).toEqual(['p2'])
    expect(useCart.getState().total).toBe(38)

    act(() => {
      useCart.getState().selectMesa('mesa-a')
    })

    expect(useCart.getState().items).toEqual([])
    expect(useCart.getState().total).toBe(0)
  })
})
