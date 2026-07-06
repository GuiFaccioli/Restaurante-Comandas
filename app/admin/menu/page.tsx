// app/(admin)/menu/page.tsx
import { db } from '@/lib/db/index'
import { asc, eq } from 'drizzle-orm'
import { categoria, produto } from '@/lib/db/schema'
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
  const produtos = await db.select().from(produto).where(eq(produto.tenantId, tenantId))

  const categoriaComProdutos = categorias.map((c) => ({
    ...c,
    produtos: produtos.filter((p) => p.categoriaId === c.id),
  }))

  return <MenuAdminClient categorias={categoriaComProdutos} />
}
