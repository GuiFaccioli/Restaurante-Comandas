import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  db: { select: vi.fn() },
}))

vi.mock('@/lib/db/index', () => ({ db: mocks.db }))

vi.mock('drizzle-orm', () => ({
  and: vi.fn((...conditions: unknown[]) => conditions),
  desc: vi.fn((column: unknown) => column),
  eq: vi.fn((left: unknown, right: unknown) => ({ left, right })),
  inArray: vi.fn((left: unknown, right: unknown[]) => ({ left, right })),
  ne: vi.fn((left: unknown, right: unknown) => ({ left, right })),
}))

vi.mock('@/lib/db/schema', () => ({
  pedido: {
    id: 'pedido.id', tenantId: 'pedido.tenant_id', mesaId: 'pedido.mesa_id',
    createdByUserId: 'pedido.created_by_user_id', canal: 'pedido.canal', clienteNomeSnapshot: 'pedido.cliente_nome_snapshot',
    enderecoSnapshot: 'pedido.endereco_snapshot', taxaEntregaAplicada: 'pedido.taxa_entrega_aplicada', status: 'pedido.status',
    criadoEm: 'pedido.criado_em', entregueEm: 'pedido.entregue_em',
  },
  mesa: { id: 'mesa.id', tenantId: 'mesa.tenant_id', numero: 'mesa.numero' },
  itemPedido: {
    pedidoId: 'item_pedido.pedido_id', produtoId: 'item_pedido.produto_id',
    quantidade: 'item_pedido.quantidade', precoUnitario: 'item_pedido.preco_unitario',
    observacao: 'item_pedido.observacao',
  },
  produto: { id: 'produto.id', nome: 'produto.nome' },
  pagamentoPedido: {
    pedidoId: 'pagamento_pedido.pedido_id', tenantId: 'pagamento_pedido.tenant_id',
    status: 'pagamento_pedido.status',
    registradoPorUsuarioId: 'pagamento_pedido.registrado_por_usuario_id',
    valor: 'pagamento_pedido.valor', registradoEm: 'pagamento_pedido.registrado_em',
  },
  tenantUser: {
    tenantId: 'tenant_user.tenant_id', usuarioId: 'tenant_user.usuario_id',
  },
  usuario: { id: 'usuario.id', nome: 'usuario.nome' },
}))

import { getCashierOrders } from '@/lib/orders/queries'

type PaymentRow = {
  pedidoId: string
  status: 'registrado' | 'estornado'
  registradoPorUsuarioId: string
  valor: string
  registradoEm: Date
}

type MembershipRow = { tenantId: string; usuarioId: string; nome: string }

function mockCashierQuery(input: {
  createdByUserId: string | null
  payments: PaymentRow[]
  memberships: MembershipRow[]
}) {
  const order = {
    id: 'order-a', status: 'entregue' as const,
    criadoEm: new Date('2026-07-13T12:00:00.000Z'),
    entregueEm: new Date('2026-07-13T12:15:00.000Z'),
    mesaNumero: null, canal: 'delivery', clienteNomeSnapshot: 'Ana Snapshot', enderecoSnapshot: { rua: 'Rua do Pedido', numero: '10' }, taxaEntregaAplicada: '5.00', createdByUserId: input.createdByUserId,
  }

  mocks.db.select
    .mockReturnValueOnce({
      from: vi.fn(() => ({
        leftJoin: vi.fn(() => ({
          where: vi.fn(() => ({ orderBy: vi.fn(async () => [order]) })),
        })),
      })),
    })
    .mockReturnValueOnce({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({ where: vi.fn(async () => []) })),
      })),
    })
    .mockReturnValueOnce({
      from: vi.fn(() => ({ where: vi.fn(async () => input.payments) })),
    })
    .mockReturnValueOnce({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({ where: vi.fn(async () => input.memberships) })),
      })),
    })
}

beforeEach(() => {
  mocks.db.select.mockReset()
})

describe('getCashierOrders responsible integration', () => {
  it('does not leak mixed-tenant creator or registrar names from query candidates', async () => {
    mockCashierQuery({
      createdByUserId: 'waiter-b',
      payments: [{
        pedidoId: 'order-a', status: 'registrado',
        registradoPorUsuarioId: 'cashier-b', valor: '90.00',
        registradoEm: new Date('2026-07-13T12:30:00.000Z'),
      }],
      memberships: [
        { tenantId: 'tenant-a', usuarioId: 'waiter-a', nome: 'Alice Garçom' },
        { tenantId: 'tenant-b', usuarioId: 'waiter-b', nome: 'Bruno Garçom' },
        { tenantId: 'tenant-b', usuarioId: 'cashier-b', nome: 'Bianca Caixa' },
      ],
    })

    const [order] = await getCashierOrders({ tenantId: 'tenant-a' })

    expect(order.criadoPor).toBeNull()
    expect(order.pagamentoStatus).toBe('pago')
    expect(order.pagamento?.registradoPor).toBeNull()
    expect(order.mesaNumero).toBeNull()
    expect(order.canal).toBe('delivery')
    expect(order.enderecoSnapshot).toEqual({ rua: 'Rua do Pedido', numero: '10' })
  })

  it('treats an estornado-only order as pending with no payment metadata', async () => {
    mockCashierQuery({
      createdByUserId: 'waiter-a',
      payments: [{
        pedidoId: 'order-a', status: 'estornado',
        registradoPorUsuarioId: 'cashier-a', valor: '48.00',
        registradoEm: new Date('2026-07-13T12:30:00.000Z'),
      }],
      memberships: [
        { tenantId: 'tenant-a', usuarioId: 'waiter-a', nome: 'Alice Garçom' },
        { tenantId: 'tenant-a', usuarioId: 'cashier-a', nome: 'Carlos Caixa' },
      ],
    })

    const [order] = await getCashierOrders({ tenantId: 'tenant-a' })

    expect(order.criadoPor).toEqual({ usuarioId: 'waiter-a', nome: 'Alice Garçom' })
    expect(order.pagamentoStatus).toBe('pendente')
    expect(order.pagamento).toBeNull()
  })

  it('returns matching-tenant creator and active payment registrar', async () => {
    mockCashierQuery({
      createdByUserId: 'waiter-a',
      payments: [{
        pedidoId: 'order-a', status: 'registrado',
        registradoPorUsuarioId: 'cashier-a', valor: '48.00',
        registradoEm: new Date('2026-07-13T12:30:00.000Z'),
      }],
      memberships: [
        { tenantId: 'tenant-a', usuarioId: 'waiter-a', nome: 'Alice Garçom' },
        { tenantId: 'tenant-a', usuarioId: 'cashier-a', nome: 'Carlos Caixa' },
        { tenantId: 'tenant-b', usuarioId: 'cashier-b', nome: 'Bianca Caixa' },
      ],
    })

    const [order] = await getCashierOrders({ tenantId: 'tenant-a' })

    expect(order.criadoPor).toEqual({ usuarioId: 'waiter-a', nome: 'Alice Garçom' })
    expect(order.pagamento).toEqual({
      valor: 48,
      registradoEm: '2026-07-13T12:30:00.000Z',
      registradoPor: { usuarioId: 'cashier-a', nome: 'Carlos Caixa' },
    })
  })
})
