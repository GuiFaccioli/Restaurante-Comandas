import { AdminPedidosLive } from './client'
import { requireAccess } from '@/lib/auth/access'
import { getCashierOrders } from '@/lib/orders/queries'

export const dynamic = 'force-dynamic'

export default async function AdminPedidosPage() {
  const { tenantId } = await requireAccess('caixa')
  const initialPedidos = await getCashierOrders({ tenantId })

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Pedidos</h1>
        <p className="text-sm text-muted-foreground">Pedidos persistidos no sistema.</p>
      </div>

      <AdminPedidosLive initialPedidos={initialPedidos} />
    </div>
  )
}
