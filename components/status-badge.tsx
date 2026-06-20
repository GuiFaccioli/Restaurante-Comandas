import { Badge } from '@/components/ui/badge'
import type { StatusPedido } from '@/lib/db/schema'

const statusConfig: Record<StatusPedido, { label: string; className: string }> = {
  novo:       { label: 'Novo',       className: 'bg-foreground text-background' },
  em_preparo: { label: 'Em Preparo', className: 'bg-amber-500 text-white' },
  pronto:     { label: 'Pronto',     className: 'bg-green-600 text-white' },
  entregue:   { label: 'Entregue',   className: 'bg-muted text-muted-foreground' },
}

export function StatusBadge({ status }: { status: StatusPedido }) {
  const { label, className } = statusConfig[status]
  return <Badge className={className}>{label}</Badge>
}
