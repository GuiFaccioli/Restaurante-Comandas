'use client'

import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'

type AdminShellLink = {
  href: string
  label: string
  description?: string
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
                ? 'rounded-full border px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
                : 'block rounded-[var(--radius)] border px-3 py-2 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
              active
                ? 'border-foreground bg-foreground text-background'
                : 'border-border bg-background text-foreground hover:bg-muted/70'
            )}
          >
            <span className="font-medium">{link.label}</span>
            {variant === 'management' && link.description ? (
              <span
                className={cn(
                  'mt-0.5 block text-xs',
                  active ? 'text-background/80' : 'text-muted-foreground'
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
