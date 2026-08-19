import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'

const actions = vi.hoisted(() => ({
  buscarClientes: vi.fn(),
  criarCliente: vi.fn(),
  editarCliente: vi.fn(),
  inativarCliente: vi.fn(),
  reativarCliente: vi.fn(),
  buscarHistoricoPedidosDelivery: vi.fn(),
  confirmarEntregaDelivery: vi.fn(),
}))

vi.mock('@/lib/actions/clientes', () => actions)
vi.mock('@/lib/actions/pedidos', () => ({ confirmarEntregaDelivery: actions.confirmarEntregaDelivery }))

import { CustomerRegistry } from '@/components/admin/customer-registry'
import { render } from '@testing-library/react'

const ana = {
  id: 'customer-1',
  name: 'Ana Souza',
  phone: '(11) 99999-8888',
  deliveryFee: '0.00',
  active: true,
  addressId: 'address-1',
  street: 'Rua das Flores',
  number: '10',
  neighborhood: 'Centro',
  city: 'São Paulo',
  postalCode: '01001-000',
  complement: null,
  reference: null,
  activeDeliveryOrders: [],
}

describe('CustomerRegistry', () => {
  it('shows active delivery orders in a global section before customer search', () => {
    render(createElement(CustomerRegistry, { initialCustomers: [{
      ...ana,
      activeDeliveryOrders: [{ id: 'active-order-1', status: 'pronto', criadoEm: '2026-08-18T10:00:00Z', entregueEm: null, total: 64, clienteNomeSnapshot: 'Ana Souza', enderecoSnapshot: { rua: 'Rua do Pedido', numero: '99', bairro: 'Centro', cidade: 'São Paulo', cep: '01000-000', complemento: null, referencia: null }, taxaEntregaAplicada: '15.00', itens: [{ nome: 'Pizza Mussarela', quantidade: 1, precoUnitario: '34.00', observacao: null }, { nome: 'Coca', quantidade: 1, precoUnitario: '15.00', observacao: null }] }],
    }] }))

    const activeSection = screen.getByRole('heading', { name: 'Pedidos DELIVERY em andamento' })
    const searchHeading = screen.getByRole('heading', { name: 'Buscar clientes' })
    expect(activeSection.compareDocumentPosition(searchHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByText('Cliente:', { exact: true }).parentElement).toHaveTextContent('Ana Souza')
    expect(screen.getByText(/Rua do Pedido, 99/)).toBeInTheDocument()
    expect(screen.getByText('PIZZA MUSSARELA')).toBeInTheDocument()
    expect(screen.getByText(/1x\s+R\$\s*34,00/)).toBeInTheDocument()
    expect(screen.getByText('COCA')).toBeInTheDocument()
    expect(screen.getByText(/1x\s+R\$\s*15,00/)).toBeInTheDocument()
    expect(screen.getByText(/TAXA DE ENTREGA: R\$\s*15,00/)).toBeInTheDocument()
    expect(screen.getByText(/TOTAL: R\$\s*64,00/)).toBeInTheDocument()
    expect(screen.getByText(/Pedido #active-o/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Marcar pedido active-order-1 como entregue' })).toBeInTheDocument()
    expect(screen.getAllByText(/Pedido #active-o/)).toHaveLength(1)
  })

  it('refreshes the card in place after marking an active delivery as delivered', async () => {
    actions.confirmarEntregaDelivery.mockResolvedValueOnce(undefined)
    actions.buscarHistoricoPedidosDelivery.mockResolvedValueOnce([
      { id: 'active-order-1', status: 'entregue', criadoEm: '2026-08-18T10:00:00Z', entregueEm: '2026-08-18T11:00:00Z', total: 42, itens: [] },
    ])
    render(createElement(CustomerRegistry, { initialCustomers: [{
      ...ana,
      activeDeliveryOrders: [{ id: 'active-order-1', status: 'pronto', criadoEm: '2026-08-18T10:00:00Z', entregueEm: null, total: 42, clienteNomeSnapshot: 'Ana Souza', enderecoSnapshot: null, taxaEntregaAplicada: '0.00', itens: [] }],
    }] }))

    fireEvent.click(screen.getByRole('button', { name: 'Marcar pedido active-order-1 como entregue' }))

    await waitFor(() => expect(actions.confirmarEntregaDelivery).toHaveBeenCalledWith('active-order-1'))
    expect(await screen.findByText('Entrega confirmada')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Marcar pedido active-order-1 como entregue' })).not.toBeInTheDocument()
    expect(actions.buscarHistoricoPedidosDelivery).toHaveBeenCalledWith('customer-1')
  })

  it('loads delivery history and offers delivery-only completion for active orders', async () => {
    actions.buscarHistoricoPedidosDelivery.mockResolvedValueOnce([
      { id: 'aaa11111-delivery-1', status: 'pronto', criadoEm: '2026-08-18T10:00:00Z', entregueEm: null, total: 42, clienteNomeSnapshot: 'Ana Souza', enderecoSnapshot: { rua: 'Rua Histórica', numero: '10', bairro: 'Bela Vista', cidade: 'São Paulo', cep: '01310-000', complemento: null, referencia: null }, taxaEntregaAplicada: '6.25', itens: [{ nome: 'Pizza', quantidade: 2, precoUnitario: '21.00', observacao: 'Sem cebola' }] },
      { id: 'bbb22222-delivery-2', status: 'entregue', criadoEm: '2026-08-17T10:00:00Z', entregueEm: '2026-08-17T11:00:00Z', total: 20, clienteNomeSnapshot: 'Ana Souza', enderecoSnapshot: { rua: 'Rua Antiga', numero: '5', bairro: 'Centro', cidade: 'São Paulo', cep: '01000-000', complemento: null, referencia: null }, taxaEntregaAplicada: '4.00', itens: [{ nome: 'Refrigerante', quantidade: 1, precoUnitario: '20.00', observacao: null }] },
    ])
    render(createElement(CustomerRegistry, { initialCustomers: [ana] }))

    fireEvent.click(screen.getByRole('button', { name: 'Ver histórico de Ana Souza' }))

    expect(await screen.findByText('Pedido #aaa11111')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Marcar pedido aaa11111-delivery-1 como entregue' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Marcar pedido bbb22222-delivery-2 como entregue' })).not.toBeInTheDocument()
    expect(screen.getByText(/2x/)).toBeInTheDocument()
    expect(screen.getByText(/Rua Histórica, 10/)).toBeInTheDocument()
    expect(screen.getByText(/6,25/)).toBeInTheDocument()
    expect(screen.getByText(/2x\s+R\$\s*42,00/)).toBeInTheDocument()
    expect(screen.getByText(/TAXA DE ENTREGA: R\$\s*6,25/)).toBeInTheDocument()
    expect(screen.getByText(/TOTAL: R\$\s*48,25/)).toBeInTheDocument()
    const itemLists = screen.getAllByRole('list')
    expect(itemLists[0]).toHaveTextContent('2x')
    expect(itemLists[0]).toHaveTextContent('Sem cebola')
    expect(itemLists[0]).toHaveTextContent('2x')
    expect(itemLists[1]).toHaveTextContent('1x')
    expect(itemLists[1]).toHaveTextContent('REFRIGERANTE')
    expect(itemLists[1]).toHaveTextContent('1x R$')

    fireEvent.click(screen.getByRole('button', { name: 'Fechar histórico de Ana Souza' }))

    expect(screen.queryByText('Histórico de pedidos DELIVERY')).not.toBeInTheDocument()
  })

  it('opens and closes the delivery history panel without hiding active orders', async () => {
    actions.buscarHistoricoPedidosDelivery.mockResolvedValueOnce([
      { id: 'history-order-1', status: 'entregue', criadoEm: '2026-08-17T10:00:00Z', entregueEm: '2026-08-17T11:00:00Z', total: 20, itens: [] },
    ])
    render(createElement(CustomerRegistry, { initialCustomers: [{
      ...ana,
      activeDeliveryOrders: [{ id: 'active-order-1', status: 'pronto', criadoEm: '2026-08-18T10:00:00Z', entregueEm: null, total: 42, clienteNomeSnapshot: 'Ana Souza', enderecoSnapshot: null, taxaEntregaAplicada: '0.00', itens: [] }],
    }] }))

    expect(screen.getByText(/Pedido #active-o/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Ver histórico de Ana Souza' }))
    expect(await screen.findByText('Pedido #history-')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Fechar histórico de Ana Souza' }))

    expect(screen.queryByText('Pedido #history-')).not.toBeInTheDocument()
    expect(screen.getByText(/Pedido #active-o/)).toBeInTheDocument()
  })

  it('offers a delivery order from each active customer card', () => {
    render(createElement(CustomerRegistry, { initialCustomers: [ana] }))

    const action = screen.getByRole('link', { name: 'Novo pedido para Ana Souza' })
    expect(action).toHaveAttribute('href', '/admin/pedidos/delivery?clienteId=customer-1')
  })

  it('shows the default delivery fee in the customer summary', () => {
    render(createElement(CustomerRegistry, { initialCustomers: [{ ...ana, deliveryFee: '4.20' }] }))

    expect(screen.getByText('Taxa padrão: R$ 4,20')).toBeInTheDocument()
  })

  it('shows server-side search results and the empty state', async () => {
    actions.buscarClientes.mockResolvedValueOnce([])
    render(createElement(CustomerRegistry, { initialCustomers: [ana] }))

    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar clientes' }), {
      target: { value: 'Centro' },
    })
    fireEvent.submit(screen.getByRole('searchbox', { name: 'Buscar clientes' }).closest('form')!)

    await waitFor(() => expect(actions.buscarClientes).toHaveBeenCalledWith('Centro', { page: 1 }))
    expect(await screen.findByText('Nenhum cliente encontrado')).toBeInTheDocument()
  })

  it('validates required customer and address fields before creating', async () => {
    render(createElement(CustomerRegistry, { initialCustomers: [] }))
    fireEvent.click(screen.getByRole('button', { name: 'Novo cliente' }))
    fireEvent.click(screen.getByRole('button', { name: 'Salvar cliente' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Informe o nome do cliente')
    expect(actions.criarCliente).not.toHaveBeenCalled()
  })

  it('sends zero delivery fee and the default address when creating', async () => {
    actions.criarCliente.mockResolvedValueOnce({ id: 'customer-2' })
    actions.buscarClientes.mockResolvedValueOnce([])
    render(createElement(CustomerRegistry, { initialCustomers: [] }))
    fireEvent.click(screen.getByRole('button', { name: 'Novo cliente' }))
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Bia' } })
    fireEvent.change(screen.getByLabelText('Telefone'), { target: { value: '11999998888' } })
    fireEvent.change(screen.getByLabelText('Rua'), { target: { value: 'Rua A' } })
    fireEvent.change(screen.getByLabelText('Número'), { target: { value: '20' } })
    fireEvent.change(screen.getByLabelText('Taxa de entrega padrão'), { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar cliente' }))

    await waitFor(() => expect(actions.criarCliente).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Bia', phone: '11999998888', deliveryFee: '0.00',
      defaultAddress: expect.objectContaining({ street: 'Rua A', number: '20' }),
    })))
    expect(await screen.findByText('Cliente criado')).toBeInTheDocument()
  })

  it('shows monetary delivery fee formatting and submits Brazilian decimal input normalized', async () => {
    actions.editarCliente.mockResolvedValueOnce(undefined)
    actions.buscarClientes.mockResolvedValueOnce([ana])
    render(createElement(CustomerRegistry, { initialCustomers: [{ ...ana, deliveryFee: '22.50' }] }))

    fireEvent.click(screen.getByRole('button', { name: 'Editar Ana Souza' }))
    const fee = screen.getByLabelText('Taxa de entrega padrão')
    expect(fee).toHaveValue('22,50')
    fireEvent.change(fee, { target: { value: '22' } })
    expect(fee).toHaveValue('22,00')
    fireEvent.change(fee, { target: { value: '22,50' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    await waitFor(() => expect(actions.editarCliente).toHaveBeenCalledWith(expect.objectContaining({ deliveryFee: '22.50' })))
  })

  it('shows the duplicate-phone feedback returned by the server', async () => {
    actions.criarCliente.mockRejectedValueOnce(new Error('Já existe um cliente com este telefone neste restaurante'))
    render(createElement(CustomerRegistry, { initialCustomers: [] }))
    fireEvent.click(screen.getByRole('button', { name: 'Novo cliente' }))
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Bia' } })
    fireEvent.change(screen.getByLabelText('Telefone'), { target: { value: '11999998888' } })
    fireEvent.change(screen.getByLabelText('Rua'), { target: { value: 'Rua A' } })
    fireEvent.change(screen.getByLabelText('Número'), { target: { value: '20' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar cliente' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Já existe um cliente com este telefone neste restaurante')
  })

  it('edits and inactivates an existing customer', async () => {
    actions.editarCliente.mockResolvedValueOnce(undefined)
    actions.inativarCliente.mockResolvedValueOnce(undefined)
    actions.buscarClientes.mockResolvedValueOnce([ana]).mockResolvedValueOnce([ana])
    render(createElement(CustomerRegistry, { initialCustomers: [ana] }))

    fireEvent.click(screen.getByRole('button', { name: 'Editar Ana Souza' }))
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Ana Lima' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))
    await waitFor(() => expect(actions.editarCliente).toHaveBeenCalledWith(expect.objectContaining({ id: 'customer-1', name: 'Ana Lima' })))

    fireEvent.click(screen.getByRole('button', { name: 'Inativar Ana Souza' }))
    await waitFor(() => expect(actions.inativarCliente).toHaveBeenCalledWith('customer-1'))
  })
})
