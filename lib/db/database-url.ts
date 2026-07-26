export const NEXT_PRODUCTION_BUILD_PHASE = 'phase-production-build'

export function resolveRuntimeDatabaseUrl(
  databaseUrl: string | undefined,
  nextPhase = process.env.NEXT_PHASE,
): string {
  if (databaseUrl) return databaseUrl
  if (nextPhase === NEXT_PRODUCTION_BUILD_PHASE) return 'file::memory:'
  throw new Error('DATABASE_URL is required.')
}

export function sqlitePathFromDatabaseUrl(databaseUrl: string): string {
  if (!databaseUrl.toLowerCase().startsWith('file:')) {
    throw new Error('SQLite DATABASE_URL must start with file:.')
  }
  const path = databaseUrl.slice(databaseUrl.indexOf(':') + 1)
  if (!path) throw new Error('SQLite DATABASE_URL must include a database path.')
  return path
}
