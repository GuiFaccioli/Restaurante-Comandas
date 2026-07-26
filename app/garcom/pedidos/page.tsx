import { and, desc, eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/db/index'
import { requireAccess } from '@/lib/auth/access'
import { categoria, itemPedido, mesa, pedido, produto } from '@/lib/db/schema'
import { PendingDeliveriesClient } from '@/components/garcom/pending-deliveries-client'
import { ScrollToTopButton } from '@/components/operational/scroll-to-top'

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
    .where(and(eq(pedido.tenantId, tenantId), eq(pedido.status, 'pronto')))
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
    <div className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
      <div>
        <div>
          <h1 className="text-2xl font-bold">Entregas pendentes</h1>
          <p className="text-pretty text-sm text-muted-foreground">
            Confira primeiro os pedidos chamados pela cozinha.
          </p>
        </div>
      </div>
      <PendingDeliveriesClient initialPedidos={initialPedidos} />
      <ScrollToTopButton />
    </div>
  )
}
