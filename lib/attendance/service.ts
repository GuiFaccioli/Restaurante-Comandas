import type { StatusAtendimento } from '@/lib/db/schema'

export type AttendanceForTableState = {
  id: string
  status: StatusAtendimento
  total: number
  orderCount: number
  activeOrderCount: number
  abertoEm: string
}

export type MesaOperationalState =
  | 'livre'
  | 'em_atendimento'
  | 'em_atendimento_conta_pendente'
  | 'conta_pendente'

export function deriveMesaOperationalState(
  attendances: AttendanceForTableState[],
): MesaOperationalState {
  const hasOpen = attendances.some((attendance) => attendance.status === 'open')
  const hasPending = attendances.some((attendance) => attendance.status === 'awaiting_payment')

  if (hasOpen && hasPending) return 'em_atendimento_conta_pendente'
  if (hasOpen) return 'em_atendimento'
  if (hasPending) return 'conta_pendente'
  return 'livre'
}

export function mesaOperationalLabel(state: MesaOperationalState): string {
  switch (state) {
    case 'em_atendimento': return 'Em atendimento'
    case 'em_atendimento_conta_pendente': return 'Em atendimento + conta pendente'
    case 'conta_pendente': return 'Conta pendente'
    default: return 'Livre'
  }
}

