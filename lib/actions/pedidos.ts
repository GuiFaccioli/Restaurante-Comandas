'use server'

import { and, eq, inArray } from 'drizzle-orm'
import { runInDbTransaction } from '@/lib/db/index'
import { atendimento, itemPedido, pagamentoPedido, pedido } from '@/lib/db/schema'
import type { FormaPagamento, StatusPedido } from '@/lib/db/schema'
import { requireAccess } from '@/lib/auth/access'
import { notifyTenant } from '@/lib/tenant-events'
import { normalizeCurrencyToDecimal } from '@/lib/money'
import {
  cancelOrderInPostgresTransaction,
  createOrderInPostgresTransaction,
  transitionOrderInPostgresTransaction,
} from '@/lib/stock/order-consumption'

export type ConfirmarPedidoItem = {
  produtoId: string
  quantidade: number
  observacao?: string
}

export async function confirmarPedido(
  mesaId: string,
  atendimentoId: string,
  items: ConfirmarPedidoItem[],
): Promise<{ id: string }> {
  const { usuarioId, tenantId } = await requireAccess('garcom')
  if (!mesaId) throw new Error('Mesa inválida')
  if (!atendimentoId) throw new Error('Atendimento inválido')
  if (items.length === 0) throw new Error('Pedido vazio')
  if (items.some((item) => (
    !item.produtoId ||
    !Number.isInteger(item.quantidade) ||
    item.quantidade <= 0
  ))) {
    throw new Error('Item inválido')
  }

  const transactionInput = {
    tenantId,
    usuarioId,
    mesaId,
    atendimentoId,
    items,
  }
  const created = await runInDbTransaction({
    postgresOperation: (tx) => (
      createOrderInPostgresTransaction(tx, transactionInput)
    ),
  })

  notifyTenant(tenantId, {
    type: 'attendance_updated',
  })

  return { id: created.id }
}

export async function atualizarStatus(
  pedidoId: string,
  status: StatusPedido,
): Promise<void> {
  const { tenantId, usuarioId } = await requireAccess('cozinha')
  if (status !== 'em_preparo' && status !== 'pronto') {
    throw new Error('Status de cozinha inválido')
  }
  const transactionInput = {
    tenantId,
    usuarioId,
    pedidoId,
    targetStatus: status,
  }
  await runInDbTransaction({
    postgresOperation: (tx) => (
      transitionOrderInPostgresTransaction(tx, transactionInput)
    ),
  })
  notifyTenant(tenantId, {
    type: 'attendance_updated',
  })
}

export async function confirmarEntrega(pedidoId: string): Promise<void> {
  const { tenantId, usuarioId } = await requireAccess('garcom')
  const transactionInput = {
    tenantId,
    usuarioId,
    pedidoId,
    targetStatus: 'entregue' as const,
  }
  await runInDbTransaction({
    postgresOperation: (tx) => (
      transitionOrderInPostgresTransaction(tx, transactionInput)
    ),
  })
  notifyTenant(tenantId, {
    type: 'attendance_updated',
  })
}

export async function cancelarPedido(pedidoId: string): Promise<void> {
  const { tenantId } = await requireAccess('garcom')
  const transactionInput = { tenantId, pedidoId }
  await runInDbTransaction({
    postgresOperation: (tx) => (
      cancelOrderInPostgresTransaction(tx, transactionInput)
    ),
  })
  notifyTenant(tenantId, {
    type: 'attendance_updated',
  })
}

export type RegistrarPagamentoPedidoResult = {
  status: 'registrado' | 'ja_registrado'
}

const PAYMENT_METHODS = [
  'dinheiro',
  'pix',
  'credito',
  'debito',
  'outro',
] as const satisfies readonly FormaPagamento[]

type PaymentItem = {
  quantidade: number
  precoUnitario: string
}

function decimalToCents(value: string): number {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim())
  if (!match) throw new Error('Total do pedido inválido')

  const cents = (
    Number(match[1]) * 100 +
    Number((match[2] ?? '').padEnd(2, '0'))
  )
  if (!Number.isSafeInteger(cents)) {
    throw new Error('Total do pedido inválido')
  }
  return cents
}

function calculateOfficialTotalCents(items: PaymentItem[]): number {
  const totalCents = items.reduce((total, item) => {
    if (!Number.isInteger(item.quantidade) || item.quantidade <= 0) {
      throw new Error('Total do pedido inválido')
    }
    return total + item.quantidade * decimalToCents(item.precoUnitario)
  }, 0)

  if (totalCents <= 0 || !Number.isSafeInteger(totalCents)) {
    throw new Error('Total do pedido inválido')
  }
  return totalCents
}

function centsToDecimal(cents: number): string {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`
}

function validateExactPayment(
  informedValue: string,
  items: PaymentItem[],
): string {
  const officialTotalCents = calculateOfficialTotalCents(items)
  if (decimalToCents(informedValue) !== officialTotalCents) {
    throw new Error('O valor deve ser exatamente o total pendente')
  }
  return centsToDecimal(officialTotalCents)
}

function isRegisteredPaymentConflict(error: unknown): boolean {
  let current = error

  for (let depth = 0; depth < 3; depth += 1) {
    if (typeof current !== 'object' || current === null) return false

    const candidate = current as {
      cause?: unknown
      code?: unknown
      constraint?: unknown
      message?: unknown
    }
    if (
      candidate.code === '23505' &&
      candidate.constraint ===
        'pagamento_pedido_tenant_pedido_registrado_unique'
    ) {
      return true
    }
    current = candidate.cause
  }

  return false
}

export async function registrarPagamentoPedido(input: {
  pedidoId: string
  formaPagamento: FormaPagamento
  valor: string
  observacao?: string
}): Promise<RegistrarPagamentoPedidoResult> {
  const { usuarioId, tenantId } = await requireAccess('caixa')
  if (!PAYMENT_METHODS.includes(input.formaPagamento)) {
    throw new Error('Forma de pagamento inválida')
  }
  let informedValue: string

  try {
    informedValue = normalizeCurrencyToDecimal(input.valor)
  } catch {
    throw new Error('Valor de pagamento inválido')
  }

  try {
    return await runInDbTransaction(
      {
        postgresOperation: async (tx) => {
          const [current] = await tx
            .select({ id: pedido.id, status: pedido.status, atendimentoId: pedido.atendimentoId })
            .from(pedido)
            .where(and(
              eq(pedido.id, input.pedidoId),
              eq(pedido.tenantId, tenantId),
            ))
            .for('update')

          if (!current) throw new Error('Pedido não encontrado')
          if (current.status !== 'entregue') {
            throw new Error('Apenas pedidos entregues podem ser pagos')
          }

          const [activePayment] = await tx
            .select({ id: pagamentoPedido.id })
            .from(pagamentoPedido)
            .where(and(
              eq(pagamentoPedido.tenantId, tenantId),
              eq(pagamentoPedido.pedidoId, input.pedidoId),
              eq(pagamentoPedido.status, 'registrado'),
            ))
          if (activePayment) return { status: 'ja_registrado' as const }

          const items = await tx
            .select({
              quantidade: itemPedido.quantidade,
              precoUnitario: itemPedido.precoUnitario,
            })
            .from(itemPedido)
            .where(and(
              eq(itemPedido.tenantId, tenantId),
              eq(itemPedido.pedidoId, input.pedidoId),
            ))
          const valor = validateExactPayment(informedValue, items)

          await tx.insert(pagamentoPedido).values({
            id: crypto.randomUUID(),
            tenantId,
            pedidoId: input.pedidoId,
            atendimentoId: current.atendimentoId,
            registradoPorUsuarioId: usuarioId,
            formaPagamento: input.formaPagamento,
            valor,
            status: 'registrado',
            observacao: input.observacao?.trim() || null,
            registradoEm: new Date(),
          })

          return { status: 'registrado' as const }
        },
      }
    )
  } catch (error) {
    if (isRegisteredPaymentConflict(error)) {
      return { status: 'ja_registrado' }
    }
    throw error
  }
}

export async function registrarPagamentoAtendimento(input: {
  atendimentoId: string
  formaPagamento: FormaPagamento
  valor: string
  observacao?: string
}): Promise<{ status: 'registrado' | 'ja_registrado'; atendimentoStatus: 'awaiting_payment' | 'paid' }> {
  const { usuarioId, tenantId } = await requireAccess('caixa')
  if (!PAYMENT_METHODS.includes(input.formaPagamento)) throw new Error('Forma de pagamento inválida')
  let informedCents: number
  try {
    informedCents = decimalToCents(normalizeCurrencyToDecimal(input.valor))
  } catch {
    throw new Error('Valor de pagamento inválido')
  }
  if (informedCents <= 0) throw new Error('Valor de pagamento inválido')

  const result = await runInDbTransaction({
    postgresOperation: async (tx) => {
      const [current] = await tx
        .select({ id: atendimento.id, status: atendimento.status })
        .from(atendimento)
        .where(and(eq(atendimento.id, input.atendimentoId), eq(atendimento.tenantId, tenantId)))
        .for('update')
      if (!current) throw new Error('Conta não encontrada')
      if (current.status !== 'awaiting_payment') throw new Error('A conta ainda não está disponível para pagamento')

      const orders = await tx
        .select({ id: pedido.id, status: pedido.status })
        .from(pedido)
        .where(and(eq(pedido.tenantId, tenantId), eq(pedido.atendimentoId, input.atendimentoId)))
      if (orders.some((order) => order.status !== 'entregue' && order.status !== 'cancelado')) throw new Error('A conta ainda possui pedidos em andamento')
      const orderIds = orders.map((order) => order.id)
      const items = orderIds.length > 0
        ? await tx.select({ quantidade: itemPedido.quantidade, precoUnitario: itemPedido.precoUnitario }).from(itemPedido).where(and(eq(itemPedido.tenantId, tenantId), inArray(itemPedido.pedidoId, orderIds)))
        : []
      const totalCents = calculateOfficialTotalCents(items)
      const payments = await tx.select({ valor: pagamentoPedido.valor }).from(pagamentoPedido).where(and(eq(pagamentoPedido.tenantId, tenantId), eq(pagamentoPedido.atendimentoId, input.atendimentoId), eq(pagamentoPedido.status, 'registrado')))
      const paidCents = payments.reduce((sum, payment) => sum + decimalToCents(payment.valor), 0)
      const balanceCents = totalCents - paidCents
      if (balanceCents <= 0) {
        await tx.update(atendimento).set({ status: 'paid', fechadoEm: new Date(), fechadoPorUsuarioId: usuarioId, atualizadoEm: new Date() }).where(and(eq(atendimento.id, input.atendimentoId), eq(atendimento.tenantId, tenantId)))
        return { status: 'ja_registrado' as const, atendimentoStatus: 'paid' as const }
      }
      if (informedCents > balanceCents) throw new Error('O valor não pode ser maior que o saldo pendente')
      await tx.insert(pagamentoPedido).values({ id: crypto.randomUUID(), tenantId, pedidoId: null, atendimentoId: input.atendimentoId, registradoPorUsuarioId: usuarioId, formaPagamento: input.formaPagamento, valor: centsToDecimal(informedCents), status: 'registrado', observacao: input.observacao?.trim() || null, registradoEm: new Date() })
      const nextStatus: 'awaiting_payment' | 'paid' = informedCents === balanceCents ? 'paid' : 'awaiting_payment'
      if (nextStatus === 'paid') await tx.update(atendimento).set({ status: 'paid', fechadoEm: new Date(), fechadoPorUsuarioId: usuarioId, atualizadoEm: new Date() }).where(and(eq(atendimento.id, input.atendimentoId), eq(atendimento.tenantId, tenantId)))
      return { status: 'registrado' as const, atendimentoStatus: nextStatus }
    },
  })
  notifyTenant(tenantId, {
    type: 'attendance_updated',
  })
  return result
}
