import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Pool, neonConfig, type PoolClient } from '@neondatabase/serverless'
import Database from 'better-sqlite3'
import WebSocket from 'ws'
import { migrateSqliteDatabase } from './sqlite-migrations'

export type MigrationTarget =
  | { backend: 'sqlite'; path: string }
  | { backend: 'postgresql'; url: string }

type PostgresClient = PoolClient
type TrackedMigration = { name: string; checksum: string }
type MigrationFile = TrackedMigration & { sql: string }

const POSTGRES_BASELINE =
  '202607232100_baseline_and_tenant_constraints.sql'
const POSTGRES_TABLES = [
  'tenant',
  'mesa',
  'categoria',
  'produto',
  'insumo',
  'ficha_tecnica_item',
  'pedido',
  'item_pedido',
  'item_pedido_insumo',
  'usuario',
  'tenant_user',
  'usuario_acesso',
  'auth_session',
  'pagamento_pedido',
  'movimento_estoque',
]

export function sqlitePathFromFileUrl(databaseUrl: string): string {
  if (!databaseUrl.toLowerCase().startsWith('file:')) {
    throw new Error('SQLite DATABASE_URL must start with file:.')
  }
  const path = databaseUrl.slice(databaseUrl.indexOf(':') + 1)
  if (path.length === 0) {
    throw new Error('SQLite DATABASE_URL must include a database path.')
  }
  return path
}

export function resolveMigrationTarget(
  databaseUrl: string | undefined,
): MigrationTarget {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for db:migrate.')
  }

  const protocol = databaseUrl.slice(0, databaseUrl.indexOf(':')).toLowerCase()
  if (protocol === 'file') {
    return {
      backend: 'sqlite',
      path: sqlitePathFromFileUrl(databaseUrl),
    }
  }
  if (protocol === 'postgres' || protocol === 'postgresql') {
    const parsed = new URL(databaseUrl)
    if (!parsed.hostname) {
      throw new Error('PostgreSQL DATABASE_URL must include a hostname.')
    }
    return { backend: 'postgresql', url: databaseUrl }
  }
  throw new Error(
    'Unsupported DATABASE_URL. Expected file:, postgres://, or postgresql://.',
  )
}

function migrationFiles(migrationsDirectory: string): MigrationFile[] {
  return readdirSync(migrationsDirectory)
    .filter((name) => name.endsWith('.sql'))
    .sort((left, right) => left.localeCompare(right))
    .map((name) => {
      const sql = readFileSync(resolve(migrationsDirectory, name), 'utf8')
      return {
        name,
        sql,
        checksum: createHash('sha256').update(sql).digest('hex'),
      }
    })
}

async function ensurePostgresTracking(client: PostgresClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS app_schema_migration (
      name TEXT PRIMARY KEY,
      checksum TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)
}

async function trackedPostgresMigrations(
  client: PostgresClient,
): Promise<Map<string, string>> {
  const result = await client.query<TrackedMigration>(
    'SELECT name, checksum FROM app_schema_migration ORDER BY name',
  )
  return new Map(result.rows.map((row) => [row.name, row.checksum]))
}

async function postgresSchemaState(
  client: PostgresClient,
): Promise<'empty' | 'existing'> {
  const result = await client.query<{ count: number }>(
    `SELECT COUNT(*)::int AS count
       FROM pg_class
      WHERE relkind IN ('r', 'p')
        AND relnamespace = current_schema()::regnamespace
        AND relname = ANY($1::text[])`,
    [POSTGRES_TABLES],
  )
  return (result.rows[0]?.count ?? 0) === 0 ? 'empty' : 'existing'
}

async function applyPostgresBaseline(
  client: PostgresClient,
  baseline: MigrationFile,
  absorbed: MigrationFile[],
): Promise<void> {
  await client.query('BEGIN')
  try {
    await client.query(baseline.sql)
    for (const migration of absorbed) {
      await client.query(
        `INSERT INTO app_schema_migration (name, checksum)
         VALUES ($1, $2)
         ON CONFLICT (name) DO UPDATE
           SET checksum = EXCLUDED.checksum`,
        [migration.name, migration.checksum],
      )
    }
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  }
}

async function applyPostgresIncremental(
  client: PostgresClient,
  migration: MigrationFile,
): Promise<void> {
  await client.query('BEGIN')
  try {
    await client.query(migration.sql)
    await client.query(
      `INSERT INTO app_schema_migration (name, checksum)
       VALUES ($1, $2)`,
      [migration.name, migration.checksum],
    )
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  }
}

async function migratePostgres(
  url: string,
  migrationsDirectory: string,
): Promise<void> {
  if (!neonConfig.webSocketConstructor) {
    neonConfig.webSocketConstructor = WebSocket
  }

  const pool = new Pool({ connectionString: url })
  pool.on('error', () => {
    console.error('PostgreSQL migration pool emitted an unexpected error')
  })
  const client = await pool.connect()

  try {
    await ensurePostgresTracking(client)
    const files = migrationFiles(migrationsDirectory)
    const baseline = files.find((file) => file.name === POSTGRES_BASELINE)
    if (!baseline) {
      throw new Error(`Missing PostgreSQL baseline: ${POSTGRES_BASELINE}`)
    }

    const state = await postgresSchemaState(client)
    const tracked = await trackedPostgresMigrations(client)
    for (const file of files) {
      const checksum = tracked.get(file.name)
      if (checksum !== undefined && checksum !== file.checksum) {
        throw new Error(
          `Migration checksum mismatch for ${file.name}; migrations are immutable.`,
        )
      }
    }

    if (!tracked.has(POSTGRES_BASELINE)) {
      const absorbed = files.filter(
        (file) => file.name.localeCompare(POSTGRES_BASELINE) <= 0,
      )
      await applyPostgresBaseline(client, baseline, absorbed)
      for (const file of absorbed) tracked.set(file.name, file.checksum)
      console.log(`Applied PostgreSQL baseline to ${state} schema`)
    }

    for (const file of files) {
      if (
        file.name.localeCompare(POSTGRES_BASELINE) <= 0 ||
        tracked.has(file.name)
      ) {
        continue
      }
      await applyPostgresIncremental(client, file)
      tracked.set(file.name, file.checksum)
      console.log(`Applied PostgreSQL migration ${file.name}`)
    }
  } finally {
    client.release()
    await pool.end()
  }
}

export async function migrateDatabase(
  databaseUrl = process.env.DATABASE_URL,
  migrationsDirectory = resolve(process.cwd(), 'db', 'migrations'),
): Promise<void> {
  const target = resolveMigrationTarget(databaseUrl)
  if (target.backend === 'sqlite') {
    const sqlite = new Database(target.path)
    try {
      sqlite.pragma('foreign_keys = ON')
      migrateSqliteDatabase(sqlite)
      console.log(`SQLite migrations applied to ${target.path}`)
    } finally {
      sqlite.close()
    }
    return
  }

  await migratePostgres(target.url, migrationsDirectory)
}
