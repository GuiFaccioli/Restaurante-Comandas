// app/(admin)/menu/page.tsx
import { db } from '@/lib/db/index'
import { asc, eq } from 'drizzle-orm'
import { categoria, fichaTecnicaItem, itemEstoque, produto } from '@/lib/db/schema'
import { calcularCustoFicha } from '@/lib/stock/costing'
import { MenuAdminClient } from './client'
import { requireAccess } from '@/lib/auth/access'

export const dynamic = 'force-dynamic'

export default async function MenuAdminPage() {
  const { tenantId } = await requireAccess('admin')
  const categorias = await db
    .select()
    .from(categoria)
    .where(eq(categoria.tenantId, tenantId))
    .orderBy(asc(categoria.ordem))
  const [produtos, fichas, itemEstoques] = await Promise.all([
    db.select().from(produto).where(eq(produto.tenantId, tenantId)),
    db.select().from(fichaTecnicaItem).where(eq(fichaTecnicaItem.tenantId, tenantId)),
    db.select({ id: itemEstoque.id, custoUnitario: itemEstoque.custoUnitario }).from(itemEstoque).where(eq(itemEstoque.tenantId, tenantId)),
  ])

  const custoPorItemEstoque = new Map(itemEstoques.map((item) => [item.id, item.custoUnitario]))
  const custoPorProduto = new Map(produtos.map((item) => {
    const result = calcularCustoFicha(
      fichas.filter((ficha) => ficha.produtoId === item.id).map((ficha) => ({ quantidade: ficha.quantidade, custoUnitario: custoPorItemEstoque.get(ficha.itemEstoqueId) ?? null })),
      item.preco,
    )
    return [item.id, result] as const
  }))

  const categoriaComProdutos = categorias.map((c) => ({
    ...c,
    produtos: produtos.filter((p) => p.categoriaId === c.id).map((p) => ({ ...p, custo: custoPorProduto.get(p.id) })),
  }))

  return <MenuAdminClient categorias={categoriaComProdutos} />
}
