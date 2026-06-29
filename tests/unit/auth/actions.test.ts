import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  selectResults: [] as unknown[][],
  insertValues: [] as unknown[],
  redirectMock: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`)
  }),
  createAuthSessionMock: vi.fn(),
  destroyCurrentSessionMock: vi.fn(),
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
    acesso: 'usuario_acesso.acesso',
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((left, right) => ({ left, right })),
}))

vi.mock('@/lib/db/index', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
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
  it('rejects duplicate sign-up email', async () => {
    state.selectResults = [[{ id: 'existing-user' }]]

    await expect(
      signUpOwner({ nome: 'Ana', email: 'ana@example.com', password: 'senha-certa' })
    ).rejects.toThrow('E-mail já cadastrado')
  })

  it('creates owner with hashed password and admin access', async () => {
    state.selectResults = [[]]

    await expect(
      signUpOwner({ nome: 'Ana', email: 'ANA@example.com', password: 'senha-certa' })
    ).rejects.toThrow('REDIRECT:/selecionar-area')

    expect(state.insertValues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          nome: 'Ana',
          email: 'ana@example.com',
          passwordHash: 'hashed-password',
          role: 'admin',
        }),
        expect.objectContaining({
          acesso: 'admin',
        }),
      ])
    )
    expect(state.createAuthSessionMock).toHaveBeenCalled()
  })

  it('rejects invalid login credentials', async () => {
    state.selectResults = [[{ id: 'user-1', passwordHash: 'hashed-password' }]]

    await expect(signIn({ email: 'ana@example.com', password: 'senha-errada' })).rejects.toThrow(
      'E-mail ou senha incorretos'
    )
  })

  it('creates a session and redirects by user accesses on valid login', async () => {
    state.selectResults = [
      [{ id: 'user-1', passwordHash: 'hashed-password' }],
      [{ acesso: 'garcom' }, { acesso: 'cozinha' }],
    ]

    await expect(signIn({ email: 'ana@example.com', password: 'senha-certa' })).rejects.toThrow(
      'REDIRECT:/selecionar-area'
    )

    expect(state.createAuthSessionMock).toHaveBeenCalledWith('user-1')
  })

  it('signs out and redirects to sign-in', async () => {
    await expect(signOut()).rejects.toThrow('REDIRECT:/auth/sign-in')
    expect(state.destroyCurrentSessionMock).toHaveBeenCalled()
  })
})
