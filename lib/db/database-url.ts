export function resolveRuntimeDatabaseUrl(
  databaseUrl: string | undefined,
): string {
  if (!databaseUrl) throw new Error('DATABASE_URL is required.')

  let parsedUrl: URL
  try {
    parsedUrl = new URL(databaseUrl)
  } catch {
    throw new Error(
      'Unsupported DATABASE_URL. Expected postgres:// or postgresql://.',
    )
  }

  if (
    parsedUrl.protocol !== 'postgres:' &&
    parsedUrl.protocol !== 'postgresql:'
  ) {
    throw new Error(
      'Unsupported DATABASE_URL. Expected postgres:// or postgresql://.',
    )
  }
  if (!parsedUrl.hostname) {
    throw new Error('PostgreSQL DATABASE_URL must include a hostname.')
  }

  return databaseUrl
}
