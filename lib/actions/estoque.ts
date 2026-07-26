'use server'

import { and, eq } from 'drizzle-orm'
import { db, runInDbTransaction } from '@/lib/db/index'
import { fichaTecnicaItem, insumo, movimentoEstoque, produto } from '@/lib/db/schema'
import {
  fichaTecnicaItem as sqliteFichaTecnicaItem,
  insumo as sqliteInsumo,
  movimentoEstoque as sqliteMovimentoEstoque,
  produto as sqliteProduto,
} from '@/lib/db/schema-sqlite'
import { requireAccess } from '@/lib/auth/access'
import { dbBoolean } from '@/lib/db/compat'
import { fatorCompraParaBase, normalizarQuantidadeBase, parsePositiveDecimal, type UnidadeBase, type UnidadeCompra } from '@/lib/stock/units'
import { applyStockMovement } from '@/lib/stock/service'
import { normalizeCurrencyToDecimal } from '@/lib/money'

export type CriarInsumoInput = {
  nome: string
  unidade?: string
  custoPorUnidade?: string
  unidadeBase?: string
  unidadeCompra?: string
  estoqueIdeal?: string
  estoqueMinimo?: string
}

export type EditarInsumoInput = {
  nome: string
  unidade?: string
  custoPorUnidade?: string
  unidadeBase?: string
  unidadeCompra?: string
  estoqueIdeal?: string
  estoqueMinimo?: string
}
export type FichaTecnicaInput = { insumoId: string; quantidade: string }

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function validarChaveIdempotente(chaveIdempotencia: unknown): string {
  if (typeof chaveIdempotencia !== 'string') throw new Error('Chave idempotente inválida')
  const chave = chaveIdempotencia.trim()
  if (!UUID_PATTERN.test(chave)) throw new Error('Chave idempotente inválida')
  return chave
}

export async function criarInsumo(input: CriarInsumoInput): Promise<{ id: string }> {
  const { tenantId } = await requireAccess('admin')
  const nome = input.nome.trim()
  if (!nome) throw new Error('Informe o nome do insumo')

  const unidadeCompra = input.unidade ?? input.unidadeCompra
  const unidadeBase = input.unidade
    ? input.unidade === 'kg' ? 'g' : input.unidade === 'l' ? 'ml' : input.unidade
    : input.unidadeBase
  normalizarQuantidadeBase('0', unidadeCompra ?? '', unidadeBase ?? '')
  const baseUnit = unidadeBase as UnidadeBase
  const purchaseUnit = unidadeCompra as UnidadeCompra
  const estoqueIdeal = normalizarQuantidadeBase(input.estoqueIdeal ?? '0', purchaseUnit, baseUnit)
  const estoqueMinimo = normalizarQuantidadeBase(input.estoqueMinimo ?? '0', purchaseUnit, baseUnit)
  if (Number(estoqueMinimo) > Number(estoqueIdeal)) throw new Error('O estoque mínimo não pode ser maior que o estoque ideal')

  const fator = Number(fatorCompraParaBase(purchaseUnit, baseUnit))
  const custoInformado = input.custoPorUnidade?.trim() ? Number(normalizeCurrencyToDecimal(input.custoPorUnidade)) : null
  if (custoInformado !== null && (!Number.isFinite(custoInformado) || custoInformado < 0)) throw new Error('Informe um custo por unidade válido')
  const custoUnitario = custoInformado === null ? null : (custoInformado / fator).toFixed(4)
  const [created] = await db.insert(insumo).values({ id: crypto.randomUUID(), tenantId, nome, unidadeBase: baseUnit, unidadeCompra: purchaseUnit, fatorCompraParaBase: fator.toFixed(3), estoqueAtual: '0.000', estoqueIdeal, estoqueMinimo, custoUnitario, ativo: dbBoolean(true) as boolean }).returning({ id: insumo.id })
  return { id: created.id }
}
export async function registrarEntradaEstoque(id: string, quantidadeCompra: string, chaveIdempotencia: string, custoTotalCompra?: string): Promise<void> {
  const { tenantId, usuarioId } = await requireAccess('admin')
  const chave = validarChaveIdempotente(chaveIdempotencia)
  const [item] = await db.select().from(insumo).where(and(eq(insumo.id, id), eq(insumo.tenantId, tenantId), eq(insumo.ativo, dbBoolean(true) as boolean)))
  if (!item) throw new Error('Insumo não encontrado')
  const quantidade = Number(normalizarQuantidadeBase(quantidadeCompra, item.unidadeCompra, item.unidadeBase))
  const custoTotal = custoTotalCompra?.trim() ? Number(parsePositiveDecimal(custoTotalCompra, 'Custo total')) : null
  await applyStockMovement({ tenantId, usuarioId, insumoId: id, tipo: 'entrada', quantidade, custoUnitario: custoTotal === null ? null : custoTotal / quantidade, chaveIdempotencia: chave, observacao: 'Entrada manual de estoque' })
}

export async function ajustarEstoqueAtual(id: string, quantidadeBase: string, chaveIdempotencia: string): Promise<void> {
  const { tenantId, usuarioId } = await requireAccess('admin')
  const chave = validarChaveIdempotente(chaveIdempotencia)
  const quantidade = Number(quantidadeBase.replace(',', '.'))
  if (!Number.isFinite(quantidade) || quantidade < 0) throw new Error('Informe uma quantidade válida')
  const [item] = await db.select({ id: insumo.id }).from(insumo).where(and(eq(insumo.id, id), eq(insumo.tenantId, tenantId), eq(insumo.ativo, dbBoolean(true) as boolean)))
  if (!item) throw new Error('Insumo não encontrado')
  await applyStockMovement({ tenantId, usuarioId, insumoId: id, tipo: 'contagem', quantidade, chaveIdempotencia: chave, motivo: 'Contagem física', observacao: 'Contagem manual do estoque' })
}

export async function registrarPerdaEstoque(id: string, quantidadeCompra: string, motivo: string, chaveIdempotencia: string, observacao?: string): Promise<void> {
  const { tenantId, usuarioId } = await requireAccess('admin')
  const chave = validarChaveIdempotente(chaveIdempotencia)
  const [item] = await db.select().from(insumo).where(and(eq(insumo.id, id), eq(insumo.tenantId, tenantId), eq(insumo.ativo, dbBoolean(true) as boolean)))
  if (!item) throw new Error('Insumo não encontrado')
  if (!motivo.trim()) throw new Error('Informe o motivo da perda')
  const quantidade = Number(normalizarQuantidadeBase(quantidadeCompra, item.unidadeCompra, item.unidadeBase))
  await applyStockMovement({ tenantId, usuarioId, insumoId: id, tipo: 'perda', quantidade: -quantidade, chaveIdempotencia: chave, motivo, observacao: observacao ?? null })
}

export async function realizarContagemEstoque(id: string, quantidadeEncontradaCompra: string, chaveIdempotencia: string, observacao?: string): Promise<void> {
  const { tenantId, usuarioId } = await requireAccess('admin')
  const chave = validarChaveIdempotente(chaveIdempotencia)
  const [item] = await db.select({
    id: insumo.id,
    unidadeCompra: insumo.unidadeCompra,
    unidadeBase: insumo.unidadeBase,
  }).from(insumo).where(and(eq(insumo.id, id), eq(insumo.tenantId, tenantId), eq(insumo.ativo, dbBoolean(true) as boolean)))
  if (!item) throw new Error('Insumo não encontrado')
  const encontrada = Number(normalizarQuantidadeBase(quantidadeEncontradaCompra, item.unidadeCompra, item.unidadeBase))
  await applyStockMovement({ tenantId, usuarioId, insumoId: id, tipo: 'contagem', quantidade: encontrada, chaveIdempotencia: chave, motivo: 'Contagem física', observacao: observacao ?? null })
}

export async function editarInsumo(id: string, input: EditarInsumoInput): Promise<void> {
  const { tenantId } = await requireAccess('admin')
  const nome = input.nome.trim()
  if (!nome) throw new Error('Informe o nome do insumo')
  const unidadeCompra = input.unidade ?? input.unidadeCompra
  const unidadeBase = input.unidade
    ? input.unidade === 'kg' ? 'g' : input.unidade === 'l' ? 'ml' : input.unidade
    : input.unidadeBase
  normalizarQuantidadeBase('0', unidadeCompra ?? '', unidadeBase ?? '')
  const baseUnit = unidadeBase as UnidadeBase
  const purchaseUnit = unidadeCompra as UnidadeCompra
  const estoqueIdeal = normalizarQuantidadeBase(input.estoqueIdeal ?? '0', purchaseUnit, baseUnit)
  const estoqueMinimo = normalizarQuantidadeBase(input.estoqueMinimo ?? '0', purchaseUnit, baseUnit)
  if (Number(estoqueMinimo) > Number(estoqueIdeal)) throw new Error('O estoque mínimo não pode ser maior que o estoque ideal')
  const fator = Number(fatorCompraParaBase(purchaseUnit, baseUnit))
  const custoInformado = input.custoPorUnidade?.trim() ? Number(normalizeCurrencyToDecimal(input.custoPorUnidade)) : null
  if (custoInformado !== null && (!Number.isFinite(custoInformado) || custoInformado < 0)) throw new Error('Informe um custo por unidade válido')
  await db.update(insumo).set({ nome, unidadeBase: baseUnit, unidadeCompra: purchaseUnit, fatorCompraParaBase: fator.toFixed(3), estoqueIdeal, estoqueMinimo, ...(custoInformado === null ? {} : { custoUnitario: (custoInformado / fator).toFixed(4) }) }).where(and(eq(insumo.id, id), eq(insumo.tenantId, tenantId), eq(insumo.ativo, dbBoolean(true) as boolean)))
}

export async function removerInsumo(id: string, nomeConfirmacao: string): Promise<void> {
  const { tenantId } = await requireAccess('admin')

  const validate = (item: { nome: string } | undefined) => {
    if (!item) throw new Error('Insumo não encontrado')
    if (item.nome !== nomeConfirmacao.trim()) throw new Error('Digite o nome exato do insumo para confirmar')
  }

  await runInDbTransaction({
    sqliteOperation: (tx) => {
      const activeIngredient = and(
        eq(sqliteInsumo.id, id),
        eq(sqliteInsumo.tenantId, tenantId),
        eq(sqliteInsumo.ativo, true),
      )
      const item = tx
        .select({ nome: sqliteInsumo.nome })
        .from(sqliteInsumo)
        .where(activeIngredient)
        .get()
      validate(item)

      const recipeUsage = tx
        .select({ id: sqliteFichaTecnicaItem.id })
        .from(sqliteFichaTecnicaItem)
        .where(and(
          eq(sqliteFichaTecnicaItem.insumoId, id),
          eq(sqliteFichaTecnicaItem.tenantId, tenantId),
        ))
        .get()
      if (recipeUsage) {
        throw new Error('Remova este insumo das fichas técnicas antes de excluí-lo')
      }

      const movementUsage = tx
        .select({ id: sqliteMovimentoEstoque.id })
        .from(sqliteMovimentoEstoque)
        .where(and(
          eq(sqliteMovimentoEstoque.insumoId, id),
          eq(sqliteMovimentoEstoque.tenantId, tenantId),
        ))
        .get()
      if (movementUsage) {
        tx
          .update(sqliteInsumo)
          .set({ ativo: false })
          .where(activeIngredient)
          .run()
        return
      }

      tx.delete(sqliteInsumo).where(activeIngredient).run()
    },
    postgresOperation: async (tx) => {
      const activeIngredient = and(
        eq(insumo.id, id),
        eq(insumo.tenantId, tenantId),
        eq(insumo.ativo, true),
      )
      const [item] = await tx
        .select({ nome: insumo.nome })
        .from(insumo)
        .where(activeIngredient)
      validate(item)

      const [recipeUsage] = await tx
        .select({ id: fichaTecnicaItem.id })
        .from(fichaTecnicaItem)
        .where(and(
          eq(fichaTecnicaItem.insumoId, id),
          eq(fichaTecnicaItem.tenantId, tenantId),
        ))
        .limit(1)
      if (recipeUsage) {
        throw new Error('Remova este insumo das fichas técnicas antes de excluí-lo')
      }

      const [movementUsage] = await tx
        .select({ id: movimentoEstoque.id })
        .from(movimentoEstoque)
        .where(and(
          eq(movimentoEstoque.insumoId, id),
          eq(movimentoEstoque.tenantId, tenantId),
        ))
        .limit(1)
      if (movementUsage) {
        await tx
          .update(insumo)
          .set({ ativo: false })
          .where(activeIngredient)
        return
      }

      await tx.delete(insumo).where(activeIngredient)
    },
  })
}

export async function salvarFichaTecnica(produtoId: string, itens: FichaTecnicaInput[]): Promise<void> {
  const { tenantId } = await requireAccess('admin')
  if (itens.some((item) => !item.insumoId || parsePositiveDecimal(item.quantidade, 'Quantidade') <= 0)) throw new Error('A ficha técnica contém uma quantidade inválida')
  const ids = itens.map((item) => item.insumoId)
  if (new Set(ids).size !== ids.length) throw new Error('Não repita o mesmo insumo na ficha técnica')
  const sortedIds = [...ids].sort()
  const recipeValues = itens.map((item) => ({
    id: crypto.randomUUID(),
    tenantId,
    produtoId,
    insumoId: item.insumoId,
    quantidade: Number(item.quantidade.replace(',', '.')).toFixed(3),
  }))
  const controleEstoque = itens.length > 0

  await runInDbTransaction({
    sqliteOperation: (tx) => {
      const product = tx
        .select({ id: sqliteProduto.id })
        .from(sqliteProduto)
        .where(and(
          eq(sqliteProduto.id, produtoId),
          eq(sqliteProduto.tenantId, tenantId),
        ))
        .get()
      if (!product) throw new Error('Produto não encontrado')

      for (const ingredientId of sortedIds) {
        const ingredient = tx
          .select({ id: sqliteInsumo.id, ativo: sqliteInsumo.ativo })
          .from(sqliteInsumo)
          .where(and(
            eq(sqliteInsumo.id, ingredientId),
            eq(sqliteInsumo.tenantId, tenantId),
            eq(sqliteInsumo.ativo, true),
          ))
          .get()
        if (!ingredient || !ingredient.ativo) {
          throw new Error('Insumo inválido')
        }
      }

      tx
        .delete(sqliteFichaTecnicaItem)
        .where(and(
          eq(sqliteFichaTecnicaItem.produtoId, produtoId),
          eq(sqliteFichaTecnicaItem.tenantId, tenantId),
        ))
        .run()
      if (recipeValues.length > 0) {
        tx.insert(sqliteFichaTecnicaItem).values(recipeValues).run()
      }
      tx
        .update(sqliteProduto)
        .set({ controleEstoque })
        .where(and(
          eq(sqliteProduto.id, produtoId),
          eq(sqliteProduto.tenantId, tenantId),
        ))
        .run()
    },
    postgresOperation: async (tx) => {
      const [product] = await tx
        .select({ id: produto.id })
        .from(produto)
        .where(and(
          eq(produto.id, produtoId),
          eq(produto.tenantId, tenantId),
        ))
        .for('update')
      if (!product) throw new Error('Produto não encontrado')

      for (const ingredientId of sortedIds) {
        const [ingredient] = await tx
          .select({ id: insumo.id, ativo: insumo.ativo })
          .from(insumo)
          .where(and(
            eq(insumo.id, ingredientId),
            eq(insumo.tenantId, tenantId),
            eq(insumo.ativo, true),
          ))
          .for('update')
        if (!ingredient || !ingredient.ativo) {
          throw new Error('Insumo inválido')
        }
      }

      await tx
        .delete(fichaTecnicaItem)
        .where(and(
          eq(fichaTecnicaItem.produtoId, produtoId),
          eq(fichaTecnicaItem.tenantId, tenantId),
        ))
      if (recipeValues.length > 0) {
        await tx.insert(fichaTecnicaItem).values(recipeValues)
      }
      await tx
        .update(produto)
        .set({ controleEstoque })
        .where(and(
          eq(produto.id, produtoId),
          eq(produto.tenantId, tenantId),
        ))
    },
  })
}
