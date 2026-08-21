import { Pool, neonConfig } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-serverless'
import WebSocket from 'ws'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import {
  clearLoginFailures,
  createLoginRateLimitIdentifiers,
  isLoginBlocked,
  recordLoginFailure,
  type LoginRateLimitDatabase,
} from '@/lib/auth/login-rate-limit'
import { migrateDatabase } from '@/lib/db/migration-runner'

const postgresUrl = process.env.TEST_POSTGRES_URL
const describePostgres = postgresUrl ? describe : describe.skip

describePostgres('PostgreSQL login rate limiting (set TEST_POSTGRES_URL to enable)', () => {
  const schemaName = `login_rate_limit_test_${crypto.randomUUID().replaceAll('-', '')}`
  const secret = 'integration-rate-limit-secret-32-bytes-minimum'
  let adminPool: Pool
  let scopedPool: Pool
  let database: LoginRateLimitDatabase

  beforeAll(async () => {
    if (!postgresUrl) return
    if (!neonConfig.webSocketConstructor) neonConfig.webSocketConstructor = WebSocket

    adminPool = new Pool({ connectionString: postgresUrl })
    await adminPool.query(`CREATE SCHEMA "${schemaName}"`)

    const parsed = new URL(postgresUrl)
    parsed.searchParams.set('options', `-c search_path=${schemaName},public`)
    const scopedUrl = parsed.toString()
    await migrateDatabase(scopedUrl)

    scopedPool = new Pool({ connectionString: scopedUrl })
    database = drizzle({ client: scopedPool })
  })

  beforeEach(async () => {
    if (!scopedPool) return
    await scopedPool.query('TRUNCATE login_rate_limit')
  })

  afterAll(async () => {
    if (!postgresUrl || !adminPool) return
    if (scopedPool) await scopedPool.end()
    await adminPool.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`)
    await adminPool.end()
  })

  it('blocks the e-mail+IP key on the fifth failure for 15 minutes', async () => {
    const identifiers = createLoginRateLimitIdentifiers(
      'ana@example.com',
      '203.0.113.10',
      secret,
    )

    for (let attempt = 0; attempt < 4; attempt += 1) {
      await recordLoginFailure(database, identifiers)
    }
    await expect(isLoginBlocked(database, identifiers)).resolves.toBe(false)

    await recordLoginFailure(database, identifiers)
    await expect(isLoginBlocked(database, identifiers)).resolves.toBe(true)

    const result = await scopedPool.query<{
      failure_count: number
      block_seconds: number
    }>(
      `SELECT failure_count,
              EXTRACT(EPOCH FROM (blocked_until - updated_at))::int AS block_seconds
         FROM login_rate_limit
        WHERE scope = 'email_ip' AND key_hash = $1`,
      [identifiers.emailIpHash],
    )
    expect(result.rows).toEqual([{ failure_count: 5, block_seconds: 900 }])
  })

  it('counts concurrent failures safely and blocks the shared IP on failure 25', async () => {
    const attempts = Array.from({ length: 25 }, (_, index) =>
      createLoginRateLimitIdentifiers(
        `user-${index}@example.com`,
        '198.51.100.20',
        secret,
      ),
    )

    await Promise.all(attempts.map((identifiers) => recordLoginFailure(database, identifiers)))

    await expect(isLoginBlocked(database, attempts[0])).resolves.toBe(true)
    const result = await scopedPool.query<{ failure_count: number }>(
      `SELECT failure_count
         FROM login_rate_limit
        WHERE scope = 'ip' AND key_hash = $1`,
      [attempts[0].ipHash],
    )
    expect(result.rows).toEqual([{ failure_count: 25 }])
  })

  it('clears the credential key without erasing the shared IP failure count', async () => {
    const identifiers = createLoginRateLimitIdentifiers(
      'ana@example.com',
      '203.0.113.10',
      secret,
    )
    await recordLoginFailure(database, identifiers)

    await clearLoginFailures(database, identifiers)

    const result = await scopedPool.query<{ scope: string; failure_count: number }>(
      'SELECT scope, failure_count FROM login_rate_limit ORDER BY scope',
    )
    expect(result.rows).toEqual([{ scope: 'ip', failure_count: 1 }])
  })
})
