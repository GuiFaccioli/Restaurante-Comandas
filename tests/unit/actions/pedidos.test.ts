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
    requireAccess: vi.fn(async () => ({ usuarioId: 'user-1', access: 'garcom' })),
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

vi.mock('@/lib/auth/access', () => ({
  requireAccess: mocks.requireAccess,
}))

vi.mock('@/lib/db/schema', () => ({
  pedido: {
    id: 'pedido.id',
    mesaId: 'pedido.mesa_id',
    status: 'pedido.status',
    criadoEm: 'pedido.criado_em',
    entregueEm: 'pedido.entregue_em',
    atualizadoEm: 'pedido.atualizado_em',
  },
  itemPedido: {
    pedidoId: 'item_pedido.pedido_id',
    produtoId: 'item_pedido.produto_id',
    quantidade: 'item_pedido.quantidade',
    precoUnitario: 'item_pedido.preco_unitario',
    observacao: 'item_pedido.observacao',
  },
  categoria: {
    id: 'categoria.id',
    nome: 'categoria.nome',
  },
  mesa: {
    id: 'mesa.id',
    numero: 'mesa.numero',
  },
  produto: {
    id: 'produto.id',
    categoriaId: 'produto.categoria_id',
    nome: 'produto.nome',
    preco: 'produto.preco',
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

function mockSynchronousTransaction(txInsert: ReturnType<typeof vi.fn>) {
  mocks.db.transaction.mockImplementation((callback) => {
    const result = callback({
      insert: txInsert,
    })

    if (result instanceof Promise) {
      throw new TypeError('Transaction function cannot return a promise')
    }

    return result
  })
}

function mockProductSelect(produto: { nome: string; preco: string; categoriaNome: string }) {
  mocks.db.select.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      innerJoin: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([produto]),
      }),
    }),
  })
}

describe('confirmarPedido', () => {
  it('persists the official order atomically and emits novo_pedido after confirmation', async () => {
    const { confirmarPedido } = await import('@/lib/actions/pedidos')

    const itemValues = vi.fn()
    const itemRun = vi.fn()
    const txInsert = vi.fn().mockReturnValue({
      values: itemValues.mockReturnValue({ run: itemRun }),
    })

    mockSynchronousTransaction(txInsert)

    mockProductSelect({ nome: 'Margherita', preco: '45.00', categoriaNome: 'Pizzas' })

    mocks.db.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ numero: 7 }]),
      }),
    })

    const result = await confirmarPedido('mesa-1', [
      { produtoId: 'produto-1', quantidade: 2, observacao: 'Sem cebola' },
    ])

    expect(result).toEqual({ id: expect.any(String) })
    expect(mocks.db.transaction).toHaveBeenCalledTimes(1)
    expect(mocks.db.select).toHaveBeenCalledTimes(2)
    expect(itemValues).toHaveBeenNthCalledWith(1, {
      id: expect.any(String),
      mesaId: 'mesa-1',
      status: 'novo',
      criadoEm: expect.any(Date),
      entregueEm: null,
      atualizadoEm: expect.any(Date),
    })
    expect(itemValues).toHaveBeenNthCalledWith(2, {
      id: expect.any(String),
      pedidoId: expect.any(String),
      produtoId: 'produto-1',
      quantidade: 2,
      precoUnitario: '45.00',
      observacao: 'Sem cebola',
    })
    expect(itemRun).toHaveBeenCalledTimes(2)
    expect(itemValues.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.notifyKitchen.mock.invocationCallOrder[0]
    )
    expect(mocks.notifyKitchen).toHaveBeenCalledWith({
      type: 'novo_pedido',
      payload: {
        pedidoId: expect.any(String),
        mesaNumero: 7,
        itens: [
          {
            nome: 'Margherita',
            quantidade: 2,
            categoriaNome: 'Pizzas',
            observacao: 'Sem cebola',
          },
        ],
      },
    })
  })

  it('loads mesa before the transaction and still emits novo_pedido', async () => {
    const { confirmarPedido } = await import('@/lib/actions/pedidos')

    const txInsert = vi
      .fn()
      .mockReturnValue({ values: vi.fn().mockReturnValue({ run: vi.fn() }) })

    mockSynchronousTransaction(txInsert)

    mockProductSelect({ nome: 'Calabresa', preco: '50.00', categoriaNome: 'Pizzas' })

    mocks.db.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ numero: 9 }]),
      }),
    })

    const result = await confirmarPedido('mesa-1', [{ produtoId: 'produto-2', quantidade: 1 }])

    expect(result).toEqual({ id: expect.any(String) })
    expect(mocks.db.select).toHaveBeenCalledTimes(2)
    expect(mocks.notifyKitchen).toHaveBeenCalledWith({
      type: 'novo_pedido',
      payload: {
        pedidoId: expect.any(String),
        mesaNumero: 9,
        itens: [
          {
            nome: 'Calabresa',
            quantidade: 1,
            categoriaNome: 'Pizzas',
            observacao: null,
          },
        ],
      },
    })
  })

  it('does not emit novo_pedido if the transaction rejects', async () => {
    const { confirmarPedido } = await import('@/lib/actions/pedidos')

    const transactionError = new Error('insert failed')

    mocks.db.transaction.mockImplementation(() => {
      throw transactionError
    })
    mockProductSelect({ nome: 'Margherita', preco: '45.00', categoriaNome: 'Pizzas' })
    mocks.db.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ numero: 7 }]),
      }),
    })

    await expect(
      confirmarPedido('mesa-1', [{ produtoId: 'produto-1', quantidade: 2 }])
    ).rejects.toThrow('insert failed')

    expect(mocks.db.transaction).toHaveBeenCalledTimes(1)
    expect(mocks.notifyKitchen).not.toHaveBeenCalled()
  })

  it('returns success after persistence even if kitchen notification fails', async () => {
    const { confirmarPedido } = await import('@/lib/actions/pedidos')

    const itemValues = vi.fn()
    const txInsert = vi.fn().mockReturnValue({
      values: itemValues.mockReturnValue({ run: vi.fn() }),
    })

    mockSynchronousTransaction(txInsert)
    mocks.notifyKitchen.mockImplementation(() => {
      throw new Error('sse unavailable')
    })

    mockProductSelect({ nome: 'Margherita', preco: '45.00', categoriaNome: 'Pizzas' })
    mocks.db.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ numero: 7 }]),
      }),
    })

    await expect(
      confirmarPedido('mesa-1', [{ produtoId: 'produto-1', quantidade: 1 }])
    ).resolves.toEqual({ id: expect.any(String) })

    expect(itemValues).toHaveBeenCalledTimes(2)
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

describe('confirmarEntrega', () => {
  it('requires waiter access before confirming delivery', async () => {
    const { confirmarEntrega } = await import('@/lib/actions/pedidos')

    mocks.db.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ status: 'novo' }]),
      }),
    })
    mocks.db.update.mockReturnValueOnce({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })

    await confirmarEntrega('pedido-1')

    expect(mocks.requireAccess).toHaveBeenCalledWith('garcom')
  })

  it('rejects delivery confirmation for a non-new order', async () => {
    const { confirmarEntrega } = await import('@/lib/actions/pedidos')

    mocks.db.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ status: 'pronto' }]),
      }),
    })

    await expect(confirmarEntrega('pedido-1')).rejects.toThrow(
      'Só pedidos novos podem ser confirmados como entregues'
    )

    expect(mocks.db.update).not.toHaveBeenCalled()
    expect(mocks.notifyKitchen).not.toHaveBeenCalled()
  })

  it('marks a new order as delivered with delivery timestamp and emits status_atualizado', async () => {
    const { confirmarEntrega } = await import('@/lib/actions/pedidos')
    const set = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    })

    mocks.db.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ status: 'novo' }]),
      }),
    })
    mocks.db.update.mockReturnValueOnce({ set })

    await confirmarEntrega('pedido-1')

    expect(set).toHaveBeenCalledWith({
      status: 'entregue',
      entregueEm: expect.any(Date),
      atualizadoEm: expect.any(Date),
    })
    expect(mocks.notifyKitchen).toHaveBeenCalledWith({
      type: 'status_atualizado',
      payload: { pedidoId: 'pedido-1', status: 'entregue' },
    })
  })
})
