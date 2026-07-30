'use client'

import Link from 'next/link'
import { ClipboardList, LayoutDashboard, Search, Store } from 'lucide-react'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'

const items = [
  { href: '/garcom/mesas', label: 'Mesas', icon: Store },
  { href: '/garcom/pedidos', label: 'Pedidos', icon: ClipboardList },
  { href: '/garcom/mesas', label: 'Buscar', icon: Search },
  { href: '/admin/menu', label: 'Cardápio', icon: LayoutDashboard },
]

export function MobileBottomNavigation({ mode = 'waiter' }: { mode?: 'waiter' | 'admin' }) {
  const pathname = usePathname()
  const visible = mode === 'admin' ? items.filter((item) => item.label !== 'Buscar').map((item) => item.label === 'Pedidos' ? { ...item, href: '/admin/pedidos' } : item) : items.slice(0, 3)

  return (
    <nav aria-label="Navegação principal" className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_94%,transparent)] px-2 pb-[env(safe-area-inset-bottom)] shadow-[var(--shadow-dropdown)] backdrop-blur lg:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-3 gap-1 py-2">
        {visible.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`)
          return (
            <Link key={label} href={href} aria-current={active ? 'page' : undefined} className={cn('flex min-h-11 flex-col items-center justify-center gap-1 rounded-[var(--radius-button)] text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]', active ? 'bg-[var(--primary-soft)] text-[var(--primary-active)]' : 'text-[var(--muted)] hover:bg-[var(--surface-muted)]')}>
              <Icon aria-hidden="true" className="size-5" />
              <span>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
