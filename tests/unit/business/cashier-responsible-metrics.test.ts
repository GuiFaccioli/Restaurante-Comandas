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
  pedidos: [{ id: 'pedido-1', status: 'entregue', criadoEm: '2026-07-13T12:00:00.000Z', entregueEm: '2026-07-13T12:15:00.000Z', total: 48, itens: [{ nome: 'Mussarela', quantidade: 1, precoUnitario: '48.00', observacao: null }] }],
}

const secondAccount: AtendimentoResumo = { ...account, id: 'atendimento-2', mesaNumero: 8, total: 70, saldoPendente: 70, pedidos: [{ ...account.pedidos[0], id: 'pedido-2', total: 70, itens: [{ nome: 'Calabresa', quantidade: 1, precoUnitario: '70.00', observacao: null }] }] }

beforeEach(() => { vi.clearAllMocks(); mocks.registrarPagamentoAtendimento.mockResolvedValue({ status: 'registrado', atendimentoStatus: 'paid' }) })
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('AdminPedidosLive', () => {
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

  it('refreshes and keeps account payment amount based on the selected account', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ contas: [secondAccount] }) })))
    render(createElement(AdminPedidosLive, { initialPedidos: [account, secondAccount] }))
    fireEvent.click(screen.getAllByRole('button', { name: 'Receber pagamento' })[0])
    fireEvent.submit(screen.getByLabelText('Valor recebido').closest('form') as HTMLFormElement)
    await waitFor(() => expect(screen.getByLabelText('Valor recebido')).toHaveValue('70,00'))
    expect(mocks.registrarPagamentoAtendimento).toHaveBeenCalledWith({ atendimentoId: 'atendimento-1', formaPagamento: 'pix', valor: '48,00' })
  })
})
