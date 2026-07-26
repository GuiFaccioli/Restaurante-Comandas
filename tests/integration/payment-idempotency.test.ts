import Database from 'better-sqlite3'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(async () => ({
    usuarioId: 'cashier-1',
    tenantId: 'tenant-1',
    access: 'caixa',
  })),
}))

vi.mock('@/lib/auth/access', () => ({
  requireAccess: mocks.requireAccess,
}))

const originalDatabaseUrl = process.env.DATABASE_URL
let tempDirectory = ''
let openConnections: Database.Database[] = []

function sqliteClient(module: typeof import('@/lib/db/index')) {
  return (
    module.db as unknown as { $client: Database.Database }
  ).$client
}

function seedDeliveredOrder(databasePath: string): void {
  const sqlite = new Database(databasePath)
  try {
    const now = Date.now()
    sqlite.exec(`
      INSERT INTO tenant (
        id, nome, slug, status, created_at, updated_at
      ) VALUES (
        'tenant-1', 'Tenant 1', 'tenant-1', 'active', ${now}, ${now}
      );
      INSERT INTO usuario (
        id, nome, email, role, created_at, updated_at
      ) VALUES (
        'cashier-1', 'Cashier', 'cashier@example.test', 'admin', ${now}, ${now}
      );
      INSERT INTO mesa (
        id, tenant_id, numero, ativa
      ) VALUES (
        'table-1', 'tenant-1', 1, 1
      );
      INSERT INTO categoria (
        id, tenant_id, nome, ordem
      ) VALUES (
        'category-1', 'tenant-1', 'Category', 1
      );
      INSERT INTO produto (
        id, tenant_id, categoria_id, nome, preco, disponivel,
        controle_estoque
      ) VALUES (
        'product-1', 'tenant-1', 'category-1', 'Product', '12.35', 1, 0
      );
      INSERT INTO pedido (
        id, tenant_id, mesa_id, created_by_user_id, status,
        criado_em, entregue_em, atualizado_em
      ) VALUES (
        'order-1', 'tenant-1', 'table-1', 'cashier-1', 'entregue',
        ${now}, ${now}, ${now}
      );
      INSERT INTO item_pedido (
        id, tenant_id, pedido_id, produto_id, quantidade,
        preco_unitario, observacao
      ) VALUES (
        'item-1', 'tenant-1', 'order-1', 'product-1', 2,
        '12.35', NULL
      );
    `)
  } finally {
    sqlite.close()
  }
}

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  tempDirectory = mkdtempSync(join(tmpdir(), 'payment-idempotency-'))
  process.env.DATABASE_URL = `file:${join(tempDirectory, 'payments.db')}`
})

afterEach(() => {
  for (const connection of openConnections) connection.close()
  openConnections = []
  vi.resetModules()

  if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL
  else process.env.DATABASE_URL = originalDatabaseUrl

  rmSync(tempDirectory, { recursive: true, force: true })
})

describe('SQLite registered payment idempotency', () => {
  it('uses two real connections and keeps one registered payment for concurrent retries', async () => {
    const firstActionModule = await import('@/lib/actions/pedidos')
    const firstDbModule = await import('@/lib/db/index')
    const databasePath = join(tempDirectory, 'payments.db')
    seedDeliveredOrder(databasePath)

    vi.resetModules()
    const secondActionModule = await import('@/lib/actions/pedidos')
    const secondDbModule = await import('@/lib/db/index')
    const firstConnection = sqliteClient(firstDbModule)
    const secondConnection = sqliteClient(secondDbModule)
    openConnections = [firstConnection, secondConnection]

    expect(firstConnection).not.toBe(secondConnection)
    expect(
      firstConnection
        .prepare(`
          SELECT name
            FROM sqlite_master
           WHERE type = 'index'
             AND name =
               'pagamento_pedido_tenant_pedido_registrado_unique'
        `)
        .get(),
    ).toEqual({
      name: 'pagamento_pedido_tenant_pedido_registrado_unique',
    })

    const results = await Promise.all([
      firstActionModule.registrarPagamentoPedido({
        pedidoId: 'order-1',
        formaPagamento: 'pix',
        valor: '24,70',
      }),
      secondActionModule.registrarPagamentoPedido({
        pedidoId: 'order-1',
        formaPagamento: 'pix',
        valor: '24,70',
      }),
    ])

    expect(results.map((result) => result.status).sort()).toEqual([
      'ja_registrado',
      'registrado',
    ])
    expect(
      firstConnection
        .prepare(`
          SELECT COUNT(*) AS total
            FROM pagamento_pedido
           WHERE tenant_id = ?
             AND pedido_id = ?
             AND status = 'registrado'
        `)
        .get('tenant-1', 'order-1'),
    ).toEqual({ total: 1 })
  })
})
