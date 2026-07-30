import type { ReactNode } from 'react'
import { AlertCircle, CheckCircle2, LockKeyhole, Loader2, WifiOff } from 'lucide-react'

import { cn } from '@/lib/utils'

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <header className="flex flex-col gap-4 border-b border-[var(--border)] pb-6 sm:flex-row sm:items-end sm:justify-between">
    <div><h1 className="text-[clamp(1.625rem,3vw,2rem)] font-bold tracking-[-0.04em] text-[var(--ink)]">{title}</h1>{description ? <p className="mt-1 max-w-2xl text-pretty text-sm leading-6 text-[var(--muted)]">{description}</p> : null}</div>
    {action ? <div className="shrink-0">{action}</div> : null}
  </header>
}

export function OperationalState({ icon: Icon, title, description, action, tone = 'neutral', className }: { icon: typeof AlertCircle; title: string; description: string; action?: ReactNode; tone?: 'neutral' | 'error' | 'offline'; className?: string }) {
  const toneClass = tone === 'error' ? 'text-[var(--error)]' : tone === 'offline' ? 'text-[var(--warning)]' : 'text-[var(--primary)]'
  return <div className={cn('af-surface flex flex-col items-center justify-center gap-3 p-8 text-center', className)} role={tone === 'error' ? 'alert' : 'status'}><Icon aria-hidden="true" className={cn('size-8', toneClass)} /><div><h2 className="font-semibold text-[var(--ink)]">{title}</h2><p className="mt-1 max-w-md text-sm leading-6 text-[var(--muted)]">{description}</p></div>{action ? <div className="pt-1">{action}</div> : null}</div>
}

export function LoadingState({ label = 'Carregando informações…' }: { label?: string }) { return <OperationalState icon={Loader2} title="Só um momento" description={label} className="animate-pulse" /> }
export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) { return <OperationalState icon={CheckCircle2} title={title} description={description} action={action} /> }
export function ErrorState({ description = 'Não foi possível carregar agora. Tente novamente.' }: { description?: string }) { return <OperationalState icon={AlertCircle} title="Algo não saiu como esperado" description={description} tone="error" /> }
export function PermissionState() { return <OperationalState icon={LockKeyhole} title="Acesso não disponível" description="Você não tem permissão para ver esta área." /> }
export function OfflineState() { return <OperationalState icon={WifiOff} title="Sem conexão" description="Algumas ações podem ficar indisponíveis até a conexão voltar." tone="offline" /> }

export function FormActions({ children }: { children: ReactNode }) { return <div className="sticky bottom-0 z-10 -mx-4 mt-6 flex flex-col-reverse gap-2 border-t border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_96%,transparent)] px-4 py-3 backdrop-blur sm:mx-0 sm:flex-row sm:justify-end sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">{children}</div> }
