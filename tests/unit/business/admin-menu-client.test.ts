import { createElement } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CategoryManagerProps } from '@/components/admin/category-manager'

const state = vi.hoisted(() => ({
  categoryProps: undefined as CategoryManagerProps | undefined,
  refresh: vi.fn(),
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: state.refresh }) }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/components/admin/category-manager', () => ({
  CategoryManager: (props: CategoryManagerProps) => {
    state.categoryProps = props
    return createElement('div', { 'data-testid': 'category-manager' })
  },
}))
vi.mock('@/components/admin/produto-form', () => ({
  ProdutoForm: ({ categoriaId, open }: { categoriaId: string; open: boolean }) =>
    open
      ? createElement('div', {
          'data-testid': 'product-form',
          'data-category-id': categoriaId,
        })
      : null,
}))
vi.mock('@/lib/actions/produtos', () => ({ removerProduto: vi.fn(), toggleDisponivel: vi.fn() }))

import { MenuAdminClient } from '@/app/admin/menu/client'

const lanches = { id: 'cat-1', nome: 'Lanches', ordem: 0, produtos: [] }
const bebidas = { id: 'cat-2', nome: 'Bebidas', ordem: 1, produtos: [] }
const doces = { id: 'cat-3', nome: 'Doces', ordem: 2, produtos: [] }

beforeEach(() => {
  state.categoryProps = undefined
  vi.clearAllMocks()
})
afterEach(cleanup)

describe('MenuAdminClient category selection', () => {
  it('uses unique empty-state copy and an accessible disabled reason', () => {
    render(createElement(MenuAdminClient, { categorias: [] }))

    const newProduct = screen.getByRole('button', { name: 'Novo produto' })
    expect(newProduct).toBeDisabled()
    expect(newProduct).toHaveAccessibleDescription('Selecione ou crie uma categoria para habilitar Novo produto.')
    expect(screen.getByRole('heading', { name: 'Crie sua primeira categoria' })).toBeInTheDocument()
    expect(screen.getByText('Crie uma categoria para começar a cadastrar produtos.')).toBeInTheDocument()
  })

  it('selects the server-created id immediately and opens product form for it', () => {
    render(createElement(MenuAdminClient, { categorias: [] }))

    act(() => state.categoryProps!.onCreated({ id: doces.id, nome: doces.nome }))

    const newProduct = screen.getByRole('button', { name: 'Novo produto' })
    expect(newProduct).toBeEnabled()
    expect(state.categoryProps!.selectedId).toBe(doces.id)
    fireEvent.click(newProduct)
    expect(screen.getByTestId('product-form')).toHaveAttribute('data-category-id', doces.id)
  })

  it('preserves the created selection when refreshed props contain it', async () => {
    const view = render(createElement(MenuAdminClient, { categorias: [] }))
    act(() => state.categoryProps!.onCreated({ id: doces.id, nome: doces.nome }))
    view.rerender(createElement(MenuAdminClient, { categorias: [doces] }))
    await waitFor(() => expect(state.categoryProps!.selectedId).toBe(doces.id))
  })

  it('falls forward after deleting a selected middle category', () => {
    render(createElement(MenuAdminClient, { categorias: [lanches, bebidas, doces] }))
    act(() => state.categoryProps!.onSelect(bebidas.id))
    act(() => state.categoryProps!.onDeleted(bebidas.id))
    expect(state.categoryProps!.selectedId).toBe(doces.id)
  })

  it('falls backward after deleting the selected last category', () => {
    render(createElement(MenuAdminClient, { categorias: [lanches, bebidas] }))

    act(() => state.categoryProps!.onSelect(bebidas.id))
    act(() => state.categoryProps!.onDeleted(bebidas.id))
    expect(state.categoryProps!.selectedId).toBe(lanches.id)
  })

  it('clears selection after deleting the only category', () => {
    render(createElement(MenuAdminClient, { categorias: [lanches] }))

    act(() => state.categoryProps!.onDeleted(lanches.id))
    expect(state.categoryProps!.selectedId).toBe('')
    expect(screen.getByRole('button', { name: 'Novo produto' })).toBeDisabled()
  })

  it('falls to the first stable category after an external refresh removes selection', async () => {
    const view = render(createElement(MenuAdminClient, { categorias: [lanches, bebidas] }))
    act(() => state.categoryProps!.onSelect(bebidas.id))

    view.rerender(createElement(MenuAdminClient, { categorias: [lanches] }))

    await waitFor(() => expect(state.categoryProps!.selectedId).toBe(lanches.id))
  })

  it('shows the selected-category product empty state', () => {
    render(createElement(MenuAdminClient, { categorias: [lanches] }))

    expect(screen.getByRole('heading', { name: 'Nenhum produto nesta categoria' })).toBeInTheDocument()
  })
})
