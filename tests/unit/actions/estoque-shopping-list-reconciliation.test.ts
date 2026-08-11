import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  reconcileMock,
  lockAutomaticMock,
  runInDbTransactionMock,
} = vi.hoisted(() => ({
  reconcileMock: vi.fn().mockResolvedValue(undefined),
  lockAutomaticMock: vi.fn().mockResolvedValue(undefined),
  runInDbTransactionMock: vi.fn(),
}))

vi.mock('@/lib/db/index', () => ({
  db: {
    insert: vi.fn(),
    update: vi.fn(),
  },
  runInDbTransaction: runInDbTransactionMock,
}))
vi.mock('@/lib/auth/access', () => ({
  requireAccess: vi.fn(async () => ({ tenantId: 'tenant-1', access: 'admin' })),
}))
vi.mock('@/lib/shopping-list/reconciliation', () => ({
  lockAutomaticShoppingListItemInPostgresTransaction: lockAutomaticMock,
  reconcileShoppingListInPostgresTransaction: reconcileMock,
}))

import { criarInsumo, editarInsumo } from '@/lib/actions/estoque'

beforeEach(() => vi.clearAllMocks())

describe('ingredient changes reconcile the shopping list atomically', () => {
  it('creates an automatic suggestion after creating an ingredient that qualifies', async () => {
    const returning = vi.fn().mockResolvedValue([{ id: 'insumo-1' }])
    const insert = vi.fn(() => ({ values: vi.fn(() => ({ returning })) }))
    const tx = { insert }
    runInDbTransactionMock.mockImplementation(async ({ postgresOperation }) => (
      postgresOperation(tx)
    ))

    await criarInsumo({
      nome: 'Farinha', unidadeBase: 'g', unidadeCompra: 'kg',
      estoqueIdeal: '10', estoqueMinimo: '2',
    })

    expect(reconcileMock).toHaveBeenCalledWith(tx, 'tenant-1', 'insumo-1')
  })

  it('removes a stale automatic suggestion after editing an ingredient to no longer qualify', async () => {
    const lockOrder: string[] = []
    const where = vi.fn(async () => { lockOrder.push('insumo') })
    const update = vi.fn(() => ({ set: vi.fn(() => ({ where })) }))
    const tx = { update }
    lockAutomaticMock.mockImplementation(async () => {
      lockOrder.push('shopping-list')
    })
    runInDbTransactionMock.mockImplementation(async ({ postgresOperation }) => (
      postgresOperation(tx)
    ))

    await editarInsumo('insumo-1', {
      nome: 'Farinha', unidadeBase: 'g', unidadeCompra: 'kg',
      estoqueIdeal: '1', estoqueMinimo: '0',
    })

    expect(reconcileMock).toHaveBeenCalledWith(tx, 'tenant-1', 'insumo-1')
    expect(lockOrder).toEqual(['shopping-list', 'insumo'])
  })
})
