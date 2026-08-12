import { and, desc, eq, inArray, ne } from 'drizzle-orm'

import { db } from '@/lib/db/index'
import {
  atendimento,
  itemPedido,
  mesa,
  pagamentoPedido,
  pedido,
  produto,
} from '@/lib/db/schema'
import type { StatusAtendimento } from '@/lib/db/schema'
import { calculateOrderTotal } from '@/lib/orders/totals'
import { deriveMesaOperationalState, type AttendanceForTableState } from './service'

export type AtendimentoResumo = AttendanceForTableState & {
  mesaId: string
  mesaNumero: number
  status: StatusAtendimento
  saldoPendente: number
  pedidos: Array<{
    id: string
    status: string
    criadoEm: string
    entregueEm: string | null
    total: number
    itens: Array<{
      nome: string
      quantidade: number
      precoUnitario: string
      observacao: string | null
    }>
  }>
}

function sumRegisteredPayments(
  payments: Array<{ atendimentoId: string; valor: string; status: string }>,
  atendimentoId: string,
): number {
  return payments
    .filter((payment) => payment.atendimentoId === atendimentoId && payment.status === 'registrado')
    .reduce((total, payment) => total + Number(payment.valor), 0)
}

export async function getMesaAtendimentos(input: {
  tenantId: string
  mesaId: string
}): Promise<AtendimentoResumo[]> {
  const rows = await db
    .select({
      id: atendimento.id,
      mesaId: atendimento.mesaId,
      mesaNumero: mesa.numero,
      status: atendimento.status,
      abertoEm: atendimento.abertoEm,
    })
    .from(atendimento)
    .innerJoin(mesa, eq(atendimento.mesaId, mesa.id))
    .where(and(
      eq(atendimento.tenantId, input.tenantId),
      eq(atendimento.mesaId, input.mesaId),
      eq(mesa.tenantId, input.tenantId),
      ne(atendimento.status, 'cancelled'),
    ))
    .orderBy(desc(atendimento.abertoEm))

  return hydrateAttendances(input.tenantId, rows)
}

export async function getTenantMesaOperationalSummaries(input: {
  tenantId: string
}): Promise<Array<{
  id: string
  numero: number
  attendances: AtendimentoResumo[]
  operationalState: ReturnType<typeof deriveMesaOperationalState>
}>> {
  const tables = await db
    .select({ id: mesa.id, numero: mesa.numero })
    .from(mesa)
    .where(and(eq(mesa.tenantId, input.tenantId), eq(mesa.ativa, true)))
    .orderBy(mesa.numero)
  const attendanceRows = await db
    .select({
      id: atendimento.id,
      mesaId: atendimento.mesaId,
      mesaNumero: mesa.numero,
      status: atendimento.status,
      abertoEm: atendimento.abertoEm,
    })
    .from(atendimento)
    .innerJoin(mesa, eq(atendimento.mesaId, mesa.id))
    .where(and(
      eq(atendimento.tenantId, input.tenantId),
      eq(mesa.tenantId, input.tenantId),
      ne(atendimento.status, 'cancelled'),
    ))
    .orderBy(desc(atendimento.abertoEm))
  const hydrated = await hydrateAttendances(input.tenantId, attendanceRows)

  return tables.map((table) => {
    const tableAttendances = hydrated.filter((attendanceItem) => attendanceItem.mesaId === table.id)
    return {
      ...table,
      attendances: tableAttendances,
      operationalState: deriveMesaOperationalState(tableAttendances),
    }
  })
}

export async function getCashierAccounts(input: { tenantId: string }): Promise<AtendimentoResumo[]> {
  const rows = await db
    .select({
      id: atendimento.id,
      mesaId: atendimento.mesaId,
      mesaNumero: mesa.numero,
      status: atendimento.status,
      abertoEm: atendimento.abertoEm,
    })
    .from(atendimento)
    .innerJoin(mesa, eq(atendimento.mesaId, mesa.id))
    .where(and(
      eq(atendimento.tenantId, input.tenantId),
      eq(mesa.tenantId, input.tenantId),
    ))
    .orderBy(desc(atendimento.abertoEm))
  return hydrateAttendances(input.tenantId, rows)
}

async function hydrateAttendances(
  tenantId: string,
  rows: Array<{ id: string; mesaId: string; mesaNumero: number; status: StatusAtendimento; abertoEm: Date }>,
): Promise<AtendimentoResumo[]> {
  const attendanceIds = rows.map((row) => row.id)
  if (attendanceIds.length === 0) return []
  const orders = await db
    .select({
      id: pedido.id,
      atendimentoId: pedido.atendimentoId,
      status: pedido.status,
      criadoEm: pedido.criadoEm,
      entregueEm: pedido.entregueEm,
    })
    .from(pedido)
    .where(and(eq(pedido.tenantId, tenantId), inArray(pedido.atendimentoId, attendanceIds)))
    .orderBy(desc(pedido.criadoEm))
  const orderIds = orders.map((order) => order.id)
  const items = orderIds.length > 0
    ? await db
      .select({ pedidoId: itemPedido.pedidoId, nome: produto.nome, quantidade: itemPedido.quantidade, precoUnitario: itemPedido.precoUnitario, observacao: itemPedido.observacao })
      .from(itemPedido)
      .innerJoin(produto, eq(itemPedido.produtoId, produto.id))
      .where(and(eq(itemPedido.tenantId, tenantId), inArray(itemPedido.pedidoId, orderIds)))
    : []
  const payments = await db
    .select({ atendimentoId: pagamentoPedido.atendimentoId, valor: pagamentoPedido.valor, status: pagamentoPedido.status })
    .from(pagamentoPedido)
    .where(and(eq(pagamentoPedido.tenantId, tenantId), inArray(pagamentoPedido.atendimentoId, attendanceIds)))

  return rows.map((row) => {
    const rowOrders = orders.filter((order) => order.atendimentoId === row.id)
    const hydratedOrders = rowOrders.map((order) => {
      const orderItems = items.filter((item) => item.pedidoId === order.id).map(({ pedidoId: _pedidoId, ...item }) => item)
      return {
        id: order.id,
        status: order.status,
        criadoEm: order.criadoEm.toISOString(),
        entregueEm: order.entregueEm?.toISOString() ?? null,
        total: order.status === 'cancelado' ? 0 : calculateOrderTotal(orderItems),
        itens: orderItems,
      }
    })
    const total = hydratedOrders.reduce((sum, order) => sum + order.total, 0)
    const paid = sumRegisteredPayments(payments, row.id)
    return {
      id: row.id,
      mesaId: row.mesaId,
      mesaNumero: row.mesaNumero,
      status: row.status,
      abertoEm: row.abertoEm.toISOString(),
      total,
      orderCount: hydratedOrders.length,
      activeOrderCount: hydratedOrders.filter((order) => order.status !== 'entregue' && order.status !== 'cancelado').length,
      saldoPendente: Math.max(0, total - paid),
      pedidos: hydratedOrders,
    }
  })
}
