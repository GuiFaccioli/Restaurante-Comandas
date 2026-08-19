import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AtendimentoResumo } from '@/lib/attendance/queries'

const mocks = vi.hoisted(() => ({
  registrarPagamentoAtendimento: vi.fn(),
  toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/lib/actions/pedidos', () => ({ registrarPagamentoAtendimento: mocks.registrarPagamentoAtendimento }))
vi.mock('sonner', () => ({ toast: mocks.toast }))

import { AdminPedidosLive } from '@/app/admin/pedidos/client'

const account: AtendimentoResumo = {
  id: 'atendimento-1', mesaId: 'mesa-1', mesaNumero: 4, status: 'awaiting_payment', abertoEm: '2026-07-13T12:00:00.000Z', total: 48, saldoPendente: 48, orderCount: 1, activeOrderCount: 0,
  pedidos: [{ id: 'pedido-1', canal: 'salao', clienteNomeSnapshot: null, enderecoSnapshot: null, taxaEntregaAplicada: null, status: 'entregue', criadoEm: '2026-07-13T12:00:00.000Z', entregueEm: '2026-07-13T12:15:00.000Z', total: 48, itens: [{ nome: 'Mussarela', quantidade: 1, precoUnitario: '48.00', observacao: null }] }],
}

const secondAccount: AtendimentoResumo = { ...account, id: 'atendimento-2', mesaNumero: 8, total: 70, saldoPendente: 70, pedidos: [{ ...account.pedidos[0], id: 'pedido-2', total: 70, itens: [{ nome: 'Calabresa', quantidade: 1, precoUnitario: '70.00', observacao: null }] }] }
const canceledAccount: AtendimentoResumo = { ...account, id: 'atendimento-canceled', status: 'cancelled', total: 0, saldoPendente: 0, pedidos: [{ ...account.pedidos[0], id: 'pedido-canceled', status: 'cancelado', total: 0 }] }
const deliveryAccount: AtendimentoResumo = {
  ...account,
  id: 'atendimento-delivery',
  mesaId: null,
  mesaNumero: null,
  pedidos: [{ ...account.pedidos[0], id: 'pedido-delivery', canal: 'delivery', clienteNomeSnapshot: 'Julio', enderecoSnapshot: { rua: 'Rua do Pedido', numero: '10', bairro: 'Centro', cidade: 'São Paulo', cep: '01000-000', complemento: null, referencia: null }, taxaEntregaAplicada: '15.00', total: 63 }],
  total: 63,
  saldoPendente: 63,
}

beforeEach(() => { vi.clearAllMocks(); mocks.registrarPagamentoAtendimento.mockResolvedValue({ status: 'registrado', atendimentoStatus: 'paid' }) })
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('AdminPedidosLive', () => {
  it('renders delivery accounts without a table and shows operational details', () => {
    render(createElement(AdminPedidosLive, { initialPedidos: [deliveryAccount] }))

    expect(screen.getByText(/DELIVERY · Cliente Julio/)).toBeInTheDocument()
    expect(screen.getByText('DELIVERY')).toBeInTheDocument()
    expect(screen.getByText(/Cliente: Julio/)).toBeInTheDocument()
    expect(screen.getByText(/Rua do Pedido, 10/)).toBeInTheDocument()
    expect(screen.getByText(/Taxa de entrega: R\$\s*15,00/)).toBeInTheDocument()
    expect(screen.getByText(/Status do pedido: entregue/)).toBeInTheDocument()
  })

  it('keeps the cashier focused on account actions', () => {
    render(createElement(AdminPedidosLive, { initialPedidos: [account] }))
    expect(screen.getByText(/Contas aguardando pagamento/)).toBeInTheDocument()
    expect(screen.getByText(/Mesa 4 · Conta/)).toBeInTheDocument()
  })

  it('filters the queue and searches by table', () => {
    render(createElement(AdminPedidosLive, { initialPedidos: [account] }))
    fireEvent.change(screen.getByLabelText('Buscar mesa, conta ou pedido'), { target: { value: '99' } })
    expect(screen.getByText('Nenhuma conta corresponde aos filtros')).toBeInTheDocument()
  })

  it('shows canceled accounts in a dedicated queue', () => {
    render(createElement(AdminPedidosLive, { initialPedidos: [canceledAccount] }))

    fireEvent.click(screen.getByRole('button', { name: 'Cancelados (1)' }))

    expect(screen.getByText(/1 pedido\(s\) · Cancelado/)).toBeInTheDocument()
    expect(screen.getByText(/Mesa 4 · Conta/).closest('article')).toHaveClass('bg-[var(--error-soft)]')
  })

  it('refreshes and keeps account payment amount based on the selected account', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ contas: [secondAccount] }) })))
    render(createElement(AdminPedidosLive, { initialPedidos: [account, secondAccount] }))
    fireEvent.click(screen.getAllByRole('button', { name: 'Receber pagamento' })[0])
    fireEvent.submit(screen.getByLabelText('Valor recebido').closest('form') as HTMLFormElement)
    await waitFor(() => expect(screen.getByLabelText('Valor recebido')).toHaveValue('70,00'))
    expect(mocks.registrarPagamentoAtendimento).toHaveBeenCalledWith({ atendimentoId: 'atendimento-1', formaPagamento: 'pix', valor: '48,00' })
  })
})
