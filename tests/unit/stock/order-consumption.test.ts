import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db/index', () => ({
  runInDbTransaction: vi.fn(),
}))

import * as pgSchema from '@/lib/db/schema'
import * as sqliteSchema from '@/lib/db/schema-sqlite'
import { migrateSqliteDatabase } from '@/lib/db/sqlite-migrations'
import {
  cancelOrderInSqliteTransaction,
  createOrderInPostgresTransaction,
  createOrderInSqliteTransaction,
  transitionOrderInSqliteTransaction,
} from '@/lib/stock/order-consumption'

type SQLiteDatabase = ReturnType<typeof createDatabase>['db']

function createDatabase() {
  const sqlite = new Database(':memory:')
  sqlite.pragma('foreign_keys = ON')
  sqlite.exec(`
    CREATE TABLE tenant (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'active',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE usuario (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL DEFAULT 'garcom',
      password_hash TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE mesa (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenant(id),
      numero INTEGER NOT NULL UNIQUE,
      ativa INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE categoria (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenant(id),
      nome TEXT NOT NULL,
      ordem INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE produto (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenant(id),
      categoria_id TEXT NOT NULL REFERENCES categoria(id),
      nome TEXT NOT NULL,
      descricao TEXT,
      preco TEXT NOT NULL,
      disponivel INTEGER NOT NULL DEFAULT 1,
      imagem_url TEXT,
      controle_estoque INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE pedido (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenant(id),
      mesa_id TEXT NOT NULL REFERENCES mesa(id),
      created_by_user_id TEXT REFERENCES usuario(id),
      status TEXT NOT NULL DEFAULT 'novo',
      criado_em INTEGER NOT NULL,
      entregue_em INTEGER,
      atualizado_em INTEGER NOT NULL
    );
    CREATE TABLE item_pedido (
      id TEXT PRIMARY KEY,
      pedido_id TEXT NOT NULL REFERENCES pedido(id) ON DELETE CASCADE,
      produto_id TEXT NOT NULL REFERENCES produto(id),
      quantidade INTEGER NOT NULL,
      preco_unitario TEXT NOT NULL,
      observacao TEXT
    );
  `)
  migrateSqliteDatabase(sqlite)

  const now = Date.now()
  sqlite.exec(`
    INSERT INTO tenant (id, nome, slug, created_at, updated_at) VALUES
      ('tenant-1', 'Tenant 1', 'tenant-1', ${now}, ${now}),
      ('tenant-2', 'Tenant 2', 'tenant-2', ${now}, ${now});
    INSERT INTO usuario (id, nome, email, created_at, updated_at)
      VALUES ('user-1', 'Waiter', 'waiter@example.test', ${now}, ${now});
    INSERT INTO mesa (id, tenant_id, numero, ativa) VALUES
      ('mesa-1', 'tenant-1', 7, 1),
      ('mesa-inativa', 'tenant-1', 8, 0),
      ('mesa-foreign', 'tenant-2', 9, 1);
    INSERT INTO categoria (id, tenant_id, nome, ordem) VALUES
      ('categoria-1', 'tenant-1', 'Pizzas', 0),
      ('categoria-foreign', 'tenant-2', 'Foreign', 0);
    INSERT INTO produto (
      id, tenant_id, categoria_id, nome, preco, disponivel, controle_estoque
    ) VALUES
      ('produto-1', 'tenant-1', 'categoria-1', 'Margherita', '45.00', 1, 1),
      ('produto-2', 'tenant-1', 'categoria-1', 'Calabresa', '50.00', 1, 1),
      ('produto-indisponivel', 'tenant-1', 'categoria-1', 'Unavailable', '30.00', 0, 1),
      ('produto-categoria-foreign', 'tenant-2', 'categoria-foreign', 'Invalid', '30.00', 1, 1),
      ('produto-ficha-invalida', 'tenant-1', 'categoria-1', 'Invalid recipe', '30.00', 1, 1);
    INSERT INTO insumo (
      id, tenant_id, nome, unidade_base, unidade_compra, estoque_atual
    ) VALUES
      ('insumo-1', 'tenant-1', 'Cheese', 'g', 'kg', '100.000'),
      ('insumo-2', 'tenant-1', 'Sauce', 'ml', 'l', '100.000'),
      ('insumo-foreign', 'tenant-2', 'Foreign', 'g', 'kg', '100.000');
    INSERT INTO ficha_tecnica_item (
      id, tenant_id, produto_id, insumo_id, quantidade
    ) VALUES
      ('ficha-1', 'tenant-1', 'produto-1', 'insumo-1', '2.500'),
      ('ficha-2', 'tenant-1', 'produto-1', 'insumo-2', '1.000'),
      ('ficha-3', 'tenant-1', 'produto-2', 'insumo-1', '3.000'),
      ('ficha-invalida', 'tenant-1', 'produto-ficha-invalida', 'insumo-1', '0.000');
  `)

  return {
    sqlite,
    db: drizzle(sqlite, { schema: sqliteSchema }),
  }
}

function createOrder(
  db: SQLiteDatabase,
  items = [{ produtoId: 'produto-1', quantidade: 2 }],
) {
  return db.transaction((tx) => createOrderInSqliteTransaction(tx, {
    tenantId: 'tenant-1',
    usuarioId: 'user-1',
    mesaId: 'mesa-1',
    items,
  }))
}

function findIdentifier(value: unknown, prefix: string): string | undefined {
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

describe('PostgreSQL snapshot lock order', () => {
  it('locks all products then all unique ingredients globally before reading recipes', async () => {
    const events: string[] = []
    let productRead = 0
    let recipeRead = 0
    const tx = {
      select: vi.fn(() => ({
        from: vi.fn((table: unknown) => {
          if (table === pgSchema.mesa) {
            return {
              where: vi.fn(() => ({
                for: vi.fn(async () => {
                  events.push('mesa')
                  return [{ numero: 7 }]
                }),
              })),
            }
          }
          if (table === pgSchema.produto) {
            return {
              innerJoin: vi.fn(() => ({
                where: vi.fn((condition: unknown) => ({
                  for: vi.fn(async () => {
                    const produtoId = findIdentifier(condition, 'produto-')
                    events.push(`product:${produtoId}`)
                    productRead += 1
                    return [{
                      nome: productRead === 1 ? 'A' : 'B',
                      preco: '10.00',
                      categoriaNome: 'Food',
                      controleEstoque: true,
                    }]
                  }),
                })),
              })),
            }
          }
          if (table === pgSchema.insumo) {
            return {
              where: vi.fn((condition: unknown) => ({
                for: vi.fn(async () => {
                  const insumoId = findIdentifier(condition, 'insumo-')
                  events.push(`ingredient:${insumoId}`)
                  return [{
                    nome: insumoId,
                    estoqueAtual: '100.000',
                    custoUnitario: null,
                    tenantId: 'tenant-1',
                    ativo: true,
                  }]
                }),
              })),
            }
          }
          if (table === pgSchema.fichaTecnicaItem) {
            const joinedRecipeWhere = () => ({
              orderBy: vi.fn(() => ({
                for: vi.fn(async () => {
                  events.push('recipe-read-and-ingredient-lock')
                  return [{
                    insumoId: recipeRead === 0 ? 'insumo-a' : 'insumo-z',
                    insumoTenantId: 'tenant-1',
                    quantidade: '1.000',
                  }]
                }),
              })),
            })
            return {
              innerJoin: vi.fn(() => ({
                where: vi.fn(joinedRecipeWhere),
              })),
              where: vi.fn(() => {
                recipeRead += 1
                if (recipeRead === 1) {
                  events.push('recipe-id-discovery')
                  return Promise.resolve([
                    { produtoId: 'produto-a', insumoId: 'insumo-z' },
                    { produtoId: 'produto-b', insumoId: 'insumo-a' },
                  ])
                }
                return {
                  orderBy: vi.fn(async () => {
                    events.push('recipe-read')
                    return [
                      {
                        produtoId: 'produto-a',
                        insumoId: 'insumo-z',
                        quantidade: '1.000',
                      },
                      {
                        produtoId: 'produto-b',
                        insumoId: 'insumo-a',
                        quantidade: '1.000',
                      },
                    ]
                  }),
                }
              }),
            }
          }
          throw new Error('Unexpected select table')
        }),
      })),
      insert: vi.fn(() => ({
        values: vi.fn(async () => undefined),
      })),
    }

    await createOrderInPostgresTransaction(tx as never, {
      tenantId: 'tenant-1',
      usuarioId: 'user-1',
      mesaId: 'mesa-1',
      items: [
        { produtoId: 'produto-b', quantidade: 1 },
        { produtoId: 'produto-a', quantidade: 1 },
      ],
    })

    expect(events).toEqual([
      'mesa',
      'product:produto-a',
      'product:produto-b',
      'recipe-id-discovery',
      'ingredient:insumo-a',
      'ingredient:insumo-z',
      'recipe-read',
    ])
  })

  it('includes the tenant in PostgreSQL order-item inserts', async () => {
    const inserts: Array<{ table: unknown; values: unknown }> = []
    const tx = {
      select: vi.fn(() => ({
        from: vi.fn((table: unknown) => {
          if (table === pgSchema.mesa) {
            return {
              where: vi.fn(() => ({
                for: vi.fn(async () => [{ numero: 7 }]),
              })),
            }
          }
          if (table === pgSchema.produto) {
            return {
              innerJoin: vi.fn(() => ({
                where: vi.fn(() => ({
                  for: vi.fn(async () => [{
                    nome: 'Margherita',
                    preco: '45.00',
                    categoriaNome: 'Pizzas',
                    controleEstoque: false,
                  }]),
                })),
              })),
            }
          }
          throw new Error('Unexpected select table')
        }),
      })),
      insert: vi.fn((table: unknown) => ({
        values: vi.fn(async (values: unknown) => {
          inserts.push({ table, values })
        }),
      })),
    }

    await createOrderInPostgresTransaction(tx as never, {
      tenantId: 'tenant-1',
      usuarioId: 'user-1',
      mesaId: 'mesa-1',
      items: [{ produtoId: 'produto-1', quantidade: 1 }],
    })

    const orderItemInsert = inserts.find(
      ({ table }) => table === pgSchema.itemPedido,
    )
    expect(orderItemInsert?.values).toEqual(expect.objectContaining({
      tenantId: 'tenant-1',
      pedidoId: expect.any(String),
      produtoId: 'produto-1',
    }))
  })
})

describe('transactional order creation and immutable stock snapshot', () => {
  let database: ReturnType<typeof createDatabase>

  beforeEach(() => {
    database = createDatabase()
  })

  afterEach(() => {
    database?.sqlite.close()
  })

  it('creates the order and normalized snapshot without consuming stock', () => {
    const created = createOrder(database.db)

    expect(created).toEqual(expect.objectContaining({
      id: expect.any(String),
      mesaNumero: 7,
    }))
    expect(database.sqlite.prepare(`
      SELECT insumo_id, quantidade_total
      FROM item_pedido_insumo
      ORDER BY insumo_id
    `).all()).toEqual([
      { insumo_id: 'insumo-1', quantidade_total: '5.000' },
      { insumo_id: 'insumo-2', quantidade_total: '2.000' },
    ])
    expect(database.sqlite.prepare(`
      SELECT id, estoque_atual
      FROM insumo
      WHERE tenant_id = 'tenant-1'
      ORDER BY id
    `).all()).toEqual([
      { id: 'insumo-1', estoque_atual: '100.000' },
      { id: 'insumo-2', estoque_atual: '100.000' },
    ])
    expect(database.sqlite.prepare(
      'SELECT COUNT(*) AS total FROM movimento_estoque',
    ).get()).toEqual({ total: 0 })
  })

  it('persists the order item tenant explicitly without the tenant-fill trigger', () => {
    database.sqlite.exec('DROP TRIGGER trg_item_pedido_fill_tenant')
    database.sqlite.prepare(
      "UPDATE produto SET controle_estoque = 0 WHERE id = 'produto-1'",
    ).run()

    const created = createOrder(database.db, [
      { produtoId: 'produto-1', quantidade: 1 },
    ])

    expect(database.sqlite.prepare(
      'SELECT tenant_id FROM item_pedido WHERE pedido_id = ?',
    ).all(created.id)).toEqual([{ tenant_id: 'tenant-1' }])
  })

  it.each([
    ['mesa-inativa', [{ produtoId: 'produto-1', quantidade: 1 }], 'Mesa inválida'],
    ['mesa-foreign', [{ produtoId: 'produto-1', quantidade: 1 }], 'Mesa inválida'],
    ['mesa-1', [{ produtoId: 'produto-indisponivel', quantidade: 1 }], 'Produto inválido'],
    ['mesa-1', [{ produtoId: 'produto-categoria-foreign', quantidade: 1 }], 'Produto inválido'],
    ['mesa-1', [{ produtoId: 'produto-ficha-invalida', quantidade: 1 }], 'Ficha técnica inválida'],
  ])(
    'rejects invalid tenant-scoped records inside the creation transaction',
    (mesaId, items, message) => {
      expect(() => database.db.transaction((tx) => (
        createOrderInSqliteTransaction(tx, {
          tenantId: 'tenant-1',
          usuarioId: 'user-1',
          mesaId,
          items,
        })
      ))).toThrow(message)

      expect(database.sqlite.prepare(
        'SELECT COUNT(*) AS total FROM pedido',
      ).get()).toEqual({ total: 0 })
    },
  )

  it('uses the immutable snapshot when the mutable recipe changes after ordering', () => {
    const created = createOrder(database.db, [
      { produtoId: 'produto-1', quantidade: 2 },
    ])
    database.sqlite.prepare(`
      UPDATE ficha_tecnica_item
      SET quantidade = '40.000'
      WHERE id = 'ficha-1'
    `).run()

    database.db.transaction((tx) => transitionOrderInSqliteTransaction(tx, {
      tenantId: 'tenant-1',
      usuarioId: 'user-1',
      pedidoId: created.id,
      targetStatus: 'em_preparo',
    }))

    expect(database.sqlite.prepare(`
      SELECT estoque_atual FROM insumo WHERE id = 'insumo-1'
    `).get()).toEqual({ estoque_atual: '95.000' })
  })
})

describe('atomic and idempotent order consumption', () => {
  let database: ReturnType<typeof createDatabase>

  beforeEach(() => {
    database = createDatabase()
  })

  afterEach(() => {
    database?.sqlite.close()
  })

  it('aggregates a shared ingredient while preserving item-level idempotency and unit multiplication', () => {
    const created = createOrder(database.db, [
      { produtoId: 'produto-1', quantidade: 2 },
      { produtoId: 'produto-2', quantidade: 3 },
    ])

    const result = database.db.transaction((tx) => (
      transitionOrderInSqliteTransaction(tx, {
        tenantId: 'tenant-1',
        usuarioId: 'user-1',
        pedidoId: created.id,
        targetStatus: 'em_preparo',
      })
    ))

    expect(result).toEqual({ changed: true, status: 'em_preparo' })
    expect(database.sqlite.prepare(`
      SELECT estoque_atual FROM insumo WHERE id = 'insumo-1'
    `).get()).toEqual({ estoque_atual: '86.000' })
    const sharedMovements = database.sqlite.prepare(`
      SELECT item_pedido_id, quantidade, chave_idempotencia
      FROM movimento_estoque
      WHERE insumo_id = 'insumo-1'
      ORDER BY item_pedido_id
    `).all() as Array<{
      item_pedido_id: string
      quantidade: string
      chave_idempotencia: string
    }>
    expect(sharedMovements.map((movement) => movement.quantidade).sort())
      .toEqual(['-5.000', '-9.000'])
    expect(sharedMovements).toEqual(expect.arrayContaining([
      expect.objectContaining({
        item_pedido_id: expect.any(String),
        chave_idempotencia: expect.stringMatching(
          /^consumo:tenant-1:pedido:.*:item:.*:insumo:insumo-1$/,
        ),
      }),
    ]))
  })

  it('treats a retry of the same target status as a successful no-op', () => {
    const created = createOrder(database.db)
    const transition = () => database.db.transaction((tx) => (
      transitionOrderInSqliteTransaction(tx, {
        tenantId: 'tenant-1',
        usuarioId: 'user-1',
        pedidoId: created.id,
        targetStatus: 'em_preparo',
      })
    ))

    expect(transition()).toEqual({ changed: true, status: 'em_preparo' })
    expect(transition()).toEqual({ changed: false, status: 'em_preparo' })
    expect(database.sqlite.prepare(
      'SELECT COUNT(*) AS total FROM movimento_estoque',
    ).get()).toEqual({ total: 2 })
    expect(database.sqlite.prepare(`
      SELECT estoque_atual FROM insumo WHERE id = 'insumo-1'
    `).get()).toEqual({ estoque_atual: '95.000' })
  })

  it('rolls back every movement and the status when aggregate stock is insufficient', () => {
    const created = createOrder(database.db, [
      { produtoId: 'produto-1', quantidade: 2 },
      { produtoId: 'produto-2', quantidade: 3 },
    ])
    database.sqlite.prepare(`
      UPDATE insumo SET estoque_atual = '12.000' WHERE id = 'insumo-1'
    `).run()

    expect(() => database.db.transaction((tx) => (
      transitionOrderInSqliteTransaction(tx, {
        tenantId: 'tenant-1',
        usuarioId: 'user-1',
        pedidoId: created.id,
        targetStatus: 'em_preparo',
      })
    ))).toThrow('Não há estoque suficiente para Cheese')

    expect(database.sqlite.prepare(`
      SELECT status FROM pedido WHERE id = ?
    `).get(created.id)).toEqual({ status: 'novo' })
    expect(database.sqlite.prepare(`
      SELECT id, estoque_atual
      FROM insumo
      WHERE tenant_id = 'tenant-1'
      ORDER BY id
    `).all()).toEqual([
      { id: 'insumo-1', estoque_atual: '12.000' },
      { id: 'insumo-2', estoque_atual: '100.000' },
    ])
    expect(database.sqlite.prepare(
      'SELECT COUNT(*) AS total FROM movimento_estoque',
    ).get()).toEqual({ total: 0 })
  })

  it('aggregates and consumes decimal quantities using exact thousandths', () => {
    database.sqlite.exec(`
      UPDATE ficha_tecnica_item
      SET quantidade = '0.100'
      WHERE id = 'ficha-1';
      UPDATE ficha_tecnica_item
      SET quantidade = '0.200'
      WHERE id = 'ficha-3';
      UPDATE insumo
      SET estoque_atual = '0.300'
      WHERE id = 'insumo-1';
    `)
    const created = createOrder(database.db, [
      { produtoId: 'produto-1', quantidade: 1 },
      { produtoId: 'produto-2', quantidade: 1 },
    ])

    expect(() => database.db.transaction((tx) => (
      transitionOrderInSqliteTransaction(tx, {
        tenantId: 'tenant-1',
        usuarioId: 'user-1',
        pedidoId: created.id,
        targetStatus: 'em_preparo',
      })
    ))).not.toThrow()

    expect(database.sqlite.prepare(`
      SELECT estoque_atual
      FROM insumo
      WHERE id = 'insumo-1'
    `).get()).toEqual({ estoque_atual: '0.000' })
  })

  it('moves through ready and delivered without consuming stock a second time', () => {
    const created = createOrder(database.db)
    const transition = (targetStatus: 'em_preparo' | 'pronto' | 'entregue') => (
      database.db.transaction((tx) => transitionOrderInSqliteTransaction(tx, {
        tenantId: 'tenant-1',
        usuarioId: 'user-1',
        pedidoId: created.id,
        targetStatus,
      }))
    )

    transition('em_preparo')
    const movementCountAfterPreparation = database.sqlite.prepare(
      'SELECT COUNT(*) AS total FROM movimento_estoque',
    ).get()
    transition('pronto')
    transition('entregue')

    expect(movementCountAfterPreparation).toEqual({ total: 2 })
    expect(database.sqlite.prepare(
      'SELECT COUNT(*) AS total FROM movimento_estoque',
    ).get()).toEqual({ total: 2 })
    expect(database.sqlite.prepare(`
      SELECT status, entregue_em IS NOT NULL AS delivered
      FROM pedido WHERE id = ?
    `).get(created.id)).toEqual({ status: 'entregue', delivered: 1 })
  })

  it('allows cancellation only while new and never creates a reversal', () => {
    const newOrder = createOrder(database.db)
    expect(database.db.transaction((tx) => cancelOrderInSqliteTransaction(tx, {
      tenantId: 'tenant-1',
      pedidoId: newOrder.id,
    }))).toEqual({ changed: true, status: 'cancelado' })

    const preparingOrder = createOrder(database.db)
    database.db.transaction((tx) => transitionOrderInSqliteTransaction(tx, {
      tenantId: 'tenant-1',
      usuarioId: 'user-1',
      pedidoId: preparingOrder.id,
      targetStatus: 'em_preparo',
    }))

    expect(() => database.db.transaction((tx) => (
      cancelOrderInSqliteTransaction(tx, {
        tenantId: 'tenant-1',
        pedidoId: preparingOrder.id,
      })
    ))).toThrow('Só pedidos novos podem ser cancelados')
    expect(database.sqlite.prepare(`
      SELECT COUNT(*) AS total
      FROM movimento_estoque
      WHERE tipo = 'estorno'
    `).get()).toEqual({ total: 0 })
  })
})
