import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  resolveMigrationTarget,
  sqlitePathFromFileUrl,
} from '@/lib/db/migration-runner'

describe('database migration runner', () => {
  it.each([
    'postgres://user:password@localhost:5432/restaurant',
    'postgresql://user:password@localhost:5432/restaurant',
  ])('recognizes PostgreSQL URL %s', (databaseUrl) => {
    expect(resolveMigrationTarget(databaseUrl)).toEqual({
      backend: 'postgresql',
      url: databaseUrl,
    })
  })

  it('recognizes SQLite file URLs without an implicit file fallback', () => {
    expect(resolveMigrationTarget('file:./tmp/baseline.db')).toEqual({
      backend: 'sqlite',
      path: './tmp/baseline.db',
    })
    expect(sqlitePathFromFileUrl('file::memory:')).toBe(':memory:')
    expect(() => resolveMigrationTarget(undefined)).toThrow(
      /DATABASE_URL is required/,
    )
  })

  it('wires db:migrate to the real migration script instead of db:push', () => {
    const packageJson = JSON.parse(
      readFileSync(join(process.cwd(), 'package.json'), 'utf8'),
    ) as { scripts: Record<string, string> }

    expect(packageJson.scripts['db:migrate']).toBe('tsx scripts/migrate.ts')
    expect(packageJson.scripts['db:migrate']).not.toContain('db:push')
  })

  it('ships a versioned PostgreSQL baseline and tenant-hardening migration', () => {
    const migrationPath = join(
      process.cwd(),
      'db/migrations/202607232100_baseline_and_tenant_constraints.sql',
    )

    expect(existsSync(migrationPath)).toBe(true)
    const migration = readFileSync(migrationPath, 'utf8')

    expect(migration).toMatch(/CREATE TABLE IF NOT EXISTS tenant/i)
    expect(migration).toMatch(
      /UPDATE item_pedido[\s\S]+SET tenant_id = pedido\.tenant_id/i,
    )
    expect(migration).toMatch(/Cross-tenant data detected/i)
    expect(migration).toMatch(
      /UNIQUE\s*\(\s*tenant_id,\s*id\s*\)/i,
    )
    expect(migration).toMatch(
      /FOREIGN KEY\s*\(\s*tenant_id,\s*categoria_id\s*\)[\s\S]+REFERENCES categoria\s*\(\s*tenant_id,\s*id\s*\)/i,
    )
    expect(migration).toMatch(
      /FOREIGN KEY\s*\(\s*tenant_id,\s*pedido_id\s*\)[\s\S]+REFERENCES pedido\s*\(\s*tenant_id,\s*id\s*\)/i,
    )
    expect(migration).not.toMatch(/\bDELETE\s+FROM\b/i)
    expect(migration).not.toMatch(/\bDROP\s+TABLE\b/i)
  })

  it('ships an idempotent partial unique payment migration', () => {
    const migrationPath = join(
      process.cwd(),
      'db/migrations/202607232200_add_registered_payment_uniqueness.sql',
    )

    expect(existsSync(migrationPath)).toBe(true)
    const migration = readFileSync(migrationPath, 'utf8')
    expect(migration).toMatch(
      /CREATE UNIQUE INDEX IF NOT EXISTS\s+pagamento_pedido_tenant_pedido_registrado_unique/i,
    )
    expect(migration).toMatch(
      /ON pagamento_pedido\s*\(\s*tenant_id,\s*pedido_id\s*\)\s*WHERE status = 'registrado'/i,
    )
    expect(migration).not.toMatch(/\bDELETE\s+FROM\b/i)
  })

  it('ships an additive order-item coherence migration', () => {
    const migration = readFileSync(
      join(
        process.cwd(),
        'db/migrations/202607232300_enforce_order_item_coherence.sql',
      ),
      'utf8',
    )

    expect(migration).toMatch(
      /FOREIGN KEY\s*\(\s*tenant_id,\s*pedido_id,\s*item_pedido_id\s*\)[\s\S]+REFERENCES item_pedido\s*\(\s*tenant_id,\s*pedido_id,\s*id\s*\)/i,
    )
    expect(migration).toMatch(/Order-item coherence violation/i)
    expect(migration).toMatch(/DROP CONSTRAINT/i)
    expect(migration).not.toMatch(/\bDELETE\s+FROM\b/i)
  })
})
