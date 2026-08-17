import { beforeEach, describe, expect, it, vi } from 'vitest'

const drizzle = vi.hoisted(() => ({
  and: vi.fn((...conditions: unknown[]) => ({ kind: 'and', conditions })),
  asc: vi.fn((column: unknown) => ({ kind: 'asc', column })),
  eq: vi.fn((column: unknown, value: unknown) => ({ kind: 'eq', column, value })),
  exists: vi.fn((query: unknown) => ({ kind: 'exists', query })),
  ilike: vi.fn((column: unknown, value: unknown) => ({ kind: 'ilike', column, value })),
  or: vi.fn((...conditions: unknown[]) => ({ kind: 'or', conditions })),
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

import { buscarClientes } from '@/lib/customer/queries'
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
})
