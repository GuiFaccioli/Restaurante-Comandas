import { Badge } from '@/components/ui/badge'
import type { StatusPedido } from '@/lib/db/schema'
import { Check, Circle, CircleX, Clock3, ArrowRight } from 'lucide-react'

const statusConfig: Record<StatusPedido, { label: string; className: string; icon: typeof Circle }> = {
  novo:       { label: 'Aguardando', className: 'bg-[var(--surface-muted)] text-[var(--body)]', icon: Circle },
  em_preparo: { label: 'Em preparo', className: 'bg-[var(--warning-soft)] text-[var(--warning)]', icon: Clock3 },
  pronto:     { label: 'Pronto',     className: 'bg-[var(--success-soft)] text-[var(--success)]', icon: Check },
  entregue:   { label: 'Entregue',   className: 'bg-[var(--info-soft)] text-[var(--info)]', icon: ArrowRight },
  cancelado:  { label: 'Cancelado',  className: 'bg-[var(--error-soft)] text-[var(--error)]', icon: CircleX },
}

export function StatusBadge({ status }: { status: StatusPedido }) {
  const { label, className, icon: Icon } = statusConfig[status]
  return <Badge className={className}><Icon aria-hidden="true" />{label}</Badge>
}
