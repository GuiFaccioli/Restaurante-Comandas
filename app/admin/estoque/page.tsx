import { asc, eq } from 'drizzle-orm'
import { requireAccess } from '@/lib/auth/access'
import { db } from '@/lib/db/index'
import { categoria, fichaTecnicaItem, insumo, produto } from '@/lib/db/schema'
import { EstoqueAdminClient } from './client'

export const dynamic = 'force-dynamic'

export default async function EstoqueAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ produtoId?: string }>
}) {
  const { tenantId } = await requireAccess('admin')
  const params = await searchParams
  const [insumos, produtos, fichas] = await Promise.all([
    db.select().from(insumo).where(eq(insumo.tenantId, tenantId)).orderBy(asc(insumo.nome)),
    db
      .select({ id: produto.id, nome: produto.nome, categoriaNome: categoria.nome })
      .from(produto)
      .innerJoin(categoria, eq(produto.categoriaId, categoria.id))
      .where(eq(produto.tenantId, tenantId))
      .orderBy(asc(produto.nome)),
    db.select().from(fichaTecnicaItem).where(eq(fichaTecnicaItem.tenantId, tenantId)),
  ])

  return (
    <EstoqueAdminClient
      insumos={insumos}
      produtos={produtos}
      fichas={fichas}
      initialProdutoId={params.produtoId ?? ''}
    />
  )
}
