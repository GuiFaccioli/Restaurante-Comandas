// app/(garcom)/mesa/[id]/page.tsx
import { db } from '@/lib/db/index'
import { eq, asc } from 'drizzle-orm'
import { mesa, categoria, produto } from '@/lib/db/schema'
import { notFound } from 'next/navigation'
import { MesaPageClient } from './client'

export default async function MesaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [m] = await db.select().from(mesa).where(eq(mesa.id, id))
  if (!m || !m.ativa) notFound()

  const categorias = await db
    .select()
    .from(categoria)
    .orderBy(asc(categoria.ordem))

  const produtos = await db
    .select()
    .from(produto)
    .where(eq(produto.disponivel, true))

  const categoriaComProdutos = categorias.map((c) => ({
    ...c,
    produtos: produtos.filter((p) => p.categoriaId === c.id),
  }))

  return (
    <MesaPageClient
      mesaNumero={m.numero}
      mesaId={m.id}
      categorias={categoriaComProdutos}
    />
  )
}
