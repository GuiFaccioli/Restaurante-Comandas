import { defineConfig } from 'drizzle-kit'
import { sqlitePathFromDatabaseUrl } from './lib/db/database-url'

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL is required.')
const isPostgres = /^(postgres|postgresql):/i.test(url)
const isSqlite = /^file:/i.test(url)
if (!isPostgres && !isSqlite) {
  throw new Error(
    'Unsupported DATABASE_URL. Expected file:, postgres://, or postgresql://.',
  )
}

export default defineConfig(
  isPostgres
    ? {
        schema: './lib/db/schema.ts',
        out: './drizzle',
        dialect: 'postgresql',
        dbCredentials: { url },
      }
    : {
        schema: './lib/db/schema-sqlite.ts',
        out: './drizzle',
        dialect: 'sqlite',
        dbCredentials: {
          url: sqlitePathFromDatabaseUrl(url),
        },
      }
)
