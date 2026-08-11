import { beforeEach, describe, expect, it, vi } from 'vitest'

type TransactionOperations = {
  postgresOperation: (transaction: unknown) => Promise<unknown>
}

const mocks = vi.hoisted(() => ({
  runInDbTransaction: vi.fn(),
  lockAutomaticShoppingListItemInPostgresTransaction: vi.fn(),
  reconcileShoppingListInPostgresTransaction: vi.fn(),
}))

vi.mock('@/lib/db/index', () => ({
  db: {},
  runInDbTransaction: mocks.runInDbTransaction,
}))

vi.mock('@/lib/shopping-list/reconciliation', () => ({
  lockAutomaticShoppingListItemInPostgresTransaction:
    mocks.lockAutomaticShoppingListItemInPostgresTransaction,
  reconcileShoppingListInPostgresTransaction:
    mocks.reconcileShoppingListInPostgresTransaction,
}))

import { applyStockMovement } from '@/lib/stock/service'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('manual stock movement unit concurrency', () => {
  it('rejects stale kilograms after the locked ingredient changes to liters', async () => {
    const lockOrder: string[] = []
    const ingredientLock = vi.fn(async () => {
      lockOrder.push('ingredient')
      return [{
        nome: 'Oil',
        estoqueAtual: '1000.000',
        custoUnitario: '2.0000',
        unidadeCompra: 'l',
        unidadeBase: 'ml',
      }]
    })
    const tx = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({ for: ingredientLock })),
        })),
      })),
      update: vi.fn(),
      insert: vi.fn(),
    }
    mocks.lockAutomaticShoppingListItemInPostgresTransaction
      .mockImplementation(async () => {
        lockOrder.push('shopping-list')
      })
    mocks.runInDbTransaction.mockImplementationOnce(
      (operations: TransactionOperations) => operations.postgresOperation(tx),
    )

    await expect(applyStockMovement({
      tenantId: 'tenant-1',
      usuarioId: 'user-1',
      insumoId: 'ingredient-1',
      tipo: 'entrada',
      quantidadeInformada: '1',
      unidadeMovimento: 'kg',
      unidadePadrao: 'compra',
      chaveIdempotencia: 'movement-1',
    })).rejects.toThrow(
      'As unidades de compra e estoque precisam ser compatíveis',
    )

    expect(lockOrder).toEqual(['shopping-list', 'ingredient'])
    expect(ingredientLock).toHaveBeenCalledWith('update')
    expect(tx.update).not.toHaveBeenCalled()
    expect(tx.insert).not.toHaveBeenCalled()
  })

  it('rejects an inactive ingredient from the locked transaction', async () => {
    const ingredientLock = vi.fn(async () => [])
    const tx = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({ for: ingredientLock })),
        })),
      })),
      update: vi.fn(),
      insert: vi.fn(),
    }
    mocks.lockAutomaticShoppingListItemInPostgresTransaction
      .mockResolvedValueOnce(undefined)
    mocks.runInDbTransaction.mockImplementationOnce(
      (operations: TransactionOperations) => operations.postgresOperation(tx),
    )

    await expect(applyStockMovement({
      tenantId: 'tenant-1',
      usuarioId: 'user-1',
      insumoId: 'removed-item',
      tipo: 'perda',
      quantidadeInformada: '1',
      unidadeMovimento: 'kg',
      unidadePadrao: 'compra',
      sinal: -1,
      chaveIdempotencia: 'movement-2',
    })).rejects.toThrow('Insumo não encontrado')

    expect(ingredientLock).toHaveBeenCalledWith('update')
    expect(tx.update).not.toHaveBeenCalled()
    expect(tx.insert).not.toHaveBeenCalled()
  })
})
