import { createElement } from 'react'
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  refresh: vi.fn(),
  registrarEntradaEstoque: vi.fn(),
  ajustarEstoqueAtual: vi.fn(),
  registrarPerdaEstoque: vi.fn(),
  realizarContagemEstoque: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: state.refresh }),
}))
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))
vi.mock('@/lib/actions/estoque', () => ({
  ajustarEstoqueAtual: state.ajustarEstoqueAtual,
  criarInsumo: vi.fn(),
  editarInsumo: vi.fn(),
  realizarContagemEstoque: state.realizarContagemEstoque,
  registrarEntradaEstoque: state.registrarEntradaEstoque,
  registrarPerdaEstoque: state.registrarPerdaEstoque,
  removerInsumo: vi.fn(),
  salvarFichaTecnica: vi.fn(),
}))

import { EstoqueAdminClient } from '@/app/admin/estoque/client'

const firstKey = '11111111-1111-4111-8111-111111111111'
const secondKey = '22222222-2222-4222-8222-222222222222'
const thirdKey = '33333333-3333-4333-8333-333333333333'
const fourthKey = '44444444-4444-4444-8444-444444444444'
const fifthKey = '55555555-5555-4555-8555-555555555555'
const sixthKey = '66666666-6666-4666-8666-666666666666'
const generatedKeys = [firstKey, secondKey, thirdKey, fourthKey, fifthKey, sixthKey]
const ingredient = {
  id: 'insumo-1',
  nome: 'Bacon',
  unidadeBase: 'g',
  unidadeCompra: 'kg',
  fatorCompraParaBase: '1000.000',
  estoqueAtual: '5000.000',
  estoqueIdeal: '10000.000',
  estoqueMinimo: '2000.000',
  custoUnitario: '0.2000',
}
const secondIngredient = {
  ...ingredient,
  id: 'insumo-2',
  nome: 'Queijo',
}

function renderStock(insumos = [ingredient]) {
  return render(createElement(EstoqueAdminClient, {
    insumos,
    produtos: [],
    fichas: [],
    initialProdutoId: '',
    view: 'estoque',
  }))
}

beforeEach(() => {
  vi.resetAllMocks()
  let generatedKeyIndex = 0
  vi.spyOn(globalThis.crypto, 'randomUUID')
    .mockImplementation(() => generatedKeys[generatedKeyIndex++] as `${string}-${string}-${string}-${string}-${string}`)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('manual stock operation idempotency in the UI', () => {
  it('reuses an entry key for the same failed payload and rotates it when the payload changes', async () => {
    state.registrarEntradaEstoque
      .mockRejectedValueOnce(new Error('offline'))
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(undefined)

    renderStock()
    const entry = screen.getByLabelText('Entrada para Bacon')
    fireEvent.change(entry, { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }))
    await waitFor(() => expect(state.registrarEntradaEstoque).toHaveBeenCalledTimes(1))

    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }))
    await waitFor(() => expect(state.registrarEntradaEstoque).toHaveBeenCalledTimes(2))
    expect(state.registrarEntradaEstoque.mock.calls.slice(0, 2)).toEqual([
      ['insumo-1', '2', firstKey],
      ['insumo-1', '2', firstKey],
    ])

    fireEvent.change(entry, { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }))
    await waitFor(() => expect(state.registrarEntradaEstoque).toHaveBeenCalledTimes(3))
    expect(state.registrarEntradaEstoque).toHaveBeenLastCalledWith(
      'insumo-1',
      '3',
      secondKey,
    )
  })

  it('disables the entry button while pending and a double click sends one request', async () => {
    let resolveEntry: (() => void) | undefined
    state.registrarEntradaEstoque.mockImplementation(() => new Promise<void>((resolve) => {
      resolveEntry = resolve
    }))

    renderStock()
    fireEvent.change(screen.getByLabelText('Entrada para Bacon'), {
      target: { value: '2' },
    })
    const submit = screen.getByRole('button', { name: 'Registrar' })
    fireEvent.click(submit)
    fireEvent.click(submit)

    expect(submit).toBeDisabled()
    expect(state.registrarEntradaEstoque).toHaveBeenCalledTimes(1)
    expect(state.registrarEntradaEstoque).toHaveBeenCalledWith(
      'insumo-1',
      '2',
      firstKey,
    )

    await act(async () => resolveEntry?.())
  })

  it('keeps movement details open and the same intent when close/reopen is attempted pending', async () => {
    let rejectMovement: ((reason: Error) => void) | undefined
    state.registrarPerdaEstoque
      .mockImplementationOnce(() => new Promise<void>((_resolve, reject) => {
        rejectMovement = reject
      }))
      .mockResolvedValueOnce(undefined)

    renderStock()
    const summary = screen.getByText('Registrar movimentação')
    fireEvent.click(summary)
    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'perda' } })
    fireEvent.change(screen.getByLabelText('Quantidade'), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText('Motivo da perda'), {
      target: { value: 'Vencimento' },
    })
    const confirm = screen.getByRole('button', { name: 'Confirmar' })
    const details = summary.closest('details')
    if (!details) throw new Error('movement details not found')

    fireEvent.click(confirm)
    expect(confirm).toBeDisabled()
    fireEvent.click(summary)
    expect(details).toHaveAttribute('open')
    details.open = false
    fireEvent(details, new Event('toggle'))
    expect(details).toHaveAttribute('open')

    await act(async () => rejectMovement?.(new Error('offline')))
    await waitFor(() => expect(confirm).toBeEnabled())
    fireEvent.click(confirm)
    await waitFor(() => expect(state.registrarPerdaEstoque).toHaveBeenCalledTimes(2))
    expect(state.registrarPerdaEstoque.mock.calls).toEqual([
      ['insumo-1', '1', 'Vencimento', firstKey],
      ['insumo-1', '1', 'Vencimento', firstKey],
    ])
  })

  it('creates a new movement key whenever a relevant failed payload field changes', async () => {
    state.registrarEntradaEstoque.mockRejectedValue(new Error('offline'))
    state.registrarPerdaEstoque.mockRejectedValue(new Error('offline'))

    renderStock([ingredient, secondIngredient])
    fireEvent.click(screen.getByText('Registrar movimentação'))
    const type = screen.getByLabelText('Tipo')
    const selectedIngredient = screen.getByLabelText('Insumo')
    const quantity = screen.getByLabelText('Quantidade')
    fireEvent.change(quantity, { target: { value: '1' } })
    const confirm = screen.getByRole('button', { name: 'Confirmar' })

    fireEvent.click(confirm)
    await waitFor(() => expect(state.registrarEntradaEstoque).toHaveBeenCalledTimes(1))
    fireEvent.change(screen.getByLabelText('Custo total (opcional)'), {
      target: { value: '10' },
    })
    fireEvent.click(confirm)
    await waitFor(() => expect(state.registrarEntradaEstoque).toHaveBeenCalledTimes(2))
    fireEvent.change(quantity, { target: { value: '2' } })
    fireEvent.click(confirm)
    await waitFor(() => expect(state.registrarEntradaEstoque).toHaveBeenCalledTimes(3))
    fireEvent.change(selectedIngredient, { target: { value: 'insumo-2' } })
    fireEvent.click(confirm)
    await waitFor(() => expect(state.registrarEntradaEstoque).toHaveBeenCalledTimes(4))
    fireEvent.change(type, { target: { value: 'perda' } })
    fireEvent.change(screen.getByLabelText('Motivo da perda'), {
      target: { value: 'Vencimento' },
    })
    fireEvent.click(confirm)
    await waitFor(() => expect(state.registrarPerdaEstoque).toHaveBeenCalledTimes(1))
    fireEvent.change(screen.getByLabelText('Motivo da perda'), {
      target: { value: 'Avaria' },
    })
    fireEvent.click(confirm)
    await waitFor(() => expect(state.registrarPerdaEstoque).toHaveBeenCalledTimes(2))

    expect([
      ...state.registrarEntradaEstoque.mock.calls.map((call) => call[2]),
      ...state.registrarPerdaEstoque.mock.calls.map((call) => call[3]),
    ]).toEqual(generatedKeys)
  })

  it('blocks every conflicting row while one stock mutation is pending', async () => {
    let resolveEntry: (() => void) | undefined
    state.registrarEntradaEstoque.mockImplementationOnce(() => new Promise<void>((resolve) => {
      resolveEntry = resolve
    })).mockResolvedValueOnce(undefined)

    renderStock([ingredient, secondIngredient])
    const firstEntry = screen.getByLabelText('Entrada para Bacon')
    const secondEntry = screen.getByLabelText('Entrada para Queijo')
    fireEvent.change(firstEntry, { target: { value: '2' } })
    fireEvent.change(secondEntry, { target: { value: '3' } })
    const registerButtons = screen.getAllByRole('button', { name: 'Registrar' })

    fireEvent.click(registerButtons[0])
    expect(secondEntry).toBeDisabled()
    expect(registerButtons[1]).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Editar estoque de Queijo' })).toBeDisabled()
    fireEvent.click(registerButtons[1])
    expect(state.registrarEntradaEstoque).toHaveBeenCalledTimes(1)

    await act(async () => resolveEntry?.())
    await waitFor(() => expect(registerButtons[1]).toBeEnabled())
    fireEvent.click(registerButtons[1])
    await waitFor(() => expect(state.registrarEntradaEstoque).toHaveBeenCalledTimes(2))
    expect(state.registrarEntradaEstoque.mock.calls).toEqual([
      ['insumo-1', '2', firstKey],
      ['insumo-2', '3', secondKey],
    ])
  })

  it('keeps keys across loss and count retries and rotates after each success', async () => {
    state.registrarPerdaEstoque
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(undefined)
    state.realizarContagemEstoque
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(undefined)

    renderStock()
    fireEvent.click(screen.getByText('Registrar movimentação'))
    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'perda' } })
    fireEvent.change(screen.getByLabelText('Quantidade'), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText('Motivo da perda'), {
      target: { value: 'Vencimento' },
    })
    const confirm = screen.getByRole('button', { name: 'Confirmar' })

    fireEvent.click(confirm)
    await waitFor(() => expect(state.registrarPerdaEstoque).toHaveBeenCalledTimes(1))
    fireEvent.click(confirm)
    await waitFor(() => expect(state.registrarPerdaEstoque).toHaveBeenCalledTimes(2))
    expect(state.registrarPerdaEstoque.mock.calls).toEqual([
      ['insumo-1', '1', 'Vencimento', firstKey],
      ['insumo-1', '1', 'Vencimento', firstKey],
    ])

    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'contagem' } })
    fireEvent.change(screen.getByLabelText('Quantidade'), { target: { value: '2' } })
    fireEvent.click(confirm)
    await waitFor(() => expect(state.realizarContagemEstoque).toHaveBeenCalledTimes(1))
    fireEvent.click(confirm)
    await waitFor(() => expect(state.realizarContagemEstoque).toHaveBeenCalledTimes(2))
    expect(state.realizarContagemEstoque.mock.calls).toEqual([
      ['insumo-1', '2', secondKey],
      ['insumo-1', '2', secondKey],
    ])
  })

  it('keeps an adjustment key after error and starts a new key after cancel', async () => {
    state.ajustarEstoqueAtual
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(undefined)

    renderStock()
    fireEvent.click(screen.getByRole('button', { name: 'Editar estoque de Bacon' }))
    let row = screen.getByText('Bacon').closest('tr')
    if (!row) throw new Error('stock row not found')
    fireEvent.change(within(row).getByLabelText('Quantidade total de Bacon'), {
      target: { value: '8' },
    })
    fireEvent.click(within(row).getByRole('button', { name: 'Confirmar' }))
    await waitFor(() => expect(state.ajustarEstoqueAtual).toHaveBeenCalledTimes(1))
    fireEvent.click(within(row).getByRole('button', { name: 'Confirmar' }))
    await waitFor(() => expect(state.ajustarEstoqueAtual).toHaveBeenCalledTimes(2))
    expect(state.ajustarEstoqueAtual.mock.calls.slice(0, 2)).toEqual([
      ['insumo-1', '8', firstKey],
      ['insumo-1', '8', firstKey],
    ])

    fireEvent.click(screen.getByRole('button', { name: 'Editar estoque de Bacon' }))
    row = screen.getByText('Bacon').closest('tr')
    if (!row) throw new Error('stock row not found')
    fireEvent.click(within(row).getByRole('button', { name: 'Cancelar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Editar estoque de Bacon' }))
    row = screen.getByText('Bacon').closest('tr')
    if (!row) throw new Error('stock row not found')
    fireEvent.click(within(row).getByRole('button', { name: 'Confirmar' }))
    await waitFor(() => expect(state.ajustarEstoqueAtual).toHaveBeenCalledTimes(3))
    expect(state.ajustarEstoqueAtual).toHaveBeenLastCalledWith(
      'insumo-1',
      '5000.000',
      secondKey,
    )
  })
})
