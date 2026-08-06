import { requireAccess } from '@/lib/auth/access'
import { EstoqueAdminClient } from '../client'
import { loadInventoryData } from '../data'

export const dynamic = 'force-dynamic'

export default async function FichaTecnicaPage({ searchParams }: { searchParams: Promise<{ produtoId?: string }> }) {
  const { tenantId } = await requireAccess('admin')
  const params = await searchParams
  return <EstoqueAdminClient {...await loadInventoryData(tenantId)} initialProdutoId={params.produtoId ?? ''} view="ficha" />
}
