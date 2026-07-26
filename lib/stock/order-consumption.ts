import { and, asc, eq, inArray } from 'drizzle-orm'
import * as pgSchema from '@/lib/db/schema'
import * as sqliteSchema from '@/lib/db/schema-sqlite'
import type { StatusPedido } from '@/lib/db/schema'
import {
  applyStockMovementInPostgresTransaction,
  applyStockMovementInSqliteTransaction,
  lockStockItemInPostgresTransaction,
  readStockItemInSqliteTransaction,
  stockMillisToDecimal,
  stockQuantityToMillis,
  type PostgresStockTransaction,
  type SQLiteStockTransaction,
} from '@/lib/stock/service'

export type OrderItemInput = {
  produtoId: string
  quantidade: number
  observacao?: string
}

export type CreateOrderTransactionInput = {
  tenantId: string
  usuarioId: string
  mesaId: string
  items: OrderItemInput[]
}

export type CreatedOrder = {
  id: string
  mesaNumero: number
  itens: Array<{
    nome: string
    quantidade: number
    categoriaNome: string
    observacao: string | null
  }>
}

export type TransitionOrderInput = {
  tenantId: string
  usuarioId: string
  pedidoId: string
  targetStatus: StatusPedido
}

export type CancelOrderInput = {
  tenantId: string
  pedidoId: string
}

export type OrderTransitionResult = {
  changed: boolean
  status: StatusPedido
}

type ProductForOrder = {
  nome: string
  preco: string
  categoriaNome: string
  controleEstoque: boolean
}

type SnapshotMovement = {
  itemPedidoId: string
  insumoId: string
  quantidadeTotal: string
  chaveIdempotencia: string
}

const STATUS_FLOW: Record<StatusPedido, StatusPedido | null> = {
  novo: 'em_preparo',
  em_preparo: 'pronto',
  pronto: 'entregue',
  entregue: null,
  cancelado: null,
}

function validateCreateOrderInput(
  input: CreateOrderTransactionInput,
): void {
  if (!input.tenantId || !input.usuarioId || !input.mesaId) {
    throw new Error('Mesa inválida')
  }
  if (input.items.length === 0) throw new Error('Pedido vazio')
  if (input.items.some((item) => (
    !item.produtoId ||
    !Number.isInteger(item.quantidade) ||
    item.quantidade <= 0
  ))) {
    throw new Error('Item inválido')
  }
}

function validateRecipeQuantity(quantity: string): number {
  const millis = stockQuantityToMillis(quantity)
  if (millis <= 0) {
    throw new Error('Ficha técnica inválida')
  }
  return millis
}

function idempotencyKey(
  tenantId: string,
  pedidoId: string,
  itemPedidoId: string,
  insumoId: string,
): string {
  return [
    'consumo',
    tenantId,
    'pedido',
    pedidoId,
    'item',
    itemPedidoId,
    'insumo',
    insumoId,
  ].join(':')
}

function prepareSnapshotMovements(
  tenantId: string,
  pedidoId: string,
  snapshots: Array<{
    itemPedidoId: string
    insumoId: string
    quantidadeTotal: string
  }>,
): SnapshotMovement[] {
  return snapshots
    .map((snapshot) => {
      validateRecipeQuantity(snapshot.quantidadeTotal)
      return {
        ...snapshot,
        chaveIdempotencia: idempotencyKey(
          tenantId,
          pedidoId,
          snapshot.itemPedidoId,
          snapshot.insumoId,
        ),
      }
    })
    .sort((left, right) => (
      left.insumoId.localeCompare(right.insumoId) ||
      left.itemPedidoId.localeCompare(right.itemPedidoId)
    ))
}

function aggregateDemand(
  movements: SnapshotMovement[],
): Map<string, number> {
  const demand = new Map<string, number>()
  for (const movement of movements) {
    demand.set(
      movement.insumoId,
      (demand.get(movement.insumoId) ?? 0) +
      stockQuantityToMillis(movement.quantidadeTotal),
    )
  }
  return demand
}

function validateTransition(
  currentStatus: StatusPedido,
  targetStatus: StatusPedido,
): OrderTransitionResult | null {
  if (currentStatus === targetStatus) {
    return { changed: false, status: targetStatus }
  }
  if (STATUS_FLOW[currentStatus] !== targetStatus) {
    throw new Error(
      `Transição inválida: ${currentStatus} → ${targetStatus}`,
    )
  }
  return null
}

function buildCreatedOrder(
  id: string,
  mesaNumero: number,
  preparedItems: Array<{
    item: OrderItemInput
    product: ProductForOrder
  }>,
): CreatedOrder {
  return {
    id,
    mesaNumero,
    itens: preparedItems.map(({ item, product }) => ({
      nome: product.nome,
      quantidade: item.quantidade,
      categoriaNome: product.categoriaNome,
      observacao: item.observacao ?? null,
    })),
  }
}

export function createOrderInSqliteTransaction(
  tx: SQLiteStockTransaction,
  input: CreateOrderTransactionInput,
): CreatedOrder {
  validateCreateOrderInput(input)

  const currentTable = tx
    .select({ numero: sqliteSchema.mesa.numero })
    .from(sqliteSchema.mesa)
    .where(and(
      eq(sqliteSchema.mesa.id, input.mesaId),
      eq(sqliteSchema.mesa.tenantId, input.tenantId),
      eq(sqliteSchema.mesa.ativa, true),
    ))
    .get()
  if (!currentTable) throw new Error('Mesa inválida')

  const products = new Map<string, ProductForOrder>()
  for (const produtoId of [...new Set(input.items.map((item) => item.produtoId))]
    .sort()) {
    const product = tx
      .select({
        nome: sqliteSchema.produto.nome,
        preco: sqliteSchema.produto.preco,
        categoriaNome: sqliteSchema.categoria.nome,
        controleEstoque: sqliteSchema.produto.controleEstoque,
      })
      .from(sqliteSchema.produto)
      .innerJoin(
        sqliteSchema.categoria,
        eq(sqliteSchema.produto.categoriaId, sqliteSchema.categoria.id),
      )
      .where(and(
        eq(sqliteSchema.produto.id, produtoId),
        eq(sqliteSchema.produto.tenantId, input.tenantId),
        eq(sqliteSchema.produto.disponivel, true),
        eq(sqliteSchema.categoria.tenantId, input.tenantId),
      ))
      .get()
    if (!product) throw new Error('Produto inválido')
    products.set(produtoId, {
      ...product,
      controleEstoque: Boolean(product.controleEstoque),
    })
  }

  const preparedItems = input.items.map((item) => ({
    item,
    product: products.get(item.produtoId) as ProductForOrder,
  }))
  const pedidoId = crypto.randomUUID()
  const now = new Date()
  tx.insert(sqliteSchema.pedido).values({
    id: pedidoId,
    tenantId: input.tenantId,
    mesaId: input.mesaId,
    createdByUserId: input.usuarioId,
    status: 'novo',
    criadoEm: now,
    entregueEm: null,
    atualizadoEm: now,
  }).run()

  for (const { item, product } of preparedItems) {
    const itemPedidoId = crypto.randomUUID()
    tx.insert(sqliteSchema.itemPedido).values({
      id: itemPedidoId,
      tenantId: input.tenantId,
      pedidoId,
      produtoId: item.produtoId,
      quantidade: item.quantidade,
      precoUnitario: product.preco,
      observacao: item.observacao ?? null,
    }).run()

    if (!product.controleEstoque) continue
    const recipes = tx
      .select({
        insumoId: sqliteSchema.fichaTecnicaItem.insumoId,
        insumoTenantId: sqliteSchema.insumo.tenantId,
        quantidade: sqliteSchema.fichaTecnicaItem.quantidade,
      })
      .from(sqliteSchema.fichaTecnicaItem)
      .innerJoin(
        sqliteSchema.insumo,
        eq(
          sqliteSchema.fichaTecnicaItem.insumoId,
          sqliteSchema.insumo.id,
        ),
      )
      .where(and(
        eq(sqliteSchema.fichaTecnicaItem.tenantId, input.tenantId),
        eq(sqliteSchema.fichaTecnicaItem.produtoId, item.produtoId),
      ))
      .orderBy(asc(sqliteSchema.fichaTecnicaItem.insumoId))
      .all()

    for (const recipe of recipes) {
      if (recipe.insumoTenantId !== input.tenantId) {
        throw new Error('Ficha técnica inválida')
      }
      const quantidadeTotal = stockMillisToDecimal(
        validateRecipeQuantity(recipe.quantidade) * item.quantidade,
      )
      tx.insert(sqliteSchema.itemPedidoInsumo).values({
        id: crypto.randomUUID(),
        tenantId: input.tenantId,
        pedidoId,
        itemPedidoId,
        insumoId: recipe.insumoId,
        quantidadeTotal,
      }).run()
    }
  }

  return buildCreatedOrder(
    pedidoId,
    currentTable.numero,
    preparedItems,
  )
}

export async function createOrderInPostgresTransaction(
  tx: PostgresStockTransaction,
  input: CreateOrderTransactionInput,
): Promise<CreatedOrder> {
  validateCreateOrderInput(input)

  const [currentTable] = await tx
    .select({ numero: pgSchema.mesa.numero })
    .from(pgSchema.mesa)
    .where(and(
      eq(pgSchema.mesa.id, input.mesaId),
      eq(pgSchema.mesa.tenantId, input.tenantId),
      eq(pgSchema.mesa.ativa, true),
    ))
    .for('update')
  if (!currentTable) throw new Error('Mesa inválida')

  const products = new Map<string, ProductForOrder>()
  for (const produtoId of [...new Set(input.items.map((item) => item.produtoId))]
    .sort()) {
    const [product] = await tx
      .select({
        nome: pgSchema.produto.nome,
        preco: pgSchema.produto.preco,
        categoriaNome: pgSchema.categoria.nome,
        controleEstoque: pgSchema.produto.controleEstoque,
      })
      .from(pgSchema.produto)
      .innerJoin(
        pgSchema.categoria,
        eq(pgSchema.produto.categoriaId, pgSchema.categoria.id),
      )
      .where(and(
        eq(pgSchema.produto.id, produtoId),
        eq(pgSchema.produto.tenantId, input.tenantId),
        eq(pgSchema.produto.disponivel, true),
        eq(pgSchema.categoria.tenantId, input.tenantId),
      ))
      .for('update')
    if (!product) throw new Error('Produto inválido')
    products.set(produtoId, product)
  }

  const controlledProductIds = [...products.entries()]
    .filter(([, product]) => product.controleEstoque)
    .map(([produtoId]) => produtoId)
    .sort()
  const recipeIngredientRefs = controlledProductIds.length === 0
    ? []
    : await tx
      .select({
        produtoId: pgSchema.fichaTecnicaItem.produtoId,
        insumoId: pgSchema.fichaTecnicaItem.insumoId,
      })
      .from(pgSchema.fichaTecnicaItem)
      .where(and(
        eq(pgSchema.fichaTecnicaItem.tenantId, input.tenantId),
        inArray(
          pgSchema.fichaTecnicaItem.produtoId,
          controlledProductIds,
        ),
      ))
  const ingredientIds = [
    ...new Set(recipeIngredientRefs.map((recipe) => recipe.insumoId)),
  ].sort()
  for (const insumoId of ingredientIds) {
    const [ingredient] = await tx
      .select({
        id: pgSchema.insumo.id,
        tenantId: pgSchema.insumo.tenantId,
        ativo: pgSchema.insumo.ativo,
      })
      .from(pgSchema.insumo)
      .where(and(
        eq(pgSchema.insumo.id, insumoId),
        eq(pgSchema.insumo.tenantId, input.tenantId),
        eq(pgSchema.insumo.ativo, true),
      ))
      .for('update')
    if (
      !ingredient ||
      ingredient.tenantId !== input.tenantId ||
      !ingredient.ativo
    ) {
      throw new Error('Ficha técnica inválida')
    }
  }
  const recipes = controlledProductIds.length === 0
    ? []
    : await tx
      .select({
        produtoId: pgSchema.fichaTecnicaItem.produtoId,
        insumoId: pgSchema.fichaTecnicaItem.insumoId,
        quantidade: pgSchema.fichaTecnicaItem.quantidade,
      })
      .from(pgSchema.fichaTecnicaItem)
      .where(and(
        eq(pgSchema.fichaTecnicaItem.tenantId, input.tenantId),
        inArray(
          pgSchema.fichaTecnicaItem.produtoId,
          controlledProductIds,
        ),
      ))
      .orderBy(
        asc(pgSchema.fichaTecnicaItem.produtoId),
        asc(pgSchema.fichaTecnicaItem.insumoId),
      )

  const preparedItems = input.items.map((item) => ({
    item,
    product: products.get(item.produtoId) as ProductForOrder,
  }))
  const pedidoId = crypto.randomUUID()
  const now = new Date()
  await tx.insert(pgSchema.pedido).values({
    id: pedidoId,
    tenantId: input.tenantId,
    mesaId: input.mesaId,
    createdByUserId: input.usuarioId,
    status: 'novo',
    criadoEm: now,
    entregueEm: null,
    atualizadoEm: now,
  })

  for (const { item, product } of preparedItems) {
    const itemPedidoId = crypto.randomUUID()
    await tx.insert(pgSchema.itemPedido).values({
      id: itemPedidoId,
      tenantId: input.tenantId,
      pedidoId,
      produtoId: item.produtoId,
      quantidade: item.quantidade,
      precoUnitario: product.preco,
      observacao: item.observacao ?? null,
    })

    if (!product.controleEstoque) continue
    for (const recipe of recipes.filter(
      (candidate) => candidate.produtoId === item.produtoId,
    )) {
      const quantidadeTotal = stockMillisToDecimal(
        validateRecipeQuantity(recipe.quantidade) * item.quantidade,
      )
      await tx.insert(pgSchema.itemPedidoInsumo).values({
        id: crypto.randomUUID(),
        tenantId: input.tenantId,
        pedidoId,
        itemPedidoId,
        insumoId: recipe.insumoId,
        quantidadeTotal,
      })
    }
  }

  return buildCreatedOrder(
    pedidoId,
    currentTable.numero,
    preparedItems,
  )
}

function consumeSnapshotInSqliteTransaction(
  tx: SQLiteStockTransaction,
  input: TransitionOrderInput,
): void {
  const snapshots = tx
    .select({
      itemPedidoId: sqliteSchema.itemPedidoInsumo.itemPedidoId,
      insumoId: sqliteSchema.itemPedidoInsumo.insumoId,
      quantidadeTotal: sqliteSchema.itemPedidoInsumo.quantidadeTotal,
    })
    .from(sqliteSchema.itemPedidoInsumo)
    .where(and(
      eq(sqliteSchema.itemPedidoInsumo.tenantId, input.tenantId),
      eq(sqliteSchema.itemPedidoInsumo.pedidoId, input.pedidoId),
    ))
    .all()
  const movements = prepareSnapshotMovements(
    input.tenantId,
    input.pedidoId,
    snapshots,
  )
  const pending = movements.filter((movement) => {
    const existing = tx
      .select({ id: sqliteSchema.movimentoEstoque.id })
      .from(sqliteSchema.movimentoEstoque)
      .where(and(
        eq(sqliteSchema.movimentoEstoque.tenantId, input.tenantId),
        eq(
          sqliteSchema.movimentoEstoque.chaveIdempotencia,
          movement.chaveIdempotencia,
        ),
      ))
      .get()
    return !existing
  })
  const demand = aggregateDemand(pending)

  for (const insumoId of [...demand.keys()].sort()) {
    const item = readStockItemInSqliteTransaction(
      tx,
      input.tenantId,
      insumoId,
    )
    if (
      stockQuantityToMillis(item.estoqueAtual) <
      (demand.get(insumoId) ?? 0)
    ) {
      throw new Error(`Não há estoque suficiente para ${item.nome}`)
    }
  }

  for (const movement of pending) {
    applyStockMovementInSqliteTransaction(tx, {
      tenantId: input.tenantId,
      usuarioId: input.usuarioId,
      insumoId: movement.insumoId,
      tipo: 'saida',
      quantidade:
        -stockQuantityToMillis(movement.quantidadeTotal) / 1_000,
      pedidoId: input.pedidoId,
      itemPedidoId: movement.itemPedidoId,
      chaveIdempotencia: movement.chaveIdempotencia,
      observacao: 'Consumo enviado para preparo',
    })
  }
}

async function consumeSnapshotInPostgresTransaction(
  tx: PostgresStockTransaction,
  input: TransitionOrderInput,
): Promise<void> {
  const snapshots = await tx
    .select({
      itemPedidoId: pgSchema.itemPedidoInsumo.itemPedidoId,
      insumoId: pgSchema.itemPedidoInsumo.insumoId,
      quantidadeTotal: pgSchema.itemPedidoInsumo.quantidadeTotal,
    })
    .from(pgSchema.itemPedidoInsumo)
    .where(and(
      eq(pgSchema.itemPedidoInsumo.tenantId, input.tenantId),
      eq(pgSchema.itemPedidoInsumo.pedidoId, input.pedidoId),
    ))
  const movements = prepareSnapshotMovements(
    input.tenantId,
    input.pedidoId,
    snapshots,
  )
  const keys = movements.map((movement) => movement.chaveIdempotencia)
  const existing = keys.length === 0
    ? []
    : await tx
      .select({ chaveIdempotencia: pgSchema.movimentoEstoque.chaveIdempotencia })
      .from(pgSchema.movimentoEstoque)
      .where(and(
        eq(pgSchema.movimentoEstoque.tenantId, input.tenantId),
        inArray(pgSchema.movimentoEstoque.chaveIdempotencia, keys),
      ))
  const existingKeys = new Set(
    existing.map((movement) => movement.chaveIdempotencia),
  )
  const pending = movements.filter(
    (movement) => !existingKeys.has(movement.chaveIdempotencia),
  )
  const demand = aggregateDemand(pending)

  for (const insumoId of [...demand.keys()].sort()) {
    const item = await lockStockItemInPostgresTransaction(
      tx,
      input.tenantId,
      insumoId,
    )
    if (
      stockQuantityToMillis(item.estoqueAtual) <
      (demand.get(insumoId) ?? 0)
    ) {
      throw new Error(`Não há estoque suficiente para ${item.nome}`)
    }
  }

  for (const movement of pending) {
    await applyStockMovementInPostgresTransaction(tx, {
      tenantId: input.tenantId,
      usuarioId: input.usuarioId,
      insumoId: movement.insumoId,
      tipo: 'saida',
      quantidade:
        -stockQuantityToMillis(movement.quantidadeTotal) / 1_000,
      pedidoId: input.pedidoId,
      itemPedidoId: movement.itemPedidoId,
      chaveIdempotencia: movement.chaveIdempotencia,
      observacao: 'Consumo enviado para preparo',
    })
  }
}

export function transitionOrderInSqliteTransaction(
  tx: SQLiteStockTransaction,
  input: TransitionOrderInput,
): OrderTransitionResult {
  const current = tx
    .select({ status: sqliteSchema.pedido.status })
    .from(sqliteSchema.pedido)
    .where(and(
      eq(sqliteSchema.pedido.id, input.pedidoId),
      eq(sqliteSchema.pedido.tenantId, input.tenantId),
    ))
    .get()
  if (!current) throw new Error('Pedido não encontrado')
  const noOp = validateTransition(current.status, input.targetStatus)
  if (noOp) return noOp

  if (
    current.status === 'novo' &&
    input.targetStatus === 'em_preparo'
  ) {
    consumeSnapshotInSqliteTransaction(tx, input)
  }

  const now = new Date()
  tx
    .update(sqliteSchema.pedido)
    .set({
      status: input.targetStatus,
      atualizadoEm: now,
      ...(input.targetStatus === 'entregue' ? { entregueEm: now } : {}),
    })
    .where(and(
      eq(sqliteSchema.pedido.id, input.pedidoId),
      eq(sqliteSchema.pedido.tenantId, input.tenantId),
    ))
    .run()
  return { changed: true, status: input.targetStatus }
}

export async function transitionOrderInPostgresTransaction(
  tx: PostgresStockTransaction,
  input: TransitionOrderInput,
): Promise<OrderTransitionResult> {
  const [current] = await tx
    .select({ status: pgSchema.pedido.status })
    .from(pgSchema.pedido)
    .where(and(
      eq(pgSchema.pedido.id, input.pedidoId),
      eq(pgSchema.pedido.tenantId, input.tenantId),
    ))
    .for('update')
  if (!current) throw new Error('Pedido não encontrado')
  const noOp = validateTransition(current.status, input.targetStatus)
  if (noOp) return noOp

  if (
    current.status === 'novo' &&
    input.targetStatus === 'em_preparo'
  ) {
    await consumeSnapshotInPostgresTransaction(tx, input)
  }

  const now = new Date()
  await tx
    .update(pgSchema.pedido)
    .set({
      status: input.targetStatus,
      atualizadoEm: now,
      ...(input.targetStatus === 'entregue' ? { entregueEm: now } : {}),
    })
    .where(and(
      eq(pgSchema.pedido.id, input.pedidoId),
      eq(pgSchema.pedido.tenantId, input.tenantId),
    ))
  return { changed: true, status: input.targetStatus }
}

export function cancelOrderInSqliteTransaction(
  tx: SQLiteStockTransaction,
  input: CancelOrderInput,
): OrderTransitionResult {
  const current = tx
    .select({ status: sqliteSchema.pedido.status })
    .from(sqliteSchema.pedido)
    .where(and(
      eq(sqliteSchema.pedido.id, input.pedidoId),
      eq(sqliteSchema.pedido.tenantId, input.tenantId),
    ))
    .get()
  if (!current) throw new Error('Pedido não encontrado')
  if (current.status === 'cancelado') {
    return { changed: false, status: 'cancelado' }
  }
  // Safe domain limit: only a never-consumed new order is cancellable.
  if (current.status !== 'novo') {
    throw new Error('Só pedidos novos podem ser cancelados')
  }

  tx
    .update(sqliteSchema.pedido)
    .set({ status: 'cancelado', atualizadoEm: new Date() })
    .where(and(
      eq(sqliteSchema.pedido.id, input.pedidoId),
      eq(sqliteSchema.pedido.tenantId, input.tenantId),
    ))
    .run()
  return { changed: true, status: 'cancelado' }
}

export async function cancelOrderInPostgresTransaction(
  tx: PostgresStockTransaction,
  input: CancelOrderInput,
): Promise<OrderTransitionResult> {
  const [current] = await tx
    .select({ status: pgSchema.pedido.status })
    .from(pgSchema.pedido)
    .where(and(
      eq(pgSchema.pedido.id, input.pedidoId),
      eq(pgSchema.pedido.tenantId, input.tenantId),
    ))
    .for('update')
  if (!current) throw new Error('Pedido não encontrado')
  if (current.status === 'cancelado') {
    return { changed: false, status: 'cancelado' }
  }
  // Safe domain limit: post-preparation cancellation needs explicit reversal state.
  if (current.status !== 'novo') {
    throw new Error('Só pedidos novos podem ser cancelados')
  }

  await tx
    .update(pgSchema.pedido)
    .set({ status: 'cancelado', atualizadoEm: new Date() })
    .where(and(
      eq(pgSchema.pedido.id, input.pedidoId),
      eq(pgSchema.pedido.tenantId, input.tenantId),
    ))
  return { changed: true, status: 'cancelado' }
}
