import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  schema: (() => {
    const column = (table: string, name: string) => ({ table, name })
    return {
      usuario: {
        id: column('usuario', 'id'),
        nome: column('usuario', 'nome'),
        email: column('usuario', 'email'),
        passwordHash: column('usuario', 'password_hash'),
        role: column('usuario', 'role'),
      },
      usuarioAcesso: {
        usuarioId: column('usuario_acesso', 'usuario_id'),
        tenantUserId: column('usuario_acesso', 'tenant_user_id'),
        acesso: column('usuario_acesso', 'acesso'),
      },
      tenant: {
        id: column('tenant', 'id'),
        nome: column('tenant', 'nome'),
        slug: column('tenant', 'slug'),
        status: column('tenant', 'status'),
      },
      tenantUser: {
        id: column('tenant_user', 'id'),
        tenantId: column('tenant_user', 'tenant_id'),
        usuarioId: column('tenant_user', 'usuario_id'),
        status: column('tenant_user', 'status'),
      },
    }
  })(),
  sqliteSchema: (() => {
    const column = (table: string, name: string) => ({ dialect: 'sqlite', table, name })
    return {
      usuario: {
        id: column('usuario', 'id'),
        nome: column('usuario', 'nome'),
        email: column('usuario', 'email'),
        passwordHash: column('usuario', 'password_hash'),
        role: column('usuario', 'role'),
      },
      usuarioAcesso: {
        usuarioId: column('usuario_acesso', 'usuario_id'),
        tenantUserId: column('usuario_acesso', 'tenant_user_id'),
        acesso: column('usuario_acesso', 'acesso'),
      },
      tenant: {
        id: column('tenant', 'id'),
        nome: column('tenant', 'nome'),
        slug: column('tenant', 'slug'),
        status: column('tenant', 'status'),
      },
      tenantUser: {
        id: column('tenant_user', 'id'),
        tenantId: column('tenant_user', 'tenant_id'),
        usuarioId: column('tenant_user', 'usuario_id'),
        status: column('tenant_user', 'status'),
      },
    }
  })(),
  transactionBackend: 'postgresql' as 'sqlite' | 'postgresql',
  selectResults: [] as Array<
    | unknown[]
    | ((query: {
        selection: unknown
        from?: unknown
        joins: Array<{ table: unknown; on: unknown }>
        where?: unknown
      }) => unknown[])
  >,
  insertValues: [] as unknown[],
  insertAttempts: [] as unknown[],
  insertFailureAt: null as number | null,
  insertFailure: null as unknown,
  events: [] as string[],
  queries: [] as Array<{
    selection: unknown
    from?: unknown
    joins: Array<{ table: unknown; on: unknown }>
    where?: unknown
  }>,
  redirectMock: vi.fn((path: string) => {
    state.events.push(`redirect:${path}`)
    throw new Error(`REDIRECT:${path}`)
  }),
  createAuthSessionMock: vi.fn(async () => {
    state.events.push('session')
  }),
  runInDbTransactionMock: vi.fn(),
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
  ...state.schema,
}))

vi.mock('@/lib/db/schema-sqlite', () => ({
  ...state.sqliteSchema,
}))

vi.mock('drizzle-orm', () => ({
  and: vi.fn((...conditions) => ({ operator: 'and', conditions })),
  eq: vi.fn((left, right) => ({ operator: 'eq', left, right })),
}))

vi.mock('@/lib/db/index', () => ({
  db: (() => {
    const nextSelectResult = (query: {
      selection: unknown
      from?: unknown
      joins: Array<{ table: unknown; on: unknown }>
      where?: unknown
    }) => {
      const result = state.selectResults.shift()
      return typeof result === 'function' ? result(query) : (result ?? [])
    }

    const recordInsert = (value: unknown, pendingInserts?: unknown[]) => {
      state.insertAttempts.push(value)
      if (
        state.insertFailureAt !== null &&
        state.insertAttempts.length === state.insertFailureAt
      ) {
        throw state.insertFailure
      }

      if (pendingInserts) {
        pendingInserts.push(value)
      } else {
        state.insertValues.push(value)
      }
    }

    const createPostgresClient = (pendingInserts?: unknown[]) => ({
      select: vi.fn((selection) => {
        const query = {
          selection,
          from: undefined as unknown,
          joins: [] as Array<{ table: unknown; on: unknown }>,
          where: undefined as unknown,
        }
        state.queries.push(query)

        const builder: {
          from: ReturnType<typeof vi.fn>
          innerJoin: ReturnType<typeof vi.fn>
          where: ReturnType<typeof vi.fn>
        } = {
          from: vi.fn(),
          innerJoin: vi.fn(),
          where: vi.fn(),
        }
        builder.from.mockImplementation((table) => {
          query.from = table
          return builder
        })
        builder.innerJoin.mockImplementation((table, on) => {
          query.joins.push({ table, on })
          return builder
        })
        builder.where.mockImplementation(async (condition) => {
          query.where = condition
          return nextSelectResult(query)
        })

        return builder
      }),
      insert: vi.fn(() => ({
        values: vi.fn((value) => {
          try {
            recordInsert(value, pendingInserts)
            return Promise.resolve()
          } catch (error) {
            return Promise.reject(error)
          }
        }),
      })),
    })

    const createSqliteClient = (pendingInserts: unknown[]) => ({
      select: vi.fn((selection) => {
        const query = {
          selection,
          from: undefined as unknown,
          joins: [] as Array<{ table: unknown; on: unknown }>,
          where: undefined as unknown,
        }
        state.queries.push(query)

        const builder: {
          from: ReturnType<typeof vi.fn>
          innerJoin: ReturnType<typeof vi.fn>
          where: ReturnType<typeof vi.fn>
          get: ReturnType<typeof vi.fn>
          all: ReturnType<typeof vi.fn>
        } = {
          from: vi.fn(),
          innerJoin: vi.fn(),
          where: vi.fn(),
          get: vi.fn(),
          all: vi.fn(),
        }
        builder.from.mockImplementation((table) => {
          query.from = table
          return builder
        })
        builder.innerJoin.mockImplementation((table, on) => {
          query.joins.push({ table, on })
          return builder
        })
        builder.where.mockImplementation((condition) => {
          query.where = condition
          return builder
        })
        builder.get.mockImplementation(() => nextSelectResult(query)[0])
        builder.all.mockImplementation(() => nextSelectResult(query))

        return builder
      }),
      insert: vi.fn(() => ({
        values: vi.fn((value) => ({
          run: vi.fn(() => {
            recordInsert(value, pendingInserts)
          }),
        })),
      })),
    })

    const client = createPostgresClient()
    state.runInDbTransactionMock.mockImplementation(
      (operations: {
        sqliteOperation: (tx: ReturnType<typeof createSqliteClient>) => unknown
        postgresOperation: (tx: ReturnType<typeof createPostgresClient>) => Promise<unknown>
      }) => {
        state.events.push(`transaction:${state.transactionBackend}:start`)
        const pendingInserts: unknown[] = []

        if (state.transactionBackend === 'sqlite') {
          try {
            const result = operations.sqliteOperation(createSqliteClient(pendingInserts))
            if (result && typeof result === 'object' && 'then' in result) {
              throw new TypeError('SQLite transaction operations must be synchronous')
            }
            state.insertValues.push(...pendingInserts)
            state.events.push('transaction:commit')
            return result
          } catch (error) {
            state.events.push('transaction:rollback')
            throw error
          }
        }

        let result: Promise<unknown>
        try {
          result = operations.postgresOperation(createPostgresClient(pendingInserts))
          if (!result || typeof result.then !== 'function') {
            throw new TypeError('PostgreSQL transaction operations must be asynchronous')
          }
        } catch (error) {
          state.events.push('transaction:rollback')
          return Promise.reject(error)
        }

        return result.then(
          (value) => {
            state.insertValues.push(...pendingInserts)
            state.events.push('transaction:commit')
            return value
          },
          (error) => {
            state.events.push('transaction:rollback')
            throw error
          }
        )
      }
    )

    return client
  })(),
  runInDbTransaction: state.runInDbTransactionMock,
}))

import {
  listCurrentTenantMemberships,
  selectTenant,
  signIn,
  signOut,
  signUpOwner,
} from '@/lib/actions/auth'

function hasEquality(condition: unknown, left: unknown, right: unknown): boolean {
  if (!condition || typeof condition !== 'object') return false

  const node = condition as {
    operator?: string
    left?: unknown
    right?: unknown
    conditions?: unknown[]
  }

  if (node.operator === 'eq') return node.left === left && node.right === right
  return node.conditions?.some((child) => hasEquality(child, left, right)) ?? false
}

function membershipRow({
  membershipStatus = 'active',
  tenantStatus = 'active',
}: {
  membershipStatus?: 'active' | 'inactive'
  tenantStatus?: 'active' | 'inactive'
} = {}) {
  return {
    tenantUser: {
      id: 'tenant-user-1',
      tenantId: 'tenant-1',
      usuarioId: 'user-1',
      status: membershipStatus,
    },
    tenant: {
      id: 'tenant-1',
      nome: 'Pizza Boa',
      status: tenantStatus,
    },
  }
}

function membershipRowsForQuery(
  query: {
    selection: unknown
    where?: unknown
  },
  rows: ReturnType<typeof membershipRow>[]
): unknown[] {
  const resolveValue = (value: unknown, row: ReturnType<typeof membershipRow>): unknown => {
    if (!value || typeof value !== 'object' || !('table' in value) || !('name' in value)) {
      return value
    }

    const column = value as { table: 'tenant_user' | 'tenant'; name: string }
    const table = column.table === 'tenant_user' ? row.tenantUser : row.tenant
    const property = column.name.replace(/_([a-z])/g, (_, letter: string) =>
      letter.toUpperCase()
    )
    return (table as unknown as Record<string, unknown>)[property]
  }

  const matches = (condition: unknown, row: ReturnType<typeof membershipRow>): boolean => {
    if (!condition || typeof condition !== 'object') return true
    const node = condition as {
      operator?: string
      left?: unknown
      right?: unknown
      conditions?: unknown[]
    }
    if (node.operator === 'and') {
      return node.conditions?.every((child) => matches(child, row)) ?? true
    }
    if (node.operator === 'eq') {
      return resolveValue(node.left, row) === resolveValue(node.right, row)
    }
    return true
  }

  const selection = query.selection as Record<string, unknown>
  return rows
    .filter((row) => matches(query.where, row))
    .map((row) =>
      Object.fromEntries(
        Object.entries(selection).map(([key, column]) => [key, resolveValue(column, row)])
      )
    )
}

beforeEach(() => {
  vi.clearAllMocks()
  state.selectResults = []
  state.insertValues = []
  state.insertAttempts = []
  state.insertFailureAt = null
  state.insertFailure = null
  state.events = []
  state.transactionBackend = 'postgresql'
  state.queries = []
  state.currentSession = null
  state.createAuthSessionMock.mockImplementation(async () => {
    state.events.push('session')
  })
})

describe('auth actions', () => {
  it.each(['sqlite', 'postgresql'] as const)(
    'rejects an existing e-mail without creating tenant data or a session on %s',
    async (backend) => {
      state.transactionBackend = backend
      state.selectResults = [[{ id: 'existing-user' }]]

      await expect(
        signUpOwner({
          nome: 'Ana',
          email: 'ana@example.com',
          password: 'senha-certa',
          tenantNome: 'Pizza Centro',
        })
      ).rejects.toThrow('Não foi possível criar a conta')

      expect(state.insertValues).toEqual([])
      expect(state.runInDbTransactionMock).toHaveBeenCalledTimes(1)
      expect(state.createAuthSessionMock).not.toHaveBeenCalled()
      expect(state.redirectMock).not.toHaveBeenCalled()
    }
  )

  it.each(['sqlite', 'postgresql'] as const)(
    'creates owner tenant membership with hashed password and admin access on %s',
    async (backend) => {
      state.transactionBackend = backend
      state.selectResults = [[]]

      await expect(
        signUpOwner({
          nome: 'Ana',
          email: 'ANA@example.com',
          password: 'senha-certa',
          tenantNome: 'Pizza Boa',
        })
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
      expect(state.createAuthSessionMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String)
      )
      expect(state.runInDbTransactionMock).toHaveBeenCalledTimes(1)
      expect(state.queries[0].from).toBe(
        backend === 'sqlite' ? state.sqliteSchema.usuario : state.schema.usuario
      )
      expect(state.events).toContain(`transaction:${backend}:start`)
      expect(state.events.indexOf('transaction:commit')).toBeLessThan(
        state.events.indexOf('session')
      )
    }
  )

  it.each(['sqlite', 'postgresql'] as const)(
    'rolls back all signup writes on an intermediate %s failure',
    async (backend) => {
      state.transactionBackend = backend
      state.selectResults = [[]]
      state.insertFailureAt = 2
      state.insertFailure = new Error('tenant insert failed')

      await expect(
        signUpOwner({
          nome: 'Ana',
          email: 'ana@example.com',
          password: 'senha-certa',
          tenantNome: 'Pizza Boa',
        })
      ).rejects.toThrow('tenant insert failed')

      expect(state.insertAttempts).toHaveLength(2)
      expect(state.insertValues).toEqual([])
      expect(state.events).toContain('transaction:rollback')
      expect(state.createAuthSessionMock).not.toHaveBeenCalled()
      expect(state.redirectMock).not.toHaveBeenCalled()
    }
  )

  it.each(['sqlite', 'postgresql'] as const)(
    'normalizes a concurrent %s e-mail uniqueness conflict without creating a session',
    async (backend) => {
      state.transactionBackend = backend
      state.selectResults = [[]]
      state.insertFailureAt = 1
      state.insertFailure =
        backend === 'sqlite'
          ? Object.assign(new Error('UNIQUE constraint failed: usuario.email'), {
              code: 'SQLITE_CONSTRAINT_UNIQUE',
            })
          : Object.assign(
              new Error('duplicate key value violates unique constraint "usuario_email_unique"'),
              { code: '23505', constraint: 'usuario_email_unique' }
            )

      await expect(
        signUpOwner({
          nome: 'Ana',
          email: 'ana@example.com',
          password: 'senha-certa',
          tenantNome: 'Pizza Boa',
        })
      ).rejects.toThrow('Não foi possível criar a conta')

      expect(state.insertValues).toEqual([])
      expect(state.events).toContain('transaction:rollback')
      expect(state.createAuthSessionMock).not.toHaveBeenCalled()
      expect(state.redirectMock).not.toHaveBeenCalled()
    }
  )

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

    const membershipQuery = state.queries[1]
    expect(membershipQuery.joins).toEqual([
      expect.objectContaining({ table: state.schema.tenant }),
    ])
    expect(hasEquality(membershipQuery.where, state.schema.tenantUser.usuarioId, 'user-1')).toBe(true)
    expect(hasEquality(membershipQuery.where, state.schema.tenantUser.status, 'active')).toBe(true)
    expect(hasEquality(membershipQuery.where, state.schema.tenant.status, 'active')).toBe(true)

    const accessQuery = state.queries[2]
    expect(
      hasEquality(accessQuery.where, state.schema.usuarioAcesso.tenantUserId, 'tenant-user-1')
    ).toBe(true)
    expect(hasEquality(accessQuery.where, state.schema.usuarioAcesso.usuarioId, 'user-1')).toBe(
      true
    )
  })

  it.each([
    {
      inactiveResource: 'membership',
      row: membershipRow({ membershipStatus: 'inactive' }),
    },
    {
      inactiveResource: 'tenant',
      row: membershipRow({ tenantStatus: 'inactive' }),
    },
  ])('ignores an inactive $inactiveResource during login', async ({ row }) => {
    state.selectResults = [
      [{ id: 'user-1', passwordHash: 'hashed-password' }],
      (query) => membershipRowsForQuery(query, [row]),
    ]

    await expect(signIn({ email: 'ana@example.com', password: 'senha-certa' })).rejects.toThrow(
      'REDIRECT:/sem-acesso'
    )

    expect(state.createAuthSessionMock).toHaveBeenCalledWith('user-1')
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

  it('lists only active memberships from active tenants', async () => {
    state.currentSession = {
      usuarioId: 'user-1',
      email: 'ana@example.com',
      nome: 'Ana',
      selectedTenantId: null,
    }
    state.selectResults = [[{ tenantId: 'tenant-1', nome: 'Pizza Boa' }]]

    await expect(listCurrentTenantMemberships()).resolves.toEqual([
      { tenantId: 'tenant-1', nome: 'Pizza Boa' },
    ])

    const [membershipQuery] = state.queries
    expect(membershipQuery.joins).toEqual([
      expect.objectContaining({ table: state.schema.tenant }),
    ])
    expect(hasEquality(membershipQuery.where, state.schema.tenantUser.usuarioId, 'user-1')).toBe(true)
    expect(hasEquality(membershipQuery.where, state.schema.tenantUser.status, 'active')).toBe(true)
    expect(hasEquality(membershipQuery.where, state.schema.tenant.status, 'active')).toBe(true)
  })

  it.each([
    {
      inactiveResource: 'membership',
      row: membershipRow({ membershipStatus: 'inactive' }),
    },
    {
      inactiveResource: 'tenant',
      row: membershipRow({ tenantStatus: 'inactive' }),
    },
  ])('does not list an inactive $inactiveResource', async ({ row }) => {
    state.currentSession = {
      usuarioId: 'user-1',
      email: 'ana@example.com',
      nome: 'Ana',
      selectedTenantId: null,
    }
    state.selectResults = [(query) => membershipRowsForQuery(query, [row])]

    await expect(listCurrentTenantMemberships()).resolves.toEqual([])
  })

  it('selects only an active membership from an active tenant', async () => {
    state.currentSession = {
      usuarioId: 'user-1',
      email: 'ana@example.com',
      nome: 'Ana',
      selectedTenantId: null,
    }
    state.selectResults = [[{ tenantId: 'tenant-1' }]]

    await expect(selectTenant({ tenantId: 'tenant-1' })).rejects.toThrow(
      'REDIRECT:/selecionar-area'
    )

    const [membershipQuery] = state.queries
    expect(membershipQuery.joins).toEqual([
      expect.objectContaining({ table: state.schema.tenant }),
    ])
    expect(hasEquality(membershipQuery.where, state.schema.tenantUser.usuarioId, 'user-1')).toBe(true)
    expect(
      hasEquality(membershipQuery.where, state.schema.tenantUser.tenantId, 'tenant-1')
    ).toBe(true)
    expect(hasEquality(membershipQuery.where, state.schema.tenantUser.status, 'active')).toBe(true)
    expect(hasEquality(membershipQuery.where, state.schema.tenant.status, 'active')).toBe(true)
    expect(state.setSelectedTenantMock).toHaveBeenCalledWith('tenant-1')
  })

  it.each([
    {
      inactiveResource: 'membership',
      row: membershipRow({ membershipStatus: 'inactive' }),
    },
    {
      inactiveResource: 'tenant',
      row: membershipRow({ tenantStatus: 'inactive' }),
    },
  ])('does not select an inactive $inactiveResource', async ({ row }) => {
    state.currentSession = {
      usuarioId: 'user-1',
      email: 'ana@example.com',
      nome: 'Ana',
      selectedTenantId: null,
    }
    state.selectResults = [(query) => membershipRowsForQuery(query, [row])]

    await expect(selectTenant({ tenantId: 'tenant-1' })).rejects.toThrow(
      'REDIRECT:/sem-acesso'
    )
    expect(state.setSelectedTenantMock).not.toHaveBeenCalled()
  })
})


