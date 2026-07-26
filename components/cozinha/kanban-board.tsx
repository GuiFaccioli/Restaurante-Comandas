'use client'

import { useCallback, useState } from 'react'
import { PedidoCard } from './pedido-card'
import { SseListener } from './sse-listener'
import type { StatusPedido } from '@/lib/db/schema'
import type { KitchenEvent } from '@/lib/sse'
import type { KitchenOrderItem } from '@/lib/kitchen/order-items'

type Pedido = {
  id: string
  mesaNumero: number
  status: StatusPedido
  criadoEm: Date
  itens: KitchenOrderItem[]
}

export function KanbanBoard({ initialPedidos }: { initialPedidos: Pedido[] }) {
  const [pedidos, setPedidos] = useState(initialPedidos)

  const handleStatusChange = useCallback((pedidoId: string, status: StatusPedido) => {
    setPedidos((prev) =>
      prev.map((pedido) => (pedido.id === pedidoId ? { ...pedido, status } : pedido))
    )
  }, [])

  const handleEvent = useCallback((event: KitchenEvent) => {
    if (event.type === 'novo_pedido') {
      const { pedidoId, mesaNumero, itens } = event.payload
      setPedidos((prev) => {
        if (prev.some((pedido) => pedido.id === pedidoId)) return prev

        return [
          {
            id: pedidoId,
            mesaNumero,
            status: 'novo' as StatusPedido,
            criadoEm: new Date(),
            itens,
          },
          ...prev,
        ]
      })
    }

    if (event.type === 'status_atualizado') {
      const { pedidoId, status } = event.payload
      if (status === 'entregue' || status === 'cancelado') {
        setPedidos((prev) => prev.filter((p) => p.id !== pedidoId))
      } else if (status === 'novo' || status === 'em_preparo' || status === 'pronto') {
        setPedidos((prev) =>
          prev.map((pedido) =>
            pedido.id === pedidoId ? { ...pedido, status } : pedido
          )
        )
      }
    }
  }, [])

  return (
    <>
      <SseListener onEvent={handleEvent} />
      <div className="h-full space-y-3 overflow-y-auto pr-1">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
            Comandas abertas ({pedidos.length})
          </h2>
        </div>
        {pedidos.length === 0 ? (
          <div className="flex min-h-[10rem] items-center rounded-[var(--radius)] border bg-card p-6 text-sm text-muted-foreground">
            <p className="text-pretty">
              Nenhuma comanda aberta no momento. Quando o garçom confirmar um pedido, ele aparece
              aqui automaticamente.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {pedidos.map((p) => (
              <PedidoCard key={p.id} pedido={p} onStatusChange={handleStatusChange} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
