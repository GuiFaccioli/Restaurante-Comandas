'use server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/index'
import { pedido, itemPedido, mesa, produto } from '@/lib/db/schema'
import type { StatusPedido } from '@/lib/db/schema'
import { notifyKitchen } from '@/lib/sse'

export async function criarPedido(mesaId: string): Promise<{ id: string }> {
  const [novo] = await db
    .insert(pedido)
    .values({ mesaId, status: 'novo' })
    .returning({ id: pedido.id })
  return { id: novo.id }
}

export async function adicionarItem(
  pedidoId: string,
  produtoId: string,
  quantidade: number,
  observacao?: string
): Promise<void> {
  const [prod] = await db
    .select({ preco: produto.preco })
    .from(produto)
    .where(eq(produto.id, produtoId))

  await db.insert(itemPedido).values({
    pedidoId,
    produtoId,
    quantidade,
    precoUnitario: prod.preco,
    observacao: observacao ?? null,
  })
}

export async function enviarPedido(pedidoId: string): Promise<void> {
  await db
    .update(pedido)
    .set({ status: 'novo', atualizadoEm: new Date() })
    .where(eq(pedido.id, pedidoId))

  // Fetch items with mesa number for SSE payload using a single join chain
  const rows = await db
    .select({
      pedidoId: pedido.id,
      mesaNumero: mesa.numero,
      produtoNome: produto.nome,
      quantidade: itemPedido.quantidade,
    })
    .from(pedido)
    .innerJoin(mesa, eq(pedido.mesaId, mesa.id))
    .where(eq(pedido.id, pedidoId))

  const mesaNumero = rows[0]?.mesaNumero ?? 0
  const itens = rows.map((r) => `${r.quantidade}x ${r.produtoNome}`)

  notifyKitchen({ type: 'novo_pedido', payload: { pedidoId, mesaNumero, itens } })
}

export async function atualizarStatus(
  pedidoId: string,
  status: StatusPedido
): Promise<void> {
  await db
    .update(pedido)
    .set({ status, atualizadoEm: new Date() })
    .where(eq(pedido.id, pedidoId))

  notifyKitchen({ type: 'status_atualizado', payload: { pedidoId, status } })
}
