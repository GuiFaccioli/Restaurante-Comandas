'use client'
import { useCallback, useState } from 'react'
import { SseListener } from '@/components/cozinha/sse-listener'
import { toast } from 'sonner'
import type { KitchenEvent } from '@/lib/sse'
import type { StatusPedido } from '@/lib/db/schema'
import { formatPedidoCriadoEm } from '@/lib/date-format'

type Item = { nome: string; quantidade: number; observacao?: string | null }

type Pedido = {
  id: string
  status: StatusPedido
  criadoEm: string
  mesaNumero: number
  itens: Item[]
}

export function AdminPedidosLive({ initialPedidos }: { initialPedidos: Pedido[] }) {
  const [pedidos, setPedidos] = useState(initialPedidos)
  const [lastEvent, setLastEvent] = useState<string | null>(null)

  const handleEvent = useCallback((event: KitchenEvent) => {
    if (event.type === 'novo_pedido') {
      const { pedidoId, mesaNumero, itens } = event.payload
      const novoPedido: Pedido = {
        id: pedidoId,
        mesaNumero,
        status: 'novo',
        criadoEm: new Date().toISOString(),
        itens: itens.map((item) => ({
          quantidade: item.quantidade,
          nome: item.nome,
          observacao: item.observacao,
        })),
      }

      setPedidos((prev) => [novoPedido, ...prev])
      const message = `Pedido recebido da Mesa ${mesaNumero}`
      setLastEvent(message)
      toast.info(message)
    }

    if (event.type === 'status_atualizado') {
      const { pedidoId, status } = event.payload
      setPedidos((prev) => prev.map((p) => (p.id === pedidoId ? { ...p, status: status as StatusPedido } : p)))
      const message = `Pedido ${pedidoId.slice(0, 8)} atualizado para ${status}`
      setLastEvent(message)
      toast.info(message)
    }
  }, [])

  return (
    <div className="space-y-4">
      <SseListener onEvent={handleEvent} />

      {lastEvent && (
        <div className="rounded-md border border-primary/30 bg-primary/10 px-4 py-3 text-sm">
          {lastEvent}
        </div>
      )}

      {pedidos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum pedido encontrado.</p>
      ) : (
        <div className="rounded-md border overflow-hidden">
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
                  <td className="px-4 py-3">{formatPedidoCriadoEm(item.criadoEm)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
