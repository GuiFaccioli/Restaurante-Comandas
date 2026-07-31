import { and, desc, eq, inArray } from 'drizzle-orm'

import { db } from '@/lib/db/index'
import { categoria, itemPedido, mesa, pedido, produto } from '@/lib/db/schema'

export type KitchenOrder = {
  id: string
  status: KitchenOrderStatus
  criadoEm: string
  mesaNumero: number
  itens: Array<{
    pedidoId: string
    nome: string
    quantidade: number
    observacao: string | null
    categoriaNome: string | null
  }>
}

export type KitchenOrderStatus = 'novo' | 'em_preparo' | 'pronto'

export async function getKitchenOrders({ tenantId }: { tenantId: string }): Promise<KitchenOrder[]> {
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

  const pedidoIds = pedidosAtivos.map((order) => order.id)
  const itens = pedidoIds.length === 0
    ? []
    : await db
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
        .where(and(
          eq(itemPedido.tenantId, tenantId),
          eq(produto.tenantId, tenantId),
          eq(categoria.tenantId, tenantId),
          inArray(itemPedido.pedidoId, pedidoIds),
        ))

  return pedidosAtivos.map((order) => ({
    ...order,
    status: order.status as KitchenOrderStatus,
    criadoEm: order.criadoEm.toISOString(),
    itens: itens.filter((item) => item.pedidoId === order.id),
  }))
}
