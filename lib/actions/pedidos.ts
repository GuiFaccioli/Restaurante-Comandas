'use server'

import { and, eq } from 'drizzle-orm'
import { runInDbTransaction } from '@/lib/db/index'
import { itemPedido, pagamentoPedido, pedido } from '@/lib/db/schema'
import * as sqliteSchema from '@/lib/db/schema-sqlite'
import type { FormaPagamento, StatusPedido } from '@/lib/db/schema'
import { notifyKitchen } from '@/lib/sse'
import { requireAccess } from '@/lib/auth/access'
import { normalizeCurrencyToDecimal } from '@/lib/money'
import {
  cancelOrderInPostgresTransaction,
  cancelOrderInSqliteTransaction,
  createOrderInPostgresTransaction,
  createOrderInSqliteTransaction,
  transitionOrderInPostgresTransaction,
  transitionOrderInSqliteTransaction,
} from '@/lib/stock/order-consumption'

export type ConfirmarPedidoItem = {
  produtoId: string
  quantidade: number
  observacao?: string
}

export async function confirmarPedido(
  mesaId: string,
  items: ConfirmarPedidoItem[],
): Promise<{ id: string }> {
  const { usuarioId, tenantId } = await requireAccess('garcom')
  if (!mesaId) throw new Error('Mesa inválida')
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
    items,
  }
  const created = await runInDbTransaction({
    sqliteOperation: (tx) => (
      createOrderInSqliteTransaction(tx, transactionInput)
    ),
    postgresOperation: (tx) => (
      createOrderInPostgresTransaction(tx, transactionInput)
    ),
  })

  try {
    notifyKitchen(tenantId, {
      type: 'novo_pedido',
      payload: {
        pedidoId: created.id,
        mesaNumero: created.mesaNumero,
        itens: created.itens,
      },
    })
  } catch (error) {
    console.error('Failed to notify kitchen about new order', error)
  }

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
  const result = await runInDbTransaction({
    sqliteOperation: (tx) => (
      transitionOrderInSqliteTransaction(tx, transactionInput)
    ),
    postgresOperation: (tx) => (
      transitionOrderInPostgresTransaction(tx, transactionInput)
    ),
  })
  if (!result.changed) return

  try {
    notifyKitchen(tenantId, {
      type: 'status_atualizado',
      payload: { pedidoId, status },
    })
  } catch (error) {
    console.error('Failed to notify kitchen about status update', error)
  }
}

export async function confirmarEntrega(pedidoId: string): Promise<void> {
  const { tenantId, usuarioId } = await requireAccess('garcom')
  const transactionInput = {
    tenantId,
    usuarioId,
    pedidoId,
    targetStatus: 'entregue' as const,
  }
  const result = await runInDbTransaction({
    sqliteOperation: (tx) => (
      transitionOrderInSqliteTransaction(tx, transactionInput)
    ),
    postgresOperation: (tx) => (
      transitionOrderInPostgresTransaction(tx, transactionInput)
    ),
  })
  if (!result.changed) return

  try {
    notifyKitchen(tenantId, {
      type: 'status_atualizado',
      payload: { pedidoId, status: 'entregue' },
    })
  } catch (error) {
    console.error(
      'Failed to notify kitchen about delivery confirmation',
      error,
    )
  }
}

export async function cancelarPedido(pedidoId: string): Promise<void> {
  const { tenantId } = await requireAccess('garcom')
  const transactionInput = { tenantId, pedidoId }
  const result = await runInDbTransaction({
    sqliteOperation: (tx) => (
      cancelOrderInSqliteTransaction(tx, transactionInput)
    ),
    postgresOperation: (tx) => (
      cancelOrderInPostgresTransaction(tx, transactionInput)
    ),
  })
  if (!result.changed) return

  try {
    notifyKitchen(tenantId, {
      type: 'status_atualizado',
      payload: { pedidoId, status: 'cancelado' },
    })
  } catch (error) {
    console.error(
      'Failed to notify kitchen about order cancellation',
      error,
    )
  }
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
    if (
      typeof candidate.code === 'string' &&
      candidate.code.startsWith('SQLITE_CONSTRAINT') &&
      typeof candidate.message === 'string' &&
      candidate.message.includes('pagamento_pedido.tenant_id') &&
      candidate.message.includes('pagamento_pedido.pedido_id')
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
        sqliteOperation: (tx) => {
          const current = tx
            .select({
              id: sqliteSchema.pedido.id,
              status: sqliteSchema.pedido.status,
            })
            .from(sqliteSchema.pedido)
            .where(and(
              eq(sqliteSchema.pedido.id, input.pedidoId),
              eq(sqliteSchema.pedido.tenantId, tenantId),
            ))
            .get()

          if (!current) throw new Error('Pedido não encontrado')
          if (current.status !== 'entregue') {
            throw new Error('Apenas pedidos entregues podem ser pagos')
          }

          const activePayment = tx
            .select({ id: sqliteSchema.pagamentoPedido.id })
            .from(sqliteSchema.pagamentoPedido)
            .where(and(
              eq(sqliteSchema.pagamentoPedido.tenantId, tenantId),
              eq(sqliteSchema.pagamentoPedido.pedidoId, input.pedidoId),
              eq(sqliteSchema.pagamentoPedido.status, 'registrado'),
            ))
            .get()
          if (activePayment) return { status: 'ja_registrado' as const }

          const items = tx
            .select({
              quantidade: sqliteSchema.itemPedido.quantidade,
              precoUnitario: sqliteSchema.itemPedido.precoUnitario,
            })
            .from(sqliteSchema.itemPedido)
            .where(and(
              eq(sqliteSchema.itemPedido.tenantId, tenantId),
              eq(sqliteSchema.itemPedido.pedidoId, input.pedidoId),
            ))
            .all()
          const valor = validateExactPayment(informedValue, items)

          tx.insert(sqliteSchema.pagamentoPedido)
            .values({
              id: crypto.randomUUID(),
              tenantId,
              pedidoId: input.pedidoId,
              registradoPorUsuarioId: usuarioId,
              formaPagamento: input.formaPagamento,
              valor,
              status: 'registrado',
              observacao: input.observacao?.trim() || null,
              registradoEm: new Date(),
            })
            .run()

          return { status: 'registrado' as const }
        },
        postgresOperation: async (tx) => {
          const [current] = await tx
            .select({ id: pedido.id, status: pedido.status })
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
            registradoPorUsuarioId: usuarioId,
            formaPagamento: input.formaPagamento,
            valor,
            status: 'registrado',
            observacao: input.observacao?.trim() || null,
            registradoEm: new Date(),
          })

          return { status: 'registrado' as const }
        },
      },
      { sqliteMode: 'immediate' },
    )
  } catch (error) {
    if (isRegisteredPaymentConflict(error)) {
      return { status: 'ja_registrado' }
    }
    throw error
  }
}
