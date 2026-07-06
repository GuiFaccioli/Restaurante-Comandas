'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'

import { Button } from '@/components/ui/button'
import { confirmarEntrega } from '@/lib/actions/pedidos'
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

function statusLabel(status: TableOrder['status']) {
  const labels: Record<TableOrder['status'], string> = {
    novo: 'Aberto',
    em_preparo: 'Em preparo',
    pronto: 'Pronto',
    entregue: 'Entregue',
  }

  return labels[status]
}

export function TableOrdersPanel({ mesaId, initialPedidos }: Props) {
  const [pedidos, setPedidos] = useState(initialPedidos)
  const [expandedId, setExpandedId] = useState<string | null>(initialPedidos[0]?.id ?? null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const refreshPedidos = useCallback(async () => {
    const response = await fetch(`/api/garcom/mesa/${mesaId}/pedidos`, {
      cache: 'no-store',
    })

    if (!response.ok) return

    const data = (await response.json()) as { pedidos: TableOrder[] }
    setPedidos(data.pedidos)
    setExpandedId((current) => {
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
    startTransition(async () => {
      await confirmarEntrega(pedidoId)
      await refreshPedidos()
      setPendingId(null)
    })
  }

  return (
    <section className="rounded-[var(--radius)] border bg-card p-4 space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Pedidos desta mesa</h2>
        <p className="text-sm text-muted-foreground">
          Atualiza automaticamente a cada 5 segundos sem mexer no carrinho.
        </p>
      </div>

      {pedidos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum pedido aberto para esta mesa.</p>
      ) : (
        <div className="space-y-3">
          {pedidos.map((pedido) => {
            const expanded = expandedId === pedido.id

            return (
              <article key={pedido.id} className="rounded-md border p-3 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">Pedido {pedido.id.slice(0, 8)}</p>
                    <p className="text-sm text-muted-foreground">
                      {statusLabel(pedido.status)} · {formatCurrency(pedido.total)}
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setExpandedId(expanded ? null : pedido.id)}
                    >
                      Ver itens
                    </Button>
                    {pedido.status === 'novo' && (
                      <Button
                        type="button"
                        variant="success"
                        size="sm"
                        disabled={isPending && pendingId === pedido.id}
                        onClick={() => handleConfirmarEntrega(pedido.id)}
                      >
                        {isPending && pendingId === pedido.id
                          ? 'Confirmando...'
                          : 'Confirmar entrega'}
                      </Button>
                    )}
                  </div>
                </div>

                {expanded && (
                  <ul className="space-y-1 text-sm">
                    {pedido.itens.map((item, index) => (
                      <li key={`${pedido.id}-${item.nome}-${index}`}>
                        <span className="font-medium">
                          {item.quantidade}x {item.nome}
                        </span>{' '}
                        <span className="text-muted-foreground">
                          {formatCurrency(item.quantidade * Number(item.precoUnitario))}
                        </span>
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
