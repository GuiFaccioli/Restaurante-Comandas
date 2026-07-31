import { defineConfig } from 'drizzle-kit'
import { resolveRuntimeDatabaseUrl } from './lib/db/database-url'

const url = resolveRuntimeDatabaseUrl(process.env.DATABASE_URL)

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url },
})
