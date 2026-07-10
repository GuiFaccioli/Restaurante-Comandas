import { db } from '@/lib/db/index'
import { desc, eq } from 'drizzle-orm'
import { AdminBar, AdminEmptyState, AdminPage, AdminPageHeader, AdminPanel, AdminStatsGrid, AdminStatCard } from '@/components/admin/admin-page'
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
  const { tenantId } = await requireAccess('admin')

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
    .where(eq(pedido.tenantId, tenantId))
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
    .where(eq(pedido.tenantId, tenantId))

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
  const maxProdutoQuantidade = Math.max(0, ...topProdutos.map((item) => item.quantidade))
  const maxCategoriaReceita = Math.max(0, ...topCategorias.map((item) => item.receita))
  const maxStatusCount = Math.max(0, ...Array.from(pedidosPorStatus.values()))

  return (
    <AdminPage>
      <AdminPageHeader
        title="Relatórios"
        description="Visão gerencial baseada nos pedidos, itens, produtos e categorias já registrados pelo restaurante."
      />

      <AdminStatsGrid>
        <AdminStatCard label="Faturamento estimado" value={formatMoney(faturamentoEstimado)} detail="Baseado no preço salvo em cada item." />
        <AdminStatCard label="Pedidos registrados" value={pedidos.length} detail={`${totalItens} itens considerados.`} />
        <AdminStatCard label="Ticket médio estimado" value={formatMoney(ticketMedio)} detail="Faturamento dividido por pedidos." />
        <AdminStatCard
          label="Tempo médio de entrega"
          value={deliveryDurations.length ? formatDuration(averageDeliveryDuration) : 'Sem dados'}
          detail={`Pedidos entregues medidos: ${deliveryDurations.length}`}
        />
      </AdminStatsGrid>

      <section className="grid gap-4 lg:grid-cols-2">
        <AdminPanel title="Produtos mais vendidos" description="Ranking por quantidade vendida.">
          <div className="space-y-4">
            {topProdutos.length ? (
              topProdutos.map((item) => (
                <AdminBar
                  key={item.nome}
                  label={item.nome}
                  value={item.quantidade}
                  max={maxProdutoQuantidade}
                  detail={`${item.quantidade} un. · ${formatMoney(item.receita)}`}
                />
              ))
            ) : (
              <AdminEmptyState
                title="Sem vendas registradas"
                description="Quando pedidos forem concluídos, o ranking de produtos aparecerá aqui."
              />
            )}
          </div>
        </AdminPanel>

        <AdminPanel title="Receita por categoria" description="Categorias ordenadas por receita estimada.">
          <div className="space-y-4">
            {topCategorias.length ? (
              topCategorias.map((item) => (
                <AdminBar
                  key={item.nome}
                  label={item.nome}
                  value={item.receita}
                  max={maxCategoriaReceita}
                  detail={`${item.quantidade} itens · ${formatMoney(item.receita)}`}
                />
              ))
            ) : (
              <AdminEmptyState
                title="Sem categorias vendidas"
                description="As categorias entram no relatório quando houver itens vendidos."
              />
            )}
          </div>
        </AdminPanel>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <AdminPanel title="Pedidos por status" description="Distribuição operacional dos pedidos registrados.">
          <div className="space-y-3">
            {Array.from(pedidosPorStatus.entries()).map(([status, count]) => (
              <AdminBar
                key={status}
                label={status}
                value={count}
                max={maxStatusCount}
                detail={`${count} pedidos`}
                tone={status === 'entregue' ? 'success' : status === 'cancelado' ? 'danger' : 'default'}
              />
            ))}
            {!pedidosPorStatus.size && (
              <AdminEmptyState
                title="Sem pedidos registrados"
                description="Os status aparecem aqui quando a operação começar a registrar pedidos."
              />
            )}
          </div>
        </AdminPanel>

        <AdminPanel title="Leituras operacionais" description="Como usar estes números na rotina do restaurante.">
          <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-muted-foreground">
            <li>Comparar faturamento por dia e horário para planejar escala da cozinha.</li>
            <li>Medir produtos mais vendidos para priorizar estoque e compras.</li>
            <li>Acompanhar categorias mais fortes para ajustar cardápio e promoções.</li>
            <li>Usar ticket médio estimado para avaliar combos e sugestões de venda.</li>
            <li>Monitorar pedidos por status para encontrar gargalos de preparo.</li>
          </ul>
        </AdminPanel>
      </section>

      <p className="text-xs text-muted-foreground">
        Total de itens considerados: {totalItens}. Valores são estimativas baseadas no preço salvo em cada item do pedido.
      </p>
    </AdminPage>
  )
}
