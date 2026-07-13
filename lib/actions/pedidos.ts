'use server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db/index'
import { categoria, pagamentoPedido, pedido, itemPedido, mesa, produto } from '@/lib/db/schema'
import type { FormaPagamento, StatusPedido } from '@/lib/db/schema'
import { notifyKitchen } from '@/lib/sse'
import { requireAccess } from '@/lib/auth/access'
import { isSQLiteDatabase } from '@/lib/db/compat'
import { normalizeCurrencyToDecimal } from '@/lib/money'

export type ConfirmarPedidoItem = {
  produtoId: string
  quantidade: number
  observacao?: string
}

export async function confirmarPedido(
  mesaId: string,
  items: ConfirmarPedidoItem[]
): Promise<{ id: string }> {
  const { usuarioId, tenantId } = await requireAccess('garcom')
  if (!mesaId) throw new Error('Mesa inválida')
  if (items.length === 0) throw new Error('Pedido vazio')
  if (items.some((item) => !item.produtoId || item.quantidade <= 0)) {
    throw new Error('Item inválido')
  }

  const itensPreparados: {
    item: ConfirmarPedidoItem
    produto: { nome: string; preco: string; categoriaNome: string }
  }[] = []

  for (const item of items) {
    const [prod] = await db
      .select({ nome: produto.nome, preco: produto.preco, categoriaNome: categoria.nome })
      .from(produto)
      .innerJoin(categoria, eq(produto.categoriaId, categoria.id))
      .where(and(eq(produto.id, item.produtoId), eq(produto.tenantId, tenantId)))

    if (!prod) throw new Error('Produto inválido')

    itensPreparados.push({ item, produto: prod })
  }

  const itensNotificacao: Array<{
    nome: string
    quantidade: number
    categoriaNome: string
    observacao?: string | null
  }> = []

  const [mesaAtual] = await db
    .select({ numero: mesa.numero })
    .from(mesa)
    .where(and(eq(mesa.id, mesaId), eq(mesa.tenantId, tenantId)))

  const novoPedidoId = crypto.randomUUID()
  const now = new Date()
  const pedidoValues = {
    id: novoPedidoId,
    tenantId,
    mesaId,
    createdByUserId: usuarioId,
    status: 'novo' as const,
    criadoEm: now,
    entregueEm: null,
    atualizadoEm: now,
  }

  if (isSQLiteDatabase) {
    ;(db as any).transaction((tx: any) => {
      tx.insert(pedido).values(pedidoValues).run()

      for (const { item, produto: prod } of itensPreparados) {
        tx.insert(itemPedido)
          .values({
            id: crypto.randomUUID(),
            pedidoId: novoPedidoId,
            produtoId: item.produtoId,
            quantidade: item.quantidade,
            precoUnitario: prod.preco,
            observacao: item.observacao ?? null,
          })
          .run()

        itensNotificacao.push({
          nome: prod.nome,
          quantidade: item.quantidade,
          categoriaNome: prod.categoriaNome,
          observacao: item.observacao ?? null,
        })
      }
    })
  } else {
    await db.transaction(async (tx) => {
      await tx.insert(pedido).values(pedidoValues)

      for (const { item, produto: prod } of itensPreparados) {
        await tx.insert(itemPedido).values({
          id: crypto.randomUUID(),
          pedidoId: novoPedidoId,
          produtoId: item.produtoId,
          quantidade: item.quantidade,
          precoUnitario: prod.preco,
          observacao: item.observacao ?? null,
        })

        itensNotificacao.push({
          nome: prod.nome,
          quantidade: item.quantidade,
          categoriaNome: prod.categoriaNome,
          observacao: item.observacao ?? null,
        })
      }
    })
  }

  try {
    notifyKitchen({
      type: 'novo_pedido',
      payload: { pedidoId: novoPedidoId, mesaNumero: mesaAtual?.numero ?? 0, itens: itensNotificacao },
    })
  } catch (error) {
    console.error('Failed to notify kitchen about new order', error)
  }

  return { id: novoPedidoId }
}

const STATUS_FLOW: Record<StatusPedido, StatusPedido | null> = {
  novo: 'em_preparo',
  em_preparo: 'pronto',
  pronto: 'entregue',
  entregue: null,
  cancelado: null,
}

export async function atualizarStatus(
  pedidoId: string,
  status: StatusPedido
): Promise<void> {
  const { tenantId } = await requireAccess('cozinha')

  const [current] = await db
    .select({ status: pedido.status })
    .from(pedido)
    .where(and(eq(pedido.id, pedidoId), eq(pedido.tenantId, tenantId)))

  if (!current) throw new Error('Pedido não encontrado')
  const expectedNext = STATUS_FLOW[current.status]
  if (expectedNext !== status) {
    throw new Error(`Transição inválida: ${current.status} → ${status}`)
  }

  await db
    .update(pedido)
    .set({ status, atualizadoEm: new Date() })
    .where(and(eq(pedido.id, pedidoId), eq(pedido.tenantId, tenantId)))

  try {
    notifyKitchen({ type: 'status_atualizado', payload: { pedidoId, status } })
  } catch (error) {
    console.error('Failed to notify kitchen about status update', error)
  }
}

export async function confirmarEntrega(pedidoId: string): Promise<void> {
  const { tenantId } = await requireAccess('garcom')

  const [current] = await db
    .select({ status: pedido.status })
    .from(pedido)
    .where(and(eq(pedido.id, pedidoId), eq(pedido.tenantId, tenantId)))

  if (!current) throw new Error('Pedido não encontrado')
  if (current.status !== 'novo') {
    throw new Error('Só pedidos novos podem ser confirmados como entregues')
  }

  const now = new Date()
  await db
    .update(pedido)
    .set({ status: 'entregue', entregueEm: now, atualizadoEm: now })
    .where(and(eq(pedido.id, pedidoId), eq(pedido.tenantId, tenantId)))

  try {
    notifyKitchen({
      type: 'status_atualizado',
      payload: { pedidoId, status: 'entregue' },
    })
  } catch (error) {
    console.error('Failed to notify kitchen about delivery confirmation', error)
  }
}

export async function cancelarPedido(pedidoId: string): Promise<void> {
  const { tenantId } = await requireAccess('garcom')

  const [current] = await db
    .select({ status: pedido.status })
    .from(pedido)
    .where(and(eq(pedido.id, pedidoId), eq(pedido.tenantId, tenantId)))

  if (!current) throw new Error('Pedido não encontrado')
  if (current.status !== 'novo') {
    throw new Error('Só pedidos abertos podem ser cancelados')
  }

  await db
    .update(pedido)
    .set({ status: 'cancelado', atualizadoEm: new Date() })
    .where(and(eq(pedido.id, pedidoId), eq(pedido.tenantId, tenantId)))

  try {
    notifyKitchen({
      type: 'status_atualizado',
      payload: { pedidoId, status: 'cancelado' },
    })
  } catch (error) {
    console.error('Failed to notify kitchen about order cancellation', error)
  }
}

export async function registrarPagamentoPedido(input: {
  pedidoId: string
  formaPagamento: FormaPagamento
  valor: string
  observacao?: string
}): Promise<void> {
  const { usuarioId, tenantId } = await requireAccess('caixa')
  let valor: string

  try {
    valor = normalizeCurrencyToDecimal(input.valor)
  } catch {
    throw new Error('Valor de pagamento inválido')
  }

  if (Number(valor) <= 0) throw new Error('Valor de pagamento inválido')

  const [current] = await db
    .select({ id: pedido.id, status: pedido.status })
    .from(pedido)
    .where(and(eq(pedido.id, input.pedidoId), eq(pedido.tenantId, tenantId)))

  if (!current) throw new Error('Pedido não encontrado')
  if (current.status !== 'entregue') throw new Error('Apenas pedidos entregues podem ser pagos')

  await db.insert(pagamentoPedido).values({
    id: crypto.randomUUID(),
    tenantId,
    pedidoId: input.pedidoId,
    registradoPorUsuarioId: usuarioId,
    formaPagamento: input.formaPagamento,
    valor,
    status: 'registrado',
    observacao: input.observacao?.trim() || null,
    registradoEm: new Date(),
  })
}
