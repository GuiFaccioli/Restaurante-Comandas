import { Workflow } from 'lucide-react'
import { cn } from '@/lib/utils'

type AgilizaFluxoBrandProps = {
  tagline?: string
  className?: string
}

export function AgilizaFluxoBrand({ tagline, className }: AgilizaFluxoBrandProps) {
  return (
    <div className={cn('flex min-w-0 items-center gap-3', className)}>
      <span
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-button)] bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[var(--shadow-card)]"
      >
        <Workflow className="size-5" strokeWidth={2.5} />
      </span>
      <span className="min-w-0">
        <span className="block truncate font-heading text-lg font-black tracking-[-0.04em] text-[var(--primary-active)]">
          Agiliza Fluxo
        </span>
        {tagline ? <span className="mt-0.5 block truncate text-xs leading-4 text-[var(--muted)]">{tagline}</span> : null}
      </span>
    </div>
  )
}
