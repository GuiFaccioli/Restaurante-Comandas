// app/(garcom)/mesa/[id]/page.tsx
import { db } from '@/lib/db/index'
import { and, eq, asc } from 'drizzle-orm'
import { mesa, categoria, produto, fichaTecnicaItem, itemEstoque } from '@/lib/db/schema'
import { notFound } from 'next/navigation'
import { MesaPageClient } from './client'
import { requireAccess } from '@/lib/auth/access'
import { getTenantMesaOrders } from '@/lib/orders/queries'
import { produtoTemEstoque } from '@/lib/stock/availability'
import { getMesaAtendimentos } from '@/lib/attendance/queries'

export default async function MesaPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ atendimentoId?: string }> }) {
  const { tenantId } = await requireAccess('garcom')
  const { id } = await params
  const [m] = await db
    .select()
    .from(mesa)
    .where(and(eq(mesa.id, id), eq(mesa.tenantId, tenantId)))
  if (!m || !m.ativa) notFound()
  const { atendimentoId: requestedAttendanceId } = await searchParams
  const attendances = await getMesaAtendimentos({ tenantId, mesaId: m.id })
  const openAttendance = attendances.find((item) => item.status === 'open')
  const atendimentoId = requestedAttendanceId && attendances.some((item) => item.id === requestedAttendanceId && (item.status === 'open' || item.status === 'awaiting_payment'))
    ? requestedAttendanceId
    : openAttendance?.id ?? ''

  const categorias = await db
    .select()
    .from(categoria)
    .where(eq(categoria.tenantId, tenantId))
    .orderBy(asc(categoria.ordem))

  const produtos = await db
    .select()
    .from(produto)
    .where(and(eq(produto.tenantId, tenantId), eq(produto.disponivel, true)))
    .orderBy(asc(produto.nome))

  const [receitas, saldos] = await Promise.all([
    db.select({ produtoId: fichaTecnicaItem.produtoId, itemEstoqueId: fichaTecnicaItem.itemEstoqueId, quantidade: fichaTecnicaItem.quantidade })
      .from(fichaTecnicaItem)
      .where(eq(fichaTecnicaItem.tenantId, tenantId)),
    db.select({ id: itemEstoque.id, estoqueAtual: itemEstoque.estoqueAtual })
      .from(itemEstoque)
      .where(eq(itemEstoque.tenantId, tenantId)),
  ])

  const categoriaComProdutos = categorias.map((c) => ({
    ...c,
    produtos: produtos.filter((p) => p.categoriaId === c.id).map((p) => ({
      ...p,
      estoqueInsuficiente: p.controleEstoque && !produtoTemEstoque(p.id, receitas, saldos),
    })),
  }))
  const initialPedidos = atendimentoId
    ? await getTenantMesaOrders({ tenantId, mesaId: m.id, atendimentoId })
    : []

  return (
    <MesaPageClient
      mesaNumero={m.numero}
      mesaId={m.id}
      atendimentoId={atendimentoId}
      attendances={attendances}
      categorias={categoriaComProdutos}
      initialPedidos={initialPedidos}
    />
  )
}
