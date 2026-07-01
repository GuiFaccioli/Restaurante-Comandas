import { describe, expect, it } from 'vitest'
import { DEFAULT_MENU_CATEGORIES } from '@/lib/menu/default-menu'

describe('default menu categories', () => {
  it('keeps the app category order as Cozinha, Pizzas, Bebidas', () => {
    expect(DEFAULT_MENU_CATEGORIES.map((category) => category.nome)).toEqual([
      'Cozinha',
      'Pizzas',
      'Bebidas',
    ])
    expect(DEFAULT_MENU_CATEGORIES.map((category) => category.ordem)).toEqual([0, 1, 2])
  })

  it('seeds kitchen products like existing pizza and beverage categories', () => {
    const cozinha = DEFAULT_MENU_CATEGORIES.find((category) => category.nome === 'Cozinha')

    expect(cozinha?.produtos).toHaveLength(3)
    expect(cozinha?.produtos.map((produto) => produto.nome)).toEqual([
      'Lasanha Bolonhesa',
      'Parmegiana de Frango',
      'Batata Frita',
    ])
  })
})
