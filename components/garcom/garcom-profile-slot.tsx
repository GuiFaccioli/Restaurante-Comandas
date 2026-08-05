'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

export function GarcomProfileSlot({ children, showOnOperationalPages = false }: { children: ReactNode; showOnOperationalPages?: boolean }) {
  const pathname = usePathname()

  if (!showOnOperationalPages && (pathname.startsWith('/garcom/mesa/') || pathname === '/garcom/mesas')) return null

  return children
}
