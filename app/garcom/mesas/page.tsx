import Link from 'next/link'
import { Store } from 'lucide-react'

import { EmptyState } from '@/components/ui/operational-states'
import { requireAccess } from '@/lib/auth/access'
import { getTenantMesaOperationalSummaries } from '@/lib/attendance/queries'
import { mesaOperationalLabel } from '@/lib/attendance/service'

export const dynamic = 'force-dynamic'

export default async function MesasGarcomPage() {
  const { tenantId } = await requireAccess('garcom')
  const mesas = await getTenantMesaOperationalSummaries({ tenantId })

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-5 sm:px-6 sm:py-8">
      <header className="mb-6">
        <p className="text-sm font-semibold text-[var(--primary)]">Atendimento</p>
        <h1 className="mt-1 text-2xl font-bold tracking-[-0.04em] text-[var(--ink)]">Escolha uma mesa</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Abra uma comanda ou escolha o atendimento que deve continuar.</p>
      </header>

      {mesas.length === 0 ? <EmptyState title="Nenhuma mesa disponível" description="Peça ao administrador para cadastrar ou ativar as mesas do salão." /> : <section aria-label="Mesas disponíveis" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {mesas.map((mesa) => {
          const open = mesa.attendances.find((attendance) => attendance.status === 'open')
          const pendingCount = mesa.attendances.filter((attendance) => attendance.status === 'awaiting_payment').length
          const href = open ? `/garcom/mesa/${mesa.id}?atendimentoId=${open.id}` : `/garcom/mesa/${mesa.id}`
          return <Link key={mesa.id} href={href} className="af-surface group flex min-h-36 flex-col justify-between p-4 transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]">
            <div className="flex items-start justify-between gap-2"><Store aria-hidden="true" className="size-6 text-[var(--primary)]" /><span className={`rounded-full px-2 py-1 text-xs font-semibold ${open ? 'bg-[var(--primary-soft)] text-[var(--primary-active)]' : pendingCount > 0 ? 'bg-[var(--warning-soft)] text-[var(--warning)]' : 'bg-[var(--success-soft)] text-[var(--success)]'}`}>{mesaOperationalLabel(mesa.operationalState)}</span></div>
            <div><p className="text-lg font-bold text-[var(--ink)]">Mesa {mesa.numero}</p><p className="mt-1 text-sm text-[var(--muted)]">{open ? `R$ ${open.total.toFixed(2).replace('.', ',')}` : pendingCount > 0 ? `${pendingCount} conta(s) pendente(s)` : 'Iniciar atendimento'}</p></div>
            {open && pendingCount > 0 ? <p className="text-xs font-medium text-[var(--warning)]">{pendingCount} conta anterior pendente</p> : null}
          </Link>
        })}
      </section>}
      <div className="mt-6 sm:hidden"><Link href="/garcom/pedidos" className="inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-button)] bg-[var(--primary)] px-[18px] text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]">Ver pedidos em andamento</Link></div>
    </main>
  )
}
