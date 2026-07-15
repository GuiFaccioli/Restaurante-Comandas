'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

export function GarcomProfileSlot({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  if (pathname.startsWith('/garcom/mesa/') || pathname === '/garcom/mesas') return null

  return children
}
