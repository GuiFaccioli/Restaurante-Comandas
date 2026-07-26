import Link from 'next/link'
import { and, desc, eq } from 'drizzle-orm'
import { requireAccess } from '@/lib/auth/access'
import { db } from '@/lib/db/index'
import { insumo, movimentoEstoque } from '@/lib/db/schema'
import { AdminPage } from '@/components/admin/admin-page'

export const dynamic = 'force-dynamic'

function formatQuantity(value: string, unit: string) {
  const number = Number(value)
  return `${Number.isInteger(number) ? number : number.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')} ${unit}`
}

function movementLabel(type: string) {
  return ({ entrada: 'Entrada', perda: 'Perda', contagem: 'Contagem', saida: 'Consumo', estorno: 'Estorno', ajuste: 'Ajuste' } as Record<string, string>)[type] ?? type
}

export default async function EstoqueDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { tenantId } = await requireAccess('admin')
  const { id } = await params
  const [item] = await db.select().from(insumo).where(and(eq(insumo.id, id), eq(insumo.tenantId, tenantId)))
  if (!item) return <AdminPage><p>Insumo não encontrado.</p></AdminPage>
  const movements = await db.select().from(movimentoEstoque).where(and(eq(movimentoEstoque.insumoId, id), eq(movimentoEstoque.tenantId, tenantId))).orderBy(desc(movimentoEstoque.criadoEm)).limit(100)

  return (
    <AdminPage>
      <div className="space-y-6">
        <Link href="/admin/estoque/saldos" className="text-sm text-muted-foreground hover:text-foreground">← Estoque</Link>
        <div className="border-b pb-5"><h1 className="text-xl font-semibold tracking-tight">{item.nome}</h1><p className="mt-1 text-sm text-muted-foreground">{item.unidadeBase}</p></div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div><p className="text-xs text-muted-foreground">Disponível</p><p className="mt-1 text-lg font-semibold">{formatQuantity(item.estoqueAtual, item.unidadeBase)}</p></div>
          <div><p className="text-xs text-muted-foreground">Estoque mínimo</p><p className="mt-1 text-lg font-semibold">{formatQuantity(item.estoqueMinimo, item.unidadeBase)}</p></div>
          <div><p className="text-xs text-muted-foreground">Custo médio</p><p className="mt-1 text-lg font-semibold">{item.custoUnitario ? `R$ ${Number(item.custoUnitario).toFixed(4)} / ${item.unidadeBase}` : '—'}</p></div>
        </div>
        <section><h2 className="text-base font-semibold">Histórico de movimentações</h2>{movements.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Nenhuma movimentação registrada.</p> : <div className="mt-3 overflow-x-auto rounded-[var(--radius)] border"><table className="w-full min-w-[680px] text-sm"><thead className="border-b bg-muted/30"><tr className="text-left text-xs uppercase tracking-wide text-muted-foreground"><th className="px-3 py-3 font-medium">Data</th><th className="px-3 py-3 font-medium">Tipo</th><th className="px-3 py-3 font-medium">Quantidade</th><th className="px-3 py-3 font-medium">Motivo</th><th className="px-3 py-3 font-medium">Saldo</th></tr></thead><tbody className="divide-y">{movements.map((movement) => <tr key={movement.id}><td className="px-3 py-3">{new Date(movement.criadoEm).toLocaleString('pt-BR')}</td><td className="px-3 py-3">{movementLabel(movement.tipo)}</td><td className={`px-3 py-3 font-medium ${Number(movement.quantidade) < 0 ? 'text-destructive' : 'text-[var(--action-positive-foreground)]'}`}>{Number(movement.quantidade) > 0 ? '+' : ''}{formatQuantity(movement.quantidade, item.unidadeBase)}</td><td className="px-3 py-3 text-muted-foreground">{movement.motivo ?? movement.observacao ?? '—'}</td><td className="px-3 py-3">{formatQuantity(movement.saldoResultante, item.unidadeBase)}</td></tr>)}</tbody></table></div>}</section>
      </div>
    </AdminPage>
  )
}
