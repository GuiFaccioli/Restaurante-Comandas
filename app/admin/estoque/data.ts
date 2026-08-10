import { and, asc, eq } from 'drizzle-orm'

import { db } from '@/lib/db/index'
import { categoria, fichaTecnicaItem, insumo, produto, shoppingListItem } from '@/lib/db/schema'

export async function loadInventoryData(tenantId: string) {
  const [insumos, produtos, fichas, shoppingListItems] = await Promise.all([
    db.select().from(insumo).where(and(eq(insumo.tenantId, tenantId), eq(insumo.ativo, true))).orderBy(asc(insumo.nome)),
    db
      .select({ id: produto.id, nome: produto.nome, categoriaNome: categoria.nome })
      .from(produto)
      .innerJoin(categoria, eq(produto.categoriaId, categoria.id))
      .where(eq(produto.tenantId, tenantId))
      .orderBy(asc(produto.nome)),
    db.select().from(fichaTecnicaItem).where(eq(fichaTecnicaItem.tenantId, tenantId)),
    db.select().from(shoppingListItem).where(eq(shoppingListItem.tenantId, tenantId)).orderBy(asc(shoppingListItem.criadoEm)),
  ])

  return { insumos, produtos, fichas, shoppingListItems }
}
