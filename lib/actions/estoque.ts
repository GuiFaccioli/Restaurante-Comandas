'use server'

import { and, eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/db/index'
import { fichaTecnicaItem, insumo, itemPedido, movimentoEstoque, produto } from '@/lib/db/schema'
import { requireAccess } from '@/lib/auth/access'
import { dbBoolean, isSQLiteDatabase } from '@/lib/db/compat'
import { fatorCompraParaBase, normalizarQuantidadeBase, parsePositiveDecimal, type UnidadeBase, type UnidadeCompra } from '@/lib/stock/units'
import { produtoTemEstoque } from '@/lib/stock/availability'

export type CriarInsumoInput = {
  nome: string
  unidadeBase: string
  unidadeCompra: string
  estoqueAtual?: string
  estoqueIdeal?: string
  estoqueMinimo?: string
  custoCompra?: string
}

export type EditarInsumoInput = Omit<CriarInsumoInput, 'estoqueAtual'>

export type FichaTecnicaInput = {
  insumoId: string
  quantidade: string
}

export async function validarEstoqueParaPedido(
  tenantId: string,
  items: Array<{ produtoId: string; quantidade: number }>
): Promise<void> {
  const productIds = items.map((item) => item.produtoId)
  const products = await db
    .select({ id: produto.id, nome: produto.nome, controleEstoque: produto.controleEstoque })
    .from(produto)
    .where(and(eq(produto.tenantId, tenantId), inArray(produto.id, productIds)))
  const controlledIds = products.filter((item) => Boolean(item.controleEstoque)).map((item) => item.id)
  if (controlledIds.length === 0) return

  const recipes = await db
    .select({ produtoId: fichaTecnicaItem.produtoId, insumoId: fichaTecnicaItem.insumoId, quantidade: fichaTecnicaItem.quantidade })
    .from(fichaTecnicaItem)
    .where(and(eq(fichaTecnicaItem.tenantId, tenantId), inArray(fichaTecnicaItem.produtoId, controlledIds)))
  const ingredientIds = [...new Set(recipes.map((item) => item.insumoId))]
  const balances = ingredientIds.length === 0
    ? []
    : await db.select({ id: insumo.id, estoqueAtual: insumo.estoqueAtual }).from(insumo).where(and(eq(insumo.tenantId, tenantId), inArray(insumo.id, ingredientIds)))

  for (const item of items) {
    const product = products.find((candidate) => candidate.id === item.produtoId)
    if (!product?.controleEstoque) continue
    const productRecipes = recipes.filter((recipe) => recipe.produtoId === item.produtoId)
    if (productRecipes.length === 0 || !produtoTemEstoque(item.produtoId, productRecipes.map((recipe) => ({ ...recipe, quantidade: (Number(recipe.quantidade) * item.quantidade).toFixed(3) })), balances)) {
      throw new Error(`Falta estoque para ${product.nome}`)
    }
  }
}

export async function deduzirEstoqueNaEntrega(tenantId: string, pedidoId: string): Promise<void> {
  const orderItems = await db
    .select({ produtoId: itemPedido.produtoId, quantidade: itemPedido.quantidade })
    .from(itemPedido)
    .where(eq(itemPedido.pedidoId, pedidoId))
  if (orderItems.length === 0) return

  const productIds = [...new Set(orderItems.map((item) => item.produtoId))]
  const recipes = await db
    .select({ produtoId: fichaTecnicaItem.produtoId, insumoId: fichaTecnicaItem.insumoId, quantidade: fichaTecnicaItem.quantidade })
    .from(fichaTecnicaItem)
    .where(and(eq(fichaTecnicaItem.tenantId, tenantId), inArray(fichaTecnicaItem.produtoId, productIds)))
  if (recipes.length === 0) return

  const consumption = new Map<string, number>()
  for (const orderItem of orderItems) {
    for (const recipe of recipes.filter((item) => item.produtoId === orderItem.produtoId)) {
      consumption.set(recipe.insumoId, (consumption.get(recipe.insumoId) ?? 0) + Number(recipe.quantidade) * orderItem.quantidade)
    }
  }
  const ingredientIds = [...consumption.keys()]
  const balances = await db
    .select({ id: insumo.id, estoqueAtual: insumo.estoqueAtual })
    .from(insumo)
    .where(and(eq(insumo.tenantId, tenantId), inArray(insumo.id, ingredientIds)))
  const names = await db
    .select({ id: insumo.id, nome: insumo.nome })
    .from(insumo)
    .where(and(eq(insumo.tenantId, tenantId), inArray(insumo.id, ingredientIds)))
  const balanceById = new Map(balances.map((item) => [item.id, Number(item.estoqueAtual)]))
  for (const [insumoId, quantity] of consumption) {
    if ((balanceById.get(insumoId) ?? 0) < quantity) {
      throw new Error(`Falta estoque para ${names.find((item) => item.id === insumoId)?.nome ?? 'um ingrediente'}`)
    }
  }

  const keys = ingredientIds.map((id) => `pedido:${pedidoId}:insumo:${id}`)
  const existing = await db
    .select({ chaveIdempotencia: movimentoEstoque.chaveIdempotencia })
    .from(movimentoEstoque)
    .where(and(eq(movimentoEstoque.tenantId, tenantId), inArray(movimentoEstoque.chaveIdempotencia, keys)))
  const existingKeys = new Set(existing.map((item) => item.chaveIdempotencia))
  const pending = ingredientIds.filter((id) => !existingKeys.has(`pedido:${pedidoId}:insumo:${id}`))
  if (pending.length === 0) return

  const applyStock = (tx: any) => {
    for (const insumoId of pending) {
      const quantity = consumption.get(insumoId) ?? 0
      const current = balanceById.get(insumoId) ?? 0
      tx.update(insumo).set({ estoqueAtual: (current - quantity).toFixed(3) }).where(eq(insumo.id, insumoId)).run()
      tx.insert(movimentoEstoque).values({
        id: crypto.randomUUID(),
        tenantId,
        insumoId,
        tipo: 'saida',
        quantidade: quantity.toFixed(3),
        pedidoId,
        chaveIdempotencia: `pedido:${pedidoId}:insumo:${insumoId}`,
        observacao: 'Baixa automática na confirmação da entrega',
        criadoEm: new Date(),
      }).run()
    }
  }

  if (isSQLiteDatabase) {
    ;(db as any).transaction((tx: any) => applyStock(tx))
  } else {
    await db.transaction(async (tx) => {
      for (const insumoId of pending) {
        const quantity = consumption.get(insumoId) ?? 0
        const current = balanceById.get(insumoId) ?? 0
        await tx.update(insumo).set({ estoqueAtual: (current - quantity).toFixed(3) }).where(eq(insumo.id, insumoId))
        await tx.insert(movimentoEstoque).values({
          id: crypto.randomUUID(), tenantId, insumoId, tipo: 'saida', quantidade: quantity.toFixed(3), pedidoId,
          chaveIdempotencia: `pedido:${pedidoId}:insumo:${insumoId}`, observacao: 'Baixa automática na confirmação da entrega', criadoEm: new Date(),
        })
      }
    })
  }
}

export async function criarInsumo(input: CriarInsumoInput): Promise<{ id: string }> {
  const { tenantId } = await requireAccess('admin')
  const nome = input.nome.trim()
  if (!nome) throw new Error('Informe o nome do insumo')

  normalizarQuantidadeBase('0', input.unidadeCompra, input.unidadeBase)
  const unidadeBase = input.unidadeBase as UnidadeBase
  const unidadeCompra = input.unidadeCompra as UnidadeCompra
  const estoqueAtual = normalizarQuantidadeBase(input.estoqueAtual ?? '0', unidadeCompra, unidadeBase)
  const estoqueIdeal = normalizarQuantidadeBase(input.estoqueIdeal ?? '0', unidadeCompra, unidadeBase)
  const estoqueMinimo = normalizarQuantidadeBase(input.estoqueMinimo ?? '0', unidadeCompra, unidadeBase)

  if (Number(estoqueMinimo) > Number(estoqueIdeal)) {
    throw new Error('O estoque mínimo não pode ser maior que o estoque ideal')
  }

  const custoCompra = input.custoCompra === undefined
    ? null
    : Number(parsePositiveDecimal(input.custoCompra, 'Custo').toFixed(4))
  const fator = Number(fatorCompraParaBase(unidadeCompra, unidadeBase))
  const custoUnitario = custoCompra === null ? null : (custoCompra / fator).toFixed(4)

  const [created] = await db
    .insert(insumo)
    .values({
      id: crypto.randomUUID(),
      tenantId,
      nome,
      unidadeBase,
      unidadeCompra,
      fatorCompraParaBase: fator.toFixed(3),
      estoqueAtual,
      estoqueIdeal,
      estoqueMinimo,
      custoUnitario,
      ativo: dbBoolean(true) as boolean,
    })
    .returning({ id: insumo.id })

  return { id: created.id }
}

export async function listarInsumos() {
  const { tenantId } = await requireAccess('admin')
  return db
    .select()
    .from(insumo)
    .where(eq(insumo.tenantId, tenantId))
}

export async function registrarEntradaEstoque(id: string, quantidadeCompra: string, chaveIdempotencia?: string): Promise<void> {
  const { tenantId } = await requireAccess('admin')
  const [item] = await db.select().from(insumo).where(and(eq(insumo.id, id), eq(insumo.tenantId, tenantId)))
  if (!item) throw new Error('Insumo não encontrado')
  const quantidade = normalizarQuantidadeBase(quantidadeCompra, item.unidadeCompra, item.unidadeBase)
  const key = chaveIdempotencia?.trim() || `entrada:${crypto.randomUUID()}`
  const [existing] = await db.select({ id: movimentoEstoque.id }).from(movimentoEstoque).where(and(eq(movimentoEstoque.tenantId, tenantId), eq(movimentoEstoque.chaveIdempotencia, key)))
  if (existing) return
  await db.update(insumo).set({ estoqueAtual: (Number(item.estoqueAtual) + Number(quantidade)).toFixed(3) }).where(and(eq(insumo.id, id), eq(insumo.tenantId, tenantId)))
  await db.insert(movimentoEstoque).values({ id: crypto.randomUUID(), tenantId, insumoId: id, tipo: 'entrada', quantidade, pedidoId: null, chaveIdempotencia: key, observacao: 'Entrada manual de estoque', criadoEm: new Date() })
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
  if (Number(estoqueMinimo) > Number(estoqueIdeal)) {
    throw new Error('O estoque mínimo não pode ser maior que o estoque ideal')
  }

  await db
    .update(insumo)
    .set({
      nome,
      unidadeBase,
      unidadeCompra,
      fatorCompraParaBase: fatorCompraParaBase(unidadeCompra, unidadeBase),
      estoqueIdeal,
      estoqueMinimo,
    })
    .where(and(eq(insumo.id, id), eq(insumo.tenantId, tenantId)))
}

export async function salvarFichaTecnica(produtoId: string, itens: FichaTecnicaInput[]): Promise<void> {
  const { tenantId } = await requireAccess('admin')
  if (itens.some((item) => !item.insumoId || parsePositiveDecimal(item.quantidade, 'Quantidade') <= 0)) {
    throw new Error('A ficha técnica contém uma quantidade inválida')
  }
  const ids = itens.map((item) => item.insumoId)
  if (new Set(ids).size !== ids.length) throw new Error('Não repita o mesmo insumo na ficha técnica')

  const [product] = await db
    .select({ id: produto.id })
    .from(produto)
    .where(and(eq(produto.id, produtoId), eq(produto.tenantId, tenantId)))
  if (!product) throw new Error('Produto não encontrado')

  if (ids.length > 0) {
    const ingredients = await db
      .select({ id: insumo.id })
      .from(insumo)
      .where(and(eq(insumo.tenantId, tenantId), inArray(insumo.id, ids)))
    if (ingredients.length !== ids.length) throw new Error('Insumo inválido')
  }

  if (isSQLiteDatabase) {
    ;(db as any).transaction((tx: any) => {
      tx.delete(fichaTecnicaItem)
        .where(and(eq(fichaTecnicaItem.produtoId, produtoId), eq(fichaTecnicaItem.tenantId, tenantId)))
        .run()
      if (itens.length > 0) {
        tx.insert(fichaTecnicaItem).values(itens.map((item) => ({
          id: crypto.randomUUID(),
          tenantId,
          produtoId,
          insumoId: item.insumoId,
          quantidade: Number(item.quantidade.replace(',', '.')).toFixed(3),
        }))).run()
      }
    })
  } else {
    await db.transaction(async (tx) => {
      await tx.delete(fichaTecnicaItem)
        .where(and(eq(fichaTecnicaItem.produtoId, produtoId), eq(fichaTecnicaItem.tenantId, tenantId)))
      if (itens.length > 0) {
        await tx.insert(fichaTecnicaItem).values(itens.map((item) => ({
          id: crypto.randomUUID(),
          tenantId,
          produtoId,
          insumoId: item.insumoId,
          quantidade: Number(item.quantidade.replace(',', '.')).toFixed(3),
        })))
      }
    })
  }

  await db
    .update(produto)
    .set({ controleEstoque: dbBoolean(itens.length > 0) as boolean })
    .where(and(eq(produto.id, produtoId), eq(produto.tenantId, tenantId)))
}
