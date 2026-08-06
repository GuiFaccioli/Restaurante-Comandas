import { requireAccess } from '@/lib/auth/access'
import { EstoqueAdminClient } from '../client'
import { loadInventoryData } from '../data'

export const dynamic = 'force-dynamic'

export default async function MovimentacoesPage() {
  const { tenantId } = await requireAccess('admin')
  return <EstoqueAdminClient {...await loadInventoryData(tenantId)} initialProdutoId="" view="movimentacoes" />
}
