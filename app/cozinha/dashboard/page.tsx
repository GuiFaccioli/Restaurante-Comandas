// app/(cozinha)/dashboard/page.tsx
import { KanbanBoard } from '@/components/cozinha/kanban-board'
import { requireAccess } from '@/lib/auth/access'
import { ScrollToTopButton } from '@/components/operational/scroll-to-top'
import { getKitchenOrders } from '@/lib/kitchen/queries'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const { tenantId } = await requireAccess('cozinha')
  const initialPedidos = await getKitchenOrders({ tenantId })

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col gap-4 p-4 sm:gap-6 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold">Cozinha</h1>
        <p className="text-pretty text-sm text-muted-foreground">
          Acompanhe as comandas abertas chamadas pelo atendimento.
        </p>
      </div>
      <div className="flex-1 overflow-hidden">
        <KanbanBoard initialPedidos={initialPedidos} />
      </div>
      <ScrollToTopButton />
    </div>
  )
}
