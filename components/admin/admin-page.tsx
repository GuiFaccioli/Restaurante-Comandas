import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export function AdminPage({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mx-auto w-full max-w-[1280px] space-y-6', className)}>{children}</div>
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
    <div className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow ? (
          <p className="mb-1 text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-3xl font-bold tracking-[-0.025em]">{title}</h1>
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
  onClick,
  expanded = false,
  controls,
}: {
  label: string
  value: ReactNode
  detail?: ReactNode
  tone?: 'default' | 'success' | 'warning' | 'danger'
  onClick?: () => void
  expanded?: boolean
  controls?: string
}) {
  const toneClass = {
    default: 'border-border bg-card',
    success: 'border-[var(--success)]/25 bg-[color-mix(in_oklch,var(--success),white_95%)]',
    warning: 'border-[color-mix(in_oklch,var(--status-em-preparo),white_55%)] bg-[color-mix(in_oklch,var(--status-em-preparo),white_92%)]',
    danger: 'border-destructive/25 bg-destructive/5',
  }[tone]
  const markerClass = {
    default: 'bg-foreground',
    success: 'bg-[var(--success)]',
    warning: 'bg-[var(--status-em-preparo)]',
    danger: 'bg-destructive',
  }[tone]
  const cardClassName = cn(
    'min-h-11 w-full rounded-[var(--radius)] border p-4 text-left',
    toneClass,
    onClick &&
      'transition-shadow hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    onClick && expanded && 'ring-2 ring-foreground ring-offset-2'
  )
  const content = (
    <>
      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={cn('h-full w-10 rounded-full', markerClass)} />
      </div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-[-0.03em]">{value}</p>
      {detail ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p> : null}
      {onClick ? (
        <span className="mt-3 block text-xs font-semibold underline underline-offset-4">
          {expanded ? 'Ocultar responsáveis' : 'Ver responsáveis'}
        </span>
      ) : null}
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        className={cardClassName}
        onClick={onClick}
        aria-expanded={expanded}
        aria-controls={controls}
      >
        {content}
      </button>
    )
  }

  return <div className={cardClassName}>{content}</div>
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
    <section className={cn('overflow-hidden rounded-[var(--radius)] border bg-card', className)}>
      {title || description ? (
        <div className="border-b bg-muted/35 px-4 py-3">
          {title ? <h2 className="font-semibold">{title}</h2> : null}
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
      ) : null}
      <div className="p-4">{children}</div>
    </section>
  )
}

export function AdminBar({
  label,
  value,
  detail,
  max,
  tone = 'default',
}: {
  label: string
  value: number
  detail: ReactNode
  max: number
  tone?: 'default' | 'success' | 'warning' | 'danger'
}) {
  const width = max > 0 ? Math.max(6, Math.round((value / max) * 100)) : 0
  const fillClass = {
    default: 'bg-foreground',
    success: 'bg-[var(--success)]',
    warning: 'bg-[var(--status-em-preparo)]',
    danger: 'bg-destructive',
  }[tone]

  return (
    <div className="rounded-[var(--radius)] border bg-background p-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
        <p className="min-w-0 truncate text-sm font-semibold">{label}</p>
        <p className="shrink-0 text-sm font-medium text-muted-foreground">{detail}</p>
      </div>
      <div className="mt-3 h-3 overflow-hidden rounded-full bg-muted">
        <div className={cn('h-full rounded-full', fillClass)} style={{ width: `${width}%` }} />
      </div>
    </div>
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
