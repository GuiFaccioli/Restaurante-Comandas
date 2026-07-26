import Database from 'better-sqlite3'
import { afterEach, describe, expect, it } from 'vitest'
import { migrateSqliteDatabase } from '@/lib/db/sqlite-migrations'

const openDatabases: Database.Database[] = []

function openDatabase(): Database.Database {
  const sqlite = new Database(':memory:')
  sqlite.pragma('foreign_keys = ON')
  openDatabases.push(sqlite)
  return sqlite
}

function insertTenantGraph(
  sqlite: Database.Database,
  suffix: 'a' | 'b',
  mesaNumero = 1,
): void {
  sqlite
    .prepare(
      'INSERT INTO tenant (id, nome, slug, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .run(
      `tenant-${suffix}`,
      `Tenant ${suffix.toUpperCase()}`,
      `tenant-${suffix}`,
      'active',
      1,
      1,
    )
  sqlite
    .prepare(
      'INSERT INTO mesa (id, tenant_id, numero, ativa) VALUES (?, ?, ?, ?)',
    )
    .run(`mesa-${suffix}`, `tenant-${suffix}`, mesaNumero, 1)
  sqlite
    .prepare(
      'INSERT INTO categoria (id, tenant_id, nome, ordem) VALUES (?, ?, ?, ?)',
    )
    .run(`categoria-${suffix}`, `tenant-${suffix}`, 'Pizza', 0)
  sqlite
    .prepare(
      `INSERT INTO produto (
        id, tenant_id, categoria_id, nome, preco, disponivel, controle_estoque
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      `produto-${suffix}`,
      `tenant-${suffix}`,
      `categoria-${suffix}`,
      `Produto ${suffix.toUpperCase()}`,
      '10.00',
      1,
      1,
    )
  sqlite
    .prepare(
      `INSERT INTO insumo (
        id, tenant_id, nome, unidade_base, unidade_compra
      ) VALUES (?, ?, ?, ?, ?)`,
    )
    .run(
      `insumo-${suffix}`,
      `tenant-${suffix}`,
      `Insumo ${suffix.toUpperCase()}`,
      'g',
      'kg',
    )
  sqlite
    .prepare(
      `INSERT INTO pedido (
        id, tenant_id, mesa_id, status, criado_em, atualizado_em
      ) VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      `pedido-${suffix}`,
      `tenant-${suffix}`,
      `mesa-${suffix}`,
      'novo',
      1,
      1,
    )
  sqlite
    .prepare(
      `INSERT INTO item_pedido (
        id, pedido_id, produto_id, quantidade, preco_unitario
      ) VALUES (?, ?, ?, ?, ?)`,
    )
    .run(
      `item-${suffix}`,
      `pedido-${suffix}`,
      `produto-${suffix}`,
      1,
      '10.00',
    )
}

afterEach(() => {
  while (openDatabases.length > 0) openDatabases.pop()?.close()
})

describe('reproducible SQLite baseline', () => {
  it('makes a blank database operational across the complete current schema', () => {
    const sqlite = openDatabase()

    migrateSqliteDatabase(sqlite)
    insertTenantGraph(sqlite, 'a')

    sqlite
      .prepare(
        `INSERT INTO usuario (
          id, nome, email, role, password_hash, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run('usuario-a', 'User A', 'a@example.com', 'admin', 'hash', 1, 1)
    sqlite
      .prepare(
        `INSERT INTO tenant_user (
          id, tenant_id, usuario_id, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run('membership-a', 'tenant-a', 'usuario-a', 'active', 1, 1)
    sqlite
      .prepare(
        `INSERT INTO usuario_acesso (
          id, tenant_user_id, usuario_id, acesso
        ) VALUES (?, ?, ?, ?)`,
      )
      .run('access-a', 'membership-a', 'usuario-a', 'admin')
    sqlite
      .prepare(
        `INSERT INTO auth_session (
          id, usuario_id, selected_tenant_id, token_hash, expires_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run('session-a', 'usuario-a', 'tenant-a', 'token-a', 999999, 1)
    sqlite
      .prepare(
        `INSERT INTO ficha_tecnica_item (
          id, tenant_id, produto_id, insumo_id, quantidade
        ) VALUES (?, ?, ?, ?, ?)`,
      )
      .run('ficha-a', 'tenant-a', 'produto-a', 'insumo-a', '0.250')
    sqlite
      .prepare(
        `INSERT INTO item_pedido_insumo (
          id, tenant_id, pedido_id, item_pedido_id, insumo_id, quantidade_total
        ) VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        'snapshot-a',
        'tenant-a',
        'pedido-a',
        'item-a',
        'insumo-a',
        '0.250',
      )
    sqlite
      .prepare(
        `INSERT INTO pagamento_pedido (
          id, tenant_id, pedido_id, registrado_por_usuario_id,
          forma_pagamento, valor, status, registrado_em
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        'pagamento-a',
        'tenant-a',
        'pedido-a',
        'usuario-a',
        'pix',
        '10.00',
        'registrado',
        1,
      )
    sqlite
      .prepare(
        `INSERT INTO movimento_estoque (
          id, tenant_id, insumo_id, tipo, quantidade, saldo_anterior,
          saldo_resultante, pedido_id, item_pedido_id, chave_idempotencia,
          criado_por_usuario_id, criado_em
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        'movimento-a',
        'tenant-a',
        'insumo-a',
        'saida',
        '-0.250',
        '1.000',
        '0.750',
        'pedido-a',
        'item-a',
        'pedido-a:item-a',
        'usuario-a',
        1,
      )

    const expectedTables = [
      'auth_session',
      'categoria',
      'ficha_tecnica_item',
      'insumo',
      'item_pedido',
      'item_pedido_insumo',
      'mesa',
      'movimento_estoque',
      'pagamento_pedido',
      'pedido',
      'produto',
      'tenant',
      'tenant_user',
      'usuario',
      'usuario_acesso',
    ]
    const tables = sqlite
      .prepare(
        `SELECT name
         FROM sqlite_master
         WHERE type = 'table' AND name NOT LIKE 'app_schema_%'
         ORDER BY name`,
      )
      .all()
      .map((row) => (row as { name: string }).name)

    expect(tables).toEqual(expectedTables)
    expect(
      sqlite
        .prepare(
          `SELECT
            (SELECT COUNT(*) FROM pedido) AS pedidos,
            (SELECT COUNT(*) FROM item_pedido) AS itens,
            (SELECT COUNT(*) FROM item_pedido_insumo) AS snapshots,
            (SELECT COUNT(*) FROM movimento_estoque) AS movimentos,
            (SELECT COUNT(*) FROM pagamento_pedido) AS pagamentos`,
        )
        .get(),
    ).toEqual({
      pedidos: 1,
      itens: 1,
      snapshots: 1,
      movimentos: 1,
      pagamentos: 1,
    })
    expect(sqlite.pragma('foreign_key_check')).toEqual([])
    expect(sqlite.pragma('foreign_keys', { simple: true })).toBe(1)
  })

  it('preserves existing rows, backfills item tenant, and is safe to rerun', () => {
    const sqlite = openDatabase()
    sqlite.exec(`
      CREATE TABLE tenant (
        id TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT 'active',
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
        imagem_url TEXT
      );
      CREATE TABLE pedido (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenant(id),
        mesa_id TEXT NOT NULL REFERENCES mesa(id),
        status TEXT NOT NULL DEFAULT 'novo',
        criado_em INTEGER NOT NULL,
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
      INSERT INTO tenant VALUES
        ('tenant-a', 'Tenant A', 'tenant-a', 'active', 1, 1),
        ('tenant-b', 'Tenant B', 'tenant-b', 'active', 1, 1);
      INSERT INTO mesa VALUES ('mesa-a', 'tenant-a', 1, 1);
      INSERT INTO categoria VALUES ('categoria-a', 'tenant-a', 'Pizza', 0);
      INSERT INTO produto VALUES (
        'produto-a', 'tenant-a', 'categoria-a', 'Pizza A', NULL, '10.00', 1, NULL
      );
      INSERT INTO pedido VALUES (
        'pedido-a', 'tenant-a', 'mesa-a', 'novo', 1, 1
      );
      INSERT INTO item_pedido VALUES (
        'item-a', 'pedido-a', 'produto-a', 1, '10.00', NULL
      );
    `)

    migrateSqliteDatabase(sqlite)
    migrateSqliteDatabase(sqlite)

    expect(
      sqlite
        .prepare(
          'SELECT id, tenant_id, pedido_id, produto_id FROM item_pedido',
        )
        .get(),
    ).toEqual({
      id: 'item-a',
      tenant_id: 'tenant-a',
      pedido_id: 'pedido-a',
      produto_id: 'produto-a',
    })
    sqlite
      .prepare(
        'INSERT INTO mesa (id, tenant_id, numero, ativa) VALUES (?, ?, ?, ?)',
      )
      .run('mesa-b', 'tenant-b', 1, 1)
    expect(sqlite.prepare('SELECT COUNT(*) AS total FROM mesa').get()).toEqual({
      total: 2,
    })
    expect(sqlite.pragma('foreign_key_check')).toEqual([])
    expect(sqlite.pragma('foreign_keys', { simple: true })).toBe(1)
  })
})

describe('SQLite tenant constraints', () => {
  it('rejects snapshot and movement items from another order in the same tenant', () => {
    const sqlite = openDatabase()
    migrateSqliteDatabase(sqlite)
    insertTenantGraph(sqlite, 'a')
    sqlite.exec(`
      INSERT INTO pedido (
        id, tenant_id, mesa_id, status, criado_em, atualizado_em
      ) VALUES (
        'pedido-a-2', 'tenant-a', 'mesa-a', 'novo', 2, 2
      );
      INSERT INTO item_pedido (
        id, pedido_id, produto_id, quantidade, preco_unitario
      ) VALUES (
        'item-a-2', 'pedido-a-2', 'produto-a', 1, '10.00'
      );
    `)

    expect(() =>
      sqlite
        .prepare(
          `INSERT INTO item_pedido_insumo (
            id, tenant_id, pedido_id, item_pedido_id,
            insumo_id, quantidade_total
          ) VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(
          'snapshot-wrong-order',
          'tenant-a',
          'pedido-a',
          'item-a-2',
          'insumo-a',
          '0.250',
        ),
    ).toThrow(/FOREIGN KEY constraint failed/)

    expect(() =>
      sqlite
        .prepare(
          `INSERT INTO movimento_estoque (
            id, tenant_id, insumo_id, tipo, quantidade,
            pedido_id, item_pedido_id, chave_idempotencia, criado_em
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          'movimento-wrong-order',
          'tenant-a',
          'insumo-a',
          'saida',
          '-0.250',
          'pedido-a',
          'item-a-2',
          'wrong-order',
          2,
        ),
    ).toThrow(/FOREIGN KEY constraint failed/)
  })

  it('applies payment uniqueness as an incremental after an older tracked baseline', () => {
    const sqlite = openDatabase()
    migrateSqliteDatabase(sqlite)
    sqlite.exec(`
      DROP INDEX pagamento_pedido_tenant_pedido_registrado_unique;
      DELETE FROM app_schema_migration
       WHERE id = '202607232200_add_registered_payment_uniqueness';
    `)

    migrateSqliteDatabase(sqlite)
    insertTenantGraph(sqlite, 'a')
    sqlite.exec(`
      INSERT INTO usuario (
        id, nome, email, role, created_at, updated_at
      ) VALUES ('usuario-a', 'User A', 'a@example.com', 'admin', 1, 1);
      INSERT INTO pagamento_pedido (
        id, tenant_id, pedido_id, registrado_por_usuario_id,
        forma_pagamento, valor, status, registrado_em
      ) VALUES (
        'pagamento-a-1', 'tenant-a', 'pedido-a', 'usuario-a',
        'pix', '10.00', 'registrado', 1
      );
    `)

    expect(() =>
      sqlite.exec(`
        INSERT INTO pagamento_pedido (
          id, tenant_id, pedido_id, registrado_por_usuario_id,
          forma_pagamento, valor, status, registrado_em
        ) VALUES (
          'pagamento-a-2', 'tenant-a', 'pedido-a', 'usuario-a',
          'pix', '10.00', 'registrado', 2
        );
      `),
    ).toThrow(/UNIQUE constraint failed/)
  })

  it('allows one registered payment per tenant order and a replacement after reversal', () => {
    const sqlite = openDatabase()
    migrateSqliteDatabase(sqlite)
    insertTenantGraph(sqlite, 'a')
    insertTenantGraph(sqlite, 'b')
    sqlite.exec(`
      INSERT INTO usuario (
        id, nome, email, role, created_at, updated_at
      ) VALUES ('usuario-a', 'User A', 'a@example.com', 'admin', 1, 1);
    `)
    const insertPayment = sqlite.prepare(
      `INSERT INTO pagamento_pedido (
        id, tenant_id, pedido_id, registrado_por_usuario_id,
        forma_pagamento, valor, status, registrado_em
      ) VALUES (?, ?, ?, ?, ?, ?, 'registrado', ?)`,
    )

    insertPayment.run(
      'pagamento-a-1',
      'tenant-a',
      'pedido-a',
      'usuario-a',
      'pix',
      '10.00',
      1,
    )
    insertPayment.run(
      'pagamento-b-1',
      'tenant-b',
      'pedido-b',
      'usuario-a',
      'pix',
      '10.00',
      1,
    )
    expect(() =>
      insertPayment.run(
        'pagamento-a-duplicate',
        'tenant-a',
        'pedido-a',
        'usuario-a',
        'dinheiro',
        '10.00',
        2,
      ),
    ).toThrow(/UNIQUE constraint failed/)

    sqlite
      .prepare(
        `UPDATE pagamento_pedido
            SET status = 'estornado'
          WHERE id = 'pagamento-a-1'`,
      )
      .run()
    insertPayment.run(
      'pagamento-a-2',
      'tenant-a',
      'pedido-a',
      'usuario-a',
      'dinheiro',
      '10.00',
      3,
    )

    expect(
      sqlite
        .prepare(
          `SELECT tenant_id, pedido_id, status
             FROM pagamento_pedido
            ORDER BY tenant_id, id`,
        )
        .all(),
    ).toEqual([
      {
        tenant_id: 'tenant-a',
        pedido_id: 'pedido-a',
        status: 'estornado',
      },
      {
        tenant_id: 'tenant-a',
        pedido_id: 'pedido-a',
        status: 'registrado',
      },
      {
        tenant_id: 'tenant-b',
        pedido_id: 'pedido-b',
        status: 'registrado',
      },
    ])
  })

  it('removes legacy global idempotency uniqueness even when the composite index already exists', () => {
    const sqlite = openDatabase()
    sqlite.exec(`
      CREATE TABLE tenant (id TEXT PRIMARY KEY);
      CREATE TABLE insumo (
        id TEXT PRIMARY KEY NOT NULL,
        tenant_id TEXT NOT NULL REFERENCES tenant(id),
        nome TEXT NOT NULL,
        unidade_base TEXT NOT NULL,
        unidade_compra TEXT NOT NULL,
        fator_compra_para_base TEXT NOT NULL DEFAULT '1',
        estoque_atual TEXT NOT NULL DEFAULT '0',
        estoque_ideal TEXT NOT NULL DEFAULT '0',
        estoque_minimo TEXT NOT NULL DEFAULT '0',
        custo_unitario TEXT,
        ativo INTEGER NOT NULL DEFAULT 1
      );
      CREATE TABLE movimento_estoque (
        id TEXT PRIMARY KEY NOT NULL,
        tenant_id TEXT NOT NULL REFERENCES tenant(id),
        insumo_id TEXT NOT NULL REFERENCES insumo(id),
        tipo TEXT NOT NULL,
        quantidade TEXT NOT NULL,
        saldo_anterior TEXT NOT NULL DEFAULT '0',
        saldo_resultante TEXT NOT NULL DEFAULT '0',
        custo_unitario TEXT,
        custo_total TEXT,
        pedido_id TEXT,
        item_pedido_id TEXT,
        chave_idempotencia TEXT NOT NULL UNIQUE,
        motivo TEXT,
        observacao TEXT,
        criado_por_usuario_id TEXT,
        criado_em INTEGER NOT NULL
      );
      CREATE UNIQUE INDEX movimento_estoque_tenant_chave_idempotencia_unique
        ON movimento_estoque (tenant_id, chave_idempotencia);
      INSERT INTO tenant VALUES ('tenant-a'), ('tenant-b');
      INSERT INTO insumo (
        id, tenant_id, nome, unidade_base, unidade_compra
      ) VALUES
        ('insumo-a', 'tenant-a', 'Insumo A', 'g', 'kg'),
        ('insumo-b', 'tenant-b', 'Insumo B', 'g', 'kg');
      INSERT INTO movimento_estoque (
        id, tenant_id, insumo_id, tipo, quantidade,
        chave_idempotencia, criado_em
      ) VALUES (
        'movimento-a', 'tenant-a', 'insumo-a', 'entrada',
        '1.000', 'shared-key', 1
      );
    `)

    migrateSqliteDatabase(sqlite)

    sqlite
      .prepare(
        `INSERT INTO movimento_estoque (
          id, tenant_id, insumo_id, tipo, quantidade,
          chave_idempotencia, criado_em
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        'movimento-b',
        'tenant-b',
        'insumo-b',
        'entrada',
        '1.000',
        'shared-key',
        2,
      )

    const uniqueIndexes = (
      sqlite
        .prepare('PRAGMA index_list(movimento_estoque)')
        .all() as Array<{ name: string; unique: number }>
    )
      .filter((index) => index.unique === 1)
      .map((index) => ({
        name: index.name,
        columns: (
          sqlite
            .prepare(`PRAGMA index_info("${index.name}")`)
            .all() as Array<{ name: string }>
        ).map((column) => column.name),
      }))

    expect(uniqueIndexes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          columns: ['tenant_id', 'chave_idempotencia'],
        }),
      ]),
    )
    expect(
      uniqueIndexes.some(
        (index) =>
          index.columns.length === 1 &&
          index.columns[0] === 'chave_idempotencia',
      ),
    ).toBe(false)
    expect(
      sqlite
        .prepare(
          `SELECT tenant_id, chave_idempotencia
           FROM movimento_estoque
           ORDER BY tenant_id`,
        )
        .all(),
    ).toEqual([
      { tenant_id: 'tenant-a', chave_idempotencia: 'shared-key' },
      { tenant_id: 'tenant-b', chave_idempotencia: 'shared-key' },
    ])
  })

  it('rejects cross-tenant relationships and allows tenant-local repeated keys', () => {
    const sqlite = openDatabase()
    migrateSqliteDatabase(sqlite)
    insertTenantGraph(sqlite, 'a', 7)
    insertTenantGraph(sqlite, 'b', 7)
    sqlite.exec(`
      INSERT INTO usuario (
        id, nome, email, role, created_at, updated_at
      ) VALUES ('usuario-a', 'User A', 'a@example.com', 'admin', 1, 1);
    `)

    expect(() =>
      sqlite
        .prepare(
          `INSERT INTO produto (
            id, tenant_id, categoria_id, nome, preco
          ) VALUES (?, ?, ?, ?, ?)`,
        )
        .run(
          'produto-cross',
          'tenant-a',
          'categoria-b',
          'Cross category',
          '10.00',
        ),
    ).toThrow(/FOREIGN KEY constraint failed/)

    expect(() =>
      sqlite
        .prepare(
          `INSERT INTO pedido (
            id, tenant_id, mesa_id, status, criado_em, atualizado_em
          ) VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run('pedido-cross', 'tenant-a', 'mesa-b', 'novo', 1, 1),
    ).toThrow(/FOREIGN KEY constraint failed/)

    expect(() =>
      sqlite
        .prepare(
          `INSERT INTO item_pedido (
            id, tenant_id, pedido_id, produto_id, quantidade, preco_unitario
          ) VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(
          'item-cross',
          'tenant-a',
          'pedido-b',
          'produto-a',
          1,
          '10.00',
        ),
    ).toThrow(/FOREIGN KEY constraint failed/)

    expect(() =>
      sqlite
        .prepare(
          `INSERT INTO ficha_tecnica_item (
            id, tenant_id, produto_id, insumo_id, quantidade
          ) VALUES (?, ?, ?, ?, ?)`,
        )
        .run(
          'ficha-cross',
          'tenant-a',
          'produto-a',
          'insumo-b',
          '0.250',
        ),
    ).toThrow(/FOREIGN KEY constraint failed/)

    expect(() =>
      sqlite
        .prepare(
          `INSERT INTO item_pedido_insumo (
            id, tenant_id, pedido_id, item_pedido_id, insumo_id, quantidade_total
          ) VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(
          'snapshot-cross',
          'tenant-a',
          'pedido-a',
          'item-a',
          'insumo-b',
          '0.250',
        ),
    ).toThrow(/FOREIGN KEY constraint failed/)

    expect(() =>
      sqlite
        .prepare(
          `INSERT INTO movimento_estoque (
            id, tenant_id, insumo_id, tipo, quantidade, pedido_id,
            item_pedido_id, chave_idempotencia, criado_em
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          'movimento-cross',
          'tenant-a',
          'insumo-b',
          'saida',
          '-0.250',
          'pedido-a',
          'item-a',
          'shared-key',
          1,
        ),
    ).toThrow(/FOREIGN KEY constraint failed/)

    expect(() =>
      sqlite
        .prepare(
          `INSERT INTO pagamento_pedido (
            id, tenant_id, pedido_id, registrado_por_usuario_id,
            forma_pagamento, valor, status, registrado_em
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          'pagamento-cross',
          'tenant-a',
          'pedido-b',
          'usuario-a',
          'pix',
          '10.00',
          'registrado',
          1,
        ),
    ).toThrow(/FOREIGN KEY constraint failed/)

    const insertMovement = sqlite.prepare(
      `INSERT INTO movimento_estoque (
        id, tenant_id, insumo_id, tipo, quantidade,
        chave_idempotencia, criado_em
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    insertMovement.run(
      'movimento-a',
      'tenant-a',
      'insumo-a',
      'entrada',
      '1.000',
      'shared-key',
      1,
    )
    insertMovement.run(
      'movimento-b',
      'tenant-b',
      'insumo-b',
      'entrada',
      '1.000',
      'shared-key',
      1,
    )

    expect(
      sqlite
        .prepare(
          'SELECT tenant_id, numero FROM mesa ORDER BY tenant_id',
        )
        .all(),
    ).toEqual([
      { tenant_id: 'tenant-a', numero: 7 },
      { tenant_id: 'tenant-b', numero: 7 },
    ])
    expect(
      sqlite
        .prepare(
          `SELECT tenant_id, chave_idempotencia
           FROM movimento_estoque
           ORDER BY tenant_id`,
        )
        .all(),
    ).toEqual([
      { tenant_id: 'tenant-a', chave_idempotencia: 'shared-key' },
      { tenant_id: 'tenant-b', chave_idempotencia: 'shared-key' },
    ])
  })

  it('fails clearly before changing legacy cross-tenant data', () => {
    const sqlite = openDatabase()
    sqlite.exec(`
      CREATE TABLE tenant (
        id TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT 'active',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
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
        preco TEXT NOT NULL
      );
      INSERT INTO tenant VALUES
        ('tenant-a', 'Tenant A', 'tenant-a', 'active', 1, 1),
        ('tenant-b', 'Tenant B', 'tenant-b', 'active', 1, 1);
      INSERT INTO categoria VALUES ('categoria-b', 'tenant-b', 'Pizza', 0);
      INSERT INTO produto VALUES (
        'produto-cross', 'tenant-a', 'categoria-b', 'Cross', '10.00'
      );
    `)

    expect(() => migrateSqliteDatabase(sqlite)).toThrow(
      /Cross-tenant data detected.*produto.*categoria/i,
    )
    expect(
      sqlite
        .prepare(
          'SELECT id, tenant_id, categoria_id FROM produto',
        )
        .get(),
    ).toEqual({
      id: 'produto-cross',
      tenant_id: 'tenant-a',
      categoria_id: 'categoria-b',
    })
    expect(sqlite.pragma('foreign_keys', { simple: true })).toBe(1)
  })
})
