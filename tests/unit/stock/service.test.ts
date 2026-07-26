import { beforeEach, describe, expect, it, vi } from 'vitest'

type Backend = 'sqlite' | 'postgresql'

type StockState = {
  estoqueAtual: string
  movementKeys: string[]
}

type TransactionOperations = {
  sqliteOperation: (transaction: unknown) => unknown
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
  backend: Backend,
  initialState: StockState,
  failOnMovementInsert = false,
) {
  let committedState = structuredClone(initialState)

  runInDbTransactionMock.mockImplementation(
    (operations: TransactionOperations) => {
      const pendingState = structuredClone(committedState)
      let selectCount = 0

      if (backend === 'sqlite') {
        const transaction = {
          select: vi.fn(() => ({
            from: vi.fn(() => ({
              where: vi.fn(() => ({
                get: vi.fn(() => {
                  selectCount += 1
                  if (selectCount === 1) {
                    return pendingState.movementKeys.includes('movement-1')
                      ? { id: 'existing-movement' }
                      : undefined
                  }
                  return {
                    id: 'ingredient-1',
                    nome: 'Cheese',
                    estoqueAtual: pendingState.estoqueAtual,
                    custoUnitario: '2.0000',
                  }
                }),
              })),
            })),
          })),
          update: vi.fn(() => ({
            set: vi.fn((values: { estoqueAtual: string }) => ({
              where: vi.fn(() => ({
                run: vi.fn(() => {
                  pendingState.estoqueAtual = values.estoqueAtual
                }),
              })),
            })),
          })),
          insert: vi.fn(() => ({
            values: vi.fn((values: { chaveIdempotencia: string }) => ({
              run: vi.fn(() => {
                if (failOnMovementInsert) {
                  throw new Error('movement insert failed')
                }
                pendingState.movementKeys.push(values.chaveIdempotencia)
              }),
            })),
          })),
        }

        const result = operations.sqliteOperation(transaction)
        committedState = pendingState
        return result
      }

      const transaction = {
        select: vi.fn(() => {
          selectCount += 1
          return {
            from: vi.fn(() => ({
              where: vi.fn(() => {
                if (selectCount === 1 || selectCount === 3) {
                  return Promise.resolve(
                    pendingState.movementKeys.includes('movement-1')
                      ? [{ id: 'existing-movement' }]
                      : [],
                  )
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
  it.each(['sqlite', 'postgresql'] as const)(
    'rolls back the stock update when the %s movement insert fails',
    async (backend) => {
      const readState = installTransactionHarness(
        backend,
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
    },
  )

  it.each(['sqlite', 'postgresql'] as const)(
    'keeps an existing %s idempotency key from publishing another change',
    async (backend) => {
      const readState = installTransactionHarness(backend, {
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
    },
  )
})

describe('applyStockMovement concurrency and physical counts', () => {
  function installMovementCaptureHarness(backend: Backend) {
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
        if (backend === 'sqlite') {
          let selectCount = 0
          const transaction = {
            select: vi.fn(() => ({
              from: vi.fn(() => ({
                where: vi.fn(() => ({
                  get: vi.fn(() => {
                    selectCount += 1
                    if (selectCount === 1) return undefined
                    return {
                      nome: 'Cheese',
                      estoqueAtual: '10.000',
                      custoUnitario: '2.0000',
                    }
                  }),
                })),
              })),
            })),
            update: vi.fn(() => ({
              set: vi.fn(() => ({
                where: vi.fn(() => ({
                  run: vi.fn(() => {
                    events.push('update')
                  }),
                })),
              })),
            })),
            insert: vi.fn(() => ({
              values: vi.fn((values: typeof insertedMovement) => ({
                run: vi.fn(() => {
                  insertedMovement = values
                  events.push('insert')
                }),
              })),
            })),
          }
          return operations.sqliteOperation(transaction)
        }

        let selectCount = 0
        const transaction = {
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
    const harness = installMovementCaptureHarness('postgresql')

    await applyStockMovement(movementInput())

    expect(harness.lockFor).toHaveBeenCalledWith('update')
    expect(harness.readEvents()).toEqual([
      'idempotency-before-lock',
      'lock:update',
      'idempotency-after-lock',
      'update',
      'insert',
    ])
  })

  it.each(['sqlite', 'postgresql'] as const)(
    'calculates a signed physical-count movement from the locked %s balance',
    async (backend) => {
      const harness = installMovementCaptureHarness(backend)

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
    },
  )
})
