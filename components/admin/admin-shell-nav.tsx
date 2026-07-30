'use client'

import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'

type AdminShellLink = {
  href: string
  label: string
  description?: string
  future?: boolean
}

export function AdminShellNav({
  links,
  variant = 'primary',
}: {
  links: AdminShellLink[]
  variant?: 'primary' | 'management'
}) {
  const pathname = usePathname()

  return (
    <>
      {links.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`)

        return (
          <a
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              variant === 'primary'
                ? 'min-h-11 rounded-[var(--radius-button)] border px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
                : 'block min-h-11 rounded-[var(--radius-button)] border px-3 py-2 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
              link.future
                ? 'border-[var(--error)]/35 bg-[var(--error-soft)] text-[var(--error)] hover:bg-[var(--error-soft)]'
                : active
                ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary-active)]'
                : 'border-transparent bg-transparent text-[var(--body)] hover:border-[var(--border)] hover:bg-[var(--surface-muted)]'
            )}
          >
            <span className="font-medium">{link.label}</span>
            {variant === 'management' && link.description ? (
              <span
                className={cn(
                  'mt-0.5 block text-xs',
                  link.future ? 'text-[var(--error)]' : active ? 'text-[var(--primary-active)]' : 'text-[var(--muted)]'
                )}
              >
                {link.description}
              </span>
            ) : null}
          </a>
        )
      })}
    </>
  )
}
