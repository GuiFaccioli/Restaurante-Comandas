import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { atendimento, pedido } from '@/lib/db/schema'

describe('delivery order schema', () => {
  it('supports a delivery order without a table and preserves snapshots', () => {
    expect(Object.keys(pedido)).toEqual(expect.arrayContaining([
      'canal',
      'mesaId',
      'clienteId',
      'clienteNomeSnapshot',
      'clienteTelefoneSnapshot',
      'enderecoSnapshot',
      'taxaEntregaAplicada',
    ]))
    expect(Object.keys(atendimento)).toEqual(expect.arrayContaining(['mesaId']))

    const migration = readFileSync(join(process.cwd(), 'db/migrations/202608180900_add_delivery_orders.sql'), 'utf8')
    expect(migration).toContain('CREATE TYPE canal_pedido')
    expect(migration).toContain('DROP NOT NULL')
    expect(migration).toContain('pedido_delivery_one_to_one_unique')
    expect(migration).toContain('canal = \'salao\'')
    expect(migration).toContain('canal = \'delivery\'')
  })
})
