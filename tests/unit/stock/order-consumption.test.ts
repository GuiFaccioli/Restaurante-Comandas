import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  and: vi.fn((...conditions: unknown[]) => conditions),
  eq: vi.fn((left: unknown, right: unknown) => ({ left, right })),
  inArray: vi.fn((left: unknown, right: unknown) => ({ left, right })),
  applyStockMovementInPostgresTransaction: vi.fn(),
  lockStockItemInPostgresTransaction: vi.fn(),
}))

vi.mock('drizzle-orm', () => ({
  and: mocks.and,
  asc: vi.fn((value: unknown) => value),
  eq: mocks.eq,
  inArray: mocks.inArray,
}))

vi.mock('@/lib/stock/service', () => ({
  applyStockMovementInPostgresTransaction:
    mocks.applyStockMovementInPostgresTransaction,
  lockStockItemInPostgresTransaction: mocks.lockStockItemInPostgresTransaction,
  stockMillisToDecimal: (millis: number) => `${millis / 1_000}.000`,
  stockQuantityToMillis: (value: string | number) => Math.round(Number(value) * 1_000),
}))

import * as schema from '@/lib/db/schema'
import {
  createOrderInPostgresTransaction,
  transitionOrderInPostgresTransaction,
} from '@/lib/stock/order-consumption'

function lockedQuery<T>(rows: T[]) {
  const lock = vi.fn(async () => rows)
  const where = vi.fn(() => ({ for: lock }))
  const joined = { where }
  return {
    lock,
    where,
    from: vi.fn(() => ({
      where,
      innerJoin: vi.fn(() => joined),
    })),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.lockStockItemInPostgresTransaction.mockResolvedValue({
    nome: 'Queijo',
    estoqueAtual: '10.000',
    custoUnitario: '2.0000',
  })
})

describe('PostgreSQL order consumption', () => {
  it('locks tenant-scoped tables and products in deterministic product-id order', async () => {
    const table = lockedQuery([{ numero: 7 }])
    const attendance = lockedQuery([{ id: 'atendimento-1', mesaId: 'mesa-1', status: 'open' as const }])
    const firstProduct = lockedQuery([{
      nome: 'A', preco: '10.00', categoriaNome: 'Pizzas', controleEstoque: false,
    }])
    const secondProduct = lockedQuery([{
      nome: 'B', preco: '12.00', categoriaNome: 'Pizzas', controleEstoque: false,
    }])
    const insert = vi.fn(() => ({ values: vi.fn(async () => undefined) }))
    const tx = {
      select: vi.fn()
        .mockReturnValueOnce(table)
        .mockReturnValueOnce(attendance)
        .mockReturnValueOnce(firstProduct)
        .mockReturnValueOnce(secondProduct),
      insert,
    }

    await createOrderInPostgresTransaction(tx as never, {
      tenantId: 'tenant-1', usuarioId: 'user-1', mesaId: 'mesa-1', atendimentoId: 'atendimento-1',
      items: [
        { produtoId: 'produto-b', quantidade: 1 },
        { produtoId: 'produto-a', quantidade: 1 },
      ],
    })

    expect(table.lock).toHaveBeenCalledWith('update')
    expect(firstProduct.lock).toHaveBeenCalledWith('update')
    expect(secondProduct.lock).toHaveBeenCalledWith('update')
    expect(table.where).toHaveBeenCalledWith(expect.arrayContaining([
      { left: schema.mesa.id, right: 'mesa-1' },
      { left: schema.mesa.tenantId, right: 'tenant-1' },
      { left: schema.mesa.ativa, right: true },
    ]))
    expect(firstProduct.where).toHaveBeenCalledWith(expect.arrayContaining([
      { left: schema.produto.id, right: 'produto-a' },
      { left: schema.produto.tenantId, right: 'tenant-1' },
      { left: schema.produto.disponivel, right: true },
      { left: schema.categoria.tenantId, right: 'tenant-1' },
    ]))
    expect(secondProduct.where).toHaveBeenCalledWith(expect.arrayContaining([
      { left: schema.produto.id, right: 'produto-b' },
      { left: schema.produto.tenantId, right: 'tenant-1' },
    ]))
    expect(tx.select).toHaveBeenCalledTimes(4)
    expect(insert).toHaveBeenCalledTimes(3)
  })

  it('consumes the tenant snapshot before marking a new order as in preparation', async () => {
    const current = lockedQuery([{ status: 'novo' as const }])
    const snapshots = [{
      itemPedidoId: 'item-1', insumoId: 'insumo-1', quantidadeTotal: '2.000',
    }]
    const effects: string[] = []
    mocks.applyStockMovementInPostgresTransaction.mockImplementation(async () => {
      effects.push('consume-snapshot')
    })
    const updateWhere = vi.fn(async () => {
      effects.push('update-status')
    })
    const tx = {
      select: vi.fn()
        .mockReturnValueOnce(current)
        .mockReturnValueOnce({ from: vi.fn(() => ({ where: vi.fn(async () => snapshots) })) })
        .mockReturnValueOnce({ from: vi.fn(() => ({ where: vi.fn(async () => []) })) }),
      update: vi.fn(() => ({ set: vi.fn(() => ({ where: updateWhere })) })),
    }

    await expect(transitionOrderInPostgresTransaction(tx as never, {
      tenantId: 'tenant-1', usuarioId: 'user-1', pedidoId: 'pedido-1',
      targetStatus: 'em_preparo',
    })).resolves.toEqual({ changed: true, status: 'em_preparo' })

    expect(current.lock).toHaveBeenCalledWith('update')
    expect(mocks.lockStockItemInPostgresTransaction).toHaveBeenCalledWith(
      tx, 'tenant-1', 'insumo-1',
    )
    expect(mocks.applyStockMovementInPostgresTransaction).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        tenantId: 'tenant-1', pedidoId: 'pedido-1', itemPedidoId: 'item-1',
        insumoId: 'insumo-1', tipo: 'saida', quantidade: -2,
      }),
    )
    expect(updateWhere).toHaveBeenCalledTimes(1)
    expect(effects).toEqual(['consume-snapshot', 'update-status'])
  })

  it('consumes stock before directly delivering a new order', async () => {
    const current = lockedQuery([{ status: 'novo' as const }])
    const snapshots = [{ itemPedidoId: 'item-1', insumoId: 'insumo-1', quantidadeTotal: '2.000' }]
    const effects: string[] = []
    mocks.applyStockMovementInPostgresTransaction.mockImplementation(async () => effects.push('consume-snapshot'))
    const updateWhere = vi.fn(async () => effects.push('update-status'))
    const tx = {
      select: vi.fn()
        .mockReturnValueOnce(current)
        .mockReturnValueOnce({ from: vi.fn(() => ({ where: vi.fn(async () => snapshots) })) })
        .mockReturnValueOnce({ from: vi.fn(() => ({ where: vi.fn(async () => []) })) }),
      update: vi.fn(() => ({ set: vi.fn(() => ({ where: updateWhere })) })),
    }

    await expect(transitionOrderInPostgresTransaction(tx as never, {
      tenantId: 'tenant-1', usuarioId: 'user-1', pedidoId: 'pedido-1', targetStatus: 'entregue',
    })).resolves.toEqual({ changed: true, status: 'entregue' })

    expect(effects).toEqual(['consume-snapshot', 'update-status'])
  })

  it('keeps a repeated PostgreSQL status transition idempotent', async () => {
    const current = lockedQuery([{ status: 'em_preparo' as const }])
    const tx = {
      select: vi.fn(() => current),
      update: vi.fn(),
    }

    await expect(transitionOrderInPostgresTransaction(tx as never, {
      tenantId: 'tenant-1', usuarioId: 'user-1', pedidoId: 'pedido-1',
      targetStatus: 'em_preparo',
    })).resolves.toEqual({ changed: false, status: 'em_preparo' })

    expect(current.lock).toHaveBeenCalledWith('update')
    expect(mocks.applyStockMovementInPostgresTransaction).not.toHaveBeenCalled()
    expect(tx.update).not.toHaveBeenCalled()
  })

  it('retries a partially applied preparation without duplicating an existing movement', async () => {
    const current = lockedQuery([{ status: 'novo' as const }])
    const snapshots = [{
      itemPedidoId: 'item-1', insumoId: 'insumo-1', quantidadeTotal: '2.000',
    }]
    const existingKey = 'consumo:tenant-1:pedido:pedido-1:item:item-1:insumo:insumo-1'
    const updateWhere = vi.fn(async () => undefined)
    const tx = {
      select: vi.fn()
        .mockReturnValueOnce(current)
        .mockReturnValueOnce({ from: vi.fn(() => ({ where: vi.fn(async () => snapshots) })) })
        .mockReturnValueOnce({
          from: vi.fn(() => ({
            where: vi.fn(async () => [{ chaveIdempotencia: existingKey }]),
          })),
        }),
      update: vi.fn(() => ({ set: vi.fn(() => ({ where: updateWhere })) })),
    }

    await expect(transitionOrderInPostgresTransaction(tx as never, {
      tenantId: 'tenant-1', usuarioId: 'user-1', pedidoId: 'pedido-1',
      targetStatus: 'em_preparo',
    })).resolves.toEqual({ changed: true, status: 'em_preparo' })

    expect(mocks.lockStockItemInPostgresTransaction).not.toHaveBeenCalled()
    expect(mocks.applyStockMovementInPostgresTransaction).not.toHaveBeenCalled()
    expect(updateWhere).toHaveBeenCalledTimes(1)
  })
})
