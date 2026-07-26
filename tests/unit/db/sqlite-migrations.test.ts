import Database from 'better-sqlite3'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  migrateSqliteDatabase,
  sqliteMigrationChecksumForManifest,
  sqliteMigrationManifest,
} from '@/lib/db/sqlite-migrations'

describe('SQLite migrations', () => {
  it('tracks checksums, rejects mismatches, and detects postcondition drift', () => {
    const sqlite = new Database(':memory:')
    sqlite.pragma('foreign_keys = ON')
    migrateSqliteDatabase(sqlite)

    const tracked = sqlite
      .prepare(
        'SELECT id, checksum FROM app_schema_migration ORDER BY id',
      )
      .all() as Array<{ id: string; checksum: string }>
    expect(tracked).toHaveLength(3)
    expect(tracked.every((row) => /^[a-f0-9]{64}$/.test(row.checksum))).toBe(
      true,
    )

    sqlite
      .prepare(
        `UPDATE app_schema_migration
            SET checksum = ?
          WHERE id = ?`,
      )
      .run(
        '0'.repeat(64),
        '202607232200_add_registered_payment_uniqueness',
      )
    expect(() => migrateSqliteDatabase(sqlite)).toThrow(
      /checksum mismatch.*202607232200/i,
    )

    sqlite
      .prepare(
        `UPDATE app_schema_migration
            SET checksum = ?
          WHERE id = ?`,
      )
      .run(
        tracked.find((row) => row.id.includes('232200'))?.checksum,
        '202607232200_add_registered_payment_uniqueness',
      )
    sqlite.exec(
      'DROP INDEX pagamento_pedido_tenant_pedido_registrado_unique',
    )
    expect(() => migrateSqliteDatabase(sqlite)).toThrow(
      /schema drift.*pagamento_pedido_tenant_pedido_registrado_unique/i,
    )
    sqlite.close()
  })

  it('derives each checksum from the versioned manifest, including real rebuild copy transforms', () => {
    const sqlite = new Database(':memory:')
    migrateSqliteDatabase(sqlite)
    const migration =
      '202607232300_enforce_order_item_coherence'
    const tracked = sqlite
      .prepare(
        'SELECT checksum FROM app_schema_migration WHERE id = ?',
      )
      .get(migration) as { checksum: string }
    const idOnlyChecksum = createHash('sha256')
      .update(`restaurante-comandas:sqlite:${migration}:v1`)
      .digest('hex')

    expect(tracked.checksum).not.toBe(idOnlyChecksum)

    const manifest = sqliteMigrationManifest()
    expect(manifest.version).toBe(1)
    const coherenceMigration = manifest.migrations[migration]
    if (!coherenceMigration?.rebuild) {
      throw new Error('The coherence migration must declare its rebuild flow.')
    }
    expect(coherenceMigration.rebuild.copyTransforms).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: 'movimento_estoque',
          target: 'chave_idempotencia',
          fallback: "'legacy:' || src.id",
        }),
      ]),
    )
    expect(sqliteMigrationChecksumForManifest(migration, manifest)).toBe(
      tracked.checksum,
    )

    const changedManifest = structuredClone(manifest)
    const changedCoherenceMigration = changedManifest.migrations[migration]
    if (!changedCoherenceMigration?.rebuild) {
      throw new Error('The cloned coherence migration must declare its rebuild flow.')
    }
    const fallback = changedCoherenceMigration.rebuild.copyTransforms.find((transform) => (
        transform.table === 'movimento_estoque' &&
        transform.target === 'chave_idempotencia'
      ))
    expect(fallback).toBeDefined()
    if (!fallback) return
    fallback.fallback = "'changed:' || src.id"
    const changedContentChecksum = sqliteMigrationChecksumForManifest(
      migration,
      changedManifest,
    )
    expect(changedContentChecksum).not.toBe(tracked.checksum)

    const changedDerivedManifest = structuredClone(manifest)
    const changedDerivedMigration = changedDerivedManifest.migrations[migration]
    if (!changedDerivedMigration?.rebuild) {
      throw new Error('The cloned coherence migration must declare its rebuild flow.')
    }
    const itemTenantTransform = changedDerivedMigration.rebuild.copyTransforms.find(
      (transform) => (
        transform.table === 'item_pedido' &&
        transform.target === 'tenant_id'
      ),
    )
    const itemTenantDerivation = itemTenantTransform?.derived as
      | { sourceColumnPresentExpression?: string }
      | undefined
    expect(itemTenantDerivation).toEqual(
      expect.objectContaining({
        sourceColumnPresentExpression: expect.stringContaining('COALESCE('),
      }),
    )
    if (!itemTenantDerivation?.sourceColumnPresentExpression) return
    itemTenantDerivation.sourceColumnPresentExpression =
      "COALESCE(src.tenant_id, 'changed-tenant')"
    expect(
      sqliteMigrationChecksumForManifest(migration, changedDerivedManifest),
    ).not.toBe(tracked.checksum)

    sqlite
      .prepare(
        'UPDATE app_schema_migration SET checksum = ? WHERE id = ?',
      )
      .run(changedContentChecksum, migration)

    expect(() => migrateSqliteDatabase(sqlite)).toThrow(
      /checksum mismatch.*202607232300/i,
    )
    sqlite.close()
  })

  it('does not adopt any legacy checksum when the baseline table structure drifted', () => {
    const sqlite = new Database(':memory:')
    sqlite.pragma('foreign_keys = ON')
    migrateSqliteDatabase(sqlite)
    sqlite.exec(`
      ALTER TABLE app_schema_migration
        RENAME TO app_schema_migration_current;
      CREATE TABLE app_schema_migration (
        id TEXT PRIMARY KEY NOT NULL,
        checksum TEXT,
        applied_at INTEGER NOT NULL
      );
      INSERT INTO app_schema_migration (id, checksum, applied_at)
      SELECT id, NULL, applied_at
      FROM app_schema_migration_current;
      DROP TABLE app_schema_migration_current;
    `)

    sqlite.pragma('foreign_keys = OFF')
    sqlite.exec(`
      CREATE TABLE produto_drift (
        id TEXT PRIMARY KEY NOT NULL,
        tenant_id TEXT NOT NULL REFERENCES tenant(id),
        categoria_id TEXT NOT NULL,
        nome TEXT NOT NULL,
        descricao TEXT,
        preco INTEGER NOT NULL,
        disponivel INTEGER NOT NULL DEFAULT 1,
        imagem_url TEXT,
        controle_estoque INTEGER,
        UNIQUE (tenant_id, id),
        FOREIGN KEY (tenant_id, categoria_id)
          REFERENCES categoria(tenant_id, id)
      );
      DROP TABLE produto;
      ALTER TABLE produto_drift RENAME TO produto;
      CREATE INDEX idx_produto_cat ON produto(categoria_id);
      CREATE INDEX idx_produto_tenant_id ON produto(tenant_id);
    `)
    sqlite.pragma('foreign_keys = ON')

    expect(() => migrateSqliteDatabase(sqlite)).toThrow(
      /schema drift.*produto/i,
    )
    expect(
      sqlite
        .prepare(
          `SELECT COUNT(*) AS total
             FROM app_schema_migration
            WHERE checksum IS NOT NULL`,
        )
        .get(),
    ).toEqual({ total: 0 })
    sqlite.close()
  })

  it.each([
    ['missing', ''],
    [
      'divergent',
      `FOREIGN KEY (tenant_id, pedido_id, item_pedido_id)
        REFERENCES item_pedido(tenant_id, pedido_id, id) ON DELETE SET NULL`,
    ],
  ])(
    'does not adopt a legacy coherence checksum when its composite foreign key is %s',
    (_drift, compositeForeignKey) => {
      const sqlite = new Database(':memory:')
      sqlite.pragma('foreign_keys = ON')
      migrateSqliteDatabase(sqlite)
      sqlite.exec(`
        ALTER TABLE app_schema_migration
          RENAME TO app_schema_migration_current;
        CREATE TABLE app_schema_migration (
          id TEXT PRIMARY KEY NOT NULL,
          checksum TEXT,
          applied_at INTEGER NOT NULL
        );
        INSERT INTO app_schema_migration (id, checksum, applied_at)
        SELECT
          id,
          CASE
            WHEN id = '202607232300_enforce_order_item_coherence' THEN NULL
            ELSE checksum
          END,
          applied_at
        FROM app_schema_migration_current;
        DROP TABLE app_schema_migration_current;
      `)

      sqlite.pragma('foreign_keys = OFF')
      sqlite.exec(`
        ALTER TABLE item_pedido_insumo
          RENAME TO item_pedido_insumo_before_drift;
        CREATE TABLE item_pedido_insumo (
          id TEXT PRIMARY KEY NOT NULL,
          tenant_id TEXT NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
          pedido_id TEXT NOT NULL,
          item_pedido_id TEXT NOT NULL,
          insumo_id TEXT NOT NULL,
          quantidade_total TEXT NOT NULL,
          UNIQUE (tenant_id, item_pedido_id, insumo_id),
          FOREIGN KEY (tenant_id, pedido_id)
            REFERENCES pedido(tenant_id, id) ON DELETE CASCADE,
          FOREIGN KEY (tenant_id, insumo_id)
            REFERENCES insumo(tenant_id, id)
          ${compositeForeignKey ? `, ${compositeForeignKey}` : ''}
        );
        INSERT INTO item_pedido_insumo
        SELECT * FROM item_pedido_insumo_before_drift;
        DROP TABLE item_pedido_insumo_before_drift;
      `)
      sqlite.pragma('foreign_keys = ON')

      expect(() => migrateSqliteDatabase(sqlite)).toThrow(
        /schema drift.*item_pedido_insumo.*foreign key/i,
      )
      expect(
        sqlite
          .prepare(
            `SELECT checksum
               FROM app_schema_migration
              WHERE id = '202607232300_enforce_order_item_coherence'`,
          )
          .get(),
      ).toEqual({ checksum: null })
      sqlite.close()
    },
  )

  it('adds stock columns and tables to an existing database without losing products', () => {
    const sqlite = new Database(':memory:')
    sqlite.exec(`
      CREATE TABLE tenant (id TEXT PRIMARY KEY);
      CREATE TABLE categoria (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        nome TEXT NOT NULL
      );
      CREATE TABLE produto (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        categoria_id TEXT NOT NULL,
        nome TEXT NOT NULL,
        preco TEXT NOT NULL
      );
      INSERT INTO tenant VALUES ('tenant-1');
      INSERT INTO categoria VALUES ('categoria-1', 'tenant-1', 'Pizza');
      INSERT INTO produto VALUES (
        'p1', 'tenant-1', 'categoria-1', 'Pizza', '10.00'
      );
    `)

    migrateSqliteDatabase(sqlite)

    expect(sqlite.prepare('SELECT nome, controle_estoque FROM produto').get()).toEqual({ nome: 'Pizza', controle_estoque: 0 })
    expect(sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'insumo'").get()).toEqual({ name: 'insumo' })
    const movementColumns = sqlite.prepare('PRAGMA table_info(movimento_estoque)').all() as Array<{ name: string }>
    expect(movementColumns.map((column) => column.name)).toEqual(expect.arrayContaining([
      'saldo_anterior', 'saldo_resultante', 'custo_unitario', 'custo_total', 'item_pedido_id', 'motivo', 'criado_por_usuario_id',
    ]))
    sqlite.close()
  })

  it('is idempotent on an empty database', () => {
    const sqlite = new Database(':memory:')
    sqlite.pragma('foreign_keys = OFF')

    migrateSqliteDatabase(sqlite)
    migrateSqliteDatabase(sqlite)

    expect(sqlite.pragma('foreign_keys', { simple: true })).toBe(0)
    expect(sqlite.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'movimento_estoque'",
    ).get()).toEqual({ name: 'movimento_estoque' })
    sqlite.close()
  })

  it('rebuilds a legacy movement table with tenant-scoped idempotency without losing history', () => {
    const sqlite = new Database(':memory:')
    sqlite.pragma('foreign_keys = ON')
    sqlite.exec(`
      CREATE TABLE tenant (id TEXT PRIMARY KEY);
      CREATE TABLE produto (id TEXT PRIMARY KEY, nome TEXT NOT NULL);
      CREATE TABLE insumo (
        id TEXT PRIMARY KEY NOT NULL,
        tenant_id TEXT NOT NULL,
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
      CREATE TABLE pedido (id TEXT PRIMARY KEY);
      CREATE TABLE item_pedido (id TEXT PRIMARY KEY);
      CREATE TABLE usuario (id TEXT PRIMARY KEY);
      CREATE TABLE movimento_estoque (
        id TEXT PRIMARY KEY NOT NULL,
        tenant_id TEXT NOT NULL,
        insumo_id TEXT NOT NULL,
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
      INSERT INTO tenant VALUES ('tenant-a'), ('tenant-b');
      INSERT INTO insumo (
        id, tenant_id, nome, unidade_base, unidade_compra
      ) VALUES
        ('ingredient-a', 'tenant-a', 'Ingredient A', 'g', 'kg'),
        ('ingredient-b', 'tenant-b', 'Ingredient B', 'g', 'kg');
      INSERT INTO movimento_estoque (
        id, tenant_id, insumo_id, tipo, quantidade, saldo_anterior,
        saldo_resultante, chave_idempotencia, criado_em
      ) VALUES (
        'movement-a', 'tenant-a', 'ingredient-a', 'entrada', '5.000',
        '0.000', '5.000', 'shared-key', 1
      );
    `)

    migrateSqliteDatabase(sqlite)
    migrateSqliteDatabase(sqlite)

    sqlite.prepare(`
      INSERT INTO movimento_estoque (
        id, tenant_id, insumo_id, tipo, quantidade, saldo_anterior,
        saldo_resultante, chave_idempotencia, criado_em
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'movement-b',
      'tenant-b',
      'ingredient-b',
      'entrada',
      '3.000',
      '0.000',
      '3.000',
      'shared-key',
      2,
    )

    expect(() => sqlite.prepare(`
      INSERT INTO movimento_estoque (
        id, tenant_id, insumo_id, tipo, quantidade, saldo_anterior,
        saldo_resultante, chave_idempotencia, criado_em
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'movement-a-duplicate',
      'tenant-a',
      'ingredient-a',
      'entrada',
      '1.000',
      '5.000',
      '6.000',
      'shared-key',
      3,
    )).toThrow(/UNIQUE constraint failed/)

    expect(sqlite.prepare(`
      SELECT id, tenant_id, chave_idempotencia
      FROM movimento_estoque
      ORDER BY id
    `).all()).toEqual([
      {
        id: 'movement-a',
        tenant_id: 'tenant-a',
        chave_idempotencia: 'shared-key',
      },
      {
        id: 'movement-b',
        tenant_id: 'tenant-b',
        chave_idempotencia: 'shared-key',
      },
    ])
    const movementForeignKeys = sqlite
      .prepare('PRAGMA foreign_key_list(movimento_estoque)')
      .all() as Array<{ from: string; table: string }>
    expect(movementForeignKeys.some((foreignKey) => (
      foreignKey.from === 'criado_por_usuario_id' &&
      foreignKey.table === 'usuario'
    ))).toBe(true)
    sqlite.close()
  })

  it('adds tenant-scoped uniqueness to an existing movement table with no prior unique constraint', () => {
    const sqlite = new Database(':memory:')
    sqlite.pragma('foreign_keys = ON')
    sqlite.exec(`
      CREATE TABLE tenant (id TEXT PRIMARY KEY);
      CREATE TABLE produto (id TEXT PRIMARY KEY, nome TEXT NOT NULL);
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
      CREATE TABLE pedido (id TEXT PRIMARY KEY);
      CREATE TABLE item_pedido (id TEXT PRIMARY KEY);
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
        chave_idempotencia TEXT NOT NULL,
        motivo TEXT,
        observacao TEXT,
        criado_por_usuario_id TEXT,
        criado_em INTEGER NOT NULL
      );
      INSERT INTO tenant VALUES ('tenant-a'), ('tenant-b');
      INSERT INTO insumo (
        id, tenant_id, nome, unidade_base, unidade_compra
      ) VALUES
        ('ingredient-a', 'tenant-a', 'Ingredient A', 'g', 'kg'),
        ('ingredient-b', 'tenant-b', 'Ingredient B', 'g', 'kg');
      INSERT INTO movimento_estoque (
        id, tenant_id, insumo_id, tipo, quantidade,
        chave_idempotencia, criado_em
      ) VALUES (
        'movement-a', 'tenant-a', 'ingredient-a', 'entrada',
        '5.000', 'shared-key', 1
      );
    `)

    migrateSqliteDatabase(sqlite)
    migrateSqliteDatabase(sqlite)

    sqlite.prepare(`
      INSERT INTO movimento_estoque (
        id, tenant_id, insumo_id, tipo, quantidade,
        chave_idempotencia, criado_em
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      'movement-b',
      'tenant-b',
      'ingredient-b',
      'entrada',
      '3.000',
      'shared-key',
      2,
    )
    expect(() => sqlite.prepare(`
      INSERT INTO movimento_estoque (
        id, tenant_id, insumo_id, tipo, quantidade,
        chave_idempotencia, criado_em
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      'movement-a-duplicate',
      'tenant-a',
      'ingredient-a',
      'entrada',
      '1.000',
      'shared-key',
      3,
    )).toThrow(/UNIQUE constraint failed/)
    expect(sqlite.prepare(`
      SELECT id, tenant_id, chave_idempotencia
      FROM movimento_estoque
      ORDER BY id
    `).all()).toEqual([
      {
        id: 'movement-a',
        tenant_id: 'tenant-a',
        chave_idempotencia: 'shared-key',
      },
      {
        id: 'movement-b',
        tenant_id: 'tenant-b',
        chave_idempotencia: 'shared-key',
      },
    ])
    sqlite.close()
  })

  it('creates a missing user table, restores foreign keys, and keeps movement history', () => {
    const sqlite = new Database(':memory:')
    sqlite.pragma('foreign_keys = ON')
    sqlite.exec(`
      CREATE TABLE tenant (id TEXT PRIMARY KEY);
      CREATE TABLE produto (id TEXT PRIMARY KEY, nome TEXT NOT NULL);
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
      CREATE TABLE pedido (id TEXT PRIMARY KEY);
      CREATE TABLE item_pedido (id TEXT PRIMARY KEY);
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
      INSERT INTO tenant VALUES ('tenant-a');
      INSERT INTO insumo (
        id, tenant_id, nome, unidade_base, unidade_compra
      ) VALUES (
        'ingredient-a', 'tenant-a', 'Ingredient A', 'g', 'kg'
      );
      INSERT INTO movimento_estoque (
        id, tenant_id, insumo_id, tipo, quantidade, saldo_anterior,
        saldo_resultante, chave_idempotencia, criado_em
      ) VALUES (
        'movement-a', 'tenant-a', 'ingredient-a', 'entrada', '5.000',
        '0.000', '5.000', 'shared-key', 1
      );
    `)

    migrateSqliteDatabase(sqlite)

    expect(sqlite.pragma('foreign_keys', { simple: true })).toBe(1)
    expect(sqlite.prepare(`
      SELECT id, tenant_id, chave_idempotencia
      FROM movimento_estoque
    `).get()).toEqual({
      id: 'movement-a',
      tenant_id: 'tenant-a',
      chave_idempotencia: 'shared-key',
    })
    sqlite.prepare(`
      INSERT INTO movimento_estoque (
        id, tenant_id, insumo_id, tipo, quantidade, saldo_anterior,
        saldo_resultante, chave_idempotencia, criado_em
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'movement-b',
      'tenant-a',
      'ingredient-a',
      'saida',
      '-1.000',
      '5.000',
      '4.000',
      'new-key',
      2,
    )
    expect(sqlite.prepare(
      'SELECT COUNT(*) AS total FROM movimento_estoque',
    ).get()).toEqual({ total: 2 })
    const movementForeignKeys = sqlite
      .prepare('PRAGMA foreign_key_list(movimento_estoque)')
      .all() as Array<{ from: string; table: string }>
    expect(movementForeignKeys.some((foreignKey) => (
      foreignKey.from === 'criado_por_usuario_id' &&
      foreignKey.table === 'usuario'
    ))).toBe(true)
    sqlite.close()
  })

  it('rolls back a failed legacy-table rebuild without leaving a partial schema', () => {
    const sqlite = new Database(':memory:')
    sqlite.pragma('foreign_keys = ON')
    sqlite.exec(`
      CREATE TABLE produto (id TEXT PRIMARY KEY, nome TEXT NOT NULL);
      CREATE TABLE movimento_estoque (
        id TEXT PRIMARY KEY NOT NULL,
        tenant_id TEXT NOT NULL,
        insumo_id TEXT NOT NULL,
        tipo TEXT NOT NULL,
        quantidade TEXT NOT NULL,
        pedido_id TEXT,
        chave_idempotencia TEXT NOT NULL UNIQUE,
        observacao TEXT,
        criado_em INTEGER NOT NULL
      );
      CREATE TABLE movimento_estoque_legacy_idempotency (
        id TEXT PRIMARY KEY
      );
      INSERT INTO movimento_estoque (
        id, tenant_id, insumo_id, tipo, quantidade,
        chave_idempotencia, criado_em
      ) VALUES (
        'orphan-movement', 'missing-tenant', 'missing-ingredient',
        'entrada', '1.000', 'orphan-key', 1
      );
    `)

    expect(() => migrateSqliteDatabase(sqlite)).toThrow()

    expect(sqlite.inTransaction).toBe(false)
    expect(sqlite.pragma('foreign_keys', { simple: true })).toBe(1)
    expect(sqlite.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'movimento_estoque'",
    ).get()).toEqual({ name: 'movimento_estoque' })
    expect(sqlite.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'movimento_estoque_legacy_idempotency'",
    ).get()).toEqual({ name: 'movimento_estoque_legacy_idempotency' })
    expect(sqlite.prepare(
      'SELECT id, chave_idempotencia FROM movimento_estoque',
    ).get()).toEqual({
      id: 'orphan-movement',
      chave_idempotencia: 'orphan-key',
    })
    expect(sqlite.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'app_schema_migration'",
    ).get()).toBeUndefined()
    expect(
      sqlite
        .prepare('PRAGMA table_info(movimento_estoque)')
        .all()
        .map((column) => (column as { name: string }).name),
    ).not.toContain('saldo_anterior')
    sqlite.close()
  })

  it('ships an additive PostgreSQL migration for tenant-scoped stock idempotency', () => {
    const migrationPath = join(
      process.cwd(),
      'db/migrations/202607231800_scope_stock_idempotency_by_tenant.sql',
    )

    expect(existsSync(migrationPath)).toBe(true)
    const migration = readFileSync(migrationPath, 'utf8')
    const createCompositeIndexAt = migration.indexOf(
      'CREATE UNIQUE INDEX IF NOT EXISTS movimento_estoque_tenant_chave_idempotencia_unique',
    )
    const dropGlobalConstraintAt = migration.indexOf(
      'DROP CONSTRAINT IF EXISTS movimento_estoque_chave_idempotencia_key',
    )
    expect(createCompositeIndexAt).toBeGreaterThanOrEqual(0)
    expect(dropGlobalConstraintAt).toBeGreaterThan(createCompositeIndexAt)
    expect(migration).toContain(
      'DROP CONSTRAINT IF EXISTS movimento_estoque_chave_idempotencia_key',
    )
    expect(migration).toMatch(
      /CREATE UNIQUE INDEX[\s\S]+ON movimento_estoque\s*\(tenant_id,\s*chave_idempotencia\)/i,
    )
    expect(migration).not.toMatch(/\bUPDATE\b|\bDELETE\b/i)
  })

  it('creates the immutable order-consumption snapshot on blank, existing, and repeated SQLite migrations', () => {
    const blank = new Database(':memory:')
    migrateSqliteDatabase(blank)
    migrateSqliteDatabase(blank)

    expect(blank.prepare(`
      SELECT name
      FROM sqlite_master
      WHERE type = 'table' AND name = 'item_pedido_insumo'
    `).get()).toEqual({ name: 'item_pedido_insumo' })
    expect(
      blank
        .prepare('PRAGMA table_info(item_pedido_insumo)')
        .all()
        .map((column) => (column as { name: string }).name),
    ).toEqual(expect.arrayContaining([
      'id',
      'tenant_id',
      'pedido_id',
      'item_pedido_id',
      'insumo_id',
      'quantidade_total',
    ]))
    blank.close()

    const existing = new Database(':memory:')
    existing.exec(`
      CREATE TABLE tenant (id TEXT PRIMARY KEY);
      CREATE TABLE mesa (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        numero INTEGER NOT NULL
      );
      CREATE TABLE categoria (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        nome TEXT NOT NULL
      );
      CREATE TABLE produto (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        categoria_id TEXT NOT NULL,
        nome TEXT NOT NULL,
        preco TEXT NOT NULL
      );
      CREATE TABLE pedido (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        mesa_id TEXT NOT NULL,
        criado_em INTEGER NOT NULL,
        atualizado_em INTEGER NOT NULL
      );
      CREATE TABLE item_pedido (
        id TEXT PRIMARY KEY,
        pedido_id TEXT NOT NULL,
        produto_id TEXT NOT NULL,
        quantidade INTEGER NOT NULL,
        preco_unitario TEXT NOT NULL
      );
      CREATE TABLE insumo (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        nome TEXT NOT NULL DEFAULT '',
        unidade_base TEXT NOT NULL DEFAULT 'g',
        unidade_compra TEXT NOT NULL DEFAULT 'kg',
        fator_compra_para_base TEXT NOT NULL DEFAULT '1',
        estoque_atual TEXT NOT NULL DEFAULT '0',
        estoque_ideal TEXT NOT NULL DEFAULT '0',
        estoque_minimo TEXT NOT NULL DEFAULT '0',
        custo_unitario TEXT,
        ativo INTEGER NOT NULL DEFAULT 1
      );
      INSERT INTO tenant VALUES ('tenant-1');
      INSERT INTO mesa VALUES ('mesa-1', 'tenant-1', 1);
      INSERT INTO categoria VALUES ('categoria-1', 'tenant-1', 'Pizza');
      INSERT INTO produto VALUES (
        'produto-1', 'tenant-1', 'categoria-1', 'Pizza', '10.00'
      );
      INSERT INTO pedido VALUES (
        'pedido-1', 'tenant-1', 'mesa-1', 1, 1
      );
      INSERT INTO item_pedido VALUES (
        'item-1', 'pedido-1', 'produto-1', 1, '10.00'
      );
      INSERT INTO insumo (id, tenant_id) VALUES ('insumo-1', 'tenant-1');
    `)

    migrateSqliteDatabase(existing)
    existing.prepare(`
      INSERT INTO item_pedido_insumo (
        id,
        tenant_id,
        pedido_id,
        item_pedido_id,
        insumo_id,
        quantidade_total
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      'snapshot-1',
      'tenant-1',
      'pedido-1',
      'item-1',
      'insumo-1',
      '2.500',
    )

    migrateSqliteDatabase(existing)

    expect(existing.prepare(`
      SELECT id, tenant_id, pedido_id, item_pedido_id, insumo_id, quantidade_total
      FROM item_pedido_insumo
    `).get()).toEqual({
      id: 'snapshot-1',
      tenant_id: 'tenant-1',
      pedido_id: 'pedido-1',
      item_pedido_id: 'item-1',
      insumo_id: 'insumo-1',
      quantidade_total: '2.500',
    })
    existing.close()
  })

  it('ships one additive PostgreSQL migration after 202607231800 for order snapshots', () => {
    const migrationPath = join(
      process.cwd(),
      'db/migrations/202607232000_add_order_consumption_snapshot.sql',
    )

    expect(existsSync(migrationPath)).toBe(true)
    const migration = readFileSync(migrationPath, 'utf8')
    expect(migration).toMatch(/CREATE TABLE IF NOT EXISTS item_pedido_insumo/i)
    expect(migration).toMatch(/quantidade_total\s+NUMERIC\(12,\s*3\)\s+NOT NULL/i)
    expect(migration).toMatch(
      /UNIQUE\s*\(\s*tenant_id,\s*item_pedido_id,\s*insumo_id\s*\)/i,
    )
    expect(migration).not.toMatch(/\bUPDATE\s+\w|\bDELETE\s+FROM\b|\bDROP\b/i)
  })
})
