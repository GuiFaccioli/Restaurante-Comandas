import { beforeEach, describe, expect, it, vi } from 'vitest'

type TransactionOperations = {
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
  requireAccess: vi.fn(async () => ({
    usuarioId: 'user-1',
    tenantId: 'tenant-1',
    access: 'garcom',
  })),
  requireAnyAccess: vi.fn(async () => ({
    usuarioId: 'user-1',
    tenantId: 'tenant-1',
    access: 'admin',
  })),
  createOrderInPostgresTransaction: vi.fn(),
  createDeliveryOrderInPostgresTransaction: vi.fn(),
  transitionOrderInPostgresTransaction: vi.fn(),
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
    canal: 'pedido.canal',
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

vi.mock('@/lib/auth/access', () => ({
  requireAccess: mocks.requireAccess,
  requireAnyAccess: mocks.requireAnyAccess,
}))

vi.mock('@/lib/stock/order-consumption', () => ({
  createOrderInPostgresTransaction: mocks.createOrderInPostgresTransaction,
  createDeliveryOrderInPostgresTransaction:
    mocks.createDeliveryOrderInPostgresTransaction,
  transitionOrderInPostgresTransaction:
    mocks.transitionOrderInPostgresTransaction,
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
      operations.postgresOperation({ dialect: 'postgresql' })
    ),
  )
  mocks.createOrderInPostgresTransaction.mockReturnValue(createdOrder())
  mocks.createOrderInPostgresTransaction.mockResolvedValue(createdOrder())
  mocks.createDeliveryOrderInPostgresTransaction.mockResolvedValue({
    id: 'pedido-delivery-1',
    mesaNumero: null,
    itens: [],
  })
  mocks.transitionOrderInPostgresTransaction.mockReturnValue({
    changed: true,
    status: 'em_preparo',
  })
  mocks.transitionOrderInPostgresTransaction.mockResolvedValue({
    changed: true,
    status: 'em_preparo',
  })
  mocks.cancelOrderInPostgresTransaction.mockReturnValue({
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

    await expect(confirmarPedido('mesa-1', 'atendimento-1', items)).resolves.toEqual({
      id: 'pedido-1',
    })

    expect(mocks.requireAccess).toHaveBeenCalledWith('garcom')
    expect(mocks.runInDbTransaction).toHaveBeenCalledTimes(1)
    expect(mocks.createOrderInPostgresTransaction).toHaveBeenCalledWith(
      { dialect: 'postgresql' },
      {
        tenantId: 'tenant-1',
        usuarioId: 'user-1',
        mesaId: 'mesa-1',
        atendimentoId: 'atendimento-1',
        items,
      },
    )
    expect(mocks.db.transaction).not.toHaveBeenCalled()
    expect(mocks.db.select).not.toHaveBeenCalled()
  })

  it('propagates an insufficient-stock transaction failure', async () => {
    const { confirmarPedido } = await import('@/lib/actions/pedidos')
    mocks.runInDbTransaction.mockImplementationOnce(() => {
      throw new Error('Não há estoque suficiente para Farinha')
    })

    await expect(confirmarPedido('mesa-1', 'atendimento-1', [{
      produtoId: 'produto-1',
      quantidade: 1,
    }])).rejects.toThrow('Não há estoque suficiente para Farinha')
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

    await expect(confirmarPedido(mesaId, 'atendimento-1', items)).rejects.toThrow(message)
    expect(mocks.runInDbTransaction).not.toHaveBeenCalled()
  })
})

describe('confirmarPedidoDelivery', () => {
  const input = {
    clienteId: 'cliente-1',
    enderecoId: 'endereco-1',
    items: [{ produtoId: 'produto-1', quantidade: 2 }],
  }

  it.each(['admin', 'caixa'] as const)(
    'allows %s to create the delivery order without a table',
    async (access) => {
      const { confirmarPedidoDelivery } = await import('@/lib/actions/pedidos')
      mocks.requireAnyAccess.mockResolvedValueOnce({
        usuarioId: `${access}-1`,
        tenantId: 'tenant-1',
        access,
      })

      await expect(confirmarPedidoDelivery(input)).resolves.toEqual({
        id: 'pedido-delivery-1',
      })

      expect(mocks.requireAnyAccess).toHaveBeenCalledWith(['admin', 'caixa'])
      expect(mocks.createDeliveryOrderInPostgresTransaction).toHaveBeenCalledWith(
        { dialect: 'postgresql' },
        {
          tenantId: 'tenant-1',
          usuarioId: `${access}-1`,
          clienteId: 'cliente-1',
          enderecoId: 'endereco-1',
          taxaEntrega: undefined,
          items: input.items,
        },
      )
    },
  )

  it('passes an explicit zero fee override through the transaction', async () => {
    const { confirmarPedidoDelivery } = await import('@/lib/actions/pedidos')

    await expect(confirmarPedidoDelivery({
      ...input,
      taxaEntrega: '0.00',
    })).resolves.toEqual({ id: 'pedido-delivery-1' })

    expect(mocks.createDeliveryOrderInPostgresTransaction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ taxaEntrega: '0.00' }),
    )
  })

  it('does not notify or swallow a transaction rollback', async () => {
    const { confirmarPedidoDelivery } = await import('@/lib/actions/pedidos')
    const failure = new Error('Não há estoque suficiente para Farinha')
    mocks.createDeliveryOrderInPostgresTransaction.mockRejectedValueOnce(failure)

    await expect(confirmarPedidoDelivery(input)).rejects.toBe(failure)
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
    },
  )

  it('runs the kitchen status update in one transaction', async () => {
    const { atualizarStatus } = await import('@/lib/actions/pedidos')

    await atualizarStatus('pedido-1', 'em_preparo')

    expect(mocks.requireAccess).toHaveBeenCalledWith('cozinha')
    expect(mocks.transitionOrderInPostgresTransaction).toHaveBeenCalledWith(
      { dialect: 'postgresql' },
      {
        tenantId: 'tenant-1',
        usuarioId: 'user-1',
        pedidoId: 'pedido-1',
        targetStatus: 'em_preparo',
      },
    )
    expect(mocks.db.transaction).not.toHaveBeenCalled()
  })

  it('returns success without another movement on a target-status retry', async () => {
    const { atualizarStatus } = await import('@/lib/actions/pedidos')
    mocks.transitionOrderInPostgresTransaction.mockReturnValueOnce({
      changed: false,
      status: 'em_preparo',
    })

    await expect(
      atualizarStatus('pedido-1', 'em_preparo'),
    ).resolves.toBeUndefined()

    expect(mocks.runInDbTransaction).toHaveBeenCalledTimes(1)
  })

})

describe('confirmarEntrega', () => {
  it('uses the official pronto-to-entregue transition without a separate stock action', async () => {
    const { confirmarEntrega } = await import('@/lib/actions/pedidos')
    mocks.transitionOrderInPostgresTransaction.mockReturnValueOnce({
      changed: true,
      status: 'entregue',
    })

    await confirmarEntrega('pedido-1')

    expect(mocks.requireAccess).toHaveBeenCalledWith('garcom')
    expect(mocks.transitionOrderInPostgresTransaction).toHaveBeenCalledWith(
      { dialect: 'postgresql' },
      {
        tenantId: 'tenant-1',
        usuarioId: 'user-1',
        pedidoId: 'pedido-1',
        targetStatus: 'entregue',
      },
    )
  })

  it('allows direct delivery for active orders through the tenant-scoped transition', async () => {
    const { confirmarEntrega } = await import('@/lib/actions/pedidos')

    await expect(confirmarEntrega('pedido-1')).resolves.toBeUndefined()
    expect(mocks.transitionOrderInPostgresTransaction).toHaveBeenCalledWith(
      { dialect: 'postgresql' },
      expect.objectContaining({ targetStatus: 'entregue', tenantId: 'tenant-1' }),
    )
  })
})

describe('confirmarEntregaDelivery', () => {
  it.each(['admin', 'caixa'] as const)(
    'allows %s to deliver only through the delivery-scoped transition',
    async (access) => {
      const { confirmarEntregaDelivery } = await import('@/lib/actions/pedidos')
      mocks.requireAnyAccess.mockResolvedValueOnce({
        usuarioId: `${access}-1`, tenantId: 'tenant-1', access,
      })

      await confirmarEntregaDelivery('pedido-delivery-1')

      expect(mocks.requireAnyAccess).toHaveBeenCalledWith(['admin', 'caixa'])
      expect(mocks.transitionOrderInPostgresTransaction).toHaveBeenCalledWith(
        { dialect: 'postgresql' },
        {
          tenantId: 'tenant-1',
          usuarioId: `${access}-1`,
          pedidoId: 'pedido-delivery-1',
          targetStatus: 'entregue',
          expectedCanal: 'delivery',
        },
      )
    },
  )
})

describe('cancelarPedido', () => {
  it('keeps the new-order reversal and cancellation inside one transaction', async () => {
    const { cancelarPedido } = await import('@/lib/actions/pedidos')

    await cancelarPedido('pedido-1')

    expect(mocks.requireAccess).toHaveBeenCalledWith('garcom')
    expect(mocks.cancelOrderInPostgresTransaction).toHaveBeenCalledWith(
      { dialect: 'postgresql' },
      {
        tenantId: 'tenant-1',
        pedidoId: 'pedido-1',
      },
    )
  })
})

describe('CartDrawer confirmation errors', () => {
  it('preserves the specific insufficient-stock error for an editable cart', async () => {
    const { getOrderConfirmationErrorMessage } = await import(
      '@/components/garcom/cart-drawer'
    )

    expect(getOrderConfirmationErrorMessage(
      new Error('Não há estoque suficiente para Farinha'),
    )).toBe('Sem estoque: Farinha')
    expect(getOrderConfirmationErrorMessage(new Error('database offline')))
      .toBe('Não foi possível confirmar o pedido por um erro inesperado.')
  })
})

type PaymentFixture = {
  order?: { id: string; status: 'entregue' | 'pronto' } | null
  activePayment?: { id: string }
  items?: Array<{ quantidade: number; precoUnitario: string }>
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
    Object.assign(new Error('duplicate key value violates unique constraint'), {
      code: '23505',
      constraint: 'pagamento_pedido_tenant_pedido_registrado_unique',
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
