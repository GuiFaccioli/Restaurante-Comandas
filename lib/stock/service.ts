import { and, eq } from 'drizzle-orm'
import type { NeonDatabase } from 'drizzle-orm/neon-serverless'
import { runInDbTransaction } from '@/lib/db/index'
import * as pgSchema from '@/lib/db/schema'
import { calcularCustoMedioPonderado } from '@/lib/stock/costing'
import type { TipoMovimentoEstoque } from '@/lib/db/schema'
import {
  lockAutomaticShoppingListItemInPostgresTransaction,
  reconcileShoppingListInPostgresTransaction,
} from '@/lib/shopping-list/reconciliation'
import {
  stockMillisToDecimal,
  stockQuantityToMillis,
} from '@/lib/stock/quantity'

export { stockMillisToDecimal, stockQuantityToMillis } from '@/lib/stock/quantity'

export type ApplyStockMovementInput = {
  tenantId: string
  usuarioId?: string | null
  insumoId: string
  tipo: TipoMovimentoEstoque
  quantidade: number
  chaveIdempotencia: string
  pedidoId?: string | null
  itemPedidoId?: string | null
  motivo?: string | null
  observacao?: string | null
  custoUnitario?: number | null
}

export type AppliedStockMovement = {
  applied: boolean
  saldoAnterior: number
  saldoResultante: number
  custoUnitario: number | null
}

export type PostgresStockTransaction = Parameters<
  Parameters<
    NeonDatabase<typeof pgSchema>['transaction']
  >[0]
>[0]

export type LockedStockItem = {
  nome: string
  estoqueAtual: string
  custoUnitario: string | null
}

type StockMovementValues = {
  saldoAnterior: number
  saldoResultante: number
  custoUnitario: number | null
  stockUpdate: {
    estoqueAtual: string
    custoUnitario?: string
  }
  movementValues: {
    id: string
    tenantId: string
    insumoId: string
    tipo: TipoMovimentoEstoque
    quantidade: string
    saldoAnterior: string
    saldoResultante: string
    custoUnitario: string | null
    custoTotal: string | null
    pedidoId: string | null
    itemPedidoId: string | null
    chaveIdempotencia: string
    motivo: string | null
    observacao: string | null
    criadoPorUsuarioId: string | null
    criadoEm: Date
  }
}

const STOCK_QUANTITY_SCALE = 1_000

function fixed(value: number, scale = 3): string {
  return value.toFixed(scale)
}

function validateInput(input: ApplyStockMovementInput): void {
  if (!input.tenantId || !input.insumoId || !input.chaveIdempotencia.trim()) {
    throw new Error('Movimentação de estoque inválida')
  }
  const quantityMillis = stockQuantityToMillis(input.quantidade)
  if (
    quantityMillis === 0 &&
    input.tipo !== 'contagem'
  ) {
    throw new Error('A quantidade da movimentação deve ser diferente de zero')
  }
  if (
    input.custoUnitario !== null &&
    input.custoUnitario !== undefined &&
    (!Number.isFinite(input.custoUnitario) || input.custoUnitario < 0)
  ) {
    throw new Error('O custo unitário é inválido')
  }
}

function buildMovementValues(
  input: ApplyStockMovementInput,
  item: LockedStockItem,
): StockMovementValues {
  const saldoAnteriorMillis = stockQuantityToMillis(item.estoqueAtual)
  const quantidadeInformadaMillis = stockQuantityToMillis(input.quantidade)
  const quantidadeMovimentoMillis = input.tipo === 'contagem'
    ? quantidadeInformadaMillis - saldoAnteriorMillis
    : quantidadeInformadaMillis
  const saldoResultanteMillis =
    saldoAnteriorMillis + quantidadeMovimentoMillis
  if (saldoResultanteMillis < 0) {
    throw new Error(`Não há estoque suficiente para ${item.nome}`)
  }
  const saldoAnterior = saldoAnteriorMillis / STOCK_QUANTITY_SCALE
  const quantidadeMovimento =
    quantidadeMovimentoMillis / STOCK_QUANTITY_SCALE
  const saldoResultante = saldoResultanteMillis / STOCK_QUANTITY_SCALE

  const shouldUpdateCost = input.tipo === 'entrada'
  const custoAtual = item.custoUnitario === null
    ? null
    : Number(item.custoUnitario)
  const custoUnitario = (
    shouldUpdateCost &&
    input.custoUnitario !== null &&
    input.custoUnitario !== undefined
  )
    ? calcularCustoMedioPonderado(
      saldoAnterior,
      custoAtual,
      quantidadeMovimento,
      input.custoUnitario,
    )
    : custoAtual
  const custoMovimento = input.custoUnitario ?? custoAtual
  const custoTotal = custoMovimento === null
    ? null
    : Math.abs(quantidadeMovimento) * custoMovimento

  return {
    saldoAnterior,
    saldoResultante,
    custoUnitario,
    stockUpdate: {
      estoqueAtual: stockMillisToDecimal(saldoResultanteMillis),
      ...(shouldUpdateCost &&
      input.custoUnitario !== null &&
      input.custoUnitario !== undefined
        ? { custoUnitario: fixed(custoUnitario ?? 0, 4) }
        : {}),
    },
    movementValues: {
      id: crypto.randomUUID(),
      tenantId: input.tenantId,
      insumoId: input.insumoId,
      tipo: input.tipo,
      quantidade: stockMillisToDecimal(quantidadeMovimentoMillis),
      saldoAnterior: stockMillisToDecimal(saldoAnteriorMillis),
      saldoResultante: stockMillisToDecimal(saldoResultanteMillis),
      custoUnitario: custoMovimento === null
        ? null
        : fixed(custoMovimento, 4),
      custoTotal: custoTotal === null ? null : custoTotal.toFixed(2),
      pedidoId: input.pedidoId ?? null,
      itemPedidoId: input.itemPedidoId ?? null,
      chaveIdempotencia: input.chaveIdempotencia,
      motivo: input.motivo?.trim() || null,
      observacao: input.observacao?.trim() || null,
      criadoPorUsuarioId: input.usuarioId ?? null,
      criadoEm: new Date(),
    },
  }
}

function idempotentResult(): AppliedStockMovement {
  return {
    applied: false,
    saldoAnterior: 0,
    saldoResultante: 0,
    custoUnitario: null,
  }
}

function appliedResult(
  values: StockMovementValues,
): AppliedStockMovement {
  return {
    applied: true,
    saldoAnterior: values.saldoAnterior,
    saldoResultante: values.saldoResultante,
    custoUnitario: values.custoUnitario,
  }
}

export async function lockStockItemInPostgresTransaction(
  tx: PostgresStockTransaction,
  tenantId: string,
  insumoId: string,
): Promise<LockedStockItem> {
  const [item] = await tx
    .select({
      nome: pgSchema.insumo.nome,
      estoqueAtual: pgSchema.insumo.estoqueAtual,
      custoUnitario: pgSchema.insumo.custoUnitario,
    })
    .from(pgSchema.insumo)
    .where(and(
      eq(pgSchema.insumo.id, insumoId),
      eq(pgSchema.insumo.tenantId, tenantId),
    ))
    .for('update')
  if (!item) throw new Error('Insumo não encontrado')
  return item
}

export async function applyStockMovementInPostgresTransaction(
  tx: PostgresStockTransaction,
  input: ApplyStockMovementInput,
): Promise<AppliedStockMovement> {
  validateInput(input)

  const [existing] = await tx
    .select({ id: pgSchema.movimentoEstoque.id })
    .from(pgSchema.movimentoEstoque)
    .where(and(
      eq(pgSchema.movimentoEstoque.tenantId, input.tenantId),
      eq(
        pgSchema.movimentoEstoque.chaveIdempotencia,
        input.chaveIdempotencia,
      ),
  ))
  if (existing) return idempotentResult()

  await lockAutomaticShoppingListItemInPostgresTransaction(
    tx,
    input.tenantId,
    input.insumoId,
  )
  const item = await lockStockItemInPostgresTransaction(
    tx,
    input.tenantId,
    input.insumoId,
  )

  const [existingAfterLock] = await tx
    .select({ id: pgSchema.movimentoEstoque.id })
    .from(pgSchema.movimentoEstoque)
    .where(and(
      eq(pgSchema.movimentoEstoque.tenantId, input.tenantId),
      eq(
        pgSchema.movimentoEstoque.chaveIdempotencia,
        input.chaveIdempotencia,
      ),
    ))
  if (existingAfterLock) return idempotentResult()

  const values = buildMovementValues(input, item)
  await tx
    .update(pgSchema.insumo)
    .set(values.stockUpdate)
    .where(and(
      eq(pgSchema.insumo.id, input.insumoId),
      eq(pgSchema.insumo.tenantId, input.tenantId),
    ))
  await tx.insert(pgSchema.movimentoEstoque).values(values.movementValues)
  await reconcileShoppingListInPostgresTransaction(
    tx,
    input.tenantId,
    input.insumoId,
  )
  return appliedResult(values)
}

export async function applyStockMovement(
  input: ApplyStockMovementInput,
): Promise<AppliedStockMovement> {
  validateInput(input)

  return await runInDbTransaction({
    postgresOperation: (tx) => (
      applyStockMovementInPostgresTransaction(tx, input)
    ),
  })
}
