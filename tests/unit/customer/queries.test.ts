import { beforeEach, describe, expect, it, vi } from 'vitest'

const drizzle = vi.hoisted(() => ({
  and: vi.fn((...conditions: unknown[]) => ({ kind: 'and', conditions })),
  asc: vi.fn((column: unknown) => ({ kind: 'asc', column })),
  eq: vi.fn((column: unknown, value: unknown) => ({ kind: 'eq', column, value })),
  exists: vi.fn((query: unknown) => ({ kind: 'exists', query })),
  ilike: vi.fn((column: unknown, value: unknown) => ({ kind: 'ilike', column, value })),
  or: vi.fn((...conditions: unknown[]) => ({ kind: 'or', conditions })),
  desc: vi.fn((column: unknown) => ({ kind: 'desc', column })),
}))

const { selectMock, requireAnyAccessMock } = vi.hoisted(() => ({
  selectMock: vi.fn(),
  requireAnyAccessMock: vi.fn(async () => ({ usuarioId: 'user-1', tenantId: 'tenant-1', access: 'caixa' })),
}))

vi.mock('drizzle-orm', async (importOriginal) => ({
  ...(await importOriginal<typeof import('drizzle-orm')>()),
  ...drizzle,
}))
vi.mock('@/lib/db/index', () => ({ db: { select: selectMock } }))
vi.mock('@/lib/auth/access', () => ({ requireAnyAccess: requireAnyAccessMock }))

import { buscarClientes, buscarHistoricoPedidosDelivery } from '@/lib/customer/queries'
import { cliente, enderecoCliente } from '@/lib/db/schema'

function installSelectMock() {
  const offset = vi.fn().mockResolvedValue([])
  const query = {
    from: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset,
  }
  selectMock.mockReturnValue(query)
  return query
}

describe('buscarClientes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('searches active additional addresses through an exists predicate', async () => {
    const query = installSelectMock()
    await buscarClientes('Centro')

    expect(drizzle.exists).toHaveBeenCalledTimes(1)
    expect(drizzle.ilike).toHaveBeenCalledWith(enderecoCliente.bairro, '%Centro%')
    expect(query.where).toHaveBeenCalledWith(expect.objectContaining({ kind: 'and' }))
  })

  it('does not add a phone ilike predicate when the search has no digits', async () => {
    installSelectMock()
    await buscarClientes('Centro')

    expect(drizzle.ilike).not.toHaveBeenCalledWith(cliente.telefoneNormalizado, '%%')
  })

  it('batches active delivery orders for the returned customers', async () => {
    const customerQuery = installSelectMock()
    const activeOrderQuery = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([
        { id: 'order-1', clienteId: 'customer-1', clienteNomeSnapshot: 'Ana', enderecoSnapshot: { rua: 'Rua A', numero: '10' }, taxaEntregaAplicada: '5.50', status: 'pronto', criadoEm: new Date('2026-08-18T10:00:00Z'), entregueEm: null },
      ]),
    }
    const itemQuery = {
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    }
    customerQuery.offset.mockResolvedValueOnce([{
      id: 'customer-1', name: 'Ana', phone: '11999', deliveryFee: '0.00', active: true,
      addressId: null, street: null, number: null, neighborhood: null, city: null,
      postalCode: null, complement: null, reference: null,
    }])
    selectMock.mockReturnValueOnce(customerQuery).mockReturnValueOnce(activeOrderQuery).mockReturnValueOnce(itemQuery)

    await expect(buscarClientes('')).resolves.toEqual([
      expect.objectContaining({
        id: 'customer-1',
        activeDeliveryOrders: [expect.objectContaining({ id: 'order-1', clienteNomeSnapshot: 'Ana', enderecoSnapshot: { rua: 'Rua A', numero: '10' }, taxaEntregaAplicada: '5.50', status: 'pronto' })],
      }),
    ])
    expect(activeOrderQuery.where).toHaveBeenCalledWith(expect.objectContaining({ kind: 'and' }))
  })
})

describe('buscarHistoricoPedidosDelivery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('filters history by tenant, customer, and delivery channel', async () => {
    selectMock.mockReset()
    const orderQuery = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([{ id: 'order-1', clienteNomeSnapshot: 'Ana', enderecoSnapshot: { rua: 'Rua A', numero: '10' }, taxaEntregaAplicada: '5.50', status: 'pronto', criadoEm: new Date('2026-08-18T10:00:00Z'), entregueEm: null }]),
    }
    const itemQuery = {
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    }
    selectMock.mockReturnValueOnce(orderQuery).mockReturnValueOnce(itemQuery)

    await expect(buscarHistoricoPedidosDelivery('customer-1')).resolves.toEqual([
      expect.objectContaining({ id: 'order-1', clienteNomeSnapshot: 'Ana', enderecoSnapshot: { rua: 'Rua A', numero: '10' }, taxaEntregaAplicada: '5.50', status: 'pronto', total: 5.5, itens: [] }),
    ])

    expect(requireAnyAccessMock).toHaveBeenCalled()
    expect(orderQuery.where).toHaveBeenCalledWith(expect.objectContaining({ kind: 'and' }))
  })
})
