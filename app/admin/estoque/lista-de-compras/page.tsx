import { requireAccess } from '@/lib/auth/access'
import { EstoqueAdminClient } from '../client'
import { loadInventoryData } from '../data'

export const dynamic = 'force-dynamic'

export default async function ListaDeComprasAdminPage() {
  const { tenantId } = await requireAccess('admin')
  const data = await loadInventoryData(tenantId)

  return <EstoqueAdminClient {...data} initialProdutoId="" view="lista" />
}
