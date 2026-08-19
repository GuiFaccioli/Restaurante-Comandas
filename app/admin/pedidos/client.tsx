'use client'

import { FormEvent, useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'

import { AdminEmptyState, AdminPanel } from '@/components/admin/admin-page'
import { Button } from '@/components/ui/button'
import { formatPedidoCriadoEm } from '@/lib/date-format'
import { registrarPagamentoAtendimento } from '@/lib/actions/pedidos'
import type { FormaPagamento, StatusAtendimento } from '@/lib/db/schema'
import type { AtendimentoResumo } from '@/lib/attendance/queries'
import { TenantEventListener } from '@/components/tenant-event-listener'
import type { TenantEvent } from '@/lib/tenant-events'
import { userFacingErrorMessage } from '@/lib/ui/error-messages'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function formatDeliveryAddress(snapshot: Record<string, string | null> | null) {
  if (!snapshot) return 'Endereço não informado'
  return [
    [snapshot.rua, snapshot.numero].filter(Boolean).join(', '),
    snapshot.bairro,
    snapshot.cidade,
    snapshot.cep,
    snapshot.complemento ? `Complemento: ${snapshot.complemento}` : null,
    snapshot.referencia ? `Referência: ${snapshot.referencia}` : null,
  ].filter(Boolean).join(' · ') || 'Endereço não informado'
}

const paymentMethods: Array<{ value: FormaPagamento; label: string }> = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'pix', label: 'Pix' },
  { value: 'credito', label: 'Crédito' },
  { value: 'debito', label: 'Débito' },
  { value: 'outro', label: 'Outro' },
]

type QueueFilter = 'todos' | 'cobrar' | 'andamento' | 'pagos' | 'cancelados'

function canReceivePayment(account: AtendimentoResumo) {
  return account.status === 'awaiting_payment' && account.saldoPendente > 0
}

function accountLabel(status: StatusAtendimento) {
  if (status === 'open') return 'Atendimento atual'
  if (status === 'awaiting_payment') return 'Aguardando pagamento'
  if (status === 'paid') return 'Pago'
  return 'Cancelado'
}

export function AdminPedidosLive({ initialPedidos }: { initialPedidos: AtendimentoResumo[] }) {
  const [contas, setContas] = useState(initialPedidos)
  const latest = useRef(initialPedidos)
  const [expandedId, setExpandedId] = useState<string | null>(initialPedidos[0]?.id ?? null)
  const [paymentAccountId, setPaymentAccountId] = useState<string | null>(initialPedidos.find(canReceivePayment)?.id ?? null)
  const [paymentMethod, setPaymentMethod] = useState<FormaPagamento>('pix')
  const firstPayment = initialPedidos.find(canReceivePayment)
  const [paymentAmount, setPaymentAmount] = useState(firstPayment?.saldoPendente.toFixed(2).replace('.', ',') ?? '')
  const [queueFilter, setQueueFilter] = useState<QueueFilter>('cobrar')
  const [searchTerm, setSearchTerm] = useState('')
  const [isPending, startTransition] = useTransition()
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase('pt-BR')

  const visibleContas = contas.filter((account) => {
    const matchesFilter = queueFilter === 'todos'
      || (queueFilter === 'cobrar' && canReceivePayment(account))
      || (queueFilter === 'andamento' && account.status === 'open')
      || (queueFilter === 'pagos' && account.status === 'paid')
      || (queueFilter === 'cancelados' && account.status === 'cancelled')
    if (!matchesFilter || !normalizedSearch) return matchesFilter
    return [
      account.mesaNumero === null ? 'delivery' : `mesa ${account.mesaNumero}`,
      account.id,
      ...account.pedidos.flatMap((order) => [order.id, order.clienteNomeSnapshot ?? '', ...order.itens.map((item) => item.nome)]),
    ].some((value) => value.toLocaleLowerCase('pt-BR').includes(normalizedSearch))
  }).sort((a, b) => Number(canReceivePayment(b)) - Number(canReceivePayment(a)))

  const refreshContas = useCallback(async () => {
    const response = await fetch('/api/caixa/pedidos', { cache: 'no-store' })
    if (!response.ok) return
    const data = (await response.json()) as { contas: AtendimentoResumo[] }
    latest.current = data.contas
    setContas(data.contas)
    setExpandedId((current) => current && data.contas.some((account) => account.id === current) ? current : data.contas[0]?.id ?? null)
    setPaymentAccountId((current) => current && data.contas.some((account) => account.id === current && canReceivePayment(account)) ? current : data.contas.find(canReceivePayment)?.id ?? null)
  }, [])

  const handleTenantEvent = useCallback((event: TenantEvent) => {
    if (event.type === 'attendance_updated') void refreshContas()
  }, [refreshContas])

  useEffect(() => {
    const account = latest.current.find((item) => item.id === paymentAccountId)
    setPaymentAmount(account?.saldoPendente.toFixed(2).replace('.', ',') ?? '')
  }, [paymentAccountId])

  useEffect(() => {
    const refreshIfVisible = () => { if (document.visibilityState === 'visible') void refreshContas() }
    const interval = window.setInterval(refreshIfVisible, 5000)
    document.addEventListener('visibilitychange', refreshIfVisible)
    return () => { window.clearInterval(interval); document.removeEventListener('visibilitychange', refreshIfVisible) }
  }, [refreshContas])

  function handlePaymentSubmit(event: FormEvent<HTMLFormElement>, account: AtendimentoResumo) {
    event.preventDefault()
    startTransition(async () => {
      try {
        const result = await registrarPagamentoAtendimento({ atendimentoId: account.id, formaPagamento: paymentMethod, valor: paymentAmount })
        toast.success(result.atendimentoStatus === 'paid' ? 'Pagamento concluído.' : 'Pagamento parcial registrado.')
        setPaymentAccountId(null)
        await refreshContas()
      } catch (error) {
        toast.error(userFacingErrorMessage(error, 'Não foi possível registrar o pagamento por um erro inesperado.'))
      }
    })
  }

  return <div className="flex flex-col gap-6">
    <TenantEventListener onEvent={handleTenantEvent} />
    <AdminPanel title="Contas aguardando pagamento" description="As cobranças são agrupadas por atendimento, não apenas pela mesa.">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.45fr)] lg:items-end">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar contas">
          {(Object.keys({ todos: 1, cobrar: 1, andamento: 1, pagos: 1, cancelados: 1 }) as QueueFilter[]).map((filter) => {
            const count = filter === 'todos' ? contas.length : filter === 'cobrar' ? contas.filter(canReceivePayment).length : filter === 'andamento' ? contas.filter((account) => account.status === 'open').length : filter === 'pagos' ? contas.filter((account) => account.status === 'paid').length : contas.filter((account) => account.status === 'cancelled').length
            return <Button key={filter} type="button" intent={queueFilter === filter ? 'informational' : 'neutral'} appearance={queueFilter === filter ? 'solid' : 'outline'} size="sm" className="min-h-11" aria-pressed={queueFilter === filter} onClick={() => setQueueFilter(filter)}>{filter === 'cobrar' ? 'Para cobrar' : filter === 'andamento' ? 'Em atendimento' : filter === 'pagos' ? 'Pagos' : filter === 'cancelados' ? 'Cancelados' : 'Todas'} ({count})</Button>
          })}
        </div>
        <label className="grid gap-1 text-sm font-medium">Buscar mesa, conta ou pedido<input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Ex.: Mesa 4 ou 0e09" className="min-h-11 rounded-md border border-input bg-background px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring" /></label>
      </div>
    </AdminPanel>

    {contas.length === 0 ? <AdminEmptyState title="Nenhuma conta encontrada" description="Quando todos os pedidos de um atendimento forem entregues, a conta aparecera aqui automaticamente." /> : <AdminPanel title="Contas do restaurante" description={`${visibleContas.length} conta(s) exibida(s) pelo filtro atual.`}>
      {visibleContas.length === 0 ? <AdminEmptyState title="Nenhuma conta corresponde aos filtros" description="Tente outro filtro ou limpe a busca." /> : <div className="grid gap-3">{visibleContas.map((account) => {
        const expanded = expandedId === account.id
        const paymentOpen = paymentAccountId === account.id
        const firstDeliveryOrder = account.pedidos.find((order) => order.canal === 'delivery')
        const accountTitle = account.mesaNumero === null
          ? `DELIVERY · Cliente ${firstDeliveryOrder?.clienteNomeSnapshot ?? 'não identificado'}`
          : `Mesa ${account.mesaNumero} · Conta`
        return <article key={account.id} className={`space-y-3 rounded-[var(--radius)] border p-4 ${account.status === 'cancelled' ? 'border-[var(--error)]/35 bg-[var(--error-soft)]' : 'bg-background'}`}>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start"><div><p className="text-lg font-semibold">{accountTitle} #{account.id.slice(0, 8)}</p><p className="text-sm text-muted-foreground">{account.orderCount} pedido(s) · {accountLabel(account.status)} · aberta {formatPedidoCriadoEm(account.abertoEm)}</p><p className="mt-2 text-2xl font-bold">{formatCurrency(account.total)}</p><p className="text-sm text-muted-foreground">Pago: {formatCurrency(account.total - account.saldoPendente)} · Saldo pendente: {formatCurrency(account.saldoPendente)}</p></div><div className="flex flex-wrap gap-2"><Button type="button" intent="neutral" appearance="outline" size="sm" className="min-h-11" onClick={() => setExpandedId(expanded ? null : account.id)}>{expanded ? 'Fechar pedidos' : 'Ver pedidos'}</Button>{canReceivePayment(account) ? <Button type="button" intent="positive" appearance="solid" size="sm" className="min-h-11" onClick={() => { setPaymentAccountId(account.id); setExpandedId(account.id) }}>Receber pagamento</Button> : null}</div></div>
          {expanded ? <div className="space-y-3 border-t pt-3"><h2 className="text-sm font-semibold">Pedidos desta conta</h2>{account.pedidos.map((order) => <div key={order.id} className="rounded-[var(--radius)] border p-3"><div className="flex flex-wrap justify-between gap-2 text-sm font-semibold"><span>Pedido #{order.id.slice(0, 8)}</span><span>{formatCurrency(order.total)}</span></div>{order.canal === 'delivery' ? <div className="mt-2 space-y-1 text-sm"><p className="font-semibold">DELIVERY</p><p>Cliente: {order.clienteNomeSnapshot ?? 'Não informado'}</p><p>Endereço: {formatDeliveryAddress(order.enderecoSnapshot)}</p><p>Taxa de entrega: {order.taxaEntregaAplicada == null ? 'Não informada' : formatCurrency(Number(order.taxaEntregaAplicada))}</p></div> : null}<p className="mt-2 text-sm text-muted-foreground">Status do pedido: {order.status}</p><ul className="mt-2 space-y-1 text-sm">{order.itens.map((item, index) => <li key={`${order.id}-${index}`} className="min-w-0 break-words">{item.quantidade}x {item.nome}{item.observacao ? ` · ${item.observacao}` : ''}</li>)}</ul></div>)}{paymentOpen ? <form aria-busy={isPending} className="grid gap-3 rounded-md border bg-muted/30 p-3" onSubmit={(event) => handlePaymentSubmit(event, account)}><label className="grid gap-1 text-sm">Forma de pagamento<select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as FormaPagamento)} className="min-h-11 rounded-md border border-input bg-background px-3">{paymentMethods.map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}</select></label><label className="grid gap-1 text-sm">Valor recebido<input value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} className="min-h-11 rounded-md border border-input bg-background px-3" inputMode="decimal" required /></label><div className="flex flex-col gap-2 sm:flex-row"><Button type="submit" intent="positive" appearance="solid" className="min-h-11" aria-busy={isPending} disabled={isPending}>{isPending ? 'Registrando...' : 'Confirmar pagamento'}</Button><Button type="button" intent="neutral" appearance="outline" className="min-h-11" onClick={() => setPaymentAccountId(null)} disabled={isPending}>Cancelar</Button></div></form> : null}</div> : null}
        </article>
      })}</div>}
    </AdminPanel>}
  </div>
}
