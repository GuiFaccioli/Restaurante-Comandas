import { Pool, neonConfig } from '@neondatabase/serverless'
import {
  copyFileSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import WebSocket from 'ws'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { migrateDatabase } from '@/lib/db/migration-runner'

const postgresUrl = process.env.TEST_POSTGRES_URL
const describePostgres = postgresUrl ? describe : describe.skip

function copyPreCoherenceMigrations(): string {
  const source = resolve(process.cwd(), 'db/migrations')
  const target = mkdtempSync(
    join(tmpdir(), 'restaurante-comandas-pg-migrations-'),
  )
  for (const name of readdirSync(source)) {
    if (
      name.endsWith('.sql') &&
      name.localeCompare(
        '202607232300_enforce_order_item_coherence.sql',
      ) < 0
    ) {
      copyFileSync(resolve(source, name), resolve(target, name))
    }
  }
  return target
}

describe('PostgreSQL migration definitions', () => {
  it('reconciles canonical constraints by complete catalog semantics', () => {
    const migration = readFileSync(
      resolve(
        process.cwd(),
        'db/migrations/202607232300_enforce_order_item_coherence.sql',
      ),
      'utf8',
    )
    const marker =
      '-- Reconcile canonical constraints by full catalog definition.'
    const reconciliationStart = migration.indexOf(marker)

    expect(reconciliationStart).toBeGreaterThanOrEqual(0)
    const reconciliation = migration.slice(
      Math.max(reconciliationStart, 0),
    )
    expect(reconciliation).toContain(
      'item_pedido_insumo_tenant_pedido_item_fkey',
    )
    expect(reconciliation).toContain(
      'movimento_estoque_tenant_pedido_item_fkey',
    )
    expect(reconciliation).toContain(
      'movimento_estoque_item_requires_pedido_check',
    )
    expect(reconciliation).toMatch(/constraint_row\.conrelid/i)
    expect(reconciliation).toMatch(/constraint_row\.confrelid/i)
    expect(reconciliation).toMatch(/constraint_row\.conkey/i)
    expect(reconciliation).toMatch(/constraint_row\.confkey/i)
    expect(reconciliation).toMatch(/constraint_row\.confdeltype/i)
    expect(reconciliation).toMatch(/pg_get_expr\s*\(/i)
    expect(reconciliation).toMatch(/DROP CONSTRAINT/i)
  })
})

describePostgres(
  'PostgreSQL migrations (set TEST_POSTGRES_URL to enable)',
  () => {
    const schemaName = `migration_test_${crypto.randomUUID().replaceAll('-', '')}`
    let adminPool: Pool
    let scopedUrl: string

    beforeAll(async () => {
      if (!postgresUrl) return
      if (!neonConfig.webSocketConstructor) {
        neonConfig.webSocketConstructor = WebSocket
      }
      adminPool = new Pool({ connectionString: postgresUrl })
      await adminPool.query(`CREATE SCHEMA "${schemaName}"`)
      const parsed = new URL(postgresUrl)
      parsed.searchParams.set('options', `-c search_path=${schemaName}`)
      scopedUrl = parsed.toString()
    })

    afterAll(async () => {
      if (!postgresUrl || !adminPool) return
      await adminPool.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`)
      await adminPool.end()
    })

    it('migrates blank and repeated schemas and rejects checksum tampering', async () => {
      await migrateDatabase(scopedUrl)
      await migrateDatabase(scopedUrl)

      const scopedPool = new Pool({ connectionString: scopedUrl })
      try {
        const tables = await scopedPool.query<{ table_name: string }>(
          `SELECT table_name
             FROM information_schema.tables
            WHERE table_schema = current_schema()
              AND table_name IN (
                'tenant',
                'pedido',
                'item_pedido',
                'item_pedido_insumo',
                'movimento_estoque',
                'pagamento_pedido'
              )`,
        )
        expect(tables.rows).toHaveLength(6)

        const constraints = await scopedPool.query<{ conname: string }>(
          `SELECT conname
             FROM pg_constraint
            WHERE connamespace = current_schema()::regnamespace
              AND conname IN (
                'item_pedido_insumo_tenant_pedido_item_fkey',
                'movimento_estoque_tenant_pedido_item_fkey',
                'movimento_estoque_item_requires_pedido_check'
              )`,
        )
        expect(constraints.rows.map((row) => row.conname).sort()).toEqual([
          'item_pedido_insumo_tenant_pedido_item_fkey',
          'movimento_estoque_item_requires_pedido_check',
          'movimento_estoque_tenant_pedido_item_fkey',
        ])

        await scopedPool.query(
          `UPDATE app_schema_migration
              SET checksum = repeat('0', 64)
            WHERE name = '202607232300_enforce_order_item_coherence.sql'`,
        )
        await expect(migrateDatabase(scopedUrl)).rejects.toThrow(
          /checksum mismatch.*202607232300/i,
        )
      } finally {
        await scopedPool.end()
      }
    })

    it('replaces divergent same-name constraints while preserving migration history', async () => {
      const partialMigrations = copyPreCoherenceMigrations()
      const scopedPool = new Pool({ connectionString: scopedUrl })
      try {
        await migrateDatabase(scopedUrl, partialMigrations)
        const historyBefore = await scopedPool.query<{ name: string }>(
          'SELECT name FROM app_schema_migration ORDER BY name',
        )
        await scopedPool.query(`
          CREATE UNIQUE INDEX item_pedido_tenant_pedido_id_unique
            ON item_pedido(tenant_id, pedido_id, id);
          ALTER TABLE item_pedido_insumo
            ADD CONSTRAINT item_pedido_insumo_tenant_pedido_item_fkey
            FOREIGN KEY (tenant_id, pedido_id, item_pedido_id)
            REFERENCES item_pedido(tenant_id, pedido_id, id)
            ON DELETE NO ACTION;
          ALTER TABLE movimento_estoque
            ADD CONSTRAINT movimento_estoque_tenant_pedido_item_fkey
            FOREIGN KEY (tenant_id, pedido_id, item_pedido_id)
            REFERENCES item_pedido(tenant_id, pedido_id, id)
            ON DELETE CASCADE;
          ALTER TABLE movimento_estoque
            ADD CONSTRAINT movimento_estoque_item_requires_pedido_check
            CHECK (item_pedido_id IS NULL OR pedido_id IS NULL);
        `)

        await migrateDatabase(scopedUrl)

        const foreignKeys = await scopedPool.query<{
          conname: string
          child_table: string
          parent_table: string
          child_columns: string[]
          parent_columns: string[]
          confdeltype: string
        }>(
          `SELECT constraint_row.conname,
                  child.relname AS child_table,
                  parent.relname AS parent_table,
                  ARRAY(
                    SELECT attribute.attname::TEXT
                      FROM unnest(constraint_row.conkey)
                        WITH ORDINALITY AS key_column(attnum, ordinality)
                      JOIN pg_attribute AS attribute
                        ON attribute.attrelid = constraint_row.conrelid
                       AND attribute.attnum = key_column.attnum
                     ORDER BY key_column.ordinality
                  ) AS child_columns,
                  ARRAY(
                    SELECT attribute.attname::TEXT
                      FROM unnest(constraint_row.confkey)
                        WITH ORDINALITY AS key_column(attnum, ordinality)
                      JOIN pg_attribute AS attribute
                        ON attribute.attrelid = constraint_row.confrelid
                       AND attribute.attnum = key_column.attnum
                     ORDER BY key_column.ordinality
                  ) AS parent_columns,
                  constraint_row.confdeltype::TEXT
             FROM pg_constraint AS constraint_row
             JOIN pg_class AS child ON child.oid = constraint_row.conrelid
             JOIN pg_class AS parent ON parent.oid = constraint_row.confrelid
            WHERE constraint_row.conname IN (
              'item_pedido_insumo_tenant_pedido_item_fkey',
              'movimento_estoque_tenant_pedido_item_fkey'
            )
            ORDER BY constraint_row.conname`,
        )
        expect(foreignKeys.rows).toEqual([
          {
            conname:
              'item_pedido_insumo_tenant_pedido_item_fkey',
            child_table: 'item_pedido_insumo',
            parent_table: 'item_pedido',
            child_columns: [
              'tenant_id',
              'pedido_id',
              'item_pedido_id',
            ],
            parent_columns: ['tenant_id', 'pedido_id', 'id'],
            confdeltype: 'c',
          },
          {
            conname: 'movimento_estoque_tenant_pedido_item_fkey',
            child_table: 'movimento_estoque',
            parent_table: 'item_pedido',
            child_columns: [
              'tenant_id',
              'pedido_id',
              'item_pedido_id',
            ],
            parent_columns: ['tenant_id', 'pedido_id', 'id'],
            confdeltype: 'a',
          },
        ])

        const checkConstraint = await scopedPool.query<{
          expression: string
        }>(
          `SELECT lower(
                    regexp_replace(
                      pg_get_expr(
                        constraint_row.conbin,
                        constraint_row.conrelid
                      ),
                      '[[:space:]()]',
                      '',
                      'g'
                    )
                  ) AS expression
             FROM pg_constraint AS constraint_row
            WHERE constraint_row.conrelid =
                    'movimento_estoque'::regclass
              AND constraint_row.conname =
                    'movimento_estoque_item_requires_pedido_check'`,
        )
        expect(checkConstraint.rows).toEqual([
          {
            expression:
              'item_pedido_idisnullorpedido_idisnotnull',
          },
        ])

        const historyAfter = await scopedPool.query<{ name: string }>(
          'SELECT name FROM app_schema_migration ORDER BY name',
        )
        expect(historyAfter.rows).toEqual([
          ...historyBefore.rows,
          {
            name: '202607232300_enforce_order_item_coherence.sql',
          },
        ])
      } finally {
        await scopedPool.end()
        rmSync(partialMigrations, { recursive: true, force: true })
      }
    })
  },
)
