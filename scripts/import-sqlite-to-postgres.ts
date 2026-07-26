import { loadEnvConfig } from '@next/env'
import { Pool, neonConfig } from '@neondatabase/serverless'
import Database from 'better-sqlite3'
import { copyFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import WebSocket from 'ws'

type Row = Record<string, unknown>

type TableSpec = {
  name: string
  timestampColumns?: string[]
  booleanColumns?: string[]
}

const TABLES: TableSpec[] = [
  { name: 'tenant', timestampColumns: ['created_at', 'updated_at'] },
  { name: 'usuario', timestampColumns: ['created_at', 'updated_at'] },
  { name: 'mesa', booleanColumns: ['ativa'] },
  { name: 'categoria' },
  {
    name: 'produto',
    booleanColumns: ['disponivel', 'controle_estoque'],
  },
  { name: 'insumo', booleanColumns: ['ativo'] },
  {
    name: 'tenant_user',
    timestampColumns: ['created_at', 'updated_at'],
  },
  { name: 'usuario_acesso' },
  {
    name: 'pedido',
    timestampColumns: ['criado_em', 'entregue_em', 'atualizado_em'],
  },
  { name: 'item_pedido' },
  { name: 'ficha_tecnica_item' },
  { name: 'item_pedido_insumo' },
  { name: 'pagamento_pedido', timestampColumns: ['registrado_em'] },
  { name: 'movimento_estoque', timestampColumns: ['criado_em'] },
]

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`
}

function toTimestamp(value: unknown): unknown {
  if (value === null || value === undefined) return value
  if (typeof value === 'number') return new Date(value).toISOString()
  return value
}

function normalizeRow(
  row: Row,
  spec: TableSpec,
  usuarioIds: Map<string, string>,
  tenantUserIds: Map<string, string>,
): Row {
  const normalized = { ...row }

  if (spec.name === 'usuario' && typeof normalized.id === 'string') {
    normalized.id = usuarioIds.get(normalized.id) ?? normalized.id
    if (normalized.role !== 'admin' && normalized.role !== 'garcom') {
      normalized.role = 'garcom'
    }
  }

  if (spec.name === 'tenant_user') {
    if (typeof normalized.id === 'string') {
      normalized.id = tenantUserIds.get(normalized.id) ?? normalized.id
    }
    if (typeof normalized.usuario_id === 'string') {
      normalized.usuario_id =
        usuarioIds.get(normalized.usuario_id) ?? normalized.usuario_id
    }
  }

  for (const column of ['created_by_user_id', 'registrado_por_usuario_id', 'criado_por_usuario_id', 'usuario_id']) {
    if (typeof normalized[column] === 'string') {
      normalized[column] = usuarioIds.get(normalized[column] as string) ?? normalized[column]
    }
  }

  if (typeof normalized.tenant_user_id === 'string') {
    normalized.tenant_user_id =
      tenantUserIds.get(normalized.tenant_user_id) ?? normalized.tenant_user_id
  }

  for (const column of spec.timestampColumns ?? []) {
    normalized[column] = toTimestamp(normalized[column])
  }

  for (const column of spec.booleanColumns ?? []) {
    if (typeof normalized[column] === 'number') {
      normalized[column] = normalized[column] === 1
    }
  }

  return normalized
}

async function main(): Promise<void> {
  loadEnvConfig(process.cwd())
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl?.startsWith('postgres')) {
    throw new Error('DATABASE_URL must be a PostgreSQL URL.')
  }

  const sqlitePath = path.join(process.cwd(), 'dev.db')
  const backupDirectory = path.join(process.cwd(), 'backups')
  const backupPath = path.join(backupDirectory, `dev-before-neon-import-${Date.now()}.db`)
  await mkdir(backupDirectory, { recursive: true })
  await copyFile(sqlitePath, backupPath)

  const sqlite = new Database(sqlitePath, { readonly: true })
  const usuarioIds = new Map(
    (sqlite.prepare('SELECT id FROM usuario').all() as Array<{ id: string }>)
      .filter(({ id }) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))
      .map(({ id }) => [id, randomUUID()]),
  )
  const tenantUserIds = new Map(
    (sqlite.prepare('SELECT id FROM tenant_user').all() as Array<{ id: string }>)
      .filter(({ id }) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))
      .map(({ id }) => [id, randomUUID()]),
  )

  neonConfig.webSocketConstructor = WebSocket
  const pool = new Pool({ connectionString: databaseUrl })
  const client = await pool.connect()

  try {
    for (const spec of TABLES) {
      const { rows } = await client.query<{ count: number }>(
        `SELECT COUNT(*)::int AS count FROM ${quoteIdentifier(spec.name)}`,
      )
      if (rows[0]?.count !== 0) {
        throw new Error(`Target table ${spec.name} is not empty; import aborted.`)
      }
    }

    await client.query('BEGIN')
    for (const spec of TABLES) {
      const rows = sqlite.prepare(`SELECT * FROM ${quoteIdentifier(spec.name)}`).all() as Row[]
      for (const row of rows) {
        const normalized = normalizeRow(row, spec, usuarioIds, tenantUserIds)
        const columns = Object.keys(normalized)
        const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ')
        await client.query(
          `INSERT INTO ${quoteIdentifier(spec.name)} (${columns.map(quoteIdentifier).join(', ')}) VALUES (${placeholders})`,
          columns.map((column) => normalized[column]),
        )
      }
    }

    for (const spec of TABLES) {
      const sourceCount = (
        sqlite.prepare(`SELECT COUNT(*) AS count FROM ${quoteIdentifier(spec.name)}`).get() as { count: number }
      ).count
      const { rows } = await client.query<{ count: number }>(
        `SELECT COUNT(*)::int AS count FROM ${quoteIdentifier(spec.name)}`,
      )
      if (rows[0]?.count !== sourceCount) {
        throw new Error(`Row-count mismatch for ${spec.name}.`)
      }
    }

    await client.query('COMMIT')
    const sessionCount = (
      sqlite.prepare('SELECT COUNT(*) AS count FROM auth_session').get() as {
        count: number
      }
    ).count
    console.log(`SQLite data imported into Neon. Local backup: ${backupPath}`)
    console.log(`Invalidated ${sessionCount} legacy sessions.`)
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined)
    throw error
  } finally {
    sqlite.close()
    client.release()
    await pool.end()
  }
}

main().catch((error: unknown) => {
  console.error('SQLite import failed:', error)
  process.exitCode = 1
})
