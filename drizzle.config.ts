import { defineConfig } from 'drizzle-kit'

const url = process.env.DATABASE_URL ?? 'file:./dev.db'
const isSQLite = !url.startsWith('postgresql')

export default defineConfig(
  isSQLite
    ? {
        schema: './lib/db/schema-sqlite.ts',
        out: './drizzle',
        dialect: 'sqlite',
        dbCredentials: {
          url: url.startsWith('file:') ? url.replace('file:', '') : './dev.db',
        },
      }
    : {
        schema: './lib/db/schema.ts',
        out: './drizzle',
        dialect: 'postgresql',
        dbCredentials: { url },
      }
)
