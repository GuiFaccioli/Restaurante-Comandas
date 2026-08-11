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
  cancelOrderInPostgresTransaction,
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

function selectedRows<T>(rows: T[]) {
  return {
    from: vi.fn(() => ({
      where: vi.fn(async () => rows),
    })),
  }
}

function orderedRows<T>(rows: T[]) {
  return {
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        orderBy: vi.fn(async () => rows),
      })),
    })),
  }
}

function controlledOrderSelections() {
  return [
    lockedQuery([{ numero: 7 }]),
    lockedQuery([{
      id: 'atendimento-1', mesaId: 'mesa-1', status: 'open' as const,
    }]),
    lockedQuery([{
      nome: 'Pizza', preco: '42.00', categoriaNome: 'Pratos',
      controleEstoque: true,
    }]),
    selectedRows([{ produtoId: 'produto-1', insumoId: 'insumo-1' }]),
    lockedQuery([{
      id: 'insumo-1', tenantId: 'tenant-1', ativo: true,
    }]),
    orderedRows([{
      produtoId: 'produto-1', insumoId: 'insumo-1', quantidade: '3.000',
    }]),
  ] as const
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

  it('rejects creation when locked aggregate demand exceeds stock', async () => {
    const selections = controlledOrderSelections()
    const tx = {
      select: vi.fn()
        .mockReturnValueOnce(selections[0])
        .mockReturnValueOnce(selections[1])
        .mockReturnValueOnce(selections[2])
        .mockReturnValueOnce(selections[3])
        .mockReturnValueOnce(selections[4])
        .mockReturnValueOnce(selections[5]),
      insert: vi.fn(() => ({ values: vi.fn(async () => undefined) })),
    }
    mocks.lockStockItemInPostgresTransaction.mockResolvedValue({
      nome: 'Farinha', estoqueAtual: '4.000', custoUnitario: '2.0000',
    })

    await expect(createOrderInPostgresTransaction(tx as never, {
      tenantId: 'tenant-1', usuarioId: 'user-1', mesaId: 'mesa-1',
      atendimentoId: 'atendimento-1',
      items: [
        { produtoId: 'produto-1', quantidade: 1 },
        { produtoId: 'produto-1', quantidade: 1 },
      ],
    })).rejects.toThrow('Não há estoque suficiente para Farinha')

    expect(mocks.lockStockItemInPostgresTransaction).toHaveBeenCalledWith(
      tx, 'tenant-1', 'insumo-1',
    )
    expect(mocks.applyStockMovementInPostgresTransaction).not.toHaveBeenCalled()
  })

  it('consumes at creation and reverses a cancelled new order once', async () => {
    const selections = controlledOrderSelections()
    const inserted: Array<Record<string, unknown>> = []
    const insert = vi.fn(() => ({
      values: vi.fn(async (values: Record<string, unknown>) => {
        inserted.push(values)
      }),
    }))
    const cancellationSnapshots = {
      from: vi.fn(() => ({
        where: vi.fn(async () => [{
          itemPedidoId: inserted.find((values) => values.produtoId)?.id,
          insumoId: 'insumo-1',
          quantidadeTotal: '3.000',
        }]),
      })),
    }
    const cancelledOrder = lockedQuery([{ status: 'cancelado' as const }])
    const tx = {
      select: vi.fn()
        .mockReturnValueOnce(selections[0])
        .mockReturnValueOnce(selections[1])
        .mockReturnValueOnce(selections[2])
        .mockReturnValueOnce(selections[3])
        .mockReturnValueOnce(selections[4])
        .mockReturnValueOnce(selections[5])
        .mockReturnValueOnce(lockedQuery([{ status: 'novo' as const }]))
        .mockReturnValueOnce(cancellationSnapshots)
        .mockReturnValueOnce(cancelledOrder),
      insert,
      update: vi.fn(() => ({
        set: vi.fn(() => ({ where: vi.fn(async () => undefined) })),
      })),
    }

    const created = await createOrderInPostgresTransaction(tx as never, {
      tenantId: 'tenant-1', usuarioId: 'user-1', mesaId: 'mesa-1',
      atendimentoId: 'atendimento-1',
      items: [{ produtoId: 'produto-1', quantidade: 1 }],
    })
    expect(tx.select).toHaveBeenCalledTimes(6)
    await cancelOrderInPostgresTransaction(tx as never, {
      tenantId: 'tenant-1', pedidoId: created.id,
    })
    await cancelOrderInPostgresTransaction(tx as never, {
      tenantId: 'tenant-1', pedidoId: created.id,
    })

    expect(inserted).toEqual(expect.arrayContaining([
      expect.objectContaining({ pedidoId: created.id, quantidadeTotal: '3.000' }),
    ]))
    expect(mocks.applyStockMovementInPostgresTransaction).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        tenantId: 'tenant-1', pedidoId: created.id, insumoId: 'insumo-1',
        tipo: 'saida', quantidade: -3,
      }),
    )
    expect(mocks.applyStockMovementInPostgresTransaction).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        tenantId: 'tenant-1', pedidoId: created.id, insumoId: 'insumo-1',
        tipo: 'estorno', quantidade: 3,
      }),
    )
    expect(mocks.applyStockMovementInPostgresTransaction).toHaveBeenCalledTimes(2)
    const consumption = mocks.applyStockMovementInPostgresTransaction.mock.calls[0][1]
    const reversal = mocks.applyStockMovementInPostgresTransaction.mock.calls[1][1]
    expect(reversal.itemPedidoId).toBe(consumption.itemPedidoId)
    expect(reversal.chaveIdempotencia).toBe(
      consumption.chaveIdempotencia.replace(/^consumo:/, 'estorno:'),
    )
  })

  it('does not consume again when a new order enters preparation', async () => {
    const current = lockedQuery([{ status: 'novo' as const }])
    const updateWhere = vi.fn(async () => undefined)
    const tx = {
      select: vi.fn().mockReturnValueOnce(current),
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

  it('makes the attendance available to the cashier when its last order is delivered', async () => {
    const current = lockedQuery([{ status: 'pronto' as const, atendimentoId: 'atendimento-1' }])
    const attendanceOrders = {
      from: vi.fn(() => ({
        where: vi.fn(async () => [{ status: 'entregue' as const }]),
      })),
    }
    const updateValues: unknown[] = []
    const tx = {
      select: vi.fn()
        .mockReturnValueOnce(current)
        .mockReturnValueOnce(attendanceOrders),
      update: vi.fn(() => ({
        set: vi.fn((values: unknown) => {
          updateValues.push(values)
          return { where: vi.fn(async () => undefined) }
        }),
      })),
    }

    await expect(transitionOrderInPostgresTransaction(tx as never, {
      tenantId: 'tenant-1', usuarioId: 'user-1', pedidoId: 'pedido-1',
      targetStatus: 'entregue',
    })).resolves.toEqual({ changed: true, status: 'entregue' })

    expect(updateValues).toHaveLength(2)
    expect(updateValues[1]).toEqual(expect.objectContaining({
      status: 'awaiting_payment',
    }))
  })

  it('reopens an awaiting attendance when the waiter adds another order to it', async () => {
    const table = lockedQuery([{ numero: 7 }])
    const attendance = lockedQuery([{
      id: 'atendimento-1', mesaId: 'mesa-1', status: 'awaiting_payment' as const,
    }])
    const product = lockedQuery([{
      nome: 'Pizza', preco: '42.00', categoriaNome: 'Pratos', controleEstoque: false,
    }])
    const updateValues: unknown[] = []
    const insert = vi.fn(() => ({ values: vi.fn(async () => undefined) }))
    const tx = {
      select: vi.fn()
        .mockReturnValueOnce(table)
        .mockReturnValueOnce(attendance)
        .mockReturnValueOnce(product),
      update: vi.fn(() => ({
        set: vi.fn((values: unknown) => {
          updateValues.push(values)
          return { where: vi.fn(async () => undefined) }
        }),
      })),
      insert,
    }

    await expect(createOrderInPostgresTransaction(tx as never, {
      tenantId: 'tenant-1', usuarioId: 'user-1', mesaId: 'mesa-1',
      atendimentoId: 'atendimento-1', items: [{ produtoId: 'produto-1', quantidade: 1 }],
    })).resolves.toMatchObject({ mesaNumero: 7 })

    expect(updateValues[0]).toEqual(expect.objectContaining({
      status: 'open', aguardandoPagamentoEm: null,
    }))
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

  it('marks an attendance as canceled when its last order is canceled', async () => {
    const current = lockedQuery([{ status: 'novo' as const, atendimentoId: 'atendimento-1' }])
    const orders = {
      from: vi.fn(() => ({
        where: vi.fn(async () => [{ status: 'cancelado' as const }]),
      })),
    }
    const updateValues: unknown[] = []
    const tx = {
      select: vi.fn()
        .mockReturnValueOnce(current)
        .mockReturnValueOnce(selectedRows([]))
        .mockReturnValueOnce(orders),
      update: vi.fn(() => ({
        set: vi.fn((values: unknown) => {
          updateValues.push(values)
          return { where: vi.fn(async () => undefined) }
        }),
      })),
    }

    await expect(cancelOrderInPostgresTransaction(tx as never, {
      tenantId: 'tenant-1', usuarioId: 'user-1', pedidoId: 'pedido-1',
    })).resolves.toEqual({ changed: true, status: 'cancelado' })

    expect(updateValues).toEqual([
      expect.objectContaining({ status: 'cancelado' }),
      expect.objectContaining({ status: 'cancelled' }),
    ])
  })

})
