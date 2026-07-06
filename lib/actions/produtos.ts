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

export async function criarCategoria(nome: string): Promise<{ id: string }> {
  const { tenantId } = await requireAccess('admin')
  const max = await db
    .select({ ordem: categoria.ordem })
    .from(categoria)
    .where(eq(categoria.tenantId, tenantId))
  const ordem = max.length ? Math.max(...max.map((c) => c.ordem)) + 1 : 0
  const [cat] = await db
    .insert(categoria)
    .values({ id: crypto.randomUUID(), tenantId, nome, ordem })
    .returning({ id: categoria.id })
  return { id: cat.id }
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
