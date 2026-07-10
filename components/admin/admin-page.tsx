import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export function AdminPage({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mx-auto w-full max-w-6xl space-y-6', className)}>{children}</div>
}

export function AdminPageHeader({
  title,
  description,
  eyebrow,
  action,
}: {
  title: string
  description: string
  eyebrow?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow ? (
          <p className="mb-1 text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-2xl font-bold tracking-[-0.01em]">{title}</h1>
        <p className="mt-1 text-pretty text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

export function AdminStatsGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn('grid gap-3 sm:grid-cols-2 xl:grid-cols-4', className)}>{children}</section>
}

export function AdminStatCard({
  label,
  value,
  detail,
  tone = 'default',
}: {
  label: string
  value: ReactNode
  detail?: ReactNode
  tone?: 'default' | 'success' | 'warning' | 'danger'
}) {
  const toneClass = {
    default: 'border-border',
    success: 'border-[var(--success)]/25 bg-[color-mix(in_oklch,var(--success),white_94%)]',
    warning: 'border-amber-300/50 bg-amber-50',
    danger: 'border-destructive/25 bg-destructive/5',
  }[tone]

  return (
    <div className={cn('rounded-[var(--radius)] border bg-card p-4', toneClass)}>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-[-0.02em]">{value}</p>
      {detail ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p> : null}
    </div>
  )
}

export function AdminPanel({
  title,
  description,
  children,
  className,
}: {
  title?: string
  description?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('rounded-[var(--radius)] border bg-card', className)}>
      {title || description ? (
        <div className="border-b px-4 py-3">
          {title ? <h2 className="font-semibold">{title}</h2> : null}
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
      ) : null}
      <div className="p-4">{children}</div>
    </section>
  )
}

export function AdminEmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string
  description: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('rounded-[var(--radius)] border border-dashed bg-background p-6 text-center', className)}>
      <h3 className="font-semibold">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-pretty text-sm leading-6 text-muted-foreground">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
