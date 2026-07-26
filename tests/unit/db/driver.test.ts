import Module from 'node:module'
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
  const sqliteTransaction = {}
  const sqliteDb = {
    transaction: vi.fn(
      (operation: (transaction: typeof sqliteTransaction) => unknown) =>
        operation(sqliteTransaction),
    ),
  }
  const drizzleSqlite = vi.fn(() => sqliteDb)
  const databaseConstructor = vi.fn()

  class MockDatabase {
    readonly pragma = vi.fn()

    constructor(path: string) {
      databaseConstructor(path)
    }
  }

  class MockWebSocket {}

  return {
    MockDatabase,
    MockPool,
    MockWebSocket,
    databaseConstructor,
    drizzleSqlite,
    migrateSqliteDatabase: vi.fn(),
    neonConfig: {
      webSocketConstructor: undefined as unknown,
    },
    poolClient,
    poolConstructor,
    poolInstances,
    sqliteDb,
    sqliteTransaction,
    wsLoad: vi.fn(),
  }
})

vi.mock('@neondatabase/serverless', () => ({
  Pool: mocks.MockPool,
  neonConfig: mocks.neonConfig,
}))

vi.mock('@/lib/db/sqlite-migrations', () => ({
  migrateSqliteDatabase: mocks.migrateSqliteDatabase,
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

async function loadDatabase(
  databaseUrl: string,
  nextPhase: string | null = 'phase-production-build',
) {
  process.env.DATABASE_URL = databaseUrl
  if (nextPhase === null) delete process.env.NEXT_PHASE
  else process.env.NEXT_PHASE = nextPhase
  vi.resetModules()
  return import('@/lib/db/index')
}

beforeAll(async () => {
  const actualNeon = await vi.importActual<
    typeof import('@neondatabase/serverless')
  >('@neondatabase/serverless')
  Object.setPrototypeOf(mocks.MockPool.prototype, actualNeon.Pool.prototype)

  moduleWithLoader._load = (request, parent, isMain) => {
    if (request === 'better-sqlite3') return mocks.MockDatabase
    if (request === 'drizzle-orm/better-sqlite3') {
      return { drizzle: mocks.drizzleSqlite }
    }
    if (request === './schema-sqlite') return {}
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

describe('database driver selection', () => {
  it('fails without DATABASE_URL outside production build', async () => {
    await expect(loadDatabase('', null)).rejects.toThrow(
      'DATABASE_URL is required',
    )
    expect(mocks.databaseConstructor).not.toHaveBeenCalled()
  })

  it('uses explicit in-memory SQLite only during production build without DATABASE_URL', async () => {
    await loadDatabase('', 'phase-production-build')
    expect(mocks.databaseConstructor).toHaveBeenCalledWith(':memory:')
    expect(mocks.databaseConstructor).not.toHaveBeenCalledWith('./dev.db')
  })

  it.each([
    'postgresql://user:password@example.neon.tech/database',
    'postgres://user:password@example.neon.tech/database',
    'POSTGRESQL://user:password@example.neon.tech/database',
  ])('selects PostgreSQL for %s URLs', async (databaseUrl) => {
    const { db } = await loadDatabase(databaseUrl)

    expect(mocks.poolConstructor).toHaveBeenCalledWith({
      connectionString: databaseUrl,
    })
    expect(db.$client).toBe(mocks.poolInstances[0])
    expect(mocks.wsLoad).toHaveBeenCalledOnce()
    expect(mocks.databaseConstructor).not.toHaveBeenCalled()
  })

  it.each([
    'mysql://localhost/database',
    'https://example.com/database',
    './custom.db',
  ])('rejects unsupported non-empty DATABASE_URL %s', async (databaseUrl) => {
    await expect(loadDatabase(databaseUrl)).rejects.toThrow(
      'Unsupported DATABASE_URL',
    )

    expect(mocks.poolConstructor).not.toHaveBeenCalled()
    expect(mocks.databaseConstructor).not.toHaveBeenCalled()
    expect(mocks.wsLoad).not.toHaveBeenCalled()
  })

  it.each([
    'postgresql:///database',
    'postgres:///database',
  ])('requires a hostname for PostgreSQL URL %s', async (databaseUrl) => {
    await expect(loadDatabase(databaseUrl)).rejects.toThrow(
      'PostgreSQL DATABASE_URL must include a hostname',
    )
  })

  it.each([
    'file::memory:',
    'FILE::memory:',
  ])('loads SQLite for %s without constructing Pool or loading ws', async (databaseUrl) => {
    const { db } = await loadDatabase(databaseUrl)

    expect(mocks.databaseConstructor).toHaveBeenCalledWith(':memory:')
    expect(mocks.drizzleSqlite).toHaveBeenCalledOnce()
    expect(mocks.migrateSqliteDatabase).toHaveBeenCalledOnce()
    expect(db).toBe(mocks.sqliteDb)
    expect(mocks.poolConstructor).not.toHaveBeenCalled()
    expect(mocks.wsLoad).not.toHaveBeenCalled()
    expect(mocks.neonConfig.webSocketConstructor).toBeUndefined()
  })
})

describe('PostgreSQL Pool lifecycle', () => {
  it('reuses one Pool and registers one credential-safe error handler across re-evaluation', async () => {
    const databaseUrl =
      'postgresql://sensitive-user:sensitive-password@example.neon.tech/database'
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)

    const firstModule = await loadDatabase(databaseUrl)
    vi.resetModules()
    const secondModule = await import('@/lib/db/index')

    expect(mocks.poolConstructor).toHaveBeenCalledOnce()
    expect(firstModule.db.$client).toBe(secondModule.db.$client)
    expect(mocks.poolInstances[0].on).toHaveBeenCalledOnce()
    expect(mocks.poolInstances[0].on).toHaveBeenCalledWith(
      'error',
      expect.any(Function),
    )

    const errorHandler = mocks.poolInstances[0].on.mock.calls[0]?.[1]
    errorHandler?.(new Error(`connection failed: ${databaseUrl}`))

    expect(consoleError).toHaveBeenCalledWith(
      'PostgreSQL pool emitted an unexpected error',
    )
    expect(consoleError.mock.calls.flat().join(' ')).not.toContain(
      'sensitive-password',
    )
  })

  it('closes a cached Pool with a different URL without blocking replacement or logging secrets', async () => {
    const firstUrl =
      'postgresql://first-user:first-secret@first.neon.tech/database'
    const secondUrl =
      'postgresql://second-user:second-secret@second.neon.tech/database'
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)

    await loadDatabase(firstUrl)

    let rejectClose: ((reason: Error) => void) | undefined
    mocks.poolInstances[0].end.mockReturnValueOnce(
      new Promise<void>((_resolve, reject) => {
        rejectClose = reject
      }),
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
    expect(consoleError.mock.calls.flat().join(' ')).not.toContain(
      'first-secret',
    )
  })
})

describe('safe transaction helper', () => {
  it('uses a synchronous SQLite operation and rejects thenables', async () => {
    const { runInDbTransaction } = await loadDatabase('file::memory:')
    const postgresOperation = vi.fn(async () => 'postgres')

    const result = runInDbTransaction({
      sqliteOperation: (transaction) => {
        expect(transaction).toBe(mocks.sqliteTransaction)
        return 'sqlite'
      },
      postgresOperation,
    })

    expect(result).toBe('sqlite')
    expect(postgresOperation).not.toHaveBeenCalled()
    expect(mocks.sqliteDb.transaction).toHaveBeenCalledWith(
      expect.any(Function),
    )

    const unsafeTransaction = runInDbTransaction as unknown as (operations: {
      sqliteOperation: () => Promise<string>
      postgresOperation: () => Promise<string>
    }) => unknown

    expect(() =>
      unsafeTransaction({
        sqliteOperation: async () => 'invalid',
        postgresOperation: async () => 'postgres',
      }),
    ).toThrow('SQLite transaction operations must be synchronous')
  })

  it('can acquire the SQLite write lock immediately without changing the default contract', async () => {
    const { runInDbTransaction } = await loadDatabase('file::memory:')
    const postgresOperation = vi.fn(async () => 'postgres')

    const result = runInDbTransaction(
      {
        sqliteOperation: (transaction) => {
          expect(transaction).toBe(mocks.sqliteTransaction)
          return 'sqlite-immediate'
        },
        postgresOperation,
      },
      { sqliteMode: 'immediate' },
    )

    expect(result).toBe('sqlite-immediate')
    expect(postgresOperation).not.toHaveBeenCalled()
    expect(mocks.sqliteDb.transaction).toHaveBeenCalledWith(
      expect.any(Function),
      { behavior: 'immediate' },
    )
  })

  it('uses the real Drizzle Neon transaction contract with connect/query/release', async () => {
    const { runInDbTransaction } = await loadDatabase(
      'postgresql://user:password@example.neon.tech/database',
    )
    const sqliteOperation = vi.fn(() => 'sqlite')

    const result = await runInDbTransaction({
      sqliteOperation,
      postgresOperation: async () => 'postgres',
    })

    const statements = mocks.poolClient.query.mock.calls.map(([query]) => {
      if (typeof query === 'string') return query
      return (query as { text: string }).text
    })

    expect(result).toBe('postgres')
    expect(sqliteOperation).not.toHaveBeenCalled()
    expect(mocks.poolInstances[0].connect).toHaveBeenCalledOnce()
    expect(statements[0]).toMatch(/^begin/)
    expect(statements.at(-1)).toBe('commit')
    expect(mocks.poolClient.release).toHaveBeenCalledOnce()
  })
})

if (false) {
  const runInDbTransaction =
    null as unknown as typeof import('@/lib/db/index')['runInDbTransaction']

  runInDbTransaction({
    // @ts-expect-error SQLite operations must not return promises.
    sqliteOperation: async () => 'invalid',
    postgresOperation: async () => 'postgres',
  })

  runInDbTransaction(
    {
      sqliteOperation: () => 'sqlite',
      postgresOperation: async () => 'postgres',
    },
    { sqliteMode: 'immediate' },
  )

  runInDbTransaction(
    {
      sqliteOperation: () => 'sqlite',
      postgresOperation: async () => 'postgres',
    },
    {
      // @ts-expect-error Only the supported immediate SQLite mode is accepted.
      sqliteMode: 'deferred',
    },
  )

  const queryOnlyDb =
    null as unknown as import('@/lib/db/index').DatabaseQueryClient
  // @ts-expect-error The public query client intentionally omits transaction.
  queryOnlyDb.transaction

  const publicDb =
    null as unknown as typeof import('@/lib/db/index')['db']
  // @ts-expect-error The exported db must not expose transaction.
  publicDb.transaction
}
