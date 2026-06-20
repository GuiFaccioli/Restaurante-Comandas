// app/(garcom)/mesa/[id]/page.tsx
import { db } from '@/lib/db/index'
import { eq, asc, and, inArray } from 'drizzle-orm'
import { mesa, categoria, produto, pedido } from '@/lib/db/schema'
import { criarPedido } from '@/lib/actions/pedidos'
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

  // Find existing active pedido for this mesa, or create a new one
  const existingPedidos = await db
    .select({ id: pedido.id })
    .from(pedido)
    .where(and(
      eq(pedido.mesaId, m.id),
      inArray(pedido.status, ['novo', 'em_preparo'])
    ))
    .limit(1)

  let pedidoId: string
  if (existingPedidos.length > 0) {
    pedidoId = existingPedidos[0].id
  } else {
    const { id } = await criarPedido(m.id)
    pedidoId = id
  }

  return (
    <MesaPageClient
      mesaNumero={m.numero}
      mesaId={m.id}
      pedidoId={pedidoId}
      categorias={categoriaComProdutos}
    />
  )
}
