'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { AdminEmptyState, AdminPage } from '@/components/admin/admin-page'

type ReportKey = 'resumo' | 'pedidos' | 'produtos' | 'estoque' | 'fichas'
type ReportData = {
  resumo: { indicador: string; valor: string }[]
  pedidos: { status: string; quantidade: number }[]
  produtos: { nome: string; quantidade: number; receita: string }[]
  estoque: { nome: string; atual: string; minimo: string; unidade: string; situacao: string }[]
  fichas: { produto: string; itemEstoque: string; quantidade: string; unidade: string }[]
}

const labels: Record<ReportKey, string> = { resumo: 'Resumo', pedidos: 'Pedidos', produtos: 'Produtos', estoque: 'Estoque', fichas: 'Fichas técnicas' }

export function RelatoriosAdminClient({ data }: { data: ReportData }) {
  const [selected, setSelected] = useState<ReportKey>('resumo')
  const rows = data[selected]

  return (
    <AdminPage>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <h1 className="text-xl font-semibold tracking-tight">Relatórios</h1>
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Relatórios">
          {(Object.keys(labels) as ReportKey[]).map((key) => <Button key={key} type="button" size="sm" intent={selected === key ? 'informational' : 'neutral'} appearance={selected === key ? 'solid' : 'ghost'} role="tab" aria-selected={selected === key} onClick={() => setSelected(key)}>{labels[key]}</Button>)}
        </div>
      </div>
      <div className="mt-5 overflow-x-auto">
        {selected === 'resumo' && <ReportTable headers={['Indicador', 'Valor']} rows={data.resumo.map((row) => [row.indicador, row.valor])} />}
        {selected === 'pedidos' && <ReportTable headers={['Status', 'Pedidos']} rows={data.pedidos.map((row) => [row.status, String(row.quantidade)])} />}
        {selected === 'produtos' && <ReportTable headers={['Produto', 'Quantidade', 'Receita']} rows={data.produtos.map((row) => [row.nome, String(row.quantidade), row.receita])} />}
        {selected === 'estoque' && <ReportTable headers={['Item de estoque', 'Atual', 'Mínimo', 'Situação']} rows={data.estoque.map((row) => [row.nome, `${row.atual} ${row.unidade}`, `${row.minimo} ${row.unidade}`, row.situacao])} />}
        {selected === 'fichas' && <ReportTable headers={['Produto', 'Item de estoque', 'Quantidade', 'Unidade']} rows={data.fichas.map((row) => [row.produto, row.itemEstoque, row.quantidade, row.unidade])} />}
      </div>
    </AdminPage>
  )
}

function ReportTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  if (!rows.length) return <AdminEmptyState title="Sem dados" description="Este relatório será preenchido conforme a operação registrar informações." />
  return <table className="w-full min-w-[520px] text-sm"><thead><tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">{headers.map((header) => <th key={header} className="px-2 py-3 font-medium">{header}</th>)}</tr></thead><tbody className="divide-y">{rows.map((row, index) => <tr key={`${row[0]}-${index}`}>{row.map((cell, cellIndex) => <td key={`${cell}-${cellIndex}`} className={`px-2 py-3 ${cellIndex === 0 ? 'font-medium' : 'text-muted-foreground'}`}>{cell}</td>)}</tr>)}</tbody></table>
}
