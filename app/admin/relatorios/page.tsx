import { desc, eq } from 'drizzle-orm'
import { requireAccess } from '@/lib/auth/access'
import { db } from '@/lib/db/index'
import { categoria, fichaTecnicaItem, itemEstoque, itemPedido, mesa, pedido, produto } from '@/lib/db/schema'
import { RelatoriosAdminClient } from './client'

export const dynamic = 'force-dynamic'

function money(value: number) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value) }
function quantity(value: string | null) { if (value === null) return '—'; const number = Number(value); return Number.isInteger(number) ? String(number) : number.toFixed(3).replace(/0+$/, '').replace(/\.$/, '') }

export default async function RelatoriosAdminPage() {
  const { tenantId } = await requireAccess('admin')
  const [pedidos, itens, estoque, fichas] = await Promise.all([
    db.select({ status: pedido.status }).from(pedido).where(eq(pedido.tenantId, tenantId)).orderBy(desc(pedido.criadoEm)),
    db.select({ quantidade: itemPedido.quantidade, precoUnitario: itemPedido.precoUnitario, produtoNome: produto.nome }).from(pedido).innerJoin(itemPedido, eq(itemPedido.pedidoId, pedido.id)).innerJoin(produto, eq(itemPedido.produtoId, produto.id)).where(eq(pedido.tenantId, tenantId)),
    db.select({ nome: itemEstoque.nome, atual: itemEstoque.estoqueAtual, minimo: itemEstoque.estoqueMinimo, unidade: itemEstoque.unidadeBase }).from(itemEstoque).where(eq(itemEstoque.tenantId, tenantId)).orderBy(itemEstoque.nome),
    db.select({ produto: produto.nome, itemEstoque: itemEstoque.nome, quantidade: fichaTecnicaItem.quantidade, unidade: itemEstoque.unidadeBase }).from(fichaTecnicaItem).innerJoin(produto, eq(fichaTecnicaItem.produtoId, produto.id)).innerJoin(itemEstoque, eq(fichaTecnicaItem.itemEstoqueId, itemEstoque.id)).where(eq(fichaTecnicaItem.tenantId, tenantId)).orderBy(produto.nome),
  ])
  const revenue = itens.reduce((total, item) => total + Number(item.precoUnitario) * item.quantidade, 0)
  const productMap = new Map<string, { quantidade: number; receita: number }>()
  itens.forEach((item) => { const current = productMap.get(item.produtoNome) ?? { quantidade: 0, receita: 0 }; current.quantidade += item.quantidade; current.receita += Number(item.precoUnitario) * item.quantidade; productMap.set(item.produtoNome, current) })
  const statusMap = new Map<string, number>()
  pedidos.forEach((item) => statusMap.set(item.status, (statusMap.get(item.status) ?? 0) + 1))
  const data = {
    resumo: [{ indicador: 'Faturamento estimado', valor: money(revenue) }, { indicador: 'Pedidos', valor: String(pedidos.length) }, { indicador: 'Itens vendidos', valor: String(itens.reduce((total, item) => total + item.quantidade, 0)) }, { indicador: 'Ticket médio', valor: money(pedidos.length ? revenue / pedidos.length : 0) }],
    pedidos: Array.from(statusMap, ([status, quantidade]) => ({ status, quantidade })),
    produtos: Array.from(productMap, ([nome, values]) => ({ nome, quantidade: values.quantidade, receita: money(values.receita) })).sort((a, b) => b.quantidade - a.quantidade),
    estoque: estoque.map((item) => ({ nome: item.nome, atual: quantity(item.atual), minimo: quantity(item.minimo), unidade: item.unidade, situacao: item.minimo === null ? 'Sem controle' : Number(item.atual) <= Number(item.minimo) ? 'Atenção' : 'OK' })),
    fichas: fichas.map((item) => ({ produto: item.produto, itemEstoque: item.itemEstoque, quantidade: quantity(item.quantidade), unidade: item.unidade })),
  }
  return <RelatoriosAdminClient data={data} />
}
