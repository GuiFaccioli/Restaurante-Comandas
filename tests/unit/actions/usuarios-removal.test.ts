import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  targetUser: [{ email: 'person@example.com', ownerUserId: 'owner-1' }],
  remainingMemberships: [] as Array<{ id: string }>,
  deleteCalls: [] as unknown[],
  updateCalls: [] as unknown[],
  transaction: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock('next/cache', () => ({ revalidatePath: state.revalidatePath }))
vi.mock('drizzle-orm', () => ({
  and: vi.fn((...conditions) => ({ type: 'and', conditions })),
  eq: vi.fn((left, right) => ({ type: 'eq', left, right })),
}))
vi.mock('@/lib/auth/access', () => ({
  requireAccess: vi.fn(async () => ({ usuarioId: 'admin-1', tenantId: 'tenant-1', access: 'admin' })),
}))
vi.mock('@/lib/db/schema', () => ({
  tenantUser: { id: 'tenant_user.id', usuarioId: 'tenant_user.usuario_id', tenantId: 'tenant_user.tenant_id', status: 'tenant_user.status' },
  usuario: { id: 'usuario.id', email: 'usuario.email', updatedAt: 'usuario.updated_at' },
  tenant: { id: 'tenant.id', ownerUserId: 'tenant.owner_user_id' },
  usuarioAcesso: {},
  usuarioConvite: {},
}))
vi.mock('@/lib/db/index', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          innerJoin: vi.fn(() => ({ where: vi.fn(async () => state.targetUser) })),
          where: vi.fn(async () => state.targetUser),
        })),
      })),
    })),
  },
  runInDbTransaction: state.transaction,
}))

import { removerUsuarioDoRestaurante } from '@/lib/actions/usuarios'

function form(email = 'person@example.com') {
  const data = new FormData()
  data.set('usuarioId', 'user-1')
  data.set('confirmEmail', email)
  return data
}

beforeEach(() => {
  vi.clearAllMocks()
  state.targetUser = [{ email: 'person@example.com', ownerUserId: 'owner-1' }]
  state.remainingMemberships = []
  state.deleteCalls = []
  state.updateCalls = []
  state.transaction.mockImplementation(async ({ postgresOperation }) => {
    const tx = {
      delete: vi.fn((table) => ({ where: vi.fn(async () => state.deleteCalls.push(table)) })),
      update: vi.fn(() => ({
        set: vi.fn((values) => ({ where: vi.fn(async () => state.updateCalls.push(values)) })),
      })),
      select: vi.fn(() => ({
        from: vi.fn(() => ({ where: vi.fn(async () => state.remainingMemberships) })),
      })),
    }
    return postgresOperation(tx)
  })
})

describe('removerUsuarioDoRestaurante', () => {
  it('deletes the orphaned user so the email can be invited again', async () => {
    await expect(removerUsuarioDoRestaurante(form())).resolves.toBeUndefined()

    expect(state.deleteCalls).toHaveLength(1)
    expect(state.updateCalls[0]).toEqual(expect.objectContaining({ email: 'removed-user-1@invalid.local', authUserId: null, passwordHash: null }))
    expect(state.revalidatePath).toHaveBeenCalledWith('/admin/usuarios')
  })

  it('keeps a user who still belongs to another company', async () => {
    state.remainingMemberships = [{ id: 'other-tenant-membership' }]

    await removerUsuarioDoRestaurante(form())

    expect(state.deleteCalls).toHaveLength(1)
    expect(state.updateCalls).toHaveLength(0)
  })

  it('rejects a mismatched confirmation email', async () => {
    await expect(removerUsuarioDoRestaurante(form('wrong@example.com'))).rejects.toThrow('Digite o e-mail')
    expect(state.transaction).not.toHaveBeenCalled()
  })

  it('does not allow another admin to remove the account creator', async () => {
    state.targetUser = [{ email: 'owner@example.com', ownerUserId: 'user-1' }]

    await expect(removerUsuarioDoRestaurante(form('owner@example.com'))).rejects.toThrow(
      'administrador que criou a conta não pode ser removido',
    )
    expect(state.transaction).not.toHaveBeenCalled()
  })
})
