import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  void request
  return NextResponse.next()
}

export const config = {
  matcher: ['/garcom/:path*', '/admin/:path*', '/mesa/:path*'],
}
