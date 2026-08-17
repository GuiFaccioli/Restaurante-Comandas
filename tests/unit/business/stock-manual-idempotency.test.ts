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
  adicionarItemManualListaCompra: vi.fn(),
  confirmarItemListaCompra: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: state.refresh }),
}))
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))
vi.mock('@/lib/actions/estoque', () => ({
  adicionarItemManualListaCompra: state.adicionarItemManualListaCompra,
  ajustarEstoqueAtual: state.ajustarEstoqueAtual,
  criarInsumo: vi.fn(),
  editarInsumo: vi.fn(),
  realizarContagemEstoque: state.realizarContagemEstoque,
  registrarEntradaEstoque: state.registrarEntradaEstoque,
  registrarPerdaEstoque: state.registrarPerdaEstoque,
  removerInsumo: vi.fn(),
  salvarFichaTecnica: vi.fn(),
  confirmarItemListaCompra: state.confirmarItemListaCompra,
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
const volumeIngredient = {
  ...ingredient,
  id: 'insumo-volume',
  nome: 'Óleo',
  unidadeBase: 'ml',
  unidadeCompra: 'l',
  estoqueAtual: '2500.000',
  estoqueIdeal: '5000.000',
  estoqueMinimo: '1500.000',
}

function renderStock(insumos = [ingredient]) {
  return render(createElement(EstoqueAdminClient, {
    insumos,
    produtos: [],
    fichas: [],
    initialProdutoId: '',
    shoppingListItems: [],
    view: 'estoque',
  }))
}

function renderShoppingList(shoppingListItems: Array<{
  id: string
  kind: string
  nome: string
  unidade: string
  quantidadeSugerida: string
}> = []) {
  return render(createElement(EstoqueAdminClient, {
    insumos: [],
    produtos: [],
    fichas: [],
    initialProdutoId: '',
    shoppingListItems,
    view: 'lista',
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

describe('manual shopping-list creation idempotency in the UI', () => {
  it('reuses a UUID key when the same failed manual item is retried', async () => {
    state.adicionarItemManualListaCompra
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(undefined)

    renderShoppingList()
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Guardanapos' } })
    fireEvent.change(screen.getByLabelText('Quantidade'), { target: { value: '2' } })
    const submit = screen.getByRole('button', { name: 'Adicionar item' })

    fireEvent.click(submit)
    await waitFor(() => expect(state.adicionarItemManualListaCompra).toHaveBeenCalledTimes(1))
    fireEvent.click(submit)
    await waitFor(() => expect(state.adicionarItemManualListaCompra).toHaveBeenCalledTimes(2))

    expect(state.adicionarItemManualListaCompra).toHaveBeenNthCalledWith(1, {
      nome: 'Guardanapos', quantidade: '2', unidade: 'kg', idempotencyKey: firstKey,
    })
    expect(state.adicionarItemManualListaCompra).toHaveBeenNthCalledWith(2, {
      nome: 'Guardanapos', quantidade: '2', unidade: 'kg', idempotencyKey: firstKey,
    })
  })
})

describe('unified shopping-list operations in the UI', () => {
  const shoppingItems = [
    { id: 'automatic-1', kind: 'automatic', nome: 'Acucar', unidade: 'kg', quantidadeSugerida: '2.000' },
    { id: 'manual-1', kind: 'manual', nome: 'Bandeja', unidade: 'unidade', quantidadeSugerida: '3.000' },
    { id: 'automatic-2', kind: 'automatic', nome: 'Oleo', unidade: 'l', quantidadeSugerida: '1.500' },
  ]

  it('shows manual and automatic items in one alphabetical operational list', () => {
    renderShoppingList([shoppingItems[2], shoppingItems[1], shoppingItems[0]])

    const list = screen.getByLabelText('Itens da lista de compras')
    expect(list.textContent).toContain('Gerado pelo estoque')
    expect(list.textContent).toContain('Adicionado manualmente')
    expect(list.textContent).toContain('Acucar')
    expect(list.textContent).toContain('Bandeja')
    expect(list.textContent).toContain('Oleo')
    expect(list.textContent.indexOf('Acucar')).toBeLessThan(list.textContent.indexOf('Bandeja'))
    expect(list.textContent.indexOf('Bandeja')).toBeLessThan(list.textContent.indexOf('Oleo'))
  })

  it('copies every alphabetical list name, quantity, and unit as TXT', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    renderShoppingList([shoppingItems[1], shoppingItems[2], shoppingItems[0]])

    const text = (screen.getByLabelText('Texto da lista de compras') as HTMLTextAreaElement).value
    expect(text).toBe('Acucar - 2 kg\nBandeja - 3 unidade\nOleo - 1.5 l')
    fireEvent.click(screen.getByRole('button', { name: 'Copiar lista' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(text))
  })

  it('sends the selected compatible receipt unit through automatic confirmation', async () => {
    renderShoppingList([shoppingItems[0]])

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar entrada' }))
    fireEvent.change(screen.getByLabelText('Unidade recebida'), { target: { value: 'g' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))

    await waitFor(() => expect(state.confirmarItemListaCompra).toHaveBeenCalledWith({
      itemId: 'automatic-1',
      receivedQuantity: '2.000',
      receivedUnit: 'g',
      idempotencyKey: firstKey,
    }))
  })
})

describe('manual stock operation idempotency in the UI', () => {
  it('shows kg and liter thresholds in the selected purchase unit when editing', () => {
    renderStock([ingredient, volumeIngredient])

    fireEvent.click(screen.getByRole('button', { name: 'Editar item Bacon' }))
    expect(screen.getByLabelText('Estoque mínimo')).toHaveValue('2')
    expect(screen.getByLabelText('Estoque ideal', { selector: '#editar-insumo-ideal' })).toHaveValue('10')
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    fireEvent.click(screen.getByRole('button', { name: 'Editar item Óleo' }))
    expect(screen.getByLabelText('Estoque mínimo')).toHaveValue('1.5')
    expect(screen.getByLabelText('Estoque ideal', { selector: '#editar-insumo-ideal' })).toHaveValue('5')
  })

  it('shows and submits a current balance in its purchase unit', async () => {
    state.ajustarEstoqueAtual.mockResolvedValue(undefined)
    renderStock()

    fireEvent.click(screen.getByRole('button', { name: 'Editar estoque de Bacon' }))
    const row = screen.getByText('Bacon').closest('tr')
    if (!row) throw new Error('stock row not found')
    expect(within(row).getByLabelText('Quantidade total de Bacon')).toHaveValue('5')
    fireEvent.click(within(row).getByRole('button', { name: 'Confirmar' }))

    await waitFor(() => expect(state.ajustarEstoqueAtual).toHaveBeenCalledWith(
      'insumo-1',
      '5',
      firstKey,
      'kg',
    ))
  })

  it('sends the selected entry unit and rotates the key when that unit changes', async () => {
    state.registrarEntradaEstoque
      .mockRejectedValueOnce(new Error('offline'))
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(undefined)

    renderStock()
    const entry = screen.getByLabelText('Entrada para Bacon')
    fireEvent.change(entry, { target: { value: '500' } })
    fireEvent.change(screen.getByLabelText('Unidade de entrada para Bacon'), {
      target: { value: 'g' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }))
    await waitFor(() => expect(state.registrarEntradaEstoque).toHaveBeenCalledTimes(1))

    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }))
    await waitFor(() => expect(state.registrarEntradaEstoque).toHaveBeenCalledTimes(2))
    expect(state.registrarEntradaEstoque.mock.calls.slice(0, 2)).toEqual([
      ['insumo-1', '500', firstKey, undefined, 'g'],
      ['insumo-1', '500', firstKey, undefined, 'g'],
    ])

    fireEvent.change(screen.getByLabelText('Unidade de entrada para Bacon'), {
      target: { value: 'kg' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }))
    await waitFor(() => expect(state.registrarEntradaEstoque).toHaveBeenCalledTimes(3))
    expect(state.registrarEntradaEstoque).toHaveBeenLastCalledWith(
      'insumo-1',
      '500',
      secondKey,
      undefined,
      'kg',
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
      undefined,
      'kg',
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
      ['insumo-1', '1', 'Vencimento', firstKey, undefined, 'kg'],
      ['insumo-1', '1', 'Vencimento', firstKey, undefined, 'kg'],
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
      ['insumo-1', '2', firstKey, undefined, 'kg'],
      ['insumo-2', '3', secondKey, undefined, 'kg'],
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
      ['insumo-1', '1', 'Vencimento', firstKey, undefined, 'kg'],
      ['insumo-1', '1', 'Vencimento', firstKey, undefined, 'kg'],
    ])

    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'contagem' } })
    fireEvent.change(screen.getByLabelText('Quantidade'), { target: { value: '2' } })
    fireEvent.click(confirm)
    await waitFor(() => expect(state.realizarContagemEstoque).toHaveBeenCalledTimes(1))
    fireEvent.click(confirm)
    await waitFor(() => expect(state.realizarContagemEstoque).toHaveBeenCalledTimes(2))
    expect(state.realizarContagemEstoque.mock.calls).toEqual([
      ['insumo-1', '2', secondKey, undefined, 'kg'],
      ['insumo-1', '2', secondKey, undefined, 'kg'],
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
      ['insumo-1', '8', firstKey, 'kg'],
      ['insumo-1', '8', firstKey, 'kg'],
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
      '5',
      secondKey,
      'kg',
    )
  })
})
