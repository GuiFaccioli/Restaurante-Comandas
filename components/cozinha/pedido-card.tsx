'use client'
import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/status-badge'
import { atualizarStatus } from '@/lib/actions/pedidos'
import type { StatusPedido } from '@/lib/db/schema'

type Item = { nome: string; quantidade: number; observacao?: string | null }
type Pedido = {
  id: string
  mesaNumero: number
  status: StatusPedido
  criadoEm: Date
  itens: Item[]
}

const nextStatus: Record<StatusPedido, StatusPedido | null> = {
  novo: 'em_preparo',
  em_preparo: 'pronto',
  pronto: 'entregue',
  entregue: null,
}

const nextLabel: Record<StatusPedido, string> = {
  novo: 'Iniciar Preparo',
  em_preparo: 'Marcar Pronto',
  pronto: 'Confirmar Entrega',
  entregue: '',
}

export function PedidoCard({ pedido, onStatusChange }: {
  pedido: Pedido
  onStatusChange: (pedidoId: string, status: StatusPedido) => void
}) {
  const [pending, startTransition] = useTransition()
  const next = nextStatus[pedido.status]

  const elapsed = Math.floor((Date.now() - new Date(pedido.criadoEm).getTime()) / 60000)

  function handleAdvance() {
    if (!next) return
    startTransition(async () => {
      await atualizarStatus(pedido.id, next)
      onStatusChange(pedido.id, next)
    })
  }

  return (
    <div className="border rounded-[var(--radius)] p-3 space-y-2 bg-card">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-bold text-lg">Mesa {pedido.mesaNumero}</p>
          <p className="text-xs text-muted-foreground">{elapsed}min atrás</p>
        </div>
        <StatusBadge status={pedido.status} />
      </div>
      <ul className="text-sm space-y-1">
        {pedido.itens.map((item, i) => (
          <li key={i}>
            <span className="font-medium">{item.quantidade}x {item.nome}</span>
            {item.observacao && (
              <span className="text-xs text-muted-foreground ml-1">({item.observacao})</span>
            )}
          </li>
        ))}
      </ul>
      {next && (
        <Button
          size="lg"
          className="w-full h-12"
          onClick={handleAdvance}
          disabled={pending}
        >
          {pending ? 'Salvando…' : nextLabel[pedido.status]}
        </Button>
      )}
    </div>
  )
}
