import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'

const actions = vi.hoisted(() => ({
  buscarClientes: vi.fn(),
  criarCliente: vi.fn(),
  editarCliente: vi.fn(),
  inativarCliente: vi.fn(),
  reativarCliente: vi.fn(),
}))

vi.mock('@/lib/actions/clientes', () => actions)

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
}

describe('CustomerRegistry', () => {
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
      name: 'Bia', phone: '11999998888', deliveryFee: '0',
      defaultAddress: expect.objectContaining({ street: 'Rua A', number: '20' }),
    })))
    expect(await screen.findByText('Cliente criado')).toBeInTheDocument()
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
