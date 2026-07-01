import { describe, expect, it } from 'vitest'
import { groupKitchenItemsByCategory } from '@/lib/kitchen/order-items'

describe('groupKitchenItemsByCategory', () => {
  it('groups command items as Cozinha, Pizzas, Bebidas', () => {
    const groups = groupKitchenItemsByCategory([
      { nome: 'Coca-Cola 350ml', quantidade: 1, categoriaNome: 'Bebidas' },
      { nome: 'Margherita', quantidade: 2, categoriaNome: 'Pizzas' },
      { nome: 'Lasanha Bolonhesa', quantidade: 1, categoriaNome: 'Cozinha' },
    ])

    expect(groups).toEqual([
      {
        category: 'Cozinha',
        items: [{ nome: 'Lasanha Bolonhesa', quantidade: 1, categoriaNome: 'Cozinha' }],
      },
      {
        category: 'Pizzas',
        items: [{ nome: 'Margherita', quantidade: 2, categoriaNome: 'Pizzas' }],
      },
      {
        category: 'Bebidas',
        items: [{ nome: 'Coca-Cola 350ml', quantidade: 1, categoriaNome: 'Bebidas' }],
      },
    ])
  })

  it('omits empty known categories and keeps unknown categories after known ones', () => {
    const groups = groupKitchenItemsByCategory([
      { nome: 'Sobremesa', quantidade: 1, categoriaNome: 'Sobremesas' },
      { nome: 'Água com gás', quantidade: 1, categoriaNome: 'Bebidas' },
    ])

    expect(groups.map((group) => group.category)).toEqual(['Bebidas', 'Sobremesas'])
  })
})
