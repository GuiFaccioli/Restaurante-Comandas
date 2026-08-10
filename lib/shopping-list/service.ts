import { and, eq } from 'drizzle-orm'
import { requireAccess } from '@/lib/auth/access'
import { db, runInDbTransaction } from '@/lib/db/index'
import { insumo, shoppingListItem } from '@/lib/db/schema'
import {
  applyStockMovementInPostgresTransaction,
  type PostgresStockTransaction,
} from '@/lib/stock/service'
import {
  normalizarQuantidadeBase,
  parsePositiveDecimal,
  UNIDADES_COMPRA,
} from '@/lib/stock/units'

export type CompleteShoppingListItemInput = {
  itemId: string
  receivedQuantity?: string
  idempotencyKey: string
}

export type AddManualShoppingListItemInput = {
  nome: string
  quantidade: string
  unidade: string
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function validateIdempotencyKey(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Chave idempotente inválida')
  const key = value.trim()
  if (!UUID_PATTERN.test(key)) throw new Error('Chave idempotente inválida')
  return key
}

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

  const current = Number(item.estoqueAtual)
  const minimum = Number(item.estoqueMinimo)
  const needed = Number(item.estoqueIdeal) - current
  const factor = Number(item.fatorCompraParaBase)
  if (
    !Number.isFinite(current) || !Number.isFinite(minimum) ||
    !Number.isFinite(needed) || !Number.isFinite(factor) || factor <= 0 ||
    current > minimum || needed <= 0
  ) return

  const [existing] = await tx.select({ id: shoppingListItem.id })
    .from(shoppingListItem)
    .where(and(
      eq(shoppingListItem.tenantId, tenantId),
      eq(shoppingListItem.insumoId, insumoId),
      eq(shoppingListItem.kind, 'automatic'),
    ))
    .limit(1)
  if (existing) return

  await tx.insert(shoppingListItem).values({
    id: crypto.randomUUID(),
    tenantId,
    kind: 'automatic',
    insumoId,
    nome: item.nome,
    unidade: item.unidadeCompra,
    quantidadeSugerida: (needed / factor).toFixed(3),
  })
}

export async function addManualShoppingListItem(
  input: AddManualShoppingListItemInput,
): Promise<void> {
  const { tenantId } = await requireAccess('admin')
  const nome = input.nome.trim()
  if (!nome) throw new Error('Informe o nome do item')
  if (!UNIDADES_COMPRA.includes(input.unidade as typeof UNIDADES_COMPRA[number])) {
    throw new Error('Unidade de compra inválida')
  }

  await db.insert(shoppingListItem).values({
    id: crypto.randomUUID(), tenantId, kind: 'manual', insumoId: null, nome,
    unidade: input.unidade,
    quantidadeSugerida: parsePositiveDecimal(input.quantidade, 'Quantidade').toFixed(3),
  })
}

export async function completeShoppingListItem(
  input: CompleteShoppingListItemInput,
): Promise<void> {
  const { tenantId, usuarioId } = await requireAccess('admin')
  const key = validateIdempotencyKey(input.idempotencyKey)
  if (!input.itemId) throw new Error('Item da lista inválido')

  await runInDbTransaction({
    postgresOperation: async (tx) => {
      const [row] = await tx.select({
        id: shoppingListItem.id,
        kind: shoppingListItem.kind,
        insumoId: shoppingListItem.insumoId,
        quantidadeSugerida: shoppingListItem.quantidadeSugerida,
      }).from(shoppingListItem).where(and(
        eq(shoppingListItem.id, input.itemId),
        eq(shoppingListItem.tenantId, tenantId),
      )).for('update')
      if (!row) return

      if (row.kind === 'manual') {
        await tx.delete(shoppingListItem).where(and(
          eq(shoppingListItem.id, row.id),
          eq(shoppingListItem.tenantId, tenantId),
        ))
        return
      }
      if (row.kind !== 'automatic' || !row.insumoId) {
        throw new Error('Item da lista inválido')
      }

      const [item] = await tx.select({
        id: insumo.id,
        unidadeCompra: insumo.unidadeCompra,
        unidadeBase: insumo.unidadeBase,
      }).from(insumo).where(and(
        eq(insumo.id, row.insumoId),
        eq(insumo.tenantId, tenantId),
        eq(insumo.ativo, true),
      )).for('update')
      if (!item) throw new Error('Insumo não encontrado')

      const received = normalizarQuantidadeBase(
        input.receivedQuantity ?? row.quantidadeSugerida,
        item.unidadeCompra,
        item.unidadeBase,
      )
      await applyStockMovementInPostgresTransaction(tx, {
        tenantId,
        usuarioId,
        insumoId: item.id,
        tipo: 'entrada',
        quantidade: Number(received),
        chaveIdempotencia: `shopping-list:${row.id}:${key}`,
        observacao: 'Entrada confirmada pela lista de compras',
      })
      await tx.delete(shoppingListItem).where(and(
        eq(shoppingListItem.id, row.id),
        eq(shoppingListItem.tenantId, tenantId),
      ))
      await reconcileShoppingListInPostgresTransaction(tx, tenantId, item.id)
    },
  })
}
