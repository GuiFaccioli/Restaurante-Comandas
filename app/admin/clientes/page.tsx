import { CustomerRegistry, type CustomerListItem } from '@/components/admin/customer-registry'
import { AdminPage, AdminPageHeader } from '@/components/admin/admin-page'
import { buscarClientes } from '@/lib/customer/queries'
import { requireAnyAccess } from '@/lib/auth/access'

export const dynamic = 'force-dynamic'

export default async function ClientesAdminPage() {
  await requireAnyAccess(['admin', 'caixa'])
  const customers = (await buscarClientes('', { page: 1 })) as CustomerListItem[]

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Cadastro"
        title="Clientes"
        description="O telefone, o endereço e a taxa padrão ficam no mesmo lugar — sem depender da memória no meio da correria."
      />
      <CustomerRegistry initialCustomers={customers} />
    </AdminPage>
  )
}
