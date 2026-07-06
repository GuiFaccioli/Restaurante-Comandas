import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  redirectMock: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`)
  }),
  currentSession: null as { usuarioId: string; email: string; nome: string; selectedTenantId?: string | null } | null,
  accessRows: [] as Array<{ acesso: 'admin' | 'caixa' | 'cozinha' | 'garcom' }>,
}))

vi.mock('next/navigation', () => ({
  redirect: state.redirectMock,
}))

vi.mock('@/lib/auth/session', () => ({
  getCurrentSession: vi.fn(async () => state.currentSession),
}))

vi.mock('@/lib/db/schema', () => ({
  usuarioAcesso: {
    usuarioId: 'usuario_acesso.usuario_id',
    tenantUserId: 'usuario_acesso.tenant_user_id',
    acesso: 'usuario_acesso.acesso',
  },
  tenantUser: {
    id: 'tenant_user.id',
    tenantId: 'tenant_user.tenant_id',
    usuarioId: 'tenant_user.usuario_id',
    status: 'tenant_user.status',
  },
}))

vi.mock('drizzle-orm', () => ({
  and: vi.fn((...conditions) => conditions),
  eq: vi.fn((left, right) => ({ left, right })),
}))

vi.mock('@/lib/db/index', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          where: vi.fn(async () => state.accessRows),
        })),
        where: vi.fn(async () => state.accessRows),
      })),
    })),
  },
}))

import { getCurrentAccesses, redirectForAccesses, requireAccess } from '@/lib/auth/access'

beforeEach(() => {
  vi.clearAllMocks()
  state.currentSession = null
  state.accessRows = []
})

describe('access guard', () => {
  it('redirects anonymous users to sign-in', async () => {
    await expect(requireAccess('admin')).rejects.toThrow('REDIRECT:/auth/sign-in')
  })

  it('returns current accesses for authenticated users', async () => {
    state.currentSession = { usuarioId: 'user-1', email: 'a@b.com', nome: 'Ana', selectedTenantId: 'tenant-1' }
    state.accessRows = [{ acesso: 'garcom' }, { acesso: 'cozinha' }]

    await expect(getCurrentAccesses()).resolves.toEqual(['garcom', 'cozinha'])
  })

  it('allows a matching permission', async () => {
    state.currentSession = { usuarioId: 'user-1', email: 'a@b.com', nome: 'Ana', selectedTenantId: 'tenant-1' }
    state.accessRows = [{ acesso: 'cozinha' }]

    await expect(requireAccess('cozinha')).resolves.toEqual({
      usuarioId: 'user-1',
      tenantId: 'tenant-1',
      access: 'cozinha',
    })
  })

  it('redirects authenticated users without a selected tenant to company selection', async () => {
    state.currentSession = { usuarioId: 'user-1', email: 'a@b.com', nome: 'Ana', selectedTenantId: null }

    await expect(requireAccess('admin')).rejects.toThrow('REDIRECT:/selecionar-empresa')
  })

  it('redirects when the user lacks the required permission', async () => {
    state.currentSession = { usuarioId: 'user-1', email: 'a@b.com', nome: 'Ana', selectedTenantId: 'tenant-1' }
    state.accessRows = [{ acesso: 'garcom' }]

    await expect(requireAccess('cozinha')).rejects.toThrow('REDIRECT:/sem-acesso')
  })

  it('routes single and multiple permissions to the correct destination', () => {
    expect(redirectForAccesses(['garcom'])).toBe('/garcom/pedidos')
    expect(redirectForAccesses(['cozinha'])).toBe('/cozinha/dashboard')
    expect(redirectForAccesses(['admin', 'caixa'])).toBe('/selecionar-area')
    expect(redirectForAccesses([])).toBe('/sem-acesso')
  })
})
