import { and, asc, desc, eq, exists, ilike, inArray, or } from 'drizzle-orm'
import { db } from '@/lib/db/index'
import { cliente, enderecoCliente, itemPedido, pedido, produto } from '@/lib/db/schema'
import { requireAnyAccess } from '@/lib/auth/access'
import { calculateOrderTotal } from '@/lib/orders/totals'

function calculateDeliveryTotal(items: Array<{ quantidade: number; precoUnitario: string }>, taxaEntregaAplicada: string | null): number {
  return calculateOrderTotal(items) + Number(taxaEntregaAplicada ?? 0)
}

export type CustomerSearchPagination = { page?: number; pageSize?: number }

export async function buscarClientes(query: string, pagination: CustomerSearchPagination = {}) {
  const page = Math.max(1, pagination.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, pagination.pageSize ?? 20))
  const term = query.trim()
  const normalizedDigits = term.replace(/\D/g, '')
  const { tenantId } = await requireAnyAccess(['admin', 'caixa'])
  const addressSearch = term
    ? exists(
        db.select({ id: enderecoCliente.id })
          .from(enderecoCliente)
          .where(and(
            eq(enderecoCliente.tenantId, tenantId),
            eq(enderecoCliente.clienteId, cliente.id),
            eq(enderecoCliente.ativo, true),
            or(
              ilike(enderecoCliente.rua, `%${term}%`),
              ilike(enderecoCliente.bairro, `%${term}%`),
              ilike(enderecoCliente.cidade, `%${term}%`),
              ...(normalizedDigits ? [ilike(enderecoCliente.cep, `%${normalizedDigits}%`)] : []),
            ),
          )),
      )
    : undefined
  const filter = term
    ? or(
        ilike(cliente.nome, `%${term}%`),
        ...(normalizedDigits ? [ilike(cliente.telefoneNormalizado, `%${normalizedDigits}%`)] : []),
        addressSearch,
      )
    : undefined
  const customers = await db.select({
    id: cliente.id, name: cliente.nome, phone: cliente.telefone, deliveryFee: cliente.taxaEntregaPadrao,
    active: cliente.ativo, addressId: enderecoCliente.id, street: enderecoCliente.rua, number: enderecoCliente.numero,
    neighborhood: enderecoCliente.bairro, city: enderecoCliente.cidade, postalCode: enderecoCliente.cep,
    complement: enderecoCliente.complemento, reference: enderecoCliente.referencia,
  }).from(cliente).leftJoin(enderecoCliente, and(eq(enderecoCliente.tenantId, tenantId), eq(enderecoCliente.clienteId, cliente.id), eq(enderecoCliente.ativo, true), eq(enderecoCliente.padrao, true)))
    .where(and(eq(cliente.tenantId, tenantId), ...(filter ? [filter] : [])))
    .orderBy(asc(cliente.nome)).limit(pageSize).offset((page - 1) * pageSize)

  const customerIds = customers.map((customer) => customer.id)
  const activeOrders = customerIds.length === 0
    ? []
    : await db
      .select({
        id: pedido.id,
        clienteId: pedido.clienteId,
        clienteNomeSnapshot: pedido.clienteNomeSnapshot,
        enderecoSnapshot: pedido.enderecoSnapshot,
        taxaEntregaAplicada: pedido.taxaEntregaAplicada,
        status: pedido.status,
        criadoEm: pedido.criadoEm,
        entregueEm: pedido.entregueEm,
      })
      .from(pedido)
      .where(and(
        eq(pedido.tenantId, tenantId),
        inArray(pedido.clienteId, customerIds),
        eq(pedido.canal, 'delivery'),
        inArray(pedido.status, ['novo', 'em_preparo', 'pronto']),
      ))
      .orderBy(desc(pedido.criadoEm))
  const activeOrderIds = activeOrders.map((order) => order.id)
  const activeItems = activeOrderIds.length === 0
    ? []
    : await db
      .select({
        pedidoId: itemPedido.pedidoId,
        nome: produto.nome,
        quantidade: itemPedido.quantidade,
        precoUnitario: itemPedido.precoUnitario,
        observacao: itemPedido.observacao,
      })
      .from(itemPedido)
      .innerJoin(produto, eq(itemPedido.produtoId, produto.id))
      .where(and(
        eq(itemPedido.tenantId, tenantId),
        eq(produto.tenantId, tenantId),
        inArray(itemPedido.pedidoId, activeOrderIds),
      ))

  return customers.map((customer) => ({
    ...customer,
    activeDeliveryOrders: activeOrders
      .filter((order) => order.clienteId === customer.id)
      .map((order) => {
        const items = activeItems
          .filter((item) => item.pedidoId === order.id)
          .map(({ pedidoId: _pedidoId, ...item }) => item)
        return {
          id: order.id,
          clienteNomeSnapshot: order.clienteNomeSnapshot,
          enderecoSnapshot: order.enderecoSnapshot as CustomerDeliveryAddressSnapshot | null,
          taxaEntregaAplicada: order.taxaEntregaAplicada,
          status: order.status,
          criadoEm: order.criadoEm.toISOString(),
          entregueEm: order.entregueEm?.toISOString() ?? null,
          total: calculateDeliveryTotal(items, order.taxaEntregaAplicada),
          itens: items,
        }
      }),
  }))
}

export async function buscarClientePorId(id: string) {
  const { tenantId } = await requireAnyAccess(['admin', 'caixa'])
  const [customer] = await db.select({
    id: cliente.id, name: cliente.nome, phone: cliente.telefone, deliveryFee: cliente.taxaEntregaPadrao,
    active: cliente.ativo, addressId: enderecoCliente.id, street: enderecoCliente.rua, number: enderecoCliente.numero,
    neighborhood: enderecoCliente.bairro, city: enderecoCliente.cidade, postalCode: enderecoCliente.cep,
    complement: enderecoCliente.complemento, reference: enderecoCliente.referencia,
  }).from(cliente).leftJoin(enderecoCliente, and(
    eq(enderecoCliente.tenantId, tenantId),
    eq(enderecoCliente.clienteId, cliente.id),
    eq(enderecoCliente.ativo, true),
    eq(enderecoCliente.padrao, true),
  )).where(and(eq(cliente.id, id), eq(cliente.tenantId, tenantId)))

  return customer ?? null
}

export type CustomerDeliveryOrder = {
  id: string
  clienteNomeSnapshot: string | null
  enderecoSnapshot: CustomerDeliveryAddressSnapshot | null
  taxaEntregaAplicada: string | null
  status: string
  criadoEm: string
  entregueEm: string | null
  total: number
  itens: Array<{
    nome: string
    quantidade: number
    precoUnitario: string
    observacao: string | null
  }>
}

export type CustomerDeliveryAddressSnapshot = {
  rua: string | null
  numero: string | null
  bairro: string | null
  cidade: string | null
  cep: string | null
  complemento: string | null
  referencia: string | null
}

export async function buscarHistoricoPedidosDelivery(
  clienteId: string,
): Promise<CustomerDeliveryOrder[]> {
  const { tenantId } = await requireAnyAccess(['admin', 'caixa'])
  const orders = await db
    .select({
      id: pedido.id,
      clienteNomeSnapshot: pedido.clienteNomeSnapshot,
      enderecoSnapshot: pedido.enderecoSnapshot,
      taxaEntregaAplicada: pedido.taxaEntregaAplicada,
      status: pedido.status,
      criadoEm: pedido.criadoEm,
      entregueEm: pedido.entregueEm,
    })
    .from(pedido)
    .where(and(
      eq(pedido.tenantId, tenantId),
      eq(pedido.clienteId, clienteId),
      eq(pedido.canal, 'delivery'),
    ))
    .orderBy(desc(pedido.criadoEm))

  const orderIds = orders.map((order) => order.id)
  const items = orderIds.length === 0
    ? []
    : await db
      .select({
        pedidoId: itemPedido.pedidoId,
        nome: produto.nome,
        quantidade: itemPedido.quantidade,
        precoUnitario: itemPedido.precoUnitario,
        observacao: itemPedido.observacao,
      })
      .from(itemPedido)
      .innerJoin(produto, eq(itemPedido.produtoId, produto.id))
      .where(and(
        eq(itemPedido.tenantId, tenantId),
        eq(produto.tenantId, tenantId),
        inArray(itemPedido.pedidoId, orderIds),
      ))

  return orders.map((order) => {
    const orderItems = items
      .filter((item) => item.pedidoId === order.id)
      .map(({ pedidoId: _pedidoId, ...item }) => item)
    return {
      id: order.id,
      clienteNomeSnapshot: order.clienteNomeSnapshot,
      enderecoSnapshot: order.enderecoSnapshot as CustomerDeliveryAddressSnapshot | null,
      taxaEntregaAplicada: order.taxaEntregaAplicada,
      status: order.status,
      criadoEm: order.criadoEm.toISOString(),
      entregueEm: order.entregueEm?.toISOString() ?? null,
      total: calculateDeliveryTotal(orderItems, order.taxaEntregaAplicada),
      itens: orderItems,
    }
  })
}
