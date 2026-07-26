import { beforeEach, describe, expect, it, vi } from 'vitest'

type TransactionOperations = {
  sqliteOperation: (transaction: unknown) => unknown
  postgresOperation: (transaction: unknown) => Promise<unknown>
}

const { dbSelectMock, runInDbTransactionMock } = vi.hoisted(() => ({
  dbSelectMock: vi.fn().mockReturnThis(),
  runInDbTransactionMock: vi.fn(),
}))

vi.mock('@/lib/db/index', () => ({
  db: {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    select: dbSelectMock,
    from: vi.fn().mockReturnThis(),
  },
  runInDbTransaction: runInDbTransactionMock,
}))
vi.mock('@/lib/auth/access', () => ({
  requireAccess: vi.fn(async () => ({ usuarioId: 'user-1', tenantId: 'tenant-1', access: 'admin' })),
}))
vi.mock('@/lib/stock/service', () => ({
  applyStockMovement: vi.fn().mockResolvedValue({ applied: true }),
}))

import { db } from '@/lib/db/index'
import { insumo, produto as postgresProduto } from '@/lib/db/schema'
import { insumo as sqliteInsumo } from '@/lib/db/schema-sqlite'
import { dbBoolean } from '@/lib/db/compat'
import { normalizarQuantidadeBase, UNIDADES_BASE } from '@/lib/stock/units'
import { produtoTemEstoque } from '@/lib/stock/availability'
import {
  ajustarEstoqueAtual,
  criarInsumo,
  registrarEntradaEstoque,
  registrarPerdaEstoque,
  realizarContagemEstoque,
  removerInsumo,
  salvarFichaTecnica,
} from '@/lib/actions/estoque'
import { applyStockMovement } from '@/lib/stock/service'

beforeEach(() => vi.clearAllMocks())

function findSqlIdentifier(value: unknown, prefix: string): string | undefined {
  const seen = new Set<unknown>()
  const visit = (candidate: unknown): string | undefined => {
    if (typeof candidate === 'string' && candidate.startsWith(prefix)) {
      return candidate
    }
    if (
      typeof candidate !== 'object' ||
      candidate === null ||
      seen.has(candidate)
    ) {
      return undefined
    }
    seen.add(candidate)
    for (const nested of Object.values(candidate)) {
      const found = visit(nested)
      if (found) return found
    }
    return undefined
  }
  return visit(value)
}

describe('server action boundary', () => {
  it('does not export order helpers that accept a frontend-supplied tenant', async () => {
    const actions = await import('@/lib/actions/estoque')

    expect(actions).not.toHaveProperty('validarEstoqueParaPedido')
    expect(actions).not.toHaveProperty('deduzirEstoqueNoPreparo')
    expect(actions).not.toHaveProperty('deduzirEstoqueNaEntrega')
    expect(actions).not.toHaveProperty('listarInsumos')
  })
})

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

  it('accepts the simplified unit and cost fields', async () => {
    const returning = vi.fn().mockResolvedValue([{ id: 'insumo-3' }])
    ;(db.insert as any).mockReturnValue({ values: vi.fn().mockReturnValue({ returning }) })

    await expect(criarInsumo({
      nome: 'Bacon',
      unidade: 'kg',
      custoPorUnidade: '200,00',
    })).resolves.toEqual({ id: 'insumo-3' })

    expect((db.insert as any).mock.results[0].value.values).toHaveBeenCalledWith(expect.objectContaining({
      unidadeBase: 'g',
      unidadeCompra: 'kg',
      fatorCompraParaBase: '1000.000',
      custoUnitario: '0.2000',
      estoqueAtual: '0.000',
    }))
    expect(applyStockMovement).not.toHaveBeenCalled()
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

describe('manual stock operation idempotency', () => {
  const firstKey = '11111111-1111-4111-8111-111111111111'
  const secondKey = '22222222-2222-4222-8222-222222222222'

  function mockStockItem() {
    dbSelectMock.mockReturnValueOnce({
      from: vi.fn(() => ({
        where: vi.fn(async () => [{
          id: 'insumo-1',
          estoqueAtual: '999.000',
          unidadeCompra: 'kg',
          unidadeBase: 'g',
        }]),
      })),
    })
  }

  it.each([
    ['entrada sem chave', () => registrarEntradaEstoque('insumo-1', '2', undefined as never)],
    ['entrada com chave vazia', () => registrarEntradaEstoque('insumo-1', '2', '')],
    ['ajuste', () => ajustarEstoqueAtual('insumo-1', '10', 'not-a-uuid')],
    ['perda', () => registrarPerdaEstoque('insumo-1', '1', 'Vencimento', ' ')],
    ['contagem', () => realizarContagemEstoque('insumo-1', '2', 'invalid')],
  ])('rejects a missing or malformed key for %s before reading stock', async (_operation, execute) => {
    await expect(execute()).rejects.toThrow('Chave idempotente inválida')

    expect(dbSelectMock).not.toHaveBeenCalled()
    expect(applyStockMovement).not.toHaveBeenCalled()
  })

  it('forwards the same session tenant and key when an entry is retried', async () => {
    mockStockItem()
    mockStockItem()

    await registrarEntradaEstoque('insumo-1', '2', firstKey)
    await registrarEntradaEstoque('insumo-1', '2', firstKey)

    expect(applyStockMovement).toHaveBeenCalledTimes(2)
    expect(applyStockMovement).toHaveBeenNthCalledWith(1, expect.objectContaining({
      tenantId: 'tenant-1',
      insumoId: 'insumo-1',
      chaveIdempotencia: firstKey,
    }))
    expect(applyStockMovement).toHaveBeenNthCalledWith(2, expect.objectContaining({
      tenantId: 'tenant-1',
      insumoId: 'insumo-1',
      chaveIdempotencia: firstKey,
    }))
  })

  it('forwards a different key for a new manual entry', async () => {
    mockStockItem()
    mockStockItem()

    await registrarEntradaEstoque('insumo-1', '2', firstKey)
    await registrarEntradaEstoque('insumo-1', '2', secondKey)

    expect(applyStockMovement).toHaveBeenNthCalledWith(1, expect.objectContaining({
      chaveIdempotencia: firstKey,
    }))
    expect(applyStockMovement).toHaveBeenNthCalledWith(2, expect.objectContaining({
      chaveIdempotencia: secondKey,
    }))
  })

  it('protects loss, count, and exposed adjustment with caller keys', async () => {
    mockStockItem()
    mockStockItem()
    mockStockItem()

    await registrarPerdaEstoque('insumo-1', '1', 'Vencimento', firstKey)
    await realizarContagemEstoque('insumo-1', '2', firstKey)
    await ajustarEstoqueAtual('insumo-1', '10', firstKey)

    expect(applyStockMovement).toHaveBeenNthCalledWith(1, expect.objectContaining({
      tipo: 'perda',
      chaveIdempotencia: firstKey,
    }))
    expect(applyStockMovement).toHaveBeenNthCalledWith(2, expect.objectContaining({
      tipo: 'contagem',
      chaveIdempotencia: firstKey,
    }))
    expect(applyStockMovement).toHaveBeenNthCalledWith(3, expect.objectContaining({
      tipo: 'contagem',
      chaveIdempotencia: firstKey,
    }))
  })
})

describe('physical stock counts', () => {
  function mockStockItem(item: {
    id: string
    estoqueAtual: string
    unidadeCompra: string
    unidadeBase: string
  }) {
    dbSelectMock.mockReturnValueOnce({
      from: vi.fn(() => ({
        where: vi.fn(async () => [item]),
      })),
    })
    return dbSelectMock
  }

  it('passes the absolute adjusted balance to the stock service without using a stale read', async () => {
    const selectMock = mockStockItem({
      id: 'insumo-1',
      estoqueAtual: '999.000',
      unidadeCompra: 'kg',
      unidadeBase: 'g',
    })

    await ajustarEstoqueAtual(
      'insumo-1',
      '10',
      '11111111-1111-4111-8111-111111111111',
    )

    expect(selectMock).toHaveBeenCalledWith({ id: insumo.id })
    expect(applyStockMovement).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1',
      insumoId: 'insumo-1',
      tipo: 'contagem',
      quantidade: 10,
    }))
  })

  it('normalizes the found amount but leaves the transactional delta to the stock service', async () => {
    const selectMock = mockStockItem({
      id: 'insumo-1',
      estoqueAtual: '999.000',
      unidadeCompra: 'kg',
      unidadeBase: 'g',
    })

    await realizarContagemEstoque(
      'insumo-1',
      '2',
      '11111111-1111-4111-8111-111111111111',
      'Inventário mensal',
    )

    expect(selectMock).toHaveBeenCalledWith({
      id: insumo.id,
      unidadeCompra: insumo.unidadeCompra,
      unidadeBase: insumo.unidadeBase,
    })
    expect(applyStockMovement).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1',
      insumoId: 'insumo-1',
      tipo: 'contagem',
      quantidade: 2000,
      observacao: 'Inventário mensal',
    }))
  })
})

describe('removerInsumo', () => {
  function mockSqliteRemovalTransaction(recipeUsage: Array<{ id: string }>, movementUsage: Array<{ id: string }>) {
    const updateRun = vi.fn()
    const updateWhere = vi.fn().mockReturnValue({ run: updateRun })
    const updateSet = vi.fn().mockReturnValue({ where: updateWhere })
    const deleteRun = vi.fn()
    const deleteWhere = vi.fn().mockReturnValue({ run: deleteRun })
    const tx = {
      select: vi.fn()
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({ get: vi.fn().mockReturnValue({ nome: 'Batata' }) }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({ get: vi.fn().mockReturnValue(recipeUsage[0]) }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({ get: vi.fn().mockReturnValue(movementUsage[0]) }),
          }),
        }),
      update: vi.fn().mockReturnValue({ set: updateSet }),
      delete: vi.fn().mockReturnValue({ where: deleteWhere }),
    }
    runInDbTransactionMock.mockImplementationOnce(
      (operations: TransactionOperations) => operations.sqliteOperation(tx),
    )
    return { tx, updateSet, updateRun, deleteRun }
  }

  it('bloqueia a exclusão enquanto o insumo está em uma ficha técnica', async () => {
    const { tx } = mockSqliteRemovalTransaction([{ id: 'ficha-1' }], [])

    await expect(removerInsumo('insumo-1', 'Batata')).rejects.toThrow(
      'Remova este insumo das fichas técnicas antes de excluí-lo'
    )

    expect(tx.update).not.toHaveBeenCalled()
    expect(tx.delete).not.toHaveBeenCalled()
  })

  it('inativa o insumo quando existe histórico, mas não existe ficha técnica', async () => {
    const { tx, updateSet, updateRun } = mockSqliteRemovalTransaction([], [{ id: 'movimento-1' }])

    await expect(removerInsumo('insumo-1', 'Batata')).resolves.toBeUndefined()

    expect(runInDbTransactionMock).toHaveBeenCalledTimes(1)
    expect(updateSet).toHaveBeenCalledWith({ ativo: false })
    expect(updateRun).toHaveBeenCalledTimes(1)
    expect(tx.delete).not.toHaveBeenCalled()
  })

  it('exclui fisicamente quando não existe ficha técnica nem histórico', async () => {
    const { tx, deleteRun } = mockSqliteRemovalTransaction([], [])

    await expect(removerInsumo('insumo-1', 'Batata')).resolves.toBeUndefined()

    expect(tx.update).not.toHaveBeenCalled()
    expect(tx.delete).toHaveBeenCalledWith(sqliteInsumo)
    expect(deleteRun).toHaveBeenCalledTimes(1)
  })
})

describe('salvarFichaTecnica', () => {
  type FichaState = {
    recipes: Array<{ insumoId: string; quantidade: string }>
    controleEstoque: boolean
  }

  function installFichaTransaction(
    backend: 'sqlite' | 'postgresql',
    initialState: FichaState,
    failOnFlagUpdate: boolean,
  ) {
    let committedState = structuredClone(initialState)

    runInDbTransactionMock.mockImplementationOnce(
      (operations: TransactionOperations) => {
        const pendingState = structuredClone(committedState)

        if (backend === 'sqlite') {
          let selectCount = 0
          const transaction = {
            select: vi.fn(() => ({
              from: vi.fn(() => ({
                where: vi.fn(() => ({
                  get: vi.fn(() => {
                    selectCount += 1
                    return selectCount === 1
                      ? { id: 'produto-1' }
                      : { id: 'insumo-1', ativo: true }
                  }),
                })),
              })),
            })),
            delete: vi.fn(() => ({
              where: vi.fn(() => ({
                run: vi.fn(() => {
                  pendingState.recipes = []
                }),
              })),
            })),
            insert: vi.fn(() => ({
              values: vi.fn((
                values: Array<{ insumoId: string; quantidade: string }>,
              ) => ({
                run: vi.fn(() => {
                  pendingState.recipes = values.map(
                    ({ insumoId, quantidade }) => ({ insumoId, quantidade }),
                  )
                }),
              })),
            })),
            update: vi.fn(() => ({
              set: vi.fn((values: { controleEstoque: boolean }) => ({
                where: vi.fn(() => ({
                  run: vi.fn(() => {
                    if (failOnFlagUpdate) {
                      throw new Error('flag update failed')
                    }
                    pendingState.controleEstoque = values.controleEstoque
                  }),
                })),
              })),
            })),
          }

          const result = operations.sqliteOperation(transaction)
          committedState = pendingState
          return result
        }

        let selectCount = 0
        const transaction = {
          select: vi.fn(() => ({
            from: vi.fn(() => ({
              where: vi.fn(() => ({
                for: vi.fn(async () => {
                  selectCount += 1
                  return selectCount === 1
                    ? [{ id: 'produto-1' }]
                    : [{ id: 'insumo-1', ativo: true }]
                }),
              })),
            })),
          })),
          delete: vi.fn(() => ({
            where: vi.fn(async () => {
              pendingState.recipes = []
            }),
          })),
          insert: vi.fn(() => ({
            values: vi.fn(async (
              values: Array<{ insumoId: string; quantidade: string }>,
            ) => {
              pendingState.recipes = values.map(
                ({ insumoId, quantidade }) => ({ insumoId, quantidade }),
              )
            }),
          })),
          update: vi.fn(() => ({
            set: vi.fn((values: { controleEstoque: boolean }) => ({
              where: vi.fn(async () => {
                if (failOnFlagUpdate) {
                  throw new Error('flag update failed')
                }
                pendingState.controleEstoque = values.controleEstoque
              }),
            })),
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

  it('validates and locks product then sorted ingredients inside the PostgreSQL transaction', async () => {
    const events: string[] = []
    ;(db.select as unknown as ReturnType<typeof vi.fn>)
      .mockImplementationOnce(() => {
        throw new Error('validation escaped transaction')
      })
    runInDbTransactionMock.mockImplementationOnce(
      (operations: TransactionOperations) => {
        const tx = {
          select: vi.fn(() => ({
            from: vi.fn((table: unknown) => {
              if (table === postgresProduto) {
                return {
                  where: vi.fn(() => ({
                    for: vi.fn(async () => {
                      events.push('product:produto-1')
                      return [{ id: 'produto-1' }]
                    }),
                  })),
                }
              }
              if (table === insumo) {
                return {
                  where: vi.fn((condition: unknown) => ({
                    for: vi.fn(async () => {
                      const id = findSqlIdentifier(condition, 'insumo-')
                      events.push(`ingredient:${id}`)
                      return [{ id, ativo: true }]
                    }),
                  })),
                }
              }
              throw new Error('unexpected select table')
            }),
          })),
          delete: vi.fn(() => ({
            where: vi.fn(async () => {
              events.push('delete-recipe')
            }),
          })),
          insert: vi.fn(() => ({
            values: vi.fn(async () => {
              events.push('insert-recipe')
            }),
          })),
          update: vi.fn(() => ({
            set: vi.fn(() => ({
              where: vi.fn(async () => {
                events.push('update-flag')
              }),
            })),
          })),
        }
        return operations.postgresOperation(tx)
      },
    )

    await expect(salvarFichaTecnica('produto-1', [
      { insumoId: 'insumo-z', quantidade: '1.000' },
      { insumoId: 'insumo-a', quantidade: '2.000' },
    ])).resolves.toBeUndefined()

    expect(db.select).not.toHaveBeenCalled()
    expect(events).toEqual([
      'product:produto-1',
      'ingredient:insumo-a',
      'ingredient:insumo-z',
      'delete-recipe',
      'insert-recipe',
      'update-flag',
    ])
  })

  it('rejeita insumo inativo mesmo quando ele pertence ao tenant', async () => {
    runInDbTransactionMock.mockImplementationOnce(
      (operations: TransactionOperations) => {
        let selectCount = 0
        return operations.sqliteOperation({
          select: vi.fn(() => ({
            from: vi.fn(() => ({
              where: vi.fn(() => ({
                get: vi.fn(() => {
                  selectCount += 1
                  return selectCount === 1
                    ? { id: 'produto-1' }
                    : { id: 'insumo-inativo', ativo: false }
                }),
              })),
            })),
          })),
        })
      },
    )
    await expect(salvarFichaTecnica('produto-1', [
      { insumoId: 'insumo-inativo', quantidade: '30' },
    ])).rejects.toThrow('Insumo inválido')
  })

  it.each(['sqlite', 'postgresql'] as const)(
    'rolls back the %s recipe when the stock-control flag update fails',
    async (backend) => {
      const readState = installFichaTransaction(
        backend,
        {
          recipes: [{ insumoId: 'old-insumo', quantidade: '10.000' }],
          controleEstoque: false,
        },
        true,
      )

      await expect(salvarFichaTecnica('produto-1', [
        { insumoId: 'insumo-1', quantidade: '30' },
      ])).rejects.toThrow('flag update failed')

      expect(readState()).toEqual({
        recipes: [{ insumoId: 'old-insumo', quantidade: '10.000' }],
        controleEstoque: false,
      })
      expect(runInDbTransactionMock).toHaveBeenCalledTimes(1)
    },
  )

  it.each(['sqlite', 'postgresql'] as const)(
    'commits the %s recipe and stock-control flag together',
    async (backend) => {
      const readState = installFichaTransaction(
        backend,
        {
          recipes: [{ insumoId: 'old-insumo', quantidade: '10.000' }],
          controleEstoque: false,
        },
        false,
      )

      await expect(salvarFichaTecnica('produto-1', [
        { insumoId: 'insumo-1', quantidade: '30' },
      ])).resolves.toBeUndefined()

      expect(readState()).toEqual({
        recipes: [{ insumoId: 'insumo-1', quantidade: '30.000' }],
        controleEstoque: true,
      })
      expect(runInDbTransactionMock).toHaveBeenCalledTimes(1)
    },
  )
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

describe('dbBoolean', () => {
  it.each([
    { databaseUrl: '', expected: 0, backend: 'SQLite' },
    { databaseUrl: 'postgresql://localhost/test', expected: false, backend: 'PostgreSQL' },
  ])('representa false corretamente no modo $backend', async ({ databaseUrl, expected }) => {
    const originalDatabaseUrl = process.env.DATABASE_URL
    process.env.DATABASE_URL = databaseUrl
    vi.resetModules()

    try {
      const compat = await import('@/lib/db/compat')
      expect(compat.dbBoolean(false)).toBe(expected)
    } finally {
      if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL
      else process.env.DATABASE_URL = originalDatabaseUrl
      vi.resetModules()
    }
  })

  it('executa o soft delete no caminho PostgreSQL simulado', async () => {
    const originalDatabaseUrl = process.env.DATABASE_URL
    process.env.DATABASE_URL = 'postgresql://localhost/test'
    vi.resetModules()

    try {
      const [{ removerInsumo: removerInsumoPostgres }, { insumo: postgresInsumo }] = await Promise.all([
        import('@/lib/actions/estoque'),
        import('@/lib/db/schema'),
      ])
      const updateWhere = vi.fn().mockResolvedValue(undefined)
      const updateSet = vi.fn().mockReturnValue({ where: updateWhere })
      const tx = {
        select: vi.fn()
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ nome: 'Batata' }]),
            }),
          })
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]),
              }),
            }),
          })
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ id: 'movimento-1' }]),
              }),
            }),
          }),
        update: vi.fn().mockReturnValue({ set: updateSet }),
        delete: vi.fn(),
      }
      runInDbTransactionMock.mockImplementationOnce(
        (operations: TransactionOperations) => operations.postgresOperation(tx),
      )

      await expect(removerInsumoPostgres('insumo-1', 'Batata')).resolves.toBeUndefined()

      expect(runInDbTransactionMock).toHaveBeenCalledTimes(1)
      expect(tx.update).toHaveBeenCalledWith(postgresInsumo)
      expect(updateSet).toHaveBeenCalledWith({ ativo: false })
      expect(tx.delete).not.toHaveBeenCalled()
    } finally {
      if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL
      else process.env.DATABASE_URL = originalDatabaseUrl
      vi.resetModules()
    }
  })
})
