'use server'
import { eq } from 'drizzle-orm'
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

export type ConfirmarPedidoItem = {
  produtoId: string
  quantidade: number
  observacao?: string
}

export async function confirmarPedido(
  mesaId: string,
  items: ConfirmarPedidoItem[]
): Promise<{ id: string }> {
  await requireAuth()
  if (!mesaId) throw new Error('Mesa inválida')
  if (items.length === 0) throw new Error('Pedido vazio')
  if (items.some((item) => !item.produtoId || item.quantidade <= 0)) {
    throw new Error('Item inválido')
  }

  const itensPreparados: {
    item: ConfirmarPedidoItem
    produto: { nome: string; preco: string }
  }[] = []

  for (const item of items) {
    const [prod] = await db
      .select({ nome: produto.nome, preco: produto.preco })
      .from(produto)
      .where(eq(produto.id, item.produtoId))

    if (!prod) throw new Error('Produto inválido')

    itensPreparados.push({ item, produto: prod })
  }

  const itensNotificacao: string[] = []

  const novo = await db.transaction(async (tx) => {
    const [novoPedido] = await tx
      .insert(pedido)
      .values({ mesaId, status: 'novo' })
      .returning({ id: pedido.id })

    for (const { item, produto: prod } of itensPreparados) {
      await tx.insert(itemPedido).values({
        pedidoId: novoPedido.id,
        produtoId: item.produtoId,
        quantidade: item.quantidade,
        precoUnitario: prod.preco,
        observacao: item.observacao ?? null,
      })

      itensNotificacao.push(`${item.quantidade}x ${prod.nome}`)
    }

    return novoPedido
  })

  const [m] = await db
    .select({ numero: mesa.numero })
    .from(mesa)
    .where(eq(mesa.id, mesaId))

  notifyKitchen({
    type: 'novo_pedido',
    payload: { pedidoId: novo.id, mesaNumero: m?.numero ?? 0, itens: itensNotificacao },
  })

  return { id: novo.id }
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
