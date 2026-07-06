// app/(garcom)/mesa/[id]/page.tsx
import { db } from '@/lib/db/index'
import { and, eq, asc, sql } from 'drizzle-orm'
import { mesa, categoria, produto } from '@/lib/db/schema'
import { notFound } from 'next/navigation'
import { MesaPageClient } from './client'
import { requireAccess } from '@/lib/auth/access'
import { getTenantMesaOrders } from '@/lib/orders/queries'

export default async function MesaPage({ params }: { params: Promise<{ id: string }> }) {
  const { tenantId } = await requireAccess('garcom')
  const { id } = await params
  const [m] = await db
    .select()
    .from(mesa)
    .where(and(eq(mesa.id, id), eq(mesa.tenantId, tenantId)))
  if (!m || !m.ativa) notFound()

  const categorias = await db
    .select()
    .from(categoria)
    .where(eq(categoria.tenantId, tenantId))
    .orderBy(asc(categoria.ordem))

  const produtos = await db
    .select()
    .from(produto)
    .where(and(eq(produto.tenantId, tenantId), sql`${produto.disponivel} = 1`))

  const categoriaComProdutos = categorias.map((c) => ({
    ...c,
    produtos: produtos.filter((p) => p.categoriaId === c.id),
  }))
  const initialPedidos = await getTenantMesaOrders({ tenantId, mesaId: m.id })

  return (
    <MesaPageClient
      mesaNumero={m.numero}
      mesaId={m.id}
      categorias={categoriaComProdutos}
      initialPedidos={initialPedidos}
    />
  )
}
