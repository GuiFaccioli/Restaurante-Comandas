'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'

import { Button } from '@/components/ui/button'
import { cancelarPedido, confirmarEntrega } from '@/lib/actions/pedidos'
import type { TableOrder } from '@/lib/orders/queries'

type Props = {
  mesaId: string
  initialPedidos: TableOrder[]
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function formatOrderTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function TableOrdersPanel({ mesaId, initialPedidos }: Props) {
  const [pedidos, setPedidos] = useState(initialPedidos)
  const [expandedId, setExpandedId] = useState<string | null>(initialPedidos[0]?.id ?? null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<'cancelar' | 'confirmar' | null>(null)
  const [isPending, startTransition] = useTransition()

  const refreshPedidos = useCallback(async () => {
    const response = await fetch(`/api/garcom/mesa/${mesaId}/pedidos`, {
      cache: 'no-store',
    })

    if (!response.ok) return

    const data = (await response.json()) as { pedidos: TableOrder[] }
    setPedidos(data.pedidos)
    setExpandedId((current) => {
      if (current === null) return null
      if (current && data.pedidos.some((pedido) => pedido.id === current)) return current
      return data.pedidos[0]?.id ?? null
    })
  }, [mesaId])

  useEffect(() => {
    const interval = window.setInterval(() => {
      void refreshPedidos()
    }, 5000)

    return () => window.clearInterval(interval)
  }, [refreshPedidos])

  function handleConfirmarEntrega(pedidoId: string) {
    setPendingId(pedidoId)
    setPendingAction('confirmar')
    startTransition(async () => {
      try {
        await confirmarEntrega(pedidoId)
        await refreshPedidos()
      } finally {
        setPendingId(null)
        setPendingAction(null)
      }
    })
  }

  function handleCancelarPedido(pedidoId: string) {
    setPendingId(pedidoId)
    setPendingAction('cancelar')
    startTransition(async () => {
      try {
        await cancelarPedido(pedidoId)
        await refreshPedidos()
      } finally {
        setPendingId(null)
        setPendingAction(null)
      }
    })
  }

  return (
    <section className="rounded-[var(--radius)] border bg-card p-4 space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Pedidos desta mesa</h2>
      </div>

      {pedidos.length > 0 && (
        <div className="space-y-3">
          {pedidos.map((pedido) => {
            const expanded = expandedId === pedido.id
            const canceling = isPending && pendingId === pedido.id && pendingAction === 'cancelar'
            const confirming = isPending && pendingId === pedido.id && pendingAction === 'confirmar'
            const actionDisabled = pedido.status !== 'novo' || (isPending && pendingId === pedido.id)

            return (
              <article key={pedido.id} className="order-card rounded-md border p-3 space-y-5">
                <div className="order-header flex items-start justify-between gap-3">
                  <span className="font-medium">Pedido: {formatOrderTime(pedido.criadoEm)}</span>
                  <strong>{formatCurrency(pedido.total)}</strong>
                </div>

                <div className="order-status flex justify-end">
                  <span
                    aria-hidden="true"
                    className="status-circle h-3 w-3 rounded-full border border-muted-foreground bg-transparent"
                  />
                </div>

                <div className="order-actions flex w-full items-center gap-2">
                  <div className="flex min-w-0 flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={actionDisabled}
                      onClick={() => handleCancelarPedido(pedido.id)}
                    >
                      {canceling ? 'Cancelando...' : 'Cancelar'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setExpandedId(expanded ? null : pedido.id)}
                    >
                      Itens
                    </Button>
                  </div>
                  <Button
                      type="button"
                      className="ml-auto"
                      variant="success"
                      size="sm"
                      disabled={actionDisabled}
                      onClick={() => handleConfirmarEntrega(pedido.id)}
                    >
                      {confirming ? 'Entregando...' : 'Entregue'}
                    </Button>
                </div>

                {expanded && (
                  <ul className="space-y-1 text-sm">
                    {pedido.itens.map((item, index) => (
                      <li key={`${pedido.id}-${item.nome}-${index}`}>
                        <span className="font-medium">{item.nome}</span>{' '}
                        <span className="text-muted-foreground">Qtd. {item.quantidade}</span>
                        {item.observacao && (
                          <span className="text-muted-foreground"> · {item.observacao}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
