// app/(admin)/menu/page.tsx
import { db } from '@/lib/db/index'
import { asc, eq } from 'drizzle-orm'
import { categoria, fichaTecnicaItem, insumo, produto } from '@/lib/db/schema'
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
  const [produtos, fichas, insumos] = await Promise.all([
    db.select().from(produto).where(eq(produto.tenantId, tenantId)),
    db.select().from(fichaTecnicaItem).where(eq(fichaTecnicaItem.tenantId, tenantId)),
    db.select({ id: insumo.id, custoUnitario: insumo.custoUnitario }).from(insumo).where(eq(insumo.tenantId, tenantId)),
  ])

  const custoPorInsumo = new Map(insumos.map((item) => [item.id, item.custoUnitario]))
  const custoPorProduto = new Map(produtos.map((item) => {
    const result = calcularCustoFicha(
      fichas.filter((ficha) => ficha.produtoId === item.id).map((ficha) => ({ quantidade: ficha.quantidade, custoUnitario: custoPorInsumo.get(ficha.insumoId) ?? null })),
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
