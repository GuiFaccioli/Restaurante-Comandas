'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

export function GarcomProfileSlot({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  if (pathname.startsWith('/garcom/mesa/')) return null

  return children
}
