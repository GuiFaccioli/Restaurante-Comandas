'use client'

import { StatusBadge } from '@/components/status-badge'
import { LiveElapsedTimer } from '@/components/live-elapsed-timer'
import type { StatusPedido } from '@/lib/db/schema'
import { groupKitchenItemsByCategory, type KitchenOrderItem } from '@/lib/kitchen/order-items'

type Pedido = {
  id: string
  mesaNumero: number
  status: StatusPedido
  criadoEm: Date
  itens: KitchenOrderItem[]
}

export function PedidoCard({ pedido }: { pedido: Pedido }) {
  const itemGroups = groupKitchenItemsByCategory(pedido.itens)

  return (
    <div className="border rounded-[var(--radius)] p-3 space-y-2 bg-card">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-bold text-lg">Mesa {pedido.mesaNumero}</p>
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
    </div>
  )
}
