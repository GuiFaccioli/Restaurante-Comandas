type SqliteConnection = {
  exec(sql: string): void
  prepare(sql: string): { all(): unknown[] }
}

type SqliteColumn = { name: string }

function hasColumn(sqlite: SqliteConnection, table: string, column: string): boolean {
  const columns = sqlite.prepare(`PRAGMA table_info(${table})`).all() as SqliteColumn[]
  return columns.some((item) => item.name === column)
}

export function migrateSqliteDatabase(sqlite: SqliteConnection): void {
  if (!hasColumn(sqlite, 'produto', 'controle_estoque')) {
    sqlite.exec("ALTER TABLE produto ADD COLUMN controle_estoque INTEGER NOT NULL DEFAULT 0")
  }

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS insumo (
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
      ativo INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS ficha_tecnica_item (
      id TEXT PRIMARY KEY NOT NULL,
      tenant_id TEXT NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
      produto_id TEXT NOT NULL REFERENCES produto(id) ON DELETE CASCADE,
      insumo_id TEXT NOT NULL REFERENCES insumo(id),
      quantidade TEXT NOT NULL,
      UNIQUE (produto_id, insumo_id)
    );

    CREATE TABLE IF NOT EXISTS movimento_estoque (
      id TEXT PRIMARY KEY NOT NULL,
      tenant_id TEXT NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
      insumo_id TEXT NOT NULL REFERENCES insumo(id),
      tipo TEXT NOT NULL,
      quantidade TEXT NOT NULL,
      saldo_anterior TEXT NOT NULL DEFAULT '0',
      saldo_resultante TEXT NOT NULL DEFAULT '0',
      custo_unitario TEXT,
      custo_total TEXT,
      pedido_id TEXT REFERENCES pedido(id) ON DELETE SET NULL,
      item_pedido_id TEXT REFERENCES item_pedido(id) ON DELETE SET NULL,
      chave_idempotencia TEXT NOT NULL UNIQUE,
      motivo TEXT,
      observacao TEXT,
      criado_por_usuario_id TEXT REFERENCES usuario(id) ON DELETE SET NULL,
      criado_em INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_insumo_tenant_id ON insumo(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_ficha_tecnica_produto_id ON ficha_tecnica_item(produto_id);
    CREATE INDEX IF NOT EXISTS idx_ficha_tecnica_insumo_id ON ficha_tecnica_item(insumo_id);
    CREATE INDEX IF NOT EXISTS idx_movimento_estoque_tenant_id ON movimento_estoque(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_movimento_estoque_insumo_id ON movimento_estoque(insumo_id);
    CREATE INDEX IF NOT EXISTS idx_movimento_estoque_insumo_criado_em ON movimento_estoque(insumo_id, criado_em DESC);
  `)

  const movementColumns: Array<[string, string]> = [
    ['saldo_anterior', "TEXT NOT NULL DEFAULT '0'"],
    ['saldo_resultante', "TEXT NOT NULL DEFAULT '0'"],
    ['custo_unitario', 'TEXT'],
    ['custo_total', 'TEXT'],
    ['item_pedido_id', 'TEXT'],
    ['motivo', 'TEXT'],
    ['criado_por_usuario_id', 'TEXT'],
  ]
  for (const [column, definition] of movementColumns) {
    if (!hasColumn(sqlite, 'movimento_estoque', column)) {
      sqlite.exec(`ALTER TABLE movimento_estoque ADD COLUMN ${column} ${definition}`)
    }
  }
  sqlite.exec('CREATE INDEX IF NOT EXISTS idx_movimento_estoque_pedido_item ON movimento_estoque(pedido_id, item_pedido_id)')
}
