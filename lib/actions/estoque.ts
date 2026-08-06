'use server'

import { and, eq, sql } from 'drizzle-orm'

import { requireAccess } from '@/lib/auth/access'
import { db, runInDbTransaction } from '@/lib/db/index'
import {
  fichaTecnicaItem,
  itemEstoque,
  itemPedidoComposicao,
  movimentoEstoque,
  produto,
} from '@/lib/db/schema'
import { applyStockMovement } from '@/lib/stock/service'
import {
  fatorCompraParaBase,
  normalizarQuantidadeBase,
  parsePositiveDecimal,
  type UnidadeBase,
  type UnidadeCompra,
} from '@/lib/stock/units'

export type ItemEstoqueInput = {
  nome: string
  categoriaId?: string | null
  unidadeBase: string
  unidadeCompra: string
  estoqueIdeal?: string
  estoqueMinimo?: string
}

export type FichaTecnicaInput = {
  itemEstoqueId: string
  quantidade: string
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function validarChaveIdempotente(chaveIdempotencia: unknown): string {
  if (typeof chaveIdempotencia !== 'string') {
    throw new Error('Chave idempotente inválida')
  }
  const chave = chaveIdempotencia.trim()
  if (!UUID_PATTERN.test(chave)) {
    throw new Error('Chave idempotente inválida')
  }
  return chave
}

function parseOptionalPurchaseQuantity(
  value: string | undefined,
  unit: UnidadeCompra,
  baseUnit: UnidadeBase,
): string | null {
  if (!value?.trim()) return null
  return normalizarQuantidadeBase(value, unit, baseUnit)
}

function validateItemInput(input: ItemEstoqueInput) {
  const nome = input.nome.trim()
  if (!nome) throw new Error('Informe o nome do item de estoque')

  const unidadeBase = input.unidadeBase as UnidadeBase
  const unidadeCompra = input.unidadeCompra as UnidadeCompra
  normalizarQuantidadeBase('0', unidadeCompra, unidadeBase)

  const estoqueMinimo = parseOptionalPurchaseQuantity(
    input.estoqueMinimo,
    unidadeCompra,
    unidadeBase,
  )
  const estoqueIdeal = parseOptionalPurchaseQuantity(
    input.estoqueIdeal,
    unidadeCompra,
    unidadeBase,
  )
  if (
    estoqueMinimo !== null &&
    estoqueIdeal !== null &&
    Number(estoqueIdeal) < Number(estoqueMinimo)
  ) {
    throw new Error('O estoque ideal não pode ser menor que o estoque mínimo')
  }

  return {
    nome,
    categoriaId: input.categoriaId?.trim() || null,
    unidadeBase,
    unidadeCompra,
    fatorCompraParaBase: fatorCompraParaBase(unidadeCompra, unidadeBase),
    estoqueMinimo,
    estoqueIdeal,
  }
}

export async function criarItemEstoque(input: ItemEstoqueInput): Promise<{ id: string }> {
  const { tenantId } = await requireAccess('admin')
  const values = validateItemInput(input)
  const [created] = await db
    .insert(itemEstoque)
    .values({
      id: crypto.randomUUID(),
      tenantId,
      ...values,
      estoqueAtual: '0.000',
      custoUnitario: null,
      ativo: true,
    })
    .returning({ id: itemEstoque.id })
  return { id: created.id }
}

export async function editarItemEstoque(
  id: string,
  input: ItemEstoqueInput,
): Promise<void> {
  const { tenantId } = await requireAccess('admin')
  const values = validateItemInput(input)
  const result = await db
    .update(itemEstoque)
    .set({ ...values, atualizadoEm: new Date() })
    .where(
      and(
        eq(itemEstoque.id, id),
        eq(itemEstoque.tenantId, tenantId),
      ),
    )
    .returning({ id: itemEstoque.id })
  if (result.length === 0) throw new Error('Item de estoque não encontrado')
}

export async function alternarItemEstoqueAtivo(id: string): Promise<void> {
  const { tenantId } = await requireAccess('admin')
  await db
    .update(itemEstoque)
    .set({ ativo: sql`NOT ${itemEstoque.ativo}`, atualizadoEm: new Date() })
    .where(and(eq(itemEstoque.id, id), eq(itemEstoque.tenantId, tenantId)))
}

export async function registrarEntradaEstoque(
  id: string,
  quantidadeCompra: string,
  chaveIdempotencia: string,
  custoTotalCompra?: string,
): Promise<void> {
  const { tenantId, usuarioId } = await requireAccess('admin')
  const chave = validarChaveIdempotente(chaveIdempotencia)
  const [item] = await db
    .select()
    .from(itemEstoque)
    .where(and(eq(itemEstoque.id, id), eq(itemEstoque.tenantId, tenantId), eq(itemEstoque.ativo, true)))
  if (!item) throw new Error('Item de estoque não encontrado')

  const quantidade = Number(normalizarQuantidadeBase(quantidadeCompra, item.unidadeCompra, item.unidadeBase))
  if (!Number.isFinite(quantidade) || quantidade <= 0) throw new Error('A quantidade deve ser maior que zero')
  const custoTotal = custoTotalCompra?.trim()
    ? Number(custoTotalCompra.replace(',', '.'))
    : null
  if (custoTotal !== null && (!Number.isFinite(custoTotal) || custoTotal < 0)) {
    throw new Error('Informe um custo total válido')
  }
  await applyStockMovement({
    tenantId,
    usuarioId,
    itemEstoqueId: id,
    tipo: 'entrada',
    quantidade,
    custoUnitario: custoTotal === null ? null : custoTotal / quantidade,
    chaveIdempotencia: chave,
    observacao: 'Entrada manual de estoque',
  })
}

export async function realizarContagemEstoque(
  id: string,
  quantidadeEncontradaCompra: string,
  chaveIdempotencia: string,
  observacao?: string,
): Promise<void> {
  const { tenantId, usuarioId } = await requireAccess('admin')
  const chave = validarChaveIdempotente(chaveIdempotencia)
  const [item] = await db
    .select({ unidadeCompra: itemEstoque.unidadeCompra, unidadeBase: itemEstoque.unidadeBase })
    .from(itemEstoque)
    .where(and(eq(itemEstoque.id, id), eq(itemEstoque.tenantId, tenantId), eq(itemEstoque.ativo, true)))
  if (!item) throw new Error('Item de estoque não encontrado')
  const quantidade = Number(normalizarQuantidadeBase(quantidadeEncontradaCompra, item.unidadeCompra, item.unidadeBase))
  await applyStockMovement({
    tenantId,
    usuarioId,
    itemEstoqueId: id,
    tipo: 'contagem',
    quantidade,
    chaveIdempotencia: chave,
    motivo: 'Contagem física',
    observacao: observacao ?? null,
  })
}

export async function registrarPerdaEstoque(
  id: string,
  quantidadeCompra: string,
  motivo: string,
  chaveIdempotencia: string,
  observacao?: string,
): Promise<void> {
  const { tenantId, usuarioId } = await requireAccess('admin')
  const chave = validarChaveIdempotente(chaveIdempotencia)
  if (!motivo.trim()) throw new Error('Informe o motivo da perda')
  const [item] = await db
    .select({ unidadeCompra: itemEstoque.unidadeCompra, unidadeBase: itemEstoque.unidadeBase })
    .from(itemEstoque)
    .where(and(eq(itemEstoque.id, id), eq(itemEstoque.tenantId, tenantId), eq(itemEstoque.ativo, true)))
  if (!item) throw new Error('Item de estoque não encontrado')
  const quantidade = Number(normalizarQuantidadeBase(quantidadeCompra, item.unidadeCompra, item.unidadeBase))
  await applyStockMovement({
    tenantId,
    usuarioId,
    itemEstoqueId: id,
    tipo: 'perda',
    quantidade: -quantidade,
    chaveIdempotencia: chave,
    motivo,
    observacao: observacao ?? null,
  })
}

export async function removerItemEstoque(id: string, nomeConfirmacao: string): Promise<void> {
  const { tenantId } = await requireAccess('admin')
  await runInDbTransaction({
    postgresOperation: async (tx) => {
      const [item] = await tx
        .select({ nome: itemEstoque.nome })
        .from(itemEstoque)
        .where(and(eq(itemEstoque.id, id), eq(itemEstoque.tenantId, tenantId), eq(itemEstoque.ativo, true)))
      if (!item) throw new Error('Item de estoque não encontrado')
      if (item.nome !== nomeConfirmacao.trim()) throw new Error('Digite o nome exato do item de estoque para confirmar')

      const [hasRecipeOrHistory] = await tx
        .select({ id: fichaTecnicaItem.id })
        .from(fichaTecnicaItem)
        .where(and(eq(fichaTecnicaItem.itemEstoqueId, id), eq(fichaTecnicaItem.tenantId, tenantId)))
        .limit(1)
      const [hasMovement] = await tx
        .select({ id: movimentoEstoque.id })
        .from(movimentoEstoque)
        .where(and(eq(movimentoEstoque.itemEstoqueId, id), eq(movimentoEstoque.tenantId, tenantId)))
        .limit(1)
      const [hasOrderSnapshot] = await tx
        .select({ id: itemPedidoComposicao.id })
        .from(itemPedidoComposicao)
        .where(and(eq(itemPedidoComposicao.itemEstoqueId, id), eq(itemPedidoComposicao.tenantId, tenantId)))
        .limit(1)
      if (hasRecipeOrHistory || hasMovement || hasOrderSnapshot) {
        await tx.update(itemEstoque).set({ ativo: false, atualizadoEm: new Date() }).where(and(eq(itemEstoque.id, id), eq(itemEstoque.tenantId, tenantId)))
      } else {
        await tx.delete(itemEstoque).where(and(eq(itemEstoque.id, id), eq(itemEstoque.tenantId, tenantId)))
      }
    },
  })
}

export async function salvarFichaTecnica(produtoId: string, itens: FichaTecnicaInput[]): Promise<void> {
  const { tenantId } = await requireAccess('admin')
  if (itens.some((item) => !item.itemEstoqueId || parsePositiveDecimal(item.quantidade, 'Quantidade') <= 0)) {
    throw new Error('A ficha técnica contém uma quantidade inválida')
  }
  const ids = itens.map((item) => item.itemEstoqueId)
  if (new Set(ids).size !== ids.length) throw new Error('Não repita o mesmo item de estoque na ficha técnica')

  await runInDbTransaction({
    postgresOperation: async (tx) => {
      const [product] = await tx.select({ id: produto.id }).from(produto).where(and(eq(produto.id, produtoId), eq(produto.tenantId, tenantId))).for('update')
      if (!product) throw new Error('Produto não encontrado')
      for (const itemEstoqueId of ids.sort()) {
        const [item] = await tx.select({ id: itemEstoque.id }).from(itemEstoque).where(and(eq(itemEstoque.id, itemEstoqueId), eq(itemEstoque.tenantId, tenantId), eq(itemEstoque.ativo, true))).for('update')
        if (!item) throw new Error('Item de estoque inválido')
      }
      await tx.delete(fichaTecnicaItem).where(and(eq(fichaTecnicaItem.produtoId, produtoId), eq(fichaTecnicaItem.tenantId, tenantId)))
      if (itens.length > 0) {
        await tx.insert(fichaTecnicaItem).values(itens.map((item) => ({
          id: crypto.randomUUID(),
          tenantId,
          produtoId,
          itemEstoqueId: item.itemEstoqueId,
          quantidade: Number(item.quantidade.replace(',', '.')).toFixed(3),
        })))
      }
      await tx.update(produto).set({ controleEstoque: itens.length > 0 }).where(and(eq(produto.id, produtoId), eq(produto.tenantId, tenantId)))
    },
  })
}
