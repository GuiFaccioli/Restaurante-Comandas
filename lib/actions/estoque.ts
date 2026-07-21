'use server'

import { and, eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/db/index'
import { fichaTecnicaItem, insumo, produto } from '@/lib/db/schema'
import { requireAccess } from '@/lib/auth/access'
import { dbBoolean, isSQLiteDatabase } from '@/lib/db/compat'

export const UNIDADES_BASE = ['g', 'ml', 'unidade'] as const
export const UNIDADES_COMPRA = ['g', 'kg', 'ml', 'l', 'unidade'] as const
export type UnidadeBase = (typeof UNIDADES_BASE)[number]
export type UnidadeCompra = (typeof UNIDADES_COMPRA)[number]

const UNIT_FACTORS: Record<UnidadeCompra, number> = {
  g: 1,
  kg: 1000,
  ml: 1,
  l: 1000,
  unidade: 1,
}

const UNIT_FAMILIES: Record<UnidadeCompra, 'peso' | 'volume' | 'contagem'> = {
  g: 'peso',
  kg: 'peso',
  ml: 'volume',
  l: 'volume',
  unidade: 'contagem',
}

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

function parseDecimal(value: string | undefined, label: string, allowZero = true): number {
  const parsed = Number((value ?? '0').replace(',', '.'))
  if (!Number.isFinite(parsed) || (allowZero ? parsed < 0 : parsed <= 0)) {
    throw new Error(`${label} inválido`)
  }
  return parsed
}

function assertUnits(base: string, purchase: string): asserts base is UnidadeBase {
  if (!UNIDADES_BASE.includes(base as UnidadeBase) || !UNIDADES_COMPRA.includes(purchase as UnidadeCompra)) {
    throw new Error('Unidade de estoque inválida')
  }

  if (UNIT_FAMILIES[base as UnidadeCompra] !== UNIT_FAMILIES[purchase as UnidadeCompra]) {
    throw new Error('As unidades de compra e estoque precisam ser compatíveis')
  }
}

export function normalizarQuantidadeBase(
  quantidade: string,
  unidadeCompra: string,
  unidadeBase: string
): string {
  assertUnits(unidadeBase, unidadeCompra)
  const amount = parseDecimal(quantidade, 'Quantidade')
  const factor = UNIT_FACTORS[unidadeCompra as UnidadeCompra] / UNIT_FACTORS[unidadeBase as UnidadeCompra]
  return (amount * factor).toFixed(3)
}

function fatorCompraParaBase(unidadeCompra: UnidadeCompra, unidadeBase: UnidadeBase): string {
  return (UNIT_FACTORS[unidadeCompra] / UNIT_FACTORS[unidadeBase]).toFixed(3)
}

export async function criarInsumo(input: CriarInsumoInput): Promise<{ id: string }> {
  const { tenantId } = await requireAccess('admin')
  const nome = input.nome.trim()
  if (!nome) throw new Error('Informe o nome do insumo')

  assertUnits(input.unidadeBase, input.unidadeCompra)
  const unidadeCompra = input.unidadeCompra as UnidadeCompra
  const estoqueAtual = normalizarQuantidadeBase(input.estoqueAtual ?? '0', unidadeCompra, input.unidadeBase)
  const estoqueIdeal = normalizarQuantidadeBase(input.estoqueIdeal ?? '0', unidadeCompra, input.unidadeBase)
  const estoqueMinimo = normalizarQuantidadeBase(input.estoqueMinimo ?? '0', unidadeCompra, input.unidadeBase)

  if (Number(estoqueMinimo) > Number(estoqueIdeal)) {
    throw new Error('O estoque mínimo não pode ser maior que o estoque ideal')
  }

  const custoCompra = input.custoCompra === undefined
    ? null
    : Number(parseDecimal(input.custoCompra, 'Custo', false).toFixed(4))
  const fator = Number(fatorCompraParaBase(unidadeCompra, input.unidadeBase))
  const custoUnitario = custoCompra === null ? null : (custoCompra / fator).toFixed(4)

  const [created] = await db
    .insert(insumo)
    .values({
      id: crypto.randomUUID(),
      tenantId,
      nome,
      unidadeBase: input.unidadeBase,
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

export async function editarInsumo(id: string, input: EditarInsumoInput): Promise<void> {
  const { tenantId } = await requireAccess('admin')
  const nome = input.nome.trim()
  if (!nome) throw new Error('Informe o nome do insumo')
  assertUnits(input.unidadeBase, input.unidadeCompra)

  const unidadeCompra = input.unidadeCompra as UnidadeCompra
  const estoqueIdeal = normalizarQuantidadeBase(input.estoqueIdeal ?? '0', unidadeCompra, input.unidadeBase)
  const estoqueMinimo = normalizarQuantidadeBase(input.estoqueMinimo ?? '0', unidadeCompra, input.unidadeBase)
  if (Number(estoqueMinimo) > Number(estoqueIdeal)) {
    throw new Error('O estoque mínimo não pode ser maior que o estoque ideal')
  }

  await db
    .update(insumo)
    .set({
      nome,
      unidadeBase: input.unidadeBase,
      unidadeCompra,
      fatorCompraParaBase: fatorCompraParaBase(unidadeCompra, input.unidadeBase),
      estoqueIdeal,
      estoqueMinimo,
    })
    .where(and(eq(insumo.id, id), eq(insumo.tenantId, tenantId)))
}

export async function salvarFichaTecnica(produtoId: string, itens: FichaTecnicaInput[]): Promise<void> {
  const { tenantId } = await requireAccess('admin')
  if (itens.some((item) => !item.insumoId || parseDecimal(item.quantidade, 'Quantidade', false) <= 0)) {
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
}
