import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  insertValues: [] as unknown[],
  cookieSet: vi.fn(),
  cookieGet: vi.fn(),
  cookieDelete: vi.fn(),
  selectResults: [] as unknown[][],
  neonAuth: {
    getSession: vi.fn(async () => ({ data: { user: { id: 'auth-user-1' } }, error: null })),
  },
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    set: state.cookieSet,
    get: state.cookieGet,
    delete: state.cookieDelete,
  })),
}))

vi.mock('@/lib/db/schema', () => ({
  authSession: {
    id: 'auth_session.id',
    usuarioId: 'auth_session.usuario_id',
    tokenHash: 'auth_session.token_hash',
    selectedTenantId: 'auth_session.selected_tenant_id',
    expiresAt: 'auth_session.expires_at',
    createdAt: 'auth_session.created_at',
  },
  usuario: {
    id: 'usuario.id',
    authUserId: 'usuario.auth_user_id',
    email: 'usuario.email',
    nome: 'usuario.nome',
  },
}))

vi.mock('drizzle-orm', () => ({
  and: vi.fn((...conditions) => conditions),
  eq: vi.fn((left, right) => ({ left, right })),
  gt: vi.fn((left, right) => ({ left, right })),
}))

vi.mock('@/lib/db/index', () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn((value) => {
        state.insertValues.push(value)
        return Promise.resolve()
      }),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => {
        const where = vi.fn(async () => state.selectResults.shift() ?? [])
        return {
          where,
          innerJoin: vi.fn(() => ({ where })),
        }
      }),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(async () => undefined),
    })),
  },
}))

vi.mock('@/lib/auth/server', () => ({
  getNeonAuth: vi.fn(async () => state.neonAuth),
  isNeonAuthEnabled: vi.fn(() => true),
  isNeonAuthConfigured: vi.fn(() => true),
}))

import { createAuthSession } from '@/lib/auth/session'
import { getCurrentSession } from '@/lib/auth/session'

beforeEach(() => {
  vi.clearAllMocks()
  state.insertValues = []
  state.selectResults = []
})

describe('auth session', () => {
  it('inserts all generated session values explicitly for PostgreSQL sessions', async () => {
    await createAuthSession('user-1')

    expect(state.insertValues).toHaveLength(1)
    expect(state.insertValues[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        usuarioId: 'user-1',
        tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        selectedTenantId: null,
        expiresAt: expect.any(Date),
        createdAt: expect.any(Date),
      })
    )
    expect(state.cookieSet).toHaveBeenCalled()
  })

  it('resolves the business user from the immutable Neon Auth identity', async () => {
    state.selectResults = [[{ id: 'user-1', email: 'ana@example.com', nome: 'Ana' }]]
    state.cookieGet.mockReturnValue(undefined)

    await expect(getCurrentSession()).resolves.toEqual({
      usuarioId: 'user-1',
      email: 'ana@example.com',
      nome: 'Ana',
      selectedTenantId: null,
    })
  })

  it('falls back to the local session for users created by the admin', async () => {
    state.neonAuth.getSession.mockResolvedValueOnce({ data: { user: null }, error: null })
    state.cookieGet.mockReturnValue({ value: 'local-session-token' })
    state.selectResults = [[{ id: 'user-1', email: 'ana@example.com', nome: 'Ana' }]]

    await expect(getCurrentSession()).resolves.toEqual({
      usuarioId: 'user-1',
      email: 'ana@example.com',
      nome: 'Ana',
      selectedTenantId: null,
    })
  })
})
