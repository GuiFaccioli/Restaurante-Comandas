import { describe, expect, it } from 'vitest'
import { getProductAvailability } from '@/lib/stock/availability'

describe('getProductAvailability', () => {
  const recipes = [
    { produtoId: 'prato', insumoId: 'farinha', quantidade: '1' },
    { produtoId: 'outro-prato', insumoId: 'farinha', quantidade: '2' },
  ]
  const balances = [{ id: 'farinha', nome: 'Farinha', estoqueAtual: '5' }]

  it('returns the portions still available after all cart demand is reserved', () => {
    expect(getProductAvailability('prato', [], recipes, balances)).toEqual({
      maxAdditionalQuantity: 5,
      limitingItemName: 'Farinha',
    })

    expect(getProductAvailability('prato', [{ produtoId: 'prato', quantidade: 5 }], recipes, balances)).toEqual({
      maxAdditionalQuantity: 0,
      limitingItemName: 'Farinha',
    })

    expect(getProductAvailability('prato', [{ produtoId: 'outro-prato', quantidade: 2 }], recipes, balances)).toEqual({
      maxAdditionalQuantity: 1,
      limitingItemName: 'Farinha',
    })
  })

  it('does not cap a product with a recipe when stock control is disabled', () => {
    expect(getProductAvailability('prato', [], recipes, balances, [{ id: 'prato', controleEstoque: false }])).toEqual({
      maxAdditionalQuantity: null,
      limitingItemName: null,
    })
  })

  it('returns uncontrolled availability when the product has no recipe', () => {
    expect(getProductAvailability('produto-sem-receita', [], recipes, balances)).toEqual({
      maxAdditionalQuantity: null,
      limitingItemName: null,
    })
  })
})
