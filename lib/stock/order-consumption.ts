import { and, asc, eq, inArray } from 'drizzle-orm'
import * as pgSchema from '@/lib/db/schema'
import type { StatusPedido } from '@/lib/db/schema'
import {
  applyStockMovementInPostgresTransaction,
  lockStockItemInPostgresTransaction,
  stockMillisToDecimal,
  stockQuantityToMillis,
  type PostgresStockTransaction,
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
  atendimentoId?: string
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
  if (
    targetStatus === 'entregue' &&
    (currentStatus === 'novo' ||
      currentStatus === 'em_preparo' ||
      currentStatus === 'pronto')
  ) {
    return null
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

export async function createOrderInPostgresTransaction(
  tx: PostgresStockTransaction,
  input: CreateOrderTransactionInput,
): Promise<CreatedOrder> {
  validateCreateOrderInput(input)
  if (!input.atendimentoId) throw new Error('Atendimento inválido')

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

  const [currentAttendance] = await tx
    .select({ id: pgSchema.atendimento.id, mesaId: pgSchema.atendimento.mesaId, status: pgSchema.atendimento.status })
    .from(pgSchema.atendimento)
    .where(and(
      eq(pgSchema.atendimento.id, input.atendimentoId),
      eq(pgSchema.atendimento.tenantId, input.tenantId),
      eq(pgSchema.atendimento.mesaId, input.mesaId),
    ))
    .for('update')
  if (!currentAttendance || !['open', 'awaiting_payment'].includes(currentAttendance.status)) {
    throw new Error('Atendimento não está aberto')
  }
  if (currentAttendance.status === 'awaiting_payment') {
    await tx
      .update(pgSchema.atendimento)
      .set({
        status: 'open',
        aguardandoPagamentoEm: null,
        fechadoEm: null,
        fechadoPorUsuarioId: null,
        atualizadoEm: new Date(),
      })
      .where(and(
        eq(pgSchema.atendimento.id, input.atendimentoId),
        eq(pgSchema.atendimento.tenantId, input.tenantId),
      ))
  }

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
    atendimentoId: input.atendimentoId,
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

export async function transitionOrderInPostgresTransaction(
  tx: PostgresStockTransaction,
  input: TransitionOrderInput,
): Promise<OrderTransitionResult> {
  const [current] = await tx
    .select({ status: pgSchema.pedido.status, atendimentoId: pgSchema.pedido.atendimentoId })
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
    (input.targetStatus === 'em_preparo' || input.targetStatus === 'entregue')
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
  await syncAttendancePaymentStatus(tx, input.tenantId, current.atendimentoId, input.targetStatus)
  return { changed: true, status: input.targetStatus }
}

async function syncAttendancePaymentStatus(
  tx: PostgresStockTransaction,
  tenantId: string,
  atendimentoId: string | undefined,
  orderStatus: StatusPedido,
): Promise<void> {
  if (!atendimentoId || (orderStatus !== 'entregue' && orderStatus !== 'cancelado')) return

  const orders = await tx
    .select({ status: pgSchema.pedido.status })
    .from(pgSchema.pedido)
    .where(and(
      eq(pgSchema.pedido.tenantId, tenantId),
      eq(pgSchema.pedido.atendimentoId, atendimentoId),
    ))
  if (orders.some((order) => order.status !== 'entregue' && order.status !== 'cancelado')) return

  const attendanceStatus = orders.every((order) => order.status === 'cancelado')
    ? 'cancelled'
    : 'awaiting_payment'

  await tx
    .update(pgSchema.atendimento)
    .set({
      status: attendanceStatus,
      aguardandoPagamentoEm: attendanceStatus === 'awaiting_payment' ? new Date() : null,
      atualizadoEm: new Date(),
    })
    .where(and(
      eq(pgSchema.atendimento.id, atendimentoId),
      eq(pgSchema.atendimento.tenantId, tenantId),
    ))
}

export async function cancelOrderInPostgresTransaction(
  tx: PostgresStockTransaction,
  input: CancelOrderInput,
): Promise<OrderTransitionResult> {
  const [current] = await tx
    .select({ status: pgSchema.pedido.status, atendimentoId: pgSchema.pedido.atendimentoId })
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
  await syncAttendancePaymentStatus(tx, input.tenantId, current.atendimentoId, 'cancelado')
  return { changed: true, status: 'cancelado' }
}
