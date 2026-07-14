import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import {
  actions,
  bebidas,
  doces,
  pizzas,
  renderManager,
} from './category-manager-test-helpers'

describe('CategoryManager delete', () => {
  it('shows delete only in edit mode and preserves the confirmation', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderManager()

    expect(screen.queryByRole('button', { name: 'Excluir categoria Pizzas' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Editar categoria Pizzas' }))
    fireEvent.click(
      await screen.findByRole('button', { name: 'Excluir categoria Pizzas' })
    )

    expect(confirm).toHaveBeenCalledWith('Excluir a categoria "Pizzas"?')
    expect(actions.removerCategoria).not.toHaveBeenCalled()
    expect(screen.getByRole('textbox', { name: 'Nome da categoria Pizzas' })).toBeInTheDocument()
  })

  it.each([
    {
      categorias: [pizzas, bebidas, doces],
      target: bebidas,
      expectedFocus: 'Editar categoria Doces',
    },
    {
      categorias: [pizzas, bebidas],
      target: bebidas,
      expectedFocus: 'Editar categoria Pizzas',
    },
    {
      categorias: [pizzas],
      target: pizzas,
      expectedFocus: 'Adicionar categoria',
    },
  ])('restores next, previous, or Add focus after deleting $target.nome', async ({
    categorias,
    target,
    expectedFocus,
  }) => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    actions.removerCategoria.mockResolvedValueOnce({ ok: true })
    const props = renderManager({ categorias, selectedId: target.id })

    fireEvent.click(
      screen.getByRole('button', { name: `Editar categoria ${target.nome}` })
    )
    fireEvent.click(
      await screen.findByRole('button', { name: `Excluir categoria ${target.nome}` })
    )

    await waitFor(() => {
      expect(actions.removerCategoria).toHaveBeenCalledWith(target.id)
      expect(props.onDeleted).toHaveBeenCalledWith(target.id)
      expect(props.onRefresh).toHaveBeenCalledTimes(1)
      expect(screen.getByRole('button', { name: expectedFocus })).toHaveFocus()
    })
  })

  it('preserves a different selection and restores its pencil after deletion', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    actions.removerCategoria.mockResolvedValueOnce({ ok: true })
    const props = renderManager({
      categorias: [pizzas, bebidas, doces],
      selectedId: doces.id,
    })

    fireEvent.click(
      screen.getByRole('button', { name: 'Editar categoria Bebidas' })
    )
    fireEvent.click(
      await screen.findByRole('button', { name: 'Excluir categoria Bebidas' })
    )

    await waitFor(() => {
      expect(props.onDeleted).toHaveBeenCalledWith(bebidas.id)
      expect(props.onSelect).not.toHaveBeenCalled()
      expect(
        screen.getByRole('button', { name: 'Editar categoria Doces' })
      ).toHaveFocus()
    })
  })

  it('retains the enabled delete editor and draft when products block deletion', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    actions.removerCategoria.mockResolvedValueOnce({
      ok: false,
      error: 'Remova os produtos antes de excluir a categoria',
    })
    const props = renderManager()

    fireEvent.click(screen.getByRole('button', { name: 'Editar categoria Pizzas' }))
    const input = await screen.findByRole('textbox', { name: 'Nome da categoria Pizzas' })
    fireEvent.change(input, { target: { value: 'Pizzas especiais' } })
    const remove = screen.getByRole('button', { name: 'Excluir categoria Pizzas' })
    const form = remove.closest('form')!
    fireEvent.click(remove)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Remova os produtos antes de excluir a categoria'
    )
    expect(input).toHaveValue('Pizzas especiais')
    expect(form).toHaveAttribute('aria-busy', 'false')
    expect(input).toBeEnabled()
    expect(remove).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Salvar categoria Pizzas' })).toBeEnabled()
    expect(props.onDeleted).not.toHaveBeenCalled()
    expect(props.onRefresh).not.toHaveBeenCalled()
  })

  it('marks delete busy and ignores a second delete attempt', async () => {
    let resolveDelete!: (result: { ok: true }) => void
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    actions.removerCategoria.mockImplementationOnce(
      () => new Promise<{ ok: true }>((resolve) => { resolveDelete = resolve })
    )
    renderManager()

    fireEvent.click(screen.getByRole('button', { name: 'Editar categoria Pizzas' }))
    const remove = await screen.findByRole('button', { name: 'Excluir categoria Pizzas' })
    const form = remove.closest('form')!
    fireEvent.click(remove)
    fireEvent.click(remove)

    expect(actions.removerCategoria).toHaveBeenCalledTimes(1)
    expect(form).toHaveAttribute('aria-busy', 'true')
    expect(remove).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Salvar categoria Pizzas' })).toBeDisabled()

    await act(async () => resolveDelete({ ok: true }))
  })
})
