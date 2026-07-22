import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db/index', () => ({
  db: {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
  },
}))
vi.mock('@/lib/auth/access', () => ({
  requireAccess: vi.fn(async () => ({ usuarioId: 'user-1', tenantId: 'tenant-1', access: 'admin' })),
}))
vi.mock('@/lib/stock/service', () => ({
  applyStockMovement: vi.fn().mockResolvedValue({ applied: true }),
}))

import { db } from '@/lib/db/index'
import { insumo } from '@/lib/db/schema'
import { normalizarQuantidadeBase, UNIDADES_BASE } from '@/lib/stock/units'
import { produtoTemEstoque } from '@/lib/stock/availability'
import {
  criarInsumo,
} from '@/lib/actions/estoque'
import { applyStockMovement } from '@/lib/stock/service'

beforeEach(() => vi.clearAllMocks())

describe('normalizarQuantidadeBase', () => {
  it('converts purchase kilograms to grams', () => {
    expect(normalizarQuantidadeBase('2', 'kg', 'g')).toBe('2000.000')
  })

  it('converts purchase liters to milliliters', () => {
    expect(normalizarQuantidadeBase('1,5', 'l', 'ml')).toBe('1500.000')
  })

  it('allows zero for an initial empty stock balance', () => {
    expect(normalizarQuantidadeBase('0', 'kg', 'g')).toBe('0.000')
  })

  it('rejects incompatible units', () => {
    expect(() => normalizarQuantidadeBase('1', 'kg', 'ml')).toThrow(
      'As unidades de compra e estoque precisam ser compatíveis'
    )
  })
})

describe('criarInsumo', () => {
  it('normalizes names and creates a tenant-scoped ingredient', async () => {
    const returning = vi.fn().mockResolvedValue([{ id: 'insumo-1' }])
    ;(db.insert as any).mockReturnValue({ values: vi.fn().mockReturnValue({ returning }) })

    await expect(criarInsumo({
      nome: '  Muçarela  ',
      unidadeBase: 'g',
      unidadeCompra: 'kg',
      estoqueIdeal: '10',
      estoqueMinimo: '3',
    })).resolves.toEqual({ id: 'insumo-1' })

    expect(db.insert).toHaveBeenCalledWith(insumo)
    expect(returning).toHaveBeenCalledTimes(1)
    expect((db.insert as any).mock.results[0].value.values).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1',
      nome: 'Muçarela',
      unidadeBase: 'g',
      unidadeCompra: 'kg',
      fatorCompraParaBase: '1000.000',
      estoqueAtual: '0.000',
      estoqueIdeal: '10000.000',
      estoqueMinimo: '3000.000',
    }))
    expect(applyStockMovement).not.toHaveBeenCalled()
  })

  it('rejects an empty name and invalid unit', async () => {
    await expect(criarInsumo({
      nome: ' ',
      unidadeBase: UNIDADES_BASE[0],
      unidadeCompra: 'kg',
    })).rejects.toThrow('Informe o nome do insumo')

    await expect(criarInsumo({
      nome: 'Molho',
      unidadeBase: 'unidade',
      unidadeCompra: 'kg',
    })).rejects.toThrow('As unidades de compra e estoque precisam ser compatíveis')
    expect(db.insert).not.toHaveBeenCalled()
  })

  it('ignores an unsupported stock value sent outside the typed contract', async () => {
    const returning = vi.fn().mockResolvedValue([{ id: 'insumo-2' }])
    ;(db.insert as any).mockReturnValue({ values: vi.fn().mockReturnValue({ returning }) })

    await criarInsumo({
      nome: 'Bacon',
      unidadeBase: 'g',
      unidadeCompra: 'kg',
      estoqueIdeal: '10',
      estoqueMinimo: '2',
      estoqueAtual: '5000',
    } as never)

    expect((db.insert as any).mock.results[0].value.values).toHaveBeenCalledWith(expect.objectContaining({
      estoqueAtual: '0.000',
      custoUnitario: null,
    }))
    expect(applyStockMovement).not.toHaveBeenCalled()
  })
})

describe('produtoTemEstoque', () => {
  it('returns false when one recipe ingredient is below the required quantity', () => {
    expect(produtoTemEstoque('prod-1', [
      { produtoId: 'prod-1', insumoId: 'cheese', quantidade: '180' },
      { produtoId: 'prod-1', insumoId: 'sauce', quantidade: '80' },
    ], [
      { id: 'cheese', estoqueAtual: '200' },
      { id: 'sauce', estoqueAtual: '50' },
    ])).toBe(false)
  })

  it('ignores recipes for another product', () => {
    expect(produtoTemEstoque('prod-1', [
      { produtoId: 'prod-2', insumoId: 'cheese', quantidade: '999' },
    ], [{ id: 'cheese', estoqueAtual: '0' }])).toBe(true)
  })
})
