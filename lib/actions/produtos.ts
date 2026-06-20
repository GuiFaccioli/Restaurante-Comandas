'use server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/index'
import { categoria, produto } from '@/lib/db/schema'
import { notifyKitchen } from '@/lib/sse'

type NovoProduto = {
  categoriaId: string
  nome: string
  descricao?: string
  preco: string
  imagemUrl?: string
}

export async function criarCategoria(nome: string): Promise<{ id: string }> {
  const max = await db.select({ ordem: categoria.ordem }).from(categoria)
  const ordem = max.length ? Math.max(...max.map((c) => c.ordem)) + 1 : 0
  const [cat] = await db
    .insert(categoria)
    .values({ nome, ordem })
    .returning({ id: categoria.id })
  return { id: cat.id }
}

export async function reordenarCategorias(ids: string[]): Promise<void> {
  await Promise.all(
    ids.map((id, ordem) =>
      db.update(categoria).set({ ordem }).where(eq(categoria.id, id))
    )
  )
}

export async function criarProduto(data: NovoProduto): Promise<{ id: string }> {
  const [prod] = await db
    .insert(produto)
    .values({
      categoriaId: data.categoriaId,
      nome: data.nome,
      descricao: data.descricao ?? null,
      preco: data.preco,
      imagemUrl: data.imagemUrl ?? null,
    })
    .returning({ id: produto.id })
  return { id: prod.id }
}

export async function editarProduto(
  id: string,
  data: Partial<NovoProduto>
): Promise<void> {
  await db
    .update(produto)
    .set({
      ...(data.nome && { nome: data.nome }),
      ...(data.descricao !== undefined && { descricao: data.descricao }),
      ...(data.preco && { preco: data.preco }),
      ...(data.imagemUrl !== undefined && { imagemUrl: data.imagemUrl }),
      ...(data.categoriaId && { categoriaId: data.categoriaId }),
    })
    .where(eq(produto.id, id))
}

export async function toggleDisponivel(id: string): Promise<void> {
  const [prod] = await db
    .select({ id: produto.id, disponivel: produto.disponivel })
    .from(produto)
    .where(eq(produto.id, id))

  const novoEstado = !prod.disponivel
  await db.update(produto).set({ disponivel: novoEstado }).where(eq(produto.id, id))

  if (!novoEstado) {
    notifyKitchen({ type: 'produto_indisponivel', payload: { produtoId: id } })
  }
}
