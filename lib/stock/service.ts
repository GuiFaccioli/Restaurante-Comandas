import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db/index'
import { insumo, movimentoEstoque } from '@/lib/db/schema'
import { isSQLiteDatabase } from '@/lib/db/compat'
import { calcularCustoMedioPonderado } from '@/lib/stock/costing'
import type { TipoMovimentoEstoque } from '@/lib/db/schema'

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

function fixed(value: number, scale = 3): string {
  return value.toFixed(scale)
}

function validateInput(input: ApplyStockMovementInput): void {
  if (!input.tenantId || !input.insumoId || !input.chaveIdempotencia.trim()) {
    throw new Error('Movimentação de estoque inválida')
  }
  if (!Number.isFinite(input.quantidade) || (input.quantidade === 0 && input.tipo !== 'contagem')) {
    throw new Error('A quantidade da movimentação deve ser diferente de zero')
  }
  if (input.custoUnitario !== null && input.custoUnitario !== undefined && (!Number.isFinite(input.custoUnitario) || input.custoUnitario < 0)) {
    throw new Error('O custo unitário é inválido')
  }
}

export async function applyStockMovement(input: ApplyStockMovementInput): Promise<AppliedStockMovement> {
  validateInput(input)

  const buildValues = (item: any) => {
    const saldoAnterior = Number(item.estoqueAtual)
    const saldoResultante = saldoAnterior + input.quantidade
    if (saldoResultante < 0) throw new Error(`Não há estoque suficiente para ${item.nome}`)

    const shouldUpdateCost = input.tipo === 'entrada'
    const custoAtual = item.custoUnitario === null ? null : Number(item.custoUnitario)
    const custoUnitario = shouldUpdateCost && input.custoUnitario !== null && input.custoUnitario !== undefined
      ? calcularCustoMedioPonderado(saldoAnterior, custoAtual, input.quantidade, input.custoUnitario)
      : custoAtual
    const custoMovimento = input.custoUnitario ?? custoAtual
    const custoTotal = custoMovimento === null ? null : Math.abs(input.quantidade) * custoMovimento
    return {
      saldoAnterior,
      saldoResultante,
      custoUnitario,
      stockUpdate: {
        estoqueAtual: fixed(saldoResultante),
        ...(shouldUpdateCost && input.custoUnitario !== null && input.custoUnitario !== undefined
          ? { custoUnitario: fixed(custoUnitario ?? 0, 4) }
          : {}),
      },
      movementValues: {
        id: crypto.randomUUID(),
        tenantId: input.tenantId,
        insumoId: input.insumoId,
        tipo: input.tipo,
        quantidade: fixed(input.quantidade),
        saldoAnterior: fixed(saldoAnterior),
        saldoResultante: fixed(saldoResultante),
        custoUnitario: custoMovimento === null ? null : fixed(custoMovimento, 4),
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

  const operationSync = (tx: any): AppliedStockMovement => {
    const existingRows = tx.select({ id: movimentoEstoque.id }).from(movimentoEstoque).where(and(eq(movimentoEstoque.tenantId, input.tenantId), eq(movimentoEstoque.chaveIdempotencia, input.chaveIdempotencia))).all()
    if (existingRows.length > 0) return { applied: false, saldoAnterior: 0, saldoResultante: 0, custoUnitario: null }
    const rows = tx.select().from(insumo).where(and(eq(insumo.id, input.insumoId), eq(insumo.tenantId, input.tenantId))).all()
    const item = rows[0]
    if (!item) throw new Error('Insumo não encontrado')
    const values = buildValues(item)
    tx.update(insumo).set(values.stockUpdate).where(and(eq(insumo.id, input.insumoId), eq(insumo.tenantId, input.tenantId))).run()
    tx.insert(movimentoEstoque).values(values.movementValues).run()
    return { applied: true, saldoAnterior: values.saldoAnterior, saldoResultante: values.saldoResultante, custoUnitario: values.custoUnitario }
  }

  const operationAsync = async (tx: any): Promise<AppliedStockMovement> => {
    const existingRows = await tx.select({ id: movimentoEstoque.id }).from(movimentoEstoque).where(and(eq(movimentoEstoque.tenantId, input.tenantId), eq(movimentoEstoque.chaveIdempotencia, input.chaveIdempotencia)))
    if (existingRows.length > 0) {
      return { applied: false, saldoAnterior: 0, saldoResultante: 0, custoUnitario: null }
    }
    const rows = await tx.select().from(insumo).where(and(eq(insumo.id, input.insumoId), eq(insumo.tenantId, input.tenantId)))
    const item = rows[0]
    if (!item) throw new Error('Insumo não encontrado')
    const values = buildValues(item)
    await tx.update(insumo).set(values.stockUpdate).where(and(eq(insumo.id, input.insumoId), eq(insumo.tenantId, input.tenantId)))
    await tx.insert(movimentoEstoque).values(values.movementValues)
    return { applied: true, saldoAnterior: values.saldoAnterior, saldoResultante: values.saldoResultante, custoUnitario: values.custoUnitario }
  }

  if (isSQLiteDatabase) {
    return (db as any).transaction((tx: any) => operationSync(tx))
  }
  return db.transaction((tx) => operationAsync(tx))
}
