import { beforeEach, describe, expect, it, vi } from 'vitest'

type TransactionOperations = {
  sqliteOperation: (transaction: unknown) => unknown
  postgresOperation: (transaction: unknown) => Promise<unknown>
}

const mocks = vi.hoisted(() => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
    transaction: vi.fn(),
    update: vi.fn(),
  },
  runInDbTransaction: vi.fn(),
  notifyKitchen: vi.fn(),
  requireAccess: vi.fn(async () => ({
    usuarioId: 'user-1',
    tenantId: 'tenant-1',
    access: 'garcom',
  })),
  createOrderInSqliteTransaction: vi.fn(),
  createOrderInPostgresTransaction: vi.fn(),
  transitionOrderInSqliteTransaction: vi.fn(),
  transitionOrderInPostgresTransaction: vi.fn(),
  cancelOrderInSqliteTransaction: vi.fn(),
  cancelOrderInPostgresTransaction: vi.fn(),
  and: vi.fn((...conditions: unknown[]) => conditions),
  eq: vi.fn((left: unknown, right: unknown) => ({ left, right })),
}))

vi.mock('@/lib/db/index', () => ({
  db: mocks.db,
  runInDbTransaction: mocks.runInDbTransaction,
}))

vi.mock('drizzle-orm', () => ({
  and: mocks.and,
  eq: mocks.eq,
}))

vi.mock('@/lib/db/schema', () => ({
  pedido: {
    id: 'pedido.id',
    tenantId: 'pedido.tenant_id',
    status: 'pedido.status',
  },
  itemPedido: {
    pedidoId: 'item_pedido.pedido_id',
    tenantId: 'item_pedido.tenant_id',
    quantidade: 'item_pedido.quantidade',
    precoUnitario: 'item_pedido.preco_unitario',
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

vi.mock('@/lib/db/schema-sqlite', () => ({
  pedido: {
    id: 'sqlite_pedido.id',
    tenantId: 'sqlite_pedido.tenant_id',
    status: 'sqlite_pedido.status',
  },
  itemPedido: {
    pedidoId: 'sqlite_item_pedido.pedido_id',
    tenantId: 'sqlite_item_pedido.tenant_id',
    quantidade: 'sqlite_item_pedido.quantidade',
    precoUnitario: 'sqlite_item_pedido.preco_unitario',
  },
  pagamentoPedido: {
    id: 'sqlite_pagamento_pedido.id',
    tenantId: 'sqlite_pagamento_pedido.tenant_id',
    pedidoId: 'sqlite_pagamento_pedido.pedido_id',
    registradoPorUsuarioId:
      'sqlite_pagamento_pedido.registrado_por_usuario_id',
    formaPagamento: 'sqlite_pagamento_pedido.forma_pagamento',
    valor: 'sqlite_pagamento_pedido.valor',
    status: 'sqlite_pagamento_pedido.status',
    observacao: 'sqlite_pagamento_pedido.observacao',
    registradoEm: 'sqlite_pagamento_pedido.registrado_em',
  },
}))

vi.mock('@/lib/sse', () => ({
  notifyKitchen: mocks.notifyKitchen,
}))

vi.mock('@/lib/auth/access', () => ({
  requireAccess: mocks.requireAccess,
}))

vi.mock('@/lib/stock/order-consumption', () => ({
  createOrderInSqliteTransaction: mocks.createOrderInSqliteTransaction,
  createOrderInPostgresTransaction: mocks.createOrderInPostgresTransaction,
  transitionOrderInSqliteTransaction:
    mocks.transitionOrderInSqliteTransaction,
  transitionOrderInPostgresTransaction:
    mocks.transitionOrderInPostgresTransaction,
  cancelOrderInSqliteTransaction: mocks.cancelOrderInSqliteTransaction,
  cancelOrderInPostgresTransaction: mocks.cancelOrderInPostgresTransaction,
}))

function createdOrder() {
  return {
    id: 'pedido-1',
    mesaNumero: 7,
    itens: [{
      nome: 'Margherita',
      quantidade: 2,
      categoriaNome: 'Pizzas',
      observacao: 'Sem cebola',
    }],
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.runInDbTransaction.mockImplementation(
    (operations: TransactionOperations) => (
      operations.sqliteOperation({ dialect: 'sqlite' })
    ),
  )
  mocks.createOrderInSqliteTransaction.mockReturnValue(createdOrder())
  mocks.createOrderInPostgresTransaction.mockResolvedValue(createdOrder())
  mocks.transitionOrderInSqliteTransaction.mockReturnValue({
    changed: true,
    status: 'em_preparo',
  })
  mocks.transitionOrderInPostgresTransaction.mockResolvedValue({
    changed: true,
    status: 'em_preparo',
  })
  mocks.cancelOrderInSqliteTransaction.mockReturnValue({
    changed: true,
    status: 'cancelado',
  })
  mocks.cancelOrderInPostgresTransaction.mockResolvedValue({
    changed: true,
    status: 'cancelado',
  })
})

describe('confirmarPedido', () => {
  it('runs validation, order, items, and snapshot inside the safe transaction helper', async () => {
    const { confirmarPedido } = await import('@/lib/actions/pedidos')
    const items = [{
      produtoId: 'produto-1',
      quantidade: 2,
      observacao: 'Sem cebola',
    }]

    await expect(confirmarPedido('mesa-1', items)).resolves.toEqual({
      id: 'pedido-1',
    })

    expect(mocks.requireAccess).toHaveBeenCalledWith('garcom')
    expect(mocks.runInDbTransaction).toHaveBeenCalledTimes(1)
    expect(mocks.createOrderInSqliteTransaction).toHaveBeenCalledWith(
      { dialect: 'sqlite' },
      {
        tenantId: 'tenant-1',
        usuarioId: 'user-1',
        mesaId: 'mesa-1',
        items,
      },
    )
    expect(mocks.db.transaction).not.toHaveBeenCalled()
    expect(mocks.db.select).not.toHaveBeenCalled()
    expect(mocks.notifyKitchen).toHaveBeenCalledWith('tenant-1', {
      type: 'novo_pedido',
      payload: {
        pedidoId: 'pedido-1',
        mesaNumero: 7,
        itens: createdOrder().itens,
      },
    })
    expect(
      mocks.createOrderInSqliteTransaction.mock.invocationCallOrder[0],
    ).toBeLessThan(mocks.notifyKitchen.mock.invocationCallOrder[0])
  })

  it('does not emit SSE when the transaction fails', async () => {
    const { confirmarPedido } = await import('@/lib/actions/pedidos')
    mocks.runInDbTransaction.mockImplementationOnce(() => {
      throw new Error('snapshot insert failed')
    })

    await expect(confirmarPedido('mesa-1', [{
      produtoId: 'produto-1',
      quantidade: 1,
    }])).rejects.toThrow('snapshot insert failed')

    expect(mocks.notifyKitchen).not.toHaveBeenCalled()
  })

  it('returns the committed order even when the post-commit SSE effect fails', async () => {
    const { confirmarPedido } = await import('@/lib/actions/pedidos')
    mocks.notifyKitchen.mockImplementationOnce(() => {
      throw new Error('sse unavailable')
    })

    await expect(confirmarPedido('mesa-1', [{
      produtoId: 'produto-1',
      quantidade: 2,
      observacao: 'Sem cebola',
    }])).resolves.toEqual({ id: 'pedido-1' })
  })

  it.each([
    ['', [{ produtoId: 'produto-1', quantidade: 1 }], 'Mesa inválida'],
    ['mesa-1', [], 'Pedido vazio'],
    ['mesa-1', [{ produtoId: '', quantidade: 1 }], 'Item inválido'],
    ['mesa-1', [{ produtoId: 'produto-1', quantidade: 0 }], 'Item inválido'],
    ['mesa-1', [{ produtoId: 'produto-1', quantidade: 1.5 }], 'Item inválido'],
  ])('rejects malformed action input before opening a transaction', async (
    mesaId,
    items,
    message,
  ) => {
    const { confirmarPedido } = await import('@/lib/actions/pedidos')

    await expect(confirmarPedido(mesaId, items)).rejects.toThrow(message)
    expect(mocks.runInDbTransaction).not.toHaveBeenCalled()
    expect(mocks.notifyKitchen).not.toHaveBeenCalled()
  })
})

describe('atualizarStatus', () => {
  it.each(['novo', 'entregue', 'cancelado'] as const)(
    'rejects the kitchen-only target %s before opening a transaction',
    async (status) => {
      const { atualizarStatus } = await import('@/lib/actions/pedidos')

      await expect(
        atualizarStatus('pedido-1', status),
      ).rejects.toThrow('Status de cozinha inválido')

      expect(mocks.requireAccess).toHaveBeenCalledWith('cozinha')
      expect(mocks.runInDbTransaction).not.toHaveBeenCalled()
      expect(mocks.notifyKitchen).not.toHaveBeenCalled()
    },
  )

  it('runs preparation consumption and status update in one transaction before SSE', async () => {
    const { atualizarStatus } = await import('@/lib/actions/pedidos')

    await atualizarStatus('pedido-1', 'em_preparo')

    expect(mocks.requireAccess).toHaveBeenCalledWith('cozinha')
    expect(mocks.transitionOrderInSqliteTransaction).toHaveBeenCalledWith(
      { dialect: 'sqlite' },
      {
        tenantId: 'tenant-1',
        usuarioId: 'user-1',
        pedidoId: 'pedido-1',
        targetStatus: 'em_preparo',
      },
    )
    expect(mocks.db.transaction).not.toHaveBeenCalled()
    expect(
      mocks.transitionOrderInSqliteTransaction.mock.invocationCallOrder[0],
    ).toBeLessThan(mocks.notifyKitchen.mock.invocationCallOrder[0])
    expect(mocks.notifyKitchen).toHaveBeenCalledWith('tenant-1', {
      type: 'status_atualizado',
      payload: { pedidoId: 'pedido-1', status: 'em_preparo' },
    })
  })

  it('returns success without another movement or SSE on a target-status retry', async () => {
    const { atualizarStatus } = await import('@/lib/actions/pedidos')
    mocks.transitionOrderInSqliteTransaction.mockReturnValueOnce({
      changed: false,
      status: 'em_preparo',
    })

    await expect(
      atualizarStatus('pedido-1', 'em_preparo'),
    ).resolves.toBeUndefined()

    expect(mocks.runInDbTransaction).toHaveBeenCalledTimes(1)
    expect(mocks.notifyKitchen).not.toHaveBeenCalled()
  })

  it('does not emit a status update when consumption rolls back', async () => {
    const { atualizarStatus } = await import('@/lib/actions/pedidos')
    mocks.transitionOrderInSqliteTransaction.mockImplementationOnce(() => {
      throw new Error('Não há estoque suficiente para Cheese')
    })

    await expect(
      atualizarStatus('pedido-1', 'em_preparo'),
    ).rejects.toThrow('Não há estoque suficiente para Cheese')

    expect(mocks.notifyKitchen).not.toHaveBeenCalled()
  })
})

describe('confirmarEntrega', () => {
  it('uses the official pronto-to-entregue transition without a separate stock action', async () => {
    const { confirmarEntrega } = await import('@/lib/actions/pedidos')
    mocks.transitionOrderInSqliteTransaction.mockReturnValueOnce({
      changed: true,
      status: 'entregue',
    })

    await confirmarEntrega('pedido-1')

    expect(mocks.requireAccess).toHaveBeenCalledWith('garcom')
    expect(mocks.transitionOrderInSqliteTransaction).toHaveBeenCalledWith(
      { dialect: 'sqlite' },
      {
        tenantId: 'tenant-1',
        usuarioId: 'user-1',
        pedidoId: 'pedido-1',
        targetStatus: 'entregue',
      },
    )
    expect(mocks.notifyKitchen).toHaveBeenCalledWith('tenant-1', {
      type: 'status_atualizado',
      payload: { pedidoId: 'pedido-1', status: 'entregue' },
    })
  })

  it('rejects direct novo-to-entregue delivery and emits nothing', async () => {
    const { confirmarEntrega } = await import('@/lib/actions/pedidos')
    mocks.transitionOrderInSqliteTransaction.mockImplementationOnce(() => {
      throw new Error('Transição inválida: novo → entregue')
    })

    await expect(confirmarEntrega('pedido-1')).rejects.toThrow(
      'Transição inválida: novo → entregue',
    )

    expect(mocks.notifyKitchen).not.toHaveBeenCalled()
  })
})

describe('cancelarPedido', () => {
  it('keeps the safe new-only cancellation inside a transaction with no reversal flow', async () => {
    const { cancelarPedido } = await import('@/lib/actions/pedidos')

    await cancelarPedido('pedido-1')

    expect(mocks.requireAccess).toHaveBeenCalledWith('garcom')
    expect(mocks.cancelOrderInSqliteTransaction).toHaveBeenCalledWith(
      { dialect: 'sqlite' },
      {
        tenantId: 'tenant-1',
        pedidoId: 'pedido-1',
      },
    )
    expect(mocks.notifyKitchen).toHaveBeenCalledWith('tenant-1', {
      type: 'status_atualizado',
      payload: { pedidoId: 'pedido-1', status: 'cancelado' },
    })
  })
})

type PaymentFixture = {
  order?: { id: string; status: 'entregue' | 'pronto' } | null
  activePayment?: { id: string }
  items?: Array<{ quantidade: number; precoUnitario: string }>
}

function createSqlitePaymentTransaction({
  order = { id: 'pedido-1', status: 'entregue' },
  activePayment,
  items = [{ quantidade: 1, precoUnitario: '48.00' }],
}: PaymentFixture = {}) {
  const insertedValues = vi.fn()
  const insertRun = vi.fn()
  let selectionIndex = 0
  const rows = [order ? [order] : [], activePayment ? [activePayment] : [], items]
  const transaction = {
    select: vi.fn(() => {
      const currentRows = rows[selectionIndex++] ?? []
      return {
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            get: vi.fn(() => currentRows[0]),
            all: vi.fn(() => currentRows),
          })),
        })),
      }
    }),
    insert: vi.fn(() => ({
      values: insertedValues.mockReturnValue({ run: insertRun }),
    })),
  }

  return { transaction, insertedValues, insertRun }
}

function createPostgresPaymentTransaction({
  order = { id: 'pedido-1', status: 'entregue' },
  activePayment,
  items = [{ quantidade: 1, precoUnitario: '48.00' }],
}: PaymentFixture = {}) {
  const insertedValues = vi.fn().mockResolvedValue(undefined)
  const orderLock = vi.fn(async () => order ? [order] : [])
  let selectionIndex = 0
  const rows = [activePayment ? [activePayment] : [], items]
  const transaction = {
    select: vi.fn(() => {
      if (selectionIndex++ === 0) {
        return {
          from: vi.fn(() => ({
            where: vi.fn(() => ({ for: orderLock })),
          })),
        }
      }

      const currentRows = rows[selectionIndex - 2] ?? []
      return {
        from: vi.fn(() => ({
          where: vi.fn(async () => currentRows),
        })),
      }
    }),
    insert: vi.fn(() => ({ values: insertedValues })),
  }

  return { transaction, insertedValues, orderLock }
}

describe('registrarPagamentoPedido', () => {
  beforeEach(() => {
    mocks.requireAccess.mockResolvedValue({
      usuarioId: 'caixa-1',
      tenantId: 'tenant-1',
      access: 'caixa',
    })
  })

  it('rejects an unsupported runtime payment method before opening a transaction', async () => {
    const { registrarPagamentoPedido } = await import('@/lib/actions/pedidos')

    await expect(registrarPagamentoPedido({
      pedidoId: 'pedido-1',
      formaPagamento: 'voucher' as never,
      valor: '48,00',
    })).rejects.toThrow('Forma de pagamento inválida')

    expect(mocks.runInDbTransaction).not.toHaveBeenCalled()
  })

  it('registers the exact official total for two units inside the SQLite transaction', async () => {
    const { registrarPagamentoPedido } = await import('@/lib/actions/pedidos')
    const fixture = createSqlitePaymentTransaction({
      items: [{ quantidade: 2, precoUnitario: '12.35' }],
    })
    mocks.runInDbTransaction.mockImplementationOnce(
      (operations: TransactionOperations) => (
        operations.sqliteOperation(fixture.transaction)
      ),
    )

    await expect(registrarPagamentoPedido({
      pedidoId: 'pedido-1',
      formaPagamento: 'pix',
      valor: '24,70',
    })).resolves.toEqual({ status: 'registrado' })

    expect(mocks.requireAccess).toHaveBeenCalledWith('caixa')
    expect(mocks.runInDbTransaction).toHaveBeenCalledTimes(1)
    expect(mocks.runInDbTransaction).toHaveBeenCalledWith(
      expect.any(Object),
      { sqliteMode: 'immediate' },
    )
    expect(mocks.eq).toHaveBeenCalledWith(
      'sqlite_item_pedido.tenant_id',
      'tenant-1',
    )
    expect(fixture.insertedValues).toHaveBeenCalledWith({
      id: expect.any(String),
      tenantId: 'tenant-1',
      pedidoId: 'pedido-1',
      registradoPorUsuarioId: 'caixa-1',
      formaPagamento: 'pix',
      valor: '24.70',
      status: 'registrado',
      observacao: null,
      registradoEm: expect.any(Date),
    })
    expect(fixture.insertRun).toHaveBeenCalledTimes(1)
  })

  it.each(['24,69', '24,71'])(
    'rejects a partial or excess value (%s) against the official total',
    async (valor) => {
      const { registrarPagamentoPedido } = await import('@/lib/actions/pedidos')
      const fixture = createSqlitePaymentTransaction({
        items: [{ quantidade: 2, precoUnitario: '12.35' }],
      })
      mocks.runInDbTransaction.mockImplementationOnce(
        (operations: TransactionOperations) => (
          operations.sqliteOperation(fixture.transaction)
        ),
      )

      await expect(registrarPagamentoPedido({
        pedidoId: 'pedido-1',
        formaPagamento: 'pix',
        valor,
      })).rejects.toThrow('O valor deve ser exatamente o total pendente')

      expect(fixture.transaction.insert).not.toHaveBeenCalled()
    },
  )

  it('treats an active registered payment retry as an idempotent success', async () => {
    const { registrarPagamentoPedido } = await import('@/lib/actions/pedidos')
    const fixture = createSqlitePaymentTransaction({
      activePayment: { id: 'pagamento-1' },
    })
    mocks.runInDbTransaction.mockImplementationOnce(
      (operations: TransactionOperations) => (
        operations.sqliteOperation(fixture.transaction)
      ),
    )

    await expect(registrarPagamentoPedido({
      pedidoId: 'pedido-1',
      formaPagamento: 'pix',
      valor: '48,00',
    })).resolves.toEqual({ status: 'ja_registrado' })

    expect(fixture.transaction.insert).not.toHaveBeenCalled()
  })

  it('allows a new full payment when the previous payment is estornado', async () => {
    const { registrarPagamentoPedido } = await import('@/lib/actions/pedidos')
    const fixture = createSqlitePaymentTransaction()
    mocks.runInDbTransaction.mockImplementationOnce(
      (operations: TransactionOperations) => (
        operations.sqliteOperation(fixture.transaction)
      ),
    )

    await expect(registrarPagamentoPedido({
      pedidoId: 'pedido-1',
      formaPagamento: 'dinheiro',
      valor: '48,00',
    })).resolves.toEqual({ status: 'registrado' })

    expect(mocks.eq).toHaveBeenCalledWith(
      'sqlite_pagamento_pedido.status',
      'registrado',
    )
    expect(fixture.transaction.insert).toHaveBeenCalledTimes(1)
  })

  it('does not find or mutate an order from another tenant', async () => {
    const { registrarPagamentoPedido } = await import('@/lib/actions/pedidos')
    const fixture = createSqlitePaymentTransaction({ order: null })
    mocks.runInDbTransaction.mockImplementationOnce(
      (operations: TransactionOperations) => (
        operations.sqliteOperation(fixture.transaction)
      ),
    )

    await expect(registrarPagamentoPedido({
      pedidoId: 'pedido-2',
      formaPagamento: 'pix',
      valor: '48,00',
    })).rejects.toThrow('Pedido não encontrado')

    expect(mocks.eq).toHaveBeenCalledWith(
      'sqlite_pedido.tenant_id',
      'tenant-1',
    )
    expect(fixture.transaction.insert).not.toHaveBeenCalled()
  })

  it('locks the tenant-scoped order in PostgreSQL before checking payment state', async () => {
    const { registrarPagamentoPedido } = await import('@/lib/actions/pedidos')
    const fixture = createPostgresPaymentTransaction()
    mocks.runInDbTransaction.mockImplementationOnce(
      (operations: TransactionOperations) => (
        operations.postgresOperation(fixture.transaction)
      ),
    )

    await expect(registrarPagamentoPedido({
      pedidoId: 'pedido-1',
      formaPagamento: 'credito',
      valor: '48,00',
    })).resolves.toEqual({ status: 'registrado' })

    expect(fixture.orderLock).toHaveBeenCalledWith('update')
    expect(mocks.eq).toHaveBeenCalledWith('pedido.tenant_id', 'tenant-1')
    expect(mocks.eq).toHaveBeenCalledWith('item_pedido.tenant_id', 'tenant-1')
    expect(fixture.insertedValues).toHaveBeenCalledTimes(1)
  })

  it('serializes two concurrent retries so only one registered payment is inserted', async () => {
    const { registrarPagamentoPedido } = await import('@/lib/actions/pedidos')
    let activePayment: { id: string } | undefined
    let queue = Promise.resolve()
    let inserts = 0

    mocks.runInDbTransaction.mockImplementation(
      (operations: TransactionOperations) => {
        const result = queue.then(async () => {
          const fixture = createPostgresPaymentTransaction({ activePayment })
          fixture.insertedValues.mockImplementationOnce(async () => {
            inserts += 1
            activePayment = { id: 'pagamento-1' }
          })
          return operations.postgresOperation(fixture.transaction)
        })
        queue = result.then(() => undefined)
        return result
      },
    )

    const results = await Promise.all([
      registrarPagamentoPedido({
        pedidoId: 'pedido-1',
        formaPagamento: 'pix',
        valor: '48,00',
      }),
      registrarPagamentoPedido({
        pedidoId: 'pedido-1',
        formaPagamento: 'pix',
        valor: '48,00',
      }),
    ])

    expect(results).toEqual([
      { status: 'registrado' },
      { status: 'ja_registrado' },
    ])
    expect(inserts).toBe(1)
  })

  it.each([
    Object.assign(
      new Error(
        'UNIQUE constraint failed: pagamento_pedido.tenant_id, pagamento_pedido.pedido_id',
      ),
      { code: 'SQLITE_CONSTRAINT_UNIQUE' },
    ),
    Object.assign(new Error('duplicate key value violates unique constraint'), {
      code: '23505',
      constraint:
        'pagamento_pedido_tenant_pedido_registrado_unique',
    }),
  ])(
    'converts the registered-payment unique conflict into an idempotent result',
    async (conflict) => {
      const { registrarPagamentoPedido } = await import('@/lib/actions/pedidos')
      mocks.runInDbTransaction.mockImplementationOnce(() => {
        throw conflict
      })

      await expect(registrarPagamentoPedido({
        pedidoId: 'pedido-1',
        formaPagamento: 'pix',
        valor: '48,00',
      })).resolves.toEqual({ status: 'ja_registrado' })
    },
  )

  it('does not hide unrelated database constraint errors', async () => {
    const { registrarPagamentoPedido } = await import('@/lib/actions/pedidos')
    const conflict = Object.assign(new Error('other unique constraint'), {
      code: '23505',
      constraint: 'usuario_email_unique',
    })
    mocks.runInDbTransaction.mockImplementationOnce(() => {
      throw conflict
    })

    await expect(registrarPagamentoPedido({
      pedidoId: 'pedido-1',
      formaPagamento: 'pix',
      valor: '48,00',
    })).rejects.toBe(conflict)
  })
})
