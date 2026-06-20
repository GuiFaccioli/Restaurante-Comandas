'use client'
import { useState, useCallback } from 'react'
import { PedidoCard } from './pedido-card'
import { SseListener } from './sse-listener'
import type { StatusPedido } from '@/lib/db/schema'
import type { KitchenEvent } from '@/lib/sse'

type Item = { nome: string; quantidade: number; observacao?: string | null }
type Pedido = { id: string; mesaNumero: number; status: StatusPedido; criadoEm: Date; itens: Item[] }

const COLUMNS: { key: StatusPedido; label: string }[] = [
  { key: 'novo',       label: 'Novos' },
  { key: 'em_preparo', label: 'Em Preparo' },
  { key: 'pronto',     label: 'Prontos' },
  { key: 'entregue',   label: 'Entregues' },
]

export function KanbanBoard({ initialPedidos }: { initialPedidos: Pedido[] }) {
  const [pedidos, setPedidos] = useState(initialPedidos)

  const handleEvent = useCallback((event: KitchenEvent) => {
    if (event.type === 'novo_pedido') {
      const { pedidoId, mesaNumero, itens } = event.payload
      setPedidos((prev) => [
        {
          id: pedidoId,
          mesaNumero,
          status: 'novo' as StatusPedido,
          criadoEm: new Date(),
          itens: itens.map((i: string) => {
            const match = i.match(/^(\d+)x (.+)$/)
            return { quantidade: Number(match?.[1] ?? 1), nome: match?.[2] ?? i }
          }),
        },
        ...prev,
      ])
    }
    if (event.type === 'status_atualizado') {
      const { pedidoId, status } = event.payload
      setPedidos((prev) =>
        prev.map((p) => p.id === pedidoId ? { ...p, status: status as StatusPedido } : p)
      )
    }
  }, [])

  const handleStatusChange = useCallback((pedidoId: string, status: StatusPedido) => {
    setPedidos((prev) => prev.map((p) => p.id === pedidoId ? { ...p, status } : p))
  }, [])

  return (
    <>
      <SseListener onEvent={handleEvent} />
      <div className="grid grid-cols-4 gap-4 h-full">
        {COLUMNS.map((col) => (
          <div key={col.key} className="flex flex-col gap-2">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              {col.label} ({pedidos.filter((p) => p.status === col.key).length})
            </h2>
            <div className="space-y-3 overflow-y-auto">
              {pedidos
                .filter((p) => p.status === col.key)
                .map((p) => (
                  <PedidoCard key={p.id} pedido={p} onStatusChange={handleStatusChange} />
                ))}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
