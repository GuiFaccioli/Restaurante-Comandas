'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState, useTransition } from 'react'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { SseListener } from '@/components/cozinha/sse-listener'
import { LiveElapsedTimer } from '@/components/live-elapsed-timer'
import { confirmarEntrega } from '@/lib/actions/pedidos'
import type { StatusPedido } from '@/lib/db/schema'
import type { KitchenEvent } from '@/lib/sse'
import { groupKitchenItemsByCategory, type KitchenOrderItem } from '@/lib/kitchen/order-items'

type Pedido = {
  id: string
  mesaNumero: number
  status: StatusPedido
  criadoEm: Date
  itens: KitchenOrderItem[]
}

function PendingDeliveryCard({
  pedido,
  onDelivered,
}: {
  pedido: Pedido
  onDelivered: (pedidoId: string) => void
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const itemGroups = groupKitchenItemsByCategory(pedido.itens)

  function handleConfirm() {
    setError(null)
    startTransition(async () => {
      try {
        await confirmarEntrega(pedido.id)
        onDelivered(pedido.id)
      } catch {
        setError('Não foi possível confirmar.')
      }
    })
  }

  return (
    <article className="space-y-3 rounded-[var(--radius)] border bg-card p-4">
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-bold">Mesa {pedido.mesaNumero}</h2>
          <p className="text-xs text-muted-foreground">
            Aberto há <LiveElapsedTimer startedAt={pedido.criadoEm} />
          </p>
        </div>
        <Button
          intent="positive"
          appearance="solid"
          aria-busy={pending}
          onClick={handleConfirm}
          disabled={pending}
          className="min-h-11 w-full sm:w-auto"
        >
          {pending ? 'Confirmando...' : 'Confirmar entrega'}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="space-y-3">
        {itemGroups.map((group) => (
          <section key={group.category} aria-label={group.category} className="space-y-1">
            <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {group.category}
            </h3>
            <ul className="text-sm space-y-1">
              {group.items.map((item, i) => (
                <li key={`${group.category}-${item.nome}-${i}`}>
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
    </article>
  )
}

export function PendingDeliveriesClient({ initialPedidos }: { initialPedidos: Pedido[] }) {
  const router = useRouter()
  const [pedidos, setPedidos] = useState(() =>
    initialPedidos.filter((pedido) => pedido.status === 'pronto')
  )
  const [feedback, setFeedback] = useState<string | null>(null)

  useEffect(() => {
    setPedidos(initialPedidos.filter((pedido) => pedido.status === 'pronto'))
  }, [initialPedidos])

  const removePedido = useCallback((pedidoId: string) => {
    setPedidos((prev) => prev.filter((p) => p.id !== pedidoId))
  }, [])

  const handleDelivered = useCallback(
    (pedidoId: string) => {
      removePedido(pedidoId)
      setFeedback('Entrega confirmada.')
    },
    [removePedido]
  )

  const handleEvent = useCallback((event: KitchenEvent) => {
    if (event.type !== 'status_atualizado') return

    if (event.payload.status === 'pronto') {
      router.refresh()
    } else if (
      event.payload.status === 'entregue' ||
      event.payload.status === 'cancelado'
    ) {
      removePedido(event.payload.pedidoId)
    }
  }, [removePedido, router])

  return (
    <>
      <SseListener onEvent={handleEvent} />
      {feedback && (
        <p role="status" className="text-sm text-muted-foreground">
          {feedback}
        </p>
      )}
      {pedidos.length === 0 ? (
        <div className="space-y-3 rounded-[var(--radius)] border bg-card p-6">
          <p className="font-medium">Nenhuma entrega pendente agora.</p>
          <p className="text-pretty text-sm text-muted-foreground">
            Quando a cozinha chamar na campainha, os pedidos abertos aparecem aqui.
          </p>
          <Link
            href="/garcom/mesas"
            className={cn(
              buttonVariants({
                intent: 'neutral',
                appearance: 'solid',
                className: 'min-h-11',
              }),
              'w-full sm:w-auto'
            )}
          >
            Abrir mesas
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {pedidos.map((pedido) => (
            <PendingDeliveryCard
              key={pedido.id}
              pedido={pedido}
              onDelivered={handleDelivered}
            />
          ))}
        </div>
      )}
    </>
  )
}
