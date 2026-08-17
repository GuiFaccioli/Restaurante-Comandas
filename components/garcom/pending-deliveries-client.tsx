'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState, useTransition } from 'react'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { LiveElapsedTimer } from '@/components/live-elapsed-timer'
import { confirmarEntrega } from '@/lib/actions/pedidos'
import type { StatusPedido } from '@/lib/db/schema'
import { groupKitchenItemsByCategory, type KitchenOrderItem } from '@/lib/kitchen/order-items'
import { userFacingErrorMessage } from '@/lib/ui/error-messages'

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
      } catch (error) {
        setError(userFacingErrorMessage(error, 'Não foi possível confirmar a entrega por um erro inesperado.'))
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
    initialPedidos.filter((pedido) => pedido.status !== 'entregue' && pedido.status !== 'cancelado')
  )
  const [feedback, setFeedback] = useState<string | null>(null)

  useEffect(() => {
    setPedidos(initialPedidos.filter((pedido) => pedido.status !== 'entregue' && pedido.status !== 'cancelado'))
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

  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') router.refresh()
    }
    const interval = window.setInterval(refreshIfVisible, 5000)
    document.addEventListener('visibilitychange', refreshIfVisible)

    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', refreshIfVisible)
    }
  }, [router])

  return (
    <>
      {feedback && (
        <p role="status" className="text-sm font-medium text-[var(--action-positive-foreground)]">
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
