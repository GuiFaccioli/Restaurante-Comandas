import { createElement } from 'react'
import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

const actions = vi.hoisted(() => ({
  criarCategoria: vi.fn(),
  editarCategoria: vi.fn(),
  removerCategoria: vi.fn(),
}))

vi.mock('@/lib/actions/produtos', () => actions)
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import {
  CategoryManager,
  type CategoryManagerProps,
} from '@/components/admin/category-manager'

export { actions }
export const pizzas = { id: 'cat-1', nome: 'Pizzas', ordem: 0 }
export const bebidas = { id: 'cat-2', nome: 'Bebidas', ordem: 1 }
export const doces = { id: 'cat-3', nome: 'Doces', ordem: 2 }

export function renderManager(overrides: Partial<CategoryManagerProps> = {}) {
  const props: CategoryManagerProps = {
    categorias: [pizzas, bebidas],
    selectedId: pizzas.id,
    onSelect: vi.fn(),
    onCreated: vi.fn(),
    onDeleted: vi.fn(),
    onRefresh: vi.fn(),
    ...overrides,
  }
  render(createElement(CategoryManager, props))
  return props
}

beforeEach(() => vi.clearAllMocks())
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
