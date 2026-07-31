import Module from 'node:module'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

const mocks = vi.hoisted(() => {
  const poolClient = {
    query: vi.fn(async (_query: unknown) => ({ rows: [] })),
    release: vi.fn(),
  }
  const poolConstructor = vi.fn()

  class MockPool {
    readonly connect = vi.fn(async () => poolClient)
    readonly end = vi.fn(() => Promise.resolve())
    readonly on = vi.fn(
      (_event: string, _listener: (error: Error) => void) => this,
    )

    constructor(options: { connectionString: string }) {
      poolConstructor(options)
      poolInstances.push(this)
    }
  }

  const poolInstances: MockPool[] = []
  class MockWebSocket {}

  return {
    MockPool,
    MockWebSocket,
    neonConfig: { webSocketConstructor: undefined as unknown },
    poolClient,
    poolConstructor,
    poolInstances,
    wsLoad: vi.fn(),
  }
})

vi.mock('@neondatabase/serverless', () => ({
  Pool: mocks.MockPool,
  neonConfig: mocks.neonConfig,
}))

type ModuleLoader = (
  request: string,
  parent: unknown,
  isMain: boolean,
) => unknown

const moduleWithLoader = Module as unknown as { _load: ModuleLoader }
const originalModuleLoader = moduleWithLoader._load
const poolCacheKey = Symbol.for('restaurante-comandas.neon-pool')
const originalDatabaseUrl = process.env.DATABASE_URL
const originalNextPhase = process.env.NEXT_PHASE

async function loadDatabase(databaseUrl: string, nextPhase: string | null = null) {
  process.env.DATABASE_URL = databaseUrl
  if (nextPhase === null) delete process.env.NEXT_PHASE
  else process.env.NEXT_PHASE = nextPhase
  vi.resetModules()
  return import('@/lib/db/index')
}

beforeAll(async () => {
  const actualNeon = await vi.importActual<typeof import('@neondatabase/serverless')>(
    '@neondatabase/serverless',
  )
  Object.setPrototypeOf(mocks.MockPool.prototype, actualNeon.Pool.prototype)

  moduleWithLoader._load = (request, parent, isMain) => {
    if (request === 'ws') {
      mocks.wsLoad()
      return mocks.MockWebSocket
    }
    return originalModuleLoader(request, parent, isMain)
  }
})

beforeEach(() => {
  vi.clearAllMocks()
  mocks.poolInstances.length = 0
  mocks.neonConfig.webSocketConstructor = undefined
  delete (globalThis as typeof globalThis & Record<symbol, unknown>)[poolCacheKey]
})

afterEach(() => {
  if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL
  else process.env.DATABASE_URL = originalDatabaseUrl
  if (originalNextPhase === undefined) delete process.env.NEXT_PHASE
  else process.env.NEXT_PHASE = originalNextPhase
  delete (globalThis as typeof globalThis & Record<symbol, unknown>)[poolCacheKey]
  vi.resetModules()
  vi.restoreAllMocks()
})

afterAll(() => {
  moduleWithLoader._load = originalModuleLoader
})

describe('PostgreSQL database runtime', () => {
  it('does not expose SQLite transaction compatibility', () => {
    const source = readFileSync(join(process.cwd(), 'lib/db/index.ts'), 'utf8')

    expect(source).not.toMatch(/sqliteOperation|sqliteMode/)
  })

  it('requires DATABASE_URL even during a production build', async () => {
    await expect(loadDatabase('', 'phase-production-build')).rejects.toThrow(
      'DATABASE_URL is required',
    )
    expect(mocks.poolConstructor).not.toHaveBeenCalled()
  })

  it.each([
    'file::memory:',
    'FILE:./dev.db',
    'mysql://localhost/database',
    'https://example.com/database',
  ])('rejects non-PostgreSQL DATABASE_URL %s', async (databaseUrl) => {
    await expect(loadDatabase(databaseUrl)).rejects.toThrow(
      'Unsupported DATABASE_URL. Expected postgres:// or postgresql://.',
    )
    expect(mocks.poolConstructor).not.toHaveBeenCalled()
  })

  it.each([
    'postgresql://user:password@example.neon.tech/database',
    'postgres://user:password@example.neon.tech/database',
    'POSTGRESQL://user:password@example.neon.tech/database',
  ])('creates a pooled Neon client for %s', async (databaseUrl) => {
    const { db } = await loadDatabase(databaseUrl)

    expect(mocks.poolConstructor).toHaveBeenCalledWith({
      connectionString: databaseUrl,
    })
    expect(db.$client).toBe(mocks.poolInstances[0])
    expect(mocks.wsLoad).toHaveBeenCalledOnce()
  })

  it.each(['postgresql:///database', 'postgres:///database'])(
    'requires a hostname for PostgreSQL URL %s',
    async (databaseUrl) => {
      await expect(loadDatabase(databaseUrl)).rejects.toThrow(
        'PostgreSQL DATABASE_URL must include a hostname',
      )
    },
  )
})

describe('PostgreSQL Pool lifecycle', () => {
  it('reuses one Pool and registers one credential-safe error handler across re-evaluation', async () => {
    const databaseUrl =
      'postgresql://sensitive-user:sensitive-password@example.neon.tech/database'
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const firstModule = await loadDatabase(databaseUrl)
    vi.resetModules()
    const secondModule = await import('@/lib/db/index')

    expect(mocks.poolConstructor).toHaveBeenCalledOnce()
    expect(firstModule.db.$client).toBe(secondModule.db.$client)
    expect(mocks.poolInstances[0].on).toHaveBeenCalledOnce()
    const errorHandler = mocks.poolInstances[0].on.mock.calls[0]?.[1]
    errorHandler?.(new Error(`connection failed: ${databaseUrl}`))
    expect(consoleError).toHaveBeenCalledWith(
      'PostgreSQL pool emitted an unexpected error',
    )
    expect(consoleError.mock.calls.flat().join(' ')).not.toContain(
      'sensitive-password',
    )
  })

  it('closes a cached Pool with a different URL without blocking replacement', async () => {
    const firstUrl = 'postgresql://first-user:first-secret@first.neon.tech/database'
    const secondUrl = 'postgresql://second-user:second-secret@second.neon.tech/database'
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    await loadDatabase(firstUrl)

    let rejectClose: ((reason: Error) => void) | undefined
    mocks.poolInstances[0].end.mockReturnValueOnce(
      new Promise<void>((_resolve, reject) => { rejectClose = reject }),
    )
    process.env.DATABASE_URL = secondUrl
    vi.resetModules()
    const replacementModule = await import('@/lib/db/index')

    expect(mocks.poolConstructor).toHaveBeenCalledTimes(2)
    expect(mocks.poolInstances[0].end).toHaveBeenCalledOnce()
    expect(replacementModule.db.$client).toBe(mocks.poolInstances[1])
    rejectClose?.(new Error(`failed to close ${firstUrl}`))
    await vi.waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith(
        'Failed to close replaced PostgreSQL pool',
      )
    })
  })
})

describe('PostgreSQL transaction helper', () => {
  it('executes only the asynchronous PostgreSQL operation', async () => {
    const { runInDbTransaction } = await loadDatabase(
      'postgresql://user:password@example.neon.tech/database',
    )
    const postgresOperation = vi.fn(async () => 'postgres')
    const result = await runInDbTransaction({ postgresOperation })

    const statements = mocks.poolClient.query.mock.calls.map(([query]) =>
      typeof query === 'string' ? query : (query as { text: string }).text,
    )
    expect(result).toBe('postgres')
    expect(postgresOperation).toHaveBeenCalledOnce()
    expect(mocks.poolInstances[0].connect).toHaveBeenCalledOnce()
    expect(statements[0]).toMatch(/^begin/)
    expect(statements.at(-1)).toBe('commit')
    expect(mocks.poolClient.release).toHaveBeenCalledOnce()
  })
})
