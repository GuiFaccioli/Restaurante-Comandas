import { create } from 'zustand'

export type CartItem = {
  produtoId: string
  nome: string
  preco: number
  quantidade: number
  observacao?: string
}

type TableCart = {
  items: CartItem[]
  total: number
}

type CartState = {
  mesaId: string | null
  deliveryId: string | null
  cartsByMesa: Record<string, TableCart>
  cartsByDelivery: Record<string, TableCart>
  items: CartItem[]
  total: number
  selectMesa: (mesaId: string) => void
  selectDelivery: (deliveryId: string) => void
  addItem: (item: Pick<CartItem, 'produtoId' | 'nome' | 'preco'>, maxQuantity?: number) => boolean
  removeItem: (produtoId: string) => void
  decrementItem: (produtoId: string) => void
  clearCart: () => void
  setObservacao: (produtoId: string, observacao: string) => void
}

function updateActiveCart(
  state: CartState,
  update: (cart: TableCart) => TableCart
): CartState | Partial<CartState> {
  if (state.deliveryId) {
    const cart = update({ items: state.items, total: state.total })
    return {
      items: cart.items,
      total: cart.total,
      cartsByDelivery: {
        ...(state.cartsByDelivery ?? {}),
        [state.deliveryId]: cart,
      },
    }
  }
  if (!state.mesaId) return state

  const cart = update({ items: state.items, total: state.total })

  return {
    items: cart.items,
    total: cart.total,
    cartsByMesa: {
      ...state.cartsByMesa,
      [state.mesaId]: cart,
    },
  }
}

export const useCart = create<CartState>((set) => ({
  mesaId: null,
  deliveryId: null,
  cartsByMesa: {},
  cartsByDelivery: {},
  items: [],
  total: 0,

  selectMesa: (mesaId) =>
    set((state) => {
      if (state.mesaId === mesaId && !state.deliveryId) return state

      const cart = state.cartsByMesa[mesaId] ?? { items: [], total: 0 }
      return {
        mesaId,
        deliveryId: null,
        items: cart.items,
        total: cart.total,
      }
    }),

  selectDelivery: (deliveryId) =>
    set((state) => {
      if (state.deliveryId === deliveryId && state.mesaId === null) return state

      const cart = state.cartsByDelivery?.[deliveryId] ?? { items: [], total: 0 }
      return {
        mesaId: null,
        deliveryId,
        items: cart.items,
        total: cart.total,
      }
    }),

  addItem: ({ produtoId, nome, preco }, maxQuantity) => {
    let added = false
    set((state) => {
      if (!state.mesaId && !state.deliveryId) return state

      const existingQuantity = state.items.find((item) => item.produtoId === produtoId)?.quantidade ?? 0
      if (maxQuantity !== undefined && existingQuantity >= maxQuantity) return state

      added = true
      return updateActiveCart(state, (cart) => {
        const existing = cart.items.find((i) => i.produtoId === produtoId)
        if (existing) {
          return {
            items: cart.items.map((i) =>
              i.produtoId === produtoId ? { ...i, quantidade: i.quantidade + 1 } : i
            ),
            total: cart.total + preco,
          }
        }
        return {
          items: [...cart.items, { produtoId, nome, preco, quantidade: 1 }],
          total: cart.total + preco,
        }
      })
    })
    return added
  },

  removeItem: (produtoId) =>
    set((state) =>
      updateActiveCart(state, (cart) => {
        const item = cart.items.find((i) => i.produtoId === produtoId)
        return {
          items: cart.items.filter((i) => i.produtoId !== produtoId),
          total: cart.total - (item ? item.preco * item.quantidade : 0),
        }
      })
    ),

  decrementItem: (produtoId) =>
    set((state) =>
      updateActiveCart(state, (cart) => {
        const item = cart.items.find((i) => i.produtoId === produtoId)
        if (!item) return cart
        if (item.quantidade === 1) {
          return {
            items: cart.items.filter((i) => i.produtoId !== produtoId),
            total: cart.total - item.preco,
          }
        }
        return {
          items: cart.items.map((i) =>
            i.produtoId === produtoId ? { ...i, quantidade: i.quantidade - 1 } : i
          ),
          total: cart.total - item.preco,
        }
      })
    ),

  clearCart: () =>
    set((state) => updateActiveCart(state, () => ({ items: [], total: 0 }))),

  setObservacao: (produtoId, observacao) =>
    set((state) =>
      updateActiveCart(state, (cart) => ({
        items: cart.items.map((i) =>
          i.produtoId === produtoId ? { ...i, observacao } : i
        ),
        total: cart.total,
      }))
    ),
}))
