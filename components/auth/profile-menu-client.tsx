'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ProfileMenuClientProps = {
  className?: string
  children: ReactNode
}

export function ProfileMenuClient({ className, children }: ProfileMenuClientProps) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: PointerEvent) {
      if (!(event.target instanceof Node)) return
      if (!menuRef.current?.contains(event.target)) setOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [open])

  return (
    <div ref={menuRef} className={cn('relative w-fit', className)}>
      <Button
        type="button"
        intent="neutral"
        appearance="outline"
        aria-expanded={open}
        aria-haspopup="menu"
        className="min-h-11 cursor-pointer"
        onClick={() => setOpen((current) => !current)}
      >
        Perfil
      </Button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-64 rounded-[var(--radius)] border bg-card p-4 shadow-lg"
        >
          {children}
        </div>
      )}
    </div>
  )
}
