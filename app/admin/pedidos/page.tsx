import { AdminPedidosLive } from './client'
import { requireAccess } from '@/lib/auth/access'
import { getCashierOrders } from '@/lib/orders/queries'

export const dynamic = 'force-dynamic'

export default async function AdminPedidosPage() {
  const { tenantId } = await requireAccess('caixa')
  const initialPedidos = await getCashierOrders({ tenantId })

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Pedidos</h1>
        <p className="text-pretty text-sm text-muted-foreground">
          Acompanhe pedidos entregues e registre pagamentos sem perder o histórico da mesa.
        </p>
      </div>

      <AdminPedidosLive initialPedidos={initialPedidos} />
    </div>
  )
}
