import { loadEnvConfig } from '@next/env'

async function main(): Promise<void> {
  loadEnvConfig(process.cwd())
  const { migrateDatabase } = await import('../lib/db/migration-runner')
  await migrateDatabase()
}

main().catch((error: unknown) => {
  console.error('Database migration failed:', error)
  process.exitCode = 1
})
