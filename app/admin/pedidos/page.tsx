import { AdminPedidosLive } from './client'
import { AdminPage, AdminPageHeader } from '@/components/admin/admin-page'
import { requireAccess } from '@/lib/auth/access'
import { getCashierAccounts } from '@/lib/attendance/queries'

export const dynamic = 'force-dynamic'

export default async function AdminPedidosPage() {
  const { tenantId } = await requireAccess('caixa')
  const initialPedidos = await getCashierAccounts({ tenantId })

  return (
    <AdminPage>
      <AdminPageHeader
        title="Pedidos e caixa"
        description=""
      />
      <AdminPedidosLive initialPedidos={initialPedidos} />
    </AdminPage>
  )
}
