import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { normalizeMigrationSql, resolveMigrationDatabaseUrl, resolveMigrationTarget } from '@/lib/db/migration-runner'

describe('database migration runner', () => {
  it('normalizes line endings before checksumming migrations', () => {
    expect(normalizeMigrationSql('CREATE TABLE x;\r\n-- comment\r\n')).toBe('CREATE TABLE x;\n-- comment\n')
  })

  it.each([
    'postgres://user:password@localhost:5432/restaurant',
    'postgresql://user:password@localhost:5432/restaurant',
  ])('recognizes a direct PostgreSQL URL %s', (databaseUrl) => {
    expect(resolveMigrationTarget(databaseUrl)).toEqual({ url: databaseUrl })
  })

  it.each(['file:./tmp/baseline.db', 'file::memory:', 'https://example.com/db']) (
    'rejects non-PostgreSQL migration URL %s',
    (databaseUrl) => {
      expect(() => resolveMigrationTarget(databaseUrl)).toThrow(
        /Expected postgres:\/\/ or postgresql:\/\//,
      )
    },
  )

  it('requires DATABASE_URL for migrations', () => {
    expect(() => resolveMigrationTarget(undefined)).toThrow(
      /DATABASE_URL is required/,
    )
  })

  it('prefers a direct PostgreSQL URL for migrations', () => {
    expect(resolveMigrationDatabaseUrl(
      'postgresql://direct-user:password@direct.neon.tech/restaurant',
      'postgresql://pooled-user:password@pooled.neon.tech/restaurant',
    )).toBe('postgresql://direct-user:password@direct.neon.tech/restaurant')
  })

  it('wires db:migrate to the real migration script instead of db:push', () => {
    const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as { scripts: Record<string, string> }
    expect(packageJson.scripts['db:migrate']).toBe('tsx scripts/migrate.ts')
    expect(packageJson.scripts['db:migrate']).not.toContain('db:push')
  })

  it('ships a versioned PostgreSQL baseline and tenant-hardening migration', () => {
    const migrationPath = join(process.cwd(), 'db/migrations/202607232100_baseline_and_tenant_constraints.sql')
    expect(existsSync(migrationPath)).toBe(true)
    const migration = readFileSync(migrationPath, 'utf8')
    expect(migration).toMatch(/CREATE TABLE IF NOT EXISTS tenant/i)
    expect(migration).toMatch(/Cross-tenant data detected/i)
    expect(migration).toMatch(/UNIQUE\s*\(\s*tenant_id,\s*id\s*\)/i)
    expect(migration).not.toMatch(/\bDELETE\s+FROM\b/i)
  })
})
