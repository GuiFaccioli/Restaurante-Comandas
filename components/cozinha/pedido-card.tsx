'use client'

import { useState, useTransition } from 'react'
import { StatusBadge } from '@/components/status-badge'
import { LiveElapsedTimer } from '@/components/live-elapsed-timer'
import { Button } from '@/components/ui/button'
import { atualizarStatus } from '@/lib/actions/pedidos'
import type { StatusPedido } from '@/lib/db/schema'
import { groupKitchenItemsByCategory, type KitchenOrderItem } from '@/lib/kitchen/order-items'

type Pedido = {
  id: string
  mesaNumero: number
  status: StatusPedido
  criadoEm: Date
  itens: KitchenOrderItem[]
}

type Props = {
  pedido: Pedido
  onStatusChange: (pedidoId: string, status: StatusPedido) => void
}

const actionByStatus = {
  novo: {
    target: 'em_preparo',
    label: 'Iniciar preparo',
    pendingLabel: 'Iniciando...',
    successMessage: 'Preparo iniciado.',
  },
  em_preparo: {
    target: 'pronto',
    label: 'Marcar pronto',
    pendingLabel: 'Marcando...',
    successMessage: 'Pedido pronto.',
  },
} as const

export function PedidoCard({ pedido, onStatusChange }: Props) {
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)
  const itemGroups = groupKitchenItemsByCategory(pedido.itens)
  const action =
    pedido.status === 'novo' || pedido.status === 'em_preparo'
      ? actionByStatus[pedido.status]
      : null

  function handleStatusUpdate() {
    if (!action) return

    setFeedback(null)
    startTransition(async () => {
      try {
        await atualizarStatus(pedido.id, action.target)
        onStatusChange(pedido.id, action.target)
        setFeedback({ type: 'success', message: action.successMessage })
      } catch {
        setFeedback({ type: 'error', message: 'Não foi possível atualizar.' })
      }
    })
  }

  return (
    <div className="space-y-3 rounded-[var(--radius)] border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-lg font-bold">Mesa {pedido.mesaNumero}</p>
          <p className="text-xs text-muted-foreground">
            Aberto há <LiveElapsedTimer startedAt={pedido.criadoEm} />
          </p>
        </div>
        <StatusBadge status={pedido.status} />
      </div>
      <div className="space-y-3">
        {itemGroups.map((group) => (
          <section key={group.category} aria-label={group.category} className="space-y-1">
            <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {group.category}
            </h3>
            <ul className="space-y-1 text-sm">
              {group.items.map((item, i) => (
                <li key={`${group.category}-${item.nome}-${i}`} className="break-words">
                  <span className="font-medium">
                    {item.quantidade}x {item.nome}
                  </span>
                  {item.observacao && (
                    <span className="text-xs text-muted-foreground ml-1">({item.observacao})</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      {action && (
        <Button
          type="button"
          intent="informational"
          appearance="solid"
          className="min-h-11 w-full"
          aria-busy={isPending}
          disabled={isPending}
          onClick={handleStatusUpdate}
        >
          {isPending ? action.pendingLabel : action.label}
        </Button>
      )}
      {feedback && (
        <p
          role={feedback.type === 'error' ? 'alert' : 'status'}
          className={
            feedback.type === 'error'
              ? 'text-sm text-destructive'
              : 'text-sm text-muted-foreground'
          }
        >
          {feedback.message}
        </p>
      )}
    </div>
  )
}
