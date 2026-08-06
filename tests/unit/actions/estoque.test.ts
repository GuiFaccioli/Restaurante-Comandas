import { beforeEach, describe, expect, it, vi } from 'vitest'

const { selectMock, insertMock, requireAccessMock, movementMock } = vi.hoisted(() => ({
  selectMock: vi.fn(),
  insertMock: vi.fn(),
  requireAccessMock: vi.fn(async () => ({ usuarioId: 'user-1', tenantId: 'tenant-1', access: 'admin' })),
  movementMock: vi.fn().mockResolvedValue({ applied: true }),
}))

vi.mock('@/lib/db/index', () => ({
  db: { select: selectMock, insert: insertMock },
  runInDbTransaction: vi.fn(),
}))
vi.mock('@/lib/auth/access', () => ({ requireAccess: requireAccessMock }))
vi.mock('@/lib/stock/service', () => ({ applyStockMovement: movementMock }))

import { db } from '@/lib/db/index'
import { itemEstoque } from '@/lib/db/schema'
import { criarItemEstoque, registrarEntradaEstoque } from '@/lib/actions/estoque'

beforeEach(() => {
  vi.clearAllMocks()
  insertMock.mockReturnValue({ values: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 'item-1' }]) }) })
})

describe('item de estoque actions', () => {
  it('creates an item with zero balance and no initial movement', async () => {
    await expect(criarItemEstoque({ nome: ' Farinha ', unidadeBase: 'g', unidadeCompra: 'kg', estoqueMinimo: '5', estoqueIdeal: '15' })).resolves.toEqual({ id: 'item-1' })
    expect(db.insert).toHaveBeenCalledWith(itemEstoque)
    expect(insertMock.mock.results[0].value.values).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 'tenant-1', nome: 'Farinha', estoqueAtual: '0.000', custoUnitario: null, estoqueMinimo: '5000.000', estoqueIdeal: '15000.000' }))
    expect(movementMock).not.toHaveBeenCalled()
  })

  it('rejects incompatible units and an ideal below the minimum', async () => {
    await expect(criarItemEstoque({ nome: 'Líquido', unidadeBase: 'ml', unidadeCompra: 'kg' })).rejects.toThrow('compatíveis')
    await expect(criarItemEstoque({ nome: 'Farinha', unidadeBase: 'g', unidadeCompra: 'kg', estoqueMinimo: '10', estoqueIdeal: '5' })).rejects.toThrow('ideal não pode ser menor')
    expect(db.insert).not.toHaveBeenCalled()
  })

  it('converts an entry to the base unit and forwards its unit cost', async () => {
    selectMock.mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ id: 'item-1', unidadeCompra: 'kg', unidadeBase: 'g', ativo: true }]) }) })
    await registrarEntradaEstoque('item-1', '2', crypto.randomUUID(), '200')
    expect(movementMock).toHaveBeenCalledWith(expect.objectContaining({ itemEstoqueId: 'item-1', tipo: 'entrada', quantidade: 2000, custoUnitario: 0.1, tenantId: 'tenant-1' }))
  })
})
