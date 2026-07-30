import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const source = (path: string) => readFileSync(join(root, path), 'utf8')

describe('attendance operational contract', () => {
  it('keeps legacy orders separate during migration and protects one open attendance per table', () => {
    const migration = source('db/migrations/202607301200_add_atendimento.sql')
    expect(migration).toContain('order and preserve the historical boundary')
    expect(migration).toContain('atendimento_tenant_mesa_open_unique')
    expect(migration).toContain('UPDATE pagamento_pedido')
    expect(migration).not.toContain('GROUP BY pedido.mesa_id')
  })

  it('keeps cashier and waiter flows grouped by attendance', () => {
    expect(source('app/admin/pedidos/page.tsx')).toContain('getCashierAccounts')
    expect(source('app/admin/pedidos/client.tsx')).toContain('registrarPagamentoAtendimento')
    expect(source('components/garcom/mesa-atendimento-gate.tsx')).toContain('Continuar atendimento')
    expect(source('components/garcom/mesa-atendimento-gate.tsx')).toContain('Iniciar novo atendimento')
    expect(source('lib/stock/order-consumption.ts')).toContain('atendimentoId')
  })
})
