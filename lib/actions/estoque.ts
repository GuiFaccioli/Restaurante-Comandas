'use server'

import { and, eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/db/index'
import { fichaTecnicaItem, insumo, itemPedido, movimentoEstoque, produto } from '@/lib/db/schema'
import { requireAccess } from '@/lib/auth/access'
import { dbBoolean, isSQLiteDatabase } from '@/lib/db/compat'
import { fatorCompraParaBase, normalizarQuantidadeBase, parsePositiveDecimal, type UnidadeBase, type UnidadeCompra } from '@/lib/stock/units'
import { produtoTemEstoque } from '@/lib/stock/availability'
import { applyStockMovement } from '@/lib/stock/service'

export type CriarInsumoInput = {
  nome: string
  unidadeBase: string
  unidadeCompra: string
  estoqueIdeal?: string
  estoqueMinimo?: string
}

export type EditarInsumoInput = CriarInsumoInput
export type FichaTecnicaInput = { insumoId: string; quantidade: string }

export async function validarEstoqueParaPedido(tenantId: string, items: Array<{ produtoId: string; quantidade: number }>): Promise<void> {
  const productIds = items.map((item) => item.produtoId)
  const products = await db.select({ id: produto.id, nome: produto.nome, controleEstoque: produto.controleEstoque }).from(produto).where(and(eq(produto.tenantId, tenantId), inArray(produto.id, productIds)))
  const controlledIds = products.filter((item) => Boolean(item.controleEstoque)).map((item) => item.id)
  if (controlledIds.length === 0) return
  const recipes = await db.select({ produtoId: fichaTecnicaItem.produtoId, insumoId: fichaTecnicaItem.insumoId, quantidade: fichaTecnicaItem.quantidade }).from(fichaTecnicaItem).where(and(eq(fichaTecnicaItem.tenantId, tenantId), inArray(fichaTecnicaItem.produtoId, controlledIds)))
  const ingredientIds = [...new Set(recipes.map((item) => item.insumoId))]
  const balances = ingredientIds.length === 0 ? [] : await db.select({ id: insumo.id, estoqueAtual: insumo.estoqueAtual }).from(insumo).where(and(eq(insumo.tenantId, tenantId), inArray(insumo.id, ingredientIds)))
  for (const item of items) {
    const product = products.find((candidate) => candidate.id === item.produtoId)
    if (!product?.controleEstoque) continue
    const productRecipes = recipes.filter((recipe) => recipe.produtoId === item.produtoId)
    if (productRecipes.length === 0 || !produtoTemEstoque(item.produtoId, productRecipes.map((recipe) => ({ ...recipe, quantidade: (Number(recipe.quantidade) * item.quantidade).toFixed(3) })), balances)) {
      throw new Error(`Falta estoque para ${product.nome}`)
    }
  }
}

export async function deduzirEstoqueNoPreparo(tenantId: string, pedidoId: string, usuarioId?: string): Promise<void> {
  const orderItems = await db.select({ id: itemPedido.id, produtoId: itemPedido.produtoId, quantidade: itemPedido.quantidade }).from(itemPedido).where(eq(itemPedido.pedidoId, pedidoId))
  if (orderItems.length === 0) return
  const productIds = [...new Set(orderItems.map((item) => item.produtoId))]
  const recipes = await db.select({ produtoId: fichaTecnicaItem.produtoId, insumoId: fichaTecnicaItem.insumoId, quantidade: fichaTecnicaItem.quantidade }).from(fichaTecnicaItem).where(and(eq(fichaTecnicaItem.tenantId, tenantId), inArray(fichaTecnicaItem.produtoId, productIds)))
  const movements = orderItems.flatMap((orderItem) => recipes.filter((recipe) => recipe.produtoId === orderItem.produtoId).map((recipe) => ({ itemId: orderItem.id, insumoId: recipe.insumoId, quantidade: Number(recipe.quantidade) * orderItem.quantidade })))
  if (movements.length === 0) return
  const keys = movements.map((movement) => `consumo:${pedidoId}:item:${movement.itemId}:insumo:${movement.insumoId}`)
  const existing = await db.select({ chaveIdempotencia: movimentoEstoque.chaveIdempotencia }).from(movimentoEstoque).where(and(eq(movimentoEstoque.tenantId, tenantId), inArray(movimentoEstoque.chaveIdempotencia, keys)))
  const existingKeys = new Set(existing.map((movement) => movement.chaveIdempotencia))
  const pendingMovements = movements.filter((movement) => !existingKeys.has(`consumo:${pedidoId}:item:${movement.itemId}:insumo:${movement.insumoId}`))
  if (pendingMovements.length === 0) return
  const ingredientIds = [...new Set(pendingMovements.map((movement) => movement.insumoId))]
  const balances = await db.select({ id: insumo.id, estoqueAtual: insumo.estoqueAtual }).from(insumo).where(and(eq(insumo.tenantId, tenantId), inArray(insumo.id, ingredientIds)))
  const names = await db.select({ id: insumo.id, nome: insumo.nome }).from(insumo).where(and(eq(insumo.tenantId, tenantId), inArray(insumo.id, ingredientIds)))
  for (const insumoId of ingredientIds) {
    const quantity = pendingMovements.filter((movement) => movement.insumoId === insumoId).reduce((sum, movement) => sum + movement.quantidade, 0)
    if ((Number(balances.find((item) => item.id === insumoId)?.estoqueAtual) || 0) < quantity) {
      throw new Error(`Falta estoque para ${names.find((item) => item.id === insumoId)?.nome ?? 'um ingrediente'}`)
    }
  }
  for (const movement of pendingMovements) {
    await applyStockMovement({
      tenantId,
      usuarioId,
      insumoId: movement.insumoId,
      tipo: 'saida',
      quantidade: -movement.quantidade,
      pedidoId,
      itemPedidoId: movement.itemId,
      chaveIdempotencia: `consumo:${pedidoId}:item:${movement.itemId}:insumo:${movement.insumoId}`,
      observacao: 'Consumo enviado para preparo',
    })
  }
}

export const deduzirEstoqueNaEntrega = deduzirEstoqueNoPreparo

export async function criarInsumo(input: CriarInsumoInput): Promise<{ id: string }> {
  const { tenantId } = await requireAccess('admin')
  const nome = input.nome.trim()
  if (!nome) throw new Error('Informe o nome do insumo')
  normalizarQuantidadeBase('0', input.unidadeCompra, input.unidadeBase)
  const unidadeBase = input.unidadeBase as UnidadeBase
  const unidadeCompra = input.unidadeCompra as UnidadeCompra
  const estoqueIdeal = normalizarQuantidadeBase(input.estoqueIdeal ?? '0', unidadeCompra, unidadeBase)
  const estoqueMinimo = normalizarQuantidadeBase(input.estoqueMinimo ?? '0', unidadeCompra, unidadeBase)
  if (Number(estoqueMinimo) > Number(estoqueIdeal)) throw new Error('O estoque mínimo não pode ser maior que o estoque ideal')
  const fator = Number(fatorCompraParaBase(unidadeCompra, unidadeBase))
  const [created] = await db.insert(insumo).values({ id: crypto.randomUUID(), tenantId, nome, unidadeBase, unidadeCompra, fatorCompraParaBase: fator.toFixed(3), estoqueAtual: '0.000', estoqueIdeal, estoqueMinimo, custoUnitario: null, ativo: dbBoolean(true) as boolean }).returning({ id: insumo.id })
  return { id: created.id }
}

export async function listarInsumos() {
  const { tenantId } = await requireAccess('admin')
  return db.select().from(insumo).where(eq(insumo.tenantId, tenantId))
}

export async function registrarEntradaEstoque(id: string, quantidadeCompra: string, chaveIdempotencia?: string, custoTotalCompra?: string): Promise<void> {
  const { tenantId, usuarioId } = await requireAccess('admin')
  const [item] = await db.select().from(insumo).where(and(eq(insumo.id, id), eq(insumo.tenantId, tenantId)))
  if (!item) throw new Error('Insumo não encontrado')
  const quantidade = Number(normalizarQuantidadeBase(quantidadeCompra, item.unidadeCompra, item.unidadeBase))
  const custoTotal = custoTotalCompra?.trim() ? Number(parsePositiveDecimal(custoTotalCompra, 'Custo total')) : null
  await applyStockMovement({ tenantId, usuarioId, insumoId: id, tipo: 'entrada', quantidade, custoUnitario: custoTotal === null ? null : custoTotal / quantidade, chaveIdempotencia: chaveIdempotencia?.trim() || `entrada:${crypto.randomUUID()}`, observacao: 'Entrada manual de estoque' })
}

export async function ajustarEstoqueAtual(id: string, quantidadeBase: string): Promise<void> {
  const { tenantId, usuarioId } = await requireAccess('admin')
  const quantidade = Number(quantidadeBase.replace(',', '.'))
  if (!Number.isFinite(quantidade) || quantidade < 0) throw new Error('Informe uma quantidade válida')
  const [item] = await db.select().from(insumo).where(and(eq(insumo.id, id), eq(insumo.tenantId, tenantId)))
  if (!item) throw new Error('Insumo não encontrado')
  await applyStockMovement({ tenantId, usuarioId, insumoId: id, tipo: 'contagem', quantidade: quantidade - Number(item.estoqueAtual), chaveIdempotencia: `contagem:${crypto.randomUUID()}`, motivo: 'Contagem física', observacao: 'Contagem manual do estoque' })
}

export async function registrarPerdaEstoque(id: string, quantidadeCompra: string, motivo: string, observacao?: string): Promise<void> {
  const { tenantId, usuarioId } = await requireAccess('admin')
  const [item] = await db.select().from(insumo).where(and(eq(insumo.id, id), eq(insumo.tenantId, tenantId)))
  if (!item) throw new Error('Insumo não encontrado')
  if (!motivo.trim()) throw new Error('Informe o motivo da perda')
  const quantidade = Number(normalizarQuantidadeBase(quantidadeCompra, item.unidadeCompra, item.unidadeBase))
  await applyStockMovement({ tenantId, usuarioId, insumoId: id, tipo: 'perda', quantidade: -quantidade, chaveIdempotencia: `perda:${crypto.randomUUID()}`, motivo, observacao: observacao ?? null })
}

export async function realizarContagemEstoque(id: string, quantidadeEncontradaCompra: string, observacao?: string): Promise<void> {
  const { tenantId, usuarioId } = await requireAccess('admin')
  const [item] = await db.select().from(insumo).where(and(eq(insumo.id, id), eq(insumo.tenantId, tenantId)))
  if (!item) throw new Error('Insumo não encontrado')
  const encontrada = Number(normalizarQuantidadeBase(quantidadeEncontradaCompra, item.unidadeCompra, item.unidadeBase))
  await applyStockMovement({ tenantId, usuarioId, insumoId: id, tipo: 'contagem', quantidade: encontrada - Number(item.estoqueAtual), chaveIdempotencia: `contagem:${crypto.randomUUID()}`, motivo: 'Contagem física', observacao: observacao ?? null })
}

export async function editarInsumo(id: string, input: EditarInsumoInput): Promise<void> {
  const { tenantId } = await requireAccess('admin')
  const nome = input.nome.trim()
  if (!nome) throw new Error('Informe o nome do insumo')
  normalizarQuantidadeBase('0', input.unidadeCompra, input.unidadeBase)
  const unidadeBase = input.unidadeBase as UnidadeBase
  const unidadeCompra = input.unidadeCompra as UnidadeCompra
  const estoqueIdeal = normalizarQuantidadeBase(input.estoqueIdeal ?? '0', unidadeCompra, unidadeBase)
  const estoqueMinimo = normalizarQuantidadeBase(input.estoqueMinimo ?? '0', unidadeCompra, unidadeBase)
  if (Number(estoqueMinimo) > Number(estoqueIdeal)) throw new Error('O estoque mínimo não pode ser maior que o estoque ideal')
  await db.update(insumo).set({ nome, unidadeBase, unidadeCompra, fatorCompraParaBase: fatorCompraParaBase(unidadeCompra, unidadeBase), estoqueIdeal, estoqueMinimo }).where(and(eq(insumo.id, id), eq(insumo.tenantId, tenantId)))
}

export async function salvarFichaTecnica(produtoId: string, itens: FichaTecnicaInput[]): Promise<void> {
  const { tenantId } = await requireAccess('admin')
  if (itens.some((item) => !item.insumoId || parsePositiveDecimal(item.quantidade, 'Quantidade') <= 0)) throw new Error('A ficha técnica contém uma quantidade inválida')
  const ids = itens.map((item) => item.insumoId)
  if (new Set(ids).size !== ids.length) throw new Error('Não repita o mesmo insumo na ficha técnica')
  const [product] = await db.select({ id: produto.id }).from(produto).where(and(eq(produto.id, produtoId), eq(produto.tenantId, tenantId)))
  if (!product) throw new Error('Produto não encontrado')
  if (ids.length > 0) {
    const ingredients = await db.select({ id: insumo.id }).from(insumo).where(and(eq(insumo.tenantId, tenantId), inArray(insumo.id, ids)))
    if (ingredients.length !== ids.length) throw new Error('Insumo inválido')
  }
  if (isSQLiteDatabase) {
    ;(db as any).transaction((tx: any) => {
      tx.delete(fichaTecnicaItem).where(and(eq(fichaTecnicaItem.produtoId, produtoId), eq(fichaTecnicaItem.tenantId, tenantId))).run()
      if (itens.length > 0) tx.insert(fichaTecnicaItem).values(itens.map((item) => ({ id: crypto.randomUUID(), tenantId, produtoId, insumoId: item.insumoId, quantidade: Number(item.quantidade.replace(',', '.')).toFixed(3) }))).run()
    })
  } else {
    await db.transaction(async (tx) => {
      await tx.delete(fichaTecnicaItem).where(and(eq(fichaTecnicaItem.produtoId, produtoId), eq(fichaTecnicaItem.tenantId, tenantId)))
      if (itens.length > 0) await tx.insert(fichaTecnicaItem).values(itens.map((item) => ({ id: crypto.randomUUID(), tenantId, produtoId, insumoId: item.insumoId, quantidade: Number(item.quantidade.replace(',', '.')).toFixed(3) })))
    })
  }
  await db.update(produto).set({ controleEstoque: dbBoolean(itens.length > 0) as boolean }).where(and(eq(produto.id, produtoId), eq(produto.tenantId, tenantId)))
}
