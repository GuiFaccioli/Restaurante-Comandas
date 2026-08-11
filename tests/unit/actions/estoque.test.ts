import { beforeEach, describe, expect, it, vi } from 'vitest'

type TransactionOperations = {
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
  applyStockMovementInPostgresTransaction: vi.fn().mockResolvedValue({ applied: true }),
}))

import { db } from '@/lib/db/index'
import { insumo, produto as postgresProduto, shoppingListItem } from '@/lib/db/schema'
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
import {
  addManualShoppingListItem,
  completeShoppingListItem,
  reconcileShoppingListInPostgresTransaction,
} from '@/lib/shopping-list/service'

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

describe('manual shopping-list item idempotency', () => {
  it('persists the validated UUID key with the manual item', async () => {
    const onConflictDoNothing = vi.fn().mockResolvedValue(undefined)
    const values = vi.fn().mockReturnValue({ onConflictDoNothing })
    ;(db.insert as any).mockReturnValue({ values })

    await addManualShoppingListItem({
      nome: '  Guardanapos ', quantidade: '2', unidade: 'kg',
      idempotencyKey: '11111111-1111-4111-8111-111111111111',
    })

    expect(values).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1', kind: 'manual', nome: 'Guardanapos',
      chaveIdempotencia: '11111111-1111-4111-8111-111111111111',
    }))
    expect(onConflictDoNothing).toHaveBeenCalledWith(expect.objectContaining({
      target: expect.arrayContaining([expect.anything(), expect.anything()]),
      where: expect.anything(),
    }))
  })
})

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
  beforeEach(() => {
    const emptyAutomaticQuery = () => ({
      from: vi.fn(() => ({
        where: vi.fn(() => {
          const automaticRowQuery = { limit: vi.fn(async () => []) }
          return { for: vi.fn(() => automaticRowQuery) }
        }),
      })),
    })
    const select = vi.fn()
    select
      .mockReturnValueOnce(emptyAutomaticQuery())
      .mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            for: vi.fn(async () => [{
              id: 'insumo-1', nome: 'Farinha', unidadeCompra: 'kg', fatorCompraParaBase: '1000.000',
              estoqueAtual: '0.000', estoqueIdeal: '10000.000', estoqueMinimo: '3000.000',
            }]),
          })),
        })),
      })
      .mockReturnValueOnce(emptyAutomaticQuery())
    runInDbTransactionMock.mockImplementation(async ({ postgresOperation }) => (
      postgresOperation({ insert: db.insert, select })
    ))
  })

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

describe('salvarFichaTecnica', () => {
  type FichaState = {
    recipes: Array<{ insumoId: string; quantidade: string }>
    controleEstoque: boolean
  }

  function installFichaTransaction(
    backend: 'postgresql',
    initialState: FichaState,
    failOnFlagUpdate: boolean,
  ) {
    let committedState = structuredClone(initialState)

    runInDbTransactionMock.mockImplementationOnce(
      (operations: TransactionOperations) => {
        const pendingState = structuredClone(committedState)

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

  it.each(['postgresql'] as const)(
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

  it.each(['postgresql'] as const)(
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

  it('marks a controlled product without its own recipe unavailable', () => {
    expect(produtoTemEstoque('prod-1', [
      { produtoId: 'prod-2', insumoId: 'cheese', quantidade: '999' },
    ], [{ id: 'cheese', estoqueAtual: '0' }])).toBe(false)
  })
})

describe('removerInsumo PostgreSQL', () => {
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

describe('shopping-list operations', () => {
  const key = '11111111-1111-4111-8111-111111111111'

  function reconciliationSelect(
    item: Record<string, string>,
    existing: { id: string } | undefined,
  ) {
    return vi.fn(() => ({
      from: vi.fn((table) => ({
        where: vi.fn(() => ({
          for: vi.fn(() => {
            if (table === shoppingListItem) {
              return { limit: vi.fn(async () => existing ? [existing] : []) }
            }
            return Promise.resolve([item])
          }),
        })),
      })),
    }))
  }

  it('creates one automatic snapshot at minimum stock', async () => {
    const insertValues = vi.fn().mockResolvedValue(undefined)
    const tx = {
      select: reconciliationSelect({
        id: 'insumo-1', nome: 'Farinha', unidadeCompra: 'kg', fatorCompraParaBase: '1000.000',
        estoqueAtual: '2000.000', estoqueIdeal: '10000.000', estoqueMinimo: '2000.000',
      }, undefined),
      insert: vi.fn(() => ({ values: insertValues })),
    }

    await reconcileShoppingListInPostgresTransaction(tx as never, 'tenant-1', 'insumo-1')

    expect(insertValues).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'automatic',
      insumoId: 'insumo-1',
      quantidadeSugerida: '8.000',
      unidade: 'kg',
    }))
  })

  it('keeps an existing automatic suggestion frozen', async () => {
    const insert = vi.fn()
    const tx = {
      select: reconciliationSelect({
        id: 'insumo-1', nome: 'Farinha', unidadeCompra: 'kg', fatorCompraParaBase: '1000.000',
        estoqueAtual: '1000.000', estoqueIdeal: '10000.000', estoqueMinimo: '2000.000',
      }, { id: 'row-1' }),
      insert,
    }

    await reconcileShoppingListInPostgresTransaction(tx as never, 'tenant-1', 'insumo-1')

    expect(insert).not.toHaveBeenCalled()
  })

  it('locks the automatic suggestion before the ingredient', async () => {
    const lockOrder: string[] = []
    const automaticRowQuery = {
      limit: vi.fn(async () => [{ id: 'row-1' }]),
    }
    const tx = {
      select: vi.fn(() => ({
        from: vi.fn((table) => ({
          where: vi.fn(() => ({
            for: vi.fn(() => {
              if (table === shoppingListItem) {
                lockOrder.push('shopping-list')
                return automaticRowQuery
              }
              lockOrder.push('insumo')
              return Promise.resolve([{
                id: 'insumo-1', nome: 'Farinha', unidadeCompra: 'kg', fatorCompraParaBase: '1000.000',
                estoqueAtual: '1000.000', estoqueIdeal: '10000.000', estoqueMinimo: '2000.000',
              }])
            }),
          })),
        })),
      })),
      insert: vi.fn(),
    }

    await reconcileShoppingListInPostgresTransaction(tx as never, 'tenant-1', 'insumo-1')

    expect(lockOrder).toEqual(['shopping-list', 'insumo'])
    expect(tx.insert).not.toHaveBeenCalled()
  })

  it('removes an automatic suggestion when direct replenishment raises stock above minimum', async () => {
    const deleteWhere = vi.fn().mockResolvedValue(undefined)
    const tx = {
      select: reconciliationSelect({
        id: 'insumo-1', nome: 'Farinha', unidadeCompra: 'kg', fatorCompraParaBase: '1000.000',
        estoqueAtual: '3000.000', estoqueIdeal: '10000.000', estoqueMinimo: '2000.000',
      }, { id: 'row-1' }),
      delete: vi.fn(() => ({ where: deleteWhere })),
      insert: vi.fn(),
    }

    await reconcileShoppingListInPostgresTransaction(tx as never, 'tenant-1', 'insumo-1')

    expect(deleteWhere).toHaveBeenCalledTimes(1)
    expect(tx.insert).not.toHaveBeenCalled()
  })

  it('does not change the shopping list when a dequalified item has no automatic row', async () => {
    const tx = {
      select: reconciliationSelect({
        id: 'insumo-1', nome: 'Farinha', unidadeCompra: 'kg', fatorCompraParaBase: '1000.000',
        estoqueAtual: '3000.000', estoqueIdeal: '10000.000', estoqueMinimo: '2000.000',
      }, undefined),
      delete: vi.fn(),
      insert: vi.fn(),
    }

    await reconcileShoppingListInPostgresTransaction(tx as never, 'tenant-1', 'insumo-1')

    expect(tx.delete).not.toHaveBeenCalled()
    expect(tx.insert).not.toHaveBeenCalled()
  })

  it('records an edited automatic receipt in its selected compatible unit and removes its row atomically', async () => {
    const deleteWhere = vi.fn().mockResolvedValue(undefined)
    const applyInTransaction = vi.fn().mockResolvedValue({ applied: true })
    const reconciliationQuery = reconciliationSelect({
      id: 'insumo-1', nome: 'Farinha', unidadeCompra: 'kg', fatorCompraParaBase: '1000.000',
      estoqueAtual: '9000.000', estoqueIdeal: '10000.000', estoqueMinimo: '2000.000',
    }, undefined)
    const tx = {
      select: vi.fn()
        .mockReturnValueOnce({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              for: vi.fn(async () => [{
                id: 'row-1', kind: 'automatic', insumoId: 'insumo-1', quantidadeSugerida: '8.000',
              }]),
            })),
          })),
        })
        .mockReturnValueOnce({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              for: vi.fn(async () => [{
                id: 'insumo-1', unidadeCompra: 'kg', unidadeBase: 'g',
              }]),
            })),
          })),
        })
        .mockImplementation(reconciliationQuery),
      delete: vi.fn(() => ({ where: deleteWhere })),
      insert: vi.fn(() => ({ values: vi.fn() })),
    }
    runInDbTransactionMock.mockImplementationOnce(
      (operations: TransactionOperations) => operations.postgresOperation(tx),
    )
    const stock = await import('@/lib/stock/service')
    vi.mocked(stock.applyStockMovementInPostgresTransaction).mockImplementationOnce(applyInTransaction)

    await completeShoppingListItem({
      itemId: 'row-1',
      receivedQuantity: '7',
      receivedUnit: 'g',
      idempotencyKey: key,
    })

    expect(applyInTransaction).toHaveBeenCalledWith(tx, expect.objectContaining({
      tenantId: 'tenant-1', usuarioId: 'user-1', insumoId: 'insumo-1', tipo: 'entrada', quantidade: 7,
      chaveIdempotencia: `shopping-list:row-1:${key}`,
    }))
    expect(deleteWhere).toHaveBeenCalledTimes(1)
  })

  it('removes a manual item without creating a stock movement', async () => {
    const deleteWhere = vi.fn().mockResolvedValue(undefined)
    const tx = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            for: vi.fn(async () => [{ id: 'row-1', kind: 'manual', insumoId: null }]),
          })),
        })),
      })),
      delete: vi.fn(() => ({ where: deleteWhere })),
    }
    runInDbTransactionMock.mockImplementationOnce(
      (operations: TransactionOperations) => operations.postgresOperation(tx),
    )

    await completeShoppingListItem({ itemId: 'row-1', idempotencyKey: key })

    expect(deleteWhere).toHaveBeenCalledTimes(1)
    const stock = await import('@/lib/stock/service')
    expect(stock.applyStockMovementInPostgresTransaction).not.toHaveBeenCalled()
  })

  it('treats a repeated completion after the row is removed as a no-op', async () => {
    const deleteWhere = vi.fn()
    const tx = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({ for: vi.fn(async () => []) })),
        })),
      })),
      delete: vi.fn(() => ({ where: deleteWhere })),
    }
    runInDbTransactionMock.mockImplementationOnce(
      (operations: TransactionOperations) => operations.postgresOperation(tx),
    )
    const stock = await import('@/lib/stock/service')

    await completeShoppingListItem({ itemId: 'row-1', idempotencyKey: key })

    expect(stock.applyStockMovementInPostgresTransaction).not.toHaveBeenCalled()
    expect(deleteWhere).not.toHaveBeenCalled()
  })
})


describe('manual stock movement units', () => {
  const key = '11111111-1111-4111-8111-111111111111'

  function mockActiveStockItem(unidadeCompra: string, unidadeBase: string) {
    dbSelectMock.mockReset()
    dbSelectMock.mockReturnValueOnce({
      from: vi.fn(() => ({
        where: vi.fn(async () => [{
          id: 'insumo-1', unidadeCompra, unidadeBase,
        }]),
      })),
    })
  }

  it('registers a 500 g loss for an ingredient purchased in kilograms as 500 base grams', async () => {
    mockActiveStockItem('kg', 'g')

    await registrarPerdaEstoque('insumo-1', '500', 'Vencimento', key, undefined, 'g')

    expect(applyStockMovement).toHaveBeenCalledWith(expect.objectContaining({
      tipo: 'perda', quantidade: -500,
    }))
  })

  it('registers a 2 L entry for an ingredient stored in milliliters as 2000 base milliliters', async () => {
    mockActiveStockItem('ml', 'ml')

    await registrarEntradaEstoque('insumo-1', '2', key, undefined, 'l')

    expect(applyStockMovement).toHaveBeenCalledWith(expect.objectContaining({
      tipo: 'entrada', quantidade: 2000,
    }))
  })

  it('rejects a movement unit from another measurement family on the server', async () => {
    mockActiveStockItem('ml', 'ml')

    await expect(registrarEntradaEstoque('insumo-1', '2', key, undefined, 'kg'))
      .rejects.toThrow('As unidades de compra e estoque precisam ser compatíveis')
    expect(applyStockMovement).not.toHaveBeenCalled()
  })

  it('does not create a loss movement when the selected item is no longer active', async () => {
    dbSelectMock.mockReset()
    dbSelectMock.mockReturnValueOnce({
      from: vi.fn(() => ({ where: vi.fn(async () => []) })),
    })

    await expect(registrarPerdaEstoque('removed-item', '1', 'Vencimento', key, undefined, 'kg'))
      .rejects.toThrow('Insumo não encontrado')
    expect(applyStockMovement).not.toHaveBeenCalled()
  })

  it('registers a valid loss as a negative movement', async () => {
    mockActiveStockItem('kg', 'g')

    await registrarPerdaEstoque('insumo-1', '1', 'Vencimento', key, undefined, 'kg')

    expect(applyStockMovement).toHaveBeenCalledWith(expect.objectContaining({
      tipo: 'perda', quantidade: -1000,
    }))
  })
})
