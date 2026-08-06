import { and, asc, desc, eq } from 'drizzle-orm'

import { db } from '@/lib/db/index'
import {
  categoria,
  fichaTecnicaItem,
  itemEstoque,
  movimentoEstoque,
  produto,
} from '@/lib/db/schema'

export async function loadInventoryData(tenantId: string) {
  const [itensEstoque, produtos, fichas, categorias, movimentos] = await Promise.all([
    db.select().from(itemEstoque).where(eq(itemEstoque.tenantId, tenantId)).orderBy(asc(itemEstoque.nome)),
    db.select({ id: produto.id, nome: produto.nome, categoriaNome: categoria.nome }).from(produto).innerJoin(categoria, eq(produto.categoriaId, categoria.id)).where(eq(produto.tenantId, tenantId)).orderBy(asc(produto.nome)),
    db.select().from(fichaTecnicaItem).where(eq(fichaTecnicaItem.tenantId, tenantId)),
    db.select({ id: categoria.id, nome: categoria.nome }).from(categoria).where(eq(categoria.tenantId, tenantId)).orderBy(asc(categoria.ordem), asc(categoria.nome)),
    db.select().from(movimentoEstoque).where(eq(movimentoEstoque.tenantId, tenantId)).orderBy(desc(movimentoEstoque.criadoEm)).limit(100),
  ])

  return { itensEstoque, produtos, fichas, categorias, movimentos }
}
