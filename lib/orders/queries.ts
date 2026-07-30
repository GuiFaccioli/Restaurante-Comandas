import { and, desc, eq, inArray, ne } from 'drizzle-orm'

import { db } from '@/lib/db/index'
import {
  itemPedido,
  mesa,
  pagamentoPedido,
  pedido,
  produto,
  tenantUser,
  usuario,
} from '@/lib/db/schema'
import type { StatusPagamento, StatusPedido } from '@/lib/db/schema'
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

export type CashierResponsible = {
  usuarioId: string
  nome: string
}

export type CashierPayment = {
  valor: number
  registradoEm: string
  registradoPor: CashierResponsible | null
}

export type CashierOrder = TableOrder & {
  mesaNumero: number
  pagamentoStatus: 'pendente' | 'pago'
  criadoPor: CashierResponsible | null
  pagamento: CashierPayment | null
}

export type CashierResponsibleMembership = CashierResponsible & {
  tenantId: string
}

export function resolveTenantResponsible(
  memberships: CashierResponsibleMembership[],
  tenantId: string,
  usuarioId: string | null
): CashierResponsible | null {
  if (!usuarioId) return null

  const membership = memberships.find(
    (candidate) => candidate.tenantId === tenantId && candidate.usuarioId === usuarioId
  )

  return membership
    ? { usuarioId: membership.usuarioId, nome: membership.nome }
    : null
}

export function findRegisteredPayment<
  T extends { pedidoId: string | null; status: StatusPagamento },
>(payments: T[], pedidoId: string): T | undefined {
  return payments.find(
    (payment) => payment.pedidoId === pedidoId && payment.status === 'registrado'
  )
}

export async function getTenantMesaOrders(input: {
  tenantId: string
  mesaId: string
  atendimentoId?: string
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
        eq(mesa.id, input.mesaId),
        ...(input.atendimentoId ? [eq(pedido.atendimentoId, input.atendimentoId)] : []),
        ne(pedido.status, 'entregue'),
        ne(pedido.status, 'cancelado')
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

export async function getCashierOrders(input: { tenantId: string }): Promise<CashierOrder[]> {
  const orders = await db
    .select({
      id: pedido.id,
      status: pedido.status,
      criadoEm: pedido.criadoEm,
      entregueEm: pedido.entregueEm,
      mesaNumero: mesa.numero,
      createdByUserId: pedido.createdByUserId,
    })
    .from(pedido)
    .innerJoin(mesa, eq(pedido.mesaId, mesa.id))
    .where(
      and(
        eq(pedido.tenantId, input.tenantId),
        eq(mesa.tenantId, input.tenantId),
        ne(pedido.status, 'cancelado')
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

  const pagamentos =
    orderIds.length > 0
      ? await db
          .select({
            pedidoId: pagamentoPedido.pedidoId,
            status: pagamentoPedido.status,
            registradoPorUsuarioId: pagamentoPedido.registradoPorUsuarioId,
            valor: pagamentoPedido.valor,
            registradoEm: pagamentoPedido.registradoEm,
          })
          .from(pagamentoPedido)
          .where(
            and(
              eq(pagamentoPedido.tenantId, input.tenantId),
              inArray(pagamentoPedido.pedidoId, orderIds)
            )
          )
      : []

  const responsibleUserIds = [
    ...new Set([
      ...orders.map((order) => order.createdByUserId),
      ...pagamentos.map((pagamento) => pagamento.registradoPorUsuarioId),
    ].filter((usuarioId): usuarioId is string => Boolean(usuarioId))),
  ]

  const responsibleUsers =
    responsibleUserIds.length > 0
      ? await db
          .select({
            tenantId: tenantUser.tenantId,
            usuarioId: tenantUser.usuarioId,
            nome: usuario.nome,
          })
          .from(tenantUser)
          .innerJoin(usuario, eq(tenantUser.usuarioId, usuario.id))
          .where(
            and(
              eq(tenantUser.tenantId, input.tenantId),
              inArray(tenantUser.usuarioId, responsibleUserIds)
            )
          )
      : []

  return orders.map((order) => {
    const itens = items
      .filter((item) => item.pedidoId === order.id)
      .map(({ pedidoId: _pedidoId, ...item }) => item)
    const total = calculateOrderTotal(itens)
    const pagamentoRegistrado = findRegisteredPayment(pagamentos, order.id)
    const criadoPor = resolveTenantResponsible(
      responsibleUsers,
      input.tenantId,
      order.createdByUserId
    )
    const registradoPor = pagamentoRegistrado
      ? resolveTenantResponsible(
          responsibleUsers,
          input.tenantId,
          pagamentoRegistrado.registradoPorUsuarioId
        )
      : null

    return {
      id: order.id,
      status: order.status,
      criadoEm: order.criadoEm.toISOString(),
      entregueEm: order.entregueEm?.toISOString() ?? null,
      mesaNumero: order.mesaNumero,
      total,
      pagamentoStatus: pagamentoRegistrado ? 'pago' : 'pendente',
      criadoPor,
      pagamento: pagamentoRegistrado
        ? {
            valor: Number(pagamentoRegistrado.valor),
            registradoEm: pagamentoRegistrado.registradoEm.toISOString(),
            registradoPor,
          }
        : null,
      itens,
    }
  })
}
