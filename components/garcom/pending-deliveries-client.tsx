'use client'

import Link from 'next/link'
import { useCallback, useState, useTransition } from 'react'
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
  const itemGroups = groupKitchenItemsByCategory(pedido.itens)

  function handleConfirm() {
    startTransition(async () => {
      await confirmarEntrega(pedido.id)
      onDelivered(pedido.id)
    })
  }

  return (
    <article className="rounded-[var(--radius)] border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Mesa {pedido.mesaNumero}</h2>
          <p className="text-xs text-muted-foreground">
            Aberto há <LiveElapsedTimer startedAt={pedido.criadoEm} />
          </p>
        </div>
        <Button onClick={handleConfirm} disabled={pending}>
          {pending ? 'Confirmando...' : 'Confirmar entrega'}
        </Button>
      </div>

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
  const [pedidos, setPedidos] = useState(initialPedidos)

  const removePedido = useCallback((pedidoId: string) => {
    setPedidos((prev) => prev.filter((p) => p.id !== pedidoId))
  }, [])

  const handleEvent = useCallback((event: KitchenEvent) => {
    if (event.type === 'novo_pedido') {
      const { pedidoId, mesaNumero, itens } = event.payload
      setPedidos((prev) => [
        {
          id: pedidoId,
          mesaNumero,
          status: 'novo' as StatusPedido,
          criadoEm: new Date(),
          itens,
        },
        ...prev,
      ])
    }

    if (event.type === 'status_atualizado' && event.payload.status === 'entregue') {
      removePedido(event.payload.pedidoId)
    }
  }, [removePedido])

  return (
    <>
      <SseListener onEvent={handleEvent} />
      {pedidos.length === 0 ? (
        <div className="rounded-[var(--radius)] border bg-card p-6 space-y-3">
          <p className="font-medium">Nenhuma entrega pendente agora.</p>
          <p className="text-sm text-muted-foreground">
            Quando a cozinha chamar na campainha, os pedidos abertos aparecem aqui.
          </p>
          <Link href="/garcom/mesas" className={cn(buttonVariants())}>
            Abrir mesas
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {pedidos.map((pedido) => (
            <PendingDeliveryCard
              key={pedido.id}
              pedido={pedido}
              onDelivered={removePedido}
            />
          ))}
        </div>
      )}
    </>
  )
}
