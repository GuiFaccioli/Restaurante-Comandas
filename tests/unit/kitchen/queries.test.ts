import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ db: { select: vi.fn() } }))

vi.mock('@/lib/db/index', () => ({ db: mocks.db }))
vi.mock('drizzle-orm', () => ({
  and: vi.fn((...conditions: unknown[]) => conditions),
  desc: vi.fn((column: unknown) => column),
  eq: vi.fn((left: unknown, right: unknown) => ({ left, right })),
  inArray: vi.fn((left: unknown, right: unknown[]) => ({ left, right })),
}))
vi.mock('@/lib/db/schema', () => ({
  categoria: { nome: 'categoria.nome' },
  itemPedido: { pedidoId: 'item_pedido.pedido_id', produtoId: 'item_pedido.produto_id', quantidade: 'item_pedido.quantidade', observacao: 'item_pedido.observacao' },
  mesa: { id: 'mesa.id', numero: 'mesa.numero' },
  pedido: { id: 'pedido.id', status: 'pedido.status', criadoEm: 'pedido.criado_em', mesaId: 'pedido.mesa_id', tenantId: 'pedido.tenant_id' },
  produto: { id: 'produto.id', nome: 'produto.nome', categoriaId: 'produto.categoria_id' },
}))

import { getKitchenOrders } from '@/lib/kitchen/queries'

beforeEach(() => {
  mocks.db.select.mockReset()
})

describe('getKitchenOrders', () => {
  it('loads only active orders for the requested tenant and attaches their items', async () => {
    mocks.db.select
      .mockReturnValueOnce({
        from: vi.fn(() => ({
          innerJoin: vi.fn(() => ({ where: vi.fn(() => ({ orderBy: vi.fn(async () => [{ id: 'order-a', status: 'novo', criadoEm: new Date('2026-07-26T12:00:00.000Z'), mesaNumero: 8 }]) })) })),
        })),
      })
      .mockReturnValueOnce({
        from: vi.fn(() => ({ innerJoin: vi.fn(() => ({ innerJoin: vi.fn(() => ({ where: vi.fn(async () => [{ pedidoId: 'order-a', nome: 'Pizza', quantidade: 1, observacao: null, categoriaNome: 'Pizzas' }]) })) })) })),
      })

    await expect(getKitchenOrders({ tenantId: 'tenant-a' })).resolves.toEqual([
      {
        id: 'order-a', status: 'novo', criadoEm: '2026-07-26T12:00:00.000Z', mesaNumero: 8,
        itens: [{ pedidoId: 'order-a', nome: 'Pizza', quantidade: 1, observacao: null, categoriaNome: 'Pizzas' }],
      },
    ])
  })
})
