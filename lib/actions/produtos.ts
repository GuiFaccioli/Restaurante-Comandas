'use server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db/index'
import { categoria, produto } from '@/lib/db/schema'
import { notifyKitchen } from '@/lib/sse'
import { requireAccess } from '@/lib/auth/access'
import { dbBoolean } from '@/lib/db/compat'
import { normalizeCurrencyToDecimal } from '@/lib/money'

type NovoProduto = {
  categoriaId: string
  nome: string
  descricao?: string
  preco: string
  imagemUrl?: string
}

export type CreatedCategory = {
  id: string
  nome: string
}

export async function criarCategoria(nome: string): Promise<CreatedCategory> {
  const { tenantId } = await requireAccess('admin')
  const normalizedName = nome.trim()

  if (!normalizedName) {
    throw new Error('Informe o nome da categoria')
  }

  const categories = await db
    .select({ ordem: categoria.ordem })
    .from(categoria)
    .where(eq(categoria.tenantId, tenantId))
  const ordem = categories.length
    ? Math.max(...categories.map((category) => category.ordem)) + 1
    : 0

  const [created] = await db
    .insert(categoria)
    .values({
      id: crypto.randomUUID(),
      tenantId,
      nome: normalizedName,
      ordem,
    })
    .returning({
      id: categoria.id,
      nome: categoria.nome,
    })

  return created
}

export async function editarCategoria(id: string, nome: string): Promise<void> {
  const { tenantId } = await requireAccess('admin')
  const normalizedName = nome.trim()
  if (!normalizedName) throw new Error('Informe o nome da categoria')

  await db
    .update(categoria)
    .set({ nome: normalizedName })
    .where(and(eq(categoria.id, id), eq(categoria.tenantId, tenantId)))
}

export async function removerCategoria(id: string): Promise<void> {
  const { tenantId } = await requireAccess('admin')
  const produtosDaCategoria = await db
    .select({ id: produto.id })
    .from(produto)
    .where(and(eq(produto.categoriaId, id), eq(produto.tenantId, tenantId)))

  if (produtosDaCategoria.length > 0) {
    throw new Error('Remova os produtos antes de excluir a categoria')
  }

  await db
    .delete(categoria)
    .where(and(eq(categoria.id, id), eq(categoria.tenantId, tenantId)))
}

export async function reordenarCategorias(ids: string[]): Promise<void> {
  const { tenantId } = await requireAccess('admin')
  await Promise.all(
    ids.map((id, ordem) =>
      db.update(categoria).set({ ordem }).where(and(eq(categoria.id, id), eq(categoria.tenantId, tenantId)))
    )
  )
}

export async function criarProduto(data: NovoProduto): Promise<{ id: string }> {
  const { tenantId } = await requireAccess('admin')
  const [prod] = await db
    .insert(produto)
    .values({
      id: crypto.randomUUID(),
      tenantId,
      categoriaId: data.categoriaId,
      nome: data.nome,
      descricao: data.descricao ?? null,
      preco: normalizeCurrencyToDecimal(data.preco),
      disponivel: dbBoolean(true) as boolean,
      imagemUrl: data.imagemUrl ?? null,
    })
    .returning({ id: produto.id })
  return { id: prod.id }
}

export async function editarProduto(
  id: string,
  data: Partial<NovoProduto>
): Promise<void> {
  const { tenantId } = await requireAccess('admin')
  await db
    .update(produto)
    .set({
      ...(data.nome && { nome: data.nome }),
      ...(data.descricao !== undefined && { descricao: data.descricao }),
      ...(data.preco && { preco: normalizeCurrencyToDecimal(data.preco) }),
      ...(data.imagemUrl !== undefined && { imagemUrl: data.imagemUrl }),
      ...(data.categoriaId && { categoriaId: data.categoriaId }),
    })
    .where(and(eq(produto.id, id), eq(produto.tenantId, tenantId)))
}

export async function removerProduto(id: string): Promise<void> {
  const { tenantId } = await requireAccess('admin')
  await db
    .delete(produto)
    .where(and(eq(produto.id, id), eq(produto.tenantId, tenantId)))
}

export async function toggleDisponivel(id: string): Promise<void> {
  const { tenantId } = await requireAccess('admin')
  const [prod] = await db
    .select({ id: produto.id, disponivel: produto.disponivel })
    .from(produto)
    .where(and(eq(produto.id, id), eq(produto.tenantId, tenantId)))

  const novoEstado = !Boolean(prod.disponivel)
  await db
    .update(produto)
    .set({ disponivel: dbBoolean(novoEstado) as boolean })
    .where(and(eq(produto.id, id), eq(produto.tenantId, tenantId)))

  if (!novoEstado) {
    try {
      notifyKitchen({ type: 'produto_indisponivel', payload: { produtoId: id } })
    } catch (error) {
      console.error('Failed to notify kitchen about unavailable product', error)
    }
  }
}
