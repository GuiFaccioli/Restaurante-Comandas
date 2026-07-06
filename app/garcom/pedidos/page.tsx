import Link from 'next/link'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/db/index'
import { requireAccess } from '@/lib/auth/access'
import { categoria, itemPedido, mesa, pedido, produto } from '@/lib/db/schema'
import { PendingDeliveriesClient } from '@/components/garcom/pending-deliveries-client'

export const dynamic = 'force-dynamic'

export default async function PedidosPage() {
  const { tenantId } = await requireAccess('garcom')

  const pedidosPendentes = await db
    .select({
      id: pedido.id,
      status: pedido.status,
      criadoEm: pedido.criadoEm,
      mesaNumero: mesa.numero,
    })
    .from(pedido)
    .innerJoin(mesa, eq(pedido.mesaId, mesa.id))
    .where(and(eq(pedido.tenantId, tenantId), eq(pedido.status, 'novo')))
    .orderBy(desc(pedido.criadoEm))

  const pedidoIds = pedidosPendentes.map((p) => p.id)

  const itens =
    pedidoIds.length > 0
      ? await db
          .select({
            pedidoId: itemPedido.pedidoId,
            nome: produto.nome,
            quantidade: itemPedido.quantidade,
            observacao: itemPedido.observacao,
            categoriaNome: categoria.nome,
          })
          .from(itemPedido)
          .innerJoin(produto, eq(itemPedido.produtoId, produto.id))
          .innerJoin(categoria, eq(produto.categoriaId, categoria.id))
          .where(inArray(itemPedido.pedidoId, pedidoIds))
      : []

  const initialPedidos = pedidosPendentes.map((p) => ({
    ...p,
    itens: itens.filter((i) => i.pedidoId === p.id),
  }))

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Entregas pendentes</h1>
          <p className="text-sm text-muted-foreground">
            Confira primeiro os pedidos chamados pela cozinha.
          </p>
        </div>
        <Link href="/garcom/mesas" className="rounded-md border px-3 py-2 text-sm font-medium">
          Mesas
        </Link>
      </div>
      <PendingDeliveriesClient initialPedidos={initialPedidos} />
    </div>
  )
}
