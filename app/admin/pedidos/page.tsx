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
      <div className="-mx-4 -mt-4 mb-2 flex min-h-20 items-center justify-center bg-[var(--success)] px-4 text-center text-2xl font-bold text-white sm:-mx-6 sm:-mt-6 lg:hidden">
        Pedidos
      </div>
      <AdminPageHeader
        className="hidden lg:flex"
        title="Pedidos e caixa"
        description="Acompanhe pedidos entregues, veja pendências de pagamento e registre cobranças sem perder o histórico da mesa."
      />
      <AdminPedidosLive initialPedidos={initialPedidos} />
    </AdminPage>
  )
}
