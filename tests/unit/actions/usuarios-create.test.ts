import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  existing: [] as Array<{ id: string }>,
  activeMemberships: [] as Array<{ id: string }>,
  selectCalls: 0,
  inserts: [] as unknown[],
  updates: [] as unknown[],
  revalidatePath: vi.fn(),
  transaction: vi.fn(),
}))

vi.mock('next/cache', () => ({ revalidatePath: state.revalidatePath }))
vi.mock('drizzle-orm', () => ({
  and: vi.fn((...conditions) => ({ operator: 'and', conditions })),
  eq: vi.fn((left, right) => ({ operator: 'eq', left, right })),
  gt: vi.fn((left, right) => ({ operator: 'gt', left, right })),
  isNull: vi.fn((column) => ({ operator: 'isNull', column })),
}))
vi.mock('@/lib/auth/access', () => ({
  requireAccess: vi.fn(async () => ({ usuarioId: 'admin-1', tenantId: 'tenant-selected', access: 'admin' })),
}))
vi.mock('@/lib/auth/password', () => ({
  assertValidEmail: vi.fn((email: string) => email.trim().toLowerCase()),
  hashPassword: vi.fn(async (password: string) => `scrypt:${password}`),
}))
vi.mock('@/lib/db/schema', () => ({
  usuario: { id: 'usuario.id', email: 'usuario.email', updatedAt: 'usuario.updatedAt' },
  tenantUser: { id: 'tenantUser.id', usuarioId: 'tenantUser.usuarioId', tenantId: 'tenantUser.tenantId', status: 'tenantUser.status' },
  usuarioAcesso: {},
  usuarioConvite: {
    id: 'usuarioConvite.id',
    tenantId: 'usuarioConvite.tenantId',
    tenantUserId: 'usuarioConvite.tenantUserId',
    usuarioId: 'usuarioConvite.usuarioId',
    criadoPorUsuarioId: 'usuarioConvite.criadoPorUsuarioId',
    email: 'usuarioConvite.email',
    tokenHash: 'usuarioConvite.tokenHash',
    expiraEm: 'usuarioConvite.expiraEm',
    aceitoEm: 'usuarioConvite.aceitoEm',
    criadoEm: 'usuarioConvite.criadoEm',
  },
}))
vi.mock('@/lib/db/index', () => ({
  db: {},
  runInDbTransaction: state.transaction,
}))

import { cadastrarUsuarioAdmin } from '@/lib/actions/usuarios'

function form(overrides: Record<string, string | string[]> = {}) {
  const data = new FormData()
  data.set('nome', String(overrides.nome ?? 'Ana Admin'))
  data.set('email', String(overrides.email ?? 'ANA@example.com'))
  data.set('password', String(overrides.password ?? 'senha-segura'))
  for (const access of (overrides.acessos ?? ['caixa', 'garcom']) as string[]) data.append('acessos', access)
  return data
}

beforeEach(() => {
  vi.clearAllMocks()
  state.existing = []
  state.activeMemberships = []
  state.selectCalls = 0
  state.inserts = []
  state.updates = []
  state.transaction.mockImplementation(async ({ postgresOperation }) => {
    const tx = {
      select: vi.fn(() => {
        state.selectCalls += 1
        const results = state.selectCalls === 1 ? state.existing : state.activeMemberships
        return { from: vi.fn(() => ({ where: vi.fn(async () => results) })) }
      }),
      insert: vi.fn(() => ({
        values: vi.fn(async (values) => state.inserts.push(values)),
      })),
      update: vi.fn(() => ({
        set: vi.fn((values) => ({
          where: vi.fn(async () => state.updates.push(values)),
        })),
      })),
    }
    return postgresOperation(tx)
  })
})

describe('cadastrarUsuarioAdmin', () => {
  it('creates the user, membership, and selected accesses in one tenant transaction', async () => {
    await expect(cadastrarUsuarioAdmin(form())).resolves.toEqual(expect.objectContaining({ inviteUrl: expect.stringContaining('/convite/'), expiresAt: expect.any(String) }))

    expect(state.transaction).toHaveBeenCalledTimes(1)
    expect(state.inserts).toHaveLength(4)
    expect(state.inserts[0]).toEqual(expect.objectContaining({ nome: 'Ana Admin', email: 'ana@example.com', passwordHash: null }))
    expect(state.inserts[1]).toEqual(expect.objectContaining({ tenantId: 'tenant-selected', usuarioId: state.inserts[0] && expect.any(String), status: 'active' }))
    expect(state.inserts[2]).toEqual([
      expect.objectContaining({ tenantUserId: expect.any(String), acesso: 'caixa' }),
      expect.objectContaining({ tenantUserId: expect.any(String), acesso: 'garcom' }),
    ])
    expect(state.inserts[3]).toEqual(expect.objectContaining({ email: 'ana@example.com', expiraEm: expect.any(Date), tokenHash: expect.any(String) }))
    expect(state.revalidatePath).toHaveBeenCalledWith('/admin/usuarios')
  })

  it('rejects duplicate e-mail before inserting tenant-scoped records', async () => {
    state.existing = [{ id: 'existing-user' }]
    state.activeMemberships = [{ id: 'active-membership' }]

    await expect(cadastrarUsuarioAdmin(form())).rejects.toThrow('já está cadastrado neste restaurante')
    expect(state.inserts).toEqual([])
    expect(state.revalidatePath).not.toHaveBeenCalled()
  })

  it('rejects an existing account so the administrator can use another email', async () => {
    state.existing = [{ id: 'existing-user' }]

    await expect(cadastrarUsuarioAdmin(form())).rejects.toThrow('já possui uma conta')
    expect(state.inserts).toEqual([])
  })

  it('rejects an existing user with an active membership in this tenant', async () => {
    state.existing = [{ id: 'existing-user' }]
    state.activeMemberships = [{ id: 'active-membership' }]

    await expect(cadastrarUsuarioAdmin(form())).rejects.toThrow('já está cadastrado neste restaurante')
    expect(state.inserts).toEqual([])
  })

  it('rejects invalid or empty permissions before opening a transaction', async () => {
    await expect(cadastrarUsuarioAdmin(form({ acessos: ['root'] }))).rejects.toThrow('permissão válida')
    expect(state.transaction).not.toHaveBeenCalled()
  })
})
