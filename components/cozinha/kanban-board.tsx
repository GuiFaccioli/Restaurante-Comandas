'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { PedidoCard } from './pedido-card'
import type { KitchenOrder } from '@/lib/kitchen/queries'

type Pedido = KitchenOrder

export function KanbanBoard({ initialPedidos }: { initialPedidos: Pedido[] }) {
  const [pedidos, setPedidos] = useState(initialPedidos)
  const isRefreshing = useRef(false)

  const refreshPedidos = useCallback(async () => {
    if (isRefreshing.current) return
    isRefreshing.current = true

    try {
      const response = await fetch('/api/cozinha/pedidos', { cache: 'no-store' })
      if (!response.ok) return

      const data = (await response.json()) as { pedidos: Pedido[] }
      setPedidos(data.pedidos)
    } catch {
      // Keep the last known kitchen state while a transient request fails.
    } finally {
      isRefreshing.current = false
    }
  }, [])

  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') void refreshPedidos()
    }
    const interval = window.setInterval(refreshIfVisible, 5000)
    document.addEventListener('visibilitychange', refreshIfVisible)

    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', refreshIfVisible)
    }
  }, [refreshPedidos])

  return (
    <>
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
              <PedidoCard
                key={p.id}
                pedido={{ ...p, criadoEm: new Date(p.criadoEm) }}
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
