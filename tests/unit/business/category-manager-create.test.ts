import {
  act,
  fireEvent,
  screen,
  waitFor,
} from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  actions,
  doces,
  renderManager,
} from './category-manager-test-helpers'

describe('CategoryManager', () => {
  it('keeps Add and empty guidance visible with 44px controls', () => {
    renderManager({ categorias: [], selectedId: '' })

    const add = screen.getByRole('button', { name: 'Adicionar categoria' })
    expect(add).toBeEnabled()
    expect(add).toHaveClass('min-h-11')
    expect(
      screen.getByText('Nenhuma categoria criada. Use Adicionar para começar.')
    ).toBeInTheDocument()
  })

  it('opens create with focus and Escape restores Add', async () => {
    renderManager()

    const add = screen.getByRole('button', { name: 'Adicionar categoria' })
    fireEvent.click(add)
    const input = await screen.findByRole('textbox', { name: 'Nome da nova categoria' })
    expect(input).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Cancelar nova categoria' })).toHaveClass(
      'min-h-11'
    )
    expect(screen.getByRole('button', { name: 'Salvar nova categoria' })).toHaveClass(
      'min-h-11'
    )
    fireEvent.keyDown(input, { key: 'Escape' })
    await waitFor(() => expect(add).toHaveFocus())
  })

  it('creates the trimmed name once, forwards server identity, and restores Add focus', async () => {
    actions.criarCategoria.mockResolvedValueOnce({ id: doces.id, nome: doces.nome })
    const props = renderManager()

    const add = screen.getByRole('button', { name: 'Adicionar categoria' })
    fireEvent.click(add)
    const input = await screen.findByRole('textbox', { name: 'Nome da nova categoria' })
    fireEvent.change(input, { target: { value: '  Doces  ' } })
    fireEvent.submit(input.closest('form')!)

    await waitFor(() => {
      expect(actions.criarCategoria).toHaveBeenCalledTimes(1)
      expect(actions.criarCategoria).toHaveBeenCalledWith('Doces')
      expect(props.onCreated).toHaveBeenCalledWith({ id: doces.id, nome: doces.nome })
      expect(props.onRefresh).toHaveBeenCalledTimes(1)
      expect(add).toHaveFocus()
    })
  })

  it('retains the create draft and inline alert after a failure', async () => {
    actions.criarCategoria.mockRejectedValueOnce(new Error('Nome indisponível'))
    renderManager()

    fireEvent.click(screen.getByRole('button', { name: 'Adicionar categoria' }))
    const input = await screen.findByRole('textbox', { name: 'Nome da nova categoria' })
    fireEvent.change(input, { target: { value: 'Doces' } })
    fireEvent.submit(input.closest('form')!)

    expect(await screen.findByRole('alert')).toHaveTextContent('Nome indisponível')
    expect(input).toHaveValue('Doces')
    expect(input).toHaveAttribute('aria-invalid', 'true')
  })

  it('rejects a blank create draft before a server call', async () => {
    renderManager()

    fireEvent.click(screen.getByRole('button', { name: 'Adicionar categoria' }))
    const input = await screen.findByRole('textbox', { name: 'Nome da nova categoria' })
    fireEvent.change(input, { target: { value: '   ' } })
    fireEvent.submit(input.closest('form')!)

    expect(screen.getByRole('alert')).toHaveTextContent('Informe o nome da categoria')
    expect(actions.criarCategoria).not.toHaveBeenCalled()
  })

  it('marks create busy, disables related controls, and ignores repeat submit', async () => {
    let resolveCreate!: (value: { id: string; nome: string }) => void
    actions.criarCategoria.mockImplementationOnce(
      () => new Promise((resolve) => { resolveCreate = resolve })
    )
    renderManager()

    fireEvent.click(screen.getByRole('button', { name: 'Adicionar categoria' }))
    const input = await screen.findByRole('textbox', { name: 'Nome da nova categoria' })
    fireEvent.change(input, { target: { value: 'Doces' } })
    const form = input.closest('form')!
    fireEvent.submit(form)
    fireEvent.submit(form)

    expect(actions.criarCategoria).toHaveBeenCalledTimes(1)
    expect(form).toHaveAttribute('aria-busy', 'true')
    expect(input).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Salvar nova categoria' })).toBeDisabled()

    await act(async () => resolveCreate({ id: doces.id, nome: doces.nome }))
  })
})
