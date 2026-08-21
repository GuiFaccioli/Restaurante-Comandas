import { createHmac } from 'node:crypto'
import { isIP } from 'node:net'
import { sql, type SQL } from 'drizzle-orm'

export const LOGIN_ERROR_MESSAGE = 'E-mail ou senha incorretos'

export type LoginRateLimitIdentifiers = {
  emailIpHash: string
  ipHash: string
}

export type LoginRateLimitDatabase = {
  execute(query: SQL): Promise<unknown>
}

type LoginRateLimitEnvironment = {
  VERCEL?: string
  LOGIN_RATE_LIMIT_TRUST_PROXY?: string
}

function configuredSecret(): string {
  const secret = process.env.LOGIN_RATE_LIMIT_HMAC_SECRET ?? ''
  if (Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error('Login rate limiting is not configured')
  }
  return secret
}

function hmacIdentifier(secret: string, scope: string, value: string): string {
  return createHmac('sha256', secret)
    .update(scope)
    .update('\0')
    .update(value)
    .digest('hex')
}

export function createLoginRateLimitIdentifiers(
  email: string,
  ip: string,
  secret = configuredSecret(),
): LoginRateLimitIdentifiers {
  if (Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error('Login rate limiting is not configured')
  }

  const normalizedEmail = email.trim().toLowerCase()
  const normalizedIp = isIP(ip.trim()) ? ip.trim().toLowerCase() : 'unknown'

  return {
    emailIpHash: hmacIdentifier(
      secret,
      'login-rate-limit:email-ip',
      `${normalizedEmail}\0${normalizedIp}`,
    ),
    ipHash: hmacIdentifier(secret, 'login-rate-limit:ip', normalizedIp),
  }
}

function validatedSingleIp(value: string | null): string {
  const candidate = value?.trim() ?? ''
  if (candidate.includes(',')) return 'unknown'
  return isIP(candidate) ? candidate.toLowerCase() : 'unknown'
}

export function extractClientIp(
  requestHeaders: Pick<Headers, 'get'>,
  environment: LoginRateLimitEnvironment = {
    VERCEL: process.env.VERCEL,
    LOGIN_RATE_LIMIT_TRUST_PROXY: process.env.LOGIN_RATE_LIMIT_TRUST_PROXY,
  },
): string {
  if (environment.VERCEL === '1') {
    return validatedSingleIp(requestHeaders.get('x-vercel-forwarded-for'))
  }

  if (environment.LOGIN_RATE_LIMIT_TRUST_PROXY === '1') {
    return validatedSingleIp(requestHeaders.get('x-forwarded-for'))
  }

  return 'unknown'
}

function rowsFromResult(result: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(result)) return result as Array<Record<string, unknown>>
  if (result && typeof result === 'object' && 'rows' in result) {
    const rows = (result as { rows?: unknown }).rows
    if (Array.isArray(rows)) return rows as Array<Record<string, unknown>>
  }
  return []
}

export async function isLoginBlocked(
  database: LoginRateLimitDatabase,
  identifiers: LoginRateLimitIdentifiers,
): Promise<boolean> {
  const result = await database.execute(sql`
    SELECT EXISTS (
      SELECT 1
        FROM login_rate_limit
       WHERE blocked_until > statement_timestamp()
         AND (
           (scope = 'email_ip' AND key_hash = ${identifiers.emailIpHash})
           OR (scope = 'ip' AND key_hash = ${identifiers.ipHash})
         )
    ) AS blocked
  `)

  return rowsFromResult(result)[0]?.blocked === true
}

export async function recordLoginFailure(
  database: LoginRateLimitDatabase,
  identifiers: LoginRateLimitIdentifiers,
): Promise<void> {
  await database.execute(sql`
    INSERT INTO login_rate_limit AS current_limit (
      scope,
      key_hash,
      failure_count,
      window_started_at,
      blocked_until,
      updated_at
    )
    VALUES
      ('email_ip', ${identifiers.emailIpHash}, 1, statement_timestamp(), NULL, statement_timestamp()),
      ('ip', ${identifiers.ipHash}, 1, statement_timestamp(), NULL, statement_timestamp())
    ON CONFLICT (scope, key_hash) DO UPDATE SET
      failure_count = CASE
        WHEN current_limit.window_started_at <= statement_timestamp() - INTERVAL '15 minutes'
          THEN 1
        ELSE current_limit.failure_count + 1
      END,
      window_started_at = CASE
        WHEN current_limit.window_started_at <= statement_timestamp() - INTERVAL '15 minutes'
          THEN statement_timestamp()
        ELSE current_limit.window_started_at
      END,
      blocked_until = CASE
        WHEN current_limit.blocked_until > statement_timestamp()
          THEN current_limit.blocked_until
        WHEN (
          CASE
            WHEN current_limit.window_started_at <= statement_timestamp() - INTERVAL '15 minutes'
              THEN 1
            ELSE current_limit.failure_count + 1
          END
        ) >= CASE EXCLUDED.scope WHEN 'email_ip' THEN 5 ELSE 25 END
          THEN statement_timestamp() + INTERVAL '15 minutes'
        ELSE NULL
      END,
      updated_at = statement_timestamp()
  `)
}

export async function clearLoginFailures(
  database: LoginRateLimitDatabase,
  identifiers: LoginRateLimitIdentifiers,
): Promise<void> {
  await database.execute(sql`
    DELETE FROM login_rate_limit
     WHERE scope = 'email_ip' AND key_hash = ${identifiers.emailIpHash}
  `)
}
