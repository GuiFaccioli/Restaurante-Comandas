'use client'

import { FormEvent, useCallback, useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'

import { SseListener } from '@/components/cozinha/sse-listener'
import { AdminEmptyState, AdminPanel, AdminStatsGrid, AdminStatCard } from '@/components/admin/admin-page'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { formatPedidoCriadoEm } from '@/lib/date-format'
import { registrarPagamentoPedido } from '@/lib/actions/pedidos'
import type { FormaPagamento } from '@/lib/db/schema'
import type { KitchenEvent } from '@/lib/sse'
import type { CashierOrder } from '@/lib/orders/queries'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

const paymentMethods: Array<{ value: FormaPagamento; label: string }> = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'pix', label: 'Pix' },
  { value: 'credito', label: 'Crédito' },
  { value: 'debito', label: 'Débito' },
  { value: 'outro', label: 'Outro' },
]

type CashierMetric = 'queue' | 'pending' | 'paid'
type QueueFilter = 'todos' | 'cobrar' | 'andamento' | 'pagos'

function isAwaitingPayment(pedido: CashierOrder) {
  return pedido.status === 'entregue' && pedido.pagamentoStatus === 'pendente'
}

const metricCopy: Record<CashierMetric, { title: string; empty: string }> = {
  queue: { title: 'Pedidos na fila', empty: 'Nenhum pedido na fila.' },
  pending: { title: 'Pagamentos pendentes', empty: 'Nenhum pagamento pendente.' },
  paid: { title: 'Pagos', empty: 'Nenhum pedido pago.' },
}

const queueFilterCopy: Record<QueueFilter, { label: string; description: string }> = {
  todos: { label: 'Todos', description: 'Todos os pedidos' },
  cobrar: { label: 'Para cobrar', description: 'Entregues e ainda pendentes' },
  andamento: { label: 'Em andamento', description: 'Ainda não entregues' },
  pagos: { label: 'Concluídos', description: 'Histórico já baixado' },
}

export function AdminPedidosLive({ initialPedidos }: { initialPedidos: CashierOrder[] }) {
  const [pedidos, setPedidos] = useState(initialPedidos)
  const [selectedMetric, setSelectedMetric] = useState<CashierMetric | null>(null)
  const firstPaymentPedido = initialPedidos.find(isAwaitingPayment)
  const [expandedId, setExpandedId] = useState<string | null>(firstPaymentPedido?.id ?? initialPedidos[0]?.id ?? null)
  const [paymentFormPedidoId, setPaymentFormPedidoId] = useState<string | null>(firstPaymentPedido?.id ?? null)
  const [paymentMethod, setPaymentMethod] = useState<FormaPagamento>('pix')
  const [paymentAmount, setPaymentAmount] = useState(firstPaymentPedido?.total.toFixed(2).replace('.', ',') ?? '')
  const [queueFilter, setQueueFilter] = useState<QueueFilter>('cobrar')
  const [searchTerm, setSearchTerm] = useState('')
  const [lastEvent, setLastEvent] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const pedidosPagos = pedidos.filter((pedido) => pedido.pagamentoStatus === 'pago').length
  const pagamentosPendentes = pedidos.filter((pedido) => pedido.pagamentoStatus === 'pendente').length
  const valorPendente = pedidos
    .filter((pedido) => pedido.pagamentoStatus === 'pendente')
    .reduce((total, pedido) => total + pedido.total, 0)
  const selectedPedidos = selectedMetric === 'paid'
    ? pedidos.filter((pedido) => pedido.pagamentoStatus === 'pago')
    : selectedMetric === 'pending'
      ? pedidos.filter((pedido) => pedido.pagamentoStatus === 'pendente')
      : selectedMetric === 'queue'
        ? pedidos
        : []
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase('pt-BR')
  const visiblePedidos = pedidos.filter((pedido) => {
    const matchesFilter = queueFilter === 'todos'
      || (queueFilter === 'cobrar' && pedido.status === 'entregue' && pedido.pagamentoStatus === 'pendente')
      || (queueFilter === 'andamento' && pedido.status !== 'entregue' && pedido.pagamentoStatus === 'pendente')
      || (queueFilter === 'pagos' && pedido.pagamentoStatus === 'pago')
    if (!matchesFilter || !normalizedSearch) return matchesFilter
    return [
      `mesa ${pedido.mesaNumero}`,
      pedido.id,
      ...pedido.itens.map((item) => item.nome),
    ].some((value) => value.toLocaleLowerCase('pt-BR').includes(normalizedSearch))
  }).sort((a, b) => Number(isAwaitingPayment(b)) - Number(isAwaitingPayment(a)))

  const refreshPedidos = useCallback(async () => {
    const response = await fetch('/api/caixa/pedidos', { cache: 'no-store' })
    if (!response.ok) return

    const data = (await response.json()) as { pedidos: CashierOrder[] }
    setPedidos(data.pedidos)
    setExpandedId((current) => {
      if (current === null) return null
      if (current && data.pedidos.some((pedido) => pedido.id === current)) return current
      return data.pedidos.find(isAwaitingPayment)?.id ?? data.pedidos[0]?.id ?? null
    })
    setPaymentFormPedidoId((current) => {
      if (current && data.pedidos.some((pedido) => pedido.id === current && isAwaitingPayment(pedido))) return current
      return data.pedidos.find(isAwaitingPayment)?.id ?? null
    })
  }, [])

  useEffect(() => {
    const interval = window.setInterval(() => {
      void refreshPedidos()
    }, 5000)

    return () => window.clearInterval(interval)
  }, [refreshPedidos])

  const handleEvent = useCallback((event: KitchenEvent) => {
    if (event.type === 'novo_pedido') {
      setLastEvent(`Pedido recebido da Mesa ${event.payload.mesaNumero}`)
      toast.info(`Pedido recebido da Mesa ${event.payload.mesaNumero}`)
      void refreshPedidos()
    }

    if (event.type === 'status_atualizado') {
      setLastEvent(`Pedido ${event.payload.pedidoId.slice(0, 8)} atualizado`)
      toast.info(`Pedido atualizado para ${event.payload.status}`)
      void refreshPedidos()
    }
  }, [refreshPedidos])

  function openPaymentForm(pedido: CashierOrder) {
    setExpandedId(pedido.id)
    setPaymentFormPedidoId(pedido.id)
    setPaymentAmount(pedido.total.toFixed(2).replace('.', ','))
  }

  function toggleMetric(metric: CashierMetric) {
    setSelectedMetric((current) => current === metric ? null : metric)
  }

  function handlePaymentSubmit(event: FormEvent<HTMLFormElement>, pedido: CashierOrder) {
    event.preventDefault()

    startTransition(async () => {
      try {
        await registrarPagamentoPedido({
          pedidoId: pedido.id,
          formaPagamento: paymentMethod,
          valor: paymentAmount,
        })
        toast.success('Pagamento registrado.')
        setPaymentFormPedidoId(null)
        await refreshPedidos()
      } catch (error) {
        console.error('Failed to register payment', error)
        toast.error('Não foi possível registrar o pagamento.')
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <SseListener onEvent={handleEvent} />

      <AdminStatsGrid className="order-4 xl:grid-cols-3">
        <AdminStatCard
          label="Pedidos na fila"
          value={pedidos.length}
          detail="Pedidos carregados no caixa."
          onClick={() => toggleMetric('queue')}
          expanded={selectedMetric === 'queue'}
          controls="cashier-responsibility-panel"
        />
        <AdminStatCard
          label="Pagamentos pendentes"
          value={pagamentosPendentes}
          detail={formatCurrency(valorPendente)}
          tone={pagamentosPendentes ? 'warning' : 'success'}
          onClick={() => toggleMetric('pending')}
          expanded={selectedMetric === 'pending'}
          controls="cashier-responsibility-panel"
        />
        <AdminStatCard
          label="Pagos"
          value={pedidosPagos}
          detail="Pedidos já baixados no caixa."
          onClick={() => toggleMetric('paid')}
          expanded={selectedMetric === 'paid'}
          controls="cashier-responsibility-panel"
        />
      </AdminStatsGrid>

      {selectedMetric ? (
        <div
          id="cashier-responsibility-panel"
          data-testid="cashier-responsibility-panel"
          className="order-5"
        >
          <AdminPanel title={`Responsáveis · ${metricCopy[selectedMetric].title}`}>
            {selectedPedidos.length === 0 ? (
              <AdminEmptyState
                title={metricCopy[selectedMetric].empty}
                description="A lista será atualizada automaticamente quando houver mudanças no caixa."
              />
            ) : (
              <ul className="grid gap-2">
                {selectedPedidos.map((pedido) => {
                  const paidMetric = selectedMetric === 'paid'
                  const responsible = paidMetric
                    ? pedido.pagamento?.registradoPor
                    : pedido.criadoPor
                  const value = paidMetric
                    ? pedido.pagamento?.valor ?? pedido.total
                    : selectedMetric === 'pending'
                      ? pedido.total
                      : null

                  return (
                    <li
                      key={pedido.id}
                      className="grid gap-3 rounded-[var(--radius)] border bg-background p-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center"
                    >
                      <div>
                        <p className="font-semibold">Mesa {pedido.mesaNumero}</p>
                        <p className="text-xs text-muted-foreground">
                          Pedido {pedido.id.slice(0, 8)}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-muted-foreground">
                          {paidMetric ? 'Recebido por' : 'Lançado por'}
                        </p>
                        <p className="truncate font-medium">
                          {responsible?.nome ?? 'Responsável não registrado'}
                        </p>
                      </div>
                      {value !== null ? (
                        <p className="font-semibold sm:text-right">{formatCurrency(value)}</p>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            )}
          </AdminPanel>
        </div>
      ) : null}

      {lastEvent && (
        <div className="order-2 rounded-md border border-primary/30 bg-primary/10 px-4 py-3 text-pretty text-sm">
          {lastEvent}
        </div>
      )}

      <AdminPanel
        className="order-1"
        title="Pagamentos aguardando baixa"
        description="Comece por Para cobrar: são os pedidos entregues que precisam da próxima ação do caixa."
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.45fr)] lg:items-end">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar pedidos">
            {(Object.keys(queueFilterCopy) as QueueFilter[]).map((filter) => {
              const count = filter === 'todos'
                ? pedidos.length
                : filter === 'cobrar'
                  ? pedidos.filter((pedido) => pedido.status === 'entregue' && pedido.pagamentoStatus === 'pendente').length
                  : filter === 'andamento'
                    ? pedidos.filter((pedido) => pedido.status !== 'entregue' && pedido.pagamentoStatus === 'pendente').length
                    : pedidosPagos
              const selected = queueFilter === filter

              return (
                <Button
                  key={filter}
                  type="button"
                  intent={selected ? 'informational' : 'neutral'}
                  appearance={selected ? 'solid' : 'outline'}
                  size="sm"
                  aria-pressed={selected}
                  className="min-h-11"
                  onClick={() => setQueueFilter(filter)}
                >
                  {queueFilterCopy[filter].label} <span className="opacity-75">({count})</span>
                </Button>
              )
            })}
          </div>
          <label className="grid gap-1 text-sm font-medium">
            Buscar mesa ou pedido
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Ex.: Mesa 4 ou 0e09"
              className="min-h-11 rounded-md border border-input bg-background px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {visiblePedidos.length} {visiblePedidos.length === 1 ? 'pedido exibido' : 'pedidos exibidos'} · {queueFilterCopy[queueFilter].description}
        </p>
      </AdminPanel>

      {pedidos.length === 0 ? (
        <AdminEmptyState
          title="Nenhum pedido encontrado"
          description="Quando uma mesa tiver pedidos confirmados, eles aparecem aqui para conferência e pagamento."
        />
      ) : (
        <AdminPanel
          className="order-3"
          title={`Fila do caixa · ${queueFilterCopy[queueFilter].label}`}
          description="Pedidos entregues aparecem com ação de pagamento; pedidos em preparo permanecem como referência."
        >
        {visiblePedidos.length === 0 ? (
          <AdminEmptyState
            title="Nenhum pedido corresponde aos filtros."
            description="Tente Todos, limpe a busca ou aguarde uma nova atualização do caixa."
          />
        ) : (
        <div className="grid gap-3">
          {visiblePedidos.map((pedido) => {
            const expanded = expandedId === pedido.id
            const paymentFormOpen = paymentFormPedidoId === pedido.id
            const canPay = pedido.status === 'entregue' && pedido.pagamentoStatus === 'pendente'
            const level = canPay
              ? { label: 'Ação agora', className: 'bg-[var(--action-positive-soft)] text-[var(--action-positive-foreground)]' }
              : pedido.pagamentoStatus === 'pago'
                ? { label: 'Concluído', className: 'bg-muted text-muted-foreground' }
                : { label: 'Acompanhar', className: 'bg-[var(--action-informational-soft)] text-[var(--action-informational-foreground)]' }

            return (
              <article key={pedido.id} className="space-y-3 rounded-[var(--radius)] border bg-background p-4">
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                  <div className="min-w-0">
                    <p className="text-lg font-semibold">Mesa {pedido.mesaNumero}</p>
                    <p className="text-sm text-muted-foreground">
                      Pedido {pedido.id.slice(0, 8)} · {formatPedidoCriadoEm(pedido.criadoEm)}
                    </p>
                    <p className="mt-2 text-2xl font-bold tracking-[-0.02em]">{formatCurrency(pedido.total)}</p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <StatusBadge status={pedido.status} />
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${level.className}`}>
                      {level.label}
                    </span>
                    <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                      {pedido.pagamentoStatus === 'pago' ? 'Pago' : 'Pagamento pendente'}
                    </span>
                    {!canPay && (
                      <Button
                        type="button"
                        intent="neutral"
                        appearance="outline"
                        size="sm"
                        className="min-h-11"
                        onClick={() => setExpandedId(expanded ? null : pedido.id)}
                      >
                        {expanded ? 'Fechar itens' : 'Ver detalhes'}
                      </Button>
                    )}
                  </div>
                </div>

                {expanded && (
                  <div className="space-y-3">
                    <div>
                      <h2 className="text-sm font-semibold">Itens do pedido</h2>
                      <ul className="mt-2 space-y-1 text-sm">
                        {pedido.itens.map((item, index) => (
                          <li
                            key={`${pedido.id}-${item.nome}-${index}`}
                            className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-3"
                          >
                            <span className="min-w-0 break-words">
                              {item.quantidade}x {item.nome}
                              {item.observacao ? ` · ${item.observacao}` : ''}
                            </span>
                            <span className="font-medium">
                              {formatCurrency(item.quantidade * Number(item.precoUnitario))}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex items-center justify-between border-t pt-3 font-semibold">
                      <span>Total</span>
                      <span>{formatCurrency(pedido.total)}</span>
                    </div>

                    {canPay && !paymentFormOpen && (
                      <Button
                        type="button"
                        intent="positive"
                        appearance="solid"
                        className="min-h-11 w-full sm:w-auto"
                        onClick={() => openPaymentForm(pedido)}
                      >
                        Registrar pagamento
                      </Button>
                    )}

                    {paymentFormOpen && (
                      <form
                        aria-busy={isPending}
                        className="grid gap-3 rounded-md border bg-muted/30 p-3"
                        onSubmit={(event) => handlePaymentSubmit(event, pedido)}
                      >
                        <label className="grid gap-1 text-sm">
                          Forma de pagamento
                          <select
                            value={paymentMethod}
                            onChange={(event) => setPaymentMethod(event.target.value as FormaPagamento)}
                            className="min-h-11 rounded-md border border-input bg-background px-3"
                          >
                            {paymentMethods.map((method) => (
                              <option key={method.value} value={method.value}>
                                {method.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="grid gap-1 text-sm">
                          Valor recebido
                          <input
                            value={paymentAmount}
                            onChange={(event) => setPaymentAmount(event.target.value)}
                            className="min-h-11 rounded-md border border-input bg-background px-3"
                            inputMode="decimal"
                            required
                          />
                        </label>
                        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                          <Button
                            type="submit"
                            intent="positive"
                            appearance="solid"
                            aria-busy={isPending}
                            className="min-h-11"
                            disabled={isPending}
                          >
                            {isPending ? 'Registrando...' : 'Registrar pagamento'}
                          </Button>
                          <Button
                            type="button"
                            intent="neutral"
                            appearance="outline"
                            className="min-h-11"
                            onClick={() => setPaymentFormPedidoId(null)}
                            disabled={isPending}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </article>
            )
          })}
        </div>
        )}
        </AdminPanel>
      )}
    </div>
  )
}
