import type { ReactNode } from 'react'

import { actionSemantics } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function AdminPage({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mx-auto w-full max-w-[1280px] space-y-8', className)}>{children}</div>
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
    <div className="flex flex-col gap-4 border-b border-[var(--border)] pb-7 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow ? (
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--primary)]">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-heading text-3xl font-black tracking-[-0.04em] text-[var(--ink)] sm:text-4xl">{title}</h1>
        <p className="mt-2 text-pretty text-sm leading-6 text-[var(--muted)]">{description}</p>
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
  const baseCardClassName =
    'flex w-full flex-col gap-0 h-auto min-h-11 rounded-[var(--radius-card)] border border-[var(--border)] p-4 text-left shadow-[var(--shadow-card)]'
  const staticCardClassName = cn(baseCardClassName, toneClass)
  const interactiveCardClassName = cn(
    baseCardClassName,
    actionSemantics({ intent: 'neutral', appearance: 'ghost' }),
    'items-stretch justify-start whitespace-normal text-foreground transition-shadow hover:shadow-sm',
    toneClass,
    expanded && 'ring-2 ring-foreground ring-offset-2'
  )
  const content = (
    <>
      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={cn('h-full w-10 rounded-full', markerClass)} />
      </div>
      <p className="text-sm font-medium text-[var(--muted)]">{label}</p>
      <p className="mt-2 font-heading text-3xl font-black tracking-[-0.04em] text-[var(--ink)]">{value}</p>
      {detail ? <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{detail}</p> : null}
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
        className={interactiveCardClassName}
        onClick={onClick}
        aria-expanded={expanded}
        aria-controls={controls}
      >
        {content}
      </button>
    )
  }

  return <div className={staticCardClassName}>{content}</div>
}

export function AdminPanel({
  title,
  description,
  action,
  children,
  className,
}: {
  title?: string
  description?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)]', className)}>
      {title || description || action ? (
        <div className="flex min-h-16 items-start justify-between gap-3 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--muted)_55%,var(--surface))] px-4 py-3">
          <div className="min-w-0">
            {title ? <h2 className="font-heading font-bold text-[var(--ink)]">{title}</h2> : null}
            {description ? (
              <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
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
    <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[var(--shadow-card)]">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
        <p className="min-w-0 truncate text-sm font-semibold">{label}</p>
        <p className="shrink-0 text-sm font-medium text-[var(--muted)]">{detail}</p>
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
    <div className={cn('rounded-[var(--radius-card)] border border-dashed border-[var(--border-strong)] bg-[var(--surface)] p-8 text-center shadow-[var(--shadow-card)]', className)}>
      <h3 className="font-heading font-bold text-[var(--ink)]">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-pretty text-sm leading-6 text-[var(--muted)]">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
