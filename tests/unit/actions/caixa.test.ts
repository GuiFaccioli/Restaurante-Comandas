import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
  runInDbTransaction: vi.fn(),
  requireAccess: vi.fn(async () => ({ usuarioId: 'caixa-1', tenantId: 'tenant-1', access: 'caixa' })),
}))

vi.mock('@/lib/db/index', () => ({
  db: mocks.db,
  runInDbTransaction: mocks.runInDbTransaction,
}))

vi.mock('@/lib/auth/access', () => ({
  requireAccess: mocks.requireAccess,
}))

vi.mock('@/lib/db/schema', () => ({
  pedido: {
    id: 'pedido.id',
    tenantId: 'pedido.tenant_id',
    status: 'pedido.status',
  },
  pagamentoPedido: {
    id: 'pagamento_pedido.id',
    tenantId: 'pagamento_pedido.tenant_id',
    pedidoId: 'pagamento_pedido.pedido_id',
    registradoPorUsuarioId: 'pagamento_pedido.registrado_por_usuario_id',
    formaPagamento: 'pagamento_pedido.forma_pagamento',
    valor: 'pagamento_pedido.valor',
    status: 'pagamento_pedido.status',
    observacao: 'pagamento_pedido.observacao',
    registradoEm: 'pagamento_pedido.registrado_em',
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAccess.mockResolvedValue({ usuarioId: 'caixa-1', tenantId: 'tenant-1', access: 'caixa' })
  mocks.runInDbTransaction.mockReturnValue({ status: 'registrado' })
})

describe('registrarPagamentoPedido', () => {
  it('registers an external payment through the authenticated cashier transaction', async () => {
    const { registrarPagamentoPedido } = await import('@/lib/actions/pedidos')

    await expect(registrarPagamentoPedido({
      pedidoId: 'pedido-1',
      formaPagamento: 'pix',
      valor: '120,50',
      observacao: 'Pago no balcão',
    })).resolves.toEqual({ status: 'registrado' })

    expect(mocks.requireAccess).toHaveBeenCalledWith('caixa')
    expect(mocks.runInDbTransaction).toHaveBeenCalledTimes(1)
  })

  it('rejects non-positive payment values', async () => {
    const { registrarPagamentoPedido } = await import('@/lib/actions/pedidos')

    await expect(
      registrarPagamentoPedido({ pedidoId: 'pedido-1', formaPagamento: 'pix', valor: '0' })
    ).rejects.toThrow('Valor de pagamento inválido')

    expect(mocks.db.insert).not.toHaveBeenCalled()
  })

  it('rejects cross-tenant or missing orders', async () => {
    const { registrarPagamentoPedido } = await import('@/lib/actions/pedidos')
    mocks.runInDbTransaction.mockImplementationOnce(() => {
      throw new Error('Pedido não encontrado')
    })

    await expect(
      registrarPagamentoPedido({ pedidoId: 'pedido-2', formaPagamento: 'dinheiro', valor: '50' })
    ).rejects.toThrow('Pedido não encontrado')
  })
})
