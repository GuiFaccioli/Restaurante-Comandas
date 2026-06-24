import { db } from '@/lib/db/index'
import { desc, eq } from 'drizzle-orm'
import { pedido, mesa } from '@/lib/db/schema'

export default async function AdminPedidosPage() {
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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Pedidos</h1>
        <p className="text-sm text-muted-foreground">Pedidos persistidos no sistema.</p>
      </div>

      {pedidos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum pedido encontrado.</p>
      ) : (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Mesa</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Criado em</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="px-4 py-3">Mesa {item.mesaNumero}</td>
                  <td className="px-4 py-3">{item.status}</td>
                  <td className="px-4 py-3">{item.criadoEm?.toLocaleString?.() ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
