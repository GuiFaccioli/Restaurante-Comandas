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

export function AdminPedidosLive({ initialPedidos }: { initialPedidos: CashierOrder[] }) {
  const [pedidos, setPedidos] = useState(initialPedidos)
  const [expandedId, setExpandedId] = useState<string | null>(initialPedidos[0]?.id ?? null)
  const [paymentFormPedidoId, setPaymentFormPedidoId] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<FormaPagamento>('pix')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [lastEvent, setLastEvent] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const pedidosPagos = pedidos.filter((pedido) => pedido.pagamentoStatus === 'pago').length
  const pagamentosPendentes = pedidos.filter((pedido) => pedido.pagamentoStatus === 'pendente').length
  const valorPendente = pedidos
    .filter((pedido) => pedido.pagamentoStatus === 'pendente')
    .reduce((total, pedido) => total + pedido.total, 0)

  const refreshPedidos = useCallback(async () => {
    const response = await fetch('/api/caixa/pedidos', { cache: 'no-store' })
    if (!response.ok) return

    const data = (await response.json()) as { pedidos: CashierOrder[] }
    setPedidos(data.pedidos)
    setExpandedId((current) => {
      if (current === null) return null
      if (current && data.pedidos.some((pedido) => pedido.id === current)) return current
      return data.pedidos[0]?.id ?? null
    })
    setPaymentFormPedidoId((current) => {
      if (current && data.pedidos.some((pedido) => pedido.id === current)) return current
      return null
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
    <div className="space-y-6">
      <SseListener onEvent={handleEvent} />

      <AdminStatsGrid className="xl:grid-cols-3">
        <AdminStatCard label="Pedidos na fila" value={pedidos.length} detail="Pedidos carregados no caixa." />
        <AdminStatCard label="Pagamentos pendentes" value={pagamentosPendentes} detail={formatCurrency(valorPendente)} tone={pagamentosPendentes ? 'warning' : 'success'} />
        <AdminStatCard label="Pagos" value={pedidosPagos} detail="Pedidos já baixados no caixa." />
      </AdminStatsGrid>

      {lastEvent && (
        <div className="rounded-md border border-primary/30 bg-primary/10 px-4 py-3 text-pretty text-sm">
          {lastEvent}
        </div>
      )}

      {pedidos.length === 0 ? (
        <AdminEmptyState
          title="Nenhum pedido encontrado"
          description="Quando uma mesa tiver pedidos confirmados, eles aparecem aqui para conferência e pagamento."
        />
      ) : (
        <AdminPanel
          title="Fila do caixa"
          description="Pedidos entregues aparecem com ação de pagamento; pedidos em preparo permanecem como referência."
        >
        <div className="grid gap-3">
          {pedidos.map((pedido) => {
            const expanded = expandedId === pedido.id
            const paymentFormOpen = paymentFormPedidoId === pedido.id
            const canPay = pedido.status === 'entregue' && pedido.pagamentoStatus === 'pendente'

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
                    <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                      {pedido.pagamentoStatus === 'pago' ? 'Pago' : 'Pagamento pendente'}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setExpandedId(expanded ? null : pedido.id)}
                    >
                      {expanded ? 'Fechar itens' : 'Abrir pedido'}
                    </Button>
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
                        variant="success"
                        className="min-h-11 w-full sm:w-auto"
                        onClick={() => openPaymentForm(pedido)}
                      >
                        Registrar pagamento
                      </Button>
                    )}

                    {paymentFormOpen && (
                      <form
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
                            variant="success"
                            className="min-h-11"
                            disabled={isPending}
                          >
                            {isPending ? 'Registrando...' : 'Registrar pagamento'}
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
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
        </AdminPanel>
      )}
    </div>
  )
}
