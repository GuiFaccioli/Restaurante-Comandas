import { beforeEach, describe, expect, it, vi } from 'vitest'

const { requireAnyAccessMock, runInDbTransactionMock } = vi.hoisted(() => ({
  requireAnyAccessMock: vi.fn(async () => ({ usuarioId: 'user-1', tenantId: 'tenant-1', access: 'admin' })),
  runInDbTransactionMock: vi.fn(),
}))

vi.mock('@/lib/auth/access', () => ({ requireAnyAccess: requireAnyAccessMock }))
vi.mock('@/lib/db/index', () => ({
  db: { select: vi.fn(), update: vi.fn() },
  runInDbTransaction: runInDbTransactionMock,
}))

import { requireAnyAccess } from '@/lib/auth/access'
import { criarCliente, editarCliente, inativarCliente, reativarCliente } from '@/lib/actions/clientes'

describe('customer actions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('authorizes both admin and cashier through the server access context', async () => {
    runInDbTransactionMock.mockResolvedValue({ id: 'customer-1' })
    await criarCliente({
      name: 'Ana', phone: '11999998888', defaultAddress: { street: 'Rua A', number: '10' },
    })
    expect(requireAnyAccess).toHaveBeenCalledWith(['admin', 'caixa'])
  })

  it('creates the customer and required default address atomically', async () => {
    const insert = vi.fn()
      .mockReturnValueOnce({ values: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 'customer-1' }]) }) })
      .mockReturnValueOnce({ values: vi.fn().mockResolvedValue(undefined) })
    runInDbTransactionMock.mockImplementation(async ({ postgresOperation }: { postgresOperation: (tx: unknown) => unknown }) => postgresOperation({ insert }))
    await criarCliente({
      name: ' Ana ', phone: '(11) 99999-8888', deliveryFee: '0',
      defaultAddress: { street: ' Rua A ', number: '10' },
    })
    expect(insert).toHaveBeenCalledTimes(2)
  })

  it('rejects an invalid default address before starting a transaction', async () => {
    await expect(criarCliente({ name: 'Ana', phone: '11999998888', defaultAddress: { street: '', number: '' } }))
      .rejects.toThrow('Informe a rua')
    expect(runInDbTransactionMock).not.toHaveBeenCalled()
  })

  it('translates a normalized-phone uniqueness violation', async () => {
    runInDbTransactionMock.mockRejectedValue({ code: '23505' })
    await expect(criarCliente({ name: 'Ana', phone: '(11) 99999-8888', defaultAddress: { street: 'Rua A', number: '10' } }))
      .rejects.toThrow('Já existe um cliente com este telefone neste restaurante')
  })

  it('keeps edit, inactivation, and reactivation tenant-scoped', async () => {
    const update = vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 'customer-1' }]) }) }) })
    const insert = vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) })
    runInDbTransactionMock.mockImplementation(async ({ postgresOperation }: { postgresOperation: (tx: unknown) => unknown }) => postgresOperation({ update, insert }))
    await editarCliente({ id: 'customer-1', name: 'Bia', phone: '11988887777', defaultAddress: { street: 'Rua B', number: '2' } })
    await inativarCliente('customer-1')
    await reativarCliente('customer-1')
    expect(update).toHaveBeenCalled()
    expect(requireAnyAccess).toHaveBeenCalledTimes(3)
  })
})
