import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
  requireAccess: vi.fn(async () => ({ usuarioId: 'caixa-1', tenantId: 'tenant-1', access: 'caixa' })),
}))

vi.mock('@/lib/db/index', () => ({
  db: mocks.db,
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
})

describe('registrarPagamentoPedido', () => {
  it('registers an external payment for a delivered order in the selected tenant', async () => {
    const { registrarPagamentoPedido } = await import('@/lib/actions/pedidos')
    const values = vi.fn().mockResolvedValue(undefined)

    mocks.db.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ id: 'pedido-1', status: 'entregue' }]),
      }),
    })
    mocks.db.insert.mockReturnValueOnce({ values })

    await registrarPagamentoPedido({
      pedidoId: 'pedido-1',
      formaPagamento: 'pix',
      valor: '120,50',
      observacao: 'Pago no balcão',
    })

    expect(mocks.requireAccess).toHaveBeenCalledWith('caixa')
    expect(values).toHaveBeenCalledWith({
      id: expect.any(String),
      tenantId: 'tenant-1',
      pedidoId: 'pedido-1',
      registradoPorUsuarioId: 'caixa-1',
      formaPagamento: 'pix',
      valor: '120.50',
      status: 'registrado',
      observacao: 'Pago no balcão',
      registradoEm: expect.any(Date),
    })
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

    mocks.db.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    })

    await expect(
      registrarPagamentoPedido({ pedidoId: 'pedido-2', formaPagamento: 'dinheiro', valor: '50' })
    ).rejects.toThrow('Pedido não encontrado')
  })
})
