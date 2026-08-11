import { and, eq } from 'drizzle-orm'

import { insumo, shoppingListItem } from '@/lib/db/schema'
import {
  stockMillisToDecimal,
  stockQuantityToMillis,
} from '@/lib/stock/quantity'
import type { PostgresStockTransaction } from '@/lib/stock/service'

export async function reconcileShoppingListInPostgresTransaction(
  tx: PostgresStockTransaction,
  tenantId: string,
  insumoId: string,
): Promise<void> {
  const [item] = await tx.select({
    id: insumo.id,
    nome: insumo.nome,
    unidadeCompra: insumo.unidadeCompra,
    fatorCompraParaBase: insumo.fatorCompraParaBase,
    estoqueAtual: insumo.estoqueAtual,
    estoqueIdeal: insumo.estoqueIdeal,
    estoqueMinimo: insumo.estoqueMinimo,
  }).from(insumo).where(and(
    eq(insumo.id, insumoId),
    eq(insumo.tenantId, tenantId),
    eq(insumo.ativo, true),
  )).for('update')
  if (!item) throw new Error('Insumo não encontrado')

  const currentMillis = stockQuantityToMillis(item.estoqueAtual)
  const minimumMillis = stockQuantityToMillis(item.estoqueMinimo)
  const idealMillis = stockQuantityToMillis(item.estoqueIdeal)
  const factorMillis = stockQuantityToMillis(item.fatorCompraParaBase)
  const neededMillis = idealMillis - currentMillis

  const [existing] = await tx.select({ id: shoppingListItem.id })
    .from(shoppingListItem)
    .where(and(
      eq(shoppingListItem.tenantId, tenantId),
      eq(shoppingListItem.insumoId, insumoId),
      eq(shoppingListItem.kind, 'automatic'),
    ))
    .for('update')
    .limit(1)

  if (
    factorMillis <= 0 ||
    currentMillis > minimumMillis ||
    neededMillis <= 0
  ) {
    if (existing) {
      await tx.delete(shoppingListItem).where(and(
        eq(shoppingListItem.id, existing.id),
        eq(shoppingListItem.tenantId, tenantId),
      ))
    }
    return
  }
  if (existing) return

  const suggestedMillis = Math.round(
    neededMillis * 1_000 / factorMillis,
  )
  if (!Number.isSafeInteger(suggestedMillis) || suggestedMillis <= 0) {
    throw new Error('Quantidade sugerida inválida')
  }

  await tx.insert(shoppingListItem).values({
    id: crypto.randomUUID(),
    tenantId,
    kind: 'automatic',
    insumoId,
    nome: item.nome,
    unidade: item.unidadeCompra,
    quantidadeSugerida: stockMillisToDecimal(suggestedMillis),
  })
}
