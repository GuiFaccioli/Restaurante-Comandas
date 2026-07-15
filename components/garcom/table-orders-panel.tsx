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
  const [expandedIds, setExpandedIds] = useState<string[]>(
    initialPedidos[0]?.id ? [initialPedidos[0].id] : []
  )
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
    setExpandedIds((current) => {
      if (current.length === 0) return []

      const visiblePedidoIds = new Set(data.pedidos.map((pedido) => pedido.id))
      const stillVisible = current.filter((pedidoId) => visiblePedidoIds.has(pedidoId))

      return stillVisible.length > 0 ? stillVisible : data.pedidos[0]?.id ? [data.pedidos[0].id] : []
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

  function toggleExpanded(pedidoId: string) {
    setExpandedIds((current) =>
      current.includes(pedidoId)
        ? current.filter((expandedPedidoId) => expandedPedidoId !== pedidoId)
        : [...current, pedidoId]
    )
  }

  return (
    <div className="space-y-3">
      {pedidos.length === 0 ? null : (
         <div className="space-y-3">
          {pedidos.map((pedido) => {
            const expanded = expandedIds.includes(pedido.id)
            const canceling = isPending && pendingId === pedido.id && pendingAction === 'cancelar'
            const confirming = isPending && pendingId === pedido.id && pendingAction === 'confirmar'
            const actionDisabled = pedido.status !== 'novo' || (isPending && pendingId === pedido.id)

            return (
              <article key={pedido.id} className="order-card space-y-5 rounded-md border p-3">
                <div className="order-header flex items-start justify-between gap-3">
                  <span className="font-medium">Pedido: {formatOrderTime(pedido.criadoEm)}</span>
                  <strong>{formatCurrency(pedido.total)}</strong>
                </div>

                {expanded && (
                  <ul className="order-items space-y-1 text-sm">
                    {pedido.itens.map((item, index) => (
                      <li key={`${pedido.id}-${item.nome}-${index}`} className="break-words">
                        <span className="font-medium">{item.nome}</span>{' '}
                        <span className="text-muted-foreground">Qtd. {item.quantidade}</span>
                        {item.observacao && (
                          <span className="text-muted-foreground"> · {item.observacao}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="order-actions flex w-full items-center gap-2">
                  <div className="flex min-w-0 flex-wrap gap-2">
                    <Button
                      type="button"
                      intent="destructive"
                      appearance="soft"
                      size="sm"
                      className="min-h-11"
                      aria-busy={canceling}
                      disabled={actionDisabled}
                      onClick={() => handleCancelarPedido(pedido.id)}
                    >
                      {canceling ? 'Cancelando...' : 'Cancelar'}
                    </Button>
                    <Button
                      type="button"
                      intent="neutral"
                      appearance="outline"
                      size="sm"
                      className="min-h-11"
                      onClick={() => toggleExpanded(pedido.id)}
                    >
                      Itens
                    </Button>
                  </div>
                  <Button
                    type="button"
                    className="ml-auto min-h-11"
                    intent="positive"
                    appearance="solid"
                    size="sm"
                    aria-busy={confirming}
                    disabled={actionDisabled}
                    onClick={() => handleConfirmarEntrega(pedido.id)}
                  >
                    {confirming ? 'Entregando...' : 'Entregue'}
                  </Button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
