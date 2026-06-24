import { beforeEach, describe, expect, it, vi } from 'vitest'

process.env.DEV_SKIP_AUTH = 'true'

const mocks = vi.hoisted(() => {
  const db = {
    insert: vi.fn(),
    select: vi.fn(),
    transaction: vi.fn(),
    update: vi.fn(),
  }

  return {
    redirect: vi.fn(),
    notifyKitchen: vi.fn(),
    db,
  }
})

vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
}))

vi.mock('@/lib/db/index', () => ({
  db: mocks.db,
}))

vi.mock('@/lib/sse', () => ({
  notifyKitchen: mocks.notifyKitchen,
}))

vi.mock('@/lib/db/schema', () => ({
  pedido: {
    id: 'pedido.id',
    mesaId: 'pedido.mesa_id',
    status: 'pedido.status',
    atualizadoEm: 'pedido.atualizado_em',
  },
  itemPedido: {
    pedidoId: 'item_pedido.pedido_id',
    produtoId: 'item_pedido.produto_id',
    quantidade: 'item_pedido.quantidade',
    precoUnitario: 'item_pedido.preco_unitario',
    observacao: 'item_pedido.observacao',
  },
  mesa: {
    id: 'mesa.id',
    numero: 'mesa.numero',
  },
  produto: {
    id: 'produto.id',
    nome: 'produto.nome',
    preco: 'produto.preco',
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('confirmarPedido', () => {
  it('persists the official order atomically and emits novo_pedido after confirmation', async () => {
    const { confirmarPedido } = await import('@/lib/actions/pedidos')

    const returning = vi.fn().mockResolvedValue([{ id: 'pedido-1' }])
    const itemValues = vi.fn()
    const txInsert = vi
      .fn()
      .mockReturnValueOnce({
        values: vi.fn().mockReturnValue({ returning }),
      })
      .mockReturnValueOnce({
        values: itemValues,
      })

    mocks.db.transaction.mockImplementation(async (callback) => callback({ insert: txInsert }))

    mocks.db.select
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ nome: 'Margherita', preco: '45.00' }]),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ numero: 7 }]),
        }),
      })

    const result = await confirmarPedido('mesa-1', [
      { produtoId: 'produto-1', quantidade: 2, observacao: 'Sem cebola' },
    ])

    expect(result).toEqual({ id: 'pedido-1' })
    expect(mocks.db.transaction).toHaveBeenCalledTimes(1)
    expect(returning).toHaveBeenCalledWith({ id: 'pedido.id' })
    expect(itemValues).toHaveBeenCalledWith({
      pedidoId: 'pedido-1',
      produtoId: 'produto-1',
      quantidade: 2,
      precoUnitario: '45.00',
      observacao: 'Sem cebola',
    })
    expect(itemValues.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.notifyKitchen.mock.invocationCallOrder[0]
    )
    expect(mocks.notifyKitchen).toHaveBeenCalledWith({
      type: 'novo_pedido',
      payload: {
        pedidoId: 'pedido-1',
        mesaNumero: 7,
        itens: ['2x Margherita'],
      },
    })
  })

  it('does not emit novo_pedido if the transaction rejects', async () => {
    const { confirmarPedido } = await import('@/lib/actions/pedidos')

    const transactionError = new Error('insert failed')

    mocks.db.transaction.mockRejectedValue(transactionError)
    mocks.db.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ nome: 'Margherita', preco: '45.00' }]),
      }),
    })

    await expect(
      confirmarPedido('mesa-1', [{ produtoId: 'produto-1', quantidade: 2 }])
    ).rejects.toThrow('insert failed')

    expect(mocks.db.transaction).toHaveBeenCalledTimes(1)
    expect(mocks.notifyKitchen).not.toHaveBeenCalled()
  })

  it('does not emit novo_pedido for an empty cart', async () => {
    const { confirmarPedido } = await import('@/lib/actions/pedidos')
    await expect(confirmarPedido('mesa-1', [])).rejects.toThrow('Pedido vazio')

    expect(mocks.db.transaction).not.toHaveBeenCalled()
    expect(mocks.notifyKitchen).not.toHaveBeenCalled()
  })

  it('does not emit novo_pedido for an invalid item', async () => {
    const { confirmarPedido } = await import('@/lib/actions/pedidos')
    await expect(confirmarPedido('mesa-1', [{ produtoId: '', quantidade: 1 }])).rejects.toThrow(
      'Item inválido'
    )

    expect(mocks.db.transaction).not.toHaveBeenCalled()
    expect(mocks.notifyKitchen).not.toHaveBeenCalled()
  })
})
