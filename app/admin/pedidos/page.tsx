import { AdminPedidosLive } from './client'
import { AdminPage, AdminPageHeader } from '@/components/admin/admin-page'
import { requireAccess } from '@/lib/auth/access'
import { getCashierOrders } from '@/lib/orders/queries'

export const dynamic = 'force-dynamic'

export default async function AdminPedidosPage() {
  const { tenantId } = await requireAccess('caixa')
  const initialPedidos = await getCashierOrders({ tenantId })

  return (
    <AdminPage>
      <AdminPageHeader
        title="Pedidos e caixa"
        description="Acompanhe pedidos entregues, veja pendências de pagamento e registre cobranças sem perder o histórico da mesa."
      />
      <AdminPedidosLive initialPedidos={initialPedidos} />
    </AdminPage>
  )
}
