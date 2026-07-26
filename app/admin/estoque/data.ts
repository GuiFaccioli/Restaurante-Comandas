import { and, asc, eq } from 'drizzle-orm'

import { db } from '@/lib/db/index'
import { dbBoolean } from '@/lib/db/compat'
import { categoria, fichaTecnicaItem, insumo, produto } from '@/lib/db/schema'

export async function loadInventoryData(tenantId: string) {
  const [insumos, produtos, fichas] = await Promise.all([
    db.select().from(insumo).where(and(eq(insumo.tenantId, tenantId), eq(insumo.ativo, dbBoolean(true) as boolean))).orderBy(asc(insumo.nome)),
    db
      .select({ id: produto.id, nome: produto.nome, categoriaNome: categoria.nome })
      .from(produto)
      .innerJoin(categoria, eq(produto.categoriaId, categoria.id))
      .where(eq(produto.tenantId, tenantId))
      .orderBy(asc(produto.nome)),
    db.select().from(fichaTecnicaItem).where(eq(fichaTecnicaItem.tenantId, tenantId)),
  ])

  return { insumos, produtos, fichas }
}
