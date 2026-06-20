import { create } from 'zustand'

export type CartItem = {
  produtoId: string
  nome: string
  preco: number
  quantidade: number
  observacao?: string
}

type CartState = {
  items: CartItem[]
  total: number
  addItem: (item: Pick<CartItem, 'produtoId' | 'nome' | 'preco'>) => void
  removeItem: (produtoId: string) => void
  decrementItem: (produtoId: string) => void
  clearCart: () => void
  setObservacao: (produtoId: string, observacao: string) => void
}

export const useCart = create<CartState>((set) => ({
  items: [],
  total: 0,

  addItem: ({ produtoId, nome, preco }) =>
    set((s) => {
      const existing = s.items.find((i) => i.produtoId === produtoId)
      if (existing) {
        return {
          items: s.items.map((i) =>
            i.produtoId === produtoId ? { ...i, quantidade: i.quantidade + 1 } : i
          ),
          total: s.total + preco,
        }
      }
      return {
        items: [...s.items, { produtoId, nome, preco, quantidade: 1 }],
        total: s.total + preco,
      }
    }),

  removeItem: (produtoId) =>
    set((s) => {
      const item = s.items.find((i) => i.produtoId === produtoId)
      return {
        items: s.items.filter((i) => i.produtoId !== produtoId),
        total: s.total - (item ? item.preco * item.quantidade : 0),
      }
    }),

  decrementItem: (produtoId) =>
    set((s) => {
      const item = s.items.find((i) => i.produtoId === produtoId)
      if (!item) return s
      if (item.quantidade === 1) {
        return {
          items: s.items.filter((i) => i.produtoId !== produtoId),
          total: s.total - item.preco,
        }
      }
      return {
        items: s.items.map((i) =>
          i.produtoId === produtoId ? { ...i, quantidade: i.quantidade - 1 } : i
        ),
        total: s.total - item.preco,
      }
    }),

  clearCart: () => set({ items: [], total: 0 }),

  setObservacao: (produtoId, observacao) =>
    set((s) => ({
      items: s.items.map((i) =>
        i.produtoId === produtoId ? { ...i, observacao } : i
      ),
    })),
}))
