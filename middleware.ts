import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Bypass auth in local dev mode
  if (process.env.DEV_SKIP_AUTH === 'true') {
    return NextResponse.next()
  }

  const { auth } = await import('./lib/auth/server')
  return auth.middleware({ loginUrl: '/auth/sign-in' })(request)
}

export const config = {
  matcher: ['/(garcom)/:path*', '/(admin)/:path*'],
}
