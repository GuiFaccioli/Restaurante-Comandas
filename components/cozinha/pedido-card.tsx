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
    </div>
  )
}
