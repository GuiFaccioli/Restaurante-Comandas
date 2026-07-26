import { requireAccess } from '@/lib/auth/access'
import { EstoqueAdminClient } from '../client'
import { loadInventoryData } from '../data'

export const dynamic = 'force-dynamic'

export default async function FichaTecnicaAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ produtoId?: string }>
}) {
  const { tenantId } = await requireAccess('admin')
  const params = await searchParams
  const data = await loadInventoryData(tenantId)

  return <EstoqueAdminClient {...data} initialProdutoId={params.produtoId ?? ''} view="ficha" />
}
