// app/(garcom)/pedidos/page.tsx
import { db } from '@/lib/db/index'
import { desc, eq } from 'drizzle-orm'
import { pedido, mesa } from '@/lib/db/schema'
import { StatusBadge } from '@/components/status-badge'

export default async function PedidosPage() {
  const pedidos = await db
    .select({
      id: pedido.id,
      status: pedido.status,
      criadoEm: pedido.criadoEm,
      mesaNumero: mesa.numero,
    })
    .from(pedido)
    .innerJoin(mesa, eq(pedido.mesaId, mesa.id))
    .orderBy(desc(pedido.criadoEm))
    .limit(20)

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4">Pedidos Recentes</h1>
      <div className="space-y-3">
        {pedidos.map((p) => (
          <div key={p.id} className="border rounded-[var(--radius)] p-3 flex justify-between items-center">
            <div>
              <p className="font-medium">Mesa {p.mesaNumero}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(p.criadoEm).toLocaleTimeString('pt-BR')}
              </p>
            </div>
            <StatusBadge status={p.status} />
          </div>
        ))}
      </div>
    </div>
  )
}
