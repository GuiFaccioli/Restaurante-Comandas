import type { NeonAuth } from '@neondatabase/auth/next/server'

let neonAuth: NeonAuth | undefined

function getConfig() {
  const baseUrl = process.env.NEON_AUTH_BASE_URL
  const cookieSecret = process.env.NEON_AUTH_COOKIE_SECRET

  if (!baseUrl || !cookieSecret) {
    throw new Error('Neon Auth is not configured for this environment')
  }

  return { baseUrl, cookieSecret }
}

export function isNeonAuthConfigured(): boolean {
  return isNeonAuthEnabled() && Boolean(process.env.NEON_AUTH_BASE_URL && process.env.NEON_AUTH_COOKIE_SECRET)
}

export function isNeonAuthEnabled(): boolean {
  const provider = process.env.AUTH_PROVIDER ?? 'neon'
  return provider === 'neon'
}

export async function getNeonAuth(): Promise<NeonAuth> {
  if (neonAuth) return neonAuth

  const { baseUrl, cookieSecret } = getConfig()
  const { createNeonAuth } = await import('@neondatabase/auth/next/server')
  neonAuth = createNeonAuth({
    baseUrl,
    cookies: {
      secret: cookieSecret,
      sameSite: 'lax',
    },
  })

  return neonAuth
}
