import { and, desc, eq, inArray } from 'drizzle-orm'

import { db } from '@/lib/db/index'
import { itemPedido, mesa, pedido, produto } from '@/lib/db/schema'
import type { StatusPedido } from '@/lib/db/schema'
import { calculateOrderTotal } from './totals'

export type TableOrderItem = {
  nome: string
  quantidade: number
  precoUnitario: string
  observacao?: string | null
}

export type TableOrder = {
  id: string
  status: StatusPedido
  criadoEm: string
  entregueEm: string | null
  total: number
  itens: TableOrderItem[]
}

export async function getTenantMesaOrders(input: {
  tenantId: string
  mesaId: string
}): Promise<TableOrder[]> {
  const orders = await db
    .select({
      id: pedido.id,
      status: pedido.status,
      criadoEm: pedido.criadoEm,
      entregueEm: pedido.entregueEm,
    })
    .from(pedido)
    .innerJoin(mesa, eq(pedido.mesaId, mesa.id))
    .where(
      and(
        eq(pedido.tenantId, input.tenantId),
        eq(mesa.tenantId, input.tenantId),
        eq(mesa.id, input.mesaId)
      )
    )
    .orderBy(desc(pedido.criadoEm))

  const orderIds = orders.map((order) => order.id)
  const items =
    orderIds.length > 0
      ? await db
          .select({
            pedidoId: itemPedido.pedidoId,
            nome: produto.nome,
            quantidade: itemPedido.quantidade,
            precoUnitario: itemPedido.precoUnitario,
            observacao: itemPedido.observacao,
          })
          .from(itemPedido)
          .innerJoin(produto, eq(itemPedido.produtoId, produto.id))
          .where(inArray(itemPedido.pedidoId, orderIds))
      : []

  return orders.map((order) => {
    const itens = items
      .filter((item) => item.pedidoId === order.id)
      .map(({ pedidoId: _pedidoId, ...item }) => item)

    return {
      id: order.id,
      status: order.status,
      criadoEm: order.criadoEm.toISOString(),
      entregueEm: order.entregueEm?.toISOString() ?? null,
      total: calculateOrderTotal(itens),
      itens,
    }
  })
}
