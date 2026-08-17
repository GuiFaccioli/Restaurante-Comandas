/* eslint-disable @typescript-eslint/no-require-imports */
import * as pgSchema from './schema'
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless'
import { Pool, neonConfig } from '@neondatabase/serverless'
import { resolveRuntimeDatabaseUrl } from './database-url'
import { orderConfirmationDrizzleLogger } from '@/lib/performance/order-confirmation-measurement'

type PostgresDbType = ReturnType<typeof drizzleNeon<typeof pgSchema>>
type PostgresTransaction = Parameters<
  Parameters<PostgresDbType['transaction']>[0]
>[0]
type PoolCache = {
  connectionString: string
  pool: Pool
}

const poolCacheKey = Symbol.for('restaurante-comandas.neon-pool')
const globalPoolCache = globalThis as typeof globalThis & Record<symbol, unknown>
const DATABASE_URL = resolveRuntimeDatabaseUrl(process.env.DATABASE_URL)

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

function createDb(): PostgresDbType {
  if (!neonConfig.webSocketConstructor) {
    const WebSocket = require('ws') as typeof import('ws').default
    neonConfig.webSocketConstructor = WebSocket
  }

  return drizzleNeon({
    client: getPostgresPool(DATABASE_URL),
    schema: pgSchema,
    logger: orderConfirmationDrizzleLogger,
  })
}

const createdDatabase = createDb()

export type DatabaseQueryClient = Omit<PostgresDbType, 'transaction'>

type TransactionOperations<TResult> = {
  postgresOperation: (transaction: PostgresTransaction) => Promise<TResult>
}

export const db: DatabaseQueryClient = createdDatabase

export function runInDbTransaction<TResult>(
  operations: TransactionOperations<TResult>,
): Promise<TResult> {
  return createdDatabase.transaction(operations.postgresOperation)
}
