import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { cliente, enderecoCliente } from '@/lib/db/schema'

describe('customer schema', () => {
  it('defines tenant-scoped customers and addresses with a default-address invariant', () => {
    expect(Object.keys(cliente)).toEqual(expect.arrayContaining([
      'id', 'tenantId', 'nome', 'telefone', 'telefoneNormalizado', 'taxaEntregaPadrao', 'ativo',
    ]))
    expect(Object.keys(enderecoCliente)).toEqual(expect.arrayContaining([
      'id', 'tenantId', 'clienteId', 'rua', 'numero', 'bairro', 'cidade', 'cep', 'complemento',
      'referencia', 'padrao', 'ativo',
    ]))

    const migration = readFileSync(join(process.cwd(), 'db/migrations/202608171000_add_clientes.sql'), 'utf8')
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS cliente')
    expect(migration).toContain('UNIQUE (tenant_id, telefone_normalizado)')
    expect(migration).toContain('WHERE ativo = TRUE AND padrao = TRUE')
    expect(migration).not.toMatch(/ALTER TABLE (pedido|atendimento|mesa)/i)
  })
})
