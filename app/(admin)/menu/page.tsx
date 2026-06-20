// app/(admin)/menu/page.tsx
import { db } from '@/lib/db/index'
import { asc } from 'drizzle-orm'
import { categoria, produto } from '@/lib/db/schema'
import { MenuAdminClient } from './client'

export default async function MenuAdminPage() {
  const categorias = await db.select().from(categoria).orderBy(asc(categoria.ordem))
  const produtos = await db.select().from(produto)

  const categoriaComProdutos = categorias.map((c) => ({
    ...c,
    produtos: produtos.filter((p) => p.categoriaId === c.id),
  }))

  return <MenuAdminClient categorias={categoriaComProdutos} />
}
