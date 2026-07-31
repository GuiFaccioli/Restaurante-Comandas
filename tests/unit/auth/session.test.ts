import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  insertValues: [] as unknown[],
  cookieSet: vi.fn(),
  cookieGet: vi.fn(),
  cookieDelete: vi.fn(),
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
      from: vi.fn(() => ({
        where: vi.fn(async () => []),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(async () => undefined),
    })),
  },
}))

import { createAuthSession } from '@/lib/auth/session'

beforeEach(() => {
  vi.clearAllMocks()
  state.insertValues = []
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
})
