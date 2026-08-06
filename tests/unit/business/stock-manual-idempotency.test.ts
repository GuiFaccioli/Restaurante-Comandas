import { describe, expect, it } from 'vitest'
import { getReplenishmentItems, getStockStatus } from '@/lib/stock/replenishment'

describe('stock replenishment rules', () => {
  const base = { id: 'item-1', nome: 'Farinha', unidadeBase: 'g', unidadeCompra: 'kg', fatorCompraParaBase: '1000', estoqueAtual: '4000', estoqueMinimo: '5000', estoqueIdeal: '15000', ativo: true }

  it('includes items at or below the minimum and converts the suggestion to purchase units', () => {
    expect(getReplenishmentItems([base])[0]).toMatchObject({ status: 'estoque_baixo', quantidadeSugeridaBase: 11000, quantidadeSugeridaCompra: 11 })
    expect(getReplenishmentItems([{ ...base, estoqueAtual: '5000' }])).toHaveLength(1)
    expect(getReplenishmentItems([{ ...base, estoqueAtual: '6000' }])).toHaveLength(0)
  })

  it('does not list inactive items or items without a minimum', () => {
    expect(getReplenishmentItems([{ ...base, ativo: false }, { ...base, id: 'item-2', estoqueMinimo: null }])).toHaveLength(0)
  })

  it('labels stock status correctly', () => {
    expect(getStockStatus({ estoqueAtual: '0', estoqueMinimo: '5', ativo: true })).toBe('sem_estoque')
    expect(getStockStatus({ estoqueAtual: '10', estoqueMinimo: null, ativo: true })).toBe('sem_controle')
    expect(getStockStatus({ estoqueAtual: '0', estoqueMinimo: null, ativo: true })).toBe('sem_controle')
    expect(getStockStatus({ estoqueAtual: '10', estoqueMinimo: '5', ativo: false })).toBe('inativo')
  })
})
