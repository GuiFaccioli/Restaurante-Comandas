'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { continuarAtendimento, iniciarAtendimento, iniciarNovoAtendimento } from '@/lib/actions/atendimentos'
import type { AtendimentoResumo } from '@/lib/attendance/queries'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { userFacingErrorMessage } from '@/lib/ui/error-messages'

export function MesaAtendimentoGate({ mesaId, mesaNumero, attendances }: { mesaId: string; mesaNumero: number; attendances: AtendimentoResumo[] }) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState(attendances[0]?.id ?? '')
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const pending = attendances.filter((attendance) => attendance.status === 'awaiting_payment')

  function goToAttendance(id: string) {
    router.push(`/garcom/mesa/${mesaId}?atendimentoId=${id}`)
  }

  function run(action: () => Promise<{ id: string }>) {
    setError(null)
    startTransition(async () => {
      try {
        const result = await action()
        goToAttendance(result.id)
      } catch (actionError) {
        setError(userFacingErrorMessage(actionError, 'Não foi possível abrir o atendimento por um erro inesperado.'))
      }
    })
  }

  if (pending.length === 0) {
    return <section className="mx-auto mt-8 max-w-md rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5 text-center shadow-[var(--shadow-card)]"><h2 className="text-lg font-bold text-[var(--ink)]">Mesa {mesaNumero} — Livre</h2><p className="mt-2 text-sm text-[var(--muted)]">Inicie um atendimento para abrir a comanda.</p><Button type="button" intent="positive" appearance="solid" className="mt-5 min-h-11 w-full" disabled={isPending} onClick={() => run(() => iniciarAtendimento(mesaId))}>{isPending ? 'Abrindo atendimento...' : 'Iniciar atendimento'}</Button>{error ? <p role="alert" className="mt-3 text-sm text-[var(--error)]">{error}</p> : null}</section>
  }

  return <>
    <section className="mx-auto mt-8 max-w-md rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]"><h2 className="text-lg font-bold text-[var(--ink)]">Há uma conta pendente nesta mesa</h2><p className="mt-2 text-sm text-[var(--muted)]">Escolha se o novo pedido continua uma conta anterior ou começa um novo atendimento.</p><Button type="button" intent="positive" appearance="solid" className="mt-5 min-h-11 w-full" disabled={isPending} onClick={() => setOpen(true)}>Escolher atendimento</Button>{error ? <p role="alert" className="mt-3 text-sm text-[var(--error)]">{error}</p> : null}</section>
    <Dialog open={open} onOpenChange={(value) => !isPending && setOpen(value)}>
      <DialogContent>
        <DialogHeader><DialogTitle>Há uma conta pendente nesta mesa</DialogTitle><DialogDescription>Mesa {mesaNumero}. Selecione uma conta para continuar ou inicie uma nova sem misturar os pedidos.</DialogDescription></DialogHeader>
        {pending.length > 1 ? <fieldset className="space-y-2"><legend className="text-sm font-semibold">Contas pendentes</legend>{pending.map((attendance) => <label key={attendance.id} className="flex min-h-16 cursor-pointer items-center gap-3 rounded-[var(--radius)] border p-3"><input type="radio" name="atendimento-pendente" value={attendance.id} checked={selectedId === attendance.id} onChange={() => setSelectedId(attendance.id)} /><span className="min-w-0 text-sm"><strong>Conta #{attendance.id.slice(0, 8)}</strong><span className="block text-[var(--muted)]">{attendance.orderCount} pedidos · R$ {attendance.saldoPendente.toFixed(2).replace('.', ',')}</span></span></label>)}</fieldset> : <div className="rounded-[var(--radius)] border bg-[var(--primary-soft)] p-3 text-sm"><strong>Conta #{pending[0].id.slice(0, 8)}</strong><span className="block text-[var(--muted)]">{pending[0].orderCount} pedidos · R$ {pending[0].saldoPendente.toFixed(2).replace('.', ',')}</span></div>}
        <div className="grid gap-3"><Button type="button" intent="positive" appearance="solid" className="min-h-11 w-full" disabled={isPending || !selectedId} onClick={() => run(() => continuarAtendimento(selectedId))}>Continuar atendimento<span className="sr-only"> e adicionar o novo pedido à conta selecionada</span></Button><Button type="button" intent="neutral" appearance="outline" className="min-h-11 w-full" disabled={isPending} onClick={() => run(() => iniciarNovoAtendimento(mesaId))}>Iniciar novo atendimento<span className="sr-only"> e manter a conta anterior separada</span></Button></div>
        <DialogFooter><Button type="button" intent="neutral" appearance="ghost" className="min-h-11" disabled={isPending} onClick={() => setOpen(false)}>Voltar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>
}
