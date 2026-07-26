// app/(cozinha)/dashboard/page.tsx
import { db } from '@/lib/db/index'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { categoria, pedido, itemPedido, produto, mesa } from '@/lib/db/schema'
import { KanbanBoard } from '@/components/cozinha/kanban-board'
import { requireAccess } from '@/lib/auth/access'
import { ScrollToTopButton } from '@/components/operational/scroll-to-top'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const { tenantId } = await requireAccess('cozinha')
  const pedidosAtivos = await db
    .select({
      id: pedido.id,
      status: pedido.status,
      criadoEm: pedido.criadoEm,
      mesaNumero: mesa.numero,
    })
    .from(pedido)
    .innerJoin(mesa, eq(pedido.mesaId, mesa.id))
    .where(
      and(
        eq(pedido.tenantId, tenantId),
        inArray(pedido.status, ['novo', 'em_preparo', 'pronto'])
      )
    )
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
            categoriaNome: categoria.nome,
          })
          .from(itemPedido)
          .innerJoin(produto, eq(itemPedido.produtoId, produto.id))
          .innerJoin(categoria, eq(produto.categoriaId, categoria.id))
          .where(inArray(itemPedido.pedidoId, pedidoIds))
      : []

  const initialPedidos = pedidosAtivos.map((p) => ({
    ...p,
    itens: itens.filter((i) => i.pedidoId === p.id),
  }))

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col gap-4 p-4 sm:gap-6 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold">Cozinha</h1>
        <p className="text-pretty text-sm text-muted-foreground">
          Acompanhe as comandas abertas chamadas pelo atendimento.
        </p>
      </div>
      <div className="flex-1 overflow-hidden">
        <KanbanBoard initialPedidos={initialPedidos} />
      </div>
      <ScrollToTopButton />
    </div>
  )
}
