/* eslint-disable @typescript-eslint/no-require-imports */
import * as pgSchema from './schema'
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'

// Determine backend at module load time (server-side only)
const DATABASE_URL = process.env.DATABASE_URL ?? ''
const isSQLite = !DATABASE_URL.startsWith('postgresql')

// We type db as the Neon/PG drizzle instance so all existing server actions
// get proper TypeScript inference (column names and types are compatible at
// runtime between the two schemas).
type DbType = ReturnType<typeof drizzleNeon<typeof pgSchema>>

function createDb(): DbType {
  if (isSQLite) {
    const Database = require('better-sqlite3')
    const { drizzle } = require('drizzle-orm/better-sqlite3')
    const sqliteSchema = require('./schema-sqlite')
    const dbPath = DATABASE_URL.startsWith('file:')
      ? DATABASE_URL.replace('file:', '')
      : './dev.db'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sqlite: any = new Database(dbPath)
    sqlite.pragma('journal_mode = WAL')
    sqlite.pragma('foreign_keys = ON')
    return drizzle(sqlite, { schema: sqliteSchema }) as unknown as DbType
  }

  // Neon PostgreSQL (production)
  const sql = neon(DATABASE_URL)
  return drizzleNeon(sql, { schema: pgSchema })
}

export const db: DbType = createDb()
