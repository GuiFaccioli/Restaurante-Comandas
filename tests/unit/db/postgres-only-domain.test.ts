import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const postgresOnlyDomainFiles = [
  'lib/stock/service.ts',
  'lib/stock/order-consumption.ts',
  'lib/actions/pedidos.ts',
  'lib/actions/estoque.ts',
  'lib/actions/produtos.ts',
  'lib/actions/mesas.ts',
  'app/admin/estoque/data.ts',
]

describe('PostgreSQL-only domain runtime', () => {
  it.each(postgresOnlyDomainFiles)(
    'does not retain SQLite compatibility code in %s',
    (file) => {
      const source = readFileSync(join(process.cwd(), file), 'utf8')

      expect(source).not.toMatch(/schema-sqlite|better-sqlite3|sqliteOperation|SQLite/)
      expect(source).not.toMatch(/dbBoolean/)
    },
  )
})
