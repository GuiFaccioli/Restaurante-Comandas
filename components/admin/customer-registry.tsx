'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'

import {
  buscarClientes,
  criarCliente,
  editarCliente,
  inativarCliente,
  reativarCliente,
  buscarHistoricoPedidosDelivery,
} from '@/lib/actions/clientes'
import { confirmarEntregaDelivery } from '@/lib/actions/pedidos'
import type { CustomerDeliveryOrder } from '@/lib/customer/queries'
import { normalizeDeliveryFee } from '@/lib/customer/validation'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AdminEmptyState, AdminPanel } from '@/components/admin/admin-page'

export type CustomerListItem = {
  id: string
  name: string
  phone: string
  deliveryFee: string
  active: boolean
  addressId: string | null
  street: string | null
  number: string | null
  neighborhood: string | null
  city: string | null
  postalCode: string | null
  complement: string | null
  reference: string | null
  activeDeliveryOrders: CustomerDeliveryOrder[]
}

type CustomerDraft = {
  name: string
  phone: string
  deliveryFee: string
  street: string
  number: string
  neighborhood: string
  city: string
  postalCode: string
  complement: string
  reference: string
}

const emptyDraft: CustomerDraft = {
  name: '', phone: '', deliveryFee: '0,00', street: '', number: '', neighborhood: '', city: '',
  postalCode: '', complement: '', reference: '',
}

function formatDeliveryFee(value: string): string {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount)
}

function formatSnapshotAddress(snapshot: CustomerDeliveryOrder['enderecoSnapshot']): string {
  if (!snapshot) return 'Não informado'
  return [
    [snapshot.rua, snapshot.numero].filter(Boolean).join(', '),
    snapshot.bairro,
    snapshot.cidade,
    snapshot.cep,
    snapshot.complemento ? `Complemento: ${snapshot.complemento}` : null,
    snapshot.referencia ? `Referência: ${snapshot.referencia}` : null,
  ].filter(Boolean).join(' · ') || 'Não informado'
}

function calculateDeliveryTotal(order: CustomerDeliveryOrder): number {
  const itemsTotal = order.itens.reduce((total, item) => total + item.quantidade * Number(item.precoUnitario), 0)
  return itemsTotal + Number(order.taxaEntregaAplicada ?? 0)
}

function formatDeliveryFeeInput(value: string): string {
  if (!value.trim()) return ''
  try {
    return normalizeDeliveryFee(value).replace('.', ',')
  } catch {
    return value.replace('.', ',')
  }
}

function draftFromCustomer(customer: CustomerListItem): CustomerDraft {
  return {
    name: customer.name,
    phone: customer.phone,
    deliveryFee: formatDeliveryFeeInput(customer.deliveryFee),
    street: customer.street ?? '',
    number: customer.number ?? '',
    neighborhood: customer.neighborhood ?? '',
    city: customer.city ?? '',
    postalCode: customer.postalCode ?? '',
    complement: customer.complement ?? '',
    reference: customer.reference ?? '',
  }
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Não foi possível concluir a ação por um erro inesperado.'
}

function isActiveDeliveryOrder(order: CustomerDeliveryOrder) {
  return order.status !== 'entregue' && order.status !== 'cancelado'
}

export function CustomerRegistry({ initialCustomers }: { initialCustomers: CustomerListItem[] }) {
  const [customers, setCustomers] = useState(initialCustomers)
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState<CustomerDraft | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [history, setHistory] = useState<Record<string, CustomerDeliveryOrder[]>>({})
  const [historyOpen, setHistoryOpen] = useState<Record<string, boolean>>({})
  const [historyLoading, setHistoryLoading] = useState<string | null>(null)
  const [deliveryPending, setDeliveryPending] = useState<string | null>(null)

  async function refreshCustomers(term = query) {
    const result = await buscarClientes(term, { page: 1 })
    setCustomers(result)
  }

  async function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSearching(true)
    setError('')
    setSuccess('')
    try {
      await refreshCustomers(query)
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setSearching(false)
    }
  }

  function startCreate() {
    setEditingId(null)
    setDraft(emptyDraft)
    setError('')
    setSuccess('')
  }

  function startEdit(customer: CustomerListItem) {
    setEditingId(customer.id)
    setDraft(draftFromCustomer(customer))
    setError('')
    setSuccess('')
  }

  function closeEditor() {
    setDraft(null)
    setEditingId(null)
    setError('')
  }

  function updateDraft(field: keyof CustomerDraft, value: string) {
    setDraft((current) => current ? { ...current, [field]: value } : current)
  }

  async function submitCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft) return
    const name = draft.name.trim()
    const phone = draft.phone.trim()
    if (!name) return setError('Informe o nome do cliente')
    if (!phone) return setError('Informe o telefone do cliente')
    if (!draft.street.trim()) return setError('Informe a rua')
    if (!draft.number.trim()) return setError('Informe o número')
    let deliveryFee: string
    try {
      deliveryFee = normalizeDeliveryFee(draft.deliveryFee)
    } catch (caught) {
      return setError(errorMessage(caught))
    }

    setPending(true)
    setError('')
    setSuccess('')
    try {
      const input = {
        name,
        phone,
        deliveryFee,
        defaultAddress: {
          street: draft.street,
          number: draft.number,
          neighborhood: draft.neighborhood,
          city: draft.city,
          postalCode: draft.postalCode,
          complement: draft.complement,
          reference: draft.reference,
        },
      }
      if (editingId) {
        await editarCliente({ id: editingId, ...input })
        setSuccess('Cliente atualizado')
      } else {
        await criarCliente(input)
        setSuccess('Cliente criado')
      }
      await refreshCustomers()
      closeEditor()
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setPending(false)
    }
  }

  async function toggleActive(customer: CustomerListItem) {
    setPending(true)
    setError('')
    setSuccess('')
    try {
      if (customer.active) {
        await inativarCliente(customer.id)
        setSuccess('Cliente inativado')
      } else {
        await reativarCliente(customer.id)
        setSuccess('Cliente reativado')
      }
      await refreshCustomers()
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setPending(false)
    }
  }

  async function toggleHistory(customer: CustomerListItem) {
    const open = Boolean(historyOpen[customer.id])
    setHistoryOpen((current) => ({ ...current, [customer.id]: !open }))
    if (open || history[customer.id]) return
    setHistoryLoading(customer.id)
    setError('')
    try {
      const orders = await buscarHistoricoPedidosDelivery(customer.id)
      setHistory((current) => ({ ...current, [customer.id]: orders }))
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setHistoryLoading(null)
    }
  }

  async function markDeliveryDelivered(customerId: string, pedidoId: string) {
    setDeliveryPending(pedidoId)
    setError('')
    setSuccess('')
    try {
      await confirmarEntregaDelivery(pedidoId)
      const orders = await buscarHistoricoPedidosDelivery(customerId)
      setHistory((current) => ({ ...current, [customerId]: orders }))
      setSuccess('Entrega confirmada')
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setDeliveryPending(null)
    }
  }

  const activeDeliveryOrders = customers.flatMap((customer) => {
    const ordersById = new Map(customer.activeDeliveryOrders.map((order) => [order.id, order]))
    for (const order of history[customer.id] ?? []) ordersById.set(order.id, order)

    return [...ordersById.values()]
      .filter(isActiveDeliveryOrder)
      .map((order) => ({ customer, order }))
  })

  return (
    <div className="space-y-6">
      <AdminPanel
        title="Clientes cadastrados"
        description="Um endereço padrão fica salvo em cada cadastro."
        action={<Button type="button" intent="positive" appearance="solid" onClick={startCreate}>Novo cliente</Button>}
      >
        {activeDeliveryOrders.length > 0 ? <section aria-labelledby="active-delivery-orders-title" className="mb-6 rounded-md border border-[var(--primary)]/30 bg-[var(--primary-soft)] p-3">
          <h3 id="active-delivery-orders-title" className="text-sm font-semibold">Pedidos DELIVERY em andamento</h3>
          <div className="mt-2 space-y-2">
            {activeDeliveryOrders.map(({ customer, order }) => <div key={`${customer.id}-${order.id}`}>
              <DeliveryOrderCard customerName={customer.name} customerId={customer.id} order={order} deliveryPending={deliveryPending} onDeliver={markDeliveryDelivered} />
            </div>)}
          </div>
        </section> : null}
        {error ? <p role="alert" className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
        {success ? <p role="status" className="mb-4 rounded-md border border-[var(--success)]/30 bg-[var(--primary-soft)] px-3 py-2 text-sm text-[var(--primary-active)]">{success}</p> : null}
        {draft ? <CustomerForm draft={draft} editing={Boolean(editingId)} pending={pending} onChange={updateDraft} onCancel={closeEditor} onSubmit={submitCustomer} /> : null}
        {customers.length === 0 ? (
          <AdminEmptyState
            title="Nenhum cliente encontrado"
            description={query ? 'A busca não encontrou clientes com esses dados.' : 'Os clientes cadastrados neste restaurante aparecerão aqui.'}
            action={!query ? <Button type="button" intent="positive" appearance="soft" onClick={startCreate}>Cadastrar primeiro cliente</Button> : undefined}
          />
        ) : (
          <div className="divide-y rounded-[var(--radius)] border" aria-label="Lista de clientes">
            {customers.map((customer) => {
              return (
              <article key={customer.id} className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-[var(--ink)]">{customer.name}</h3>
                    <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium">{customer.active ? 'Ativo' : 'Inativo'}</span>
                  </div>
                  <p className="mt-1 text-sm text-[var(--muted)]">{customer.phone}</p>
                  <p className="mt-1 text-sm font-medium text-[var(--primary-active)]">Taxa padrão: {formatDeliveryFee(customer.deliveryFee)}</p>
                </div>
                <div className="text-sm text-[var(--body)]">
                  <p>{customer.street}, {customer.number}</p>
                  <p className="text-[var(--muted)]">{[customer.neighborhood, customer.city].filter(Boolean).join(' · ') || 'Endereço sem bairro ou cidade'}</p>
                </div>
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  {customer.active ? <Link href={`/admin/pedidos/delivery?clienteId=${encodeURIComponent(customer.id)}`} className={buttonVariants({ intent: 'positive', appearance: 'solid', size: 'sm' })} aria-label={`Novo pedido para ${customer.name}`}>Novo pedido</Link> : null}
                  <Button type="button" intent="neutral" appearance="outline" className="min-h-11" onClick={() => void toggleHistory(customer)} aria-expanded={Boolean(historyOpen[customer.id])} aria-label={`${historyOpen[customer.id] ? 'Fechar' : 'Ver'} histórico de ${customer.name}`}>
                    {historyLoading === customer.id ? 'Carregando…' : historyOpen[customer.id] ? 'Fechar histórico' : 'Histórico delivery'}
                  </Button>
                  <Button type="button" intent="informational" appearance="soft" className="min-h-11" onClick={() => startEdit(customer)} aria-label={`Editar ${customer.name}`}>Editar</Button>
                  <Button type="button" intent={customer.active ? 'destructive' : 'positive'} appearance="soft" className="min-h-11" disabled={pending} onClick={() => void toggleActive(customer)} aria-label={`${customer.active ? 'Inativar' : 'Reativar'} ${customer.name}`}>
                    {customer.active ? 'Inativar' : 'Reativar'}
                  </Button>
                </div>
                {historyOpen[customer.id] ? <div className="lg:col-span-3 rounded-md border bg-muted/20 p-3">
                  <h4 className="text-sm font-semibold">Histórico de pedidos DELIVERY</h4>
                  {!history[customer.id] ? <p className="mt-2 text-sm text-muted-foreground">Carregando histórico…</p> : history[customer.id].filter((order) => !isActiveDeliveryOrder(order)).length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Nenhum pedido entregue ou cancelado.</p> : <div className="mt-2 space-y-2">
                    {history[customer.id].filter((order) => !isActiveDeliveryOrder(order)).map((order) => <DeliveryOrderCard key={order.id} customerName={customer.name} customerId={customer.id} order={order} deliveryPending={deliveryPending} onDeliver={markDeliveryDelivered} />)}
                  </div>}
                </div> : null}
              </article>
              )
            })}
          </div>
        )}
      </AdminPanel>

      <AdminPanel title="Buscar clientes" description="Telefone, nome, rua, bairro, cidade ou CEP.">
        <form onSubmit={submitSearch} className="flex flex-col gap-3 sm:flex-row">
          <Input
            aria-label="Buscar clientes"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ex.: (11) 99999-8888 ou Centro"
            className="min-h-11"
          />
          <Button type="submit" intent="informational" appearance="solid" className="min-h-11" disabled={searching}>
            {searching ? 'Buscando…' : 'Buscar'}
          </Button>
        </form>
      </AdminPanel>
    </div>
  )
}

function DeliveryOrderCard({
  customerName,
  customerId,
  order,
  deliveryPending,
  onDeliver,
}: {
  customerName: string
  customerId: string
  order: CustomerDeliveryOrder
  deliveryPending: string | null
  onDeliver: (customerId: string, pedidoId: string) => void
}) {
  return <article className="rounded-md border bg-background p-3">
    <div className="space-y-1 text-sm">
      <p><span className="font-semibold">Cliente:</span> {order.clienteNomeSnapshot ?? customerName}</p>
      <p><span className="font-semibold">ENDEREÇO:</span> {formatSnapshotAddress(order.enderecoSnapshot)}</p>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><span>Pedido #{order.id.slice(0, 8)}</span></div>
    <p className="mt-1 text-xs text-muted-foreground">Status: {order.status}</p>
    {order.itens.length > 0 ? <ul className="mt-2 space-y-1 text-sm">
      {order.itens.map((item, index) => <li key={`${order.id}-${item.nome}-${index}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <span className="font-medium">{item.nome.toUpperCase()}{item.observacao ? <span className="ml-2 text-muted-foreground">· {item.observacao}</span> : null}</span>
        <span className="text-right font-medium">{item.quantidade}x&nbsp;&nbsp;{formatDeliveryFee(String(item.quantidade * Number(item.precoUnitario)))}</span>
      </li>)}
    </ul> : null}
    <div className="mt-2 space-y-1 border-t pt-2 text-right text-sm">
      <p>TAXA DE ENTREGA: {order.taxaEntregaAplicada == null ? 'Não informada' : formatDeliveryFee(order.taxaEntregaAplicada)}</p>
      <p className="font-semibold">TOTAL: {formatDeliveryFee(String(calculateDeliveryTotal(order)))}</p>
    </div>
    {isActiveDeliveryOrder(order) ? <Button type="button" intent="positive" appearance="solid" size="sm" className="mt-2 min-h-10" disabled={deliveryPending === order.id} aria-busy={deliveryPending === order.id} aria-label={`Marcar pedido ${order.id} como entregue`} onClick={() => onDeliver(customerId, order.id)}>{deliveryPending === order.id ? 'Confirmando…' : 'Marcar como entregue'}</Button> : null}
  </article>
}

function CustomerForm({
  draft,
  editing,
  pending,
  onChange,
  onCancel,
  onSubmit,
}: {
  draft: CustomerDraft
  editing: boolean
  pending: boolean
  onChange: (field: keyof CustomerDraft, value: string) => void
  onCancel: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  const field = (name: keyof CustomerDraft, label: string, required = false, type = 'text') => (
    <label className="grid gap-1.5 text-sm" key={name}>
      <span className="font-medium">{label}{required ? ' *' : ''}</span>
      <Input
        aria-label={label}
        type={name === 'deliveryFee' ? 'text' : type}
        inputMode={name === 'deliveryFee' ? 'decimal' : undefined}
        required={required}
        value={name === 'deliveryFee' ? formatDeliveryFeeInput(draft[name]) : draft[name]}
        onChange={(event) => onChange(name, name === 'deliveryFee' ? formatDeliveryFeeInput(event.target.value) : event.target.value)}
        className="min-h-11"
      />
    </label>
  )

  return (
    <form onSubmit={onSubmit} noValidate className="mb-6 space-y-5 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface-muted)] p-4" aria-busy={pending}>
      <div>
        <h3 className="font-heading text-lg font-bold text-[var(--ink)]">{editing ? 'Editar cliente' : 'Novo cliente'}</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">O endereço abaixo será o endereço padrão deste cadastro.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {field('name', 'Nome', true)}
        {field('phone', 'Telefone', true, 'tel')}
        {field('deliveryFee', 'Taxa de entrega padrão')}
      </div>
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-1 text-sm font-semibold sm:col-span-2">Endereço padrão</legend>
        {field('street', 'Rua', true)}
        {field('number', 'Número', true)}
        {field('neighborhood', 'Bairro')}
        {field('city', 'Cidade')}
        {field('postalCode', 'CEP')}
        {field('complement', 'Complemento')}
        {field('reference', 'Referência')}
      </fieldset>
      <p className="text-xs leading-5 text-[var(--muted)]">Endereços adicionais ainda não estão disponíveis neste cadastro.</p>
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" intent="neutral" appearance="ghost" onClick={onCancel} disabled={pending}>Cancelar</Button>
        <Button type="submit" intent="positive" appearance="solid" disabled={pending}>{pending ? 'Salvando…' : editing ? 'Salvar alterações' : 'Salvar cliente'}</Button>
      </div>
    </form>
  )
}
