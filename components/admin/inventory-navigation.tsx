'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'

const links = [
  { href: '/admin/estoque', label: 'Estoque' },
  { href: '/admin/estoque/lista-de-compras', label: 'Lista de compras' },
  { href: '/admin/estoque/ficha-tecnica', label: 'Ficha técnica' },
]

export function InventoryNavigation() {
  const pathname = usePathname()

  return (
    <nav aria-label="Seções do estoque" className="flex flex-wrap gap-2 border-b pb-4">
      {links.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`)

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'inline-flex min-h-10 items-center rounded-[var(--radius)] border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              active
                ? 'border-foreground bg-foreground text-background'
                : 'border-border bg-background text-foreground hover:bg-muted/70'
            )}
          >
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}
