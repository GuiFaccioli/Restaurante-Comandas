/* eslint-disable @typescript-eslint/no-require-imports */
import * as pgSchema from './schema'
import * as sqliteSchema from './schema-sqlite'
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless'
import { Pool, neonConfig } from '@neondatabase/serverless'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { migrateSqliteDatabase } from './sqlite-migrations'
import {
  resolveRuntimeDatabaseUrl,
  sqlitePathFromDatabaseUrl,
} from './database-url'

type DatabaseBackend = 'sqlite' | 'postgresql'
type SQLiteSchema = typeof sqliteSchema
type SQLiteDbType = BetterSQLite3Database<SQLiteSchema>
type PostgresDbType = ReturnType<typeof drizzleNeon<typeof pgSchema>>
type SQLiteTransaction = Parameters<
  Parameters<SQLiteDbType['transaction']>[0]
>[0]
type PostgresTransaction = Parameters<
  Parameters<PostgresDbType['transaction']>[0]
>[0]
type CreatedDatabase =
  | { backend: 'sqlite'; client: SQLiteDbType }
  | { backend: 'postgresql'; client: PostgresDbType }
type PoolCache = {
  connectionString: string
  pool: Pool
}
type SyncResult<TResult> = TResult extends PromiseLike<unknown>
  ? never
  : TResult

const poolCacheKey = Symbol.for('restaurante-comandas.neon-pool')
const globalPoolCache = globalThis as typeof globalThis &
  Record<symbol, unknown>
const DATABASE_URL = resolveRuntimeDatabaseUrl(process.env.DATABASE_URL)
const backend = resolveBackend(DATABASE_URL)
const isNextProductionBuild = process.env.NEXT_PHASE === 'phase-production-build'

function resolveBackend(databaseUrl: string): DatabaseBackend {
  let parsedUrl: URL
  try {
    parsedUrl = new URL(databaseUrl)
  } catch {
    throw new Error(
      'Unsupported DATABASE_URL. Expected file:, postgres://, or postgresql://.',
    )
  }

  if (parsedUrl.protocol === 'file:') return 'sqlite'
  if (
    parsedUrl.protocol === 'postgresql:' ||
    parsedUrl.protocol === 'postgres:'
  ) {
    if (!parsedUrl.hostname) {
      throw new Error('PostgreSQL DATABASE_URL must include a hostname.')
    }
    return 'postgresql'
  }
  throw new Error(
    'Unsupported DATABASE_URL protocol. Expected file:, postgres://, or postgresql://.',
  )
}

function handlePoolError(): void {
  console.error('PostgreSQL pool emitted an unexpected error')
}

function handlePoolCloseError(): void {
  console.error('Failed to close replaced PostgreSQL pool')
}

function getPostgresPool(connectionString: string): Pool {
  const cached = globalPoolCache[poolCacheKey] as PoolCache | undefined
  if (cached?.connectionString === connectionString) return cached.pool

  if (cached) {
    try {
      void cached.pool.end().catch(handlePoolCloseError)
    } catch {
      handlePoolCloseError()
    }
  }

  const pool = new Pool({ connectionString })
  pool.on('error', handlePoolError)
  globalPoolCache[poolCacheKey] = { connectionString, pool } satisfies PoolCache
  return pool
}

function createDb(): CreatedDatabase {
  if (backend === 'sqlite') {
    const Database =
      require('better-sqlite3') as typeof import('better-sqlite3')
    const { drizzle } =
      require('drizzle-orm/better-sqlite3') as typeof import('drizzle-orm/better-sqlite3')
    const dbPath = sqlitePathFromDatabaseUrl(DATABASE_URL)
    const sqlite = new Database(dbPath)
    if (!isNextProductionBuild) {
      sqlite.pragma('journal_mode = WAL')
      sqlite.pragma('foreign_keys = ON')
    }
    migrateSqliteDatabase(sqlite)
    return {
      backend,
      client: drizzle(sqlite, { schema: sqliteSchema }),
    }
  }

  if (!neonConfig.webSocketConstructor) {
    const WebSocket = require('ws') as typeof import('ws').default
    neonConfig.webSocketConstructor = WebSocket
  }
  const pool = getPostgresPool(DATABASE_URL)
  return {
    backend,
    client: drizzleNeon({ client: pool, schema: pgSchema }),
  }
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (
    (typeof value === 'object' && value !== null) ||
    typeof value === 'function'
  ) && 'then' in value
}

const createdDatabase = createDb()

export type DatabaseQueryClient = Omit<PostgresDbType, 'transaction'>
export type RunInDbTransactionOptions = {
  sqliteMode?: 'immediate'
}

export const db: DatabaseQueryClient =
  createdDatabase.client as unknown as DatabaseQueryClient

export function runInDbTransaction<TResult>(
  operations: {
    sqliteOperation: (transaction: SQLiteTransaction) => SyncResult<TResult>
    postgresOperation: (transaction: PostgresTransaction) => Promise<TResult>
  },
  options?: RunInDbTransactionOptions,
): SyncResult<TResult> | Promise<TResult> {
  if (createdDatabase.backend === 'sqlite') {
    const operation = (transaction: SQLiteTransaction) => {
      const result = operations.sqliteOperation(transaction)
      if (isPromiseLike(result)) {
        throw new TypeError('SQLite transaction operations must be synchronous')
      }
      return result
    }

    if (options?.sqliteMode === 'immediate') {
      return createdDatabase.client.transaction(operation, {
        behavior: 'immediate',
      })
    }
    return createdDatabase.client.transaction(operation)
  }

  return createdDatabase.client.transaction(operations.postgresOperation)
}
