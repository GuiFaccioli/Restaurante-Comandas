import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { PgDialect } from 'drizzle-orm/pg-core'
import type { SQL } from 'drizzle-orm'

import {
  clearLoginFailures,
  createLoginRateLimitIdentifiers,
  extractClientIp,
  isLoginBlocked,
  recordLoginFailure,
} from '@/lib/auth/login-rate-limit'

describe('login rate limiting', () => {
  it('derives deterministic, scoped HMAC identifiers without retaining e-mail or IP', () => {
    const secret = 's'.repeat(32)

    const first = createLoginRateLimitIdentifiers(
      ' Ana@Example.com ',
      '203.0.113.10',
      secret,
    )
    const repeated = createLoginRateLimitIdentifiers(
      'ana@example.com',
      '203.0.113.10',
      secret,
    )

    expect(first).toEqual(repeated)
    expect(first.emailIpHash).toMatch(/^[a-f0-9]{64}$/)
    expect(first.ipHash).toMatch(/^[a-f0-9]{64}$/)
    expect(first.emailIpHash).not.toBe(first.ipHash)
    expect(JSON.stringify(first)).not.toContain('ana@example.com')
    expect(JSON.stringify(first)).not.toContain('203.0.113.10')
  })

  it('requires a stable secret with at least 32 bytes', () => {
    expect(() =>
      createLoginRateLimitIdentifiers('ana@example.com', '203.0.113.10', 'short'),
    ).toThrow('Login rate limiting is not configured')
  })

  it('uses the Vercel-owned forwarding header and ignores spoofable X-Forwarded-For', () => {
    expect(
      extractClientIp(
        new Headers({
          'x-vercel-forwarded-for': '203.0.113.10',
          'x-forwarded-for': '198.51.100.99',
        }),
        { VERCEL: '1' },
      ),
    ).toBe('203.0.113.10')
  })

  it('ignores forwarding headers locally instead of allowing trivial spoofing', () => {
    expect(
      extractClientIp(
        new Headers({
          'x-vercel-forwarded-for': '203.0.113.10',
          'x-forwarded-for': '198.51.100.99',
          'x-real-ip': '192.0.2.44',
        }),
        {},
      ),
    ).toBe('unknown')
  })

  it('accepts one validated IP only when a non-Vercel proxy is explicitly trusted', () => {
    const environment = { LOGIN_RATE_LIMIT_TRUST_PROXY: '1' }

    expect(
      extractClientIp(
        new Headers({ 'x-forwarded-for': '198.51.100.20' }),
        environment,
      ),
    ).toBe('198.51.100.20')
    expect(
      extractClientIp(
        new Headers({ 'x-forwarded-for': '203.0.113.10, 198.51.100.20' }),
        environment,
      ),
    ).toBe('unknown')
  })

  it('rejects malformed Vercel forwarding values instead of falling back to spoofable headers', () => {
    expect(
      extractClientIp(
        new Headers({
          'x-vercel-forwarded-for': 'not-an-ip',
          'x-forwarded-for': '203.0.113.10',
        }),
        { VERCEL: '1' },
      ),
    ).toBe('unknown')
  })

  it('checks both hashed scopes in PostgreSQL', async () => {
    const execute = vi.fn(async (_query: SQL) => ({ rows: [{ blocked: true }] }))

    await expect(
      isLoginBlocked(
        { execute },
        { emailIpHash: 'a'.repeat(64), ipHash: 'b'.repeat(64) },
      ),
    ).resolves.toBe(true)

    expect(execute).toHaveBeenCalledTimes(1)
  })

  it('records both failure scopes atomically in one PostgreSQL statement', async () => {
    const execute = vi.fn(async (_query: SQL) => ({ rows: [] }))

    await recordLoginFailure(
      { execute },
      { emailIpHash: 'a'.repeat(64), ipHash: 'b'.repeat(64) },
    )

    expect(execute).toHaveBeenCalledTimes(1)
  })

  it('clears only the e-mail+IP scope after a valid login', async () => {
    const execute = vi.fn(async (_query: SQL) => ({ rows: [] }))

    await clearLoginFailures(
      { execute },
      { emailIpHash: 'a'.repeat(64), ipHash: 'b'.repeat(64) },
    )

    expect(execute).toHaveBeenCalledTimes(1)
    const query = new PgDialect().sqlToQuery(execute.mock.calls[0][0]).sql
    expect(query).toContain("scope = 'email_ip'")
    expect(query).not.toContain("scope = 'ip'")
  })

  it('ships the additive PostgreSQL migration and documents the stable secret', () => {
    const migration = readFileSync(
      resolve(
        process.cwd(),
        'db/migrations/202608201200_add_login_rate_limits.sql',
      ),
      'utf8',
    )
    const envExample = readFileSync(resolve(process.cwd(), '.env.example'), 'utf8')

    expect(migration).toContain('CREATE TABLE login_rate_limit')
    expect(migration).toContain('PRIMARY KEY (scope, key_hash)')
    expect(migration).toContain("scope IN ('email_ip', 'ip')")
    expect(envExample).toContain('LOGIN_RATE_LIMIT_HMAC_SECRET=')
  })
})
