// lib/auth/server.ts
import type { NextRequest } from 'next/server'

const isDevMode = process.env.DEV_SKIP_AUTH === 'true'

// Dev mock that satisfies the auth interface used throughout the app
const devAuth = {
  getSession: async () => ({
    data: {
      user: {
        id: process.env.DEV_USER_ID ?? 'dev-user-001',
        email: 'dev@local.com',
        name: 'Dev User',
      },
    },
  }),
  middleware: (_opts?: { loginUrl?: string }) =>
    (_req: NextRequest) =>
      undefined,
  handler: () => ({
    GET: async () =>
      new Response(JSON.stringify({ session: null }), {
        headers: { 'Content-Type': 'application/json' },
      }),
    POST: async () =>
      new Response(JSON.stringify({ session: null }), {
        headers: { 'Content-Type': 'application/json' },
      }),
  }),
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _auth: any

if (isDevMode) {
  _auth = devAuth
} else {
  // Lazy-require to avoid loading Neon Auth when running SQLite locally
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createNeonAuth } = require('@neondatabase/auth/next/server')
  _auth = createNeonAuth({
    baseUrl: process.env.NEON_AUTH_BASE_URL!,
    cookies: {
      secret: process.env.NEON_AUTH_COOKIE_SECRET!,
    },
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const auth = _auth as any
