import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import {
  actions,
  pizzas,
  renderManager,
} from './category-manager-test-helpers'

describe('CategoryManager edit', () => {
  it('keeps create, one edit row, and another edit row mutually exclusive', async () => {
    renderManager()

    fireEvent.click(screen.getByRole('button', { name: 'Editar categoria Pizzas' }))
    expect(
      await screen.findByRole('textbox', { name: 'Nome da categoria Pizzas' })
    ).toHaveFocus()
    for (const name of ['Cancelar edição de Pizzas', 'Salvar categoria Pizzas']) {
      expect(screen.getByRole('button', { name })).toHaveClass('min-h-11')
    }

    fireEvent.click(screen.getByRole('button', { name: 'Adicionar categoria' }))
    expect(
      await screen.findByRole('textbox', { name: 'Nome da nova categoria' })
    ).toHaveFocus()
    expect(screen.queryByRole('textbox', { name: 'Nome da categoria Pizzas' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Editar categoria Bebidas' }))
    expect(
      await screen.findByRole('textbox', { name: 'Nome da categoria Bebidas' })
    ).toHaveFocus()
    expect(screen.queryByRole('textbox', { name: 'Nome da nova categoria' })).toBeNull()
  })

  it('Escape cancels rename and restores the same pencil', async () => {
    renderManager()
    const pencil = screen.getByRole('button', { name: 'Editar categoria Pizzas' })
    expect(pencil).toHaveClass('size-11')
    fireEvent.click(pencil)

    const input = await screen.findByRole('textbox', { name: 'Nome da categoria Pizzas' })
    expect(input).toHaveValue('Pizzas')
    expect(input).toHaveFocus()
    fireEvent.keyDown(input, { key: 'Escape' })

    expect(actions.editarCategoria).not.toHaveBeenCalled()
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Editar categoria Pizzas' })
      ).toHaveFocus()
    })
  })

  it('renames once while busy and restores the same pencil on success', async () => {
    let resolveRename!: () => void
    actions.editarCategoria.mockImplementationOnce(
      () => new Promise<void>((resolve) => { resolveRename = resolve })
    )
    renderManager()

    const pencil = screen.getByRole('button', { name: 'Editar categoria Pizzas' })
    fireEvent.click(pencil)
    const input = await screen.findByRole('textbox', { name: 'Nome da categoria Pizzas' })
    fireEvent.change(input, { target: { value: '  Massas  ' } })
    const form = input.closest('form')!
    fireEvent.submit(form)
    fireEvent.submit(form)

    expect(actions.editarCategoria).toHaveBeenCalledTimes(1)
    expect(actions.editarCategoria).toHaveBeenCalledWith(pizzas.id, 'Massas')
    expect(form).toHaveAttribute('aria-busy', 'true')
    expect(input).toBeDisabled()

    await act(async () => resolveRename())
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Editar categoria Pizzas' })
      ).toHaveFocus()
    })
  })

  it('retains rename draft and alert after failure', async () => {
    actions.editarCategoria.mockRejectedValueOnce(new Error('Nome indisponível'))
    renderManager()

    fireEvent.click(screen.getByRole('button', { name: 'Editar categoria Bebidas' }))
    const input = await screen.findByRole('textbox', { name: 'Nome da categoria Bebidas' })
    fireEvent.change(input, { target: { value: 'Bebidas geladas' } })
    fireEvent.submit(input.closest('form')!)

    expect(await screen.findByRole('alert')).toHaveTextContent('Nome indisponível')
    expect(input).toHaveValue('Bebidas geladas')
    expect(screen.getByRole('button', { name: 'Salvar categoria Bebidas' })).toBeInTheDocument()
  })

  it('rejects blank drafts in create and rename before a server call', async () => {
    renderManager()

    fireEvent.click(screen.getByRole('button', { name: 'Adicionar categoria' }))
    const createInput = await screen.findByRole('textbox', { name: 'Nome da nova categoria' })
    fireEvent.change(createInput, { target: { value: '   ' } })
    fireEvent.submit(createInput.closest('form')!)
    expect(screen.getByRole('alert')).toHaveTextContent('Informe o nome da categoria')
    expect(actions.criarCategoria).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Editar categoria Pizzas' }))
    const editInput = await screen.findByRole('textbox', { name: 'Nome da categoria Pizzas' })
    fireEvent.change(editInput, { target: { value: '   ' } })
    fireEvent.submit(editInput.closest('form')!)
    expect(screen.getByRole('alert')).toHaveTextContent('Informe o nome da categoria')
    expect(actions.editarCategoria).not.toHaveBeenCalled()
  })
})
