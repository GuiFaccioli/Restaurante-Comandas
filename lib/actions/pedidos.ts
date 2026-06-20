'use server'
import { eq, and, inArray } from 'drizzle-orm'
import { db } from '@/lib/db/index'
import { pedido, itemPedido, mesa, produto } from '@/lib/db/schema'
import type { StatusPedido } from '@/lib/db/schema'
import { notifyKitchen } from '@/lib/sse'
import { auth } from '@/lib/auth/server'
import { redirect } from 'next/navigation'

async function requireAuth() {
  const { data: session } = await auth.getSession()
  if (!session?.user) redirect('/auth/sign-in')
  return session.user
}

export async function criarPedido(mesaId: string): Promise<{ id: string }> {
  await requireAuth()
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
  await requireAuth()
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
  await requireAuth()
  await db
    .update(pedido)
    .set({ atualizadoEm: new Date() })
    .where(eq(pedido.id, pedidoId))

  // Fetch items with mesa number for SSE payload using a single join chain
  const rows = await db
    .select({
      pedidoId: pedido.id,
      mesaNumero: mesa.numero,
      produtoNome: produto.nome,
      quantidade: itemPedido.quantidade,
    })
    .from(itemPedido)
    .innerJoin(pedido, eq(itemPedido.pedidoId, pedido.id))
    .innerJoin(mesa, eq(pedido.mesaId, mesa.id))
    .innerJoin(produto, eq(itemPedido.produtoId, produto.id))
    .where(eq(pedido.id, pedidoId))

  const mesaNumero = rows[0]?.mesaNumero ?? 0
  const itens = rows.map((r) => `${r.quantidade}x ${r.produtoNome}`)

  notifyKitchen({ type: 'novo_pedido', payload: { pedidoId, mesaNumero, itens } })
}

const STATUS_FLOW: Record<StatusPedido, StatusPedido | null> = {
  novo: 'em_preparo',
  em_preparo: 'pronto',
  pronto: 'entregue',
  entregue: null,
}

export async function atualizarStatus(
  pedidoId: string,
  status: StatusPedido
): Promise<void> {
  await requireAuth()

  const [current] = await db
    .select({ status: pedido.status })
    .from(pedido)
    .where(eq(pedido.id, pedidoId))

  if (!current) throw new Error('Pedido não encontrado')
  const expectedNext = STATUS_FLOW[current.status]
  if (expectedNext !== status) {
    throw new Error(`Transição inválida: ${current.status} → ${status}`)
  }

  await db
    .update(pedido)
    .set({ status, atualizadoEm: new Date() })
    .where(eq(pedido.id, pedidoId))

  notifyKitchen({ type: 'status_atualizado', payload: { pedidoId, status } })
}
