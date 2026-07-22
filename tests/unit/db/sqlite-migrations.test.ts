import Database from 'better-sqlite3'
import { describe, expect, it } from 'vitest'
import { migrateSqliteDatabase } from '@/lib/db/sqlite-migrations'

describe('SQLite migrations', () => {
  it('adds stock columns and tables to an existing database without losing products', () => {
    const sqlite = new Database(':memory:')
    sqlite.exec(`CREATE TABLE produto (id TEXT PRIMARY KEY, nome TEXT NOT NULL); INSERT INTO produto VALUES ('p1', 'Pizza');`)

    migrateSqliteDatabase(sqlite)

    expect(sqlite.prepare('SELECT nome, controle_estoque FROM produto').get()).toEqual({ nome: 'Pizza', controle_estoque: 0 })
    expect(sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'insumo'").get()).toEqual({ name: 'insumo' })
    const movementColumns = sqlite.prepare('PRAGMA table_info(movimento_estoque)').all() as Array<{ name: string }>
    expect(movementColumns.map((column) => column.name)).toEqual(expect.arrayContaining([
      'saldo_anterior', 'saldo_resultante', 'custo_unitario', 'custo_total', 'item_pedido_id', 'motivo', 'criado_por_usuario_id',
    ]))
    sqlite.close()
  })
})
