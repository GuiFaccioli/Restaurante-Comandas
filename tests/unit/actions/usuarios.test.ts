import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  membershipRows: [{ id: 'tenant-user-1' }] as Array<{ id: string }>,
  insertedAccesses: [] as unknown[],
  deleteWhere: vi.fn(),
  updateWhere: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: state.revalidatePath,
}))

vi.mock('drizzle-orm', () => ({
  and: vi.fn((...conditions) => ({ type: 'and', conditions })),
  eq: vi.fn((left, right) => ({ type: 'eq', left, right })),
}))

vi.mock('@/lib/auth/access', () => ({
  requireAccess: vi.fn(async () => ({ usuarioId: 'admin-1', tenantId: 'tenant-1', access: 'admin' })),
}))

vi.mock('@/lib/db/schema', () => ({
  tenantUser: {
    id: 'tenant_user.id',
    usuarioId: 'tenant_user.usuario_id',
    tenantId: 'tenant_user.tenant_id',
  },
  usuario: {
    id: 'usuario.id',
    role: 'usuario.role',
    updatedAt: 'usuario.updated_at',
  },
  usuarioAcesso: {
    tenantUserId: 'usuario_acesso.tenant_user_id',
    usuarioId: 'usuario_acesso.usuario_id',
    acesso: 'usuario_acesso.acesso',
  },
}))

vi.mock('@/lib/db/index', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => state.membershipRows),
      })),
    })),
    delete: vi.fn(() => ({
      where: state.deleteWhere,
    })),
    insert: vi.fn(() => ({
      values: vi.fn(async (values) => {
        state.insertedAccesses.push(values)
      }),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: state.updateWhere,
      })),
    })),
  },
}))

import { db } from '@/lib/db/index'
import { atualizarUsuarioAdmin } from '@/lib/actions/usuarios'

beforeEach(() => {
  vi.clearAllMocks()
  state.membershipRows = [{ id: 'tenant-user-1' }]
  state.insertedAccesses = []
})

describe('usuarios admin actions', () => {
  it('updates selected accesses without requiring a legacy role field', async () => {
    const data = new FormData()
    data.set('usuarioId', 'user-1')
    data.append('acessos', 'admin')
    data.append('acessos', 'caixa')
    data.append('acessos', 'cozinha')
    data.append('acessos', 'garcom')

    await expect(atualizarUsuarioAdmin(data)).resolves.toBeUndefined()

    expect(db.update).not.toHaveBeenCalled()
    expect(state.deleteWhere).toHaveBeenCalled()
    expect(state.insertedAccesses).toEqual([
      [
        expect.objectContaining({ tenantUserId: 'tenant-user-1', usuarioId: 'user-1', acesso: 'admin' }),
        expect.objectContaining({ tenantUserId: 'tenant-user-1', usuarioId: 'user-1', acesso: 'caixa' }),
        expect.objectContaining({ tenantUserId: 'tenant-user-1', usuarioId: 'user-1', acesso: 'cozinha' }),
        expect.objectContaining({ tenantUserId: 'tenant-user-1', usuarioId: 'user-1', acesso: 'garcom' }),
      ],
    ])
    expect(state.revalidatePath).toHaveBeenCalledWith('/admin/usuarios')
  })
})
