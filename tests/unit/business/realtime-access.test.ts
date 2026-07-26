import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  addClient: vi.fn(),
  removeClient: vi.fn(),
  requireAnyAccess: vi.fn(async () => ({
    usuarioId: 'user-1',
    tenantId: 'trusted-tenant',
    access: 'cozinha',
  })),
}))

vi.mock('@/lib/sse', () => ({
  addClient: mocks.addClient,
  removeClient: mocks.removeClient,
}))

vi.mock('@/lib/auth/access', () => ({
  requireAnyAccess: mocks.requireAnyAccess,
}))

const root = process.cwd()

function readProjectFile(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('operational realtime access', () => {
  it('allows kitchen, waiter, and cashier screens to subscribe to order events', () => {
    const route = readProjectFile('app/api/events/route.ts')
    const access = readProjectFile('lib/auth/access.ts')

    expect(access).toContain('requireAnyAccess')
    expect(route).toContain('requireAnyAccess')
    expect(route).toContain("'cozinha'")
    expect(route).toContain("'garcom'")
    expect(route).toContain("'caixa'")
    expect(route).not.toContain("requireAccess('cozinha')")
  })

  it('registers the stream under the authenticated tenant instead of request input', async () => {
    const { GET } = await import('@/app/api/events/route')
    const request = new Request('http://localhost/api/events?tenantId=attacker-tenant', {
      headers: { 'x-tenant-id': 'attacker-tenant' },
    })

    const response = await GET(request as never)
    const controller = mocks.addClient.mock.calls[0]?.[1]

    expect(mocks.requireAnyAccess).toHaveBeenCalledWith(['cozinha', 'garcom', 'caixa'])
    expect(mocks.addClient).toHaveBeenCalledWith('trusted-tenant', controller)

    await response.body?.cancel()
  })

  it('removes the client with the authenticated tenant when the stream is canceled', async () => {
    const { GET } = await import('@/app/api/events/route')
    const response = await GET(new Request('http://localhost/api/events') as never)
    const controller = mocks.addClient.mock.calls[0]?.[1]

    await response.body?.cancel()

    expect(mocks.removeClient).toHaveBeenCalledWith('trusted-tenant', controller)
  })

  it('removes the client with the authenticated tenant when the request aborts', async () => {
    const { GET } = await import('@/app/api/events/route')
    const abortController = new AbortController()
    const response = await GET(
      new Request('http://localhost/api/events', { signal: abortController.signal }) as never
    )
    const controller = mocks.addClient.mock.calls[0]?.[1]

    abortController.abort()

    expect(mocks.removeClient).toHaveBeenCalledWith('trusted-tenant', controller)
    await response.body?.cancel()
    expect(mocks.removeClient).toHaveBeenCalledTimes(1)
  })

  it('does not register a client for a request aborted before the route runs', async () => {
    const { GET } = await import('@/app/api/events/route')
    const abortController = new AbortController()
    abortController.abort()

    const response = await GET(
      new Request('http://localhost/api/events', { signal: abortController.signal }) as never
    )
    const reader = response.body?.getReader()

    expect(mocks.addClient).not.toHaveBeenCalled()
    await expect(reader?.read()).resolves.toEqual({ done: true, value: undefined })
  })

  it('does not register a client when the request aborts during authentication', async () => {
    const { GET } = await import('@/app/api/events/route')
    const abortController = new AbortController()
    let resolveAccess!: (access: {
      usuarioId: string
      tenantId: string
      access: string
    }) => void
    mocks.requireAnyAccess.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveAccess = resolve
        })
    )

    const responsePromise = GET(
      new Request('http://localhost/api/events', { signal: abortController.signal }) as never
    )
    abortController.abort()
    resolveAccess({
      usuarioId: 'user-1',
      tenantId: 'trusted-tenant',
      access: 'cozinha',
    })

    const response = await responsePromise
    const reader = response.body?.getReader()

    expect(mocks.addClient).not.toHaveBeenCalled()
    await expect(reader?.read()).resolves.toEqual({ done: true, value: undefined })
  })
})
