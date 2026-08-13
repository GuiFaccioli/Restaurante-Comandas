import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  schema: (() => {
    const column = (table: string, name: string) => ({ table, name })
    return {
      usuarioAcesso: {
        usuarioId: column('usuario_acesso', 'usuario_id'),
        tenantUserId: column('usuario_acesso', 'tenant_user_id'),
        acesso: column('usuario_acesso', 'acesso'),
      },
      tenantUser: {
        id: column('tenant_user', 'id'),
        tenantId: column('tenant_user', 'tenant_id'),
        usuarioId: column('tenant_user', 'usuario_id'),
        status: column('tenant_user', 'status'),
      },
      tenant: {
        id: column('tenant', 'id'),
        status: column('tenant', 'status'),
      },
    }
  })(),
  redirectMock: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`)
  }),
  getCurrentSessionMock: vi.fn(),
  currentSession: null as { usuarioId: string; email: string; nome: string; selectedTenantId?: string | null } | null,
  sessionResults: [] as Array<{
    usuarioId: string
    email: string
    nome: string
    selectedTenantId?: string | null
  }>,
  accessRows: [] as Array<{
    usuarioAcesso: {
      usuarioId: string
      tenantUserId: string
      acesso: 'admin' | 'caixa' | 'cozinha' | 'garcom'
    }
    tenantUser: {
      id: string
      tenantId: string
      usuarioId: string
      status: 'active' | 'inactive'
    }
    tenant: {
      id: string
      status: 'active' | 'inactive'
    }
  }>,
  queries: [] as Array<{
    selection: Record<string, unknown>
    from?: unknown
    joins: Array<{ table: unknown; on: unknown }>
    where?: unknown
  }>,
}))

vi.mock('next/navigation', () => ({
  redirect: state.redirectMock,
}))

vi.mock('@/lib/auth/session', () => ({
  getCurrentSession: state.getCurrentSessionMock,
}))

vi.mock('@/lib/db/schema', () => ({
  ...state.schema,
}))

vi.mock('drizzle-orm', () => ({
  and: vi.fn((...conditions) => ({ operator: 'and', conditions })),
  eq: vi.fn((left, right) => ({ operator: 'eq', left, right })),
}))

vi.mock('@/lib/db/index', () => ({
  db: {
    select: vi.fn((selection: Record<string, unknown>) => {
      const query = {
        selection,
        from: undefined as unknown,
        joins: [] as Array<{ table: unknown; on: unknown }>,
        where: undefined as unknown,
      }
      state.queries.push(query)

      const resolveValue = (
        value: unknown,
        row: (typeof state.accessRows)[number]
      ): unknown => {
        if (!value || typeof value !== 'object' || !('table' in value) || !('name' in value)) {
          return value
        }

        const column = value as { table: string; name: string }
        const tableName = column.table.replace(/_([a-z])/g, (_, letter: string) =>
          letter.toUpperCase()
        ) as keyof typeof row
        const camelName = column.name.replace(/_([a-z])/g, (_, letter: string) =>
          letter.toUpperCase()
        )
        return (row[tableName] as unknown as Record<string, unknown>)[camelName]
      }

      const matches = (
        condition: unknown,
        row: (typeof state.accessRows)[number]
      ): boolean => {
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
        return state.accessRows
          .filter((row) => matches(condition, row))
          .map((row) =>
            Object.fromEntries(
              Object.entries(selection).map(([key, column]) => [key, resolveValue(column, row)])
            )
          )
      })

      return builder
    }),
  },
}))

import {
  ACCESS_DESCRIPTION,
  ACCESS_DESTINATION,
  ACCESS_LABEL,
  getCurrentAccesses,
  redirectForAccesses,
  requireAccess,
} from '@/lib/auth/access'

beforeEach(() => {
  vi.clearAllMocks()
  state.currentSession = null
  state.sessionResults = []
  state.accessRows = []
  state.queries = []
  state.getCurrentSessionMock.mockImplementation(
    async () => state.sessionResults.shift() ?? state.currentSession
  )
})

function accessRow({
  access = 'cozinha',
  accessUserId = 'user-1',
  membershipUserId = 'user-1',
  tenantId = 'tenant-1',
  membershipStatus = 'active',
  tenantStatus = 'active',
}: {
  access?: 'admin' | 'caixa' | 'cozinha' | 'garcom'
  accessUserId?: string
  membershipUserId?: string
  tenantId?: string
  membershipStatus?: 'active' | 'inactive'
  tenantStatus?: 'active' | 'inactive'
} = {}): (typeof state.accessRows)[number] {
  return {
    usuarioAcesso: {
      usuarioId: accessUserId,
      tenantUserId: 'tenant-user-1',
      acesso: access,
    },
    tenantUser: {
      id: 'tenant-user-1',
      tenantId,
      usuarioId: membershipUserId,
      status: membershipStatus,
    },
    tenant: {
      id: tenantId,
      status: tenantStatus,
    },
  }
}

describe('access guard', () => {
  it('redirects anonymous users to sign-in', async () => {
    await expect(requireAccess('admin')).rejects.toThrow('REDIRECT:/auth/sign-in')
  })

  it('returns current accesses for authenticated users', async () => {
    state.currentSession = { usuarioId: 'user-1', email: 'a@b.com', nome: 'Ana', selectedTenantId: 'tenant-1' }
    state.accessRows = [accessRow({ access: 'garcom' }), accessRow({ access: 'cozinha' })]

    await expect(getCurrentAccesses()).resolves.toEqual(['garcom', 'cozinha'])

    const [accessQuery] = state.queries
    expect(accessQuery.joins.map((join) => join.table)).toEqual([
      state.schema.tenantUser,
      state.schema.tenant,
    ])
  })

  it('allows a matching permission', async () => {
    state.currentSession = { usuarioId: 'user-1', email: 'a@b.com', nome: 'Ana', selectedTenantId: 'tenant-1' }
    state.accessRows = [accessRow({ access: 'cozinha' })]

    await expect(requireAccess('cozinha')).resolves.toEqual({
      usuarioId: 'user-1',
      tenantId: 'tenant-1',
      access: 'cozinha',
    })
  })

  it('authorizes from one session snapshot when the selected tenant changes concurrently', async () => {
    state.sessionResults = [
      {
        usuarioId: 'user-1',
        email: 'a@b.com',
        nome: 'Ana',
        selectedTenantId: 'tenant-1',
      },
      {
        usuarioId: 'user-1',
        email: 'a@b.com',
        nome: 'Ana',
        selectedTenantId: 'tenant-2',
      },
    ]
    state.accessRows = [accessRow({ access: 'admin', tenantId: 'tenant-2' })]

    await expect(requireAccess('admin')).rejects.toThrow('REDIRECT:/sem-acesso?area=admin')
    expect(state.getCurrentSessionMock).toHaveBeenCalledTimes(1)
  })

  it('redirects authenticated users without a selected tenant to company selection', async () => {
    state.currentSession = { usuarioId: 'user-1', email: 'a@b.com', nome: 'Ana', selectedTenantId: null }

    await expect(requireAccess('admin')).rejects.toThrow('REDIRECT:/selecionar-empresa')
  })

  it('redirects when the user lacks the required permission', async () => {
    state.currentSession = { usuarioId: 'user-1', email: 'a@b.com', nome: 'Ana', selectedTenantId: 'tenant-1' }
    state.accessRows = [accessRow({ access: 'garcom' })]

    await expect(requireAccess('cozinha')).rejects.toThrow('REDIRECT:/sem-acesso?area=cozinha')
  })

  it('returns no access for an inactive membership and redirects through the guard', async () => {
    state.currentSession = { usuarioId: 'user-1', email: 'a@b.com', nome: 'Ana', selectedTenantId: 'tenant-1' }
    state.accessRows = [accessRow({ access: 'admin', membershipStatus: 'inactive' })]

    await expect(getCurrentAccesses()).resolves.toEqual([])
    await expect(requireAccess('admin')).rejects.toThrow('REDIRECT:/sem-acesso?area=admin')
  })

  it('returns no access for an inactive tenant and redirects through the guard', async () => {
    state.currentSession = { usuarioId: 'user-1', email: 'a@b.com', nome: 'Ana', selectedTenantId: 'tenant-1' }
    state.accessRows = [accessRow({ access: 'admin', tenantStatus: 'inactive' })]

    await expect(getCurrentAccesses()).resolves.toEqual([])
    await expect(requireAccess('admin')).rejects.toThrow('REDIRECT:/sem-acesso?area=admin')
  })

  it('returns no access when the membership belongs to another user', async () => {
    state.currentSession = { usuarioId: 'user-1', email: 'a@b.com', nome: 'Ana', selectedTenantId: 'tenant-1' }
    state.accessRows = [accessRow({ access: 'admin', membershipUserId: 'user-2' })]

    await expect(getCurrentAccesses()).resolves.toEqual([])
    await expect(requireAccess('admin')).rejects.toThrow('REDIRECT:/sem-acesso?area=admin')
  })

  it('routes single and multiple permissions to the correct destination', () => {
    expect(redirectForAccesses(['garcom'])).toBe('/garcom/pedidos')
    expect(redirectForAccesses(['cozinha'])).toBe('/cozinha/dashboard')
    expect(redirectForAccesses(['admin', 'caixa'])).toBe('/selecionar-area')
    expect(redirectForAccesses([])).toBe('/sem-acesso')
  })

  it('exposes shared access labels, descriptions, and destinations', () => {
    expect(ACCESS_LABEL.garcom).toBe('Garçom')
    expect(ACCESS_LABEL.cozinha).toBe('Cozinha')
    expect(ACCESS_DESTINATION.garcom).toBe('/garcom/pedidos')
    expect(ACCESS_DESTINATION.cozinha).toBe('/cozinha/dashboard')
    expect(ACCESS_DESCRIPTION.garcom).toContain('Selecionar mesas')
  })
})
