import { db } from '@/lib/db/index'
import { desc, eq } from 'drizzle-orm'
import { categoria, itemPedido, mesa, pedido, produto } from '@/lib/db/schema'
import { requireAccess } from '@/lib/auth/access'

export const dynamic = 'force-dynamic'

function formatMoney(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const pad = (value: number) => String(value).padStart(2, '0')

  if (hours > 0) return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  return `${pad(minutes)}:${pad(seconds)}`
}

export default async function RelatoriosAdminPage() {
  await requireAccess('admin')

  const pedidos = await db
    .select({
      id: pedido.id,
      status: pedido.status,
      criadoEm: pedido.criadoEm,
      entregueEm: pedido.entregueEm,
      mesaNumero: mesa.numero,
    })
    .from(pedido)
    .innerJoin(mesa, eq(pedido.mesaId, mesa.id))
    .orderBy(desc(pedido.criadoEm))

  const itens = await db
    .select({
      pedidoId: itemPedido.pedidoId,
      quantidade: itemPedido.quantidade,
      precoUnitario: itemPedido.precoUnitario,
      produtoNome: produto.nome,
      categoriaNome: categoria.nome,
    })
    .from(pedido)
    .innerJoin(itemPedido, eq(itemPedido.pedidoId, pedido.id))
    .innerJoin(produto, eq(itemPedido.produtoId, produto.id))
    .innerJoin(categoria, eq(produto.categoriaId, categoria.id))

  const faturamentoEstimado = itens.reduce(
    (total, item) => total + Number(item.precoUnitario) * item.quantidade,
    0
  )
  const totalItens = itens.reduce((total, item) => total + item.quantidade, 0)
  const ticketMedio = pedidos.length ? faturamentoEstimado / pedidos.length : 0
  const deliveryDurations = pedidos
    .filter((order) => order.status === 'entregue' && order.entregueEm)
    .map((order) => order.entregueEm!.getTime() - order.criadoEm.getTime())
    .filter((duration) => duration >= 0)
  const averageDeliveryDuration = deliveryDurations.length
    ? deliveryDurations.reduce((total, duration) => total + duration, 0) / deliveryDurations.length
    : 0

  const produtosVendidos = new Map<string, { nome: string; quantidade: number; receita: number }>()
  const categoriasVendidas = new Map<string, { nome: string; quantidade: number; receita: number }>()
  const pedidosPorStatus = new Map<string, number>()

  for (const order of pedidos) {
    pedidosPorStatus.set(order.status, (pedidosPorStatus.get(order.status) ?? 0) + 1)
  }

  for (const item of itens) {
    const receita = Number(item.precoUnitario) * item.quantidade
    const product = produtosVendidos.get(item.produtoNome) ?? {
      nome: item.produtoNome,
      quantidade: 0,
      receita: 0,
    }
    product.quantidade += item.quantidade
    product.receita += receita
    produtosVendidos.set(item.produtoNome, product)

    const category = categoriasVendidas.get(item.categoriaNome) ?? {
      nome: item.categoriaNome,
      quantidade: 0,
      receita: 0,
    }
    category.quantidade += item.quantidade
    category.receita += receita
    categoriasVendidas.set(item.categoriaNome, category)
  }

  const topProdutos = Array.from(produtosVendidos.values())
    .sort((a, b) => b.quantidade - a.quantidade)
    .slice(0, 5)
  const topCategorias = Array.from(categoriasVendidas.values()).sort((a, b) => b.receita - a.receita)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Relatórios</h1>
        <p className="text-sm text-muted-foreground">
          Primeira visão gerencial usando os dados já existentes de pedidos, itens, produtos e categorias.
        </p>
      </div>

      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-[var(--radius)] border bg-card p-4">
          <p className="text-sm text-muted-foreground">Faturamento estimado</p>
          <p className="mt-2 text-2xl font-bold">{formatMoney(faturamentoEstimado)}</p>
        </div>
        <div className="rounded-[var(--radius)] border bg-card p-4">
          <p className="text-sm text-muted-foreground">Pedidos registrados</p>
          <p className="mt-2 text-2xl font-bold">{pedidos.length}</p>
        </div>
        <div className="rounded-[var(--radius)] border bg-card p-4">
          <p className="text-sm text-muted-foreground">Ticket médio estimado</p>
          <p className="mt-2 text-2xl font-bold">{formatMoney(ticketMedio)}</p>
        </div>
        <div className="rounded-[var(--radius)] border bg-card p-4">
          <p className="text-sm text-muted-foreground">Tempo médio de entrega</p>
          <p className="mt-2 text-2xl font-bold">
            {deliveryDurations.length ? formatDuration(averageDeliveryDuration) : 'Sem dados'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Pedidos entregues medidos: {deliveryDurations.length}
          </p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[var(--radius)] border bg-card p-4">
          <h2 className="font-semibold">Produtos mais vendidos</h2>
          <div className="mt-3 space-y-2">
            {topProdutos.length ? (
              topProdutos.map((item) => (
                <div key={item.nome} className="flex items-center justify-between gap-3 text-sm">
                  <span>{item.nome}</span>
                  <span className="text-muted-foreground">
                    {item.quantidade} un. · {formatMoney(item.receita)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Sem vendas registradas ainda.</p>
            )}
          </div>
        </div>

        <div className="rounded-[var(--radius)] border bg-card p-4">
          <h2 className="font-semibold">Receita por categoria</h2>
          <div className="mt-3 space-y-2">
            {topCategorias.length ? (
              topCategorias.map((item) => (
                <div key={item.nome} className="flex items-center justify-between gap-3 text-sm">
                  <span>{item.nome}</span>
                  <span className="text-muted-foreground">
                    {item.quantidade} itens · {formatMoney(item.receita)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Sem categorias vendidas ainda.</p>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[var(--radius)] border bg-card p-4">
          <h2 className="font-semibold">Pedidos por status</h2>
          <div className="mt-3 space-y-2">
            {Array.from(pedidosPorStatus.entries()).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between gap-3 text-sm">
                <span>{status}</span>
                <span className="text-muted-foreground">{count}</span>
              </div>
            ))}
            {!pedidosPorStatus.size && (
              <p className="text-sm text-muted-foreground">Sem pedidos registrados ainda.</p>
            )}
          </div>
        </div>

        <div className="rounded-[var(--radius)] border bg-card p-4">
          <h2 className="font-semibold">Ideias possíveis</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>Comparar faturamento por dia e horário para planejar escala da cozinha.</li>
            <li>Medir produtos mais vendidos para priorizar estoque e compras.</li>
            <li>Acompanhar categorias mais fortes para ajustar cardápio e promoções.</li>
            <li>Usar ticket médio estimado para avaliar combos e sugestões de venda.</li>
            <li>Monitorar pedidos por status para encontrar gargalos de preparo.</li>
          </ul>
        </div>
      </section>

      <p className="text-xs text-muted-foreground">
        Total de itens considerados: {totalItens}. Valores são estimativas baseadas no preço salvo em cada item do pedido.
      </p>
    </div>
  )
}
