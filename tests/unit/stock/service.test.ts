import { beforeEach, describe, expect, it, vi } from 'vitest'

type StockState = {
  estoqueAtual: string
  movementKeys: string[]
}

type TransactionOperations = {
  postgresOperation: (transaction: unknown) => Promise<unknown>
}

const { runInDbTransactionMock } = vi.hoisted(() => ({
  runInDbTransactionMock: vi.fn(),
}))

vi.mock('@/lib/db/index', () => ({
  db: {},
  runInDbTransaction: runInDbTransactionMock,
}))

import { applyStockMovement } from '@/lib/stock/service'

function installTransactionHarness(
  initialState: StockState,
  failOnMovementInsert = false,
) {
  let committedState = structuredClone(initialState)

  runInDbTransactionMock.mockImplementation(
    (operations: TransactionOperations) => {
      const pendingState = structuredClone(committedState)
      let selectCount = 0

      const transaction = {
        execute: vi.fn(async () => undefined),
        select: vi.fn(() => {
          selectCount += 1
          return {
            from: vi.fn(() => ({
              where: vi.fn(() => {
                if (selectCount === 1 || selectCount === 4) {
                  return Promise.resolve(
                    pendingState.movementKeys.includes('movement-1')
                      ? [{ id: 'existing-movement' }]
                      : [],
                  )
                }
                if (selectCount === 2) {
                  return {
                    for: vi.fn(() => ({ limit: vi.fn(async () => []) })),
                  }
                }
                const rows = [{
                  id: 'ingredient-1',
                  nome: 'Cheese',
                  estoqueAtual: pendingState.estoqueAtual,
                  custoUnitario: '2.0000',
                }]
                return {
                  for: vi.fn(async () => rows),
                  then: (
                    resolve: (value: typeof rows) => unknown,
                    reject: (reason: unknown) => unknown,
                  ) => Promise.resolve(rows).then(resolve, reject),
                }
              }),
            })),
          }
        }),
        update: vi.fn(() => ({
          set: vi.fn((values: { estoqueAtual: string }) => ({
            where: vi.fn(async () => {
              pendingState.estoqueAtual = values.estoqueAtual
            }),
          })),
        })),
        insert: vi.fn(() => ({
          values: vi.fn(async (values: { chaveIdempotencia: string }) => {
            if (failOnMovementInsert) {
              throw new Error('movement insert failed')
            }
            pendingState.movementKeys.push(values.chaveIdempotencia)
          }),
        })),
      }

      return operations.postgresOperation(transaction).then((result) => {
        committedState = pendingState
        return result
      })
    },
  )

  return () => committedState
}

function movementInput() {
  return {
    tenantId: 'tenant-1',
    insumoId: 'ingredient-1',
    tipo: 'entrada' as const,
    quantidade: 5,
    custoUnitario: 4,
    chaveIdempotencia: 'movement-1',
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('applyStockMovement transaction boundary', () => {
  it('creates the automatic shopping-list entry in the stock transaction', async () => {
    const inserted: Array<Record<string, unknown>> = []
    let selectCount = 0
    const tx = {
      execute: vi.fn(async () => undefined),
      select: vi.fn(() => {
        selectCount += 1
        return {
          from: vi.fn(() => ({
            where: vi.fn(() => {
              if (selectCount === 1 || selectCount === 4) return Promise.resolve([])
              if (selectCount === 2 || selectCount === 5 || selectCount === 7) {
                return {
                  for: vi.fn(() => ({ limit: vi.fn(async () => []) })),
                }
              }
              if (selectCount === 3) {
                return { for: vi.fn(async () => [{
                  nome: 'Cheese', estoqueAtual: '3.000', custoUnitario: '2.0000',
                }]) }
              }
              if (selectCount === 6) {
                return { for: vi.fn(async () => [{
                  id: 'ingredient-1', nome: 'Cheese', unidadeCompra: 'kg',
                  fatorCompraParaBase: '1000.000', estoqueAtual: '2.000',
                  estoqueIdeal: '10.000', estoqueMinimo: '2.000',
                }]) }
              }
              return { limit: vi.fn(async () => []) }
            }),
          })),
        }
      }),
      update: vi.fn(() => ({
        set: vi.fn(() => ({ where: vi.fn(async () => undefined) })),
      })),
      insert: vi.fn(() => ({
        values: vi.fn(async (values: Record<string, unknown>) => {
          inserted.push(values)
        }),
      })),
    }
    runInDbTransactionMock.mockImplementationOnce(
      (operations: TransactionOperations) => operations.postgresOperation(tx),
    )

    await applyStockMovement({
      ...movementInput(),
      tipo: 'perda',
      quantidade: -1,
    })

    expect(inserted).toEqual(expect.arrayContaining([
      expect.objectContaining({
        tenantId: 'tenant-1', kind: 'automatic',
        insumoId: 'ingredient-1', quantidadeSugerida: '0.008',
      }),
    ]))
  })

  it('rolls back the stock update when the movement insert fails', async () => {
      const readState = installTransactionHarness(
        { estoqueAtual: '10.000', movementKeys: [] },
        true,
      )

      await expect(applyStockMovement(movementInput())).rejects.toThrow(
        'movement insert failed',
      )

      expect(readState()).toEqual({
        estoqueAtual: '10.000',
        movementKeys: [],
      })
      expect(runInDbTransactionMock).toHaveBeenCalledTimes(1)
  })

  it('keeps an existing idempotency key from publishing another change', async () => {
      const readState = installTransactionHarness({
        estoqueAtual: '10.000',
        movementKeys: ['movement-1'],
      })

      await expect(applyStockMovement(movementInput())).resolves.toEqual({
        applied: false,
        saldoAnterior: 0,
        saldoResultante: 0,
        custoUnitario: null,
      })

      expect(readState()).toEqual({
        estoqueAtual: '10.000',
        movementKeys: ['movement-1'],
      })
      expect(runInDbTransactionMock).toHaveBeenCalledTimes(1)
  })
})

describe('applyStockMovement concurrency and physical counts', () => {
  function installMovementCaptureHarness() {
    const events: string[] = []
    let insertedMovement:
      | {
          quantidade: string
          saldoAnterior: string
          saldoResultante: string
        }
      | undefined
    const lockFor = vi.fn(async (strength: string) => {
      events.push(`lock:${strength}`)
      return [{
        nome: 'Cheese',
        estoqueAtual: '10.000',
        custoUnitario: '2.0000',
      }]
    })

    runInDbTransactionMock.mockImplementationOnce(
      (operations: TransactionOperations) => {
        let selectCount = 0
        const transaction = {
          execute: vi.fn(async () => {
            events.push('reconciliation-key')
          }),
          select: vi.fn(() => {
            selectCount += 1
            return {
              from: vi.fn(() => ({
                where: vi.fn(() => {
                  if (selectCount === 1) {
                    events.push('idempotency-before-lock')
                    return Promise.resolve([])
                  }
                  if (selectCount === 2) {
                    events.push('automatic-row')
                    return {
                      for: vi.fn(() => ({ limit: vi.fn(async () => []) })),
                    }
                  }
                  if (selectCount === 3) {
                    const rows = [{
                      nome: 'Cheese',
                      estoqueAtual: '10.000',
                      custoUnitario: '2.0000',
                    }]
                    return {
                      for: lockFor,
                      then: (
                        resolve: (value: typeof rows) => unknown,
                        reject: (reason: unknown) => unknown,
                      ) => Promise.resolve(rows).then(resolve, reject),
                    }
                  }
                  if (selectCount === 5 || selectCount === 7) {
                    events.push('automatic-row')
                    return {
                      for: vi.fn(() => ({ limit: vi.fn(async () => []) })),
                    }
                  }
                  if (selectCount === 6) {
                    const rows = [{
                      id: 'ingredient-1',
                      nome: 'Cheese',
                      unidadeCompra: 'kg',
                      fatorCompraParaBase: '1000.000',
                      estoqueAtual: '10.000',
                      estoqueIdeal: '10.000',
                      estoqueMinimo: '2.000',
                    }]
                    return {
                      for: vi.fn(async () => rows),
                      then: (
                        resolve: (value: typeof rows) => unknown,
                        reject: (reason: unknown) => unknown,
                      ) => Promise.resolve(rows).then(resolve, reject),
                    }
                  }
                  events.push('idempotency-after-lock')
                  return Promise.resolve([])
                }),
              })),
            }
          }),
          update: vi.fn(() => ({
            set: vi.fn(() => ({
              where: vi.fn(async () => {
                events.push('update')
              }),
            })),
          })),
          insert: vi.fn(() => ({
            values: vi.fn(async (values: typeof insertedMovement) => {
              insertedMovement = values
              events.push('insert')
            }),
          })),
        }
        return operations.postgresOperation(transaction)
      },
    )

    return {
      lockFor,
      readEvents: () => events,
      readMovement: () => insertedMovement,
    }
  }

  it('locks the tenant-scoped PostgreSQL stock row and rechecks idempotency before writing', async () => {
    const harness = installMovementCaptureHarness()

    await applyStockMovement(movementInput())

    expect(harness.lockFor).toHaveBeenCalledWith('update')
    expect(harness.readEvents()).toEqual([
      'idempotency-before-lock',
      'reconciliation-key',
      'automatic-row',
      'lock:update',
      'idempotency-after-lock',
      'update',
      'insert',
      'reconciliation-key',
      'automatic-row',
      'reconciliation-key',
      'automatic-row',
    ])
  })

  it('calculates a signed physical-count movement from the locked balance', async () => {
      const harness = installMovementCaptureHarness()

      await expect(applyStockMovement({
        tenantId: 'tenant-1',
        insumoId: 'ingredient-1',
        tipo: 'contagem',
        quantidade: 7,
        chaveIdempotencia: 'count-1',
      })).resolves.toEqual({
        applied: true,
        saldoAnterior: 10,
        saldoResultante: 7,
        custoUnitario: 2,
      })

      expect(harness.readMovement()).toEqual(expect.objectContaining({
        quantidade: '-3.000',
        saldoAnterior: '10.000',
        saldoResultante: '7.000',
      }))
  })
})
