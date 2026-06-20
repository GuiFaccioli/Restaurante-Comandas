// app/(cozinha)/dashboard/page.tsx
import { db } from '@/lib/db/index'
import { desc, eq, inArray } from 'drizzle-orm'
import { pedido, itemPedido, produto, mesa } from '@/lib/db/schema'
import { KanbanBoard } from '@/components/cozinha/kanban-board'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const pedidosAtivos = await db
    .select({
      id: pedido.id,
      status: pedido.status,
      criadoEm: pedido.criadoEm,
      mesaNumero: mesa.numero,
    })
    .from(pedido)
    .innerJoin(mesa, eq(pedido.mesaId, mesa.id))
    .where(inArray(pedido.status, ['novo', 'em_preparo', 'pronto']))
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
    ...p,
    itens: itens.filter((i) => i.pedidoId === p.id),
  }))

  return (
    <div className="p-6 h-screen flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Cozinha</h1>
      <div className="flex-1 overflow-hidden">
        <KanbanBoard initialPedidos={initialPedidos} />
      </div>
    </div>
  )
}
