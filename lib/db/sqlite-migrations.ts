import { createHash } from 'node:crypto'

type SqliteStatement = {
  all(...params: unknown[]): unknown[]
  get(...params: unknown[]): unknown
  run(...params: unknown[]): unknown
}

type SqliteConnection = {
  exec(sql: string): void
  prepare(sql: string): SqliteStatement
}

type SqliteColumn = { name: string }
type ForeignKeyViolation = {
  table: string
  rowid: number
  parent: string
  fkid: number
}

const BASELINE_MIGRATION = '202607232100_baseline_and_tenant_constraints'
const PAYMENT_MIGRATION = '202607232200_add_registered_payment_uniqueness'
const COHERENCE_MIGRATION = '202607232300_enforce_order_item_coherence'
const TRACKING_TABLE = 'app_schema_migration'
const PAYMENT_INDEX_SQL = `
  CREATE UNIQUE INDEX IF NOT EXISTS
    pagamento_pedido_tenant_pedido_registrado_unique
    ON pagamento_pedido(tenant_id, pedido_id)
    WHERE status = 'registrado';
`
const APPLICATION_TABLES = [
  'tenant',
  'usuario',
  'mesa',
  'categoria',
  'produto',
  'insumo',
  'pedido',
  'item_pedido',
  'ficha_tecnica_item',
  'item_pedido_insumo',
  'tenant_user',
  'usuario_acesso',
  'auth_session',
  'pagamento_pedido',
  'movimento_estoque',
] as const

type ItemTenantDerivation = {
  requiredColumns: Array<{
    table: 'item_pedido' | 'pedido'
    columns: string[]
  }>
  sourceTable: 'item_pedido'
  sourceColumn: 'tenant_id'
  missingRequirementsExpression: string
  sourceColumnPresentExpression: string
  sourceColumnAbsentExpression: string
}

type CopyTransform = {
  table: (typeof APPLICATION_TABLES)[number]
  target: string
  fallback?: string
  derived?: ItemTenantDerivation
}

type SqliteMigrationManifestEntry = {
  schema?: string
  indexes?: string
  rebuild?: {
    temporaryTablePrefix: string
    tableOrder: string[]
    copyRequirements: Array<{ table: string; columns: string[] }>
    copyTransforms: CopyTransform[]
  }
  postconditions: unknown
}

type SqliteMigrationManifest = {
  version: number
  migrations: Record<string, SqliteMigrationManifestEntry>
}

const BASELINE_COPY_REQUIREMENTS = [
  ['mesa', ['tenant_id', 'numero']],
  ['categoria', ['tenant_id', 'nome']],
  ['produto', ['tenant_id', 'categoria_id', 'nome', 'preco']],
  ['insumo', ['tenant_id', 'nome', 'unidade_base', 'unidade_compra']],
  ['pedido', ['tenant_id', 'mesa_id', 'criado_em', 'atualizado_em']],
  ['item_pedido', ['pedido_id', 'produto_id', 'quantidade', 'preco_unitario']],
] as const

const ITEM_TENANT_DERIVATION: ItemTenantDerivation = {
  requiredColumns: [
    { table: 'item_pedido', columns: ['pedido_id'] },
    { table: 'pedido', columns: ['id', 'tenant_id'] },
  ],
  sourceTable: 'item_pedido',
  sourceColumn: 'tenant_id',
  missingRequirementsExpression: 'NULL',
  sourceColumnPresentExpression: `COALESCE(
    src.tenant_id,
    (SELECT parent.tenant_id FROM pedido AS parent WHERE parent.id = src.pedido_id)
  )`,
  sourceColumnAbsentExpression:
    '(SELECT parent.tenant_id FROM pedido AS parent WHERE parent.id = src.pedido_id)',
}

const BASELINE_COPY_TRANSFORMS: CopyTransform[] = [
  ...['id', 'nome', 'slug', 'status', 'created_at', 'updated_at'].map((target) => ({ table: 'tenant' as const, target, fallback: ({ id: 'NULL', nome: 'src.id', slug: 'src.id', status: "'active'", created_at: '0', updated_at: '0' } as Record<string, string>)[target] })),
  ...['id', 'nome', 'email', 'role', 'password_hash', 'created_at', 'updated_at'].map((target) => ({ table: 'usuario' as const, target, fallback: ({ id: 'NULL', nome: 'src.id', email: "src.id || '@invalid.local'", role: "'garcom'", password_hash: 'NULL', created_at: '0', updated_at: '0' } as Record<string, string>)[target] })),
  ...['id', 'tenant_id', 'numero', 'ativa'].map((target) => ({ table: 'mesa' as const, target, fallback: ({ id: 'NULL', tenant_id: 'NULL', numero: 'NULL', ativa: '1' } as Record<string, string>)[target] })),
  ...['id', 'tenant_id', 'nome', 'ordem'].map((target) => ({ table: 'categoria' as const, target, fallback: ({ id: 'NULL', tenant_id: 'NULL', nome: 'src.id', ordem: '0' } as Record<string, string>)[target] })),
  ...['id', 'tenant_id', 'categoria_id', 'nome', 'descricao', 'preco', 'disponivel', 'imagem_url', 'controle_estoque'].map((target) => ({ table: 'produto' as const, target, fallback: ({ id: 'NULL', tenant_id: 'NULL', categoria_id: 'NULL', nome: 'src.id', descricao: 'NULL', preco: "'0'", disponivel: '1', imagem_url: 'NULL', controle_estoque: '0' } as Record<string, string>)[target] })),
  ...['id', 'tenant_id', 'nome', 'unidade_base', 'unidade_compra', 'fator_compra_para_base', 'estoque_atual', 'estoque_ideal', 'estoque_minimo', 'custo_unitario', 'ativo'].map((target) => ({ table: 'insumo' as const, target, fallback: ({ id: 'NULL', tenant_id: 'NULL', nome: 'src.id', unidade_base: "'g'", unidade_compra: "'kg'", fator_compra_para_base: "'1'", estoque_atual: "'0'", estoque_ideal: "'0'", estoque_minimo: "'0'", custo_unitario: 'NULL', ativo: '1' } as Record<string, string>)[target] })),
  ...['id', 'tenant_id', 'mesa_id', 'created_by_user_id', 'status', 'criado_em', 'entregue_em', 'atualizado_em'].map((target) => ({ table: 'pedido' as const, target, fallback: ({ id: 'NULL', tenant_id: 'NULL', mesa_id: 'NULL', created_by_user_id: 'NULL', status: "'novo'", criado_em: '0', entregue_em: 'NULL', atualizado_em: '0' } as Record<string, string>)[target] })),
  ...['id', 'pedido_id', 'produto_id', 'quantidade', 'preco_unitario', 'observacao'].map((target) => ({ table: 'item_pedido' as const, target, fallback: ({ id: 'NULL', pedido_id: 'NULL', produto_id: 'NULL', quantidade: '1', preco_unitario: "'0'", observacao: 'NULL' } as Record<string, string>)[target] })),
  { table: 'item_pedido', target: 'tenant_id', derived: ITEM_TENANT_DERIVATION },
  ...['id', 'tenant_id', 'produto_id', 'insumo_id', 'quantidade'].map((target) => ({ table: 'ficha_tecnica_item' as const, target, fallback: ({ id: 'NULL', tenant_id: 'NULL', produto_id: 'NULL', insumo_id: 'NULL', quantidade: "'0'" } as Record<string, string>)[target] })),
  ...['id', 'tenant_id', 'pedido_id', 'item_pedido_id', 'insumo_id', 'quantidade_total'].map((target) => ({ table: 'item_pedido_insumo' as const, target, fallback: ({ id: 'NULL', tenant_id: 'NULL', pedido_id: 'NULL', item_pedido_id: 'NULL', insumo_id: 'NULL', quantidade_total: "'0'" } as Record<string, string>)[target] })),
  ...['id', 'tenant_id', 'usuario_id', 'status', 'created_at', 'updated_at'].map((target) => ({ table: 'tenant_user' as const, target, fallback: ({ id: 'NULL', tenant_id: 'NULL', usuario_id: 'NULL', status: "'active'", created_at: '0', updated_at: '0' } as Record<string, string>)[target] })),
  ...['id', 'tenant_user_id', 'usuario_id', 'acesso'].map((target) => ({ table: 'usuario_acesso' as const, target, fallback: ({ id: 'NULL', tenant_user_id: 'NULL', usuario_id: 'NULL', acesso: "'garcom'" } as Record<string, string>)[target] })),
  ...['id', 'usuario_id', 'selected_tenant_id', 'token_hash', 'expires_at', 'created_at'].map((target) => ({ table: 'auth_session' as const, target, fallback: ({ id: 'NULL', usuario_id: 'NULL', selected_tenant_id: 'NULL', token_hash: 'src.id', expires_at: '0', created_at: '0' } as Record<string, string>)[target] })),
  ...['id', 'tenant_id', 'pedido_id', 'registrado_por_usuario_id', 'forma_pagamento', 'valor', 'status', 'observacao', 'registrado_em'].map((target) => ({ table: 'pagamento_pedido' as const, target, fallback: ({ id: 'NULL', tenant_id: 'NULL', pedido_id: 'NULL', registrado_por_usuario_id: 'NULL', forma_pagamento: "'outro'", valor: "'0'", status: "'registrado'", observacao: 'NULL', registrado_em: '0' } as Record<string, string>)[target] })),
  ...['id', 'tenant_id', 'insumo_id', 'tipo', 'quantidade', 'saldo_anterior', 'saldo_resultante', 'custo_unitario', 'custo_total', 'pedido_id', 'item_pedido_id', 'chave_idempotencia', 'motivo', 'observacao', 'criado_por_usuario_id', 'criado_em'].map((target) => ({ table: 'movimento_estoque' as const, target, fallback: ({ id: 'NULL', tenant_id: 'NULL', insumo_id: 'NULL', tipo: "'ajuste'", quantidade: "'0'", saldo_anterior: "'0'", saldo_resultante: "'0'", custo_unitario: 'NULL', custo_total: 'NULL', pedido_id: 'NULL', item_pedido_id: 'NULL', chave_idempotencia: "'legacy:' || src.id", motivo: 'NULL', observacao: 'NULL', criado_por_usuario_id: 'NULL', criado_em: '0' } as Record<string, string>)[target] })),
]

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`
}

function hasTable(sqlite: SqliteConnection, table: string): boolean {
  return (
    sqlite
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
      )
      .all(table).length > 0
  )
}

function tableColumns(
  sqlite: SqliteConnection,
  table: string,
): Set<string> {
  if (!hasTable(sqlite, table)) return new Set()
  return new Set(
    (
      sqlite
        .prepare(`PRAGMA table_info(${quoteIdentifier(table)})`)
        .all() as SqliteColumn[]
    ).map((column) => column.name),
  )
}

function hasColumns(
  sqlite: SqliteConnection,
  table: string,
  columns: string[],
): boolean {
  const available = tableColumns(sqlite, table)
  return columns.every((column) => available.has(column))
}

function hasRows(sqlite: SqliteConnection, table: string): boolean {
  if (!hasTable(sqlite, table)) return false
  const row = sqlite
    .prepare(`SELECT 1 AS present FROM ${quoteIdentifier(table)} LIMIT 1`)
    .get() as { present: number } | undefined
  return row?.present === 1
}

function migrationApplied(
  sqlite: SqliteConnection,
  migration: string,
  assertPostconditions: (sqlite: SqliteConnection) => void,
): boolean {
  if (!hasTable(sqlite, TRACKING_TABLE)) return false
  const tracked = sqlite
    .prepare(
      `SELECT id, checksum FROM ${quoteIdentifier(TRACKING_TABLE)} WHERE id = ?`,
    )
    .get(migration) as { id: string; checksum: string | null } | undefined
  if (!tracked) return false

  const expected = migrationChecksum(migration)
  if (tracked.checksum === null) {
    assertPostconditions(sqlite)
    sqlite
      .prepare(
        `UPDATE ${quoteIdentifier(TRACKING_TABLE)}
            SET checksum = ?
          WHERE id = ? AND checksum IS NULL`,
      )
      .run(expected, migration)
    return true
  }
  if (tracked.checksum !== expected) {
    throw new Error(
      `SQLite migration checksum mismatch for ${migration}; migrations are immutable.`,
    )
  }
  return true
}

export function sqliteMigrationManifest(): SqliteMigrationManifest {
  const rebuild = {
    temporaryTablePrefix: '__baseline_',
    tableOrder: [...APPLICATION_TABLES],
    copyRequirements: BASELINE_COPY_REQUIREMENTS.map(([table, columns]) => ({
      table,
      columns: [...columns],
    })),
    copyTransforms: BASELINE_COPY_TRANSFORMS.map((transform) => ({
      ...transform,
      derived: transform.derived && {
        ...transform.derived,
        requiredColumns: transform.derived.requiredColumns.map((requirement) => ({
          ...requirement,
          columns: [...requirement.columns],
        })),
      },
    })),
  }
  return {
    version: 1,
    migrations: {
      [BASELINE_MIGRATION]: {
        schema: schemaSql(),
        indexes: indexesSql(),
        rebuild,
        postconditions: { tables: APPLICATION_TABLES },
      },
      [PAYMENT_MIGRATION]: {
        indexes: PAYMENT_INDEX_SQL,
        postconditions: {
          uniquePartialIndex: {
            table: 'pagamento_pedido',
            columns: ['tenant_id', 'pedido_id'],
            predicate: "status = 'registrado'",
          },
        },
      },
      [COHERENCE_MIGRATION]: {
        schema: schemaSql(),
        indexes: indexesSql(),
        rebuild,
        postconditions: {
          itemOrderAggregateUnique: ['item_pedido', 'tenant_id', 'pedido_id', 'id'],
          aggregateForeignKeys: [
            {
              table: 'item_pedido_insumo',
              columns: ['tenant_id', 'pedido_id', 'item_pedido_id'],
              parent: 'item_pedido',
              parentColumns: ['tenant_id', 'pedido_id', 'id'],
              onDelete: 'CASCADE',
            },
            {
              table: 'movimento_estoque',
              columns: ['tenant_id', 'pedido_id', 'item_pedido_id'],
              parent: 'item_pedido',
              parentColumns: ['tenant_id', 'pedido_id', 'id'],
              onDelete: 'NO ACTION',
            },
          ],
          legacyItemOnlyForeignKeysAbsent: true,
        },
      },
    },
  }
}

export function sqliteMigrationChecksumForManifest(
  migration: string,
  manifest: SqliteMigrationManifest,
): string {
  const entry = manifest.migrations[migration]
  if (!entry) throw new Error(`Unknown SQLite migration: ${migration}`)
  return createHash('sha256')
    .update(
      `restaurante-comandas:sqlite:${migration}\n${JSON.stringify({
        version: manifest.version,
        migration: entry,
      })}`,
    )
    .digest('hex')
}

function migrationChecksum(migration: string): string {
  return sqliteMigrationChecksumForManifest(migration, sqliteMigrationManifest())
}

function foreignKeysEnabled(sqlite: SqliteConnection): boolean {
  const row = sqlite.prepare('PRAGMA foreign_keys').get() as
    | { foreign_keys: number }
    | undefined
  return row?.foreign_keys === 1
}

function validateForeignKeys(sqlite: SqliteConnection): void {
  const violations = sqlite
    .prepare('PRAGMA foreign_key_check')
    .all() as ForeignKeyViolation[]
  if (violations.length === 0) return

  const first = violations[0]
  throw new Error(
    `SQLite foreign_key_check failed: ${violations.length} violation(s); ` +
      `first=${first?.table}[rowid=${first?.rowid}] -> ${first?.parent}`,
  )
}

function assertNoCrossTenantRows(
  sqlite: SqliteConnection,
  relation: string,
  requirements: Array<[string, string[]]>,
  query: string,
): void {
  if (
    !requirements.every(([table, columns]) =>
      hasColumns(sqlite, table, columns),
    )
  ) {
    return
  }

  const row = sqlite.prepare(query).get()
  if (row !== undefined) {
    throw new Error(`Cross-tenant data detected: ${relation}`)
  }
}

function validateExistingTenantData(sqlite: SqliteConnection): void {
  assertNoCrossTenantRows(
    sqlite,
    'produto.categoria_id -> categoria.id',
    [
      ['produto', ['tenant_id', 'categoria_id']],
      ['categoria', ['id', 'tenant_id']],
    ],
    `SELECT 1
       FROM produto AS child
       JOIN categoria AS parent ON parent.id = child.categoria_id
      WHERE child.tenant_id <> parent.tenant_id
      LIMIT 1`,
  )
  assertNoCrossTenantRows(
    sqlite,
    'pedido.mesa_id -> mesa.id',
    [
      ['pedido', ['tenant_id', 'mesa_id']],
      ['mesa', ['id', 'tenant_id']],
    ],
    `SELECT 1
       FROM pedido AS child
       JOIN mesa AS parent ON parent.id = child.mesa_id
      WHERE child.tenant_id <> parent.tenant_id
      LIMIT 1`,
  )

  const itemHasTenant = hasColumns(sqlite, 'item_pedido', ['tenant_id'])
  assertNoCrossTenantRows(
    sqlite,
    'item_pedido.pedido_id/produto_id -> pedido/produto',
    [
      ['item_pedido', ['pedido_id', 'produto_id']],
      ['pedido', ['id', 'tenant_id']],
      ['produto', ['id', 'tenant_id']],
    ],
    itemHasTenant
      ? `SELECT 1
           FROM item_pedido AS child
           JOIN pedido AS order_parent ON order_parent.id = child.pedido_id
           JOIN produto AS product_parent ON product_parent.id = child.produto_id
          WHERE child.tenant_id <> order_parent.tenant_id
             OR child.tenant_id <> product_parent.tenant_id
          LIMIT 1`
      : `SELECT 1
           FROM item_pedido AS child
           JOIN pedido AS order_parent ON order_parent.id = child.pedido_id
           JOIN produto AS product_parent ON product_parent.id = child.produto_id
          WHERE order_parent.tenant_id <> product_parent.tenant_id
          LIMIT 1`,
  )
  assertNoCrossTenantRows(
    sqlite,
    'ficha_tecnica_item -> produto/insumo',
    [
      ['ficha_tecnica_item', ['tenant_id', 'produto_id', 'insumo_id']],
      ['produto', ['id', 'tenant_id']],
      ['insumo', ['id', 'tenant_id']],
    ],
    `SELECT 1
       FROM ficha_tecnica_item AS child
       JOIN produto AS product_parent ON product_parent.id = child.produto_id
       JOIN insumo AS ingredient_parent ON ingredient_parent.id = child.insumo_id
      WHERE child.tenant_id <> product_parent.tenant_id
         OR child.tenant_id <> ingredient_parent.tenant_id
      LIMIT 1`,
  )
  assertNoCrossTenantRows(
    sqlite,
    'item_pedido_insumo -> pedido/item_pedido/insumo',
    [
      [
        'item_pedido_insumo',
        ['tenant_id', 'pedido_id', 'item_pedido_id', 'insumo_id'],
      ],
      ['pedido', ['id', 'tenant_id']],
      ['item_pedido', ['id', 'pedido_id']],
      ['insumo', ['id', 'tenant_id']],
    ],
    `SELECT 1
       FROM item_pedido_insumo AS child
       JOIN pedido AS order_parent ON order_parent.id = child.pedido_id
       JOIN item_pedido AS item_parent ON item_parent.id = child.item_pedido_id
       JOIN insumo AS ingredient_parent ON ingredient_parent.id = child.insumo_id
      WHERE child.tenant_id <> order_parent.tenant_id
         OR child.tenant_id <> item_parent.tenant_id
         OR child.tenant_id <> ingredient_parent.tenant_id
         OR child.pedido_id <> item_parent.pedido_id
      LIMIT 1`,
  )
  assertNoCrossTenantRows(
    sqlite,
    'movimento_estoque -> insumo/pedido/item_pedido',
    [
      [
        'movimento_estoque',
        ['tenant_id', 'insumo_id', 'pedido_id', 'item_pedido_id'],
      ],
      ['insumo', ['id', 'tenant_id']],
      ['pedido', ['id', 'tenant_id']],
      ['item_pedido', ['id', 'pedido_id']],
    ],
    `SELECT 1
       FROM movimento_estoque AS child
       JOIN insumo AS ingredient_parent ON ingredient_parent.id = child.insumo_id
       LEFT JOIN pedido AS order_parent ON order_parent.id = child.pedido_id
       LEFT JOIN item_pedido AS item_parent ON item_parent.id = child.item_pedido_id
      WHERE child.tenant_id <> ingredient_parent.tenant_id
         OR (child.pedido_id IS NOT NULL AND child.tenant_id <> order_parent.tenant_id)
         OR (child.item_pedido_id IS NOT NULL AND child.tenant_id <> item_parent.tenant_id)
         OR (child.item_pedido_id IS NOT NULL AND child.pedido_id IS NULL)
         OR (child.item_pedido_id IS NOT NULL AND child.pedido_id <> item_parent.pedido_id)
      LIMIT 1`,
  )
  assertNoCrossTenantRows(
    sqlite,
    'pagamento_pedido.pedido_id -> pedido.id',
    [
      ['pagamento_pedido', ['tenant_id', 'pedido_id']],
      ['pedido', ['id', 'tenant_id']],
    ],
    `SELECT 1
       FROM pagamento_pedido AS child
       JOIN pedido AS parent ON parent.id = child.pedido_id
      WHERE child.tenant_id <> parent.tenant_id
      LIMIT 1`,
  )
}

function schemaSql(prefix = ''): string {
  const table = (name: string) => quoteIdentifier(`${prefix}${name}`)
  return `
    CREATE TABLE ${table('tenant')} (
      id TEXT PRIMARY KEY NOT NULL,
      nome TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'active',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE ${table('usuario')} (
      id TEXT PRIMARY KEY NOT NULL,
      nome TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL DEFAULT 'garcom',
      password_hash TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE ${table('mesa')} (
      id TEXT PRIMARY KEY NOT NULL,
      tenant_id TEXT NOT NULL REFERENCES tenant(id),
      numero INTEGER NOT NULL,
      ativa INTEGER NOT NULL DEFAULT 1,
      UNIQUE (tenant_id, id),
      UNIQUE (tenant_id, numero)
    );

    CREATE TABLE ${table('categoria')} (
      id TEXT PRIMARY KEY NOT NULL,
      tenant_id TEXT NOT NULL REFERENCES tenant(id),
      nome TEXT NOT NULL,
      ordem INTEGER NOT NULL DEFAULT 0,
      UNIQUE (tenant_id, id)
    );

    CREATE TABLE ${table('produto')} (
      id TEXT PRIMARY KEY NOT NULL,
      tenant_id TEXT NOT NULL REFERENCES tenant(id),
      categoria_id TEXT NOT NULL,
      nome TEXT NOT NULL,
      descricao TEXT,
      preco TEXT NOT NULL,
      disponivel INTEGER NOT NULL DEFAULT 1,
      imagem_url TEXT,
      controle_estoque INTEGER NOT NULL DEFAULT 0,
      UNIQUE (tenant_id, id),
      FOREIGN KEY (tenant_id, categoria_id)
        REFERENCES categoria(tenant_id, id)
    );

    CREATE TABLE ${table('insumo')} (
      id TEXT PRIMARY KEY NOT NULL,
      tenant_id TEXT NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
      nome TEXT NOT NULL,
      unidade_base TEXT NOT NULL,
      unidade_compra TEXT NOT NULL,
      fator_compra_para_base TEXT NOT NULL DEFAULT '1',
      estoque_atual TEXT NOT NULL DEFAULT '0',
      estoque_ideal TEXT NOT NULL DEFAULT '0',
      estoque_minimo TEXT NOT NULL DEFAULT '0',
      custo_unitario TEXT,
      ativo INTEGER NOT NULL DEFAULT 1,
      UNIQUE (tenant_id, id)
    );

    CREATE TABLE ${table('pedido')} (
      id TEXT PRIMARY KEY NOT NULL,
      tenant_id TEXT NOT NULL REFERENCES tenant(id),
      mesa_id TEXT NOT NULL,
      created_by_user_id TEXT REFERENCES usuario(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'novo',
      criado_em INTEGER NOT NULL,
      entregue_em INTEGER,
      atualizado_em INTEGER NOT NULL,
      UNIQUE (tenant_id, id),
      FOREIGN KEY (tenant_id, mesa_id)
        REFERENCES mesa(tenant_id, id)
    );

    CREATE TABLE ${table('item_pedido')} (
      id TEXT PRIMARY KEY NOT NULL,
      tenant_id TEXT REFERENCES tenant(id) ON DELETE CASCADE,
      pedido_id TEXT NOT NULL,
      produto_id TEXT NOT NULL,
      quantidade INTEGER NOT NULL CHECK (quantidade > 0),
      preco_unitario TEXT NOT NULL,
      observacao TEXT,
      UNIQUE (tenant_id, id),
      UNIQUE (tenant_id, pedido_id, id),
      FOREIGN KEY (tenant_id, pedido_id)
        REFERENCES pedido(tenant_id, id) ON DELETE CASCADE,
      FOREIGN KEY (tenant_id, produto_id)
        REFERENCES produto(tenant_id, id)
    );

    CREATE TABLE ${table('ficha_tecnica_item')} (
      id TEXT PRIMARY KEY NOT NULL,
      tenant_id TEXT NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
      produto_id TEXT NOT NULL,
      insumo_id TEXT NOT NULL,
      quantidade TEXT NOT NULL,
      UNIQUE (tenant_id, produto_id, insumo_id),
      FOREIGN KEY (tenant_id, produto_id)
        REFERENCES produto(tenant_id, id) ON DELETE CASCADE,
      FOREIGN KEY (tenant_id, insumo_id)
        REFERENCES insumo(tenant_id, id)
    );

    CREATE TABLE ${table('item_pedido_insumo')} (
      id TEXT PRIMARY KEY NOT NULL,
      tenant_id TEXT NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
      pedido_id TEXT NOT NULL,
      item_pedido_id TEXT NOT NULL,
      insumo_id TEXT NOT NULL,
      quantidade_total TEXT NOT NULL,
      UNIQUE (tenant_id, item_pedido_id, insumo_id),
      FOREIGN KEY (tenant_id, pedido_id)
        REFERENCES pedido(tenant_id, id) ON DELETE CASCADE,
      FOREIGN KEY (tenant_id, pedido_id, item_pedido_id)
        REFERENCES item_pedido(tenant_id, pedido_id, id) ON DELETE CASCADE,
      FOREIGN KEY (tenant_id, insumo_id)
        REFERENCES insumo(tenant_id, id)
    );

    CREATE TABLE ${table('tenant_user')} (
      id TEXT PRIMARY KEY NOT NULL,
      tenant_id TEXT NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
      usuario_id TEXT NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'active',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE ${table('usuario_acesso')} (
      id TEXT PRIMARY KEY NOT NULL,
      tenant_user_id TEXT REFERENCES tenant_user(id) ON DELETE CASCADE,
      usuario_id TEXT NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
      acesso TEXT NOT NULL
    );

    CREATE TABLE ${table('auth_session')} (
      id TEXT PRIMARY KEY NOT NULL,
      usuario_id TEXT NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
      selected_tenant_id TEXT REFERENCES tenant(id) ON DELETE SET NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE ${table('pagamento_pedido')} (
      id TEXT PRIMARY KEY NOT NULL,
      tenant_id TEXT NOT NULL REFERENCES tenant(id),
      pedido_id TEXT NOT NULL,
      registrado_por_usuario_id TEXT NOT NULL REFERENCES usuario(id),
      forma_pagamento TEXT NOT NULL,
      valor TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'registrado',
      observacao TEXT,
      registrado_em INTEGER NOT NULL,
      FOREIGN KEY (tenant_id, pedido_id)
        REFERENCES pedido(tenant_id, id) ON DELETE CASCADE
    );

    CREATE TABLE ${table('movimento_estoque')} (
      id TEXT PRIMARY KEY NOT NULL,
      tenant_id TEXT NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
      insumo_id TEXT NOT NULL,
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
      criado_por_usuario_id TEXT REFERENCES usuario(id) ON DELETE SET NULL,
      criado_em INTEGER NOT NULL,
      CHECK (item_pedido_id IS NULL OR pedido_id IS NOT NULL),
      FOREIGN KEY (tenant_id, insumo_id)
        REFERENCES insumo(tenant_id, id),
      FOREIGN KEY (tenant_id, pedido_id)
        REFERENCES pedido(tenant_id, id),
      FOREIGN KEY (tenant_id, pedido_id, item_pedido_id)
        REFERENCES item_pedido(tenant_id, pedido_id, id)
    );
  `
}

function indexesSql(): string {
  return `
    CREATE INDEX IF NOT EXISTS idx_mesa_tenant_id ON mesa(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_categoria_tenant_id ON categoria(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_produto_cat ON produto(categoria_id);
    CREATE INDEX IF NOT EXISTS idx_produto_tenant_id ON produto(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_insumo_tenant_id ON insumo(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_ficha_tecnica_produto_id
      ON ficha_tecnica_item(produto_id);
    CREATE INDEX IF NOT EXISTS idx_ficha_tecnica_insumo_id
      ON ficha_tecnica_item(insumo_id);
    CREATE INDEX IF NOT EXISTS idx_pedido_mesa_id ON pedido(mesa_id);
    CREATE INDEX IF NOT EXISTS idx_pedido_tenant_id ON pedido(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_pedido_status ON pedido(status);
    CREATE INDEX IF NOT EXISTS idx_pedido_created_by_user_id
      ON pedido(created_by_user_id);
    CREATE INDEX IF NOT EXISTS idx_item_pedido_id ON item_pedido(pedido_id);
    CREATE INDEX IF NOT EXISTS idx_item_pedido_tenant_id
      ON item_pedido(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_item_pedido_insumo_tenant_pedido
      ON item_pedido_insumo(tenant_id, pedido_id);
    CREATE INDEX IF NOT EXISTS idx_item_pedido_insumo_insumo_id
      ON item_pedido_insumo(insumo_id);
    CREATE INDEX IF NOT EXISTS idx_tenant_user_tenant_id
      ON tenant_user(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_tenant_user_usuario_id
      ON tenant_user(usuario_id);
    CREATE INDEX IF NOT EXISTS idx_usuario_acesso_tenant_user_id
      ON usuario_acesso(tenant_user_id);
    CREATE INDEX IF NOT EXISTS idx_usuario_acesso_usuario_id
      ON usuario_acesso(usuario_id);
    CREATE INDEX IF NOT EXISTS idx_auth_session_usuario_id
      ON auth_session(usuario_id);
    CREATE INDEX IF NOT EXISTS idx_pagamento_pedido_tenant_id
      ON pagamento_pedido(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_pagamento_pedido_pedido_id
      ON pagamento_pedido(pedido_id);
    CREATE UNIQUE INDEX IF NOT EXISTS
      pagamento_pedido_tenant_pedido_registrado_unique
      ON pagamento_pedido(tenant_id, pedido_id)
      WHERE status = 'registrado';
    CREATE INDEX IF NOT EXISTS idx_movimento_estoque_tenant_id
      ON movimento_estoque(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_movimento_estoque_insumo_id
      ON movimento_estoque(insumo_id);
    CREATE UNIQUE INDEX IF NOT EXISTS
      movimento_estoque_tenant_chave_idempotencia_unique
      ON movimento_estoque(tenant_id, chave_idempotencia);
    CREATE INDEX IF NOT EXISTS idx_movimento_estoque_insumo_criado_em
      ON movimento_estoque(insumo_id, criado_em DESC);
    CREATE INDEX IF NOT EXISTS idx_movimento_estoque_pedido_item
      ON movimento_estoque(pedido_id, item_pedido_id);

    CREATE TRIGGER IF NOT EXISTS trg_item_pedido_fill_tenant
      AFTER INSERT ON item_pedido
      FOR EACH ROW
      WHEN NEW.tenant_id IS NULL
    BEGIN
      UPDATE item_pedido
         SET tenant_id = (
           SELECT tenant_id
             FROM pedido
            WHERE pedido.id = NEW.pedido_id
         )
       WHERE id = NEW.id;
      SELECT CASE
        WHEN (
          SELECT tenant_id FROM item_pedido WHERE id = NEW.id
        ) IS NULL
        THEN RAISE(
          ABORT,
          'item_pedido tenant_id could not be derived from pedido'
        )
      END;
    END;

    CREATE TRIGGER IF NOT EXISTS trg_item_pedido_restore_tenant
      AFTER UPDATE OF tenant_id, pedido_id ON item_pedido
      FOR EACH ROW
      WHEN NEW.tenant_id IS NULL
    BEGIN
      UPDATE item_pedido
         SET tenant_id = (
           SELECT tenant_id
             FROM pedido
            WHERE pedido.id = NEW.pedido_id
         )
       WHERE id = NEW.id;
      SELECT CASE
        WHEN (
          SELECT tenant_id FROM item_pedido WHERE id = NEW.id
        ) IS NULL
        THEN RAISE(
          ABORT,
          'item_pedido tenant_id could not be derived from pedido'
        )
      END;
    END;
  `
}

function sourceValue(
  sqlite: SqliteConnection,
  table: string,
  column: string,
  fallback: string,
): string {
  return tableColumns(sqlite, table).has(column)
    ? `src.${quoteIdentifier(column)}`
    : fallback
}

function copyTable(
  sqlite: SqliteConnection,
  table: string,
  columns: Array<[string, string]>,
): void {
  if (!hasTable(sqlite, table)) return
  const target = quoteIdentifier(`__baseline_${table}`)
  const targetColumns = columns
    .map(([column]) => quoteIdentifier(column))
    .join(', ')
  const values = columns.map(([, expression]) => expression).join(', ')
  sqlite.exec(
    `INSERT INTO ${target} (${targetColumns})
     SELECT ${values} FROM ${quoteIdentifier(table)} AS src`,
  )
}

function requireColumnsForRows(
  sqlite: SqliteConnection,
  table: string,
  columns: string[],
): void {
  if (!hasRows(sqlite, table)) return
  const available = tableColumns(sqlite, table)
  const missing = columns.filter((column) => !available.has(column))
  if (missing.length > 0) {
    throw new Error(
      `Cannot baseline ${table}: populated table is missing ${missing.join(', ')}`,
    )
  }
}

function itemTenantExpression(
  sqlite: SqliteConnection,
  derivation: ItemTenantDerivation,
): string {
  const canBackfillItemTenant = derivation.requiredColumns.every(
    ({ table, columns }) => hasColumns(sqlite, table, columns),
  )
  if (!canBackfillItemTenant) return derivation.missingRequirementsExpression
  return tableColumns(sqlite, derivation.sourceTable).has(derivation.sourceColumn)
    ? derivation.sourceColumnPresentExpression
    : derivation.sourceColumnAbsentExpression
}

function copyExistingData(sqlite: SqliteConnection): void {
  const rebuild = sqliteMigrationManifest().migrations[BASELINE_MIGRATION]?.rebuild
  if (!rebuild) throw new Error('SQLite baseline rebuild manifest is missing.')
  for (const { table, columns } of rebuild.copyRequirements) {
    requireColumnsForRows(sqlite, table, columns)
  }

  for (const table of APPLICATION_TABLES) {
    const transforms = rebuild.copyTransforms.filter(
      (transform) => transform.table === table,
    )
    copyTable(
      sqlite,
      table,
      transforms.map((transform) => [
        transform.target,
        transform.derived
          ? itemTenantExpression(sqlite, transform.derived)
          : sourceValue(sqlite, table, transform.target, transform.fallback ?? 'NULL'),
      ]),
    )
  }
}
function rebuildExistingSchema(sqlite: SqliteConnection): void {
  const rebuild = sqliteMigrationManifest().migrations[BASELINE_MIGRATION]?.rebuild
  if (!rebuild) throw new Error('SQLite baseline rebuild manifest is missing.')
  sqlite.exec(schemaSql(rebuild.temporaryTablePrefix))
  copyExistingData(sqlite)

  for (const table of [...rebuild.tableOrder].reverse()) {
    if (hasTable(sqlite, table)) {
      sqlite.exec(`DROP TABLE ${quoteIdentifier(table)}`)
    }
  }
  for (const table of rebuild.tableOrder) {
    sqlite.exec(
      `ALTER TABLE ${quoteIdentifier(`${rebuild.temporaryTablePrefix}${table}`)}
       RENAME TO ${quoteIdentifier(table)}`,
    )
  }
}

function ensureTrackingTable(sqlite: SqliteConnection): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS ${quoteIdentifier(TRACKING_TABLE)} (
      id TEXT PRIMARY KEY NOT NULL,
      checksum TEXT NOT NULL,
      applied_at INTEGER NOT NULL
    );
  `)
  if (!tableColumns(sqlite, TRACKING_TABLE).has('checksum')) {
    sqlite.exec(
      `ALTER TABLE ${quoteIdentifier(TRACKING_TABLE)} ADD COLUMN checksum TEXT`,
    )
  }
}

function trackMigration(
  sqlite: SqliteConnection,
  migration: string,
): void {
  sqlite
    .prepare(
      `INSERT OR IGNORE INTO ${quoteIdentifier(
        TRACKING_TABLE,
      )} (id, checksum, applied_at) VALUES (?, ?, ?)`,
    )
    .run(migration, migrationChecksum(migration), Date.now())
}

type SqliteIndex = { name: string; unique: number; partial: number }
type SqliteIndexColumn = { name: string }
type SqliteForeignKey = {
  id: number
  seq: number
  table: string
  from: string
  to: string
  on_delete: string
}

function hasUniqueIndexColumns(
  sqlite: SqliteConnection,
  table: string,
  columns: string[],
): boolean {
  if (!hasTable(sqlite, table)) return false
  const indexes = sqlite
    .prepare(`PRAGMA index_list(${quoteIdentifier(table)})`)
    .all() as SqliteIndex[]
  return indexes.some((index) => {
    if (index.unique !== 1) return false
    const actual = (
      sqlite
        .prepare(`PRAGMA index_info(${quoteIdentifier(index.name)})`)
        .all() as SqliteIndexColumn[]
    ).map((column) => column.name)
    return (
      actual.length === columns.length &&
      actual.every((column, position) => column === columns[position])
    )
  })
}

function hasForeignKey(
  sqlite: SqliteConnection,
  table: string,
  columns: string[],
  parent: string,
  parentColumns: string[],
  onDelete: string,
): boolean {
  if (!hasTable(sqlite, table)) return false
  const rows = sqlite
    .prepare(`PRAGMA foreign_key_list(${quoteIdentifier(table)})`)
    .all() as SqliteForeignKey[]
  const groups = new Map<number, SqliteForeignKey[]>()
  for (const row of rows) {
    const group = groups.get(row.id) ?? []
    group.push(row)
    groups.set(row.id, group)
  }
  return [...groups.values()].some((group) => {
    const ordered = group.toSorted((left, right) => left.seq - right.seq)
    return (
      ordered.length === columns.length &&
      ordered[0]?.table === parent &&
      ordered[0]?.on_delete.toUpperCase() === onDelete.toUpperCase() &&
      ordered.every(
        (row, position) =>
          row.from === columns[position] && row.to === parentColumns[position],
      )
    )
  })
}

type CanonicalSchemaObject = {
  type: 'index' | 'trigger'
  name: string
  sql: string
}

function normalizeSqlDefinition(sql: string): string {
  return sql
    .replaceAll(/IF\s+NOT\s+EXISTS/gi, '')
    .replaceAll('"', '')
    .replaceAll(/\s+/g, '')
    .replace(/;$/, '')
    .toLowerCase()
}

function canonicalTableDefinitions(): Map<string, string> {
  return new Map(
    [...schemaSql().matchAll(/CREATE TABLE\s+"([^"]+)"\s*\([\s\S]*?\n\s*\);/g)]
      .map((match) => [match[1] as string, match[0]]),
  )
}

function canonicalSchemaObjects(): CanonicalSchemaObject[] {
  const sql = indexesSql()
  const indexes = [
    ...sql.matchAll(
      /CREATE\s+(?:UNIQUE\s+)?INDEX\s+IF NOT EXISTS[\s\S]*?;/gi,
    ),
  ].map((match) => {
    const name = match[0].match(
      /CREATE\s+(?:UNIQUE\s+)?INDEX\s+IF NOT EXISTS\s+([A-Za-z0-9_]+)/i,
    )?.[1]
    if (!name) {
      throw new Error('Invalid canonical SQLite index definition.')
    }
    return { type: 'index' as const, name, sql: match[0] }
  })
  const triggers = [
    ...sql.matchAll(
      /CREATE TRIGGER IF NOT EXISTS[\s\S]*?END;(?=\s*CREATE TRIGGER|\s*$)/gi,
    ),
  ].map((match) => {
    const name = match[0].match(
      /CREATE TRIGGER IF NOT EXISTS\s+([A-Za-z0-9_]+)/i,
    )?.[1]
    if (!name) {
      throw new Error('Invalid canonical SQLite trigger definition.')
    }
    return { type: 'trigger' as const, name, sql: match[0] }
  })
  return [...indexes, ...triggers]
}

function assertBaselinePostconditions(sqlite: SqliteConnection): void {
  const expectedTables = canonicalTableDefinitions()
  for (const table of APPLICATION_TABLES) {
    const expected = expectedTables.get(table)
    const actual = sqlite
      .prepare(
        `SELECT sql
           FROM sqlite_master
          WHERE type = 'table' AND name = ?`,
      )
      .get(table) as { sql: string | null } | undefined
    if (
      !expected ||
      !actual?.sql ||
      normalizeSqlDefinition(actual.sql) !== normalizeSqlDefinition(expected)
    ) {
      throw new Error(
        `SQLite schema drift detected: ${table} table definition is missing or malformed.`,
      )
    }
  }

  for (const expected of canonicalSchemaObjects()) {
    const actual = sqlite
      .prepare(
        `SELECT sql
           FROM sqlite_master
          WHERE type = ? AND name = ?`,
      )
      .get(expected.type, expected.name) as
      | { sql: string | null }
      | undefined
    if (
      !actual?.sql ||
      normalizeSqlDefinition(actual.sql) !==
        normalizeSqlDefinition(expected.sql)
    ) {
      throw new Error(
        `SQLite schema drift detected: ${expected.type} ${expected.name} is missing or malformed.`,
      )
    }
  }

  validateForeignKeys(sqlite)
}

function assertPaymentPostconditions(sqlite: SqliteConnection): void {
  const row = sqlite
    .prepare(
      `SELECT sql
         FROM sqlite_master
        WHERE type = 'index'
          AND name = 'pagamento_pedido_tenant_pedido_registrado_unique'`,
    )
    .get() as { sql: string | null } | undefined
  const normalized = row?.sql?.replaceAll(/\s+/g, ' ').toLowerCase()
  if (
    !normalized?.includes(
      'on pagamento_pedido(tenant_id, pedido_id)',
    ) ||
    !normalized.includes("where status = 'registrado'")
  ) {
    throw new Error(
      'SQLite schema drift detected: pagamento_pedido_tenant_pedido_registrado_unique is missing or malformed.',
    )
  }
}

function assertCoherencePostconditions(sqlite: SqliteConnection): void {
  if (
    !hasUniqueIndexColumns(sqlite, 'item_pedido', [
      'tenant_id',
      'pedido_id',
      'id',
    ])
  ) {
    throw new Error(
      'SQLite schema drift detected: item_pedido order aggregate uniqueness is missing.',
    )
  }
  for (const table of ['item_pedido_insumo', 'movimento_estoque']) {
    if (
      !hasForeignKey(
        sqlite,
        table,
        ['tenant_id', 'pedido_id', 'item_pedido_id'],
        'item_pedido',
        ['tenant_id', 'pedido_id', 'id'],
        table === 'item_pedido_insumo' ? 'CASCADE' : 'NO ACTION',
      )
    ) {
      throw new Error(
        `SQLite schema drift detected: ${table} order-item aggregate foreign key is missing.`,
      )
    }
    if (
      hasForeignKey(
        sqlite,
        table,
        ['tenant_id', 'item_pedido_id'],
        'item_pedido',
        ['tenant_id', 'id'],
        table === 'item_pedido_insumo' ? 'CASCADE' : 'NO ACTION',
      )
    ) {
      throw new Error(
        `SQLite schema drift detected: ${table} retains the legacy item-only foreign key.`,
      )
    }
  }
}

function applyPaymentMigration(sqlite: SqliteConnection): void {
  if (
    migrationApplied(sqlite, PAYMENT_MIGRATION, assertPaymentPostconditions)
  ) {
    assertPaymentPostconditions(sqlite)
    return
  }

  try {
    sqlite.exec('BEGIN IMMEDIATE')
    sqlite.exec(PAYMENT_INDEX_SQL)
    ensureTrackingTable(sqlite)
    trackMigration(sqlite, PAYMENT_MIGRATION)
    validateForeignKeys(sqlite)
    sqlite.exec('COMMIT')
  } catch (error) {
    try {
      sqlite.exec('ROLLBACK')
    } catch {
      // The failing statement may already have ended the transaction.
    }
    throw error
  }
  assertPaymentPostconditions(sqlite)
}

function applyCoherenceMigration(sqlite: SqliteConnection): void {
  if (
    migrationApplied(sqlite, COHERENCE_MIGRATION, assertCoherencePostconditions)
  ) {
    assertCoherencePostconditions(sqlite)
    return
  }

  validateExistingTenantData(sqlite)
  const alreadyCoherent = (() => {
    try {
      assertCoherencePostconditions(sqlite)
      return true
    } catch {
      return false
    }
  })()
  const restoreForeignKeys = foreignKeysEnabled(sqlite)
  if (restoreForeignKeys && !alreadyCoherent) {
    sqlite.exec('PRAGMA foreign_keys = OFF')
  }

  try {
    sqlite.exec('BEGIN IMMEDIATE')
    if (!alreadyCoherent) {
      rebuildExistingSchema(sqlite)
      sqlite.exec(indexesSql())
    }
    ensureTrackingTable(sqlite)
    trackMigration(sqlite, COHERENCE_MIGRATION)
    validateForeignKeys(sqlite)
    sqlite.exec('COMMIT')
  } catch (error) {
    try {
      sqlite.exec('ROLLBACK')
    } catch {
      // The failing statement may already have ended the transaction.
    }
    throw error
  } finally {
    if (restoreForeignKeys && !alreadyCoherent) {
      sqlite.exec('PRAGMA foreign_keys = ON')
    }
  }
  assertCoherencePostconditions(sqlite)
}

export function migrateSqliteDatabase(sqlite: SqliteConnection): void {
  if (hasTable(sqlite, TRACKING_TABLE)) ensureTrackingTable(sqlite)
  if (
    migrationApplied(sqlite, BASELINE_MIGRATION, assertBaselinePostconditions)
  ) {
    applyPaymentMigration(sqlite)
    applyCoherenceMigration(sqlite)
    assertBaselinePostconditions(sqlite)
    validateForeignKeys(sqlite)
    return
  }

  const hasExistingSchema = APPLICATION_TABLES.some((table) =>
    hasTable(sqlite, table),
  )
  if (hasExistingSchema) validateExistingTenantData(sqlite)

  const restoreForeignKeys = foreignKeysEnabled(sqlite)
  if (restoreForeignKeys) sqlite.exec('PRAGMA foreign_keys = OFF')

  try {
    sqlite.exec('BEGIN IMMEDIATE')
    if (hasExistingSchema) {
      rebuildExistingSchema(sqlite)
    } else {
      sqlite.exec(schemaSql())
    }
    sqlite.exec(indexesSql())
    ensureTrackingTable(sqlite)
    trackMigration(sqlite, BASELINE_MIGRATION)
    validateForeignKeys(sqlite)
    sqlite.exec('COMMIT')
  } catch (error) {
    try {
      sqlite.exec('ROLLBACK')
    } catch {
      // The failing statement may already have ended the transaction.
    }
    throw error
  } finally {
    if (restoreForeignKeys) sqlite.exec('PRAGMA foreign_keys = ON')
  }

  applyPaymentMigration(sqlite)
  applyCoherenceMigration(sqlite)
  assertBaselinePostconditions(sqlite)
  validateForeignKeys(sqlite)
}
