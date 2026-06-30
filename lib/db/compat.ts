const databaseUrl = process.env.DATABASE_URL ?? ''

export const isSQLiteDatabase = !databaseUrl.startsWith('postgresql')

export function dbBoolean(value: boolean): boolean | 0 | 1 {
  return isSQLiteDatabase ? (value ? 1 : 0) : value
}
