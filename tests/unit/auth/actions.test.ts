import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  selectResults: [] as unknown[][],
  insertValues: [] as unknown[],
  redirectMock: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`)
  }),
  createAuthSessionMock: vi.fn(),
  destroyCurrentSessionMock: vi.fn(),
  setSelectedTenantMock: vi.fn(),
  currentSession: null as { usuarioId: string; email: string; nome: string; selectedTenantId?: string | null } | null,
}))

vi.mock('next/navigation', () => ({
  redirect: state.redirectMock,
}))

vi.mock('@/lib/auth/password', () => ({
  assertValidEmail: vi.fn((email: string) => {
    const normalized = email.trim().toLowerCase()
    if (!normalized.includes('@')) throw new Error('E-mail inválido')
    return normalized
  }),
  hashPassword: vi.fn(async () => 'hashed-password'),
  verifyPassword: vi.fn(async (password: string, stored: string | null | undefined) =>
    password === 'senha-certa' && stored === 'hashed-password'
  ),
}))

vi.mock('@/lib/auth/session', () => ({
  createAuthSession: state.createAuthSessionMock,
  destroyCurrentSession: state.destroyCurrentSessionMock,
  setSelectedTenant: state.setSelectedTenantMock,
  getCurrentSession: vi.fn(async () => state.currentSession),
}))

vi.mock('@/lib/db/schema', () => ({
  usuario: {
    id: 'usuario.id',
    nome: 'usuario.nome',
    email: 'usuario.email',
    passwordHash: 'usuario.password_hash',
    role: 'usuario.role',
  },
  usuarioAcesso: {
    usuarioId: 'usuario_acesso.usuario_id',
    tenantUserId: 'usuario_acesso.tenant_user_id',
    acesso: 'usuario_acesso.acesso',
  },
  tenant: {
    id: 'tenant.id',
    nome: 'tenant.nome',
    slug: 'tenant.slug',
    status: 'tenant.status',
  },
  tenantUser: {
    id: 'tenant_user.id',
    tenantId: 'tenant_user.tenant_id',
    usuarioId: 'tenant_user.usuario_id',
    status: 'tenant_user.status',
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((left, right) => ({ left, right })),
}))

vi.mock('@/lib/db/index', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          where: vi.fn(async () => state.selectResults.shift() ?? []),
        })),
        where: vi.fn(async () => state.selectResults.shift() ?? []),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn((value) => {
        state.insertValues.push(value)
        return Promise.resolve()
      }),
    })),
  },
}))

import { signIn, signOut, signUpOwner } from '@/lib/actions/auth'

beforeEach(() => {
  vi.clearAllMocks()
  state.selectResults = []
  state.insertValues = []
})

describe('auth actions', () => {
  it('reuses an existing identity when sign-up creates another tenant', async () => {
    state.selectResults = [[{ id: 'existing-user' }]]

    await expect(
      signUpOwner({ nome: 'Ana', email: 'ana@example.com', password: 'senha-certa', tenantNome: 'Pizza Centro' })
    ).rejects.toThrow('REDIRECT:/selecionar-area')

    expect(state.insertValues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          nome: 'Pizza Centro',
          slug: expect.stringMatching(/^pizza-centro/),
          status: 'active',
        }),
        expect.objectContaining({
          tenantId: expect.any(String),
          usuarioId: 'existing-user',
          status: 'active',
        }),
        expect.objectContaining({
          tenantUserId: expect.any(String),
          acesso: 'admin',
        }),
      ])
    )
  })

  it('creates owner tenant membership with hashed password and admin access', async () => {
    state.selectResults = [[]]

    await expect(
      signUpOwner({ nome: 'Ana', email: 'ANA@example.com', password: 'senha-certa', tenantNome: 'Pizza Boa' })
    ).rejects.toThrow('REDIRECT:/selecionar-area')

    expect(state.insertValues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          nome: 'Ana',
          email: 'ana@example.com',
          passwordHash: 'hashed-password',
          role: 'admin',
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        }),
        expect.objectContaining({
          id: expect.any(String),
          nome: 'Pizza Boa',
          slug: expect.stringMatching(/^pizza-boa/),
          status: 'active',
        }),
        expect.objectContaining({
          id: expect.any(String),
          tenantId: expect.any(String),
          usuarioId: expect.any(String),
          status: 'active',
        }),
        expect.objectContaining({
          id: expect.any(String),
          tenantUserId: expect.any(String),
          acesso: 'admin',
        }),
      ])
    )
    expect(state.createAuthSessionMock).toHaveBeenCalledWith(expect.any(String), expect.any(String))
  })

  it('rejects invalid login credentials', async () => {
    state.selectResults = [[{ id: 'user-1', passwordHash: 'hashed-password' }]]

    await expect(signIn({ email: 'ana@example.com', password: 'senha-errada' })).rejects.toThrow(
      'E-mail ou senha incorretos'
    )
  })

  it('creates a session, selects the only tenant, and redirects by user accesses on valid login', async () => {
    state.selectResults = [
      [{ id: 'user-1', passwordHash: 'hashed-password' }],
      [{ id: 'tenant-user-1', tenantId: 'tenant-1', nome: 'Pizza Boa' }],
      [{ acesso: 'garcom' }, { acesso: 'cozinha' }],
    ]

    await expect(signIn({ email: 'ana@example.com', password: 'senha-certa' })).rejects.toThrow(
      'REDIRECT:/selecionar-area'
    )

    expect(state.createAuthSessionMock).toHaveBeenCalledWith('user-1', 'tenant-1')
  })

  it('redirects multi-tenant users to company selection after login', async () => {
    state.selectResults = [
      [{ id: 'user-1', passwordHash: 'hashed-password' }],
      [
        { id: 'tenant-user-1', tenantId: 'tenant-1', nome: 'Pizza Boa' },
        { id: 'tenant-user-2', tenantId: 'tenant-2', nome: 'Pizza Centro' },
      ],
    ]

    await expect(signIn({ email: 'ana@example.com', password: 'senha-certa' })).rejects.toThrow(
      'REDIRECT:/selecionar-empresa'
    )

    expect(state.createAuthSessionMock).toHaveBeenCalledWith('user-1')
  })

  it('signs out and redirects to sign-in', async () => {
    await expect(signOut()).rejects.toThrow('REDIRECT:/auth/sign-in')
    expect(state.destroyCurrentSessionMock).toHaveBeenCalled()
  })
})


