import { db } from '@/lib/db/index'
import { desc, eq, inArray } from 'drizzle-orm'
import { pedido, mesa, itemPedido, produto } from '@/lib/db/schema'
import { AdminPedidosLive } from './client'

export const dynamic = 'force-dynamic'

export default async function AdminPedidosPage() {
  const pedidosAtivos = await db
    .select({
      id: pedido.id,
      status: pedido.status,
      criadoEm: pedido.criadoEm,
      mesaNumero: mesa.numero,
    })
    .from(pedido)
    .innerJoin(mesa, eq(pedido.mesaId, mesa.id))
    .orderBy(desc(pedido.criadoEm))

  const pedidoIds = pedidosAtivos.map((p) => p.id)

  const itens =
    pedidoIds.length > 0
      ? await db
          .select({
            pedidoId: itemPedido.pedidoId,
            nome: produto.nome,
            quantidade: itemPedido.quantidade,
            observacao: itemPedido.observacao,
          })
          .from(itemPedido)
          .innerJoin(produto, eq(itemPedido.produtoId, produto.id))
          .where(inArray(itemPedido.pedidoId, pedidoIds))
      : []

  const initialPedidos = pedidosAtivos.map((p) => ({
    id: p.id,
    status: p.status,
    criadoEm: p.criadoEm.toISOString(),
    mesaNumero: p.mesaNumero,
    itens: itens.filter((i) => i.pedidoId === p.id),
  }))

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Pedidos</h1>
        <p className="text-sm text-muted-foreground">Pedidos persistidos no sistema.</p>
      </div>

      <AdminPedidosLive initialPedidos={initialPedidos} />
    </div>
  )
}